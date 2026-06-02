import prisma from '../../../utils/prisma.js'
import { redisGet, redisSet } from '../../../utils/redis.js'

const SEASON_START = new Date('2026-03-12T00:00:00Z')
const CACHE_KEY = 'awards:players:v2'
const CACHE_TTL = 3600

const WEAPON_EXCLUDE = [
  '%grenade%', '%throwable%', '%smoke%', '%molotov%',
  '%punch%', '%melee%', '%flare%', '%knife%', '%machete%',
  '%crowbar%', '%pan%', '%sickle%',
]

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const cached = await redisGet(CACHE_KEY)
  if (cached) return res.status(200).json(cached)

  try {
    const [avgKillsRaw, avgDamageRaw, winRateRaw, totalKillsRaw, totalWinsRaw, weaponMasterRaw] = await Promise.all([
      // 경기당 평균 실킬
      prisma.$queryRaw`
        SELECT pm.nickname, pm.shard,
          ROUND(AVG(COALESCE(pm."realKills"::float, pm.kills::float))::numeric, 2)::float as value,
          COUNT(pm.id)::int as matches
        FROM "PlayerMatch" pm
        WHERE pm."createdAt" >= ${SEASON_START}
          AND pm."isBotCorrected" = true
          AND pm.mode NOT ILIKE '%heistroyale%'
          AND pm.mode NOT ILIKE '%safehouse%'
          AND pm.mode NOT ILIKE '%training%'
          AND pm.mode NOT ILIKE '%clansolo%'
          AND pm.mode NOT ILIKE '%clansquad%'
          AND COALESCE(pm."mapName", '') NOT IN ('Range_Main', 'SafeHouse_Main')
        GROUP BY pm.nickname, pm.shard
        HAVING COUNT(pm.id) >= 20
        ORDER BY value DESC
        LIMIT 5
      `,
      // 경기당 평균 딜량
      prisma.$queryRaw`
        SELECT pm.nickname, pm.shard,
          ROUND(AVG(COALESCE(pm."realDamage", pm.damage))::numeric, 1)::float as value,
          COUNT(pm.id)::int as matches
        FROM "PlayerMatch" pm
        WHERE pm."createdAt" >= ${SEASON_START}
          AND pm."isBotCorrected" = true
          AND pm.mode NOT ILIKE '%heistroyale%'
          AND pm.mode NOT ILIKE '%safehouse%'
          AND pm.mode NOT ILIKE '%training%'
          AND pm.mode NOT ILIKE '%clansolo%'
          AND pm.mode NOT ILIKE '%clansquad%'
          AND COALESCE(pm."mapName", '') NOT IN ('Range_Main', 'SafeHouse_Main')
        GROUP BY pm.nickname, pm.shard
        HAVING COUNT(pm.id) >= 20
        ORDER BY value DESC
        LIMIT 5
      `,
      // 승률
      prisma.$queryRaw`
        SELECT pm.nickname, pm.shard,
          ROUND((SUM(CASE WHEN pm.placement = 1 THEN 1.0 ELSE 0 END) / COUNT(pm.id) * 100)::numeric, 1)::float as value,
          COUNT(pm.id)::int as matches
        FROM "PlayerMatch" pm
        WHERE pm."createdAt" >= ${SEASON_START}
          AND pm.mode NOT ILIKE '%heistroyale%'
          AND pm.mode NOT ILIKE '%safehouse%'
          AND pm.mode NOT ILIKE '%training%'
          AND pm.mode NOT ILIKE '%clansolo%'
          AND pm.mode NOT ILIKE '%clansquad%'
          AND COALESCE(pm."mapName", '') NOT IN ('Range_Main', 'SafeHouse_Main')
        GROUP BY pm.nickname, pm.shard
        HAVING COUNT(pm.id) >= 20
        ORDER BY value DESC
        LIMIT 5
      `,
      // 총 실킬
      prisma.$queryRaw`
        SELECT pm.nickname, pm.shard,
          SUM(COALESCE(pm."realKills", pm.kills))::int as value,
          COUNT(pm.id)::int as matches
        FROM "PlayerMatch" pm
        WHERE pm."createdAt" >= ${SEASON_START}
          AND pm."isBotCorrected" = true
          AND pm.mode NOT ILIKE '%heistroyale%'
          AND pm.mode NOT ILIKE '%safehouse%'
          AND pm.mode NOT ILIKE '%training%'
          AND pm.mode NOT ILIKE '%clansolo%'
          AND pm.mode NOT ILIKE '%clansquad%'
          AND COALESCE(pm."mapName", '') NOT IN ('Range_Main', 'SafeHouse_Main')
        GROUP BY pm.nickname, pm.shard
        HAVING COUNT(pm.id) >= 20
        ORDER BY value DESC
        LIMIT 5
      `,
      // 총 승리
      prisma.$queryRaw`
        SELECT pm.nickname, pm.shard,
          SUM(CASE WHEN pm.placement = 1 THEN 1 ELSE 0 END)::int as value,
          COUNT(pm.id)::int as matches
        FROM "PlayerMatch" pm
        WHERE pm."createdAt" >= ${SEASON_START}
          AND pm.mode NOT ILIKE '%heistroyale%'
          AND pm.mode NOT ILIKE '%safehouse%'
          AND pm.mode NOT ILIKE '%training%'
          AND pm.mode NOT ILIKE '%clansolo%'
          AND pm.mode NOT ILIKE '%clansquad%'
          AND COALESCE(pm."mapName", '') NOT IN ('Range_Main', 'SafeHouse_Main')
        GROUP BY pm.nickname, pm.shard
        HAVING COUNT(pm.id) >= 20
        ORDER BY value DESC
        LIMIT 5
      `,
      // 무기 마스터 (플레이어별 최다 킬 무기)
      prisma.$queryRaw`
        WITH weapon_totals AS (
          SELECT "playerId", "weaponId",
            COALESCE(NULLIF("weaponName", ''), "weaponId") as "weaponName",
            SUM(real_kills)::int as total_kills
          FROM player_weapon_stats
          WHERE "savedAt" >= ${SEASON_START}
            AND real_kills > 0
            AND "weaponId" != ''
            AND "weaponId" NOT ILIKE '%grenade%'
            AND "weaponId" NOT ILIKE '%throwable%'
            AND "weaponId" NOT ILIKE '%smoke%'
            AND "weaponId" NOT ILIKE '%molotov%'
            AND "weaponId" NOT ILIKE '%punch%'
            AND "weaponId" NOT ILIKE '%melee%'
            AND "weaponId" NOT ILIKE '%flare%'
            AND "weaponId" NOT ILIKE '%knife%'
            AND "weaponId" NOT ILIKE '%machete%'
            AND "weaponId" NOT ILIKE '%pan%'
            AND "weaponId" NOT ILIKE '%sickle%'
            AND "weaponId" NOT ILIKE '%crowbar%'
          GROUP BY "playerId", "weaponId", "weaponName"
        ),
        player_best AS (
          SELECT DISTINCT ON ("playerId")
            "playerId", "weaponName", total_kills as value
          FROM weapon_totals
          ORDER BY "playerId", total_kills DESC
        )
        SELECT
          pb."playerId",
          pb."weaponName",
          pb.value,
          (SELECT pm.nickname FROM "PlayerMatch" pm WHERE pm."pubgAccountId" = pb."playerId" LIMIT 1) as nickname,
          (SELECT pm.shard FROM "PlayerMatch" pm WHERE pm."pubgAccountId" = pb."playerId" LIMIT 1) as shard
        FROM player_best pb
        WHERE pb.value >= 5
        ORDER BY pb.value DESC
        LIMIT 5
      `,
    ])

    const data = {
      avgKills:     serialize(avgKillsRaw),
      avgDamage:    serialize(avgDamageRaw),
      winRate:      serialize(winRateRaw),
      totalKills:   serialize(totalKillsRaw),
      totalWins:    serialize(totalWinsRaw),
      weaponMaster: serialize(weaponMasterRaw),
      seasonStart:  SEASON_START.toISOString(),
      generatedAt:  new Date().toISOString(),
    }

    await redisSet(CACHE_KEY, data, CACHE_TTL)
    return res.status(200).json(data)
  } catch (e) {
    console.error('[awards/players]', e)
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
