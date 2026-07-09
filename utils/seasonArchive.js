// utils/seasonArchive.js — 지난 시즌 PlayerMatch 원본을 요약 통계(MapStatSeason/WeaponMetaSeason/
// PlayerSeasonSummary)로 보존한 뒤 원본 PlayerMatch 행을 삭제한다.
// pages/api/admin/archive-season.js(수동)와 pages/api/cron/season-archive.js(자동) 양쪽에서 공용으로 쓴다.

import prisma from './prisma.js'
import { getSeasonStart, SEASON_STARTS } from './seasonStart.js'
import { isExcluded, normalizeId } from './weaponMetaFilter.js'
import weaponNameMap from './weaponNameMap.js'

// pages/api/maps/stats.js와 동일한 배틀로얄 맵 목록 (훈련장/헤이븐 등 비-BR 맵 제외)
const BR_MAPS = [
  'Baltic_Main', 'Desert_Main', 'Savage_Main', 'DihorOtok_Main',
  'Tiger_Main', 'Kiki_Main', 'Neon_Main', 'Summerland_Main', 'Chimera_Main',
]

const SHARDS_TO_ARCHIVE = ['all', 'steam', 'kakao']

// 여러 async 작업을 chunkSize개씩 나눠 병렬 실행 (DB 커넥션 풀 고갈 방지)
async function runInChunks(items, chunkSize, fn) {
  for (let i = 0; i < items.length; i += chunkSize) {
    await Promise.all(items.slice(i, i + chunkSize).map(fn))
  }
}

function getSeasonRange(seasonNum, currentSeasonStart) {
  if (!SEASON_STARTS[seasonNum]) {
    throw new Error(`알 수 없는 시즌: ${seasonNum} (utils/seasonStart.js의 SEASON_STARTS에 시작일 등록 필요)`)
  }
  const starts = Object.keys(SEASON_STARTS).map(Number).sort((a, b) => a - b)
  const idx = starts.indexOf(seasonNum)
  const start = new Date(SEASON_STARTS[seasonNum])
  const nextKnown = idx < starts.length - 1 ? new Date(SEASON_STARTS[starts[idx + 1]]) : null
  // SEASON_STARTS에 다음 시즌이 아직 등록 안 됐으면 getSeasonStart()가 감지한 현재 시즌 시작일로 대체
  const end = nextKnown ?? currentSeasonStart
  return { start, end }
}

// A. 맵별 통계 → MapStatSeason (shard: all/steam/kakao 각각)
async function archiveMapStats(seasonNum, start, end) {
  let saved = 0
  for (const shard of SHARDS_TO_ARCHIVE) {
    const where = {
      createdAt: { gte: start, lt: end },
      mapName: { in: BR_MAPS },
      ...(shard !== 'all' ? { shard } : {}),
    }
    const rows = await prisma.playerMatch.groupBy({
      by: ['mapName'],
      where,
      _count: { mapName: true },
      _avg: { surviveTime: true, kills: true },
    })
    const total = rows.reduce((s, r) => s + r._count.mapName, 0)
    if (total === 0) continue

    await runInChunks(rows, 10, async (r) => {
      const playCount = r._count.mapName
      const percentage = Math.round((playCount / total) * 1000) / 10
      const data = {
        playCount,
        percentage,
        avgSurvival: r._avg.surviveTime ?? null,
        avgKills: r._avg.kills ?? null,
      }
      await prisma.mapStatSeason.upsert({
        where: { season_mapName_shard: { season: seasonNum, mapName: r.mapName, shard } },
        create: { season: seasonNum, mapName: r.mapName, shard, ...data },
        update: data,
      })
      saved++
    })
  }
  return saved
}

// B. 무기별 통계 → WeaponMetaSeason (player_weapon_stats 집계, shard: all/steam/kakao 각각)
async function archiveWeaponStats(seasonNum, start, end) {
  let saved = 0
  for (const shard of SHARDS_TO_ARCHIVE) {
    const where = {
      match_id: { not: '' },
      savedAt: { gte: start, lt: end },
      ...(shard !== 'all' ? { shard } : {}),
    }
    const rows = await prisma.player_weapon_stats.groupBy({
      by: ['weaponId'],
      where,
      _sum: { kills: true, damage: true },
    })

    const map = {}
    let totalKills = 0
    for (const r of rows) {
      if (isExcluded(r.weaponId)) continue
      const key = normalizeId(r.weaponId)
      const kills = r._sum.kills || 0
      const damage = r._sum.damage || 0
      if (!map[key]) map[key] = { kills: 0, damage: 0, rawId: r.weaponId }
      map[key].kills += kills
      map[key].damage += damage
      totalKills += kills
    }

    const ranked = Object.entries(map)
      .filter(([, v]) => v.kills > 0)
      .sort((a, b) => b[1].kills - a[1].kills)

    // 순위는 정렬된 배열 인덱스로 직접 부여
    const items = ranked.map(([key, v], i) => ({ key, v, rank: i + 1 }))
    await runInChunks(items, 10, async ({ key, v, rank }) => {
      const weaponName = weaponNameMap[v.rawId] ?? key
      const data = {
        weaponName,
        kills: v.kills,
        killRate: totalKills > 0 ? Math.round((v.kills / totalKills) * 1000) / 10 : 0,
        avgDamage: v.kills > 0 ? Math.round((v.damage / v.kills) * 10) / 10 : null,
        rank,
      }
      await prisma.weaponMetaSeason.upsert({
        where: { season_weaponId_shard: { season: seasonNum, weaponId: key, shard } },
        create: { season: seasonNum, weaponId: key, shard, ...data },
        update: data,
      })
      saved++
    })
  }
  return saved
}

// C. 플레이어별 통계 → PlayerSeasonSummary (nickname+shard 별)
async function archivePlayerStats(seasonNum, start, end) {
  // 핵심 통계: 시즌 필터 조건부 집계(FILTER)가 필요해 groupBy 대신 raw SQL 사용
  const core = await prisma.$queryRaw`
    SELECT
      nickname,
      shard,
      COUNT(*)::int AS "totalGames",
      AVG(kills)::float AS "avgKills",
      AVG(damage)::float AS "avgDamage",
      (SUM(CASE WHEN placement = 1 THEN 1 ELSE 0 END)::float / COUNT(*)::float * 100) AS "winRate",
      (SUM(CASE WHEN placement <= 10 THEN 1 ELSE 0 END)::float / COUNT(*)::float * 100) AS "top10Rate",
      AVG("realKills") FILTER (WHERE "isBotCorrected" = true) AS "avgRealKills",
      AVG("realDamage") FILTER (WHERE "isBotCorrected" = true) AS "avgRealDamage",
      CASE
        WHEN SUM(kills) FILTER (WHERE "isBotCorrected" = true) > 0
        THEN SUM("botKills") FILTER (WHERE "isBotCorrected" = true)::float / SUM(kills) FILTER (WHERE "isBotCorrected" = true)::float
        ELSE NULL
      END AS "botKillRatio"
    FROM "PlayerMatch"
    WHERE "createdAt" >= ${start} AND "createdAt" < ${end}
    GROUP BY nickname, shard
  `
  if (core.length === 0) return 0

  // 플레이어별 맵 플레이 횟수 → 상위 3개 맵 (훈련장/로비 등 비-BR 맵 제외, MapStatSeason과 동일 기준)
  const mapRows = await prisma.playerMatch.groupBy({
    by: ['nickname', 'shard', 'mapName'],
    where: { createdAt: { gte: start, lt: end }, mapName: { in: BR_MAPS } },
    _count: { mapName: true },
  })
  const topMapByPlayer = new Map() // `${nickname}|${shard}` -> [{mapName, cnt}]
  for (const r of mapRows) {
    const key = `${r.nickname}|${r.shard}`
    if (!topMapByPlayer.has(key)) topMapByPlayer.set(key, [])
    topMapByPlayer.get(key).push({ mapName: r.mapName, cnt: r._count.mapName })
  }
  for (const list of topMapByPlayer.values()) list.sort((a, b) => b.cnt - a.cnt)

  // player_weapon_stats.playerId(=pubgAccountId) → nickname 매핑 (해당 계정이 시즌 중 가장 많이 쓴 닉네임)
  const acctRows = await prisma.playerMatch.groupBy({
    by: ['pubgAccountId', 'nickname', 'shard'],
    where: { createdAt: { gte: start, lt: end } },
    _count: { _all: true },
  })
  const acctToNickname = new Map()
  const acctBestCount = new Map()
  for (const r of acctRows) {
    const key = `${r.pubgAccountId}|${r.shard}`
    const cnt = r._count._all
    if (!acctBestCount.has(key) || cnt > acctBestCount.get(key)) {
      acctBestCount.set(key, cnt)
      acctToNickname.set(key, r.nickname)
    }
  }

  // 플레이어별 무기 킬 → 상위 3개 무기
  const weaponRows = await prisma.player_weapon_stats.groupBy({
    by: ['playerId', 'shard', 'weaponId'],
    where: { match_id: { not: '' }, savedAt: { gte: start, lt: end } },
    _sum: { kills: true },
  })
  const topWeaponByPlayer = new Map() // `${nickname}|${shard}` -> Map(normalizedWeaponId -> kills)
  for (const r of weaponRows) {
    if (isExcluded(r.weaponId)) continue
    const nickname = acctToNickname.get(`${r.playerId}|${r.shard}`)
    if (!nickname) continue
    const key = `${nickname}|${r.shard}`
    const wKey = normalizeId(r.weaponId)
    const kills = r._sum.kills || 0
    if (!topWeaponByPlayer.has(key)) topWeaponByPlayer.set(key, new Map())
    const wmap = topWeaponByPlayer.get(key)
    wmap.set(wKey, (wmap.get(wKey) || 0) + kills)
  }

  let saved = 0
  await runInChunks(core, 15, async (row) => {
    const key = `${row.nickname}|${row.shard}`
    const topMaps = (topMapByPlayer.get(key) || []).slice(0, 3).map((m) => m.mapName)
    const wmap = topWeaponByPlayer.get(key)
    const topWeapons = wmap
      ? Array.from(wmap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w]) => w)
      : []

    const data = {
      totalGames: row.totalGames,
      avgRealKills: row.avgRealKills,
      avgRealDamage: row.avgRealDamage,
      avgKills: row.avgKills,
      avgDamage: row.avgDamage,
      winRate: row.winRate,
      top10Rate: row.top10Rate,
      botKillRatio: row.botKillRatio,
      topMap1: topMaps[0] ?? null,
      topMap2: topMaps[1] ?? null,
      topMap3: topMaps[2] ?? null,
      topWeapon1: topWeapons[0] ?? null,
      topWeapon2: topWeapons[1] ?? null,
      topWeapon3: topWeapons[2] ?? null,
    }
    await prisma.playerSeasonSummary.upsert({
      where: { season_nickname_shard: { season: seasonNum, nickname: row.nickname, shard: row.shard } },
      create: { season: seasonNum, nickname: row.nickname, shard: row.shard, ...data },
      update: data,
    })
    saved++
  })
  return saved
}

// D. 팀 내 피해(team_damage_stats) 요약 → TeamDamageStatSeason. 저장→삭제→VACUUM FULL까지 한 번에 처리하는
// 독립 실행형 함수 — A/B/C와 달리 archiveSeason()에 자동으로 엮여있지 않고 필요할 때 별도로 호출한다.
// attackerName 카디널리티가 매우 커서(추적 대상 밖 스쿼드원까지 전부 포함되어 시즌당 수십만 명) 다른
// 집계처럼 upsert 반복문을 돌리면 너무 느려, 단일 bulk INSERT..SELECT..ON CONFLICT로 처리한다.
// 원본 테이블에 shard 컬럼이 없어 shard='all' 한 종류만 저장한다.
export async function archiveTeamDamageStats(seasonNum) {
  const { num: currentSeasonNum, start: currentSeasonStart } = await getSeasonStart()
  if (seasonNum >= currentSeasonNum) {
    throw new Error(`시즌 ${seasonNum}은 아직 진행 중이거나 알 수 없는 시즌이라 아카이브할 수 없습니다. (현재 시즌: ${currentSeasonNum})`)
  }
  const { end } = getSeasonRange(seasonNum, currentSeasonStart)

  const beforeCount = await prisma.teamDamageStat.count({ where: { createdAt: { lt: end } } })
  if (beforeCount === 0) {
    return { skipped: true, reason: '아카이브할 team_damage_stats 데이터가 없습니다.', savedAttackers: 0, deletedRows: 0 }
  }

  await prisma.$executeRawUnsafe(
    `
    INSERT INTO "TeamDamageStatSeason" (season, shard, "attackerNickname", "totalDamage", "totalKills", "totalGroggies", "victimCount")
    SELECT
      $1::int AS season,
      'all' AS shard,
      "attackerName",
      ROUND(SUM("totalDamage"))::int AS "totalDamage",
      SUM("killCount")::int AS "totalKills",
      SUM("groggyCount")::int AS "totalGroggies",
      COUNT(DISTINCT "victimAccountId")::int AS "victimCount"
    FROM team_damage_stats
    WHERE "createdAt" < $2 AND "attackerName" != ''
    GROUP BY "attackerName"
    ON CONFLICT (season, "attackerNickname", shard) DO UPDATE SET
      "totalDamage" = EXCLUDED."totalDamage",
      "totalKills" = EXCLUDED."totalKills",
      "totalGroggies" = EXCLUDED."totalGroggies",
      "victimCount" = EXCLUDED."victimCount"
    `,
    seasonNum,
    end,
  )

  const savedAttackers = await prisma.teamDamageStatSeason.count({ where: { season: seasonNum, shard: 'all' } })

  const deleteResult = await prisma.teamDamageStat.deleteMany({ where: { createdAt: { lt: end } } })
  const deletedRows = deleteResult.count

  await prisma.$executeRawUnsafe('VACUUM FULL team_damage_stats;')

  return { skipped: false, season: seasonNum, savedAttackers, deletedRows }
}

// 시즌 하나를 아카이브: 집계 저장 후(기본) 원본 PlayerMatch 삭제. 진행 중인 시즌은 거부.
// 이미 아카이브(삭제)된 시즌을 다시 호출하면 대상 행이 없어 skipped:true로 안전하게 빠져나온다(멱등).
// deleteAfter:false로 호출하면 저장만 하고 PlayerMatch는 지우지 않는다 — 저장 결과를 먼저 검증하고 싶을 때 사용.
// includeOlder:true면 이 시즌 시작일 이전(집계 대상이 아닌, 시즌 구분이 안 되는 옛 꼬리 데이터)의
// PlayerMatch도 별도 집계 없이 함께 삭제한다 — deleteAfter가 false면 무시된다.
export async function archiveSeason(seasonNum, { deleteAfter = true, includeOlder = false } = {}) {
  const { num: currentSeasonNum, start: currentSeasonStart } = await getSeasonStart()
  if (seasonNum >= currentSeasonNum) {
    throw new Error(`시즌 ${seasonNum}은 아직 진행 중이거나 알 수 없는 시즌이라 아카이브할 수 없습니다. (현재 시즌: ${currentSeasonNum})`)
  }

  const { start, end } = getSeasonRange(seasonNum, currentSeasonStart)

  const matchCount = await prisma.playerMatch.count({ where: { createdAt: { gte: start, lt: end } } })
  if (matchCount === 0) {
    return {
      skipped: true,
      reason: '아카이브할 PlayerMatch 데이터가 없습니다 (이미 아카이브 완료됐거나 해당 시즌 기록 없음)',
      savedMaps: 0, savedWeapons: 0, savedPlayers: 0, deletedMatches: 0, deletedOlderMatches: 0,
    }
  }

  const savedMaps = await archiveMapStats(seasonNum, start, end)
  const savedWeapons = await archiveWeaponStats(seasonNum, start, end)
  const savedPlayers = await archivePlayerStats(seasonNum, start, end)

  let deletedMatches = 0
  let deletedOlderMatches = 0
  if (deleteAfter) {
    const result = await prisma.playerMatch.deleteMany({
      where: { createdAt: { gte: start, lt: end } },
    })
    deletedMatches = result.count

    if (includeOlder) {
      const olderResult = await prisma.playerMatch.deleteMany({
        where: { createdAt: { lt: start } },
      })
      deletedOlderMatches = olderResult.count
    }
  }

  return { skipped: false, season: seasonNum, savedMaps, savedWeapons, savedPlayers, deletedMatches, deletedOlderMatches }
}
