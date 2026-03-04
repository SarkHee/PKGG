// pages/api/pubg/compare.js
// 두 플레이어 비교 API — GET ?a=닉네임A&b=닉네임B&shard=steam

import prisma from '../../../utils/prisma.js';
import { cachedPubgFetch, TTL } from '../../../utils/pubgApiCache.js';
import { calculateMMR } from '../../../utils/mmrCalculator';

const PUBG_BASE = 'https://api.pubg.com/shards';
const PRIORITY_MODES = ['squad-fpp', 'squad', 'duo-fpp', 'solo-fpp'];

async function getPlayerId(nickname, shard) {
  // 1순위: DB 캐시
  try {
    const cached = await prisma.playerCache.findFirst({
      where: { nickname: { equals: nickname, mode: 'insensitive' }, pubgShardId: shard },
      select: { pubgPlayerId: true },
    });
    if (cached?.pubgPlayerId) return cached.pubgPlayerId;

    const member = await prisma.clanMember.findFirst({
      where: { nickname: { equals: nickname, mode: 'insensitive' } },
      select: { pubgPlayerId: true },
    });
    if (member?.pubgPlayerId) return member.pubgPlayerId;
  } catch (_) {}

  // 2순위: PUBG API
  const data = await cachedPubgFetch(
    `${PUBG_BASE}/${shard}/players?filter[playerNames]=${encodeURIComponent(nickname)}`,
    { ttl: TTL.PLAYER }
  );
  const playerId = data?.data?.[0]?.id;
  if (!playerId) throw new Error(`플레이어 '${nickname}'을 찾을 수 없습니다.`);
  return playerId;
}

function extractStats(apiResponse) {
  const gameModeStats = apiResponse?.data?.attributes?.gameModeStats;
  if (!gameModeStats) return null;

  for (const mode of PRIORITY_MODES) {
    const s = gameModeStats[mode];
    if (s && s.roundsPlayed > 0) {
      const { roundsPlayed, kills, damageDealt, wins, top10s, assists, timeSurvived } = s;
      return {
        roundsPlayed,
        avgDamage:      damageDealt  / roundsPlayed,
        avgKills:       kills        / roundsPlayed,
        avgAssists:     assists      / roundsPlayed,
        avgSurviveTime: timeSurvived / roundsPlayed,
        winRate:        (wins   / roundsPlayed) * 100,
        top10Rate:      (top10s / roundsPlayed) * 100,
        primaryMode: mode,
      };
    }
  }
  return null;
}

function format(stats, nickname, playerId, shard) {
  const mmr = stats ? calculateMMR(stats) : 1000;
  return {
    nickname,
    playerId,
    shard,
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
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { a, b, shard = 'steam' } = req.query;
  if (!a || !b) return res.status(400).json({ error: '두 닉네임이 필요합니다.' });
  if (a.toLowerCase() === b.toLowerCase())
    return res.status(400).json({ error: '같은 닉네임을 비교할 수 없습니다.' });

  try {
    // 시즌 + 플레이어 ID 병렬 조회
    const [seasonData, idA, idB] = await Promise.all([
      cachedPubgFetch(`${PUBG_BASE}/${shard}/seasons`, { ttl: TTL.SEASON }),
      getPlayerId(a, shard),
      getPlayerId(b, shard),
    ]);

    const currentSeason = seasonData?.data?.find((s) => s.attributes.isCurrentSeason);
    if (!currentSeason) throw new Error('현재 시즌을 찾을 수 없습니다.');

    // 시즌 스탯 병렬 조회
    const [statsA, statsB] = await Promise.all([
      cachedPubgFetch(
        `${PUBG_BASE}/${shard}/players/${idA}/seasons/${currentSeason.id}`,
        { ttl: TTL.PLAYER }
      ),
      cachedPubgFetch(
        `${PUBG_BASE}/${shard}/players/${idB}/seasons/${currentSeason.id}`,
        { ttl: TTL.PLAYER }
      ),
    ]);

    res.status(200).json({
      playerA: format(extractStats(statsA), a, idA, shard),
      playerB: format(extractStats(statsB), b, idB, shard),
      season:  currentSeason.id,
    });
  } catch (error) {
    const status = error.message.includes('찾을 수 없습니다') ? 404 : 500;
    res.status(status).json({ error: error.message });
  }
}
