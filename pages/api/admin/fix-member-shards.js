// 클랜 멤버 shard 일괄 재검증/교정 (one-time 관리자 스크립트)
// POST /api/admin/fix-member-shards
// 기존에 클랜 shard로 잘못 저장된 멤버 pubgShardId를 PUBG API 기준으로 교정

import prisma from '../../../utils/prisma.js'

const PUBG_BASE = 'https://api.pubg.com/shards'
const CHUNK_SIZE = 10

async function fetchPlayersByIds(shard, ids) {
  const url = `${PUBG_BASE}/${shard}/players?filter[playerIds]=${ids.join(',')}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.PUBG_API_KEY}`,
      Accept: 'application/vnd.api+json',
    },
  })
  if (!res.ok) throw new Error(`PUBG API ${res.status}`)
  const json = await res.json()
  return json.data || []
}

async function checkAdmin(req) {
  const pw = req.headers['x-admin-token'] || req.query.pw
  return pw && pw === process.env.ADMIN_PASSWORD
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!(await checkAdmin(req))) return res.status(401).json({ error: '관리자 인증 필요' })

  const dryRun = req.query.dry === '1'

  // pubgPlayerId 있는 멤버만 대상
  const members = await prisma.clanMember.findMany({
    where: { pubgPlayerId: { not: null } },
    select: { id: true, nickname: true, pubgPlayerId: true, pubgShardId: true },
  })

  console.log(`[fix-member-shards] 대상 멤버 ${members.length}명 (dryRun=${dryRun})`)

  const PRIMARY_SHARDS = ['steam', 'kakao']
  let fixed = 0
  let skipped = 0
  let errors = 0
  const fixedList = []

  // 10명씩 묶어서 steam/kakao 병렬 조회
  for (let i = 0; i < members.length; i += CHUNK_SIZE) {
    const chunk = members.slice(i, i + CHUNK_SIZE)
    const ids = chunk.map((m) => m.pubgPlayerId)

    const [steamResult, kakaoResult] = await Promise.allSettled([
      fetchPlayersByIds('steam', ids),
      fetchPlayersByIds('kakao', ids),
    ])

    const apiPlayers = new Map() // accountId → { shardId, name }
    const steamPlayers = steamResult.status === 'fulfilled' ? steamResult.value : []
    const kakaoPlayers = kakaoResult.status === 'fulfilled' ? kakaoResult.value : []

    for (const p of steamPlayers) {
      apiPlayers.set(p.id, { shardId: p.attributes?.shardId || 'steam', name: p.attributes?.name })
    }
    // steam 우선: kakao는 steam에 없는 경우만 추가
    for (const p of kakaoPlayers) {
      if (!apiPlayers.has(p.id)) {
        apiPlayers.set(p.id, { shardId: p.attributes?.shardId || 'kakao', name: p.attributes?.name })
      }
    }

    for (const member of chunk) {
      const apiInfo = apiPlayers.get(member.pubgPlayerId)
      if (!apiInfo) {
        console.warn(`[fix] ${member.nickname} API에서 찾지 못함`)
        errors++
        continue
      }

      const correctShard = apiInfo.shardId
      if (correctShard === member.pubgShardId) {
        skipped++
        continue
      }

      console.log(`[fix] ${member.nickname}: ${member.pubgShardId} → ${correctShard}`)
      fixedList.push({ nickname: member.nickname, from: member.pubgShardId, to: correctShard })

      if (!dryRun) {
        await Promise.all([
          prisma.clanMember.update({
            where: { id: member.id },
            data: { pubgShardId: correctShard },
          }),
          prisma.playerCache.updateMany({
            where: { pubgPlayerId: member.pubgPlayerId, pubgShardId: { not: correctShard } },
            data: { pubgShardId: correctShard },
          }),
        ]).catch((e) => {
          console.error(`[fix] ${member.nickname} 업데이트 실패:`, e.message)
          errors++
        })
      }
      fixed++
    }

    // Rate limit 방지 (100ms 간격)
    await new Promise((r) => setTimeout(r, 100))
  }

  return res.json({
    dryRun,
    total: members.length,
    fixed,
    skipped,
    errors,
    fixedList,
  })
}
