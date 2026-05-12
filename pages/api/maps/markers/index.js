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
  if (req.method === 'GET') {
    const { mapId } = req.query
    if (!mapId) return res.status(400).json({ error: 'mapId required' })
    try {
      const markers = await prisma.mapMarker.findMany({
        where: { mapId },
        orderBy: { createdAt: 'asc' },
      })
      return res.json({ markers })
    } catch (e) {
      console.error('map markers GET error:', e.message)
      return res.json({ markers: [] })
    }
  }

  if (req.method === 'POST') {
    const isAdmin = await checkAdmin(req, res)
    if (!isAdmin) return res.status(403).json({ error: 'Forbidden' })

    const { mapId, type, x, y, label } = req.body
    if (!mapId || !type || x == null || y == null) {
      return res.status(400).json({ error: 'mapId, type, x, y required' })
    }
    try {
      const marker = await prisma.mapMarker.create({
        data: { mapId, type, x: parseFloat(x), y: parseFloat(y), label: label || '' },
      })
      return res.status(201).json({ marker })
    } catch (e) {
      console.error('map markers POST error:', e.message)
      const msg = e.message?.includes('does not exist')
        ? 'DB 테이블 미생성 — Supabase에서 map_markers 테이블을 먼저 만들어주세요'
        : '저장 실패: ' + e.message
      return res.status(500).json({ error: msg })
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).end()
}
