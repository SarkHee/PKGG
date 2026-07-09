// pages/api/maps/stats.js — 맵별 플레이 횟수 집계
import prisma from '../../../utils/prisma.js'
import { getSeasonStart, SEASON_STARTS } from '../../../utils/seasonStart.js'

const BR_MAPS = [
  'Baltic_Main', 'Desert_Main', 'Savage_Main', 'DihorOtok_Main',
  'Tiger_Main', 'Kiki_Main', 'Neon_Main', 'Summerland_Main', 'Chimera_Main',
]

// 지난 시즌 데이터를 MapStatSeason 아카이브에서 조회 (있으면 그걸 우선 사용)
// season-archive 배치가 아직 안 돈 과거 시즌이면 null을 반환해 실시간 집계로 폴백시킨다.
async function getArchivedMapStats(seasonNum, shard) {
  const rows = await prisma.mapStatSeason.findMany({
    where: { season: seasonNum, shard },
    orderBy: { playCount: 'desc' },
  })
  if (rows.length === 0) return null

  const total = rows.reduce((sum, r) => sum + r.playCount, 0)
  const stats = rows.map((r) => ({
    mapName: r.mapName,
    count: r.playCount,
    pct: r.percentage,
  }))
  return { stats, total }
}

function getSeasonDateRange(seasonNum) {
  if (!SEASON_STARTS[seasonNum]) return null
  const starts = Object.keys(SEASON_STARTS).map(Number).sort((a, b) => a - b)
  const idx = starts.indexOf(seasonNum)
  const start = new Date(SEASON_STARTS[seasonNum])
  const end = idx < starts.length - 1 ? new Date(SEASON_STARTS[starts[idx + 1]]) : null
  return { start, end }
}

export default async function handler(req, res) {
  try {
    const { shard = 'all', season = '' } = req.query
    const seasonNum = season ? parseInt(season, 10) : null

    if (seasonNum) {
      const { num: currentSeasonNum } = await getSeasonStart()
      if (seasonNum !== currentSeasonNum) {
        const archived = await getArchivedMapStats(seasonNum, shard)
        if (archived) {
          res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
          return res.status(200).json({ ...archived, season: seasonNum, archived: true })
        }
        // 아직 아카이브되지 않은 과거 시즌 → 아래에서 해당 시즌 기간으로 실시간 집계
      }
    }

    const shardFilter = shard && shard !== 'all' ? { shard } : {}
    const dateRange = seasonNum ? getSeasonDateRange(seasonNum) : null
    const dateFilter = dateRange
      ? { createdAt: { gte: dateRange.start, ...(dateRange.end ? { lt: dateRange.end } : {}) } }
      : {}

    const rows = await prisma.playerMatch.groupBy({
      by: ['mapName'],
      where: { mapName: { in: BR_MAPS }, ...shardFilter, ...dateFilter },
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
    return res.status(200).json({ stats, total, season: seasonNum, archived: false })
  } catch (e) {
    console.error('[maps/stats]', e.message)
    return res.status(500).json({ error: e.message })
  }
}
