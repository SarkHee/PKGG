// pages/api/cron/telemetry-batch.js
// 매일 02:00 KST (17:00 UTC) — avgDamage > 0 전체 PlayerCache 유저의 미분석 경기 텔레메트리 배치

import prisma from '../../../utils/prisma.js'
import { cachedPubgFetch, TTL } from '../../../utils/pubgApiCache.js'

const PUBG_BASE        = 'https://api.pubg.com/shards'
const MAX_MS           = 250_000  // 250초 안전 마진 (Vercel Pro 300s 기준)
const MAX_MATCHES      = 50       // 실행당 최대 처리 경기 수
const MATCHES_PER_USER = 5        // 유저당 최대 경기 수
const STALE_DAYS = 5 // 마지막 갱신 후 5일 이상 지난 유저만 대상

// ── 매치 roster에서 같은 팀원 accountId 추출 ─────────────────────────────
function extractTeammates(matchData, myAccountId) {
  const included = matchData?.included ?? []
  const partToAccount = new Map()
  for (const item of included) {
    if (item.type !== 'participant') continue
    const pid = item.attributes?.stats?.playerId ?? ''
    if (pid.startsWith('account.')) partToAccount.set(item.id, pid)
  }
  for (const item of included) {
    if (item.type !== 'roster') continue
    const members = (item.relationships?.participants?.data ?? [])
      .map(p => partToAccount.get(p.id)).filter(Boolean)
    if (members.includes(myAccountId)) {
      return members.filter(id => id !== myAccountId)
    }
  }
  return []
}

// ── 같은 클랜 팀원 ClanMember 자동 등록 ──────────────────────────────────
async function autoRegisterClanTeammates(shard, myAccountId, teammateIds) {
  if (teammateIds.length === 0) return 0

  // 현재 유저의 DB 클랜 조회 (pubgClanId 있는 경우만 처리)
  const myMember = await prisma.clanMember.findFirst({
    where: { pubgPlayerId: myAccountId },
    select: { clan: { select: { id: true, name: true, pubgClanId: true } } },
  })
  const myDbClan = myMember?.clan
  if (!myDbClan?.pubgClanId) return 0

  // 이미 등록된 팀원 일괄 확인
  const existing = await prisma.clanMember.findMany({
    where: { pubgPlayerId: { in: teammateIds }, clanId: myDbClan.id },
    select: { pubgPlayerId: true },
  })
  const registeredSet = new Set(existing.map(m => m.pubgPlayerId))
  const toCheck = teammateIds.filter(id => !registeredSet.has(id))
  if (toCheck.length === 0) return 0

  let count = 0
  for (const tmId of toCheck) {
    try {
      const playerJson = await cachedPubgFetch(
        `${PUBG_BASE}/${shard}/players/${tmId}`,
        { ttl: TTL.PLAYER }
      )
      const attrs = playerJson?.data?.attributes ?? {}
      if (!attrs.clanId || attrs.clanId !== myDbClan.pubgClanId) continue

      const tmName = attrs.name
      if (!tmName) continue

      // nickname 기준 중복 확인 (이미 등록됐으면 pubgPlayerId만 백필)
      const byNick = await prisma.clanMember.findFirst({
        where: { nickname: { equals: tmName, mode: 'insensitive' }, clanId: myDbClan.id },
        select: { id: true, pubgPlayerId: true },
      })
      if (byNick) {
        if (!byNick.pubgPlayerId) {
          await prisma.clanMember.update({ where: { id: byNick.id }, data: { pubgPlayerId: tmId } })
        }
        continue
      }

      await prisma.clanMember.create({
        data: {
          nickname:       tmName,
          clanId:         myDbClan.id,
          pubgPlayerId:   tmId,
          pubgShardId:    shard,
          pubgClanId:     myDbClan.pubgClanId,
          score:          0,
          style:          '-',
          avgDamage:      0,
          avgKills:       0,
          avgAssists:     0,
          avgSurviveTime: 0,
          winRate:        0,
          top10Rate:      0,
        },
      })
      count++
      console.log(`[telemetry-batch] 🏅 클랜 팀원 자동 등록: ${tmName} → ${myDbClan.name}`)
    } catch (err) {
      console.warn(`[telemetry-batch] 팀원 등록 실패 ${tmId}:`, err.message)
    }
  }
  return count
}

// ── ban 카운트 증가 / 임계치 도달 시 isBanned 처리 ────────────────────────
async function incrementBanCount(nickname, shard, accountId, currentCount, log) {
  const newCount = (currentCount ?? 0) + 1
  const updateData = { banCheckFailCount: newCount }
  if (newCount >= 3) {
    updateData.isBanned = true
    updateData.bannedAt = new Date()
    log.bannedDetected++
    console.warn(`[telemetry-batch] 🚫 정지 계정 감지: ${nickname} (실패 ${newCount}회)`)
  } else {
    console.warn(`[telemetry-batch] ⚠️ API 실패 ${nickname} (${newCount}/3회)`)
  }
  try {
    if (accountId) {
      await prisma.playerCache.updateMany({
        where: { pubgPlayerId: accountId },
        data: updateData,
      })
    } else {
      await prisma.playerCache.updateMany({
        where: { nickname: { equals: nickname, mode: 'insensitive' }, pubgShardId: shard },
        data: updateData,
      })
    }
  } catch (e) {
    console.warn(`[telemetry-batch] ban 카운트 저장 실패 ${nickname}:`, e.message)
  }
}

// ── 팀원 정보 추출 후 PlayerCache 자동 수집 ──────────────────────────────
async function autoSaveTeammatesToPlayerCache(shard, myAccountId, matchData) {
  const included = matchData?.included ?? []

  // participant id → { accountId, nickname } 맵 빌드
  const partMap = new Map()
  for (const item of included) {
    if (item.type !== 'participant') continue
    const pid  = item.attributes?.stats?.playerId ?? ''
    const name = item.attributes?.stats?.name ?? ''
    if (pid.startsWith('account.')) partMap.set(item.id, { accountId: pid, nickname: name })
  }

  // 같은 팀 roster 탐색
  let teammateInfos = []
  for (const item of included) {
    if (item.type !== 'roster') continue
    const memberData = (item.relationships?.participants?.data ?? [])
      .map(p => partMap.get(p.id)).filter(Boolean)
    const accountIds = memberData.map(m => m.accountId)
    if (accountIds.includes(myAccountId)) {
      teammateInfos = memberData.filter(m => m.accountId !== myAccountId)
      break
    }
  }

  if (teammateInfos.length === 0) return 0

  // 이미 PlayerCache에 있는 accountId 목록 조회 (isBanned 포함)
  const tmAccountIds = teammateInfos.map(t => t.accountId)
  const existing = await prisma.playerCache.findMany({
    where: { pubgPlayerId: { in: tmAccountIds } },
    select: { pubgPlayerId: true, isBanned: true },
  })
  const existingSet = new Set(existing.map(e => e.pubgPlayerId))
  const bannedSet   = new Set(existing.filter(e => e.isBanned).map(e => e.pubgPlayerId))

  let count = 0
  for (const tm of teammateInfos) {
    if (!tm.accountId || !tm.nickname) continue
    if (existingSet.has(tm.accountId)) continue // 이미 있음
    if (bannedSet.has(tm.accountId))   continue // 정지됨

    try {
      await prisma.playerCache.upsert({
        where: { nickname_pubgShardId: { nickname: tm.nickname, pubgShardId: shard } },
        create: {
          nickname:       tm.nickname,
          pubgPlayerId:   tm.accountId,
          pubgShardId:    shard,
          score:          0,
          style:          '',
          avgDamage:      0,
          avgKills:       0,
          avgAssists:     0,
          avgSurviveTime: 0,
          winRate:        0,
          top10Rate:      0,
        },
        update: {
          pubgPlayerId: tm.accountId,
        },
      })
      count++
    } catch (e) {
      // 중복키 등 무시
    }
  }

  if (count > 0) {
    console.log(`[telemetry-batch] 👥 팀원 PlayerCache 저장: ${count}명`)
  }
  return count
}

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

  const startTime = Date.now()

  const log = {
    total: 0, analyzed: 0, skipped: 0, errors: 0,
    timedOut: false, usersProcessed: 0, clanAutoRegistered: 0,
    bannedDetected: 0, teammateSaved: 0,
  }

  console.log('⏰ [telemetry-batch] 시작:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }))

  try {
    // ── 1. PlayerCache 유저 조회 (avgDamage > 0, 마지막 갱신 5일 이상 경과, 정지 제외) ──
    const staleThreshold = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000)
    const rawUsers = await prisma.playerCache.findMany({
      where: {
        avgDamage: { gt: 0 },
        lastUpdated: { lt: staleThreshold },
        isBanned: { not: true },
      },
      orderBy: { lastUpdated: 'asc' }, // 가장 오래된 유저부터 처리
      select: { pubgPlayerId: true, pubgShardId: true, nickname: true, lastUpdated: true, banCheckFailCount: true },
    })

    if (rawUsers.length === 0) {
      console.log(`[telemetry-batch] 갱신 대상 없음 (${STALE_DAYS}일 이상 경과 유저 없음)`)
      return res.status(200).json({ success: true, ...log, message: `${STALE_DAYS}일 이상 경과 유저 없음` })
    }

    // 중복 제거: pubgPlayerId 있으면 그 기준, 없으면 nickname+shard 기준
    const seenById   = new Set()
    const seenByNick = new Set()
    const users = []
    for (const u of rawUsers) {
      if (u.pubgPlayerId) {
        if (seenById.has(u.pubgPlayerId)) continue
        seenById.add(u.pubgPlayerId)
      } else {
        const key = `${u.nickname.toLowerCase()}:${u.pubgShardId}`
        if (seenByNick.has(key)) continue
        seenByNick.add(key)
      }
      users.push(u)
    }

    log.total = users.length
    console.log(`[telemetry-batch] 대상 유저 ${users.length}명 (${STALE_DAYS}일 이상 미갱신, 기준: ${staleThreshold.toLocaleDateString('ko-KR')})`)

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

      const { pubgShardId: shard, nickname } = user
      let accountId = user.pubgPlayerId

      try {
        // 2-1. pubgPlayerId 없으면 닉네임으로 조회 후 PlayerCache 백필
        if (!accountId) {
          let lookupJson = null
          try {
            lookupJson = await cachedPubgFetch(
              `${PUBG_BASE}/${shard}/players?filter[playerNames]=${encodeURIComponent(nickname)}`,
              { ttl: TTL.PLAYER }
            )
          } catch (fetchErr) {
            await incrementBanCount(nickname, shard, null, user.banCheckFailCount, log)
            log.skipped++; continue
          }
          const p = lookupJson?.data?.[0]
          if (!p) { log.skipped++; continue }
          accountId = p.id
          prisma.playerCache.updateMany({
            where: { nickname: { equals: nickname, mode: 'insensitive' }, pubgShardId: shard },
            data:  { pubgPlayerId: accountId },
          }).catch(() => {})
        }

        // 2-2. PUBG API 최근 매치 목록 조회 (404 → 정지 계정 의심)
        let playerJson = null
        try {
          playerJson = await cachedPubgFetch(
            `${PUBG_BASE}/${shard}/players/${accountId}`,
            { ttl: TTL.PLAYER }
          )
        } catch (fetchErr) {
          await incrementBanCount(nickname, shard, accountId, user.banCheckFailCount, log)
          log.skipped++; continue
        }

        if (!playerJson?.data) {
          await incrementBanCount(nickname, shard, accountId, user.banCheckFailCount, log)
          log.skipped++; continue
        }

        const matchIds = (playerJson.data?.relationships?.matches?.data ?? [])
          .map((m) => m.id)
          .slice(0, MATCHES_PER_USER * 3)

        if (matchIds.length === 0) continue

        // 2-3. 이미 분석 완료된 매치 제외
        const doneRows = await prisma.playerMatch.findMany({
          where: { pubgAccountId: accountId, matchId: { in: matchIds }, isBotCorrected: true },
          select: { matchId: true },
        })
        const doneIds = new Set(doneRows.map((r) => r.matchId))
        const pending = matchIds.filter((id) => !doneIds.has(id)).slice(0, MATCHES_PER_USER)

        if (pending.length === 0) { log.skipped++; continue }

        // 2-4. 매치별 봇 분석 (순차)
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

            // 2-7. 같은 클랜 팀원 자동 등록
            const teammates = extractTeammates(matchData, accountId)
            if (teammates.length > 0) {
              const added = await autoRegisterClanTeammates(shard, accountId, teammates)
              log.clanAutoRegistered += added
            }

            // 2-8. 팀원 PlayerCache 자동 수집
            const tmSaved = await autoSaveTeammatesToPlayerCache(shard, accountId, matchData)
            log.teammateSaved += tmSaved

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
