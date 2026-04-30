// 향상된 PUBG 통계 API - 시즌/랭크/라이프타임/숙련도 통계 지원
// /api/pubg/stats/{type}/{shard}/{playerId}/...
//
// 캐시 정책 (utils/pubgApiCache.js):
//   season / ranked / lifetime / mastery  → 10분 (TTL.PLAYER)
//   시즌 목록                              → 60분 (TTL.SEASON)
//   force=1 쿼리 파라미터로 캐시 bypass 가능

import { cachedPubgFetch, TTL, PubgApiError } from '../../../../utils/pubgApiCache';
import prisma from '../../../../utils/prisma';

const PUBG_BASE_URL = 'https://api.pubg.com/shards';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET 메소드만 지원됩니다.' });
  }

  const { params, force } = req.query;
  const forceRefresh = force === '1';

  if (!Array.isArray(params) || params.length < 3) {
    return res.status(400).json({
      error: '잘못된 경로입니다. /api/pubg/stats/{type}/{shard}/{playerId}/... 형식을 사용하세요.',
    });
  }

  const [type, shard, playerId, ...rest] = params;

  try {
    switch (type) {
      case 'season':
        if (!rest[0]) return res.status(400).json({ error: 'seasonId가 필요합니다.' });
        return await handleSeasonStats(req, res, shard, playerId, rest[0], forceRefresh);

      case 'ranked':
        if (!rest[0]) return res.status(400).json({ error: 'seasonId가 필요합니다.' });
        return await handleRankedStats(req, res, shard, playerId, rest[0], forceRefresh);

      case 'lifetime':
        return await handleLifetimeStats(req, res, shard, playerId, forceRefresh);

      case 'mastery':
        if (!rest[0]) return res.status(400).json({ error: '숙련도 타입이 필요합니다 (weapon|survival).' });
        return await handleMasteryStats(req, res, shard, playerId, rest[0], forceRefresh);

      default:
        return res.status(400).json({
          error: '지원하지 않는 통계 타입입니다. season, ranked, lifetime, mastery 중 하나를 사용하세요.',
        });
    }
  } catch (err) {
    if (err instanceof PubgApiError) {
      const status = err.status === 0 ? 503 : (err.status || 500);
      return res.status(status).json({ error: err.message, code: err.code });
    }
    console.error('[stats API] 예상치 못한 오류:', err);
    return res.status(500).json({ error: '통계 조회 중 오류가 발생했습니다.', details: err.message });
  }
}

// ── 시즌 통계 ────────────────────────────────────────────────────────────────
async function handleSeasonStats(req, res, shard, playerId, seasonId, force) {
  const url  = `${PUBG_BASE_URL}/${shard}/players/${playerId}/seasons/${seasonId}`;
  const data = await cachedPubgFetch(url, { ttl: TTL.PLAYER, force });

  return res.status(200).json({
    success: true,
    type: 'season',
    playerId,
    seasonId,
    data: {
      player:        { id: data.data?.relationships?.player?.data?.id },
      season:        { id: data.data?.relationships?.season?.data?.id, isCurrentSeason: data.data?.attributes?.isCurrentSeason || false },
      gameModeStats: data.data?.attributes?.gameModeStats || {},
      matchIds:      data.data?.relationships?.matchesSeason?.data?.map((m) => m.id) || [],
      matchCount:    data.data?.relationships?.matchesSeason?.data?.length || 0,
    },
  });
}

// ── 랭크 통계 ────────────────────────────────────────────────────────────────
async function handleRankedStats(req, res, shard, playerId, seasonId, force) {
  const url  = `${PUBG_BASE_URL}/${shard}/players/${playerId}/seasons/${seasonId}/ranked`;
  const data = await cachedPubgFetch(url, { ttl: TTL.PLAYER, force });

  return res.status(200).json({
    success: true,
    type: 'ranked',
    playerId,
    seasonId,
    data: {
      player:              { id: data.data?.relationships?.player?.data?.id },
      season:              { id: data.data?.relationships?.season?.data?.id },
      rankedGameModeStats: data.data?.attributes?.rankedGameModeStats || {},
    },
  });
}

// ── 라이프타임 통계 ──────────────────────────────────────────────────────────
async function handleLifetimeStats(req, res, shard, playerId, force) {
  const url  = `${PUBG_BASE_URL}/${shard}/players/${playerId}/seasons/lifetime`;
  const data = await cachedPubgFetch(url, { ttl: TTL.PLAYER, force });

  return res.status(200).json({
    success: true,
    type: 'lifetime',
    playerId,
    data: {
      player:         { id: data.data?.relationships?.player?.data?.id },
      gameModeStats:  data.data?.attributes?.gameModeStats || {},
      startingSeason: getLifetimeStartingSeason(shard),
    },
  });
}

// ── 숙련도 통계 (무기 / 생존) ─────────────────────────────────────────────────
async function handleMasteryStats(req, res, shard, playerId, masteryType, force) {
  if (!['weapon', 'survival'].includes(masteryType)) {
    return res.status(400).json({ error: '숙련도 타입은 weapon 또는 survival이어야 합니다.' });
  }

  const endpoint = masteryType === 'weapon' ? 'weapon_mastery' : 'survival_mastery';
  const url      = `${PUBG_BASE_URL}/${shard}/players/${playerId}/${endpoint}`;
  const data     = await cachedPubgFetch(url, { ttl: TTL.PLAYER, force });

  // weapon 데이터 fire-and-forget 저장 (메타 분석용)
  if (masteryType === 'weapon') {
    const summaries = data.data?.attributes?.weaponSummaries
      ?? data.data?.attributes?.WeaponSummaries
      ?? {}
    saveWeaponStats(playerId, shard, summaries).catch(() => {})
  }

  return res.status(200).json({
    success: true,
    type: `${masteryType}_mastery`,
    playerId,
    data: {
      player:     { id: data.data?.relationships?.player?.data?.id },
      attributes: data.data?.attributes || {},
      note: masteryType === 'weapon'
        ? 'Weapon Mastery stats were reset in update 18.2'
        : 'Survival Mastery stats',
    },
  });
}

async function saveWeaponStats(playerId, shard, summaries) {
  const entries = Object.entries(summaries)
  if (entries.length === 0) return

  const rows = entries.map(([weaponId, info]) => {
    const stats = info.StatsTotal ?? info.statsTotal ?? {}
    return {
      playerId,
      shard,
      weaponId,
      weaponName: info.XPTotal !== undefined ? weaponId : weaponId,
      kills:     Math.round(stats.Kills ?? stats.kills ?? 0),
      damage:    parseFloat(stats.DamagePlayer ?? stats.damagePlayer ?? 0),
      headshots: Math.round(stats.HeadShots ?? stats.headShots ?? stats.headshots ?? 0),
      savedAt:   new Date(),
    }
  })

  // upsert: 기존 row 있으면 통계 업데이트
  for (const row of rows) {
    await prisma.playerWeaponStat.upsert({
      where: { playerId_weaponId: { playerId: row.playerId, weaponId: row.weaponId } },
      create: row,
      update: {
        kills:     row.kills,
        damage:    row.damage,
        headshots: row.headshots,
        shard:     row.shard,
        savedAt:   row.savedAt,
      },
    })
  }
}

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────
function getLifetimeStartingSeason(shard) {
  const map = {
    steam:  'division.bro.official.pc-2018-01',
    kakao:  'division.bro.official.pc-2018-01',
    psn:    'division.bro.official.playstation-01',
    xbox:   'division.bro.official.xbox-01',
    stadia: 'division.bro.official.console-07',
  };
  return map[shard] || 'division.bro.official.pc-2018-01';
}
