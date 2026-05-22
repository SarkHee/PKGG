// GET /api/team-damage/[matchId]
// 특정 경기의 팀 내 피해 통계 조회
import prisma from '../../../utils/prisma.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET 메소드만 지원됩니다.' })
  }

  const { matchId } = req.query
  if (!matchId) {
    return res.status(400).json({ error: 'matchId가 필요합니다.' })
  }

  try {
    const rows = await prisma.teamDamageStat.findMany({
      where: { matchId },
      orderBy: { totalDamage: 'desc' },
    })

    return res.status(200).json({ matchId, rows })
  } catch (err) {
    console.error('[team-damage] 조회 오류:', err.message)
    return res.status(500).json({ error: '팀 내 피해 데이터 조회 중 오류가 발생했습니다.' })
  }
}
