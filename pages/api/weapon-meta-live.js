// pages/api/weapon-meta-live.js
// 실제 텔레메트리 기반 무기 메타 집계 API
import prisma from '../../utils/prisma.js'
import { getSeasonStart, SEASON_STARTS } from '../../utils/seasonStart.js'

// 제외 패턴 - 차량/캐릭터/환경/투척류/근접무기
const EXCLUDE = [
  /^Player(Female|Male)/i,
  /^UltAIPawn/i,
  /^TslGameMode/i,
  /^BP_/i,
  /^Buggy_/i, /^Dacia_/i, /^Uaz_/i, /^Boat_/i,
  /^RedZone/i, /^Bluezonebomb/i,
  /^Buff_/i,
  /^HR_Proj/i, /^ProjGrenade/i, /^ProjMolotov/i, /^ProjC4/i, /^ProjSticky/i,
  /^WeapGrenade/i, /^WeapMolotov/i, /^WeapFlareGun/i, /^WeapFlash/i,
  /^WeapSmoke/i, /^WeapDecoy/i, /^WeapBlue/i, /^WeapStickyGrenade/i,
  /^WeapC4/i, /^WeapMortar/i, /^WeapPanzer/i,
  /^WeapPan_/i, /^WeapMachete/i, /^WeapPickaxe/i, /^WeapSickle/i,
  /^WeapCow/i, /^WeapRock/i, /^WeapPackageFlare/i, /^WeapCoverStruct/i,
  /^WeapIntegrated/i, /^WeapTrauma/i, /^WeapTacPack/i,
  /^WeapZipline/i, /^WeapCamoNet/i, /^WeapStunGun/i, /^WeapM79/i,
  /^None$/, /^Jerrycan/, /^TslDestructible/, /^Mortar_/, /^PanzerFaust/,
]

const NORMALIZE = {
  vz61Skorpion: 'Skorpion',
  'Mads_QBU88':  'QBU88',
  MadsQBU88:     'QBU88',
  Win1894:       'Win94',
  MosinNagant:   'Mosin',
  FamasG2:       'FAMASG2',
  'SCAR-L':      'SCAR_L',
  Crossbow_1:    'Crossbow',
  CowBar:        'Cowbar',
}

function isExcluded(raw) {
  return EXCLUDE.some(p => p.test(raw))
}

function normalizeId(raw) {
  const id = raw
    .replace(/^Item_Weapon_/, '')
    .replace(/^Weap/, '')
    .replace(/(_HR)?_C$/, '')
    .replace(/_HR$/, '')
  return NORMALIZE[id] ?? id
}

async function getPeriod(period, seasonParam) {
  const now = new Date()

  // 특정 시즌 필터 (season=41, season=42 ...)
  if (seasonParam) {
    const num = parseInt(seasonParam, 10)
    const starts = Object.keys(SEASON_STARTS).map(Number).sort((a, b) => a - b)
    const idx = starts.indexOf(num)
    if (idx === -1) throw new Error(`알 수 없는 시즌: ${seasonParam}`)

    const start = new Date(SEASON_STARTS[num])
    // 다음 시즌이 있으면 그 시작일이 이번 시즌 종료일
    const end = idx < starts.length - 1 ? new Date(SEASON_STARTS[starts[idx + 1]]) : null

    // 이전 시즌 (트렌드 비교용)
    let prevStart = null, prevEnd = null
    if (idx > 0) {
      const prevNum = starts[idx - 1]
      prevStart = new Date(SEASON_STARTS[prevNum])
      prevEnd   = start
    }

    return { start, end, prevStart, prevEnd }
  }

  // 기존 기간 필터
  if (period === 'season') {
    const { start } = await getSeasonStart()
    return { start, end: null, prevStart: null, prevEnd: null }
  }
  const days = period === 'month' ? 30 : 7
  const start     = new Date(now - days * 86400000)
  const prevStart = new Date(now - days * 2 * 86400000)
  return { start, end: null, prevStart, prevEnd: start }
}

// DB에서 groupBy로 집계 — 전체 행 전송 없이 weaponId별 합산만 반환
async function aggregateFromDB(where) {
  const rows = await prisma.player_weapon_stats.groupBy({
    by: ['weaponId'],
    where,
    _sum: { kills: true, damage: true, pickup_count: true },
  })

  const map = {}
  let totalKills = 0, totalPickups = 0

  for (const r of rows) {
    if (isExcluded(r.weaponId)) continue
    const key = normalizeId(r.weaponId)
    const kills   = r._sum.kills         || 0
    const damage  = r._sum.damage        || 0
    const pickups = r._sum.pickup_count  || 0
    if (!map[key]) map[key] = { kills: 0, damage: 0, pickups: 0 }
    map[key].kills   += kills
    map[key].damage  += damage
    map[key].pickups += pickups
    totalKills   += kills
    totalPickups += pickups
  }

  return { map, totalKills, totalPickups }
}

export default async function handler(req, res) {
  try {
    const { period = 'week', shard = 'all', season = '' } = req.query
    const { start, end, prevStart, prevEnd } = await getPeriod(period, season || null)
    const shardFilter = shard !== 'all' ? { shard } : {}

    const baseWhere = {
      match_id: { not: '' },
      ...shardFilter,
    }

    // 현재 기간 날짜 필터 (end는 시즌 종료일이 있을 때만)
    const curDateFilter = {}
    if (start) curDateFilter.gte = start
    if (end)   curDateFilter.lt  = end

    const [cur, prev] = await Promise.all([
      aggregateFromDB({ ...baseWhere, ...(start ? { savedAt: curDateFilter } : {}) }),
      prevStart
        ? aggregateFromDB({ ...baseWhere, savedAt: { gte: prevStart, lt: prevEnd } })
        : Promise.resolve({ map: {}, totalKills: 0, totalPickups: 0 }),
    ])

    // 이전 기간 킬 기준 순위
    const prevRanks = {}
    Object.entries(prev.map)
      .sort((a, b) => b[1].kills - a[1].kills)
      .forEach(([key], i) => { prevRanks[key] = i + 1 })

    const weapons = Object.entries(cur.map)
      .filter(([, v]) => v.kills > 0 || v.pickups > 0)
      .map(([key, v]) => ({
        key,
        kills:    v.kills,
        damage:   Math.round(v.damage),
        pickups:  v.pickups,
        pickRate: cur.totalPickups > 0 ? Math.round((v.pickups / cur.totalPickups) * 1000) / 10 : 0,
        killRate: cur.totalKills   > 0 ? Math.round((v.kills   / cur.totalKills)   * 1000) / 10 : 0,
        avgDmg:   v.kills > 0 ? Math.round(v.damage / v.kills) : 0,
        prevRank: prevRanks[key] ?? null,
      }))
      .sort((a, b) => b.kills - a.kills)
      .map((w, i) => ({
        ...w,
        rank:  i + 1,
        trend: w.prevRank != null ? w.prevRank - (i + 1) : null, // 양수 = 상승
      }))

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600')
    return res.status(200).json({
      weapons,
      meta: {
        totalKills:   cur.totalKills,
        totalPickups: cur.totalPickups,
        period:       season ? `season:${season}` : period,
        season:       season ? parseInt(season, 10) : null,
      },
    })
  } catch (e) {
    console.error('[weapon-meta-live]', e.message)
    return res.status(500).json({ error: e.message })
  }
}
