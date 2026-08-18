// GET /api/pubg/match-telemetry?url=<encodedUrl>&mapName=<mapName>&nickname=<lowerNickname>
// 단일 경기 텔레메트리 지연 로드 엔드포인트

const WEAP_NAME = {
  WeapAK47_C:'AKM', WeapHK416_C:'M416', WeapDuncans_M416_C:'M416',
  WeapM16A4_C:'M16A4', WeapSCAR_L_C:'SCAR-L', WeapAUG_A3_C:'AUG A3',
  WeapG36C_C:'G36C', WeapGroza_C:'Groza', WeapQBZ_C:'QBZ-95',
  WeapBerylM762_C:'Beryl M762', WeapMk47Mutant_C:'Mk47 Mutant',
  WeapACE32_C:'ACE32', WeapK2_C:'K2', WeapJS9_C:'JS9',
  WeapAUG_C:'AUG A3',
  WeapFNFal_C:'SLR', WeapSKS_C:'SKS', WeapMini14_C:'Mini 14',
  WeapMk12_C:'Mk12', WeapMk14_C:'Mk14 EBR', WeapDragunov_C:'Dragunov',
  WeapVSS_C:'VSS', WeapQBU88_C:'QBU88', WeapMads_QBU88_C:'QBU88',
  WeapFAMASG2_C:'FAMAS G2',
  WeapKar98k_C:'Kar98k', WeapM24_C:'M24', WeapAWM_C:'AWM',
  WeapMosinNagant_C:'Mosin-Nagant', WeapWin94_C:'Win94', WeapL6_C:'Lynx AMR',
  WeapUMP_C:'UMP9', WeapVector_C:'Vector', WeapMP5K_C:'MP5K',
  WeapPP19_C:'PP-19 Bizon', WeapMP9_C:'MP9', WeapP90_C:'P90',
  WeapUZI_C:'Micro Uzi', WeapSkorpion_C:'Skorpion', WeapTommyGun_C:'Tommy Gun',
  WeapDP28_C:'DP-28', WeapM249_C:'M249', WeapMG3_C:'MG3', WeapRPD_C:'RPD',
  WeapSaiga12_C:'S12K', WeapWinchester_C:'S1897', WeapBerreta686_C:'S686',
  WeapDP12_C:'DBS', WeapOriginS12_C:'O12', WeapSawnoff_C:'Sawed-off',
  WeapDesertEagle_C:'Deagle', WeapP1911_C:'P1911', WeapP92_C:'P92',
  WeapG18C_C:'P18C', WeapR1895_C:'R1895', WeapR45_C:'R45',
  WeapGrenade_C:'수류탄', WeapMolotov_C:'화염병', WeapSmokeGrenade_C:'연막탄',
  WeapFlashbang_C:'섬광탄', WeapDecoyGrenade_C:'디코이',
  ProjGrenade_C:'수류탄', ProjMolotov_C:'화염병', ProjSmokeGrenade_C:'연막탄',
  ProjFlashbang_C:'섬광탄', ProjC4_C:'C4', ProjMortar_C:'Mortar',
  // DoT / 환경 데미지 causerName
  'BP MolotovFireDebuff':'화염병', 'BP C4Explosive':'C4',
  'BP ZoneHurt':'블루존', 'Damage_BlueZone':'블루존',
  'Damage_Explosion_Grenade':'수류탄', 'Damage_Explosion_Petrol':'화염병',
  'Damage_Explosion_RedZone':'레드존', 'Damage_VehicleHit':'차량 충돌',
  'Damage_Drown':'익사',
  WeapCrossbow_C:'Crossbow', WeapFlareGun_C:'Flare Gun',
  WeapC4_C:'C4', WeapMortar_C:'Mortar', WeapPanzerfaust_C:'Panzerfaust',
  WeapPan_C:'Pan', WeapMachete_C:'Machete', WeapCrowbar_C:'Crowbar',
}
function weaponDisplayName(id) {
  if (!id) return '알 수 없음'
  if (WEAP_NAME[id]) return WEAP_NAME[id]
  if (/^Player(Female|Male)/i.test(id)) return '근접 공격'
  return id.replace(/^(Weap|Proj)/, '').replace(/_C$/, '').replace(/_/g, ' ')
}

const MAP_MAX = {
  // 8km 맵
  Baltic_Main: 820000, Desert_Main: 820000, Tiger_Main: 820000,
  Kiki_Main: 820000,   Neon_Main: 820000,
  // 4km 맵
  Savage_Main: 408000,
  // 6km 맵
  DihorOtok_Main: 612000,
  // 소형 맵
  Heaven_Main: 204800,     // 헤이븐 ~2km
  Summerland_Main: 102400, // 카라킨 ~1km
  Chimera_Main: 307200,    // 파라모 ~3km
}

// mapName 형식 불일치 대비 별칭 테이블 (PUBG API 간혹 영문명만 전달)
const MAP_MAX_ALIAS = {
  Baltic: 820000, Erangel: 820000,
  Desert: 820000, Miramar: 820000,
  Tiger: 820000,  Taego: 820000,
  Kiki: 820000,   Deston: 820000,
  Neon: 820000,   Rondo: 820000,
  Savage: 408000, Sanhok: 408000,
  DihorOtok: 612000, Vikendi: 612000,
  Heaven: 204800,
  Summerland: 102400, Karakin: 102400,
  Chimera: 307200,    Paramo: 307200,
}

const VEHICLE_BASE = 'https://wstatic-prod.pubg.com/web/live/static/game-info/vehicles/images/viewer/'

function getVehicleInfo(vehicleId) {
  if (!vehicleId) return null
  const v = vehicleId.toLowerCase()
  if (v.includes('dirtbike'))                                          return { name: '더트 바이크',   img: 'img-vehicles-dirtbike.webp' }
  if (v.includes('motorbike') || v.includes('sidecar'))               return { name: '오토바이',       img: 'img-vehicles-motorbike.webp' }
  if (v.includes('snowmobile') || v.includes('snowbike'))             return { name: '스노우모빌',     img: 'img-vehicles-snowmobile.webp' }
  if (v.includes('mountainbike') || v.includes('mountain_bike'))      return { name: '산악 자전거',    img: 'img-vehicles-mountainbike.webp' }
  if (v.includes('scooter'))                                           return { name: '스쿠터',         img: 'img-vehicles-scooter.webp' }
  if (v.includes('brdm'))                                             return { name: 'BRDM-2',         img: 'img-vehicles-brdm.webp' }
  if (v.includes('uaz'))                                               return { name: 'UAZ',            img: 'img-vehicles-uaz.webp' }
  if (v.includes('dacia'))                                             return { name: '다시아',         img: 'img-vehicles-dacia.webp' }
  if (v.includes('mirado'))                                            return { name: '미라도',         img: 'img-vehicles-mirado.webp' }
  if (v.includes('rony'))                                              return { name: '로니',           img: 'img-vehicles-rony.webp' }
  if (v.includes('minibus'))                                           return { name: '미니버스',       img: 'img-vehicles-minibus.webp' }
  if (v.includes('picobus') || v.includes('pico_bus') || (v.includes('pico') && v.includes('bus'))) return { name: '피코 버스', img: 'img-vehicles-pico_bus.webp' }
  if (v.includes('pickup'))                                            return { name: '픽업 트럭',      img: 'img-vehicles-pickup_truck.webp' }
  if (v.includes('foodtruck') || v.includes('food_truck'))            return { name: '푸드 트럭',      img: 'img-vehicles-food_truck.webp' }
  if (v.includes('pillar'))                                            return { name: '필라 시큐리티',  img: 'img-vehicles-pillar.webp' }
  if (v.includes('porter'))                                            return { name: '포터',           img: 'img-vehicles-porter.webp' }
  if (v.includes('tuktuk') || v.includes('tukshai'))                  return { name: '툭샤이',         img: 'img-vehicles-tukshai.webp' }
  if (v.includes('ladaniva') || v.includes('zima'))                   return { name: '지마',           img: 'img-vehicles-ladaniva.webp' }
  if (v.includes('aquarail') || v.includes('airboat') || v.includes('air_boat')) return { name: '에어보트', img: 'img-vehicles-air_boat.webp' }
  if (v.includes('coupesuv') || v.includes('coupe_suv') || v.includes('blanc'))  return { name: '블랑 (쿠페 SUV)', img: 'img-vehicles-coupe_suv.webp' }
  if (v.includes('couper') || v.includes('coupe_rb') || (v.includes('coupe') && v.includes('rb')))  return { name: '쿠페 RB', img: 'img-vehicles-coupe_rb.webp' }
  if (v.includes('ponycoupe') || v.includes('pony'))                  return { name: '포니 쿠페',      img: 'img-vehicles-pony_coupe.webp' }
  if (v.includes('coupe'))                                             return { name: '쿠페',           img: 'img-vehicles-coupe_rb.webp' }
  if (v.includes('quadbike') || v.includes('quad_bike'))              return { name: '쿼드 (ATV)',     img: 'img-vehicles-atv.webp' }
  if (v.includes('buggy'))                                             return { name: '버기',           img: 'img-vehicles-buggy.webp' }
  // 물 위 탈것
  if (v.includes('pg117') || v.includes('boat') || v.includes('pontoon')) return { name: '보트',      img: null }
  return null
}

function getMaxCoord(mapName) {
  if (!mapName) return 820000
  if (MAP_MAX[mapName]) return MAP_MAX[mapName]
  // _Main 제거 후 별칭 조회
  const base = mapName.replace(/_Main$/i, '')
  return MAP_MAX_ALIAS[base] || 820000
}

const MAP_ZONES = {
  Baltic_Main: [
    { name: '포치킨키', x1: 370000, x2: 460000, y1: 370000, y2: 460000 },
    { name: '조르고폴',  x1: 90000,  x2: 200000, y1: 200000, y2: 300000 },
    { name: '학교',      x1: 420000, x2: 490000, y1: 200000, y2: 280000 },
    { name: '밀타',      x1: 560000, x2: 660000, y1: 360000, y2: 460000 },
    { name: '노보',      x1: 540000, x2: 660000, y1: 640000, y2: 760000 },
    { name: '군기지',    x1: 600000, x2: 710000, y1: 110000, y2: 230000 },
    { name: '가트카',    x1: 300000, x2: 390000, y1: 480000, y2: 570000 },
    { name: '야스나야',  x1: 560000, x2: 670000, y1: 230000, y2: 340000 },
    { name: '프리모르',  x1: 200000, x2: 310000, y1: 620000, y2: 730000 },
    { name: '로좌크',    x1: 430000, x2: 510000, y1: 460000, y2: 540000 },
  ],
  Savage_Main: [
    { name: '부트캠프',    x1: 145000, x2: 225000, y1: 115000, y2: 195000 },
    { name: '루인스',      x1: 225000, x2: 295000, y1: 45000,  y2: 120000 },
    { name: '파라다이스',  x1: 50000,  x2: 120000, y1: 50000,  y2: 130000 },
    { name: '도크',        x1: 290000, x2: 370000, y1: 270000, y2: 350000 },
    { name: '케이브',      x1: 185000, x2: 255000, y1: 195000, y2: 275000 },
    { name: '하틴',        x1: 265000, x2: 345000, y1: 150000, y2: 220000 },
    { name: '팜 타운',     x1: 150000, x2: 225000, y1: 265000, y2: 340000 },
    { name: '페리야 비라', x1: 60000,  x2: 145000, y1: 245000, y2: 330000 },
    { name: '캠프 알파',   x1: 90000,  x2: 160000, y1: 145000, y2: 215000 },
  ],
  Desert_Main: [
    { name: '페카도',         x1: 340000, x2: 440000, y1: 340000, y2: 440000 },
    { name: '산 마르틴',      x1: 360000, x2: 450000, y1: 200000, y2: 290000 },
    { name: '로스 레오네스',  x1: 480000, x2: 620000, y1: 500000, y2: 650000 },
    { name: '엘 포조',        x1: 160000, x2: 260000, y1: 280000, y2: 380000 },
    { name: '아시엔다',       x1: 360000, x2: 440000, y1: 460000, y2: 540000 },
    { name: '라 코브레리아',  x1: 490000, x2: 580000, y1: 200000, y2: 290000 },
  ],
  Tiger_Main: [
    { name: '태이고 시티',  x1: 340000, x2: 480000, y1: 280000, y2: 420000 },
    { name: '쌍용',         x1: 530000, x2: 630000, y1: 190000, y2: 290000 },
    { name: '북도 마을',    x1: 200000, x2: 310000, y1: 200000, y2: 310000 },
    { name: '도하 마을',    x1: 390000, x2: 490000, y1: 490000, y2: 590000 },
  ],
  DihorOtok_Main: [
    { name: '카슈미르', x1: 270000, x2: 370000, y1: 200000, y2: 300000 },
    { name: '디노 파크', x1: 370000, x2: 460000, y1: 90000,  y2: 180000 },
    { name: '발로로보', x1: 100000, x2: 200000, y1: 200000, y2: 300000 },
  ],
}

function getLocationName(x, y, mapName) {
  const zones = MAP_ZONES[mapName]
  if (zones) {
    const found = zones.find((z) => x >= z.x1 && x <= z.x2 && y >= z.y1 && y <= z.y2)
    if (found) return found.name
  }
  const half = Math.floor(getMaxCoord(mapName) / 2)
  if (x > half && y < half) return '북동쪽'
  if (x > half && y > half) return '남동쪽'
  if (x < half && y < half) return '북서쪽'
  if (x < half && y > half) return '남서쪽'
  return '중앙'
}

function analyzeTelemetry(telemetryData, playerName, mapName) {
  const killLog = []
  const weaponStats = {}
  const positions = []
  // vehicleKey(=img or name) → 집계 데이터
  const vehicleMap = {}

  telemetryData.forEach((event) => {
    try {
      if (event._T === 'LogVehicleRide') {
        const charName = (event.character?.name || '').toLowerCase()
        if (charName === playerName) {
          const vehicleId = event.vehicle?.vehicleId || ''
          const info = getVehicleInfo(vehicleId)
          if (info) {
            const key = info.img || info.name
            if (!vehicleMap[key]) vehicleMap[key] = { ...info, totalDistance: 0, rideCount: 0 }
          }
        }
      } else if (event._T === 'LogVehicleLeave') {
        const charName = (event.character?.name || '').toLowerCase()
        if (charName === playerName) {
          const vehicleId = event.vehicle?.vehicleId || ''
          const rideDistance = event.rideDistance || 0
          const info = getVehicleInfo(vehicleId)
          if (info) {
            const key = info.img || info.name
            if (!vehicleMap[key]) vehicleMap[key] = { ...info, totalDistance: 0, rideCount: 0 }
            vehicleMap[key].totalDistance += rideDistance
            vehicleMap[key].rideCount += 1
          }
        }
      } else if (event._T === 'LogPlayerKill' || event._T === 'LogPlayerKillV2') {
        const killerName = (event.killer?.name || event.finisher?.name || '').toLowerCase()
        if (killerName === playerName) {
          const primaryWeapon   = (event.damageCauserName && event.damageCauserName !== 'None') ? event.damageCauserName : null
          const finishWeapon    = (event.finishDamageInfo?.damageCauserName && event.finishDamageInfo.damageCauserName !== 'None') ? event.finishDamageInfo.damageCauserName : null
          const finishDmgType   = event.finishDamageInfo?.damageTypeCategory
          const weapon          = primaryWeapon || finishWeapon || event.damageTypeCategory || '알 수 없음'
          const isFromFinish    = !primaryWeapon && !!finishWeapon

          // LogPlayerKillV2는 distance 필드가 없거나 0인 경우가 많아 위치로 재계산
          let distance = event.distance ? Math.round(event.distance / 100) : 0
          if (distance === 0) {
            const atk = event.killer?.location || event.finisher?.location
            const vic = event.victim?.location
            if (atk && vic) {
              const dx = atk.x - vic.x
              const dy = atk.y - vic.y
              distance = Math.round(Math.sqrt(dx * dx + dy * dy) / 100)
            }
          }
          const isHeadshot =
            event.damageReason === 'Head' ||
            event.finishDamageInfo?.damageReason === 'Head'

          const rawVictimName = event.victim?.name || 'Unknown'
          const isVictimBot =
            event.victim?.accountId?.startsWith('ai.') ||
            /^Player(Female|Male)/i.test(rawVictimName)
          const victimDisplay = isVictimBot ? '[봇]' : rawVictimName

          // 무기 표시명 결정 (finishDmgType으로 컨텍스트 분류)
          let weaponDisplay
          if (/^Player(Female|Male)/i.test(weapon)) {
            // PlayerFemale_A_C / PlayerMale_A_C
            // Damage_DBNO = 처치 모션 (DBNO 적 E키 처치)
            // 그 외 = 근접 공격 (주먹킬)
            weaponDisplay = finishDmgType === 'Damage_DBNO' ? '처치 모션' : '근접 공격'
          } else if (/UltAIPawn/i.test(weapon) && finishDmgType === 'Damage_DBNO') {
            // 봇 처치 모션 (UltAIPawn_Base_Male_C)
            weaponDisplay = '처치 모션'
          } else if (finishDmgType === 'Damage_VehicleHit') {
            weaponDisplay = '차량 충돌'
          } else if (finishDmgType === 'Damage_BlueZone') {
            weaponDisplay = '블루존'
          } else if (finishDmgType === 'Damage_Explosion_RedZone') {
            weaponDisplay = '레드존'
          } else {
            weaponDisplay = weaponDisplayName(weapon)
          }

          killLog.push(
            `${victimDisplay}을(를) ${weaponDisplay}${isHeadshot ? ' (헤드샷)' : ''}으로 ${distance}m에서 제거`
          )
        }
      } else if (event._T === 'LogPlayerTakeDamage') {
        const attacker = event.attacker?.name?.toLowerCase()
        if (attacker === playerName) {
          const weapon = event.damageCauserName || event.damageTypeCategory || '알 수 없음'
          const damage = event.damage || 0
          if (damage > 0 && weapon !== '알 수 없음') {
            weaponStats[weapon] = (weaponStats[weapon] || 0) + damage
          }
        }
      } else if (event._T === 'LogPlayerPosition') {
        const character = event.character
        // common.isGame < 1 = 비행기/낙하산 구간 → 제외
        if (
          character?.name?.toLowerCase() === playerName &&
          (event.common?.isGame ?? 1) >= 1
        ) {
          const loc = character.location
          if (loc && loc.x !== undefined && loc.y !== undefined) {
            positions.push({ x: loc.x, y: loc.y })
          }
        }
      }
    } catch (_) {}
  })

  const maxCoord = getMaxCoord(mapName)
  let movePath = ''
  let movePathCoords = []

  if (positions.length > 5) {
    const keyIdxs = [0, 0.25, 0.5, 0.75, 1].map((r) =>
      Math.min(Math.floor(r * (positions.length - 1)), positions.length - 1)
    )
    const zoneNames = keyIdxs.map((i) => getLocationName(positions[i].x, positions[i].y, mapName))
    const uniqueZones = zoneNames.filter((n, i, arr) => n && arr.indexOf(n) === i)
    movePath = uniqueZones.join(' → ')

    const step = Math.max(1, Math.floor(positions.length / 30))
    movePathCoords = positions
      .filter((_, i) => i % step === 0)
      .map((p) => ({
        x: Math.max(0, Math.min(1, p.x / maxCoord)),
        y: Math.max(0, Math.min(1, p.y / maxCoord)),
      }))
  }

  const vehicleLog = Object.values(vehicleMap)
    .sort((a, b) => b.totalDistance - a.totalDistance)
    .map(v => ({
      name:          v.name,
      img:           v.img ? `${VEHICLE_BASE}${v.img}` : null,
      totalDistance: Math.round(v.totalDistance),
      rideCount:     v.rideCount,
    }))

  return { killLog, weaponStats, movePath, movePathCoords, vehicleLog }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { url, mapName, nickname } = req.query
  if (!url || !nickname) return res.status(400).json({ error: 'url, nickname 필수' })

  // PUBG 공식 텔레메트리 URL만 허용
  if (!url.startsWith('https://telemetry-cdn.pubg.com/') && !url.startsWith('https://telemetry.pubg.com/')) {
    return res.status(400).json({ error: '유효하지 않은 텔레메트리 URL' })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000) // 25초 타임아웃
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok) {
      return res.status(502).json({ error: '텔레메트리 fetch 실패', status: response.status })
    }

    const telemetryData = await response.json()
    const result = analyzeTelemetry(telemetryData, nickname.toLowerCase(), mapName || '')

    res.setHeader('Cache-Control', 'public, max-age=86400') // 24시간 캐시 (텔레메트리는 변하지 않음)
    return res.status(200).json(result)
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: '텔레메트리 로드 타임아웃' })
    }
    return res.status(500).json({ error: err.message })
  }
}
