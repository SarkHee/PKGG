import { cachedPubgFetch, TTL } from '../../../utils/pubgApiCache'

// 시즌 ID에서 번호 추출: "division.bro.official.pc-2018-41" → 41
function parseSeasonNum(id) {
  const m = id?.match(/-(\d+)$/)
  return m ? parseInt(m[1], 10) : null
}

// 번호로 시즌 ID 생성
function makeSeasonId(num) {
  return `division.bro.official.pc-2018-${num}`
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const shard = req.query.shard || 'steam'

  try {
    // 현재 시즌 ID만 가져옴
    const data = await cachedPubgFetch(
      `https://api.pubg.com/shards/${shard}/seasons`,
      { ttl: TTL.SEASON, force: false }
    )
    const allSeasons = data.data || []
    const current = allSeasons.find(s => s.attributes?.isCurrentSeason)
    if (!current) throw new Error('현재 시즌을 찾을 수 없습니다')

    const curNum = parseSeasonNum(current.id)
    if (!curNum) throw new Error('시즌 번호 파싱 실패')

    // 현재 + 이전 4시즌 생성
    const result = [
      { id: current.id, isCurrentSeason: true, label: `시즌 ${curNum} (현재)` },
      ...Array.from({ length: 4 }, (_, i) => ({
        id: makeSeasonId(curNum - i - 1),
        isCurrentSeason: false,
        label: `시즌 ${curNum - i - 1}`,
      })).filter(s => parseSeasonNum(s.id) > 0),
    ]

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).json({ seasons: result })
  } catch (err) {
    console.warn('[pubg/seasons] 오류:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
