// pages/api/donations/count.js
import prisma from '../../../utils/prisma'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const row = await prisma.donationCounter.findUnique({ where: { id: 1 } })
      return res.status(200).json({ count: row?.count ?? 0 })
    } catch (e) {
      console.error('[donations/count GET]', e.message)
      return res.status(200).json({ count: 0 })
    }
  }

  if (req.method === 'POST') {
    try {
      const row = await prisma.donationCounter.upsert({
        where: { id: 1 },
        update: { count: { increment: 1 } },
        create: { id: 1, count: 1 },
      })
      return res.status(200).json({ count: row.count })
    } catch (e) {
      return res.status(200).json({ count: 0, error: e.message })
    }
  }

  return res.status(405).end()
}
