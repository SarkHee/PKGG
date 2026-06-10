// utils/seasonStart.js
// 현재 시즌 시작일 자동 감지
// PUBG API로 시즌 ID를 감지하고, 변경 시 Redis에 자동 기록

import { redisGet, redisSet } from './redis.js'

// 알려진 시즌 시작일 (Redis 초기화 등 폴백용)
const SEASON_STARTS = {
  41: '2026-03-12T00:00:00Z',
  42: '2026-06-18T00:00:00Z',
}

const KEY_ID    = 'pkgg:season:id'
const KEY_START = 'pkgg:season:start'
const REDIS_TTL = 86400 * 100  // 100일

// 인메모리 캐시 (1시간)
let _cache = null
let _cacheAt = 0
const MEM_TTL = 60 * 60 * 1000

export async function getSeasonStart() {
  if (_cache && Date.now() - _cacheAt < MEM_TTL) return _cache

  try {
    const [cachedId, cachedStart] = await Promise.all([
      redisGet(KEY_ID),
      redisGet(KEY_START),
    ])

    const apiKey = process.env.PUBG_API_KEY
    if (!apiKey) throw new Error('PUBG_API_KEY 없음')

    const res = await fetch('https://api.pubg.com/shards/steam/seasons', {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/vnd.api+json' },
    })
    if (!res.ok) throw new Error(`PUBG API ${res.status}`)

    const json = await res.json()
    const current = json.data?.find(s => s.attributes?.isCurrentSeason)
    if (!current) throw new Error('현재 시즌 없음')

    const num = parseInt(current.id.match(/-(\d+)$/)?.[1] || '0')

    if (current.id !== cachedId) {
      // 시즌 변경 감지 → Redis 업데이트
      const startIso = SEASON_STARTS[num] || new Date().toISOString()
      await Promise.all([
        redisSet(KEY_ID, current.id, REDIS_TTL),
        redisSet(KEY_START, startIso, REDIS_TTL),
      ])
      console.log(`[season] 시즌 변경: ${cachedId ?? '없음'} → ${current.id} (시작: ${startIso})`)
      const result = { id: current.id, num, start: new Date(startIso) }
      _cache = result; _cacheAt = Date.now()
      return result
    }

    const startIso = cachedStart || SEASON_STARTS[num] || new Date().toISOString()
    const result = { id: current.id, num, start: new Date(startIso) }
    _cache = result; _cacheAt = Date.now()
    return result

  } catch (e) {
    console.warn('[season] 시즌 시작일 조회 실패, 폴백:', e.message)
    // 폴백: SEASON_STARTS에서 가장 최근 시즌
    const latest = Math.max(...Object.keys(SEASON_STARTS).map(Number))
    const result = {
      id: `division.bro.official.pc-2018-${latest}`,
      num: latest,
      start: new Date(SEASON_STARTS[latest]),
    }
    _cache = result; _cacheAt = Date.now()
    return result
  }
}
