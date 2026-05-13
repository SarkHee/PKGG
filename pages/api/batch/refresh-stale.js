// pages/api/batch/refresh-stale.js
// Vercel Cron 전용 — 14일 이상 미갱신 ClanMember의 최근 매치를 봇 분석 후 PlayerMatch에 저장
// 스케줄: 매일 02:00 KST (17:00 UTC)

import { cachedPubgFetch, TTL } from '../../../utils/pubgApiCache.js'
import { analyzeMatchData } from '../../../utils/botKills.js'
import prisma from '../../../utils/prisma.js'

const PUBG_BASE   = 'https://api.pubg.com/shards'
const BATCH_SIZE  = 5   // 한 번에 처리할 최대 유저 수
const MATCH_LIMIT = 10  // 유저당 분석할 최근 매치 수 (타임아웃 고려)
const STALE_DAYS  = 14

export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  const adminToken = req.headers['x-admin-token']
  const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`
  const isAdminCall  = adminToken && adminToken === process.env.ADMIN_PASSWORD

  if (!isVercelCron && !isAdminCall) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const startTime      = Date.now()
  const staleThreshold = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000)

  console.log(`⏰ [refresh-stale] 시작: 기준일 ${staleThreshold.toISOString()} 이전 미갱신 유저 대상`)

  try {
    // ── 1. 갱신 대상 조회 ────────────────────────────────────────────────
    const staleMembers = await prisma.clanMember.findMany({
      where: {
        clanId:      { not: null },
        lastUpdated: { lt: staleThreshold },
      },
      orderBy: { lastUpdated: 'asc' },
      take:    BATCH_SIZE,
      select: {
        id:          true,
        nickname:    true,
        pubgShardId: true,
        clan: { select: { shard: true } },
      },
    })

    if (staleMembers.length === 0) {
      console.log('[refresh-stale] 갱신 대상 없음')
      return res.status(200).json({ success: true, updatedCount: 0, message: '갱신 대상 없음' })
    }

    console.log(`[refresh-stale] 대상 ${staleMembers.length}명: ${staleMembers.map((m) => m.nickname).join(', ')}`)

    let totalMatchesUpserted = 0
    let memberSuccessCount   = 0

    // ── 2. 유저별 매치 분석 (순차 — 텔레메트리 대용량 고려) ──────────────
    for (const member of staleMembers) {
      const nickname = member.nickname
      const shard    = member.clan?.shard || member.pubgShardId || 'steam'

      try {
        // 2-1. PUBG API에서 플레이어 + 최근 매치 목록 조회
        const playerUrl  = `${PUBG_BASE}/${shard}/players?filter[playerNames]=${encodeURIComponent(nickname)}`
        const playerJson = await cachedPubgFetch(playerUrl, { ttl: TTL.PLAYER })

        const pubgPlayer = playerJson.data?.[0]
        if (!pubgPlayer) {
          console.warn(`[refresh-stale] ${nickname} — PUBG API에서 플레이어 없음`)
          await prisma.clanMember.update({ where: { id: member.id }, data: { lastUpdated: new Date() } })
          continue
        }

        const accountId = pubgPlayer.id  // account.xxx 형식
        const matchIds  = (pubgPlayer.relationships?.matches?.data || [])
          .map((m) => m.id)
          .slice(0, MATCH_LIMIT)

        if (matchIds.length === 0) {
          await prisma.clanMember.update({ where: { id: member.id }, data: { lastUpdated: new Date() } })
          continue
        }

        // 2-2. 이미 PlayerMatch에 있는 matchId는 건너뜀 (중복 분석 방지)
        const existingRows = await prisma.playerMatch.findMany({
          where: { pubgAccountId: accountId, matchId: { in: matchIds }, isBotCorrected: true },
          select: { matchId: true },
        })
        const existingIds  = new Set(existingRows.map((r) => r.matchId))
        const newMatchIds  = matchIds.filter((id) => !existingIds.has(id))

        if (newMatchIds.length === 0) {
          console.log(`[refresh-stale] ${nickname} — 신규 매치 없음 (전체 이미 분석됨)`)
          await prisma.clanMember.update({ where: { id: member.id }, data: { lastUpdated: new Date() } })
          memberSuccessCount++
          continue
        }

        // 2-3. 매치 상세 병렬 조회
        const matchResults = await Promise.allSettled(
          newMatchIds.map((matchId) =>
            cachedPubgFetch(`${PUBG_BASE}/${shard}/matches/${matchId}`, { ttl: TTL.MATCH, force: false })
          )
        )

        // 2-4. 파티시펀트 데이터 추출
        const rawMatches = matchResults
          .filter((r) => r.status === 'fulfilled')
          .map((r) => {
            const data       = r.value
            const matchId    = data.data.id
            const attrs      = data.data.attributes
            const included   = data.included || []
            const participants = included.filter((i) => i.type === 'participant')

            const me = participants.find(
              (p) => p.attributes.stats.name?.toLowerCase() === nickname.toLowerCase()
            )
            if (!me) return null

            const s = me.attributes.stats
            return {
              _matchData:  data,
              _accountId:  accountId,
              matchId,
              mode:        attrs.gameMode,
              mapName:     attrs.mapName || null,
              placement:   s.winPlace    || 0,
              kills:       s.kills       || 0,
              assists:     s.assists     || 0,
              damage:      Math.round(s.damageDealt || 0),
              surviveTime: s.timeSurvived || 0,
              createdAt:   new Date(attrs.createdAt || Date.now()),
            }
          })
          .filter(Boolean)

        // 2-5. 봇 분석 (텔레메트리, 순차)
        const botUpserts = []

        for (const m of rawMatches) {
          try {
            const result = await analyzeMatchData(m._matchData, m.matchId)
            const row    = result.rows.find((r) => r.accountId === m._accountId)

            if (result.isBotCorrected) {
              botUpserts.push({
                accountId:   m._accountId,
                matchId:     m.matchId,
                mode:        m.mode,
                mapName:     m.mapName,
                placement:   m.placement,
                kills:       m.kills,
                assists:     m.assists,
                damage:      m.damage,
                surviveTime: m.surviveTime,
                createdAt:   m.createdAt,
                botKills:    row?.bot        ?? 0,
                realKills:   row?.real       ?? m.kills,
                botDamage:   row?.botDamage  ?? 0,
                realDamage:  row?.realDamage ?? m.damage,
                botAssist:   row?.botAssist  ?? 0,
              })
            }
          } catch (err) {
            console.warn(`[refresh-stale] ${nickname} 봇 분석 실패: ${m.matchId}`, err?.message)
          }
        }

        // 2-6. PlayerMatch upsert
        if (botUpserts.length > 0) {
          const now = new Date()
          const results = await Promise.allSettled(
            botUpserts.map(({ accountId, matchId, ...fields }) =>
              prisma.playerMatch.upsert({
                where:  { pubgAccountId_matchId: { pubgAccountId: accountId, matchId } },
                create: {
                  pubgAccountId:  accountId,
                  nickname,
                  shard,
                  matchId,
                  ...fields,
                  isBotCorrected: true,
                  botAnalyzedAt:  now,
                },
                update: {
                  botKills:       fields.botKills,
                  realKills:      fields.realKills,
                  botDamage:      fields.botDamage,
                  realDamage:     fields.realDamage,
                  botAssist:      fields.botAssist,
                  isBotCorrected: true,
                  botAnalyzedAt:  now,
                },
              })
            )
          )
          const failed = results.filter((r) => r.status === 'rejected').length
          if (failed > 0) console.warn(`[refresh-stale] ${nickname} DB upsert 실패 ${failed}/${botUpserts.length}건`)
          totalMatchesUpserted += botUpserts.length - failed
        }

        // 2-7. ClanMember 갱신 시각 업데이트
        await prisma.clanMember.update({ where: { id: member.id }, data: { lastUpdated: new Date() } })

        memberSuccessCount++
        console.log(`[refresh-stale] ✅ ${nickname} — ${botUpserts.length}/${newMatchIds.length}매치 분석 완료`)

      } catch (err) {
        console.error(`[refresh-stale] ${nickname} 처리 오류:`, err.message)
        // 오류가 나도 lastUpdated bump하여 무한 재시도 방지
        await prisma.clanMember.update({ where: { id: member.id }, data: { lastUpdated: new Date() } }).catch(() => {})
      }
    }

    // ── 3. 실행 로그 ─────────────────────────────────────────────────────
    try {
      await prisma.rankingUpdateLog.create({
        data: {
          updateType:   'cron_refresh_stale',
          updatedCount: memberSuccessCount,
          updateTime:   new Date(),
          status:       'success',
          details: JSON.stringify({
            durationMs:           Date.now() - startTime,
            membersProcessed:     staleMembers.length,
            membersSuccess:       memberSuccessCount,
            totalMatchesUpserted,
          }),
        },
      })
    } catch (logErr) {
      console.warn('[refresh-stale] 로그 저장 실패:', logErr.message)
    }

    console.log(`✅ [refresh-stale] 완료: ${memberSuccessCount}명 / ${totalMatchesUpserted}매치 (${Date.now() - startTime}ms)`)

    return res.status(200).json({
      success:              true,
      membersProcessed:     staleMembers.length,
      membersSuccess:       memberSuccessCount,
      totalMatchesUpserted,
      durationMs:           Date.now() - startTime,
    })

  } catch (err) {
    console.error('❌ [refresh-stale] 치명적 오류:', err.message)

    try {
      await prisma.rankingUpdateLog.create({
        data: {
          updateType: 'cron_refresh_stale', updatedCount: 0,
          updateTime: new Date(), status: 'error',
          errorMessage: err.message,
          details: JSON.stringify({ error: err.stack }),
        },
      })
    } catch {}

    return res.status(500).json({ success: false, error: err.message })
  }
}
