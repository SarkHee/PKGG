// 트위치 PUBG 라이브 목록 조회
// 환경변수: TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET

import { redisGet, redisSet } from '../../../utils/redis.js'
import { getPubgLives } from '../../../utils/twitchApi.js'

const CACHE_KEY = 'streamers:twitch:v2'
const CACHE_TTL = 300 // 5분

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    return res.status(200).json({
      streamers:  [],
      platform:   'twitch',
      message:    'TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET 환경변수 미설정',
      updatedAt:  new Date().toISOString(),
    })
  }

  const cached = await redisGet(CACHE_KEY)
  if (cached) return res.status(200).json(cached)

  try {
    const streamers = await getPubgLives(100)
    const data = {
      streamers,
      platform:  'twitch',
      updatedAt: new Date().toISOString(),
    }
    await redisSet(CACHE_KEY, data, CACHE_TTL)
    return res.status(200).json(data)
  } catch (e) {
    console.error('[streamers/twitch]', e.message)
    return res.status(200).json({
      streamers: [],
      platform:  'twitch',
      error:     e.message,
      updatedAt: new Date().toISOString(),
    })
  }
}
