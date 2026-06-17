// GET /api/player/bot-matches?nickname=xxx&shard=steam
// botKills > 0 인 경기 목록 반환 (teammatesDetail 없는 경기는 PUBG API에서 보완)

import prisma from '../../../utils/prisma.js'
import { cachedPubgFetch, TTL } from '../../../utils/pubgApiCache.js'
import { getSeasonStart } from '../../../utils/seasonStart.js'

const PUBG_BASE = 'https://api.pubg.com/shards'

function parseTeammatesDetail(data, nickname) {
  const included    = data.included || []
  const participants = included.filter((i) => i.type === 'participant')
  const rosters      = included.filter((i) => i.type === 'roster')

  const me = participants.find(
    (p) => p.attributes.stats.name?.toLowerCase() === nickname.toLowerCase()
  )
  if (!me) return []

  const myRoster = rosters.find((r) =>
    r.relationships?.participants?.data?.some((ref) => ref.id === me.id)
  )
  const teammateRefs = myRoster?.relationships?.participants?.data || [{ id: me.id }]

  return teammateRefs
    .map((ref) => participants.find((p) => p.id === ref.id))
    .filter(Boolean)
    .map((t) => {
      const ts = t.attributes.stats
      return {
        name:         ts.name,
        kills:        ts.kills        || 0,
        assists:      ts.assists      || 0,
        damage:       Math.round(ts.damageDealt || 0),
        dbnos:        ts.DBNOs        || 0,
        survivalTime: ts.timeSurvived || 0,
        rank:         ts.winPlace     || 0,
        isSelf:       t.id === me.id,
      }
    })
    .sort((a, b) => {
      if (a.isSelf) return -1
      if (b.isSelf) return 1
      return b.damage - a.damage
    })
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { nickname, shard = 'steam' } = req.query
  if (!nickname) return res.status(400).json({ error: 'nickname 필요' })

  try {
    const member = await prisma.clanMember.findFirst({
      where: { nickname: { equals: nickname, mode: 'insensitive' } },
      select: { pubgPlayerId: true },
    })

    if (!member?.pubgPlayerId) {
      return res.status(200).json({ matches: [] })
    }

    const { start: SEASON_START } = await getSeasonStart()

    const rows = await prisma.playerMatch.findMany({
      where: {
        pubgAccountId: member.pubgPlayerId,
        shard,
        isBotCorrected: true,
        botKills: { gt: 0 },
        createdAt: { gte: SEASON_START },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        matchId:         true,
        mode:            true,
        mapName:         true,
        placement:       true,
        kills:           true,
        assists:         true,
        damage:          true,
        surviveTime:     true,
        botKills:        true,
        realKills:       true,
        botDamage:       true,
        realDamage:      true,
        isBotCorrected:  true,
        teammatesDetail: true,
        telemetryUrl:    true,
        createdAt:       true,
      },
    })

    // teammatesDetail 없는 경기 → PUBG API에서 보완 (캐시 활용)
    const missing = rows.filter((r) => !Array.isArray(r.teammatesDetail))
    if (missing.length > 0) {
      const fetchResults = await Promise.allSettled(
        missing.map((r) =>
          cachedPubgFetch(`${PUBG_BASE}/${shard}/matches/${r.matchId}`, { ttl: TTL.MATCH, force: false })
        )
      )

      const dbUpdates = []
      fetchResults.forEach((result, i) => {
        const row = missing[i]
        if (result.status !== 'fulfilled') return

        const teammates = parseTeammatesDetail(result.value, nickname)
        row.teammatesDetail = teammates
        dbUpdates.push(
          prisma.playerMatch.update({
            where: { pubgAccountId_matchId: { pubgAccountId: member.pubgPlayerId, matchId: row.matchId } },
            data:  { teammatesDetail: teammates },
          }).catch(() => {})
        )
      })

      // DB 백필 (응답 기다리지 않음 — fire & forget)
      Promise.allSettled(dbUpdates)
    }

    const matches = rows.map((m) => ({
      matchId:         m.matchId,
      mode:            m.mode,
      mapName:         m.mapName,
      placement:       m.placement,
      kills:           m.kills,
      assists:         m.assists,
      damage:          m.damage,
      surviveTime:     m.surviveTime,
      botKills:        m.botKills,
      realKills:       m.realKills,
      botDamage:       m.botDamage      ?? 0,
      realDamage:      m.realDamage     ?? m.damage,
      isBotCorrected:  m.isBotCorrected,
      teammatesDetail: Array.isArray(m.teammatesDetail) ? m.teammatesDetail : [],
      telemetryUrl:    m.telemetryUrl || null,
      matchTimestamp:  m.createdAt.toISOString(),
    }))

    return res.status(200).json({ matches })
  } catch (e) {
    console.error('[bot-matches]', e.message)
    return res.status(500).json({ error: '조회 실패' })
  }
}
