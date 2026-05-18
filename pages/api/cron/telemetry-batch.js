// pages/api/cron/telemetry-batch.js
// 매일 02:00 KST (17:00 UTC) — 최근 7일 활성 PlayerCache 유저의 미분석 경기 텔레메트리 배치

import prisma from '../../../utils/prisma.js'
import { cachedPubgFetch, TTL } from '../../../utils/pubgApiCache.js'

const PUBG_BASE        = 'https://api.pubg.com/shards'
const MAX_MS           = 250_000  // 250초 안전 마진 (Vercel Pro 300s 기준)
const MAX_MATCHES      = 50       // 실행당 최대 처리 경기 수
const MATCHES_PER_USER = 5        // 유저당 최대 경기 수
const ACTIVE_DAYS      = 7        // 최근 N일 내 검색된 유저만 대상

export default async function handler(req, res) {
  const authHeader   = req.headers.authorization
  const adminToken   = req.headers['x-admin-token']
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`
  const isAdminCall  = adminToken && adminToken === process.env.ADMIN_PASSWORD

  if (!isVercelCron && !isAdminCall) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).end()
  }

  // 동적 import — webpack ESM async module 이슈 우회
  const { analyzeMatchData } = await import('../../../utils/botKills.js')

  const startTime       = Date.now()
  const activeThreshold = new Date(Date.now() - ACTIVE_DAYS * 24 * 60 * 60 * 1000)

  const log = {
    total: 0, analyzed: 0, skipped: 0, errors: 0,
    timedOut: false, usersProcessed: 0,
  }

  console.log('⏰ [telemetry-batch] 시작:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))

  try {
    // ── 1. 최근 7일 활성 PlayerCache 유저 조회 ──────────────────────────────
    const rawUsers = await prisma.playerCache.findMany({
      where: {
        pubgPlayerId: { not: null },
        lastUpdated:  { gte: activeThreshold },
      },
      orderBy: { lastUpdated: 'desc' },
      select: { pubgPlayerId: true, pubgShardId: true, nickname: true },
    })

    if (rawUsers.length === 0) {
      console.log('[telemetry-batch] 활성 유저 없음')
      return res.status(200).json({ success: true, ...log, message: '활성 유저 없음' })
    }

    // pubgPlayerId 중복 제거
    const seen  = new Set()
    const users = []
    for (const u of rawUsers) {
      if (!seen.has(u.pubgPlayerId)) {
        seen.add(u.pubgPlayerId)
        users.push(u)
      }
    }

    log.total = users.length
    console.log(`[telemetry-batch] 대상 유저 ${users.length}명`)

    let totalProcessed = 0

    // ── 2. 유저별 처리 (순차) ────────────────────────────────────────────────
    for (const user of users) {
      if (Date.now() - startTime > MAX_MS) {
        log.timedOut = true
        console.warn(`⚠️ [telemetry-batch] 타임아웃, ${log.usersProcessed}/${users.length}명 완료`)
        break
      }
      if (totalProcessed >= MAX_MATCHES) {
        console.log(`[telemetry-batch] 최대 ${MAX_MATCHES}경기 도달, 중단`)
        break
      }

      const { pubgPlayerId: accountId, pubgShardId: shard, nickname } = user

      try {
        // 2-1. PUBG API 최근 매치 목록 조회
        const playerJson = await cachedPubgFetch(
          `${PUBG_BASE}/${shard}/players/${accountId}`,
          { ttl: TTL.PLAYER }
        )
        const matchIds = (playerJson?.data?.relationships?.matches?.data ?? [])
          .map((m) => m.id)
          .slice(0, MATCHES_PER_USER * 3)

        if (matchIds.length === 0) continue

        // 2-2. 이미 분석 완료된 매치 제외
        const doneRows = await prisma.playerMatch.findMany({
          where: { pubgAccountId: accountId, matchId: { in: matchIds }, isBotCorrected: true },
          select: { matchId: true },
        })
        const doneIds = new Set(doneRows.map((r) => r.matchId))
        const pending = matchIds.filter((id) => !doneIds.has(id)).slice(0, MATCHES_PER_USER)

        if (pending.length === 0) { log.skipped++; continue }

        // 2-3. 매치별 봇 분석 (순차)
        for (const matchId of pending) {
          if (Date.now() - startTime > MAX_MS || totalProcessed >= MAX_MATCHES) break

          try {
            // 매치 메타 fetch (캐시 활용) → 텔레메트리 분석
            const matchData = await cachedPubgFetch(
              `${PUBG_BASE}/${shard}/matches/${matchId}`,
              { ttl: TTL.MATCH }
            )
            if (!matchData?.data) { log.errors++; continue }

            const result = await analyzeMatchData(matchData, matchId)
            if (!result.isBotCorrected) { log.errors++; continue }

            const row = result.rows.find((r) => r.accountId === accountId)
            if (!row) { log.errors++; continue }

            // 2-4. 매치 메타에서 플레이어 스탯 추출
            const attrs        = matchData.data.attributes
            const participants = (matchData.included ?? []).filter((i) => i.type === 'participant')
            const me           = participants.find((p) => p.attributes?.stats?.playerId === accountId)
            const s            = me?.attributes?.stats ?? {}
            const now          = new Date()

            // 2-5. PlayerMatch upsert
            await prisma.playerMatch.upsert({
              where:  { pubgAccountId_matchId: { pubgAccountId: accountId, matchId } },
              create: {
                pubgAccountId:  accountId,
                nickname,
                shard,
                matchId,
                mode:           attrs?.gameMode          || 'squad-fpp',
                mapName:        attrs?.mapName            || null,
                placement:      s.winPlace                || 0,
                kills:          s.kills                   || 0,
                assists:        s.assists                 || 0,
                damage:         Math.round(s.damageDealt  || 0),
                surviveTime:    s.timeSurvived             || 0,
                createdAt:      new Date(attrs?.createdAt  || Date.now()),
                botKills:       row.bot,
                realKills:      row.real,
                botDamage:      row.botDamage,
                realDamage:     row.realDamage,
                botAssist:      row.botAssist,
                isBotCorrected: true,
                botAnalyzedAt:  now,
              },
              update: {
                botKills:       row.bot,
                realKills:      row.real,
                botDamage:      row.botDamage,
                realDamage:     row.realDamage,
                botAssist:      row.botAssist,
                isBotCorrected: true,
                botAnalyzedAt:  now,
              },
            })

            // 2-6. 무기별 통계 저장
            const weaponStats = row.weaponStats ?? {}
            const weaponRows  = Object.entries(weaponStats)
              .filter(([, ws]) => ws.kills > 0 || ws.damage > 0 || ws.pickups > 0)
              .map(([weaponId, ws]) => ({
                playerId:     accountId,
                shard,
                weaponId,
                weaponName:   weaponId,
                kills:        ws.kills,
                damage:       ws.damage,
                headshots:    0,
                bot_kills:    ws.botKills,
                real_kills:   ws.realKills,
                assists:      0,
                shots_fired:  0,
                shots_hit:    0,
                match_id:     matchId,
                pickup_count: ws.pickups,
              }))

            if (weaponRows.length > 0) {
              await prisma.player_weapon_stats.createMany({
                data: weaponRows,
                skipDuplicates: true,
              }).catch((e) => console.warn(`[telemetry-batch] 무기통계 저장 실패 ${matchId}:`, e.message))
            }

            log.analyzed++
            totalProcessed++
            console.log(`[telemetry-batch] ✅ ${nickname} #${matchId.slice(-8)} 완료 (봇${row.bot}/${row.total})`)

          } catch (err) {
            console.warn(`[telemetry-batch] ${nickname} ${matchId} 오류:`, err?.message)
            log.errors++
          }
        }

        log.usersProcessed++

      } catch (err) {
        console.error(`[telemetry-batch] ${nickname} 처리 오류:`, err.message)
        log.errors++
      }
    }

    // ── 3. 실행 로그 저장 ────────────────────────────────────────────────────
    const elapsed = Math.round((Date.now() - startTime) / 1000)
    console.log(`[telemetry-batch] 완료 — 분석 ${log.analyzed}경기, ${elapsed}초`)

    try {
      await prisma.rankingUpdateLog.create({
        data: {
          updateType:   'telemetry_batch',
          updateTime:   new Date(),
          status:       log.timedOut ? 'partial' : 'success',
          updatedCount: log.analyzed,
          details:      JSON.stringify({ ...log, elapsedSec: elapsed }),
        },
      })
    } catch { /* 로그 실패는 무시 */ }

    return res.status(200).json({ success: true, ...log, elapsedSec: elapsed })

  } catch (err) {
    console.error('[telemetry-batch] 치명적 오류:', err.message)
    return res.status(500).json({ error: err.message, ...log })
  }
}
