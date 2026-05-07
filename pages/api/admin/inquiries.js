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

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  if (!(await checkAdmin(req, res))) return res.status(401).json({ error: '인증 필요' })

  try {
    const inquiries = await prisma.inquiry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return res.json({ inquiries })
  } catch (e) {
    console.error('[admin/inquiries]', e.message)
    return res.status(500).json({ error: e.message })
  }
}
