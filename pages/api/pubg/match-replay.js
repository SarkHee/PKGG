// GET /api/pubg/match-replay?matchId=<matchId>&shard=<platform>
// 2D 리플레이용 경량 텔레메트리 JSON 반환. Redis 캐시(replay:{matchId}, TTL 1시간) 우선.
import { getMatchReplay } from '../../../utils/replayTelemetry.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { matchId, shard } = req.query
  if (!matchId || !shard) return res.status(400).json({ error: 'matchId, shard가 필요합니다.' })

  const result = await getMatchReplay(matchId, shard)

  if (result.status === 'ok') {
    res.setHeader('Cache-Control', 'public, max-age=3600')
    return res.status(200).json(result.data)
  }
  if (result.status === 'telemetry_missing') {
    return res.status(404).json({ error: '텔레메트리 URL을 찾을 수 없습니다.' })
  }
  if (result.status === 'match_failed') {
    return res.status(502).json({ error: '매치 정보를 가져올 수 없습니다.' })
  }
  return res.status(500).json({ error: '텔레메트리 처리 중 오류가 발생했습니다.' })
}
