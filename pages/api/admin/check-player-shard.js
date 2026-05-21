import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth].js'
import prisma from '../../../utils/prisma.js'

const ADMIN_EMAIL = 'sssyck123@gmail.com'
const PUBG_BASE = 'https://api.pubg.com/shards'
const SHARDS = ['steam', 'kakao', 'psn', 'xbox']

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const pw = req.headers['x-admin-token'] || req.query.pw
  const session = await getServerSession(req, res, authOptions)
  const isAdmin = (pw && pw === process.env.ADMIN_PASSWORD) || session?.user?.email === ADMIN_EMAIL
  if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' })

  const { name } = req.query
  if (!name) return res.status(400).json({ error: 'name required' })

  const headers = {
    Authorization: `Bearer ${process.env.PUBG_API_KEY}`,
    Accept: 'application/vnd.api+json',
  }

  // DB 현재 상태 조회
  const dbRows = await prisma.playerCache.findMany({
    where: { nickname: { equals: name, mode: 'insensitive' } },
    select: { id: true, nickname: true, pubgPlayerId: true, pubgShardId: true, avgDamage: true, lastUpdated: true },
  }).catch(() => [])

  // 모든 shard에서 직접 PUBG API 조회 (캐시 없이)
  const apiResults = {}
  for (const shard of SHARDS) {
    try {
      const r = await fetch(
        `${PUBG_BASE}/${shard}/players?filter[playerNames]=${encodeURIComponent(name)}`,
        { headers }
      )
      const status = r.status
      if (r.ok) {
        const json = await r.json()
        const player = json.data?.[0]
        apiResults[shard] = player
          ? { found: true, accountId: player.id, shardId: player.attributes?.shardId, name: player.attributes?.name }
          : { found: false }
      } else {
        apiResults[shard] = { found: false, httpStatus: status }
      }
    } catch (e) {
      apiResults[shard] = { found: false, error: e.message }
    }
  }

  return res.json({ dbRows, apiResults })
}
