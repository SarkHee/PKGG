// pages/api/chzzk/live-status.js
// 등록된 스트리머 전체 방송 상태 체크 + DB 업데이트 (3분 캐시)

import prisma from '../../../utils/prisma.js'
import { redisGet, redisSet } from '../../../utils/redis.js'
import { getLiveStatus } from '../../../utils/chzzkApi.js'

const CACHE_KEY = 'chzzk:live-status:v1'
const CACHE_TTL = 180 // 3분

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  // force=1 로 캐시 무효화 가능
  const force = req.query.force === '1'

  if (!force) {
    const cached = await redisGet(CACHE_KEY)
    if (cached) return res.status(200).json(cached)
  }

  try {
    const streamers = await prisma.streamerList.findMany({
      orderBy: { createdAt: 'asc' },
    })

    if (streamers.length === 0) {
      return res.status(200).json({ streamers: [], updatedAt: new Date().toISOString() })
    }

    // 모든 스트리머 방송 상태 병렬 조회
    const results = await Promise.all(
      streamers.map(async (s) => {
        const live = await getLiveStatus(s.chzzkChannelId)
        return { ...s, liveData: live }
      })
    )

    // DB 일괄 업데이트
    await Promise.all(
      results.map(({ id, liveData }) =>
        prisma.streamerList.update({
          where: { id },
          data: {
            isLive:        liveData ? liveData.isLive        : false,
            viewerCount:   liveData ? liveData.viewerCount   : 0,
            streamTitle:   liveData ? liveData.streamTitle   : null,
            lastCheckedAt: new Date(),
          },
        }).catch(() => null)  // 개별 실패 무시
      )
    )

    // 최신 데이터 재조회
    const updated = await prisma.streamerList.findMany({
      orderBy: [{ isLive: 'desc' }, { viewerCount: 'desc' }, { createdAt: 'asc' }],
    })

    const data = { streamers: updated, updatedAt: new Date().toISOString() }
    await redisSet(CACHE_KEY, data, CACHE_TTL)
    return res.status(200).json(data)
  } catch (e) {
    console.error('[chzzk/live-status]', e)
    return res.status(500).json({ error: e.message })
  }
}
