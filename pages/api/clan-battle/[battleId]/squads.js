// POST   /api/clan-battle/[battleId]/squads — 스쿼드 생성 (팀 배정 포함)
// PATCH  /api/clan-battle/[battleId]/squads — 스쿼드 정보 수정 또는 참가자 배정/변경
// DELETE /api/clan-battle/[battleId]/squads — 스쿼드 삭제
import prisma from '../../../../utils/prisma.js';
import { getSessionAuthUser } from '../../../../utils/clanBattleAuth.js';

async function requireOwner(req, res, battleId) {
  const authUser = await getSessionAuthUser(req, res);
  if (!authUser) { res.status(401).json({ error: '로그인이 필요합니다.' }); return null; }
  const battle = await prisma.clanBattle.findUnique({ where: { id: battleId } });
  if (!battle) { res.status(404).json({ error: '내전을 찾을 수 없습니다.' }); return null; }
  if (battle.createdBy !== authUser.id) { res.status(403).json({ error: '생성자만 스쿼드를 관리할 수 있습니다.' }); return null; }
  return authUser;
}

export default async function handler(req, res) {
  const { battleId } = req.query;
  const id = parseInt(battleId);
  if (isNaN(id)) return res.status(400).json({ error: '잘못된 battleId입니다.' });

  if (req.method === 'POST') {
    const authUser = await requireOwner(req, res, id);
    if (!authUser) return;

    const { squadName, teamId, playerIds } = req.body || {};
    if (!squadName?.trim()) return res.status(400).json({ error: '스쿼드 이름이 필요합니다.' });

    try {
      const squad = await prisma.clanBattleSquad.create({
        data: {
          battleId: id,
          squadName: squadName.trim(),
          teamId: teamId ? parseInt(teamId) : null,
        },
      });

      if (Array.isArray(playerIds) && playerIds.length > 0) {
        await prisma.clanBattlePlayer.updateMany({
          where: { id: { in: playerIds.map((p) => parseInt(p)) }, battleId: id },
          data: { squadId: squad.id },
        });
      }

      const result = await prisma.clanBattleSquad.findUnique({
        where: { id: squad.id },
        include: { players: true, team: true },
      });
      return res.status(201).json({ squad: result });
    } catch (e) {
      console.error('[clan-battle/squads] POST 오류:', e.message);
      return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  }

  if (req.method === 'PATCH') {
    const authUser = await requireOwner(req, res, id);
    if (!authUser) return;

    const { action, squadId, squadName, teamId, playerIds } = req.body || {};

    try {
      // 스쿼드 자체 정보 수정 (이름/팀 배정)
      if (action === 'rename') {
        if (!squadId) return res.status(400).json({ error: 'squadId가 필요합니다.' });
        const squad = await prisma.clanBattleSquad.update({
          where: { id: parseInt(squadId) },
          data: {
            ...(squadName !== undefined ? { squadName: squadName.trim() } : {}),
            ...(teamId !== undefined ? { teamId: teamId ? parseInt(teamId) : null } : {}),
          },
        });
        return res.status(200).json({ squad });
      }

      // 참가자를 스쿼드에 배정/변경 (squadId: null 이면 미배정으로 해제)
      if (action === 'assign') {
        if (!Array.isArray(playerIds) || playerIds.length === 0) {
          return res.status(400).json({ error: 'playerIds가 필요합니다.' });
        }
        await prisma.clanBattlePlayer.updateMany({
          where: { id: { in: playerIds.map((p) => parseInt(p)) }, battleId: id },
          data: { squadId: squadId ? parseInt(squadId) : null },
        });
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: "action은 'rename' 또는 'assign'이어야 합니다." });
    } catch (e) {
      console.error('[clan-battle/squads] PATCH 오류:', e.message);
      return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  }

  if (req.method === 'DELETE') {
    const authUser = await requireOwner(req, res, id);
    if (!authUser) return;

    const { squadId } = req.body || {};
    if (!squadId) return res.status(400).json({ error: 'squadId가 필요합니다.' });

    try {
      // 참가자의 squadId는 FK ON DELETE SET NULL로 자동 해제됨
      await prisma.clanBattleSquad.delete({ where: { id: parseInt(squadId) } });
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('[clan-battle/squads] DELETE 오류:', e.message);
      return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  }

  res.setHeader('Allow', ['POST', 'PATCH', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
