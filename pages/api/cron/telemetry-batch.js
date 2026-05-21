// pages/api/cron/telemetry-batch.js
// 매일 02:00 KST (17:00 UTC) — avgDamage > 0 전체 PlayerCache 유저의 미분석 경기 텔레메트리 배치

import prisma from '../../../utils/prisma.js'
import { cachedPubgFetch, TTL } from '../../../utils/pubgApiCache.js'
import { calculateMMR } from '../../../utils/mmrCalculator.js'

const PUBG_BASE        = 'https://api.pubg.com/shards'
const MAX_MS           = 250_000  // 250초 안전 마진 (Vercel Pro 300s 기준)
const MAX_MATCHES      = 50       // 실행당 최대 처리 경기 수
const MATCHES_PER_USER = 5        // 유저당 최대 경기 수
const STALE_DAYS = 5 // 마지막 갱신 후 5일 이상 지난 유저만 대상
const MAX_SEED_USERS   = 150      // 2차 루프: 신규 유저 스탯 채우기 최대 처리 수

// ── 현재 시즌 ID 조회 (인메모리 30분 캐시) ────────────────────────────────
let _seasonCache = null
let _seasonCacheAt = 0
const SEASON_CACHE_MS = 30 * 60 * 1000

async function getCurrentSeasonId(shard = 'steam') {
  if (_seasonCache && Date.now() - _seasonCacheAt < SEASON_CACHE_MS) return _seasonCache
  const res = await fetch(`${PUBG_BASE}/${shard}/seasons`, {
    headers: {
      Authorization: `Bearer ${process.env.PUBG_API_KEY}`,
      Accept: 'application/vnd.api+json',
    },
  })
  if (!res.ok) throw new Error(`시즌 조회 실패 (${res.status})`)
  const json = await res.json()
  const current = (json.data || []).find((s) => s.attributes?.isCurrentSeason)
  if (!current) throw new Error('현재 시즌 없음')
  _seasonCache   = current.id
  _seasonCacheAt = Date.now()
  return current.id
}

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

// ── 밴 확정 시 클랜 관련 데이터 정리 ────────────────────────────────────
async function cleanupBannedUser(nickname, accountId) {
  try {
    const where = accountId
      ? { pubgPlayerId: accountId }
      : { nickname: { equals: nickname, mode: 'insensitive' } }

    // 삭제 전 소속 clanId 수집
    const members = await prisma.clanMember.findMany({ where, select: { clanId: true } })
    const clanIds = [...new Set(members.map((m) => m.clanId).filter(Boolean))]

    await prisma.clanMember.deleteMany({ where })

    // 클랜 리더였으면 leader 필드 초기화
    await prisma.clan.updateMany({
      where: { leader: { equals: nickname, mode: 'insensitive' } },
      data: { leader: '' },
    })

    // 영향받은 클랜 memberCount 재계산
    for (const clanId of clanIds) {
      const count = await prisma.clanMember.count({ where: { clanId } })
      await prisma.clan.update({
        where: { id: clanId },
        data: { memberCount: count, ...(count === 0 ? { avgScore: 0 } : {}) },
      })
    }
    console.log(`[ban-cleanup] 🧹 클랜 데이터 정리 완료: ${nickname}`)
  } catch (e) {
    console.warn(`[ban-cleanup] 클랜 정리 실패 ${nickname}:`, e.message)
  }
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
    // 밴 확정 시 클랜 데이터도 정리
    if (newCount >= 3) await cleanupBannedUser(nickname, accountId)
  } catch (e) {
    console.warn(`[telemetry-batch] ban 카운트 저장 실패 ${nickname}:`, e.message)
  }
}

// ── 팀원 정보 추출 후 PlayerCache 자동 수집 ──────────────────────────────
async function autoSaveTeammatesToPlayerCache(shard, myAccountId, matchData) {
  const included = matchData?.included ?? []

  // participant id → { accountId, nickname, stats } 맵 빌드
  const partMap = new Map()
  for (const item of included) {
    if (item.type !== 'participant') continue
    const pid  = item.attributes?.stats?.playerId ?? ''
    const name = item.attributes?.stats?.name ?? ''
    if (pid.startsWith('account.')) {
      partMap.set(item.id, { accountId: pid, nickname: name, stats: item.attributes?.stats ?? {} })
    }
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
      // avgDamage=0으로 저장 → seed loop(step 3)에서 즉시 시즌 스탯 조회 대상이 됨
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
          roundsPlayed:   0,
          lastUpdated:    new Date(Date.now() - 7 * 86400000), // 7일 전으로 설정 → seed 쿼리 즉시 포함
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
    console.log(`[telemetry-batch] 👥 팀원 PlayerCache 등록: ${count}명 (seed loop 대상으로 저장)`)
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

    // ── 3. 신규/시즌없음 유저 스탯 채우기 ─────────────────────────────────────
    // avgDamage=0 (미초기화): 24시간 cutoff 적용 (무한루프 방지)
    // avgDamage=-1 (시즌없음): 매일 재시도 (shard 오류 또는 새 시즌 시작 가능)
    log.seedUpdated = 0
    if (Date.now() - startTime < MAX_MS) {
      try {
        const seedCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const seedUsers = await prisma.playerCache.findMany({
          where: {
            OR: [
              { avgDamage: 0,  pubgPlayerId: { not: null }, isBanned: { not: true }, lastUpdated: { lt: seedCutoff } },
              { avgDamage: -1, pubgPlayerId: { not: null }, isBanned: { not: true } },
            ],
          },
          orderBy: { lastUpdated: 'asc' },
          take: MAX_SEED_USERS,
          select: { id: true, nickname: true, pubgPlayerId: true, pubgShardId: true },
        })

        if (seedUsers.length > 0) {
          console.log(`[telemetry-batch] 🌱 스탯 채우기 대상: ${seedUsers.length}명`)

          const shardSeasonMap = {}
          const CALL_DELAY_MS  = 700
          const RETRY_WAIT_MS  = 12000
          const delay = (ms) => new Promise((r) => setTimeout(r, ms))
          let shardFixed = 0

          for (const u of seedUsers) {
            if (Date.now() - startTime > MAX_MS) break

            let shard = u.pubgShardId || 'steam'
            try {
              if (!shardSeasonMap[shard]) shardSeasonMap[shard] = await getCurrentSeasonId(shard)
              let seasonId = shardSeasonMap[shard]

              // 기본 shard 시즌 조회
              let apiRes = await fetch(`${PUBG_BASE}/${shard}/players/${u.pubgPlayerId}/seasons/${seasonId}`, {
                headers: { Authorization: `Bearer ${process.env.PUBG_API_KEY}`, Accept: 'application/vnd.api+json' },
              })
              if (apiRes.status === 429) {
                await delay(RETRY_WAIT_MS)
                apiRes = await fetch(`${PUBG_BASE}/${shard}/players/${u.pubgPlayerId}/seasons/${seasonId}`, {
                  headers: { Authorization: `Bearer ${process.env.PUBG_API_KEY}`, Accept: 'application/vnd.api+json' },
                })
              }
              // 404 → 반대 shard 시도 (shard 오감지 수정)
              if (apiRes.status === 404) {
                const altShard = shard === 'steam' ? 'kakao' : 'steam'
                if (!shardSeasonMap[altShard]) shardSeasonMap[altShard] = await getCurrentSeasonId(altShard)
                await delay(CALL_DELAY_MS)
                const altRes = await fetch(`${PUBG_BASE}/${altShard}/players/${u.pubgPlayerId}/seasons/${shardSeasonMap[altShard]}`, {
                  headers: { Authorization: `Bearer ${process.env.PUBG_API_KEY}`, Accept: 'application/vnd.api+json' },
                })
                if (altRes.ok) {
                  const correctRecord = await prisma.playerCache.findFirst({
                    where: { pubgPlayerId: u.pubgPlayerId, pubgShardId: altShard },
                  })
                  if (correctRecord) {
                    await prisma.playerCache.deleteMany({ where: { pubgPlayerId: u.pubgPlayerId, pubgShardId: shard } })
                  } else {
                    await prisma.playerCache.updateMany({ where: { pubgPlayerId: u.pubgPlayerId }, data: { pubgShardId: altShard } })
                  }
                  shard = altShard
                  seasonId = shardSeasonMap[altShard]
                  apiRes = altRes
                  shardFixed++
                }
              }
              if (!apiRes.ok) { await delay(CALL_DELAY_MS); continue }

              const json = await apiRes.json()
              const gameModeStats = json?.data?.attributes?.gameModeStats ?? {}

              let totalRounds = 0, totalDamage = 0, totalKills = 0
              let totalAssists = 0, totalSurvive = 0, totalWins = 0, totalTop10 = 0
              for (const s of Object.values(gameModeStats)) {
                const r = s.roundsPlayed || 0
                if (r === 0) continue
                totalRounds  += r
                totalDamage  += s.damageDealt  || 0
                totalKills   += s.kills        || 0
                totalAssists += s.assists      || 0
                totalSurvive += s.timeSurvived || 0
                totalWins    += s.wins         || 0
                totalTop10   += s.top10s       || 0
              }

              // 일반전 없으면 경쟁전 fallback
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
                  const rj = await rankedRes.json()
                  for (const rm of Object.values(rj?.data?.attributes?.rankedGameModeStats ?? {})) {
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

              // 현재 shard 모두 0 → 반대 shard 시도 (cross-play 플랫폼 오감지 보정)
              if (totalRounds === 0) {
                const altShard2 = shard === 'steam' ? 'kakao' : 'steam'
                if (!shardSeasonMap[altShard2]) shardSeasonMap[altShard2] = await getCurrentSeasonId(altShard2)
                await delay(CALL_DELAY_MS)
                let altNRes = await fetch(`${PUBG_BASE}/${altShard2}/players/${u.pubgPlayerId}/seasons/${shardSeasonMap[altShard2]}`, {
                  headers: { Authorization: `Bearer ${process.env.PUBG_API_KEY}`, Accept: 'application/vnd.api+json' },
                })
                if (altNRes.status === 429) {
                  await delay(RETRY_WAIT_MS)
                  altNRes = await fetch(`${PUBG_BASE}/${altShard2}/players/${u.pubgPlayerId}/seasons/${shardSeasonMap[altShard2]}`, {
                    headers: { Authorization: `Bearer ${process.env.PUBG_API_KEY}`, Accept: 'application/vnd.api+json' },
                  })
                }
                if (altNRes.ok) {
                  const altNJ = await altNRes.json()
                  for (const s2 of Object.values(altNJ?.data?.attributes?.gameModeStats ?? {})) {
                    const r = s2.roundsPlayed || 0
                    if (r === 0) continue
                    totalRounds  += r; totalDamage  += s2.damageDealt  || 0
                    totalKills   += s2.kills        || 0; totalAssists += s2.assists      || 0
                    totalSurvive += s2.timeSurvived || 0; totalWins    += s2.wins         || 0
                    totalTop10   += s2.top10s       || 0
                  }
                  if (totalRounds === 0) {
                    await delay(CALL_DELAY_MS)
                    let altRRes = await fetch(`${PUBG_BASE}/${altShard2}/players/${u.pubgPlayerId}/seasons/${shardSeasonMap[altShard2]}/ranked`, {
                      headers: { Authorization: `Bearer ${process.env.PUBG_API_KEY}`, Accept: 'application/vnd.api+json' },
                    })
                    if (altRRes.ok) {
                      const altRJ = await altRRes.json()
                      for (const rm of Object.values(altRJ?.data?.attributes?.rankedGameModeStats ?? {})) {
                        const r = rm.roundsPlayed || 0
                        if (r === 0) continue
                        totalRounds  += r; totalDamage  += rm.damageDealt   || 0
                        totalKills   += rm.kills         || 0; totalAssists += rm.assists       || 0
                        totalSurvive += rm.timeSurvived  || 0; totalWins    += rm.wins          || 0
                        totalTop10   += rm.top10s        || 0
                      }
                    }
                  }
                  if (totalRounds > 0) {
                    const correctRecord = await prisma.playerCache.findFirst({
                      where: { pubgPlayerId: u.pubgPlayerId, pubgShardId: altShard2 },
                    })
                    if (correctRecord) {
                      await prisma.playerCache.deleteMany({ where: { pubgPlayerId: u.pubgPlayerId, pubgShardId: shard } })
                    } else {
                      await prisma.playerCache.updateMany({ where: { pubgPlayerId: u.pubgPlayerId }, data: { pubgShardId: altShard2 } })
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
                      .reduce((sum, s2) => sum + (s2.roundsPlayed || 0), 0)
                    if (lRounds > 0) { correctShard = ls; break }
                  } catch { /* 무시 */ }
                  await delay(CALL_DELAY_MS)
                }
                if (correctShard && correctShard !== shard) {
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
                await prisma.playerCache.updateMany({
                  where: { pubgPlayerId: u.pubgPlayerId },
                  data: { avgDamage: -1, lastUpdated: new Date() },
                })
                continue
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
              log.seedUpdated++
              console.log(`[telemetry-batch] 🌱 ${u.nickname} 완료 (${totalRounds}경기, 딜${avgDamage}, shard=${shard})`)
            } catch (err) {
              console.warn(`[telemetry-batch] 🌱 ${u.nickname} 실패:`, err.message)
            }
            await delay(CALL_DELAY_MS)
          }
          if (shardFixed > 0) console.log(`[telemetry-batch] 🔧 플랫폼 shard 수정: ${shardFixed}명`)
        }
      } catch (err) {
        console.warn('[telemetry-batch] 시즌 스탯 초기화 루프 오류:', err.message)
      }
    }

    // ── 4. 실행 로그 저장 ────────────────────────────────────────────────────
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
