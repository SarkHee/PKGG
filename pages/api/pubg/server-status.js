import { redisGet, redisSet } from '../../../utils/redis.js'

const CACHE_KEY = 'pubg:server-status:v2'
const CACHE_TTL = 300 // 5분

const REGION_SHARDS = {
  as: 'steam',   // 아시아
  na: 'pc-na',   // 북미
  eu: 'pc-eu',   // 유럽
}

async function withTimeout(promise, ms = 8000) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer)
  }
}

// 메인 API 상태 체크
async function checkMainStatus() {
  try {
    const res = await withTimeout(fetch('https://api.pubg.com/status'))
    if (res.status === 503) return 'maintenance'
    if (!res.ok)            return 'offline'
    const json = await res.json()
    return json?.data?.type === 'status' ? 'online' : 'degraded'
  } catch {
    return 'offline'
  }
}

// 지역별 샤드 상태 체크
async function checkShard(shard, apiKey) {
  if (!apiKey) {
    // API 키 없으면 메인 상태로 대체
    return null
  }
  try {
    const res = await withTimeout(
      fetch(`https://api.pubg.com/shards/${shard}/seasons`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/vnd.api+json',
        },
      })
    )
    if (res.status === 200 || res.status === 404) return 'online'
    if (res.status === 429) return 'online'  // rate limited = 서버 운영 중
    if (res.status === 503) return 'maintenance'
    return 'offline'
  } catch {
    return 'offline'
  }
}

function overallStatus(regions) {
  const vals = Object.values(regions)
  if (vals.every((v) => v === 'online'))       return 'online'
  if (vals.some((v) => v === 'maintenance'))   return 'maintenance'
  if (vals.some((v) => v === 'offline'))       return 'offline'
  return 'degraded'
}

function statusMessage(status) {
  switch (status) {
    case 'online':      return '서버 정상 운영 중'
    case 'maintenance': return '서버 점검 중'
    case 'offline':     return '서버 접속 불가'
    case 'degraded':    return '서버 일부 불안정'
    default:            return '상태 확인 중'
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const cached = await redisGet(CACHE_KEY)
  if (cached) return res.status(200).json(cached)

  const apiKey = process.env.PUBG_API_KEY
  const mainStatus = await checkMainStatus()

  // 메인이 오프라인이면 지역 체크 스킵
  let regions
  if (mainStatus === 'offline') {
    regions = { as: 'offline', na: 'offline', eu: 'offline' }
  } else {
    const [as_, na_, eu_] = await Promise.all([
      checkShard(REGION_SHARDS.as, apiKey),
      checkShard(REGION_SHARDS.na, apiKey),
      checkShard(REGION_SHARDS.eu, apiKey),
    ])
    regions = {
      as: as_ ?? mainStatus,
      na: na_ ?? mainStatus,
      eu: eu_ ?? mainStatus,
    }
  }

  const status = mainStatus === 'offline' ? 'offline' : overallStatus(regions)

  const data = {
    status,
    message: statusMessage(status),
    updatedAt: new Date().toISOString(),
    regions,
  }

  await redisSet(CACHE_KEY, data, CACHE_TTL)
  return res.status(200).json(data)
}
