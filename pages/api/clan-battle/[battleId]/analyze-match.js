// POST /api/clan-battle/[battleId]/analyze-match — 킬내기 경기의 봇킬 텔레메트리 분석 (생성자만)
// body: { matchId, playerId }  matchId = ClanBattleMatch.id (내부 id)
// load-more.js와 동일한 utils/botKills.js의 analyzeMatchData()를 재사용해 실킬을 계산하고,
// PlayerMatch 테이블에도 동일한 형태로 캐시(업서트)해 이후 recent-matches/import-match 조회 시 재사용되게 한다.
import prisma from '../../../../utils/prisma.js';
import { getSessionAuthUser } from '../../../../utils/clanBattleAuth.js';
import { cachedPubgFetch, TTL } from '../../../../utils/pubgApiCache.js';
import { analyzeMatchData } from '../../../../utils/botKills.js';

const PUBG_BASE = 'https://api.pubg.com/shards';

async function findPlayer(nickname) {
  for (const shard of ['steam', 'kakao']) {
    try {
      const json = await cachedPubgFetch(
        `${PUBG_BASE}/${shard}/players?filter[playerNames]=${encodeURIComponent(nickname)}`,
        { ttl: TTL.PLAYER }
      );
      if (json.data?.length) return { player: json.data[0], shard };
    } catch { /* 다음 shard 시도 */ }
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { battleId } = req.query;
  const id = parseInt(battleId);
  if (isNaN(id)) return res.status(400).json({ error: '잘못된 battleId입니다.' });

  const authUser = await getSessionAuthUser(req, res);
  if (!authUser) return res.status(401).json({ error: '로그인이 필요합니다.' });

  const matchId = parseInt(req.body?.matchId);
  const playerId = parseInt(req.body?.playerId);
  if (isNaN(matchId) || isNaN(playerId)) return res.status(400).json({ error: 'matchId, playerId가 필요합니다.' });

  try {
    const battle = await prisma.clanBattle.findUnique({ where: { id }, include: { rule: true } });
    if (!battle) return res.status(404).json({ error: '내전을 찾을 수 없습니다.' });
    if (battle.createdBy !== authUser.id) return res.status(403).json({ error: '생성자만 분석을 요청할 수 있습니다.' });

    const match = await prisma.clanBattleMatch.findUnique({ where: { id: matchId } });
    if (!match || match.battleId !== id) return res.status(404).json({ error: '경기를 찾을 수 없습니다.' });
    if (!match.pubgMatchId) return res.status(400).json({ error: '원본 PUBG 매치 정보가 없어 분석할 수 없습니다.' });

    const player = await prisma.clanBattlePlayer.findUnique({ where: { id: playerId } });
    if (!player || player.battleId !== id) return res.status(404).json({ error: '참가자를 찾을 수 없습니다.' });

    const result = await prisma.clanBattleMatchResult.findFirst({ where: { matchId, playerId } });
    if (!result) return res.status(404).json({ error: '경기 결과를 찾을 수 없습니다.' });

    await prisma.clanBattleMatchResult.update({ where: { id: result.id }, data: { botAnalysisStatus: 'analyzing' } });

    const found = await findPlayer(player.nickname);
    if (!found) {
      await prisma.clanBattleMatchResult.update({ where: { id: result.id }, data: { botAnalysisStatus: 'failed' } });
      return res.status(404).json({ error: `PUBG에서 ${player.nickname}님을 찾을 수 없습니다.` });
    }
    const { player: pubgPlayer, shard } = found;

    let matchJson;
    try {
      matchJson = await cachedPubgFetch(`${PUBG_BASE}/${shard}/matches/${match.pubgMatchId}`, { ttl: TTL.MATCH });
    } catch (e) {
      await prisma.clanBattleMatchResult.update({ where: { id: result.id }, data: { botAnalysisStatus: 'failed' } });
      return res.status(502).json({ error: '매치 정보를 불러오지 못했습니다.' });
    }

    const analysis = await analyzeMatchData(matchJson, match.pubgMatchId);
    if (analysis.status !== 'ok') {
      await prisma.clanBattleMatchResult.update({ where: { id: result.id }, data: { botAnalysisStatus: 'failed' } });
      return res.status(200).json({ ok: false, status: analysis.status, error: '텔레메트리 분석에 실패했습니다.' });
    }

    const row = analysis.rows.find((r) => r.accountId === pubgPlayer.id);
    if (!row) {
      await prisma.clanBattleMatchResult.update({ where: { id: result.id }, data: { botAnalysisStatus: 'failed' } });
      return res.status(200).json({ ok: false, error: '분석 결과에서 해당 참가자를 찾을 수 없습니다.' });
    }

    const realKills = row.real ?? result.kills;

    // 점수 재계산 (matches.js의 scoring 로직과 동일 — placementPointMode==='squad'면 등수 점수는 개인 score에 미반영)
    const rule = battle.rule;
    const placePoints = rule?.placePoints || {};
    const killBasePoint = rule?.killBasePoint ?? 1.0;
    const tierMultipliers = rule?.tierMultipliers || {};
    const useTierMultiplier = rule?.useTierMultiplier ?? true;
    const placementPointMode = rule?.placementPointMode ?? 'individual';
    const placeScore = Number(placePoints[String(result.squadPlacement ?? result.placement)]) || 0;
    const tierMult = useTierMultiplier ? (Number(tierMultipliers[String(player.tier)]) || 1) : 1;
    const killScore = realKills * killBasePoint * tierMult;
    const score = placementPointMode === 'squad' ? killScore : placeScore + killScore;

    const updated = await prisma.clanBattleMatchResult.update({
      where: { id: result.id },
      data: { kills: realKills, realKills, botAnalysisStatus: 'completed', score },
    });

    // PlayerMatch 캐시 업서트 (load-more.js와 동일한 형태) — 이후 recent-matches/import-match에서 재사용됨
    const attrs = matchJson.data.attributes;
    const included = matchJson.included || [];
    const participant = included.find((i) => i.type === 'participant' && i.attributes?.stats?.playerId === pubgPlayer.id);
    const stats = participant?.attributes?.stats || {};

    await prisma.playerMatch.upsert({
      where: { pubgAccountId_matchId: { pubgAccountId: pubgPlayer.id, matchId: match.pubgMatchId } },
      create: {
        pubgAccountId: pubgPlayer.id,
        nickname: player.nickname,
        shard,
        matchId: match.pubgMatchId,
        mode: attrs.gameMode || '',
        mapName: attrs.mapName || null,
        placement: stats.winPlace ?? result.placement,
        kills: stats.kills ?? row.total ?? 0,
        assists: stats.assists ?? 0,
        damage: stats.damageDealt ?? 0,
        surviveTime: stats.timeSurvived ?? 0,
        createdAt: new Date(attrs.createdAt),
        botKills: row.bot ?? 0,
        realKills,
        botDamage: row.botDamage ?? 0,
        realDamage: row.realDamage ?? stats.damageDealt ?? 0,
        botAssist: row.botAssist ?? 0,
        isBotCorrected: true,
        botAnalyzedAt: new Date(),
      },
      update: {
        botKills: row.bot ?? 0,
        realKills,
        botDamage: row.botDamage ?? 0,
        realDamage: row.realDamage ?? stats.damageDealt ?? 0,
        botAssist: row.botAssist ?? 0,
        isBotCorrected: true,
        botAnalyzedAt: new Date(),
      },
    });

    return res.status(200).json({ ok: true, result: updated });
  } catch (e) {
    console.error('[clan-battle/analyze-match] POST 오류:', e.message);
    try {
      await prisma.clanBattleMatchResult.updateMany({ where: { matchId, playerId }, data: { botAnalysisStatus: 'failed' } });
    } catch { /* noop */ }
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
