// 전 플랫폼 PUBG 라이브 통합 조회 (치지직 + 트위치 + 숲)
// 5분 캐시

import { redisGet, redisSet } from '../../../utils/redis.js'

const CACHE_KEY = 'streamers:all:v5'
const CACHE_TTL = 300

async function fetchPlatform(base, path) {
  try {
    const res = await fetch(`${base}${path}`)
    if (!res.ok) return { streamers: [] }
    return res.json()
  } catch {
    return { streamers: [] }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const cached = await redisGet(CACHE_KEY)
  if (cached) return res.status(200).json(cached)

  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  const [chzzkData, twitchData] = await Promise.all([
    fetchPlatform(base, '/api/streamers/chzzk'),
    fetchPlatform(base, '/api/streamers/twitch'),
  ])

  const all = [
    ...(chzzkData.streamers  || []),
    ...(twitchData.streamers || []),
  ].sort((a, b) => b.viewers - a.viewers)

  const data = {
    streamers: all,
    counts: {
      total:  all.length,
      chzzk:  (chzzkData.streamers  || []).length,
      twitch: (twitchData.streamers || []).length,
    },
    updatedAt: new Date().toISOString(),
  }

  await redisSet(CACHE_KEY, data, CACHE_TTL)
  return res.status(200).json(data)
}
