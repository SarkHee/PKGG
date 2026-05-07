import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth].js'
import prisma from '../../../utils/prisma.js'

const ADMIN_EMAIL = 'sssyck123@gmail.com'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end()

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return res.status(401).json({ error: '권한 없음' })
  }

  const id = parseInt(req.query.id)
  if (!id) return res.status(400).json({ error: 'id 필요' })

  try {
    await prisma.inquiry.delete({ where: { id } })
    return res.json({ ok: true })
  } catch (e) {
    console.error('[delete-inquiry]', e.message)
    return res.status(500).json({ error: e.message })
  }
}
