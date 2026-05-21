import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth].js'
import prisma from '../../../utils/prisma.js'

const ADMIN_EMAIL = 'sssyck123@gmail.com'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const pw = req.headers['x-admin-token'] || req.query.pw
  const session = await getServerSession(req, res, authOptions)
  const isAdmin = (pw && pw === process.env.ADMIN_PASSWORD) || session?.user?.email === ADMIN_EMAIL
  if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' })

  const { date, page = '1', status = 'all' } = req.query
  const limit = 50
  const offset = (parseInt(page) - 1) * limit

  // date(YYYY-MM-DD) 기준 당일 범위 — 없으면 오늘 (KST 기준 UTC 보정)
  const kstOffset = 9 * 60 * 60 * 1000
  const baseDate = date ? new Date(date) : new Date(Date.now() - kstOffset)
  const dayStart = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate(), 0, 0, 0) - kstOffset)
  const dayEnd   = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate(), 23, 59, 59, 999) - kstOffset)

  const baseWhere = { lastUpdated: { gte: dayStart, lte: dayEnd } }
  const statusWhere = {
    all:      {},
    unset:    { isBanned: { not: true }, avgDamage: 0 },
    noSeason: { isBanned: { not: true }, avgDamage: -1 },
    normal:   { isBanned: { not: true }, avgDamage: { gt: 0 } },
    banned:   { isBanned: true },
  }[status] ?? {}
  const where = { ...baseWhere, ...statusWhere }

  const [users, total, cronLog] = await Promise.all([
    prisma.playerCache.findMany({
      where,
      orderBy: { id: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        nickname: true,
        pubgShardId: true,
        avgDamage: true,
        avgKills: true,
        score: true,
        roundsPlayed: true,
        isBanned: true,
        lastUpdated: true,
      },
    }),
    prisma.playerCache.count({ where }),
    // 해당 날짜의 텔레메트리 배치 로그 (가장 최근 실행)
    prisma.rankingUpdateLog.findFirst({
      where: {
        updateType: 'telemetry_batch',
        updateTime: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { updateTime: 'desc' },
      select: { updateTime: true, status: true, updatedCount: true, details: true },
    }).catch(() => null),
  ])

  const nicknames = users.map((u) => u.nickname)
  const clanMembers = await prisma.clanMember.findMany({
    where: { nickname: { in: nicknames } },
    select: { nickname: true, clan: { select: { name: true, pubgClanTag: true } } },
  })
  const clanMap = {}
  for (const cm of clanMembers) {
    if (cm.clan) clanMap[cm.nickname.toLowerCase()] = cm.clan
  }

  const usersWithClan = users.map((u) => ({
    ...u,
    clan: clanMap[u.nickname.toLowerCase()] || null,
  }))

  return res.status(200).json({ users: usersWithClan, total, page: parseInt(page), limit, cronLog })
}
