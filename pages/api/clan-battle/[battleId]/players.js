// POST   /api/clan-battle/[battleId]/players — 참가자 추가 (클랜원 일괄 또는 닉네임 개별)
// DELETE /api/clan-battle/[battleId]/players — 참가자 제거
import prisma from '../../../../utils/prisma.js';
import { getSessionAuthUser, getUserClan } from '../../../../utils/clanBattleAuth.js';
import { cachedPubgFetch, TTL } from '../../../../utils/pubgApiCache.js';

const PUBG_BASE = 'https://api.pubg.com/shards';

// steam → kakao 순으로 실제 존재하는 닉네임인지 확인
async function verifyPubgNickname(nickname) {
  for (const shard of ['steam', 'kakao']) {
    try {
      const json = await cachedPubgFetch(
        `${PUBG_BASE}/${shard}/players?filter[playerNames]=${encodeURIComponent(nickname)}`,
        { ttl: TTL.PLAYER }
      );
      if (json.data?.length) return true;
    } catch { /* 다음 shard 시도 */ }
  }
  return false;
}

async function requireOwner(req, res, battleId) {
  const authUser = await getSessionAuthUser(req, res);
  if (!authUser) { res.status(401).json({ error: '로그인이 필요합니다.' }); return null; }
  const battle = await prisma.clanBattle.findUnique({ where: { id: battleId } });
  if (!battle) { res.status(404).json({ error: '내전을 찾을 수 없습니다.' }); return null; }
  if (battle.createdBy !== authUser.id) { res.status(403).json({ error: '생성자만 참가자를 관리할 수 있습니다.' }); return null; }
  return authUser;
}

export default async function handler(req, res) {
  const { battleId } = req.query;
  const id = parseInt(battleId);
  if (isNaN(id)) return res.status(400).json({ error: '잘못된 battleId입니다.' });

  if (req.method === 'POST') {
    const authUser = await requireOwner(req, res, id);
    if (!authUser) return;

    const { mode, nickname, tier, teamId, clanName } = req.body || {};

    try {
      // 클랜원 일괄 불러오기 (clanName 없으면 내 클랜, 있으면 검색한 타클랜)
      if (mode === 'fromClan') {
        let clan;
        if (clanName?.trim()) {
          clan = await prisma.clan.findFirst({ where: { name: { equals: clanName.trim(), mode: 'insensitive' } } });
          if (!clan) return res.status(404).json({ error: '클랜을 찾을 수 없습니다.' });
        } else {
          clan = await getUserClan(authUser);
          if (!clan) return res.status(400).json({ error: '연동된 클랜이 없습니다.' });
        }

        // 클랜명으로 팀 자동 생성 (이미 같은 이름 팀이 있으면 재사용) — added:0이어도 탭 이동에 필요하므로 항상 확보
        let team = await prisma.clanBattleTeam.findFirst({ where: { battleId: id, teamName: clan.name } });
        if (!team) {
          team = await prisma.clanBattleTeam.create({ data: { battleId: id, teamName: clan.name, clanName: clan.name } });
        }

        const members = await prisma.clanMember.findMany({ where: { clanId: clan.id } });
        const memberNames = members.map((m) => m.nickname);
        const existing = await prisma.clanBattlePlayer.findMany({ where: { battleId: id }, select: { nickname: true } });
        const existingSet = new Set(existing.map((p) => p.nickname.toLowerCase()));

        const toAdd = members.filter((m) => !existingSet.has(m.nickname.toLowerCase()));

        if (toAdd.length > 0) {
          await prisma.clanBattlePlayer.createMany({
            data: toAdd.map((m) => ({ battleId: id, nickname: m.nickname, tier: 3, userId: null, teamId: team.id })),
          });
        }

        // 이미 등록돼 있던 참가자 중 해당 클랜 멤버와 닉네임이 일치하지만 팀 미배정 상태인 경우 소급 배정
        const retro = await prisma.clanBattlePlayer.updateMany({
          where: {
            battleId: id,
            teamId: null,
            nickname: { in: memberNames, mode: 'insensitive' },
          },
          data: { teamId: team.id },
        });

        if (toAdd.length === 0 && retro.count === 0) {
          return res.status(200).json({ added: 0, retroAssigned: 0, team, players: [] });
        }

        const players = await prisma.clanBattlePlayer.findMany({ where: { battleId: id } });
        return res.status(201).json({ added: toAdd.length, retroAssigned: retro.count, team, players });
      }

      // 닉네임 개별 추가
      if (!nickname?.trim()) return res.status(400).json({ error: '닉네임이 필요합니다.' });

      const dup = await prisma.clanBattlePlayer.findFirst({
        where: { battleId: id, nickname: { equals: nickname.trim(), mode: 'insensitive' } },
      });
      if (dup) return res.status(409).json({ error: '이미 참가 중인 닉네임입니다.' });

      // DB(ClanMember/PlayerCache)에 없으면 PUBG API로 실존 여부 확인
      const known = await prisma.clanMember.findFirst({
        where: { nickname: { equals: nickname.trim(), mode: 'insensitive' } },
      }) || await prisma.playerCache.findFirst({
        where: { nickname: { equals: nickname.trim(), mode: 'insensitive' } },
      });

      if (!known) {
        const exists = await verifyPubgNickname(nickname.trim());
        if (!exists) return res.status(404).json({ error: 'PUBG에 존재하지 않는 닉네임입니다.' });
      }

      const tierNum = Math.min(5, Math.max(1, parseInt(tier) || 3));
      const player = await prisma.clanBattlePlayer.create({
        data: {
          battleId: id,
          nickname: nickname.trim(),
          tier: tierNum,
          teamId: teamId ? parseInt(teamId) : null,
        },
      });

      return res.status(201).json({ player });
    } catch (e) {
      console.error('[clan-battle/players] POST 오류:', e.message);
      return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  }

  if (req.method === 'DELETE') {
    const authUser = await requireOwner(req, res, id);
    if (!authUser) return;

    const { playerId } = req.body || {};
    if (!playerId) return res.status(400).json({ error: 'playerId가 필요합니다.' });

    try {
      await prisma.$transaction([
        prisma.clanBattleMatchResult.deleteMany({ where: { playerId: parseInt(playerId) } }),
        prisma.clanBattlePlayer.delete({ where: { id: parseInt(playerId) } }),
      ]);
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('[clan-battle/players] DELETE 오류:', e.message);
      return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  }

  if (req.method === 'PATCH') {
    const authUser = await requireOwner(req, res, id);
    if (!authUser) return;

    const { playerId, tier, teamId, prevGames, prevAvgKills, prevAvgDamage, prevAvgPlacement, prevAvgAssists, prevMemo } = req.body || {};
    if (!playerId) return res.status(400).json({ error: 'playerId가 필요합니다.' });

    try {
      const player = await prisma.clanBattlePlayer.update({
        where: { id: parseInt(playerId) },
        data: {
          ...(tier !== undefined ? { tier: Math.min(5, Math.max(1, parseInt(tier) || 3)) } : {}),
          ...(teamId !== undefined ? { teamId: teamId ? parseInt(teamId) : null } : {}),
          ...(prevGames !== undefined ? { prevGames: prevGames === null || prevGames === '' ? null : parseInt(prevGames) } : {}),
          ...(prevAvgKills !== undefined ? { prevAvgKills: prevAvgKills === null || prevAvgKills === '' ? null : parseFloat(prevAvgKills) } : {}),
          ...(prevAvgDamage !== undefined ? { prevAvgDamage: prevAvgDamage === null || prevAvgDamage === '' ? null : parseFloat(prevAvgDamage) } : {}),
          ...(prevAvgPlacement !== undefined ? { prevAvgPlacement: prevAvgPlacement === null || prevAvgPlacement === '' ? null : parseFloat(prevAvgPlacement) } : {}),
          ...(prevAvgAssists !== undefined ? { prevAvgAssists: prevAvgAssists === null || prevAvgAssists === '' ? null : parseFloat(prevAvgAssists) } : {}),
          ...(prevMemo !== undefined ? { prevMemo: prevMemo || null } : {}),
        },
      });
      return res.status(200).json({ player });
    } catch (e) {
      console.error('[clan-battle/players] PATCH 오류:', e.message);
      return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  }

  res.setHeader('Allow', ['POST', 'PATCH', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
