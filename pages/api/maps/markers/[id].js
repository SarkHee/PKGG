import prisma from '../../../../utils/prisma.js'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth].js'

const ADMIN_EMAIL = 'sssyck123@gmail.com'

async function checkAdmin(req, res) {
  const pw = req.headers['x-admin-token'] || req.query.pw
  if (pw && pw === process.env.ADMIN_PASSWORD) return true
  const session = await getServerSession(req, res, authOptions)
  return session?.user?.email === ADMIN_EMAIL
}

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    const isAdmin = await checkAdmin(req, res)
    if (!isAdmin) return res.status(403).json({ error: 'Forbidden' })

    const { id } = req.query
    try {
      await prisma.mapMarker.delete({ where: { id: parseInt(id) } })
      return res.json({ ok: true })
    } catch {
      return res.status(404).json({ error: 'Not found' })
    }
  }

  res.setHeader('Allow', ['DELETE'])
  res.status(405).end()
}
