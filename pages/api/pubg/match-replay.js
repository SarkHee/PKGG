// GET /api/pubg/match-replay?matchId=<matchId>&shard=<platform>
// 2D 리플레이용 경량 텔레메트리 JSON 반환. Redis 캐시(replay:{matchId}, TTL 1시간) 우선.
import { getMatchReplay } from '../../../utils/replayTelemetry.js'
import prisma from '../../../utils/prisma.js'

// 로스터에 클랜 태그 부착 — 텔레메트리는 캐시되지만 클랜 소속은 바뀔 수 있으므로 매 응답마다 최신 조회
async function attachClanTags(players) {
  const ids = players.map((p) => p.id).filter(Boolean)
  if (ids.length === 0) return players
  try {
    const members = await prisma.clanMember.findMany({
      where: { pubgPlayerId: { in: ids } },
      select: { pubgPlayerId: true, clan: { select: { pubgClanTag: true } } },
    })
    const tagById = new Map(members.filter((m) => m.clan?.pubgClanTag).map((m) => [m.pubgPlayerId, m.clan.pubgClanTag]))
    return players.map((p) => ({ ...p, clanTag: tagById.get(p.id) || null }))
  } catch (e) {
    console.warn('[match-replay] 클랜 태그 조회 실패(무시):', e.message)
    return players
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { matchId, shard } = req.query
  if (!matchId || !shard) return res.status(400).json({ error: 'matchId, shard가 필요합니다.' })

  const result = await getMatchReplay(matchId, shard)

  if (result.status === 'ok') {
    const players = await attachClanTags(result.data.players)
    // 브라우저 단에서 장시간 캐싱하면 서버(Redis)가 이미 최신으로 반영한 스키마 변경/버그 수정을
    // 최대 1시간까지 못 받아보는 문제가 생겨서(실제로 발생) 브라우저 캐싱은 끄고 Redis 캐시만 사용
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ ...result.data, players })
  }
  if (result.status === 'telemetry_missing') {
    return res.status(404).json({ error: '텔레메트리 URL을 찾을 수 없습니다.' })
  }
  if (result.status === 'match_failed') {
    return res.status(502).json({ error: '매치 정보를 가져올 수 없습니다.' })
  }
  return res.status(500).json({ error: '텔레메트리 처리 중 오류가 발생했습니다.' })
}
