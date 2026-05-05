// 오늘 경기 스탯 조회 API
// GET /api/pubg/today-stats?nickname=xxx&shard=steam
//
// 반환: { matchCount, bestKills, bestDamage, wins, top10s, matches[] }
// 오늘(00:00 ~ 현재) 플레이한 경기만 집계

import { cachedPubgFetch, TTL, PubgApiError } from '../../../utils/pubgApiCache'

const PUBG_BASE = 'https://api.pubg.com/shards'

const EVENT_MATCH_TYPES = new Set(['event', 'casual', 'airoyale', 'custom', 'arcade'])
const EVENT_MODE_KEYWORDS = ['tdm', 'ibr', 'arcade', 'training']
const EVENT_MAP_KEYWORDS  = ['_tdm_', '_training_', 'range_main', 'pillarcompound', 'boardwalk']

function isEventMatch(matchType, gameMode, mapName) {
  if (EVENT_MATCH_TYPES.has(matchType?.toLowerCase())) return true
  const mode = (gameMode || '').toLowerCase()
  if (EVENT_MODE_KEYWORDS.some(k => mode.includes(k))) return true
  const map = (mapName || '').toLowerCase()
  if (EVENT_MAP_KEYWORDS.some(k => map.includes(k))) return true
  return false
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { nickname, shard = 'steam' } = req.query
  if (!nickname) return res.status(400).json({ error: 'nickname이 필요합니다.' })

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  try {
    // 1. 플레이어 매치 목록 (최근 14개)
    const playerUrl = `${PUBG_BASE}/${shard}/players?filter[playerNames]=${encodeURIComponent(nickname)}`
    const playerJson = await cachedPubgFetch(playerUrl, { ttl: TTL.PLAYER })
    const pubgPlayer = playerJson.data?.[0]
    if (!pubgPlayer) return res.status(404).json({ error: '플레이어를 찾을 수 없습니다.' })

    const matchIds = (pubgPlayer.relationships?.matches?.data || []).map(m => m.id).slice(0, 14)
    if (matchIds.length === 0) return res.json({ matchCount: 0, bestKills: 0, bestDamage: 0, wins: 0, top10s: 0, matches: [] })

    // 2. 매치 상세 병렬 조회 (캐시 30분 — 매치는 불변 데이터)
    const results = await Promise.allSettled(
      matchIds.map(id => cachedPubgFetch(`${PUBG_BASE}/${shard}/matches/${id}`, { ttl: TTL.MATCH }))
    )

    const todayMatches = []

    for (const r of results) {
      if (r.status !== 'fulfilled') continue
      const data     = r.value
      const attrs    = data.data?.attributes
      if (!attrs) continue

      // 오늘 경기만 필터
      const createdAt = new Date(attrs.createdAt)
      if (createdAt < todayStart) continue

      // 이벤트 매치 제외
      if (isEventMatch(attrs.matchType, attrs.gameMode, attrs.mapName)) continue

      const included     = data.included || []
      const participants = included.filter(i => i.type === 'participant')
      const me = participants.find(
        p => p.attributes.stats.name?.toLowerCase() === nickname.toLowerCase()
      )
      if (!me) continue

      const s = me.attributes.stats
      todayMatches.push({
        matchId:   data.data.id,
        kills:     s.kills || 0,
        damage:    Math.round(s.damageDealt || 0),
        placement: s.winPlace || 99,
        assists:   s.assists || 0,
        mode:      attrs.gameMode,
        createdAt: attrs.createdAt,
      })
    }

    if (todayMatches.length === 0) {
      return res.json({ matchCount: 0, bestKills: 0, bestDamage: 0, wins: 0, top10s: 0, matches: [] })
    }

    const bestKills  = Math.max(...todayMatches.map(m => m.kills))
    const bestDamage = Math.max(...todayMatches.map(m => m.damage))
    const wins       = todayMatches.filter(m => m.placement === 1).length
    const top10s     = todayMatches.filter(m => m.placement <= 10).length

    return res.json({
      matchCount: todayMatches.length,
      bestKills,
      bestDamage,
      wins,
      top10s,
      matches: todayMatches,
    })
  } catch (err) {
    if (err instanceof PubgApiError) {
      return res.status(err.status || 500).json({ error: err.message })
    }
    console.error('[today-stats]', err.message)
    return res.status(500).json({ error: '오늘 스탯 조회 중 오류가 발생했습니다.' })
  }
}
