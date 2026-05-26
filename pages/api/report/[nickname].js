// GET /api/report/[nickname]?shard=steam
// 시즌 리포트 카드에 필요한 데이터 집계

import prisma from '../../../utils/prisma.js'
import { calculateMMR, getMMRTier } from '../../../utils/mmrCalculator'
import { classifyPlaystyle } from '../../../utils/playstyleClassifier'
import { getMapName } from '../../../utils/mapUtils'
import { redisGet } from '../../../utils/redis.js'

function seasonLabel(id) {
  if (!id) return ''
  const m = id.match(/(\d+)$/)
  return m ? `Season ${parseInt(m[1], 10)}` : id
}

async function getCurrentSeason() {
  try {
    const cached = await redisGet('pubg:seasons:steam')
    if (cached) {
      const list = typeof cached === 'string' ? JSON.parse(cached) : cached
      const cur  = list.find(s => s.attributes?.isCurrentSeason)
      if (cur) return { id: cur.id, startDate: null, label: seasonLabel(cur.id) }
    }
    const apiKey = process.env.PUBG_API_KEY
    if (!apiKey) return null
    const res  = await fetch('https://api.pubg.com/shards/steam/seasons', {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/vnd.api+json' },
    })
    if (!res.ok) return null
    const json = await res.json()
    const cur  = (json.data || []).find(s => s.attributes?.isCurrentSeason)
    if (!cur) return null
    return { id: cur.id, startDate: null, label: seasonLabel(cur.id) }
  } catch {
    return null
  }
}

const WEAP_NAME = {
  // AR
  WeapAK47_C: 'AKM', WeapLunchmeats_AK47_C: 'AKM',
  WeapHK416_C: 'M416', WeapDuncans_M416_C: 'M416', WeapHK416_HR_C: 'M416',
  WeapM16A4_C: 'M16A4',
  'WeapSCAR-L_C': 'SCAR-L', WeapSCAR_L_C: 'SCAR-L',
  WeapAUG_C: 'AUG A3', WeapAUG_HR_C: 'AUG A3', WeapAUG_A3_C: 'AUG A3',
  WeapG36C_C: 'G36C',
  WeapGroza_C: 'Groza', WeapGroza_HR_C: 'Groza',
  WeapQBZ95_C: 'QBZ-95', WeapQBZ_C: 'QBZ-95',
  WeapBerylM762_C: 'Beryl M762', WeapBerylM762_HR_C: 'Beryl M762',
  WeapMk47Mutant_C: 'Mk47 Mutant',
  WeapACE32_C: 'ACE32', WeapACE32_HR_C: 'ACE32',
  WeapK2_C: 'K2',
  WeapFamasG2_C: 'FAMAS', WeapFAMASG2_C: 'FAMAS',
  // DMR
  WeapFNFal_C: 'SLR', WeapFNFal_HR_C: 'SLR',
  WeapSKS_C: 'SKS', WeapSKS_HR_C: 'SKS',
  WeapMini14_C: 'Mini 14', WeapMini14_HR_C: 'Mini 14',
  WeapMk12_C: 'Mk12', WeapMk12_HR_C: 'Mk12',
  WeapMk14_C: 'Mk14 EBR', WeapMk14_HR_C: 'Mk14 EBR',
  WeapDragunov_C: 'Dragunov',
  WeapVSS_C: 'VSS',
  WeapQBU88_C: 'QBU88', WeapMadsQBU88_C: 'QBU88', WeapMads_QBU88_C: 'QBU88',
  // SR
  WeapKar98k_C: 'Kar98k', WeapJuliesKar98k_C: 'Kar98k', WeapJulies_Kar98k_C: 'Kar98k',
  WeapM24_C: 'M24',
  WeapAWM_C: 'AWM',
  WeapMosinNagant_C: 'Mosin', WeapMosin_C: 'Mosin',
  WeapL6_C: 'Lynx AMR',
  WeapWin94_C: 'Win94', WeapWin1894_C: 'Win94',
  // SMG
  WeapUMP_C: 'UMP9', WeapUMP_HR_C: 'UMP9',
  WeapVector_C: 'Vector', WeapVector_HR_C: 'Vector',
  WeapMP5K_C: 'MP5K', WeapMP5K_HR_C: 'MP5K',
  WeapBizonPP19_C: 'PP-19 Bizon', WeapBizonPP19_HR_C: 'PP-19 Bizon', WeapPP19_C: 'PP-19 Bizon',
  WeapMP9_C: 'MP9', WeapMP9_HR_C: 'MP9',
  WeapP90_C: 'P90', WeapP90_HR_C: 'P90',
  WeapUZI_C: 'Micro Uzi', WeapUZI_HR_C: 'Micro Uzi',
  Weapvz61Skorpion_C: 'Skorpion', WeapSkorpion_C: 'Skorpion',
  WeapThompson_C: 'Tommy Gun', WeapTommyGun_C: 'Tommy Gun',
  WeapJS9_C: 'JS9', WeapJS9_HR_C: 'JS9',
  // LMG
  WeapDP28_C: 'DP-28',
  WeapM249_C: 'M249',
  WeapMG3_C: 'MG3',
  // SG
  WeapSaiga12_C: 'S12K', WeapSaiga12_HR_C: 'S12K',
  WeapWinchester_C: 'S1897', WeapWinchester_HR_C: 'S1897',
  WeapBerreta686_C: 'S686', WeapBerreta686_HR_C: 'S686',
  WeapDP12_C: 'DBS', WeapDP12_HR_C: 'DBS',
  WeapOriginS12_C: 'O12', WeapOriginS12_HR_C: 'O12',
  WeapSawnoff_C: 'Sawed-off',
  // 권총
  WeapDesertEagle_C: 'Deagle',
  WeapM1911_C: 'P1911', WeapP1911_C: 'P1911', WeapM1911_HR_C: 'P1911',
  WeapM9_C: 'P92', WeapP92_C: 'P92', WeapM9_HR_C: 'P92',
  WeapG18_C: 'P18C', WeapG18C_C: 'P18C', WeapG18_HR_C: 'P18C',
  WeapNagantM1895_C: 'R1895', WeapR1895_C: 'R1895',
  WeapRhino_C: 'Rhino',
  WeapCrossbow_C: 'Crossbow', WeapCrossbow_1_C: 'Crossbow',
  WeapFlareGun_C: 'Flare Gun',
}

const EXCLUDE_WEAPONS = new Set([
  'WeapGrenade_C', 'WeapMolotov_C', 'WeapSmokeGrenade_C', 'WeapFlashbang_C',
  'WeapDecoyGrenade_C', 'WeapStickyGrenade_C', 'WeapBluezoneGrenade_C',
  'ProjGrenade_C', 'ProjMolotov_C', 'ProjSmokeGrenade_C', 'ProjFlashbang_C',
  'ProjDecoyGrenade_C', 'WeapPan_C', 'WeapCrowbar_C', 'WeapMachete_C', 'WeapSickle_C',
  'WeapC4_C', 'WeapMortar_C', 'WeapPanzerfaust_C', 'WeapM79_C',
])

// 봇 캐릭터 모델명 패턴 — damageCauserName에 봇 모델이 기록되는 경우
function isBotModel(weaponId) {
  if (!weaponId) return true
  const lower = weaponId.toLowerCase()
  return lower.startsWith('playerfemale') || lower.startsWith('playermale')
    || lower.startsWith('bp_player') || lower.startsWith('playerunknown')
    || lower.startsWith('player_')
}

const NORMAL_MODES = new Set(['squad', 'squad-fpp', 'duo', 'duo-fpp', 'solo', 'solo-fpp'])

function getWeaponDisplayName(weaponId) {
  if (!weaponId) return '알 수 없음'
  if (WEAP_NAME[weaponId]) return WEAP_NAME[weaponId]
  return weaponId.replace(/^Weap/, '').replace(/_C$/, '').replace(/_/g, ' ')
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const { nickname } = req.query
  const shard = req.query.shard || 'steam'
  if (!nickname) return res.status(400).json({ error: 'nickname 필요' })

  try {
    const [member, currentSeason] = await Promise.all([
      prisma.clanMember.findFirst({
        where: { nickname: { equals: nickname, mode: 'insensitive' } },
        include: { modeStats: true },
      }),
      getCurrentSeason(),
    ])

    if (!member) {
      return res.status(404).json({
        error: '플레이어를 찾을 수 없습니다. 플레이어 페이지를 먼저 방문해주세요.',
      })
    }

    const pubgPlayerId = member.pubgPlayerId
    const totalGames = member.modeStats
      .filter(ms => NORMAL_MODES.has(ms.mode))
      .reduce((s, ms) => s + (ms.matches || 0), 0)

    // 시즌 교체 시 아래 두 날짜 업데이트 (예상 종료일: 2026-06-10)
    const SEASON_START = new Date('2026-03-12T00:00:00Z')
    const seasonFilter = { createdAt: { gte: SEASON_START } }

    let avgRealKills = null, avgRealDamage = null, analyzedCount = 0, bestMatch = null

    if (pubgPlayerId) {
      const baseWhere = { pubgAccountId: pubgPlayerId, shard, isBotCorrected: true, ...seasonFilter }

      const [matchAgg, bestMatchRow] = await Promise.all([
        prisma.playerMatch.aggregate({
          where: baseWhere,
          _avg: { realKills: true, realDamage: true },
          _count: { matchId: true },
        }),
        prisma.playerMatch.findFirst({
          where: baseWhere,
          orderBy: { realKills: 'desc' },
          select: { realKills: true, kills: true, realDamage: true, damage: true, placement: true, mapName: true, mode: true, createdAt: true },
        }),
      ])

      analyzedCount = matchAgg._count.matchId
      if (analyzedCount > 0) {
        avgRealKills  = parseFloat((matchAgg._avg.realKills  ?? 0).toFixed(2))
        avgRealDamage = Math.round(matchAgg._avg.realDamage  ?? 0)
      }

      if (bestMatchRow) {
        bestMatch = {
          realKills: bestMatchRow.realKills ?? bestMatchRow.kills,
          damage:    Math.round(bestMatchRow.realDamage ?? bestMatchRow.damage),
          placement: bestMatchRow.placement,
          mapName:   getMapName(bestMatchRow.mapName),
          mode:      bestMatchRow.mode,
          date:      bestMatchRow.createdAt?.toISOString() ?? null,
        }
      }
    }

    let topWeapons = []
    if (pubgPlayerId) {
      // 현재 시즌 분석 완료 경기 matchId 목록
      const analyzedMatches = await prisma.playerMatch.findMany({
        where: { pubgAccountId: pubgPlayerId, shard, isBotCorrected: true, ...seasonFilter },
        select: { matchId: true },
      })
      const analyzedMatchIds = analyzedMatches.map(m => m.matchId)

      const weaponWhere = analyzedMatchIds.length > 0
        ? { playerId: pubgPlayerId, shard, match_id: { in: analyzedMatchIds } }
        : { playerId: pubgPlayerId, shard }

      const rows = await prisma.player_weapon_stats.groupBy({
        by: ['weaponId'],
        where: weaponWhere,
        _sum: { real_kills: true, damage: true },
        orderBy: { _sum: { real_kills: 'desc' } },
        take: 20,
      })
      topWeapons = rows
        .filter(w =>
          !EXCLUDE_WEAPONS.has(w.weaponId) &&
          !isBotModel(w.weaponId) &&
          (w._sum.real_kills ?? 0) > 0
        )
        .slice(0, 3)
        .map(w => ({
          weaponId: w.weaponId,
          name:     getWeaponDisplayName(w.weaponId),
          kills:    w._sum.real_kills ?? 0,
          damage:   Math.round(w._sum.damage ?? 0),
        }))
    }

    const mmr = calculateMMR({
      avgDamage:      member.avgDamage,
      avgKills:       member.avgKills,
      avgAssists:     member.avgAssists,
      winRate:        member.winRate,
      top10Rate:      member.top10Rate,
      avgSurviveTime: member.avgSurviveTime,
    })
    const tier     = getMMRTier(mmr)
    const psResult = classifyPlaystyle({
      avgDamage:      member.avgDamage,
      avgKills:       member.avgKills,
      avgAssists:     member.avgAssists,
      avgSurviveTime: member.avgSurviveTime,
      winRate:        member.winRate,
      top10Rate:      member.top10Rate,
    })

    return res.status(200).json({
      nickname:      member.nickname,
      shard,
      mmr,
      tier:          { label: tier.label, emoji: tier.emoji },
      playstyle:     psResult.label,
      totalGames,
      avgKills:      parseFloat(member.avgKills.toFixed(2)),
      avgRealKills,
      avgDamage:     Math.round(member.avgDamage),
      avgRealDamage,
      winRate:       parseFloat(member.winRate.toFixed(1)),
      analyzedCount,
      bestMatch,
      topWeapons,
      currentSeason: currentSeason
        ? { label: currentSeason.label, startDate: currentSeason.startDate?.toISOString() ?? null }
        : null,
    })
  } catch (err) {
    console.error('[report/nickname]', err.message)
    return res.status(500).json({ error: '데이터 조회 실패' })
  }
}
