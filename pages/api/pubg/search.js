import { cachedPubgFetch, TTL } from '../../../utils/pubgApiCache'
import { PrismaClient } from '@prisma/client'
import { calculateMMR } from '../../../utils/mmrCalculator'

// 비공개 처리된 플레이어 목록 (shard 무관)
const PRIVATE_PLAYERS = [
  { nickname: 'X1ngDao' },
]

function isPrivate(nickname) {
  return PRIVATE_PLAYERS.some(
    (p) => p.nickname.toLowerCase() === nickname.toLowerCase()
  )
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { nickname } = req.query
  if (!nickname || nickname.trim().length < 2) {
    return res.status(400).json({ error: '닉네임을 2자 이상 입력하세요' })
  }

  const PUBG_BASE = 'https://api.pubg.com/shards'
  const shards = ['steam', 'kakao', 'psn', 'xbox']

  // 4 shard 병렬 검색
  const settled = await Promise.allSettled(
    shards.map(async (shard) => {
      try {
        const json = await cachedPubgFetch(
          `${PUBG_BASE}/${shard}/players?filter[playerNames]=${encodeURIComponent(nickname.trim())}`,
          { ttl: TTL.PLAYER }
        )
        if (json.data?.length > 0) {
          const player = json.data[0]
          const actualNickname = player.attributes.name
          if (isPrivate(actualNickname)) return null
          return { shard, nickname: actualNickname, accountId: player.id }
        }
        return null
      } catch {
        return null
      }
    })
  )

  const found = settled
    .filter((r) => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value)

  if (found.length === 0) {
    return res.json({ results: [] })
  }

  // PlayerCache에서 기본 스탯 조회 + 동일 accountId 중복 제거
  const prisma = new PrismaClient()
  try {
    const rawResults = await Promise.all(
      found.map(async ({ shard, nickname: nick, accountId }) => {
        const cache = await prisma.playerCache.findFirst({
          where: { pubgPlayerId: accountId },
          orderBy: { lastUpdated: 'desc' },
          select: {
            pubgShardId: true,
            avgDamage: true,
            avgKills: true,
            avgAssists: true,
            avgSurviveTime: true,
            winRate: true,
            top10Rate: true,
            style: true,
            lastUpdated: true,
          },
        })
        const mmr = cache ? calculateMMR({
          avgDamage: cache.avgDamage || 0,
          avgKills: cache.avgKills || 0,
          avgAssists: cache.avgAssists || 0,
          avgSurviveTime: cache.avgSurviveTime || 0,
          winRate: cache.winRate || 0,
          top10Rate: cache.top10Rate || 0,
        }) : 0
        return {
          shard,
          cachedShard: cache?.pubgShardId || null,
          nickname: nick,
          accountId,
          stats: cache
            ? {
                avgDamage: Math.round(cache.avgDamage || 0),
                avgKills: Number((cache.avgKills || 0).toFixed(2)),
                mmr,
                style: cache.style || null,
                lastUpdated: cache.lastUpdated,
              }
            : null,
        }
      })
    )

    // 동일 accountId가 여러 shard에서 발견된 경우 → DB에 등록된 shard만 남김
    const seenAccountIds = new Map()
    for (const r of rawResults) {
      if (!seenAccountIds.has(r.accountId)) {
        seenAccountIds.set(r.accountId, r)
      } else {
        const existing = seenAccountIds.get(r.accountId)
        // DB에 등록된 shard가 있으면 그걸 우선
        if (r.cachedShard && r.shard === r.cachedShard) {
          seenAccountIds.set(r.accountId, r)
        } else if (!existing.cachedShard && r.cachedShard && r.shard !== r.cachedShard) {
          // 기존도 캐시 없고 새것도 캐시 shard 불일치 → 기존 유지
        }
      }
    }

    // DB shard와 검색 shard가 다른 결과 제거 (캐시 없는 경우는 첫 발견 shard 사용)
    const results = [...seenAccountIds.values()]
      .filter((r) => !r.cachedShard || r.shard === r.cachedShard)
      .map(({ cachedShard: _c, ...rest }) => rest)

    // 모두 필터링됐다면 (DB에 없는 신규 유저) 첫 발견 결과 반환
    const finalResults = results.length > 0
      ? results
      : [...seenAccountIds.values()].slice(0, 1).map(({ cachedShard: _c, ...rest }) => rest)

    return res.json({ results: finalResults })
  } finally {
    await prisma.$disconnect()
  }
}
