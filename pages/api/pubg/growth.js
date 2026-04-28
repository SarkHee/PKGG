// pages/api/pubg/growth.js
// 플레이어 성장 추적 — GET ?nickname=xxx&shard=steam&limit=30

import prisma from '../../../utils/prisma'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { nickname, shard = 'steam', limit = '30' } = req.query
  if (!nickname) return res.status(400).json({ error: 'nickname is required' })

  try {
    const snapshots = await prisma.playerStatSnapshot.findMany({
      where: {
        nickname: { equals: nickname, mode: 'insensitive' },
        pubgShardId: shard,
      },
      orderBy: { capturedAt: 'asc' },
      take: Math.min(parseInt(limit, 10) || 30, 90),
      select: {
        score:          true,
        avgDamage:      true,
        avgKills:       true,
        avgAssists:     true,
        winRate:        true,
        top10Rate:      true,
        avgSurviveTime: true,
        capturedAt:     true,
      },
    })

    return res.status(200).json({ snapshots })
  } catch (err) {
    console.error('[growth] DB 오류:', err.message, err.code ?? '')
    return res.status(200).json({ snapshots: [] })
  }
}
