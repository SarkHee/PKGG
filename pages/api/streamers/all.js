// 전 플랫폼 PUBG 라이브 통합 조회 (치지직 + 트위치)
// HTTP 자기호출 없이 함수 직접 import — Vercel 서버리스 타임아웃 방지

import { redisGet, redisSet }         from '../../../utils/redis.js'
import { getPubgLives as getChzzkLives } from '../../../utils/chzzkApi.js'
import { getPubgLives as getTwitchLives } from '../../../utils/twitchApi.js'

const CACHE_KEY = 'streamers:all:v8'
const CACHE_TTL = 300

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const cached = await redisGet(CACHE_KEY)
  if (cached) return res.status(200).json(cached)

  const [chzzkList, twitchList] = await Promise.allSettled([
    getChzzkLives(),
    getTwitchLives(100),
  ])

  const chzzk  = chzzkList.status  === 'fulfilled' ? (chzzkList.value  || []) : []
  const twitch = twitchList.status === 'fulfilled' ? (twitchList.value || []) : []

  const all = [...chzzk, ...twitch].sort((a, b) => b.viewers - a.viewers)

  const data = {
    streamers: all,
    counts: {
      total:  all.length,
      chzzk:  chzzk.length,
      twitch: twitch.length,
    },
    updatedAt: new Date().toISOString(),
  }

  await redisSet(CACHE_KEY, data, CACHE_TTL)
  return res.status(200).json(data)
}
