import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth].js'
import prisma from '../../../utils/prisma.js'

const ADMIN_EMAIL = 'sssyck123@gmail.com'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return res.status(401).json({ error: '권한 없음' })
  }

  try {
    const inquiries = await prisma.inquiry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return res.json({ inquiries })
  } catch (e) {
    console.error('[admin/inquiries-panel]', e.message)
    return res.status(500).json({ error: e.message })
  }
}
