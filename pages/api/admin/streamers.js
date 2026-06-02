// pages/api/admin/streamers.js
// 스트리머 관리 API (관리자 전용)

import prisma from '../../../utils/prisma.js'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth].js'
import { searchChannel, getChannelInfo } from '../../../utils/chzzkApi.js'
import { redisSet } from '../../../utils/redis.js'

const ADMIN_EMAIL = 'sssyck123@gmail.com'

async function checkAdmin(req, res) {
  const pw = req.headers['x-admin-token'] || req.query.pw
  if (pw && pw === process.env.ADMIN_PASSWORD) return true
  const session = await getServerSession(req, res, authOptions)
  return session?.user?.email === ADMIN_EMAIL
}

export default async function handler(req, res) {
  const isAdmin = await checkAdmin(req, res)
  if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' })

  // GET — 전체 목록
  if (req.method === 'GET') {
    const streamers = await prisma.streamerList.findMany({
      orderBy: [{ isLive: 'desc' }, { viewerCount: 'desc' }, { createdAt: 'asc' }],
    })
    return res.status(200).json({ streamers })
  }

  // POST — 스트리머 추가
  if (req.method === 'POST') {
    const { nickname, shard, chzzkChannelId, streamerName, profileImage } = req.body
    if (!nickname || !chzzkChannelId || !streamerName) {
      return res.status(400).json({ error: 'nickname, chzzkChannelId, streamerName 필수' })
    }

    // 채널 존재 확인
    const info = await getChannelInfo(chzzkChannelId)
    if (!info) {
      return res.status(400).json({ error: '치지직 채널을 찾을 수 없습니다. 채널 ID를 다시 확인해주세요.' })
    }

    try {
      const streamer = await prisma.streamerList.create({
        data: {
          nickname,
          shard:         shard || 'steam',
          chzzkChannelId,
          streamerName,
          profileImage:  profileImage || null,
        },
      })
      // 캐시 무효화
      await redisSet('chzzk:live-status:v1', null, 1)
      return res.status(201).json({ streamer })
    } catch (e) {
      if (e.code === 'P2002') return res.status(409).json({ error: '이미 등록된 채널입니다.' })
      throw e
    }
  }

  // DELETE — 스트리머 제거
  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'id 필수' })
    await prisma.streamerList.delete({ where: { id: parseInt(id) } })
    await redisSet('chzzk:live-status:v1', null, 1)
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
