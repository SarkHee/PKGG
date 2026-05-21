import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth].js'
import prisma from '../../../utils/prisma.js'

const ADMIN_EMAIL    = 'sssyck123@gmail.com'
const PUBG_BASE      = 'https://api.pubg.com/shards'
const MAX_MS         = 230000
const BATCH_SIZE     = 100
const CALL_DELAY_MS  = 700   // API rate limit 방지용 딜레이
const RETRY_WAIT_MS  = 12000 // 429 발생 시 대기 시간

let _seasonCache = null
let _seasonCacheAt = 0
const SEASON_CACHE_MS = 30 * 60 * 1000

async function getCurrentSeasonId(shard = 'steam') {
  if (_seasonCache && Date.now() - _seasonCacheAt < SEASON_CACHE_MS) return _seasonCache
  const res = await fetch(`${PUBG_BASE}/${shard}/seasons`, {
    headers: { Authorization: `Bearer ${process.env.PUBG_API_KEY}`, Accept: 'application/vnd.api+json' },
  })
  if (!res.ok) throw new Error(`시즌 조회 실패 (${res.status})`)
  const json = await res.json()
  const current = (json.data || []).find((s) => s.attributes?.isCurrentSeason)
  if (!current) throw new Error('현재 시즌 없음')
  _seasonCache = current.id
  _seasonCacheAt = Date.now()
  return current.id
}

function calculateMMR({ avgDamage, avgKills, avgAssists, avgSurviveTime, winRate, top10Rate }) {
  const norm = (v, min, max) => Math.min(1, Math.max(0, (v - min) / (max - min)))
  const score =
    norm(avgDamage,      0,   600) * 0.30 +
    norm(avgKills,       0,     5) * 0.25 +
    norm(winRate,        0,    30) * 0.20 +
    norm(top10Rate,      0,    60) * 0.10 +
    norm(avgAssists,     0,     3) * 0.08 +
    norm(avgSurviveTime, 0,  1500) * 0.07
  return Math.round(score * 1500 + 1000)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const pw = req.headers['x-admin-token']
  const session = await getServerSession(req, res, authOptions)
  const isAdmin = (pw && pw === process.env.ADMIN_PASSWORD) || session?.user?.email === ADMIN_EMAIL
  if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' })

  const startTime = Date.now()

  // type: all(기본) | unset(미초기화만) | noSeason(시즌없음만)
  const type = req.query.type || 'all'
  const typeWhere = {
    all:      { avgDamage: { lte: 0 } },
    unset:    { avgDamage: 0 },
    noSeason: { avgDamage: -1 },
  }[type] ?? { avgDamage: { lte: 0 } }

  const seedUsers = await prisma.playerCache.findMany({
    where: { ...typeWhere, pubgPlayerId: { not: null }, isBanned: { not: true } },
    orderBy: { lastUpdated: 'asc' },
    take: BATCH_SIZE,
    select: { id: true, nickname: true, pubgPlayerId: true, pubgShardId: true },
  })

  let updated = 0, skipApi = 0, skipNoRounds = 0, skipErr = 0
  let sampleApiStatus = null, sampleException = null
  const shardSeasonMap = {}
  const delay = (ms) => new Promise((r) => setTimeout(r, ms))

  let shardFixed = 0
  for (const u of seedUsers) {
    if (Date.now() - startTime > MAX_MS) break
    let shard = u.pubgShardId || 'steam'
    try {
      if (!shardSeasonMap[shard]) shardSeasonMap[shard] = await getCurrentSeasonId(shard)
      let seasonId = shardSeasonMap[shard]

      let apiRes = await fetch(`${PUBG_BASE}/${shard}/players/${u.pubgPlayerId}/seasons/${seasonId}`, {
        headers: { Authorization: `Bearer ${process.env.PUBG_API_KEY}`, Accept: 'application/vnd.api+json' },
      })
      // 429 rate limit → 대기 후 1회 재시도
      if (apiRes.status === 429) {
        await delay(RETRY_WAIT_MS)
        apiRes = await fetch(`${PUBG_BASE}/${shard}/players/${u.pubgPlayerId}/seasons/${seasonId}`, {
          headers: { Authorization: `Bearer ${process.env.PUBG_API_KEY}`, Accept: 'application/vnd.api+json' },
        })
      }
      // 404인 경우 → shard 오류 가능성 → 반대 shard로 재시도
      if (apiRes.status === 404) {
        const altShard = shard === 'steam' ? 'kakao' : 'steam'
        if (!shardSeasonMap[altShard]) shardSeasonMap[altShard] = await getCurrentSeasonId(altShard)
        const altSeasonId = shardSeasonMap[altShard]
        await delay(CALL_DELAY_MS)
        const altRes = await fetch(`${PUBG_BASE}/${altShard}/players/${u.pubgPlayerId}/seasons/${altSeasonId}`, {
          headers: { Authorization: `Bearer ${process.env.PUBG_API_KEY}`, Accept: 'application/vnd.api+json' },
        })
        if (altRes.ok) {
          // shard 정정 — unique constraint 충돌 방지: 올바른 shard 레코드가 이미 있으면 잘못된 것 삭제
          const correctRecord = await prisma.playerCache.findFirst({
            where: { pubgPlayerId: u.pubgPlayerId, pubgShardId: altShard },
          })
          if (correctRecord) {
            // 올바른 레코드 이미 존재 → 잘못된 steam 레코드만 삭제
            await prisma.playerCache.deleteMany({
              where: { pubgPlayerId: u.pubgPlayerId, pubgShardId: u.pubgShardId },
            })
          } else {
            // 올바른 레코드 없음 → 기존 레코드의 shard만 수정
            await prisma.playerCache.updateMany({
              where: { pubgPlayerId: u.pubgPlayerId },
              data: { pubgShardId: altShard },
            })
          }
          shard = altShard
          seasonId = altSeasonId
          apiRes = altRes
          shardFixed++
        }
      }
      if (!apiRes.ok) {
        if (!sampleApiStatus) sampleApiStatus = apiRes.status
        skipApi++
        await delay(CALL_DELAY_MS)
        continue
      }
      const json = await apiRes.json()
      const gameModeStats = json?.data?.attributes?.gameModeStats ?? {}

      let totalRounds = 0, totalDamage = 0, totalKills = 0
      let totalAssists = 0, totalSurvive = 0, totalWins = 0, totalTop10 = 0
      for (const s of Object.values(gameModeStats)) {
        const r = s.roundsPlayed || 0
        if (r === 0) continue
        totalRounds += r
        totalDamage += s.damageDealt || 0
        totalKills  += s.kills || 0
        totalAssists += s.assists || 0
        totalSurvive += s.timeSurvived || 0
        totalWins   += s.wins || 0
        totalTop10  += s.top10s || 0
      }

      // 일반전 데이터 없으면 경쟁전 API fallback
      if (totalRounds === 0) {
        await delay(CALL_DELAY_MS)
        let rankedRes = await fetch(`${PUBG_BASE}/${shard}/players/${u.pubgPlayerId}/seasons/${seasonId}/ranked`, {
          headers: { Authorization: `Bearer ${process.env.PUBG_API_KEY}`, Accept: 'application/vnd.api+json' },
        })
        if (rankedRes.status === 429) {
          await delay(RETRY_WAIT_MS)
          rankedRes = await fetch(`${PUBG_BASE}/${shard}/players/${u.pubgPlayerId}/seasons/${seasonId}/ranked`, {
            headers: { Authorization: `Bearer ${process.env.PUBG_API_KEY}`, Accept: 'application/vnd.api+json' },
          })
        }
        if (rankedRes.ok) {
          const rankedJson = await rankedRes.json()
          const rms = rankedJson?.data?.attributes?.rankedGameModeStats ?? {}
          for (const rm of Object.values(rms)) {
            const r = rm.roundsPlayed || 0
            if (r === 0) continue
            totalRounds  += r
            totalDamage  += rm.damageDealt   || 0
            totalKills   += rm.kills         || 0
            totalAssists += rm.assists       || 0
            totalSurvive += rm.timeSurvived  || 0
            totalWins    += rm.wins          || 0
            totalTop10   += rm.top10s        || 0
          }
        }
      }

      // 현재 shard에서 데이터 없음 → 반대 shard 시도 (cross-play 플랫폼 오감지 보정)
      if (totalRounds === 0) {
        const altShard2 = shard === 'steam' ? 'kakao' : 'steam'
        if (!shardSeasonMap[altShard2]) shardSeasonMap[altShard2] = await getCurrentSeasonId(altShard2)
        const altSeasonId2 = shardSeasonMap[altShard2]
        await delay(CALL_DELAY_MS)
        let altNormalRes = await fetch(`${PUBG_BASE}/${altShard2}/players/${u.pubgPlayerId}/seasons/${altSeasonId2}`, {
          headers: { Authorization: `Bearer ${process.env.PUBG_API_KEY}`, Accept: 'application/vnd.api+json' },
        })
        if (altNormalRes.status === 429) {
          await delay(RETRY_WAIT_MS)
          altNormalRes = await fetch(`${PUBG_BASE}/${altShard2}/players/${u.pubgPlayerId}/seasons/${altSeasonId2}`, {
            headers: { Authorization: `Bearer ${process.env.PUBG_API_KEY}`, Accept: 'application/vnd.api+json' },
          })
        }
        if (altNormalRes.ok) {
          const altNormalJson = await altNormalRes.json()
          const altGms = altNormalJson?.data?.attributes?.gameModeStats ?? {}
          for (const s2 of Object.values(altGms)) {
            const r = s2.roundsPlayed || 0
            if (r === 0) continue
            totalRounds  += r
            totalDamage  += s2.damageDealt  || 0
            totalKills   += s2.kills        || 0
            totalAssists += s2.assists      || 0
            totalSurvive += s2.timeSurvived || 0
            totalWins    += s2.wins         || 0
            totalTop10   += s2.top10s       || 0
          }
          // 일반전도 없으면 경쟁전까지
          if (totalRounds === 0) {
            await delay(CALL_DELAY_MS)
            let altRankedRes = await fetch(`${PUBG_BASE}/${altShard2}/players/${u.pubgPlayerId}/seasons/${altSeasonId2}/ranked`, {
              headers: { Authorization: `Bearer ${process.env.PUBG_API_KEY}`, Accept: 'application/vnd.api+json' },
            })
            if (altRankedRes.status === 429) {
              await delay(RETRY_WAIT_MS)
              altRankedRes = await fetch(`${PUBG_BASE}/${altShard2}/players/${u.pubgPlayerId}/seasons/${altSeasonId2}/ranked`, {
                headers: { Authorization: `Bearer ${process.env.PUBG_API_KEY}`, Accept: 'application/vnd.api+json' },
              })
            }
            if (altRankedRes.ok) {
              const altRankedJson = await altRankedRes.json()
              const altRms = altRankedJson?.data?.attributes?.rankedGameModeStats ?? {}
              for (const rm of Object.values(altRms)) {
                const r = rm.roundsPlayed || 0
                if (r === 0) continue
                totalRounds  += r
                totalDamage  += rm.damageDealt   || 0
                totalKills   += rm.kills         || 0
                totalAssists += rm.assists       || 0
                totalSurvive += rm.timeSurvived  || 0
                totalWins    += rm.wins          || 0
                totalTop10   += rm.top10s        || 0
              }
            }
          }
          if (totalRounds > 0) {
            // 반대 shard에 데이터 있음 → shard 수정
            const correctRecord = await prisma.playerCache.findFirst({
              where: { pubgPlayerId: u.pubgPlayerId, pubgShardId: altShard2 },
            })
            if (correctRecord) {
              await prisma.playerCache.deleteMany({
                where: { pubgPlayerId: u.pubgPlayerId, pubgShardId: shard },
              })
            } else {
              await prisma.playerCache.updateMany({
                where: { pubgPlayerId: u.pubgPlayerId },
                data: { pubgShardId: altShard2 },
              })
            }
            shard = altShard2
            shardFixed++
          }
        }
      }

      // 현재 시즌 데이터 없음 → 라이프타임으로 실제 플랫폼 감지 (shard 오감지 최종 보정)
      if (totalRounds === 0) {
        const SHARDS_TO_CHECK = shard === 'steam' ? ['kakao', 'steam'] : ['steam', 'kakao']
        let correctShard = null
        for (const ls of SHARDS_TO_CHECK) {
          try {
            const lRes = await fetch(`${PUBG_BASE}/${ls}/players/${u.pubgPlayerId}/seasons/lifetime`, {
              headers: { Authorization: `Bearer ${process.env.PUBG_API_KEY}`, Accept: 'application/vnd.api+json' },
            })
            if (!lRes.ok) continue
            const lJson = await lRes.json()
            const lRounds = Object.values(lJson?.data?.attributes?.gameModeStats ?? {})
              .reduce((sum, s) => sum + (s.roundsPlayed || 0), 0)
            if (lRounds > 0) { correctShard = ls; break }
          } catch { /* 무시 */ }
          await delay(CALL_DELAY_MS)
        }
        if (correctShard && correctShard !== shard) {
          // 라이프타임으로 확인된 shard로 수정
          const correctRecord = await prisma.playerCache.findFirst({
            where: { pubgPlayerId: u.pubgPlayerId, pubgShardId: correctShard },
          })
          if (correctRecord) {
            await prisma.playerCache.deleteMany({ where: { pubgPlayerId: u.pubgPlayerId, pubgShardId: shard } })
          } else {
            await prisma.playerCache.updateMany({ where: { pubgPlayerId: u.pubgPlayerId }, data: { pubgShardId: correctShard } })
          }
          shard = correctShard
          shardFixed++
        }
        // shard 수정 후에도 시즌 데이터 없음 → 시즌없음 마킹
        await prisma.playerCache.updateMany({
          where: { pubgPlayerId: u.pubgPlayerId },
          data: { avgDamage: -1, lastUpdated: new Date() },
        })
        skipNoRounds++; continue
      }

      const avgDamage      = parseFloat((totalDamage  / totalRounds).toFixed(1))
      const avgKills       = parseFloat((totalKills   / totalRounds).toFixed(2))
      const avgAssists     = parseFloat((totalAssists / totalRounds).toFixed(2))
      const avgSurviveTime = parseFloat((totalSurvive / totalRounds).toFixed(1))
      const winRate        = parseFloat(((totalWins  / totalRounds) * 100).toFixed(1))
      const top10Rate      = parseFloat(((totalTop10 / totalRounds) * 100).toFixed(1))
      const score          = calculateMMR({ avgDamage, avgKills, avgAssists, avgSurviveTime, winRate, top10Rate })

      await prisma.playerCache.updateMany({
        where: { pubgPlayerId: u.pubgPlayerId },
        data: { avgDamage, avgKills, avgAssists, avgSurviveTime, winRate, top10Rate, score, roundsPlayed: totalRounds, lastUpdated: new Date() },
      })
      updated++
    } catch (e) {
      if (!sampleException) sampleException = e?.message
      skipErr++
    }
    await delay(CALL_DELAY_MS)
  }

  return res.status(200).json({
    success: true,
    total: seedUsers.length,
    updated,
    skipped: skipApi + skipNoRounds + skipErr,
    skipApi,
    skipNoRounds,
    skipErr,
    shardFixed,
    sampleApiStatus,
    sampleException,
    elapsedSec: Math.round((Date.now() - startTime) / 1000),
  })
}
