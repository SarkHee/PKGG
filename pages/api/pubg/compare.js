// pages/api/pubg/compare.js
// 두 플레이어 비교 API — GET ?a=닉네임A&b=닉네임B (플랫폼 자동 감지)

import prisma from '../../../utils/prisma.js';
import { cachedPubgFetch, TTL } from '../../../utils/pubgApiCache.js';
import { calculateMMR } from '../../../utils/mmrCalculator';

const PUBG_BASE = 'https://api.pubg.com/shards';
// 이벤트/캐주얼 모드 제외 — normal-* 로 시작하거나 event 포함 모드
const EVENT_MODE_PREFIXES = ['normal', 'event'];
const PRIMARY_SHARDS   = ['steam', 'kakao']
const SECONDARY_SHARDS = ['psn', 'xbox']

// 단일 shard에서 플레이어 조회 → { playerId, shard, nickname, matchCount } | null
async function tryFetchOnShard(name, shard) {
  try {
    const data = await cachedPubgFetch(
      `${PUBG_BASE}/${shard}/players?filter[playerNames]=${encodeURIComponent(name)}`,
      { ttl: TTL.PLAYER }
    )
    if (!data?.data?.length) return null
    const player = data.data[0]
    const actualShard = player.attributes.shardId || shard
    if (actualShard !== shard) return null  // 다른 플랫폼 유저가 혼입된 경우
    return {
      playerId:   player.id,
      shard,
      nickname:   player.attributes.name,
      matchCount: player.relationships?.matches?.data?.length ?? 0,
    }
  } catch {
    return null
  }
}

// 닉네임으로 플레이어 자동 감지 → { playerId, shard, nickname }
// search.js findPlayerByName과 동일 로직: matchCount 기반 중복 제거
async function autoDetectPlayer(nickname) {
  // 1순위: DB 캐시 (shard 무관, 대소문자 무시)
  try {
    const cached = await prisma.playerCache.findFirst({
      where: {
        nickname: { equals: nickname, mode: 'insensitive' },
        pubgPlayerId: { not: null },
        pubgShardId:  { not: null },
      },
      orderBy: { lastUpdated: 'desc' },
      select: { pubgPlayerId: true, pubgShardId: true, nickname: true },
    })
    if (cached?.pubgPlayerId) {
      return { playerId: cached.pubgPlayerId, shard: cached.pubgShardId, nickname: cached.nickname }
    }
  } catch (_) {}

  // 2순위: steam·kakao 병렬 → matchCount로 실제 플랫폼 결정
  // (같은 accountId가 양쪽에서 발견되면 matchCount 높은 쪽이 실제 플랫폼)
  const primaryResults = await Promise.all(PRIMARY_SHARDS.map(sh => tryFetchOnShard(nickname, sh)))
  const primaryFound = primaryResults.filter(Boolean)

  if (primaryFound.length > 0) {
    const byId = new Map()
    for (const entry of primaryFound) {
      const existing = byId.get(entry.playerId)
      if (!existing || entry.matchCount > existing.matchCount) {
        byId.set(entry.playerId, entry)
      }
    }
    return [...byId.values()][0]
  }

  // 3순위: psn·xbox
  const secondaryResults = await Promise.all(SECONDARY_SHARDS.map(sh => tryFetchOnShard(nickname, sh)))
  const secondaryFound = secondaryResults.filter(Boolean)
  if (secondaryFound.length > 0) return secondaryFound[0]

  throw new Error(`플레이어 '${nickname}'을 찾을 수 없습니다.`)
}

// 일반전 + 경쟁전 전체 합산 (이벤트/캐주얼 제외)
function extractCombinedStats(seasonResponse, rankedResponse) {
  let tr = 0, tw = 0, tt = 0, tdmg = 0, tk = 0, ta = 0, ts = 0;

  // 일반전 모든 모드 합산
  const gameModeStats = seasonResponse?.data?.attributes?.gameModeStats || {};
  for (const [mode, s] of Object.entries(gameModeStats)) {
    if (EVENT_MODE_PREFIXES.some(p => mode.startsWith(p))) continue;
    if (!s?.roundsPlayed) continue;
    tr   += s.roundsPlayed;
    tw   += s.wins          || 0;
    tt   += s.top10s        || 0;
    tdmg += s.damageDealt   || 0;
    tk   += s.kills         || 0;
    ta   += s.assists       || 0;
    ts   += s.timeSurvived  || 0;
  }

  // 경쟁전 모든 모드 합산
  const rankedModeStats = rankedResponse?.data?.attributes?.rankedGameModeStats || {};
  for (const rm of Object.values(rankedModeStats)) {
    if (!rm?.roundsPlayed) continue;
    tr   += rm.roundsPlayed;
    tw   += rm.wins         || 0;
    tt   += rm.top10s       || 0;
    tdmg += rm.damageDealt  || 0;
    tk   += rm.kills        || 0;
    ta   += rm.assists      || 0;
    ts   += rm.timeSurvived || 0;
  }

  if (tr === 0) return null;

  // 경쟁전 대표 티어 (squad-fpp 우선)
  const rms = rankedModeStats;
  const tierData = rms['squad-fpp'] || rms['squad'] || Object.values(rms)[0];
  return {
    roundsPlayed:   tr,
    avgDamage:      tdmg / tr,
    avgKills:       tk   / tr,
    avgAssists:     ta   / tr,
    avgSurviveTime: ts   / tr,
    winRate:        (tw  / tr) * 100,
    top10Rate:      (tt  / tr) * 100,
    tier:      tierData?.currentTier?.tier    || null,
    subTier:   tierData?.currentTier?.subTier || null,
    rankPoint: tierData?.currentRankPoint     || null,
    bestTier:  tierData?.bestTier?.tier       || null,
  };
}

function formatStats(stats) {
  const mmr = stats ? calculateMMR(stats) : 1000;
  return {
    mmr,
    roundsPlayed:   stats?.roundsPlayed ?? 0,
    avgDamage:      Math.round(stats?.avgDamage      ?? 0),
    avgKills:       parseFloat((stats?.avgKills       ?? 0).toFixed(2)),
    avgAssists:     parseFloat((stats?.avgAssists     ?? 0).toFixed(2)),
    avgSurviveTime: Math.round(stats?.avgSurviveTime  ?? 0),
    winRate:        parseFloat((stats?.winRate        ?? 0).toFixed(1)),
    top10Rate:      parseFloat((stats?.top10Rate      ?? 0).toFixed(1)),
    primaryMode:    stats?.primaryMode ?? null,
    hasData:        !!stats,
    tier:      stats?.tier      ?? null,
    subTier:   stats?.subTier   ?? null,
    rankPoint: stats?.rankPoint ?? null,
    bestTier:  stats?.bestTier  ?? null,
  };
}

// DB 캐시에서 최근 N경기 기반 스탯 조회 (플레이어 페이지와 동일한 MMR 소스)
async function getCachedStats(playerId, nickname) {
  try {
    const cache = await prisma.playerCache.findFirst({
      where: {
        OR: [
          { pubgPlayerId: playerId },
          { pubgPlayerId: null, nickname: { equals: nickname, mode: 'insensitive' } },
        ],
      },
      orderBy: { lastUpdated: 'desc' },
      select: {
        avgDamage: true, avgKills: true, avgAssists: true,
        avgSurviveTime: true, winRate: true, top10Rate: true,
      },
    })
    if (!cache || (!cache.avgDamage && !cache.avgKills)) return null
    return {
      avgDamage:      cache.avgDamage      || 0,
      avgKills:       cache.avgKills       || 0,
      avgAssists:     cache.avgAssists     || 0,
      avgSurviveTime: cache.avgSurviveTime || 0,
      winRate:        cache.winRate        || 0,
      top10Rate:      cache.top10Rate      || 0,
    }
  } catch { return null }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { a, b } = req.query;
  if (!a || !b) return res.status(400).json({ error: '두 닉네임이 필요합니다.' });
  if (a.toLowerCase() === b.toLowerCase())
    return res.status(400).json({ error: '같은 닉네임을 비교할 수 없습니다.' });

  try {
    // 두 플레이어 플랫폼 자동 감지 (병렬)
    const [infoA, infoB] = await Promise.all([
      autoDetectPlayer(a),
      autoDetectPlayer(b),
    ])

    // 각 플랫폼의 현재 시즌 조회 (서로 다른 shard일 수 있음)
    const shards = [...new Set([infoA.shard, infoB.shard])]
    const seasonMap = {}
    await Promise.all(shards.map(async (sh) => {
      const seasonData = await cachedPubgFetch(`${PUBG_BASE}/${sh}/seasons`, { ttl: TTL.SEASON })
      const current = seasonData?.data?.find((s) => s.attributes.isCurrentSeason)
      if (!current) throw new Error('현재 시즌을 찾을 수 없습니다.')
      seasonMap[sh] = current.id
    }))

    // 일반게임 + 경쟁전 스탯 4개 병렬 조회
    const [seasonA, rankedA, seasonB, rankedB] = await Promise.all([
      cachedPubgFetch(
        `${PUBG_BASE}/${infoA.shard}/players/${infoA.playerId}/seasons/${seasonMap[infoA.shard]}`,
        { ttl: TTL.PLAYER }
      ),
      cachedPubgFetch(
        `${PUBG_BASE}/${infoA.shard}/players/${infoA.playerId}/seasons/${seasonMap[infoA.shard]}/ranked`,
        { ttl: TTL.PLAYER }
      ).catch(() => null),
      cachedPubgFetch(
        `${PUBG_BASE}/${infoB.shard}/players/${infoB.playerId}/seasons/${seasonMap[infoB.shard]}`,
        { ttl: TTL.PLAYER }
      ),
      cachedPubgFetch(
        `${PUBG_BASE}/${infoB.shard}/players/${infoB.playerId}/seasons/${seasonMap[infoB.shard]}/ranked`,
        { ttl: TTL.PLAYER }
      ).catch(() => null),
    ])

    // DB 캐시 스탯 조회 (플레이어 페이지와 동일한 MMR 소스, 병렬)
    const [dbA, dbB] = await Promise.all([
      getCachedStats(infoA.playerId, infoA.nickname),
      getCachedStats(infoB.playerId, infoB.nickname),
    ])

    function buildPlayerResult(info, seasonData, rankedData, dbStats) {
      const combinedStats = extractCombinedStats(seasonData, rankedData)
      const mmrSource     = combinedStats || dbStats
      const mmr           = mmrSource ? calculateMMR(mmrSource) : 1000
      const combined      = formatStats(combinedStats)
      return {
        nickname: info.nickname,
        shard:    info.shard,
        playerId: info.playerId,
        mmr,
        combined: { ...combined, mmr },
      }
    }

    res.status(200).json({
      playerA: buildPlayerResult(infoA, seasonA, rankedA, dbA),
      playerB: buildPlayerResult(infoB, seasonB, rankedB, dbB),
      season: seasonMap[infoA.shard],
    })
  } catch (error) {
    const status = error.message.includes('찾을 수 없습니다') ? 404 : 500;
    res.status(status).json({ error: error.message });
  }
}
