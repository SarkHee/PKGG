// GET /api/clan-battle/[battleId]/standings?matchId=123 — 개인/스쿼드 누적+경기별 순위
// matchId를 주면 해당 경기 하나만의 집계로 필터링됨 (perMatch/squadPerMatch는 항상 전체 경기 기준으로 함께 반환)
import prisma from '../../../../utils/prisma.js';

// 참가자의 여러 경기 결과를 하나의 분석 상태로 요약: 미분석 있으면 pending, 분석중 있으면 analyzing,
// 실패만 남았으면 failed, 전부 완료면 completed (경기가 없으면 null)
function aggregateAnalysisStatus(results) {
  if (!results || results.length === 0) return null;
  const statuses = results.map((r) => r.botAnalysisStatus);
  if (statuses.some((s) => s === 'pending')) return 'pending';
  if (statuses.some((s) => s === 'analyzing')) return 'analyzing';
  if (statuses.some((s) => s === 'failed')) return 'failed';
  return 'completed';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { battleId, matchId } = req.query;
  const id = parseInt(battleId);
  if (isNaN(id)) return res.status(400).json({ error: '잘못된 battleId입니다.' });
  const filterMatchId = matchId ? parseInt(matchId) : null;

  try {
    const battle = await prisma.clanBattle.findUnique({ where: { id }, select: { rule: true } });
    const placePoints = battle?.rule?.placePoints || {};
    const placementPointMode = battle?.rule?.placementPointMode ?? 'individual';

    const players = await prisma.clanBattlePlayer.findMany({
      where: { battleId: id },
      include: {
        team: true,
        squad: { include: { team: true } },
        results: { include: { match: true } },
      },
    });
    if (players.length === 0) return res.status(200).json({ standings: [], squadStandings: [] });

    const standings = players
      .map((p) => {
        const allResults = p.results;
        const scoped = filterMatchId ? allResults.filter((r) => r.matchId === filterMatchId) : allResults;

        const matchCount = scoped.length;
        const totalScore = scoped.reduce((s, r) => s + r.score, 0);
        const totalKills = scoped.reduce((s, r) => s + r.kills, 0);
        const totalDamage = scoped.reduce((s, r) => s + r.damage, 0);
        const totalAssists = scoped.reduce((s, r) => s + r.assists, 0);
        const wins = scoped.filter((r) => r.placement === 1).length;

        const perMatch = allResults
          .slice()
          .sort((a, b) => a.match.matchNumber - b.match.matchNumber)
          .map((r) => ({
            matchId: r.matchId,
            matchNumber: r.match.matchNumber,
            placement: r.placement,
            squadPlacement: r.squadPlacement,
            kills: r.kills,
            damage: r.damage,
            assists: r.assists,
            score: parseFloat(r.score.toFixed(2)),
            botAnalysisStatus: r.botAnalysisStatus,
          }));

        return {
          playerId: p.id,
          nickname: p.nickname,
          tier: p.tier,
          teamName: p.team?.teamName ?? null,
          squadId: p.squadId,
          squadName: p.squad?.squadName ?? null,
          matchCount,
          totalScore: parseFloat(totalScore.toFixed(2)),
          totalKills,
          totalDamage,
          totalAssists,
          wins,
          avgScore: matchCount > 0 ? parseFloat((totalScore / matchCount).toFixed(2)) : 0,
          avgDamage: matchCount > 0 ? parseFloat((totalDamage / matchCount).toFixed(1)) : 0,
          avgAssists: matchCount > 0 ? parseFloat((totalAssists / matchCount).toFixed(2)) : 0,
          analysisStatus: aggregateAnalysisStatus(allResults),
          perMatch,
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore);

    // 스쿼드별 합산 + 경기별 스쿼드 점수 (스쿼드에 배정된 참가자만 대상)
    const squadMap = new Map();
    players.forEach((p) => {
      if (!p.squadId) return;
      if (!squadMap.has(p.squadId)) {
        squadMap.set(p.squadId, {
          squadId: p.squadId,
          squadName: p.squad?.squadName ?? '',
          teamName: p.squad?.team?.teamName ?? p.team?.teamName ?? null,
          members: [],
          matchAgg: new Map(), // matchId -> { matchId, matchNumber, squadPlacement, totalScore, totalKills }
        });
      }
      const s = squadMap.get(p.squadId);
      s.members.push(p);
      p.results.forEach((r) => {
        if (!s.matchAgg.has(r.matchId)) {
          // squad 모드에서는 등수 점수가 개인 score에 없으므로, 스쿼드 집계 시작 시점에 매치당 1회만 가산한다
          const placementBonus = placementPointMode === 'squad'
            ? Number(placePoints[String(r.squadPlacement)]) || 0
            : 0;
          s.matchAgg.set(r.matchId, {
            matchId: r.matchId,
            matchNumber: r.match.matchNumber,
            squadPlacement: r.squadPlacement,
            totalScore: placementBonus,
            totalKills: 0,
          });
        }
        const ma = s.matchAgg.get(r.matchId);
        ma.totalScore += r.score;
        ma.totalKills += r.kills;
        if (ma.squadPlacement == null && r.squadPlacement != null) ma.squadPlacement = r.squadPlacement;
      });
    });

    const squadStandings = Array.from(squadMap.values())
      .map((s) => {
        const allMatchAgg = Array.from(s.matchAgg.values()).sort((a, b) => a.matchNumber - b.matchNumber);
        const scopedMatchAgg = filterMatchId ? allMatchAgg.filter((m) => m.matchId === filterMatchId) : allMatchAgg;

        const matchCount = scopedMatchAgg.length;
        const totalScore = scopedMatchAgg.reduce((sum, m) => sum + m.totalScore, 0);
        const totalKills = scopedMatchAgg.reduce((sum, m) => sum + m.totalKills, 0);

        return {
          squadId: s.squadId,
          squadName: s.squadName,
          teamName: s.teamName,
          totalScore: parseFloat(totalScore.toFixed(2)),
          totalKills,
          matchCount,
          avgScore: matchCount > 0 ? parseFloat((totalScore / matchCount).toFixed(2)) : 0,
          members: s.members.map((p) => {
            const scopedResults = filterMatchId ? p.results.filter((r) => r.matchId === filterMatchId) : p.results;
            return {
              playerId: p.id,
              nickname: p.nickname,
              tier: p.tier,
              totalScore: parseFloat(scopedResults.reduce((sum, r) => sum + r.score, 0).toFixed(2)),
              totalKills: scopedResults.reduce((sum, r) => sum + r.kills, 0),
              totalDamage: scopedResults.reduce((sum, r) => sum + r.damage, 0),
              analysisStatus: aggregateAnalysisStatus(p.results),
            };
          }),
          squadPerMatch: allMatchAgg.map((m) => ({
            matchId: m.matchId,
            matchNumber: m.matchNumber,
            squadPlacement: m.squadPlacement,
            totalScore: parseFloat(m.totalScore.toFixed(2)),
            totalKills: m.totalKills,
          })),
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore);

    return res.status(200).json({ standings, squadStandings });
  } catch (e) {
    console.error('[clan-battle/standings] GET 오류:', e.message);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
