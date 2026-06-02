// 트위치 PUBG 라이브 목록 조회
// 환경변수 필요: TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET
// PUBG: BATTLEGROUNDS 게임 ID = 493057

import { redisGet, redisSet } from '../../../utils/redis.js'

const CACHE_KEY      = 'streamers:twitch:v1'
const TOKEN_CACHE_KEY = 'twitch:token:v1'
const CACHE_TTL      = 300  // 5분
const PUBG_GAME_ID   = '493057'

async function getTwitchToken() {
  const cached = await redisGet(TOKEN_CACHE_KEY)
  if (cached) return cached

  const clientId     = process.env.TWITCH_CLIENT_ID
  const clientSecret = process.env.TWITCH_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      grant_type:    'client_credentials',
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  const token = data.access_token
  if (!token) return null

  const ttl = (data.expires_in || 3600) - 120
  await redisSet(TOKEN_CACHE_KEY, token, ttl)
  return token
}

async function fetchTwitchPubgLives(token, clientId) {
  const res = await fetch(
    `https://api.twitch.tv/helix/streams?game_id=${PUBG_GAME_ID}&first=50`,
    {
      headers: {
        'Client-ID':     clientId,
        'Authorization': `Bearer ${token}`,
      },
    }
  )
  if (!res.ok) throw new Error(`Twitch API error: ${res.status}`)
  const json = await res.json()
  return (json.data || []).map((s) => {
    // 트위치 드롭스: 태그에 'Drops' 또는 'Drops Enabled' 포함 여부
    const tags = s.tags || []
    const hasDrops = tags.some((t) =>
      typeof t === 'string' && (t.toLowerCase().includes('drops') || t.toLowerCase().includes('드랍'))
    )
    return {
      platform:       'twitch',
      streamerId:     s.user_id,
      streamerName:   s.user_name,
      streamerImage:  null,  // users API 별도 호출 필요 — 생략
      verified:       false,
      title:          s.title,
      viewers:        s.viewer_count ?? 0,
      thumbnail:      s.thumbnail_url
        ? s.thumbnail_url.replace('{width}', '320').replace('{height}', '180')
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

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const clientId = process.env.TWITCH_CLIENT_ID
  if (!clientId || !process.env.TWITCH_CLIENT_SECRET) {
    return res.status(200).json({
      streamers: [], platform: 'twitch',
      message: 'TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET 환경변수 미설정',
      updatedAt: new Date().toISOString(),
    })
  }

  const cached = await redisGet(CACHE_KEY)
  if (cached) return res.status(200).json(cached)

  try {
    const token    = await getTwitchToken()
    if (!token) throw new Error('토큰 발급 실패')
    const streamers = await fetchTwitchPubgLives(token, clientId)
    streamers.sort((a, b) => b.viewers - a.viewers)
    const data = { streamers, platform: 'twitch', updatedAt: new Date().toISOString() }
    await redisSet(CACHE_KEY, data, CACHE_TTL)
    return res.status(200).json(data)
  } catch (e) {
    return res.status(200).json({ streamers: [], platform: 'twitch', error: e.message, updatedAt: new Date().toISOString() })
  }
}
