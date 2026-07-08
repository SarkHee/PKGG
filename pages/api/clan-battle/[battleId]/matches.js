// POST   /api/clan-battle/[battleId]/matches — 경기 결과 등록 (생성자만)
//        placementPointMode==='individual' (기본): score = placePoints[스쿼드 등수 || 개인 등수] + kills * killBasePoint * tierMultipliers[티어]
//        placementPointMode==='squad': 개인 score = kills * killBasePoint * tierMultipliers[티어] (등수 점수 미반영)
//        → 등수 점수는 standings.js에서 스쿼드 합산 시 매치당 1회만 별도로 더해짐 (개인 점수엔 노출되지 않음)
// DELETE /api/clan-battle/[battleId]/matches?matchId=N — 경기 결과 삭제 (생성자만)
import prisma from '../../../../utils/prisma.js';
import { getSessionAuthUser } from '../../../../utils/clanBattleAuth.js';

export default async function handler(req, res) {
  const { battleId } = req.query;
  const id = parseInt(battleId);
  if (isNaN(id)) return res.status(400).json({ error: '잘못된 battleId입니다.' });

  if (req.method === 'DELETE') {
    const authUser = await getSessionAuthUser(req, res);
    if (!authUser) return res.status(401).json({ error: '로그인이 필요합니다.' });

    const matchId = parseInt(req.query.matchId);
    if (isNaN(matchId)) return res.status(400).json({ error: 'matchId가 필요합니다.' });

    try {
      const battle = await prisma.clanBattle.findUnique({ where: { id } });
      if (!battle) return res.status(404).json({ error: '내전을 찾을 수 없습니다.' });
      if (battle.createdBy !== authUser.id) return res.status(403).json({ error: '생성자만 삭제할 수 있습니다.' });

      const match = await prisma.clanBattleMatch.findUnique({ where: { id: matchId } });
      if (!match || match.battleId !== id) return res.status(404).json({ error: '경기를 찾을 수 없습니다.' });

      await prisma.$transaction([
        prisma.clanBattleMatchResult.deleteMany({ where: { matchId } }),
        prisma.clanBattleMatch.delete({ where: { id: matchId } }),
      ]);

      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('[clan-battle/matches] DELETE 오류:', e.message);
      return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const authUser = await getSessionAuthUser(req, res);
  if (!authUser) return res.status(401).json({ error: '로그인이 필요합니다.' });

  const { memo, playedAt, mapName, pubgMatchId, results } = req.body || {};
  if (!Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ error: '경기 결과(results)가 필요합니다.' });
  }

  try {
    const battle = await prisma.clanBattle.findUnique({
      where: { id },
      include: { rule: true, players: true },
    });
    if (!battle) return res.status(404).json({ error: '내전을 찾을 수 없습니다.' });
    if (battle.createdBy !== authUser.id) return res.status(403).json({ error: '생성자만 경기 결과를 등록할 수 있습니다.' });

    const rule = battle.rule;
    const placePoints = rule?.placePoints || {};
    const killBasePoint = rule?.killBasePoint ?? 1.0;
    const tierMultipliers = rule?.tierMultipliers || {};
    const useTierMultiplier = rule?.useTierMultiplier ?? true;
    const placementPointMode = rule?.placementPointMode ?? 'individual';
    const playersById = new Map(battle.players.map((p) => [p.id, p]));

    // 다음 matchNumber 계산
    const lastMatch = await prisma.clanBattleMatch.findFirst({
      where: { battleId: id },
      orderBy: { matchNumber: 'desc' },
    });
    const matchNumber = (lastMatch?.matchNumber ?? 0) + 1;

    const computedResults = results.map((r) => {
      const player = playersById.get(parseInt(r.playerId));
      if (!player) throw new Error(`참가자를 찾을 수 없습니다 (playerId: ${r.playerId})`);

      const placement = parseInt(r.placement) || 0;
      const squadPlacement = r.squadPlacement !== undefined && r.squadPlacement !== null && r.squadPlacement !== ''
        ? parseInt(r.squadPlacement)
        : null;
      const kills = parseInt(r.kills) || 0;
      const damage = parseInt(r.damage) || 0;
      const assists = parseInt(r.assists) || 0;
      const rawKills = r.rawKills !== undefined ? parseInt(r.rawKills) || 0 : kills;
      const realKills = r.realKills !== undefined && r.realKills !== null && r.realKills !== '' ? parseInt(r.realKills) : null;
      const botAnalysisStatus = ['pending', 'analyzing', 'completed', 'failed'].includes(r.botAnalysisStatus) ? r.botAnalysisStatus : 'pending';
      // 스쿼드 등수가 있으면 스쿼드 등수 점수를 우선 사용, 없으면 개인 등수로 폴백
      const placeScore = Number(placePoints[String(squadPlacement ?? placement)]) || 0;
      const tierMult = useTierMultiplier ? (Number(tierMultipliers[String(player.tier)]) || 1) : 1;
      const killScore = kills * killBasePoint * tierMult;
      // squad 모드에서는 등수 점수를 개인 score에 반영하지 않음 (스쿼드 합산에서만 매치당 1회 가산)
      const score = placementPointMode === 'squad' ? killScore : placeScore + killScore;

      return { playerId: player.id, placement, squadPlacement, kills, damage, assists, score, rawKills, realKills, botAnalysisStatus };
    });

    const match = await prisma.clanBattleMatch.create({
      data: {
        battleId: id,
        matchNumber,
        playedAt: playedAt ? new Date(playedAt) : new Date(),
        mapName: mapName || null,
        memo: memo || null,
        pubgMatchId: pubgMatchId || null,
        results: { create: computedResults },
      },
      include: { results: true },
    });

    return res.status(201).json({ match });
  } catch (e) {
    console.error('[clan-battle/matches] POST 오류:', e.message);
    return res.status(500).json({ error: e.message || '서버 오류가 발생했습니다.' });
  }
}
