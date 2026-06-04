// pages/api/player/landing-stats.js
// GET ?accountId=xxx&mapName=xxx  → 낙하지점 목록
// POST { accountId, mapName, locationX, locationY, matchId }  → 저장
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { accountId, mapName } = req.query
    if (!accountId) return res.status(400).json({ error: 'accountId required' })

    const where = { accountId }
    if (mapName) where.mapName = mapName

    const stats = await prisma.playerLandingStat.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { mapName: true, locationX: true, locationY: true, matchId: true },
    })
    return res.status(200).json({ stats })
  }

  if (req.method === 'POST') {
    const { accountId, mapName, locationX, locationY, matchId } = req.body
    if (!accountId || !mapName || locationX == null || locationY == null || !matchId) {
      return res.status(400).json({ error: 'missing fields' })
    }
    // 같은 matchId면 중복 저장 방지
    const exists = await prisma.playerLandingStat.findFirst({
      where: { accountId, matchId },
    })
    if (exists) return res.status(200).json({ skipped: true })

    const stat = await prisma.playerLandingStat.create({
      data: { accountId, mapName, locationX, locationY, matchId },
    })
    return res.status(200).json({ stat })
  }

  return res.status(405).end()
}
