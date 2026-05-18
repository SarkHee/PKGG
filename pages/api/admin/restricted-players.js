import prisma from '../../../utils/prisma.js'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth].js'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'gonjia91@gmail.com'
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || ADMIN_EMAIL).split(',').map((e) => e.trim())

async function checkAdmin(req, res) {
  const pw = req.headers['x-admin-token'] || req.query.pw
  if (pw && pw === process.env.ADMIN_PASSWORD) return true
  const session = await getServerSession(req, res, authOptions)
  return ADMIN_EMAILS.includes(session?.user?.email)
}

export default async function handler(req, res) {
  const ok = await checkAdmin(req, res)
  if (!ok) return res.status(401).json({ error: '인증 필요' })

  // GET: 목록 조회
  if (req.method === 'GET') {
    const list = await prisma.restrictedPlayer.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return res.json({ list })
  }

  // POST: 추가
  if (req.method === 'POST') {
    const { nickname, type = 'search_restricted', reason } = req.body
    if (!nickname?.trim()) return res.status(400).json({ error: '닉네임 필수' })
    if (!['search_restricted', 'banned'].includes(type)) {
      return res.status(400).json({ error: '타입은 search_restricted 또는 banned' })
    }
    const session = await getServerSession(req, res, authOptions)
    try {
      const row = await prisma.restrictedPlayer.upsert({
        where: { nickname_type: { nickname: nickname.trim(), type } },
        create: { nickname: nickname.trim(), type, reason: reason || null, createdBy: session?.user?.email || 'admin' },
        update: { reason: reason || null, createdBy: session?.user?.email || 'admin', createdAt: new Date() },
      })
      // 검색 캐시 무효화 (Redis에 캐싱된 결과 제거)
      try {
        const { redisGet } = await import('../../../utils/redis.js')
        // Redis 직접 del은 REST URL 필요, 여기선 set TTL=0으로 만료 처리
        const { redisSet } = await import('../../../utils/redis.js')
        await Promise.all(['steam', 'kakao', 'psn', 'xbox'].map((shard) =>
          redisSet(`search:${shard}:${nickname.trim().toLowerCase()}`, null, 1)
        ))
      } catch { /* Redis 실패는 무시 */ }
      return res.json({ ok: true, row })
    } catch (e) {
      if (e.code === 'P2002') return res.status(409).json({ error: '이미 등록된 닉네임/타입' })
      return res.status(500).json({ error: e.message })
    }
  }

  // DELETE: 제거
  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'id 필수' })
    await prisma.restrictedPlayer.delete({ where: { id: Number(id) } })
    return res.json({ ok: true })
  }

  return res.status(405).end()
}
