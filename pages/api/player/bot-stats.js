// GET /api/player/bot-stats?nickname=xxx&shard=steam
// 봇킬/봇딜 비율 계산 → 전체 시즌 평균에 적용하기 위한 보정 계수 반환

import prisma from '../../../utils/prisma.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { nickname, shard = 'steam' } = req.query
  if (!nickname) return res.status(400).json({ error: 'nickname 필요' })

  try {
    const member = await prisma.clanMember.findFirst({
      where: { nickname: { equals: nickname, mode: 'insensitive' } },
      select: { pubgPlayerId: true },
    })

    if (!member?.pubgPlayerId) {
      return res.status(200).json({ analyzedCount: 0, botKillRatio: 0, botDamageRatio: 0 })
    }

    const agg = await prisma.playerMatch.aggregate({
      where: {
        pubgAccountId: member.pubgPlayerId,
        shard,
        isBotCorrected: true,
        // 이벤트/연습 경기 제외 (오염된 봇 데이터 방지)
        NOT: {
          OR: [
            { mapName: { contains: 'safehouse', mode: 'insensitive' } },
            { mapName: { contains: 'range_main', mode: 'insensitive' } },
            { mode:    { contains: 'heistroyale', mode: 'insensitive' } },
            { mode:    { contains: 'clansolo',    mode: 'insensitive' } },
            { mode:    { contains: 'clansquad',   mode: 'insensitive' } },
            { mode:    { contains: 'training',    mode: 'insensitive' } },
          ],
        },
      },
      _sum: { kills: true, botKills: true, damage: true, botDamage: true },
      _count: { matchId: true },
    })

    const count       = agg._count.matchId
    const totalKills  = agg._sum.kills     ?? 0
    const totalBotK   = agg._sum.botKills  ?? 0
    const totalDmg    = agg._sum.damage    ?? 0
    const totalBotDmg = agg._sum.botDamage ?? 0

    // 비율: botKills가 kills를 초과하는 오염 데이터 방어 + 0 나누기 방어
    const botKillRatio   = totalKills > 0 ? Math.min(totalBotK   / totalKills, 0.95) : 0
    const botDamageRatio = totalDmg   > 0 ? Math.min(totalBotDmg / totalDmg,   0.95) : 0

    return res.status(200).json({
      analyzedCount:  count,
      botKillRatio:   parseFloat(botKillRatio.toFixed(4)),
      botDamageRatio: parseFloat(botDamageRatio.toFixed(4)),
    })
  } catch (e) {
    console.error('[bot-stats]', e.message)
    return res.status(500).json({ error: '조회 실패' })
  }
}
