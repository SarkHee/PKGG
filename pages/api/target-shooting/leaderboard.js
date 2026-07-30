// GET /api/target-shooting/leaderboard — 점수 상위 10명
import prisma from '../../../utils/prisma.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  try {
    const rows = await prisma.targetShootingScore.findMany({
      orderBy: { score: 'desc' },
      take: 10,
      select: { id: true, nickname: true, score: true, createdAt: true, userId: true },
    })
    const leaderboard = rows.map(({ userId, ...rest }) => ({ ...rest, verified: userId != null }))
    return res.status(200).json({ leaderboard })
  } catch (e) {
    console.error('[target-shooting/leaderboard] 오류:', e.message)
    return res.status(500).json({ error: '리더보드를 불러오지 못했습니다.' })
  }
}
