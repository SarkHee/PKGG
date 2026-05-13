import { redisGet, redisSet } from '../../utils/redis.js'

const SEASONS_URL = 'https://raw.githubusercontent.com/pubg/api-assets/master/seasons.json'
const CACHE_KEY   = 'season-info:current'
const TTL         = 24 * 60 * 60  // 24시간

function parseDate(str) {
  if (!str || str === '00-00-0000') return null
  const [m, d, y] = str.split('-')
  return new Date(`${y}-${m}-${d}T00:00:00Z`)
}

function findCurrentSeason(seasons) {
  const now = new Date()
  // 역순 탐색 → 가장 최신 시즌 우선 (오래된 시즌에 endDate 없는 경우 방지)
  for (let i = seasons.length - 1; i >= 0; i--) {
    const s     = seasons[i]
    const start = parseDate(s.attributes?.startDate)
    const end   = parseDate(s.attributes?.endDate)
    if (!start || now < start) continue   // 아직 시작 전이면 건너뜀
    if (!end || now <= end) return s       // 진행 중이거나 아직 endDate 이전
  }
  return seasons[seasons.length - 1]
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  // Redis 캐시 확인
  const cached = await redisGet(CACHE_KEY)
  if (cached) {
    const obj = typeof cached === 'string' ? JSON.parse(cached) : cached
    return res.status(200).json(obj)
  }

  try {
    const response = await fetch(SEASONS_URL)
    if (!response.ok) throw new Error(`GitHub fetch 실패: ${response.status}`)
    const json = await response.json()

    const pcSeasons = json.PC || []
    if (pcSeasons.length === 0) throw new Error('PC 시즌 데이터 없음')

    const season = findCurrentSeason(pcSeasons)
    const endDateStr = season.attributes?.endDate || '00-00-0000'
    const endDate    = parseDate(endDateStr)

    let daysLeft = null
    if (endDate) {
      const diff = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      daysLeft = Math.max(0, diff)
    }

    const result = {
      seasonId:  season.id,
      startDate: season.attributes?.startDate || null,
      endDate:   endDateStr === '00-00-0000' ? null : endDateStr,
      daysLeft,            // null이면 종료일 미정
      isOngoing: !endDate, // endDate가 없으면 진행 중
    }

    await redisSet(CACHE_KEY, result, TTL)
    return res.status(200).json(result)
  } catch (err) {
    console.warn('[season-info] 오류:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
