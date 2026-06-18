import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth].js'
import prisma from '../../../utils/prisma.js'

const ADMIN_EMAIL = 'sssyck123@gmail.com'

async function checkAdmin(req, res) {
  const pw = req.headers['x-admin-token'] || req.query.pw
  if (pw && pw === process.env.ADMIN_PASSWORD) return true
  const session = await getServerSession(req, res, authOptions)
  return session?.user?.email === ADMIN_EMAIL
}

// POST /api/admin/unban-player
// body: { nickname } 또는 { playerId }
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!(await checkAdmin(req, res))) return res.status(401).json({ error: '인증 필요' })

  const { nickname, playerId } = req.body
  if (!nickname && !playerId) return res.status(400).json({ error: 'nickname 또는 playerId 필요' })

  try {
    const where = playerId
      ? { pubgPlayerId: playerId }
      : { nickname: { equals: nickname, mode: 'insensitive' } }

    const result = await prisma.playerCache.updateMany({
      where,
      data: { isBanned: false, bannedAt: null, banCheckFailCount: 0 },
    })

    console.log(`[admin/unban] ${nickname || playerId} ban 해제 (${result.count}건)`)
    return res.json({ ok: true, count: result.count })
  } catch (e) {
    console.error('[admin/unban]', e.message)
    return res.status(500).json({ error: e.message })
  }
}
