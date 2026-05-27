import { useState, useEffect } from 'react'
import MatchMapView from './MatchMapView.jsx'

// damageCauserName (WeapXXX_C / ProjXXX_C) → 표시 이름
const WEAP_NAME = {
  // AR
  WeapAK47_C: 'AKM', WeapHK416_C: 'M416', WeapDuncans_M416_C: 'M416',
  WeapM16A4_C: 'M16A4', WeapSCAR_L_C: 'SCAR-L', WeapAUG_A3_C: 'AUG A3',
  WeapG36C_C: 'G36C', WeapGroza_C: 'Groza', WeapQBZ_C: 'QBZ-95',
  WeapBerylM762_C: 'Beryl M762', WeapMk47Mutant_C: 'Mk47 Mutant',
  WeapACE32_C: 'ACE32', WeapK2_C: 'K2', WeapJS9_C: 'JS9', WeapFAMASG2_C: 'FAMAS G2',
  // DMR
  WeapFNFal_C: 'SLR', WeapSKS_C: 'SKS', WeapMini14_C: 'Mini 14',
  WeapMk12_C: 'Mk12', WeapMk14_C: 'Mk14 EBR', WeapDragunov_C: 'Dragunov',
  WeapVSS_C: 'VSS', WeapQBU88_C: 'QBU88', WeapMads_QBU88_C: 'QBU88',
  // SR
  WeapKar98k_C: 'Kar98k', WeapM24_C: 'M24', WeapAWM_C: 'AWM',
  WeapMosinNagant_C: 'Mosin-Nagant', WeapWin94_C: 'Win94', WeapL6_C: 'Lynx AMR',
  // SMG
  WeapUMP_C: 'UMP9', WeapVector_C: 'Vector', WeapMP5K_C: 'MP5K',
  WeapPP19_C: 'PP-19 Bizon', WeapMP9_C: 'MP9', WeapP90_C: 'P90',
  WeapUZI_C: 'Micro Uzi', WeapSkorpion_C: 'Skorpion', WeapTommyGun_C: 'Tommy Gun',
  // LMG
  WeapDP28_C: 'DP-28', WeapM249_C: 'M249', WeapMG3_C: 'MG3',
  // SG
  WeapSaiga12_C: 'S12K', WeapWinchester_C: 'S1897', WeapBerreta686_C: 'S686',
  WeapDP12_C: 'DBS', WeapOriginS12_C: 'O12', WeapSawnoff_C: 'Sawed-off',
  // Pistol
  WeapDesertEagle_C: 'Deagle', WeapP1911_C: 'P1911', WeapP92_C: 'P92',
  WeapG18C_C: 'P18C', WeapR1895_C: 'R1895', WeapR45_C: 'R45',
  // Throwable
  WeapGrenade_C: '수류탄', WeapMolotov_C: '화염병', WeapSmokeGrenade_C: '연막탄',
  WeapFlashbang_C: '섬광탄', WeapDecoyGrenade_C: '디코이', WeapStickyGrenade_C: '스티키 수류탄',
  WeapBluezoneGrenade_C: '블루존 수류탄',
  ProjGrenade_C: '수류탄', ProjMolotov_C: '화염병', ProjSmokeGrenade_C: '연막탄',
  ProjFlashbang_C: '섬광탄', ProjDecoyGrenade_C: '디코이',
  ProjStickyGrenade_C: '스티키 수류탄', ProjBluezoneGrenade_C: '블루존 수류탄',
  ProjC4_C: 'C4', ProjMortar_C: 'Mortar', ProjPanzerfaust_C: 'Panzerfaust', ProjM79_C: 'M79',
  // Special
  WeapCrossbow_C: 'Crossbow', WeapFlareGun_C: 'Flare Gun',
  WeapC4_C: 'C4', WeapMortar_C: 'Mortar', WeapPanzerfaust_C: 'Panzerfaust', WeapM79_C: 'M79',
  WeapPan_C: 'Pan', WeapCrowbar_C: 'Crowbar', WeapMachete_C: 'Machete', WeapSickle_C: 'Sickle',
}

// WeapXXX_C → /public/weapons/Item_Weapon_XXX_C.png
const WEAP_IMG = {
  WeapAK47_C: 'Item_Weapon_AK47_C.png',
  WeapHK416_C: 'Item_Weapon_HK416_C.png', WeapDuncans_M416_C: 'Item_Weapon_HK416_C.png',
  WeapM16A4_C: 'Item_Weapon_M16A4_C.png', WeapSCAR_L_C: 'Item_Weapon_SCAR-L_C.png',
  WeapAUG_A3_C: 'Item_Weapon_AUG_C.png', WeapAUG_C: 'Item_Weapon_AUG_C.png', WeapG36C_C: 'Item_Weapon_G36C_C.png',
  WeapGroza_C: 'Item_Weapon_Groza_C.png', WeapQBZ_C: 'Item_Weapon_QBZ95_C.png',
  WeapBerylM762_C: 'Item_Weapon_BerylM762_C.png', WeapMk47Mutant_C: 'Item_Weapon_Mk47Mutant_C.png',
  WeapACE32_C: 'Item_Weapon_ACE32_C.png', WeapK2_C: 'Item_Weapon_K2_C.png',
  WeapFAMASG2_C: 'Item_Weapon_FAMASG2_C.png',
  WeapFNFal_C: 'Item_Weapon_FNFal_C.png',
  WeapSKS_C: 'Item_Weapon_SKS_C.png', WeapMini14_C: 'Item_Weapon_Mini14_C.png',
  WeapMk12_C: 'Item_Weapon_Mk12_C.png', WeapMk14_C: 'Item_Weapon_Mk14_C.png',
  WeapDragunov_C: 'Item_Weapon_Dragunov_C.png', WeapVSS_C: 'Item_Weapon_VSS_C.png',
  WeapQBU88_C: 'Item_Weapon_QBU88_C.png', WeapMads_QBU88_C: 'Item_Weapon_QBU88_C.png',
  WeapKar98k_C: 'Item_Weapon_Kar98k_C.png', WeapM24_C: 'Item_Weapon_M24_C.png',
  WeapAWM_C: 'Item_Weapon_AWM_C.png', WeapMosinNagant_C: 'Item_Weapon_Mosin_C.png',
  WeapWin94_C: 'Item_Weapon_Win1894_C.png', WeapL6_C: 'Item_Weapon_L6_C.png',
  WeapUMP_C: 'Item_Weapon_UMP_C.png', WeapVector_C: 'Item_Weapon_Vector_C.png',
  WeapMP5K_C: 'Item_Weapon_MP5K_C.png', WeapPP19_C: 'Item_Weapon_BizonPP19_C.png',
  WeapMP9_C: 'Item_Weapon_MP9_C.png', WeapP90_C: 'Item_Weapon_P90_C.png',
  WeapUZI_C: 'Item_Weapon_UZI_C.png', WeapSkorpion_C: 'Item_Weapon_Skorpion_C.png',
  WeapTommyGun_C: 'Item_Weapon_Thompson_C.png',
  WeapDP28_C: 'Item_Weapon_DP28_C.png', WeapM249_C: 'Item_Weapon_M249_C.png',
  WeapMG3_C: 'Item_Weapon_MG3_C.png',
  WeapSaiga12_C: 'Item_Weapon_Saiga12_C.png', WeapWinchester_C: 'Item_Weapon_Winchester_C.png',
  WeapBerreta686_C: 'Item_Weapon_Berreta686_C.png', WeapDP12_C: 'Item_Weapon_DP12_C.png',
  WeapOriginS12_C: 'Item_Weapon_OriginS12_C.png', WeapSawnoff_C: 'Item_Weapon_Sawnoff_C.png',
  WeapDesertEagle_C: 'Item_Weapon_DesertEagle_C.png', WeapP1911_C: 'Item_Weapon_M1911_C.png',
  WeapP92_C: 'Item_Weapon_M9_C.png', WeapG18C_C: 'Item_Weapon_G18_C.png',
  WeapR1895_C: 'Item_Weapon_NagantM1895_C.png', WeapR45_C: 'Item_Weapon_Rhino_C.png',
  WeapCrossbow_C: 'Item_Weapon_Crossbow_C.png',
  WeapGrenade_C: 'Item_Weapon_FragGrenade_C.png', ProjGrenade_C: 'Item_Weapon_FragGrenade_C.png',
  WeapMolotov_C: 'Item_Weapon_Molotov_C.png', ProjMolotov_C: 'Item_Weapon_Molotov_C.png',
  WeapSmokeGrenade_C: 'Item_Weapon_SmokeGrenade_C.png',
  ProjSmokeGrenade_C: 'Item_Weapon_SmokeGrenade_C.png',
  WeapFlashbang_C: 'Item_Weapon_StunGrenade_C.png',
  ProjFlashbang_C: 'Item_Weapon_StunGrenade_C.png',
  WeapDecoyGrenade_C: 'Item_Weapon_DecoyGrenade_C.png',
  ProjDecoyGrenade_C: 'Item_Weapon_DecoyGrenade_C.png',
}

function getWeaponImg(weaponId) {
  const file = WEAP_IMG[weaponId]
  return file ? `/weapons/${file}` : null
}

const VEHICLE_IMG_BASE = 'https://wstatic-prod.pubg.com/web/live/static/game-info/vehicles/images/viewer/'

function getVehicleImg(weaponId) {
  if (!weaponId) return null
  const v = weaponId.toLowerCase()
  if (v.includes('dirtbike'))                                           return VEHICLE_IMG_BASE + 'img-vehicles-dirtbike.webp'
  if (v.includes('motorbike') || v.includes('sidecar'))                return VEHICLE_IMG_BASE + 'img-vehicles-motorbike.webp'
  if (v.includes('snowmobile') || v.includes('snowbike'))              return VEHICLE_IMG_BASE + 'img-vehicles-snowmobile.webp'
  if (v.includes('mountainbike') || v.includes('mountain_bike'))       return VEHICLE_IMG_BASE + 'img-vehicles-mountainbike.webp'
  if (v.includes('scooter'))                                            return VEHICLE_IMG_BASE + 'img-vehicles-scooter.webp'
  if (v.includes('brdm'))                                              return VEHICLE_IMG_BASE + 'img-vehicles-brdm.webp'
  if (v.includes('uaz'))                                                return VEHICLE_IMG_BASE + 'img-vehicles-uaz.webp'
  if (v.includes('dacia'))                                              return VEHICLE_IMG_BASE + 'img-vehicles-dacia.webp'
  if (v.includes('mirado'))                                             return VEHICLE_IMG_BASE + 'img-vehicles-mirado.webp'
  if (v.includes('rony'))                                               return VEHICLE_IMG_BASE + 'img-vehicles-rony.webp'
  if (v.includes('minibus'))                                            return VEHICLE_IMG_BASE + 'img-vehicles-minibus.webp'
  if (v.includes('pickup'))                                             return VEHICLE_IMG_BASE + 'img-vehicles-pickup_truck.webp'
  if (v.includes('foodtruck') || v.includes('food_truck'))             return VEHICLE_IMG_BASE + 'img-vehicles-food_truck.webp'
  if (v.includes('pillar'))                                             return VEHICLE_IMG_BASE + 'img-vehicles-pillar.webp'
  if (v.includes('porter'))                                             return VEHICLE_IMG_BASE + 'img-vehicles-porter.webp'
  if (v.includes('tuktuk') || v.includes('tukshai'))                   return VEHICLE_IMG_BASE + 'img-vehicles-tukshai.webp'
  if (v.includes('ladaniva') || v.includes('zima'))                    return VEHICLE_IMG_BASE + 'img-vehicles-ladaniva.webp'
  if (v.includes('aquarail') || v.includes('airboat'))                  return VEHICLE_IMG_BASE + 'img-vehicles-air_boat.webp'
  if (v.includes('coupesuv') || v.includes('coupe_suv') || v.includes('blanc')) return VEHICLE_IMG_BASE + 'img-vehicles-coupe_suv.webp'
  if (v.includes('couper') || v.includes('coupe_rb') || (v.includes('coupe') && v.includes('rb'))) return VEHICLE_IMG_BASE + 'img-vehicles-coupe_rb.webp'
  if (v.includes('ponycoupe') || v.includes('pony'))                   return VEHICLE_IMG_BASE + 'img-vehicles-pony_coupe.webp'
  if (v.includes('coupe'))                                              return VEHICLE_IMG_BASE + 'img-vehicles-coupe_rb.webp'
  if (v.includes('quadbike') || v.includes('quad_bike'))               return VEHICLE_IMG_BASE + 'img-vehicles-atv.webp'
  if (v.includes('buggy'))                                              return VEHICLE_IMG_BASE + 'img-vehicles-buggy.webp'
  if (v.includes('picobus') || v.includes('pico_bus'))                 return VEHICLE_IMG_BASE + 'img-vehicles-pico_bus.webp'
  // BP_ 접두어로 시작하는 미매핑 차량
  if (v.startsWith('bp_') || v.includes('vehicle') || v.includes('van') || v.includes('truck')) return VEHICLE_IMG_BASE + 'img-vehicles-pickup_truck.webp'
  return null
}

// 무기가 아닌 damageCauserName 필터
function isValidWeapon(weaponId) {
  if (!weaponId || weaponId === 'None') return false
  if (weaponId.startsWith('Player')) return false
  if (weaponId.startsWith('Damage_') || weaponId.startsWith('BlueZone')) return false
  if (weaponId.startsWith('Vehicle_') || weaponId.startsWith('Weap_')) return false
  return true
}

function getWeaponDisplayName(weaponId) {
  if (!weaponId) return '알 수 없음'
  if (WEAP_NAME[weaponId]) return WEAP_NAME[weaponId]
  if (/^Player(Female|Male)/i.test(weaponId)) return '근접 공격'
  if (weaponId === 'Pickaxe' || weaponId === 'Crowbar' || weaponId === 'Machete' || weaponId === 'Sickle') return '근접 무기'
  // 차량 ID 패턴 매칭 (BP_ 또는 다양한 변형)
  const v = weaponId.toLowerCase()
  if (v.includes('motorbike') || v.includes('sidecar')) return '오토바이'
  if (v.includes('uaz')) return 'UAZ'
  if (v.includes('pickup')) return '픽업트럭'
  if (v.includes('dacia')) return '다시아'
  if (v.includes('buggy')) return '버기'
  if (v.includes('mirado')) return '미라도'
  if (v.includes('rony')) return '로니'
  if (v.includes('snowmobile') || v.includes('snowbike')) return '설상 차량'
  if (v.includes('aquarail')) return '아쿠아레일'
  if (v.includes('boat') || v.includes('pg117') || v.includes('ponycoupe') || v.includes('ponytug')) return '보트/수상차량'
  if (v.includes('tukshai') || v.includes('tuktuk')) return '툭샤이'
  if (v.includes('helicopter') || v.includes('heli')) return '헬기'
  if (v.includes('brdm')) return 'BRDM-2'
  if (v.includes('zima')) return '지마'
  if (v.includes('kart')) return '레이싱 카트'
  if (v.includes('bicycle') || v.includes('cycle')) return '자전거'
  if (v.includes('coupe') || v.includes('v8')) return '차량'
  if (v.startsWith('bp_') || v.includes('vehicle') || v.includes('van') || v.includes('truck')) return '차량'
  return weaponId.replace(/^(Weap|Proj)/, '').replace(/_C$/, '').replace(/_/g, ' ')
}

export default function MatchDetailLog({ match, playerNickname }) {
  const [telemetry, setTelemetry] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  useEffect(() => {
    if (!match?.telemetryUrl || !playerNickname) return
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      url: match.telemetryUrl,
      mapName: match.mapName || '',
      nickname: playerNickname,
    })

    fetch(`/api/pubg/match-telemetry?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setTelemetry(data)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [match?.telemetryUrl, playerNickname])

  if (!match) return null

  // 디버그 로그 (개발 확인용)
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.log('[MatchDetailLog]', match.matchId, {
      isBotCorrected: match.isBotCorrected,
      weaponStats: match.weaponStats,
      telemetryUrl: match.telemetryUrl ? '있음' : '없음',
    })
  }

  const killLog = telemetry?.killLog || []
  const weaponStats = telemetry?.weaponStats || {}
  const movePath = telemetry?.movePath || ''
  const movePathCoords = Array.isArray(telemetry?.movePathCoords) && telemetry.movePathCoords.length > 1
    ? telemetry.movePathCoords
    : null
  const vehicleLog = telemetry?.vehicleLog || []

  // 봇 분석 상태 계산
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000
  const isExpired = match.matchTimestamp &&
    Date.now() - new Date(match.matchTimestamp).getTime() > FOURTEEN_DAYS_MS
  const dbWeaponStats = match.weaponStats || {}
  const dbWeaponEntries = Object.entries(dbWeaponStats)
    .filter(([id, ws]) => isValidWeapon(id) && (ws.kills > 0 || ws.damage > 0))
    .sort(([, a], [, b]) => b.damage - a.damage)
  const dbMaxDmg = Math.max(...dbWeaponEntries.map(([, ws]) => ws.damage), 1)

  const getWeaponIcon = (weaponId) => {
    const w = weaponId.toLowerCase()
    if (w.includes('kar98') || w.includes('m24') || w.includes('awm') || w.includes('fnfal') || w.includes('mini14') || w.includes('mk14') || w.includes('qbu') || w.includes('vss') || w.includes('dragunov') || w.includes('sks') || w.includes('mk12') || w.includes('win94') || w.includes('mosin')) return '🎯'
    if (w.includes('m249') || w.includes('dp28') || w.includes('dp-28') || w.includes('mg3')) return '🔥'
    if (w.includes('s686') || w.includes('s1897') || w.includes('s12k') || w.includes('dbs') || w.includes('sawnoff') || w.includes('origins12')) return '💣'
    if (w.includes('grenade') || w.includes('molotov') || w.includes('flashbang') || w.includes('c4') || w.includes('proj')) return '💥'
    if (w.includes('crossbow')) return '🏹'
    return '🔫'
  }

  return (
    <div className="mt-3">
      {/* ── 봇 분석 결과 섹션 ── */}
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {match.isBotCorrected ? (
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              ✅ 봇 분석 완료
            </span>
          ) : isExpired ? (
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-600">
              ❌ 봇 데이터 없음 (14일 초과)
            </span>
          ) : (
            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 animate-pulse">
              ⏳ 봇 분석 중...
            </span>
          )}
          {match.isBotCorrected && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              실킬 <span className="font-bold text-gray-700 dark:text-gray-200">{match.realKills ?? match.kills ?? 0}</span>
              {' · '}봇킬 <span className="font-bold text-amber-500">{match.botKills ?? 0}</span>
              {(match.botKills ?? 0) > 0 && (
                <span className="ml-1 text-[10px] text-gray-400">
                  (킬 {match.kills ?? 0} 중 봇 {Math.round(((match.botKills ?? 0) / Math.max(match.kills ?? 1, 1)) * 100)}%)
                </span>
              )}
            </span>
          )}
        </div>

        {/* 무기별 딜량 바 (봇 분석 결과) */}
        {match.isBotCorrected && dbWeaponEntries.length > 0 && (
          <div className="space-y-2 mt-2">
            {dbWeaponEntries.slice(0, 6).map(([weaponId, ws]) => {
              const displayName = getWeaponDisplayName(weaponId)
              const imgSrc = getWeaponImg(weaponId) || getVehicleImg(weaponId)
              const isVehicleImg = !getWeaponImg(weaponId) && !!getVehicleImg(weaponId)
              const pct = Math.round((ws.damage / dbMaxDmg) * 100)
              return (
                <div key={weaponId}>
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={displayName}
                          className={`object-contain flex-shrink-0 drop-shadow-sm ${isVehicleImg ? 'w-14 h-9' : 'w-9 h-6'}`}
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                      ) : (
                        <span className="text-sm flex-shrink-0">{getWeaponIcon(weaponId)}</span>
                      )}
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{displayName}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {ws.kills > 0 && (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            킬{ws.kills}
                            {ws.botKills > 0 && (
                              <span className="text-amber-500">(봇{ws.botKills})</span>
                            )}
                          </span>
                        )}
                        {ws.pickups > 0 && (
                          <span className="text-[10px] text-gray-400">픽업{ws.pickups}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-orange-500 dark:text-orange-400 flex-shrink-0 ml-2">
                      {ws.damage.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
        상세 전투 로그
        {loading && (
          <svg className="animate-spin w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-xs text-amber-700 dark:text-amber-400">
          텔레메트리 로드 실패: {error}
        </div>
      )}

      {!match.telemetryUrl && !loading && (
        <div className="mb-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs text-gray-400 dark:text-gray-500">
          텔레메트리 URL 없음 — 킬 로그·이동 경로 데이터를 불러올 수 없습니다.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 킬 로그 */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">킬 로그</span>
          </div>
          <div className="p-3 bg-white dark:bg-gray-900">
            {killLog.length > 0 ? (
              <div className="space-y-1.5">
                {killLog.map((log, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
                    <span className="w-4 h-4 bg-red-400 text-white rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs text-gray-700 dark:text-gray-300">{log}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="text-2xl mb-1.5">🎯</div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {(match.kills || 0) > 0 ? '킬 상세 정보 없음' : '킬 기록 없음'}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {(match.kills || 0) > 0 ? '텔레메트리 파싱 불가' : '이 경기에서 킬 없음'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 이동 경로 */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">이동 경로</span>
          </div>
          <div className="p-3 bg-white dark:bg-gray-900">
            {movePath ? (
              <div className="px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5 flex-shrink-0">📍</span>
                  <span className="font-mono text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{movePath}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="text-2xl mb-1.5">🗺️</div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">이동 경로 없음</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">텔레메트리 데이터 없음</div>
              </div>
            )}
            {movePathCoords && (
              <div className="mt-2">
                <MatchMapView
                  mapName={match.mapName}
                  movePathCoords={movePathCoords}
                  combatCoords={[]}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 탈것 섹션 */}
      {vehicleLog.length > 0 && (
        <div className="mt-3 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">탈것</span>
          </div>
          <div className="p-3 bg-white dark:bg-gray-900">
            <div className="flex flex-wrap gap-2">
              {vehicleLog.map((v, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 min-w-0">
                  {v.img ? (
                    <img
                      src={v.img}
                      alt={v.name}
                      className="w-16 h-10 object-contain flex-shrink-0"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  ) : (
                    <span className="text-xl flex-shrink-0">🚗</span>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">{v.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {v.totalDistance > 0 && (
                        <span className="text-[10px] text-blue-500 dark:text-blue-400 font-medium">
                          {v.totalDistance >= 1000
                            ? `${(v.totalDistance / 1000).toFixed(1)}km`
                            : `${v.totalDistance}m`}
                        </span>
                      )}
                      {v.rideCount > 0 && (
                        <span className="text-[10px] text-gray-400">{v.rideCount}회 탑승</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
