// pages/api/maps/stats.js — 맵별 플레이 횟수 집계
import prisma from '../../../utils/prisma.js'

const BR_MAPS = [
  'Baltic_Main', 'Desert_Main', 'Savage_Main', 'DihorOtok_Main',
  'Tiger_Main', 'Kiki_Main', 'Neon_Main', 'Summerland_Main', 'Chimera_Main',
]

export default async function handler(req, res) {
  try {
    const { shard } = req.query
    const shardFilter = shard && shard !== 'all' ? { shard } : {}

    const rows = await prisma.playerMatch.groupBy({
      by: ['mapName'],
      where: { mapName: { in: BR_MAPS }, ...shardFilter },
      _count: { mapName: true },
      orderBy: { _count: { mapName: 'desc' } },
    })

    const total = rows.reduce((sum, r) => sum + r._count.mapName, 0)
    const stats = rows.map(r => ({
      mapName: r.mapName,
      count: r._count.mapName,
      pct: total > 0 ? Math.round((r._count.mapName / total) * 1000) / 10 : 0,
    }))

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).json({ stats, total })
  } catch (e) {
    console.error('[maps/stats]', e.message)
    return res.status(500).json({ error: e.message })
  }
}
