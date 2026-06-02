import prisma from '../../../utils/prisma.js'
import { redisGet, redisSet } from '../../../utils/redis.js'

const SEASON_START = new Date('2026-03-12T00:00:00Z')
const CACHE_KEY = 'awards:clans:v3'
const CACHE_TTL = 3600

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const cached = await redisGet(CACHE_KEY)
  if (cached) return res.status(200).json(cached)

  try {
    const EARLY_END = new Date(SEASON_START.getTime() + 31 * 24 * 60 * 60 * 1000)
    const RECENT_START = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [avgDamageRaw, avgKillsRaw, winRateRaw, totalKillsRaw, totalWinsRaw, growthRaw] = await Promise.all([
      // 경기당 평균 딜량 (봇 분석 여부 무관, realDamage 우선)
      prisma.$queryRaw`
        SELECT c.id, c.name, c."pubgClanTag" as tag, c.region,
          ROUND(AVG(COALESCE(pm."realDamage", pm.damage))::numeric, 1)::float as value,
          COUNT(pm.id)::int as matches,
          COUNT(DISTINCT cm.id)::int as members
        FROM "Clan" c
        JOIN "ClanMember" cm ON cm."clanId" = c.id
        JOIN "PlayerMatch" pm ON pm."clanMemberId" = cm.id
        WHERE pm."createdAt" >= ${SEASON_START}
          AND pm.mode NOT ILIKE '%heistroyale%'
          AND pm.mode NOT ILIKE '%safehouse%'
          AND pm.mode NOT ILIKE '%training%'
          AND pm.mode NOT ILIKE '%clansolo%'
          AND pm.mode NOT ILIKE '%clansquad%'
          AND COALESCE(pm."mapName", '') NOT IN ('Range_Main', 'SafeHouse_Main')
        GROUP BY c.id, c.name, c."pubgClanTag", c.region
        HAVING COUNT(DISTINCT cm.id) >= 3 AND COUNT(pm.id) >= 30
        ORDER BY value DESC
        LIMIT 5
      `,
      // 경기당 평균 실킬 (봇 분석 완료 경기 우선, realKills 우선)
      prisma.$queryRaw`
        SELECT c.id, c.name, c."pubgClanTag" as tag, c.region,
          ROUND(AVG(COALESCE(pm."realKills"::float, pm.kills::float))::numeric, 2)::float as value,
          COUNT(pm.id)::int as matches,
          COUNT(DISTINCT cm.id)::int as members
        FROM "Clan" c
        JOIN "ClanMember" cm ON cm."clanId" = c.id
        JOIN "PlayerMatch" pm ON pm."clanMemberId" = cm.id
        WHERE pm."createdAt" >= ${SEASON_START}
          AND pm.mode NOT ILIKE '%heistroyale%'
          AND pm.mode NOT ILIKE '%safehouse%'
          AND pm.mode NOT ILIKE '%training%'
          AND pm.mode NOT ILIKE '%clansolo%'
          AND pm.mode NOT ILIKE '%clansquad%'
          AND COALESCE(pm."mapName", '') NOT IN ('Range_Main', 'SafeHouse_Main')
        GROUP BY c.id, c.name, c."pubgClanTag", c.region
        HAVING COUNT(DISTINCT cm.id) >= 3 AND COUNT(pm.id) >= 30
        ORDER BY value DESC
        LIMIT 5
      `,
      // 승률
      prisma.$queryRaw`
        SELECT c.id, c.name, c."pubgClanTag" as tag, c.region,
          ROUND((SUM(CASE WHEN pm.placement = 1 THEN 1.0 ELSE 0 END) / COUNT(pm.id) * 100)::numeric, 1)::float as value,
          COUNT(pm.id)::int as matches,
          COUNT(DISTINCT cm.id)::int as members
        FROM "Clan" c
        JOIN "ClanMember" cm ON cm."clanId" = c.id
        JOIN "PlayerMatch" pm ON pm."clanMemberId" = cm.id
        WHERE pm."createdAt" >= ${SEASON_START}
          AND pm.mode NOT ILIKE '%heistroyale%'
          AND pm.mode NOT ILIKE '%safehouse%'
          AND pm.mode NOT ILIKE '%training%'
          AND pm.mode NOT ILIKE '%clansolo%'
          AND pm.mode NOT ILIKE '%clansquad%'
          AND COALESCE(pm."mapName", '') NOT IN ('Range_Main', 'SafeHouse_Main')
        GROUP BY c.id, c.name, c."pubgClanTag", c.region
        HAVING COUNT(DISTINCT cm.id) >= 3 AND COUNT(pm.id) >= 30
        ORDER BY value DESC
        LIMIT 5
      `,
      // 총 실킬 (realKills 우선)
      prisma.$queryRaw`
        SELECT c.id, c.name, c."pubgClanTag" as tag, c.region,
          SUM(COALESCE(pm."realKills", pm.kills))::int as value,
          COUNT(pm.id)::int as matches,
          COUNT(DISTINCT cm.id)::int as members
        FROM "Clan" c
        JOIN "ClanMember" cm ON cm."clanId" = c.id
        JOIN "PlayerMatch" pm ON pm."clanMemberId" = cm.id
        WHERE pm."createdAt" >= ${SEASON_START}
          AND pm.mode NOT ILIKE '%heistroyale%'
          AND pm.mode NOT ILIKE '%safehouse%'
          AND pm.mode NOT ILIKE '%training%'
          AND pm.mode NOT ILIKE '%clansolo%'
          AND pm.mode NOT ILIKE '%clansquad%'
          AND COALESCE(pm."mapName", '') NOT IN ('Range_Main', 'SafeHouse_Main')
        GROUP BY c.id, c.name, c."pubgClanTag", c.region
        HAVING COUNT(DISTINCT cm.id) >= 3 AND COUNT(pm.id) >= 30
        ORDER BY value DESC
        LIMIT 5
      `,
      // 총 승리
      prisma.$queryRaw`
        SELECT c.id, c.name, c."pubgClanTag" as tag, c.region,
          SUM(CASE WHEN pm.placement = 1 THEN 1 ELSE 0 END)::int as value,
          COUNT(pm.id)::int as matches,
          COUNT(DISTINCT cm.id)::int as members
        FROM "Clan" c
        JOIN "ClanMember" cm ON cm."clanId" = c.id
        JOIN "PlayerMatch" pm ON pm."clanMemberId" = cm.id
        WHERE pm."createdAt" >= ${SEASON_START}
          AND pm.mode NOT ILIKE '%heistroyale%'
          AND pm.mode NOT ILIKE '%safehouse%'
          AND pm.mode NOT ILIKE '%training%'
          AND pm.mode NOT ILIKE '%clansolo%'
          AND pm.mode NOT ILIKE '%clansquad%'
          AND COALESCE(pm."mapName", '') NOT IN ('Range_Main', 'SafeHouse_Main')
        GROUP BY c.id, c.name, c."pubgClanTag", c.region
        HAVING COUNT(DISTINCT cm.id) >= 3 AND COUNT(pm.id) >= 30
        ORDER BY value DESC
        LIMIT 5
      `,
      // 성장한 클랜 (시즌 초반 vs 최근 스냅샷 MMR 비교)
      prisma.$queryRaw`
        WITH early AS (
          SELECT s.nickname, AVG(s.score)::int as early_score
          FROM player_stat_snapshots s
          WHERE s."capturedAt" BETWEEN ${SEASON_START} AND ${EARLY_END}
          GROUP BY s.nickname
        ),
        recent AS (
          SELECT s.nickname, AVG(s.score)::int as recent_score
          FROM player_stat_snapshots s
          WHERE s."capturedAt" >= ${RECENT_START}
          GROUP BY s.nickname
        ),
        player_growth AS (
          SELECT e.nickname,
            (r.recent_score - e.early_score) as growth
          FROM early e
          JOIN recent r ON r.nickname = e.nickname
          WHERE r.recent_score > e.early_score AND e.early_score > 0
        )
        SELECT c.id, c.name, c."pubgClanTag" as tag, c.region,
          ROUND(AVG(pg.growth)::numeric, 0)::int as value,
          COUNT(DISTINCT cm.id)::int as members
        FROM "Clan" c
        JOIN "ClanMember" cm ON cm."clanId" = c.id
        JOIN player_growth pg ON pg.nickname = cm.nickname
        GROUP BY c.id, c.name, c."pubgClanTag", c.region
        HAVING COUNT(DISTINCT cm.id) >= 2
        ORDER BY value DESC
        LIMIT 5
      `,
    ])

    const data = {
      avgDamage: serialize(avgDamageRaw),
      avgKills:  serialize(avgKillsRaw),
      winRate:   serialize(winRateRaw),
      totalKills: serialize(totalKillsRaw),
      totalWins:  serialize(totalWinsRaw),
      growth:     serialize(growthRaw),
      seasonStart: SEASON_START.toISOString(),
      generatedAt: new Date().toISOString(),
    }

    await redisSet(CACHE_KEY, data, CACHE_TTL)
    return res.status(200).json(data)
  } catch (e) {
    console.error('[awards/clans]', e)
    return res.status(500).json({ error: e.message })
  }
}

function serialize(rows) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k, typeof v === 'bigint' ? Number(v) : v])
    )
  )
}
