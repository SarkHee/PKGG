// GET /api/pubg/match-telemetry?url=<encodedUrl>&mapName=<mapName>&nickname=<lowerNickname>
// 단일 경기 텔레메트리 지연 로드 엔드포인트

const MAP_MAX = {
  Baltic_Main: 820000, Desert_Main: 820000, Tiger_Main: 820000,
  Kiki_Main: 820000,   Neon_Main: 820000,
  Savage_Main: 408000,
  DihorOtok_Main: 612000,
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
  const half = mapName === 'Savage_Main' ? 204000 : 410000
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

  telemetryData.forEach((event) => {
    try {
      if (event._T === 'LogPlayerKill' || event._T === 'LogPlayerKillV2') {
        const killerName = (event.killer?.name || event.finisher?.name || '').toLowerCase()
        if (killerName === playerName) {
          const weapon =
            event.damageCauserName ||
            event.finishDamageInfo?.damageCauserName ||
            event.damageTypeCategory ||
            '알 수 없음'
          const distance = event.distance ? Math.round(event.distance / 100) : 0
          const isHeadshot =
            event.damageReason === 'Head' ||
            event.finishDamageInfo?.damageReason === 'Head'
          killLog.push(
            `${event.victim?.name || 'Unknown'}을(를) ${weapon}${isHeadshot ? ' (헤드샷)' : ''}으로 ${distance}m에서 제거`
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
        if (character?.name?.toLowerCase() === playerName) {
          const loc = character.location
          if (loc && loc.x !== undefined && loc.y !== undefined) {
            positions.push({ x: loc.x, y: loc.y })
          }
        }
      }
    } catch (_) {}
  })

  const maxCoord = MAP_MAX[mapName] || 820000
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

  return { killLog, weaponStats, movePath, movePathCoords }
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
