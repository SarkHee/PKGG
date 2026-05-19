// pages/api/pubg/leaderboard.js
// PUBG 공식 리더보드 API — 상위 500명
// GET /api/pubg/leaderboard?platform=pc-as&gameMode=squad-fpp&seasonId=...

const CACHE_TTL_MS = 2 * 60 * 60 * 1000 // 2시간

// platform + gameMode + season → { data, ts }
const memCache = new Map()

// 리더보드 API는 region 기반 shard 사용 (steam/kakao X)
const VALID_PLATFORMS = ['pc-na', 'pc-eu', 'pc-as', 'pc-sea', 'pc-sa']
const VALID_MODES     = ['squad-fpp', 'squad', 'duo-fpp', 'duo', 'solo-fpp', 'solo']

const TIER_ORDER = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Survivor']

function tierSort(tier) {
  const idx = TIER_ORDER.indexOf(tier)
  return idx === -1 ? 0 : idx
}

async function fetchLeaderboard(platform, gameMode, seasonId) {
  const cacheKey = `${platform}:${gameMode}:${seasonId}`
  const cached   = memCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { players: cached.data, fromCache: true }
  }

  const url = `https://api.pubg.com/shards/${platform}/leaderboards/${seasonId}/${gameMode}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.PUBG_API_KEY}`,
      Accept: 'application/vnd.api+json',
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`PUBG API ${res.status}: ${body.slice(0, 200)}`)
  }

  const json    = await res.json()
  const players = (json.included || []).map((p, idx) => {
    const a = p.attributes || {}
    const s = a.stats || {}
    return {
      rank:          a.rank ?? idx + 1,  // rank는 attributes에 있음 (stats X)
      accountId:     p.id,
      nickname:      a.name || '',
      tier:          s.tier || '',
      subTier:       s.subTier || '',
      rankPoints:    s.rankPoints || 0,
      wins:          s.wins || 0,
      games:         s.games || 0,
      winRatio:      s.winRatio || 0,
      averageDamage: s.averageDamage || 0,
      kills:         s.kills || 0,
      averageRank:   s.averageRank || 0,
      averageKill:   s.averageKill || 0,
    }
  })

  // rank 기준 정렬
  players.sort((a, b) => a.rank - b.rank)

  memCache.set(cacheKey, { data: players, ts: Date.now() })
  return { players, fromCache: false }
}

// 현재 시즌 ID 조회 (30분 캐시)
let _seasonCache = null
let _seasonCacheAt = 0
const SEASON_CACHE_MS = 30 * 60 * 1000

async function getCurrentSeason() {
  if (_seasonCache && Date.now() - _seasonCacheAt < SEASON_CACHE_MS) {
    return _seasonCache
  }
  const res = await fetch('https://api.pubg.com/shards/steam/seasons', {
    headers: {
      Authorization: `Bearer ${process.env.PUBG_API_KEY}`,
      Accept: 'application/vnd.api+json',
    },
  })
  if (!res.ok) throw new Error('시즌 조회 실패')
  const json = await res.json()
  const current = (json.data || []).find((s) => s.attributes?.isCurrentSeason)
  if (!current) throw new Error('현재 시즌 없음')
  _seasonCache  = current.id
  _seasonCacheAt = Date.now()
  return current.id
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const platform = req.query.platform || 'pc-as'
  const gameMode = req.query.gameMode || 'squad-fpp'

  if (!VALID_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `유효하지 않은 platform. 가능: ${VALID_PLATFORMS.join(', ')}` })
  }
  if (!VALID_MODES.includes(gameMode)) {
    return res.status(400).json({ error: `유효하지 않은 gameMode. 가능: ${VALID_MODES.join(', ')}` })
  }

  try {
    const seasonId = req.query.seasonId || await getCurrentSeason()
    const { players, fromCache } = await fetchLeaderboard(platform, gameMode, seasonId)

    res.setHeader('Cache-Control', 'public, s-maxage=7200, stale-while-revalidate=3600')
    return res.status(200).json({
      ok: true,
      seasonId,
      platform,
      gameMode,
      total: players.length,
      players,
      fromCache,
    })
  } catch (err) {
    console.error('[leaderboard]', err.message)
    return res.status(500).json({ ok: false, error: err.message })
  }
}
