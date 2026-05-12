// PUBG 봇 킬 분석 API
// GET /api/pubg/bot-kills?matchIds=id1,id2,id3&platform=steam&playerName=nickname
// - bot_kills.ts의 analyzeMatch 로직을 matchId 리스트 반복 호출
// - 최대 3경기, 30분 인메모리 캐시 (rows 전체 캐싱)
// - 14일 이내 매치만 분석 가능
// - 어떤 경우에도 throw 없음 → null 반환

const BASE_URL = 'https://api.pubg.com/shards'
const PUBG_HEADERS = { Accept: 'application/vnd.api+json' }
const CACHE_TTL_MS = 30 * 60 * 1000
const MAX_MATCHES = 3
const MAX_RETRIES = 2
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

// rows 전체를 캐싱 (matchId 단위)
const memCache = new Map()

const isValidMatchId = (id) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

async function fetchWithRetry(url, options = {}, timeoutMs = 20000) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const tid = setTimeout(() => controller.abort(), timeoutMs)
      const res = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(tid)
      return res
    } catch {
      if (attempt === MAX_RETRIES) return null
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)))
    }
  }
  return null
}

// 매치 메타 fetch
async function getMatch(platform, matchId) {
  const res = await fetchWithRetry(
    `${BASE_URL}/${platform}/matches/${matchId}`,
    { headers: PUBG_HEADERS },
    10000
  )
  if (!res || !res.ok) throw new Error(`match fetch failed: ${res?.status}`)
  return res.json()
}

// 텔레메트리 URL 추출
function getTelemetryUrl(matchData) {
  const included = matchData?.included ?? []
  for (const item of included) {
    if (item.type === 'asset') {
      const url = item.attributes?.URL
      if (url) return url
    }
  }
  return null
}

// 텔레메트리 fetch (대용량 20~50MB, 타임아웃 넉넉히)
async function fetchTelemetry(url) {
  const res = await fetchWithRetry(url, { headers: PUBG_HEADERS }, 45000)
  if (!res || !res.ok) throw new Error(`telemetry fetch failed: ${res?.status}`)
  return res.json()
}

// 실제 플레이어(account.*) 스탯 추출
function extractRealPlayers(matchData) {
  const players = new Map()
  const included = matchData?.included ?? []
  for (const item of included) {
    if (item.type !== 'participant') continue
    const stats = item.attributes?.stats ?? {}
    const playerId = stats.playerId ?? ''
    if (!playerId.startsWith('account.')) continue
    players.set(playerId, {
      name: stats.name,
      kills: stats.kills ?? 0,
      damageDealt: stats.damageDealt ?? 0,
      winPlace: stats.winPlace ?? null,
    })
  }
  return players
}

// LogPlayerKillV2 기반 봇 킬 집계
function countBotKillsByAccount(telemetry) {
  const counter = new Map()
  for (const event of telemetry) {
    if (event._T !== 'LogPlayerKillV2') continue
    const victimId = event.victim?.accountId ?? ''
    const killerId = event.killer?.accountId ?? ''
    if (!victimId.startsWith('ai.')) continue
    if (!killerId.startsWith('account.')) continue
    counter.set(killerId, (counter.get(killerId) ?? 0) + 1)
  }
  return counter
}

// 텔레메트리 안전 호출 → { status, counts }
async function safeFetchBotKills(matchData) {
  const telemetryUrl = getTelemetryUrl(matchData)
  if (!telemetryUrl) {
    return { status: 'missing', counts: new Map() }
  }
  try {
    const telemetry = await fetchTelemetry(telemetryUrl)
    return { status: 'ok', counts: countBotKillsByAccount(telemetry) }
  } catch (err) {
    console.warn('[bot-kills] 텔레메트리 호출 실패:', err)
    return { status: 'failed', counts: new Map() }
  }
}

// 플레이어 rows 빌드 (전체 참가자)
function buildRows(players, botKillsById) {
  const rows = []
  for (const [pid, info] of players) {
    const botK = botKillsById.get(pid) ?? 0
    const totalK = info.kills
    rows.push({
      accountId: pid,
      name: info.name,
      total: totalK,
      bot: botK,
      real: totalK - botK,
      damage: info.damageDealt,
      rank: info.winPlace,
    })
  }
  return rows
}

// matchId 하나 분석 → 전체 rows 캐싱 후 playerName 필터
async function analyzeMatch(matchId, platform, playerName) {
  const cacheKey = `bot-kills:${platform}:${matchId}`
  const cached = memCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return findPlayer(cached.rows, playerName)
  }

  try {
    let matchData
    try {
      matchData = await getMatch(platform, matchId)
    } catch (err) {
      console.warn('[bot-kills] match 호출 실패:', err)
      return null
    }

    // 14일 만료 체크
    const createdAt = matchData?.data?.attributes?.createdAt
    if (createdAt && Date.now() - new Date(createdAt).getTime() > FOURTEEN_DAYS_MS) {
      memCache.set(cacheKey, { rows: [], ts: Date.now() })
      return null
    }

    const players = extractRealPlayers(matchData)
    const telResult = await safeFetchBotKills(matchData)
    const rows = buildRows(players, telResult.counts)

    memCache.set(cacheKey, { rows, ts: Date.now() })
    return findPlayer(rows, playerName)
  } catch (err) {
    console.warn('[bot-kills] 예기치 못한 오류:', err)
    return null
  }
}

function findPlayer(rows, playerName) {
  const nameLower = playerName.toLowerCase()
  return rows.find((r) => (r.name ?? '').toLowerCase() === nameLower) ?? null
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end()
  }

  const { matchIds, platform = 'steam', playerName } = req.query
  if (!matchIds || !playerName) {
    return res.status(400).json({ error: 'matchIds, playerName 필수' })
  }

  const ids = matchIds
    .split(',')
    .map((s) => s.trim())
    .filter(isValidMatchId)
    .slice(0, MAX_MATCHES)

  if (ids.length === 0) {
    return res.status(400).json({ error: '유효한 PUBG matchId 없음' })
  }

  // matchId 리스트 반복 호출
  const results = {}
  for (const matchId of ids) {
    results[matchId] = await analyzeMatch(matchId, platform, playerName)
  }

  res.setHeader('Cache-Control', 'no-store')
  return res.json({ results })
}
