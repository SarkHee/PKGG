// 클랜 멤버 shard 일괄 재검증/교정 (관리자 API)
// POST /api/admin/fix-member-shards?dry=1&offset=0&limit=500
// offset/limit으로 구간 지정 → Vercel 타임아웃 방지

import prisma from '../../../utils/prisma.js'

const PUBG_BASE = 'https://api.pubg.com/shards'
const CHUNK_SIZE = 10
const CHUNK_DELAY_MS = 300 // rate limit 방지

async function fetchPlayersByIds(shard, ids) {
  const url = `${PUBG_BASE}/${shard}/players?filter[playerIds]=${ids.join(',')}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.PUBG_API_KEY}`,
      Accept: 'application/vnd.api+json',
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`PUBG API ${res.status}: ${body.slice(0, 200)}`)
  }
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
  const offset = Math.max(0, parseInt(req.query.offset) || 0)
  const limit  = Math.min(500, Math.max(1, parseInt(req.query.limit) || 200))
  const MAX_ERROR_SAMPLE = 30

  // 전체 대상 수 조회
  const total = await prisma.clanMember.count({
    where: { pubgPlayerId: { not: null } },
  })

  // 이번 배치 구간만 조회
  const members = await prisma.clanMember.findMany({
    where: { pubgPlayerId: { not: null } },
    select: { id: true, nickname: true, pubgPlayerId: true, pubgShardId: true },
    orderBy: { id: 'asc' },
    skip: offset,
    take: limit,
  })

  const batchEnd = offset + members.length
  const nextOffset = batchEnd < total ? batchEnd : null

  console.log(`[fix-member-shards] offset=${offset} limit=${limit} 대상=${members.length}명 (total=${total}, dryRun=${dryRun})`)

  let fixed = 0
  let skipped = 0
  let errors = 0
  const fixedList = []
  const errorList = []
  const chunkErrors = []

  for (let i = 0; i < members.length; i += CHUNK_SIZE) {
    const chunk = members.slice(i, i + CHUNK_SIZE)
    const ids = chunk.map((m) => m.pubgPlayerId)
    const chunkIndex = Math.floor(i / CHUNK_SIZE)

    const [steamResult, kakaoResult] = await Promise.allSettled([
      fetchPlayersByIds('steam', ids),
      fetchPlayersByIds('kakao', ids),
    ])

    if (steamResult.status === 'rejected') {
      chunkErrors.push({ chunkIndex, shard: 'steam', error: steamResult.reason?.message })
      console.error(`[fix] 청크 ${chunkIndex} steam 실패:`, steamResult.reason?.message)
    }
    if (kakaoResult.status === 'rejected') {
      chunkErrors.push({ chunkIndex, shard: 'kakao', error: kakaoResult.reason?.message })
      console.error(`[fix] 청크 ${chunkIndex} kakao 실패:`, kakaoResult.reason?.message)
    }

    const apiPlayers = new Map()
    const steamPlayers = steamResult.status === 'fulfilled' ? steamResult.value : []
    const kakaoPlayers = kakaoResult.status === 'fulfilled' ? kakaoResult.value : []

    for (const p of steamPlayers) {
      apiPlayers.set(p.id, { shardId: p.attributes?.shardId || 'steam', name: p.attributes?.name })
    }
    for (const p of kakaoPlayers) {
      if (!apiPlayers.has(p.id)) {
        apiPlayers.set(p.id, { shardId: p.attributes?.shardId || 'kakao', name: p.attributes?.name })
      }
    }

    for (const member of chunk) {
      const apiInfo = apiPlayers.get(member.pubgPlayerId)
      if (!apiInfo) {
        const steamFailed = steamResult.status === 'rejected'
        const kakaoFailed = kakaoResult.status === 'rejected'
        const reason = (steamFailed && kakaoFailed)
          ? 'steam+kakao API 모두 실패'
          : steamFailed
            ? 'steam API 실패 (kakao에도 없음)'
            : '두 shard 모두에서 찾지 못함 (탈퇴/삭제 유저 가능성)'
        errorList.push({ nickname: member.nickname, pubgPlayerId: member.pubgPlayerId, currentShard: member.pubgShardId, reason })
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
          const errMsg = `DB 업데이트 실패: ${e.message}`
          errorList.push({ nickname: member.nickname, pubgPlayerId: member.pubgPlayerId, currentShard: member.pubgShardId, reason: errMsg })
          errors++
          fixed-- // 위에서 먼저 카운트했으므로 롤백
        })
      }
      fixed++
    }

    // 청크 간 딜레이 (rate limit 방지, 마지막 청크는 불필요)
    if (i + CHUNK_SIZE < members.length) {
      await new Promise((r) => setTimeout(r, CHUNK_DELAY_MS))
    }
  }

  const errorSummary = {}
  for (const e of errorList) {
    errorSummary[e.reason] = (errorSummary[e.reason] || 0) + 1
  }

  return res.json({
    dryRun,
    // 페이지네이션 정보
    total,
    range: { from: offset, to: batchEnd - 1 },
    nextOffset,
    // 처리 결과
    processed: members.length,
    fixed,
    skipped,
    errors,
    errorSummary,
    errorSample: errorList.slice(0, MAX_ERROR_SAMPLE),
    chunkErrors,
    fixedList,
  })
}
