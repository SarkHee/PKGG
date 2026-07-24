import { cachedPubgFetch, TTL } from '../../../utils/pubgApiCache'
import prisma from '../../../utils/prisma.js'
import { calculateMMR } from '../../../utils/mmrCalculator'
import { redisGet, redisSet } from '../../../utils/redis.js'

const SEARCH_TTL = 600 // 10분
function searchCacheKey(shard, nickname) {
  return `search:${shard}:${nickname.toLowerCase()}`
}

// 검색 제한 닉네임 캐시 (5분 TTL, DB 부하 감소)
let _restrictedCache = null
let _restrictedCacheAt = 0
const RESTRICTED_CACHE_MS = 30 * 1000

async function getRestrictedSet() {
  const now = Date.now()
  if (_restrictedCache && now - _restrictedCacheAt < RESTRICTED_CACHE_MS) {
    return _restrictedCache
  }
  try {
    const rows = await prisma.restrictedPlayer.findMany({
      where: { type: { in: ['search_restricted', 'banned'] } },
      select: { nickname: true },
    })
    _restrictedCache = new Set(rows.map((r) => r.nickname.toLowerCase()))
    _restrictedCacheAt = now
  } catch {
    _restrictedCache = _restrictedCache ?? new Set()
  }
  return _restrictedCache
}

async function isRestricted(nickname) {
  const set = await getRestrictedSet()
  return set.has(nickname.toLowerCase())
}

// Steam·Kakao 우선, PSN·Xbox는 두 곳 모두 없을 때만
const PRIMARY_SHARDS   = ['steam', 'kakao']
const SECONDARY_SHARDS = ['psn', 'xbox']

// returns { player } | { notFound: true } | { apiError: true }
async function tryFetchPlayer(name, shard, pubgBase) {
  try {
    const json = await cachedPubgFetch(
      `${pubgBase}/${shard}/players?filter[playerNames]=${encodeURIComponent(name)}`,
      { ttl: TTL.PLAYER }
    )
    if (!json.data?.length) return { notFound: true }
    const player = json.data[0]
    if (await isRestricted(player.attributes.name)) return { notFound: true }
    const actualShard = player.attributes.shardId || shard
    if (actualShard !== shard) return { notFound: true }
    return {
      player: {
        shard:      actualShard,
        nickname:   player.attributes.name,
        accountId:  player.id,
        matchCount: player.relationships?.matches?.data?.length ?? 0,
      }
    }
  } catch {
    return { apiError: true }
  }
}

// 닉네임으로 플레이어 검색
// 1단계: steam+kakao 병렬 → 2단계: 없으면 psn+xbox 병렬
async function findPlayerByName(name, pubgBase) {
  const primaryResults = await Promise.allSettled(
    PRIMARY_SHARDS.map(shard => tryFetchPlayer(name, shard, pubgBase))
  )
  const found = primaryResults
    .filter(r => r.status === 'fulfilled' && r.value?.player)
    .map(r => r.value.player)

  if (found.length === 0) {
    const secondaryResults = await Promise.allSettled(
      SECONDARY_SHARDS.map(shard => tryFetchPlayer(name, shard, pubgBase))
    )
    const secondary = secondaryResults
      .filter(r => r.status === 'fulfilled' && r.value?.player)
      .map(r => r.value.player)
    return secondary
  }

  // 크로스플레이로 인해 동일 계정이 steam·kakao 양쪽 검색에서 모두 반환될 수 있음.
  // PUBG API shardId가 검색한 샤드와 일치하는 값을 반환해 필터로 구별 불가.
  // matchCount(최근 매치 수)가 더 많은 shard를 실제 플랫폼으로 판단.
  // 둘 다 0이거나 동일하면 steam 기본값 유지(대부분 steam 유저이므로).
  const byAccountId = new Map()
  for (const entry of found) {
    const existing = byAccountId.get(entry.accountId)
    if (!existing) {
      byAccountId.set(entry.accountId, entry)
    } else if (entry.matchCount > existing.matchCount) {
      byAccountId.set(entry.accountId, entry) // 매치 수 많은 shard 우선
    } else if (entry.matchCount === existing.matchCount && entry.shard === 'steam') {
      byAccountId.set(entry.accountId, entry) // 동률이면 steam 기본값
    }
  }
  return [...byAccountId.values()]
}

// 플랫폼 감지 결과를 기존 PlayerCache 레코드에 백필 (fire-and-forget)
// 빈 스탯 레코드를 새로 생성하지 않음 — 신규 유저는 플레이어 페이지 방문 시 full 저장됨
async function savePlayerCache(accountId, nickname, shard) {
  try {
    // 올바른 shard 레코드가 이미 있는지 확인
    const correctRecord = await prisma.playerCache.findFirst({
      where: { pubgPlayerId: accountId, pubgShardId: shard },
    })
    if (correctRecord) {
      // 올바른 레코드 있음 → 잘못된 shard 레코드만 삭제
      await prisma.playerCache.deleteMany({
        where: { pubgPlayerId: accountId, pubgShardId: { not: shard } },
      })
    } else {
      // 없음 → 기존 레코드 shard 수정 (unique 충돌 없이 안전하게)
      await prisma.playerCache.updateMany({
        where: { pubgPlayerId: accountId },
        data: { pubgShardId: shard, lastUpdated: new Date() },
      })
    }
  } catch (e) {
    console.warn('[search] PlayerCache shard 수정 실패:', e.message)
  }
}

async function getClanInfo(nickname) {
  try {
    const member = await prisma.clanMember.findFirst({
      where: { nickname: { equals: nickname, mode: 'insensitive' } },
      select: { clan: { select: { name: true, pubgClanTag: true } } },
    })
    return member?.clan ? { clanName: member.clan.name, clanTag: member.clan.pubgClanTag || null } : null
  } catch { return null }
}

function buildStats(row) {
  return {
    avgDamage:   Math.round(row.avgDamage || 0),
    avgKills:    Number((row.avgKills || 0).toFixed(2)),
    winRate:     Number((row.winRate || 0).toFixed(1)),
    top10Rate:   Number((row.top10Rate || 0).toFixed(1)),
    avgAssists:  Number((row.avgAssists || 0).toFixed(2)),
    mmr: calculateMMR({
      avgDamage:      row.avgDamage      || 0,
      avgKills:       row.avgKills        || 0,
      avgAssists:     row.avgAssists      || 0,
      avgSurviveTime: row.avgSurviveTime  || 0,
      winRate:        row.winRate         || 0,
      top10Rate:      row.top10Rate       || 0,
    }),
    style:        row.style || null,
    lastUpdated:  row.lastUpdated,
    roundsPlayed: row.roundsPlayed || 0,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { nickname } = req.query
  if (!nickname || nickname.trim().length < 2) {
    return res.status(400).json({ error: '닉네임을 2자 이상 입력하세요' })
  }

  const name      = nickname.trim()
  const shardFilter = req.query.shard || null
  const PUBG_BASE = 'https://api.pubg.com/shards'

  // DB에 저장된 정확한 케이스 닉네임 조회 (PUBG API는 대소문자 구별)
  async function resolveCorrectCase(inputName) {
    try {
      const hit = await prisma.playerCache.findFirst({
        where: { nickname: { equals: inputName, mode: 'insensitive' } },
        orderBy: { lastUpdated: 'desc' },
        select: { nickname: true },
      })
      return hit?.nickname || inputName
    } catch { return inputName }
  }

  // CDN 캐시 60초 신선 + 300초 stale-while-revalidate
  // 같은 닉네임 검색: 60초간 Edge 즉시 반환, 60~360초는 stale 즉시 반환 + 백그라운드 갱신
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')

  try {
    // ── Step 0: Redis 캐시 (TTL 10분, cold start 무관 전역 공유) ────────────
    if (shardFilter) {
      const redisKey = searchCacheKey(shardFilter, name)
      const cached = await redisGet(redisKey)
      if (cached) {
        console.log(`[Redis/search] HIT: ${redisKey}`)
        return res.json(cached)
      }
    }

    // ── Step 1: DB-first → PUBG API fallback ─────────────────────────────
    // DB에 이미 저장된 플레이어는 cold start와 무관하게 즉시 반환.
    // DB에 없을 때만 PUBG API 호출. API 오류는 "찾을 수 없음"과 구분해서 전달.
    let found = []

    if (shardFilter) {
      // DB hit check (known player → skip PUBG API entirely)
      const dbHit = await prisma.playerCache.findFirst({
        where: {
          nickname: { equals: name, mode: 'insensitive' },
          pubgShardId: shardFilter,
          pubgPlayerId: { not: null },
        },
        orderBy: { lastUpdated: 'desc' },
        select: { pubgPlayerId: true, pubgShardId: true, nickname: true },
      })

      if (dbHit?.pubgPlayerId) {
        if (await isRestricted(dbHit.nickname)) {
          return res.json({ results: [] })
        }
        // 기존 유저: DB 그대로 반환 + 백그라운드 갱신
        found = [{
          shard:      dbHit.pubgShardId,
          nickname:   dbHit.nickname,
          accountId:  dbHit.pubgPlayerId,
          matchCount: 0,
        }]
        tryFetchPlayer(name, shardFilter, PUBG_BASE).catch(() => {})
      } else {
        // DB 미스 (해당 shard) → 다른 shard DB에서 케이스 보정 후 PUBG API
        const correctName = await resolveCorrectCase(name)
        found = await findPlayerByName(correctName, PUBG_BASE)
        if (found.length === 0) {
          // 자동 감지 실패 시 지정 샤드 단독 시도
          const result = await tryFetchPlayer(correctName, shardFilter, PUBG_BASE)
          if (result.apiError) {
            return res.status(503).json({ results: [], retry: true, error: 'PUBG API 연결 실패' })
          }
          if (result.player) found = [result.player]
        }
        for (const p of found) savePlayerCache(p.accountId, p.nickname, p.shard)
      }
    } else {
      // shardFilter 없음: DB 대소문자 무관 조회 우선 → 없으면 PUBG API
      // PUBG API는 대소문자 구분(case-sensitive)이므로 DB hit 시 PUBG API 불필요
      const dbRows = await prisma.playerCache.findMany({
        where: { nickname: { equals: name, mode: 'insensitive' }, pubgPlayerId: { not: null } },
        orderBy: { lastUpdated: 'desc' },
        select: { pubgPlayerId: true, pubgShardId: true, nickname: true },
      })

      if (dbRows.length > 0) {
        if (await isRestricted(dbRows[0].nickname)) {
          return res.json({ results: [] })
        }
        // DB hit여도 PUBG API로 실제 shard 확인 — 잘못 저장된 shard 즉시 수정
        const correctName = dbRows[0].nickname
        const apiFound = await findPlayerByName(correctName, PUBG_BASE)
        if (apiFound.length > 0) {
          found = apiFound
          // API shard와 DB shard가 다르면 DB + Redis 교정 (잘못 저장된 shard 수정)
          for (const p of apiFound) {
            const dbMatch = dbRows.find(r => r.pubgPlayerId === p.accountId)
            if (dbMatch && dbMatch.pubgShardId !== p.shard) {
              console.log(`[search] shard 교정: ${p.nickname} ${dbMatch.pubgShardId} → ${p.shard}`)
              savePlayerCache(p.accountId, p.nickname, p.shard)
              // 이전 shard의 Redis 캐시를 빈 결과로 덮어써 무효화
              redisSet(searchCacheKey(dbMatch.pubgShardId, p.nickname), { results: [] }, 60).catch(() => {})
            }
          }
        } else {
          // PUBG API 실패 → DB 데이터 fallback
          const byId = new Map()
          for (const u of dbRows) {
            if (!byId.has(u.pubgPlayerId))
              byId.set(u.pubgPlayerId, { shard: u.pubgShardId, nickname: u.nickname, accountId: u.pubgPlayerId, matchCount: 0 })
          }
          found = [...byId.values()]
        }
      } else {
        // DB 미스 → PUBG API
        found = await findPlayerByName(name, PUBG_BASE)
        for (const p of found) savePlayerCache(p.accountId, p.nickname, p.shard)
      }
    }

    if (found.length === 0) return res.json({ results: [] })

    // ── Step 2: DB 스탯 보강 + 결과 조합 ────────────────────────────────
    const rawResults = await Promise.all(found.map(async entry => {
      const { accountId, shard: apiShard, nickname: nick, matchCount } = entry

      // DB에서 accountId 또는 닉네임으로 스탯 조회
      const cache = await prisma.playerCache.findFirst({
        where: {
          OR: [
            { pubgPlayerId: accountId },
            { pubgPlayerId: null, nickname: { equals: nick, mode: 'insensitive' } },
          ],
        },
        orderBy: { lastUpdated: 'desc' },
        select: {
          id: true, pubgPlayerId: true, pubgShardId: true,
          avgDamage: true, avgKills: true, avgAssists: true, avgSurviveTime: true,
          winRate: true, top10Rate: true, style: true, lastUpdated: true, roundsPlayed: true,
          isSearchHidden: true,
        },
      })

      // 본인이 검색 노출을 꺼둔 계정은 검색 결과에서 제외 (누가 검색하든 예외 없음)
      if (cache?.isSearchHidden) return null

      // findPlayerByName이 cross-play 보정 로직 포함 → API shard 신뢰
      // (kakao 유저가 steam으로 잘못 나오는 경우를 dedup 로직이 이미 처리)
      const shard = apiShard

      // accountId 백필만 수행 — shard는 덮어쓰지 않음
      if (cache?.id && !cache.pubgPlayerId) {
        prisma.playerCache.update({
          where: { id: cache.id },
          data: { pubgPlayerId: accountId, nickname: nick },
        }).catch(() => {})
      }

      const clanInfo = await getClanInfo(nick)
      return {
        shard, nickname: nick, accountId, matchCount,
        clanName: clanInfo?.clanName || null,
        clanTag:  clanInfo?.clanTag  || null,
        stats: cache ? buildStats(cache) : null,
      }
    }))

    const results = rawResults.filter(Boolean)
    const payload = { results }

    // Redis에 결과 저장 (fire-and-forget, shardFilter 있을 때만)
    if (shardFilter && results.length > 0) {
      redisSet(searchCacheKey(shardFilter, name), payload, SEARCH_TTL).catch(() => {})
    }

    return res.json(payload)
  } catch (e) {
    console.error('[search] 오류:', e.message)
    return res.status(500).json({ error: 'search failed' })
  }
}
