import prisma from '../../utils/prisma'
import { redisGet, redisSet } from '../../utils/redis'
import weaponNameMap from '../../utils/weaponNameMap'

// weaponId → 카테고리
const WEAPON_CATEGORY = {
  'Item_Weapon_HK416_C':       'AR',
  'Item_Weapon_Duncans_M416_C':'AR',
  'Item_Weapon_AK47_C':        'AR',
  'Item_Weapon_SCAR-L_C':      'AR',
  'Item_Weapon_M16A4_C':       'AR',
  'Item_Weapon_Groza_C':       'AR',
  'Item_Weapon_G36C_C':        'AR',
  'Item_Weapon_QBZ95_C':       'AR',
  'Item_Weapon_Mk47Mutant_C':  'AR',
  'Item_Weapon_ACE32_C':       'AR',
  'Item_Weapon_BerylM762_C':   'AR',
  'Item_Weapon_AUG_C':         'AR',
  'Item_Weapon_K2_C':          'AR',
  'Item_Weapon_FAMASG2_C':     'AR',
  'Item_Weapon_Mini14_C':      'DMR',
  'Item_Weapon_SKS_C':         'DMR',
  'Item_Weapon_VSS_C':         'DMR',
  'Item_Weapon_Mk14_C':        'DMR',
  'Item_Weapon_FNFal_C':       'DMR',
  'Item_Weapon_QBU88_C':       'DMR',
  'Item_Weapon_Mads_QBU88_C':  'DMR',
  'Item_Weapon_Mk12_C':        'DMR',
  'Item_Weapon_Dragunov_C':    'DMR',
  'Item_Weapon_Kar98k_C':      'SR',
  'Item_Weapon_M24_C':         'SR',
  'Item_Weapon_AWM_C':         'SR',
  'Item_Weapon_Mosin_C':       'SR',
  'Item_Weapon_Win1894_C':     'SR',
  'Item_Weapon_L6_C':          'SR',
  'Item_Weapon_UMP_C':         'SMG',
  'Item_Weapon_Vector_C':      'SMG',
  'Item_Weapon_UZI_C':         'SMG',
  'Item_Weapon_BizonPP19_C':   'SMG',
  'Item_Weapon_MP5K_C':        'SMG',
  'Item_Weapon_MP9_C':         'SMG',
  'Item_Weapon_Thompson_C':    'SMG',
  'Item_Weapon_P90_C':         'SMG',
  'Item_Weapon_vz61Skorpion_C':'SMG',
  'Item_Weapon_JS9_C':         'SMG',
  'Item_Weapon_DP28_C':        'LMG',
  'Item_Weapon_M249_C':        'LMG',
  'Item_Weapon_MG3_C':         'LMG',
  'Item_Weapon_OriginS12_C':   'SG',
  'Item_Weapon_Berreta686_C':  'SG',
  'Item_Weapon_Winchester_C':  'SG',
  'Item_Weapon_DP12_C':        'SG',
  'Item_Weapon_Saiga12_C':     'SG',
  'Item_Weapon_Sawnoff_C':     'SG',
  'Item_Weapon_G18_C':         'Pistol',
  'Item_Weapon_M1911_C':       'Pistol',
  'Item_Weapon_DesertEagle_C': 'Pistol',
  'Item_Weapon_NagantM1895_C': 'Pistol',
  'Item_Weapon_Rhino_C':       'Pistol',
  'Item_Weapon_M9_C':          'Pistol',
}

// 티어를 위한 주요 전투 무기 카테고리 (투척류/특수 제외)
const COMBAT_CATS = new Set(['AR', 'DMR', 'SR', 'SMG', 'LMG', 'SG', 'Pistol'])

function assignTiers(weapons) {
  const combat = weapons
    .filter(w => COMBAT_CATS.has(w.category) && w.kills >= 50)
    .sort((a, b) => b.kills - a.kills)

  const n  = combat.length
  const cS = Math.max(1, Math.ceil(n * 0.10))
  const cA = Math.max(2, Math.ceil(n * 0.25))
  const cB = Math.max(3, Math.ceil(n * 0.50))

  combat.forEach((w, i) => {
    w.tier = i < cS ? 'S' : i < cA ? 'A' : i < cB ? 'B' : 'C'
  })

  // 전투 카테고리지만 킬 50 미만이거나 기타 카테고리는 C
  weapons.forEach(w => { if (!w.tier) w.tier = 'C' })
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const shard    = req.query.shard || 'all'
  const cacheKey = `weapon-meta:v2:${shard}`

  const cached = await redisGet(cacheKey)
  if (cached) {
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).json(typeof cached === 'string' ? JSON.parse(cached) : cached)
  }

  try {
    const where = shard !== 'all' ? { shard } : {}

    const [rows, dateRange] = await Promise.all([
      prisma.player_weapon_stats.groupBy({
        by: ['weaponId'],
        where,
        _sum:   { kills: true, damage: true, headshots: true },
        _count: { playerId: true },
      }),
      prisma.player_weapon_stats.aggregate({
        where,
        _min: { savedAt: true },
        _max: { savedAt: true },
      }),
    ])

    const weapons = rows
      .map(row => {
        const kills     = row._sum.kills     || 0
        const damage    = row._sum.damage    || 0
        const headshots = Math.min(row._sum.headshots || 0, kills) // 킬보다 많은 헤드샷 캡핑
        const userCount = row._count.playerId || 1
        const category  = WEAPON_CATEGORY[row.weaponId] || 'Other'
        const rawName   = weaponNameMap[row.weaponId]
        const name      = rawName || row.weaponId.replace(/^Item_Weapon_/i, '').replace(/_C$/i, '').replace(/_/g, ' ')

        return {
          weaponId:  row.weaponId,
          name,
          category,
          kills,
          damage:    Math.round(damage),
          headshots,
          userCount,
          avgKills:  kills > 0 ? +(kills / userCount).toFixed(2) : 0,
          avgDamage: userCount > 0 ? Math.round(damage / userCount) : 0,
          hsRate:    kills > 0 ? Math.min(99.9, +(headshots / kills * 100).toFixed(1)) : 0,
          tier:      null,
        }
      })
      .filter(w => w.kills > 0)

    assignTiers(weapons)
    weapons.sort((a, b) => b.kills - a.kills)

    const result = {
      weapons,
      dateRange: {
        min: dateRange._min.savedAt,
        max: dateRange._max.savedAt,
      },
    }

    await redisSet(cacheKey, result, 60 * 60)
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).json(result)

  } catch (err) {
    console.error('[weapon-meta] 오류:', err)
    return res.status(500).json({ error: err.message })
  }
}
