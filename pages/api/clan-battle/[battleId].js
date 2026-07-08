// GET    /api/clan-battle/[battleId]  — 내전 상세
// PATCH  /api/clan-battle/[battleId]  — 수정 (생성자만)
// DELETE /api/clan-battle/[battleId]  — 삭제 (생성자만)
import prisma from '../../../utils/prisma.js';
import { getSessionAuthUser } from '../../../utils/clanBattleAuth.js';

// datetime-local 입력값("YYYY-MM-DDTHH:mm", 타임존 없음)을 KST(+09:00)로 고정 파싱.
// new Date(str)에 그대로 넘기면 서버 프로세스의 로컬 타임존으로 해석되어(Vercel은 보통 UTC)
// 배포 환경에 따라 값이 9시간씩 어긋나는 문제가 있어, 항상 KST로 명시한다.
function parseKST(str) {
  if (!str) return null;
  const hasSeconds = /T\d{2}:\d{2}:\d{2}/.test(str);
  return new Date(hasSeconds ? `${str}+09:00` : `${str}:00+09:00`);
}

export default async function handler(req, res) {
  const { battleId } = req.query;
  const id = parseInt(battleId);
  if (isNaN(id)) return res.status(400).json({ error: '잘못된 battleId입니다.' });

  if (req.method === 'GET') {
    try {
      const battle = await prisma.clanBattle.findUnique({
        where: { id },
        include: {
          rule: true,
          teams: true,
          squads: { include: { team: true } },
          players: { include: { team: true, squad: true } },
          matches: { include: { results: true }, orderBy: { matchNumber: 'asc' } },
        },
      });
      if (!battle) return res.status(404).json({ error: '내전을 찾을 수 없습니다.' });

      // 참가자 닉네임 기준 PKGG 전적(PlayerCache) 매칭 (참가자 카드에 표시용)
      const nicknames = battle.players.map((p) => p.nickname);
      const caches = nicknames.length > 0
        ? await prisma.playerCache.findMany({
            where: { nickname: { in: nicknames, mode: 'insensitive' } },
            select: { nickname: true, avgDamage: true, avgKills: true },
          })
        : [];
      const cacheMap = new Map(caches.map((c) => [c.nickname.toLowerCase(), c]));
      battle.players = battle.players.map((p) => ({
        ...p,
        pkggStats: cacheMap.get(p.nickname.toLowerCase()) || null,
      }));

      // 생성자 본인인지 여부 (수정/삭제/참가자·경기 관리 버튼 노출 판단용)
      const authUser = await getSessionAuthUser(req, res);
      battle.isOwner = authUser ? battle.createdBy === authUser.id : false;

      return res.status(200).json({ battle });
    } catch (e) {
      console.error('[clan-battle/[id]] GET 오류:', e.message);
      return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  }

  if (req.method === 'PATCH') {
    const authUser = await getSessionAuthUser(req, res);
    if (!authUser) return res.status(401).json({ error: '로그인이 필요합니다.' });

    try {
      const battle = await prisma.clanBattle.findUnique({ where: { id } });
      if (!battle) return res.status(404).json({ error: '내전을 찾을 수 없습니다.' });
      if (battle.createdBy !== authUser.id) return res.status(403).json({ error: '생성자만 수정할 수 있습니다.' });

      const { title, memo, status, endDate, startTime, endTime, placePoints, killBasePoint, tierMultipliers, useTierMultiplier, placementPointMode, action } = req.body || {};

      const updated = await prisma.clanBattle.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title: title.trim() } : {}),
          ...(memo !== undefined ? { memo } : {}),
          ...(status !== undefined ? { status } : {}),
          ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
          ...(startTime !== undefined ? { startTime: parseKST(startTime) } : {}),
          ...(endTime !== undefined ? { endTime: parseKST(endTime) } : {}),
          ...(action === 'confirm' ? { confirmedAt: new Date() } : {}),
          ...(action === 'unconfirm' ? { confirmedAt: null } : {}),
          ...(action === 'end' ? { status: 'ended', endDate: new Date() } : {}),
          ...(action === 'reopen' ? { status: 'active', endDate: null } : {}),
          ...((placePoints !== undefined || killBasePoint !== undefined || tierMultipliers !== undefined || useTierMultiplier !== undefined || placementPointMode !== undefined)
            ? {
                rule: {
                  update: {
                    ...(placePoints !== undefined ? { placePoints } : {}),
                    ...(killBasePoint !== undefined ? { killBasePoint: parseFloat(killBasePoint) } : {}),
                    ...(tierMultipliers !== undefined ? { tierMultipliers } : {}),
                    ...(useTierMultiplier !== undefined ? { useTierMultiplier: !!useTierMultiplier } : {}),
                    ...(placementPointMode !== undefined ? { placementPointMode: placementPointMode === 'squad' ? 'squad' : 'individual' } : {}),
                  },
                },
              }
            : {}),
        },
        include: { rule: true },
      });

      return res.status(200).json({ battle: updated });
    } catch (e) {
      console.error('[clan-battle/[id]] PATCH 오류:', e.message);
      return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  }

  if (req.method === 'DELETE') {
    const authUser = await getSessionAuthUser(req, res);
    if (!authUser) return res.status(401).json({ error: '로그인이 필요합니다.' });

    try {
      const battle = await prisma.clanBattle.findUnique({ where: { id } });
      if (!battle) return res.status(404).json({ error: '내전을 찾을 수 없습니다.' });
      if (battle.createdBy !== authUser.id) return res.status(403).json({ error: '생성자만 삭제할 수 있습니다.' });

      // FK가 RESTRICT라 자식 레코드부터 순서대로 삭제
      await prisma.$transaction([
        prisma.clanBattleMatchResult.deleteMany({ where: { match: { battleId: id } } }),
        prisma.clanBattleMatch.deleteMany({ where: { battleId: id } }),
        prisma.clanBattlePlayer.deleteMany({ where: { battleId: id } }),
        prisma.clanBattleSquad.deleteMany({ where: { battleId: id } }),
        prisma.clanBattleTeam.deleteMany({ where: { battleId: id } }),
        prisma.clanBattleRule.deleteMany({ where: { battleId: id } }),
        prisma.clanBattle.delete({ where: { id } }),
      ]);

      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('[clan-battle/[id]] DELETE 오류:', e.message);
      return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
