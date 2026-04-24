// pages/api/pubg/percentile.js — PlayerCache 기반 실제 백분위 계산
import prisma from '../../../utils/prisma'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { avgDamage, avgKills, winRate, top10Rate } = req.body ?? {}

  const d = Number(avgDamage) || 0
  const k = Number(avgKills)  || 0
  const w = Number(winRate)   || 0
  const t = Number(top10Rate) || 0

  try {
    // 실제 플레이 기록이 있는 유저만 대상 (avgDamage > 0)
    const [total, damageBelow, killsBelow, winBelow, top10Below] = await Promise.all([
      prisma.playerCache.count({ where: { avgDamage: { gt: 0 } } }),
      prisma.playerCache.count({ where: { avgDamage: { lt: d, gt: 0 } } }),
      prisma.playerCache.count({ where: { avgKills:  { lt: k, gt: 0 } } }),
      prisma.playerCache.count({ where: { winRate:   { lt: w, gt: 0 } } }),
      prisma.playerCache.count({ where: { top10Rate: { lt: t, gt: 0 } } }),
    ])

    if (total < 20) {
      // 데이터가 너무 적으면 백분위 의미 없음
      return res.status(200).json({ insufficient: true, total })
    }

    // 상위 N% = 100 - floor(나보다 낮은 수 / 전체 * 100)
    const toTop = (below) => Math.max(1, Math.ceil((1 - below / total) * 100))

    return res.status(200).json({
      total,
      avgDamage:  toTop(damageBelow),
      avgKills:   toTop(killsBelow),
      winRate:    toTop(winBelow),
      top10Rate:  toTop(top10Below),
    })
  } catch (err) {
    console.error('[percentile] DB 오류:', err.message)
    return res.status(500).json({ error: 'DB 조회 실패' })
  }
}
