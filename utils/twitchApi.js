// utils/twitchApi.js
// Twitch Helix API 클라이언트
// - Client Credentials로 App Access Token 발급 (Redis 캐시, 자동 갱신)
// - PUBG 라이브 목록 조회 (game_id=493057)
// - 유저 프로필 이미지 배치 조회

import { redisGet, redisSet } from './redis.js'

const TOKEN_CACHE_KEY = 'twitch:app-token:v1'
const PUBG_GAME_ID    = '493057'

// ── 토큰 관리 ───────────────────────────────────────────────────────────────

export async function getAppToken() {
  const clientId     = process.env.TWITCH_CLIENT_ID
  const clientSecret = process.env.TWITCH_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  // 캐시 확인
  const cached = await redisGet(TOKEN_CACHE_KEY)
  if (cached) return cached

  try {
    const res = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     clientId,
        client_secret: clientSecret,
        grant_type:    'client_credentials',
      }),
    })
    if (!res.ok) throw new Error(`Token error: ${res.status}`)
    const data  = await res.json()
    const token = data.access_token
    if (!token) throw new Error('access_token 없음')

    // 만료 1시간 전까지 캐시
    const ttl = Math.max((data.expires_in || 3600) - 3600, 3600)
    await redisSet(TOKEN_CACHE_KEY, token, ttl)
    return token
  } catch (e) {
    console.error('[twitchApi] 토큰 발급 실패:', e.message)
    return null
  }
}

// 토큰 만료 시 캐시 삭제 후 재발급
async function getTokenWithRetry() {
  let token = await getAppToken()
  if (!token) return null
  return token
}

// ── API 요청 헬퍼 ────────────────────────────────────────────────────────────

async function twitchFetch(path, token, clientId) {
  const res = await fetch(`https://api.twitch.tv/helix${path}`, {
    headers: {
      'Client-ID':     clientId,
      'Authorization': `Bearer ${token}`,
    },
  })

  // 401 → 토큰 만료, 캐시 삭제 후 재시도
  if (res.status === 401) {
    await redisSet(TOKEN_CACHE_KEY, null, 1)
    const newToken = await getAppToken()
    if (!newToken) throw new Error('토큰 재발급 실패')
    const retry = await fetch(`https://api.twitch.tv/helix${path}`, {
      headers: {
        'Client-ID':     clientId,
        'Authorization': `Bearer ${newToken}`,
      },
    })
    if (!retry.ok) throw new Error(`Twitch API error: ${retry.status}`)
    return retry.json()
  }

  if (!res.ok) throw new Error(`Twitch API error: ${res.status}`)
  return res.json()
}

// ── PUBG 라이브 목록 ─────────────────────────────────────────────────────────

export async function getPubgLives(maxStreams = 50) {
  const clientId = process.env.TWITCH_CLIENT_ID
  const token    = await getTokenWithRetry()
  if (!token || !clientId) return []

  const streams = []
  let cursor    = null

  // 최대 2페이지 (50개씩) 조회
  for (let page = 0; page < 2 && streams.length < maxStreams; page++) {
    const qs = `game_id=${PUBG_GAME_ID}&first=50${cursor ? `&after=${cursor}` : ''}`
    const data = await twitchFetch(`/streams?${qs}`, token, clientId)
    const batch = data.data || []
    if (batch.length === 0) break
    streams.push(...batch)
    cursor = data.pagination?.cursor
    if (!cursor) break
  }

  // 중복 제거 후 시청자 수 내림차순
  const unique = [...new Map(streams.map((s) => [s.user_id, s])).values()]
    .sort((a, b) => b.viewer_count - a.viewer_count)
    .slice(0, maxStreams)

  if (unique.length === 0) return []

  // 프로필 이미지 배치 조회 (100개 제한)
  const userIds   = unique.map((s) => s.user_id)
  const profileMap = await getUserProfiles(userIds, token, clientId)

  return unique.map((s) => {
    const profile = profileMap[s.user_id] || {}
    const tags    = s.tags || []
    const hasDrops = tags.some((t) =>
      typeof t === 'string' && t.toLowerCase().includes('drop')
    )
    return {
      platform:       'twitch',
      streamerId:     s.user_id,
      streamerName:   s.user_name,
      streamerLogin:  s.user_login,
      streamerImage:  profile.profile_image_url || null,
      verified:       false,
      title:          s.title,
      viewers:        s.viewer_count ?? 0,
      thumbnail:      s.thumbnail_url
        ? s.thumbnail_url.replace('{width}', '440').replace('{height}', '248')
        : null,
      hasCustomThumb: true,
      hasDrops,
      tags,
      streamUrl:      `https://twitch.tv/${s.user_login}`,
      channelUrl:     `https://twitch.tv/${s.user_login}`,
      startedAt:      s.started_at,
    }
  })
}

// ── 유저 프로필 배치 조회 ────────────────────────────────────────────────────

async function getUserProfiles(userIds, token, clientId) {
  if (!userIds || userIds.length === 0) return {}
  try {
    // 100개씩 배치
    const results = {}
    for (let i = 0; i < userIds.length; i += 100) {
      const batch = userIds.slice(i, i + 100)
      const qs    = batch.map((id) => `id=${id}`).join('&')
      const data  = await twitchFetch(`/users?${qs}`, token, clientId)
      for (const u of (data.data || [])) {
        results[u.id] = u
      }
    }
    return results
  } catch (e) {
    console.error('[twitchApi] 프로필 조회 실패:', e.message)
    return {}
  }
}
