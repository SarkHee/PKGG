// utils/botKills.js — bot_kills.ts의 JavaScript 이식
// 텔레메트리 봇킬 파싱 결과를 Redis에 13일 TTL로 캐싱
// 어떤 경우에도 throw 없음 — 항상 { status, rows, isBotCorrected, error? } 반환

import { redisGet, redisSet } from './redis.js'

const BASE_URL = 'https://api.pubg.com/shards'
const PUBG_HEADERS = { Accept: 'application/vnd.api+json' }
const MAX_RETRIES = 2
const TELEMETRY_TTL = 13 * 24 * 60 * 60  // 13일 (초)

// ── 내부 유틸 ─────────────────────────────────────────────────────────────────

async function fetchWithRetry(url, options = {}, timeoutMs = 20000) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const tid = setTimeout(() => controller.abort(), timeoutMs)
      const res = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(tid)
      return res
    } catch {
      if (attempt === MAX_RETRIES) return null
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)))
    }
  }
  return null
}

function getTelemetryUrl(matchData) {
  for (const item of matchData?.included ?? []) {
    if (item.type === 'asset') {
      const url = item.attributes?.URL
      if (url) return url
    }
  }
  return null
}

function extractRealPlayers(matchData) {
  const players = new Map()
  for (const item of matchData?.included ?? []) {
    if (item.type !== 'participant') continue
    const stats = item.attributes?.stats ?? {}
    const playerId = stats.playerId ?? ''
    if (!playerId.startsWith('account.')) continue
    players.set(playerId, {
      name:         stats.name,
      kills:        stats.kills ?? 0,
      damageDealt:  stats.damageDealt ?? 0,
      winPlace:     stats.winPlace ?? null,
    })
  }
  return players
}

function countBotKillsByAccount(telemetry) {
  const counter = new Map()
  for (const event of telemetry) {
    if (event._T !== 'LogPlayerKillV2') continue
    const victimId = event.victim?.accountId ?? ''
    const killerId = event.killer?.accountId ?? ''
    if (!victimId.startsWith('ai.')) continue
    if (!killerId.startsWith('account.')) continue
    counter.set(killerId, (counter.get(killerId) ?? 0) + 1)
  }
  return counter
}

function countBotAssistsByAccount(telemetry) {
  const counter = new Map()
  for (const event of telemetry) {
    if (event._T !== 'LogPlayerKillV2') continue
    const victimId = event.victim?.accountId ?? ''
    if (!victimId.startsWith('ai.')) continue
    for (const assist of event.assists ?? []) {
      const assistId = assist.accountId ?? ''
      if (!assistId.startsWith('account.')) continue
      counter.set(assistId, (counter.get(assistId) ?? 0) + 1)
    }
  }
  return counter
}

// HP 시뮬레이션 방식: victim.health(pre-damage HP) 기반으로 실제 적용 데미지 계산
// victim.health가 데미지 적용 전 HP임을 텔레메트리 샘플로 검증 완료
function countBotDamageByAccount(telemetry) {
  const damages = new Map()  // accountId → { botDamage, realDamage }

  // alive 상태 추적 (기절/사망 시 이후 damage 이벤트 무시 방지용)
  const groggy = new Set()
  const dead   = new Set()

  for (const event of telemetry) {
    switch (event._T) {
      case 'LogPlayerCreate': {
        const aid = event.character?.accountId ?? ''
        if (aid) { groggy.delete(aid); dead.delete(aid) }
        break
      }
      case 'LogPlayerRevive': {
        // revive 시 victim 필드에 살아난 플레이어 정보
        const aid = event.victim?.accountId ?? ''
        if (aid) { groggy.delete(aid); dead.delete(aid) }
        break
      }
      case 'LogPlayerMakeGroggy': {
        const aid = event.victim?.accountId ?? ''
        if (aid) groggy.add(aid)
        break
      }
      case 'LogPlayerKillV2': {
        const aid = event.victim?.accountId ?? ''
        if (aid) { groggy.delete(aid); dead.add(aid) }
        break
      }
      case 'LogPlayerTakeDamage': {
        const attackerId = event.attacker?.accountId ?? ''
        if (!attackerId.startsWith('account.')) break

        const victimId = event.victim?.accountId ?? ''
        const isBot  = victimId.startsWith('ai.')
        const isReal = victimId.startsWith('account.')
        if (!isBot && !isReal) break

        // victim.health = 데미지 적용 전 HP (검증 완료)
        // applied = 실제로 깎인 HP (오버킬 제외)
        const preHP   = event.victim?.health ?? 0
        const applied = Math.min(event.damage ?? 0, preHP)
        if (applied <= 0) break

        const entry = damages.get(attackerId) ?? { botDamage: 0, realDamage: 0 }
        if (isBot) {
          entry.botDamage  += applied
        } else {
          entry.realDamage += applied
        }
        damages.set(attackerId, entry)
        break
      }
    }
  }
  return damages
}

// ── Redis 캐시 (봇킬 카운트만 저장, raw 텔레메트리 저장 안 함) ────────────────

function telCacheKey(matchId) {
  return `bot-kills:v3:tel:${matchId}`
}

async function getCachedCounts(matchId) {
  const raw = await redisGet(telCacheKey(matchId))
  if (!raw) return null
  const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
  // v3 포맷: { kills, assists, damages }
  if (obj.kills !== undefined) {
    const counts       = new Map(Object.entries(obj.kills).map(([k, v]) => [k, Number(v)]))
    const assistCounts = new Map(Object.entries(obj.assists ?? {}).map(([k, v]) => [k, Number(v)]))
    const damages      = new Map(
      Object.entries(obj.damages ?? {}).map(([k, v]) => [k, { botDamage: Number(v.botDamage), realDamage: Number(v.realDamage) }])
    )
    return { counts, assistCounts, damages }
  }
  return null  // v1/v2 구 포맷은 키 변경으로 자동 무효화
}

async function setCachedCounts(matchId, counts, assistCounts, damages) {
  await redisSet(
    telCacheKey(matchId),
    {
      kills:   Object.fromEntries(counts),
      assists: Object.fromEntries(assistCounts),
      damages: Object.fromEntries(damages),
    },
    TELEMETRY_TTL
  )
}

// ── 텔레메트리 안전 fetch ─────────────────────────────────────────────────────

const EMPTY_TEL = () => ({ counts: new Map(), assistCounts: new Map(), damages: new Map() })

async function safeFetchBotKills(matchData, matchId) {
  // Redis 캐시 우선
  const cached = await getCachedCounts(matchId)
  if (cached) return { status: 'ok', ...cached }

  const telemetryUrl = getTelemetryUrl(matchData)
  if (!telemetryUrl) {
    return { status: 'missing', ...EMPTY_TEL() }
  }

  try {
    // 텔레메트리 20~50MB, 타임아웃 넉넉히
    const res = await fetchWithRetry(telemetryUrl, { headers: PUBG_HEADERS }, 45000)
    if (!res || !res.ok) {
      console.warn('[botKills] 텔레메트리 fetch 실패:', res?.status)
      return { status: 'failed', ...EMPTY_TEL() }
    }
    const telemetry    = await res.json()
    const counts       = countBotKillsByAccount(telemetry)
    const assistCounts = countBotAssistsByAccount(telemetry)
    const damages      = countBotDamageByAccount(telemetry)
    await setCachedCounts(matchId, counts, assistCounts, damages)
    return { status: 'ok', counts, assistCounts, damages }
  } catch (err) {
    console.warn('[botKills] 텔레메트리 처리 오류:', err)
    return { status: 'failed', ...EMPTY_TEL(), error: err }
  }
}

// ── rows 빌드 ─────────────────────────────────────────────────────────────────

function buildRows(players, botKillsById, assistCounts, damages, isBotCorrected) {
  const rows = []
  for (const [pid, info] of players) {
    const botK   = isBotCorrected ? (botKillsById.get(pid) ?? 0) : 0
    const totalK = info.kills

    let botAssist  = 0
    let botDamage  = 0
    let realDamage = info.damageDealt

    if (isBotCorrected) {
      botAssist = assistCounts.get(pid) ?? 0

      // HP 시뮬레이션 방식: 실제 적용 데미지 기반 (오버킬 제외)
      const dmg  = damages.get(pid)
      botDamage  = Math.round(dmg?.botDamage ?? 0)
      realDamage = Math.round(info.damageDealt - botDamage)
    }

    rows.push({
      accountId:  pid,
      name:       info.name,
      total:      totalK,
      bot:        botK,
      real:       totalK - botK,
      damage:     info.damageDealt,
      rank:       info.winPlace,
      botAssist,
      realAssist: 0,
      botDamage,
      realDamage,
    })
  }
  rows.sort((a, b) => {
    if (b.real !== a.real)   return b.real - a.real
    if (b.total !== a.total) return b.total - a.total
    return (a.rank ?? 9999) - (b.rank ?? 9999)
  })
  return rows
}

// ── 공개 API ──────────────────────────────────────────────────────────────────

/**
 * 이미 fetch한 matchData(PUBG API 응답)로 분석.
 * load-more.js 등 매치 데이터가 있는 경우에 사용해 중복 fetch 방지.
 *
 * @returns {{ status, rows, isBotCorrected, error? }}
 *   telemetry_missing / telemetry_failed → bot=0, real=total, isBotCorrected: false
 *   ok                                  → 실제 봇킬 분리,     isBotCorrected: true
 */
export async function analyzeMatchData(matchData, matchId) {
  if (!matchData || !matchId) {
    return { status: 'invalid_args', rows: [], isBotCorrected: false }
  }

  try {
    const players   = extractRealPlayers(matchData)
    const telResult = await safeFetchBotKills(matchData, matchId)

    const isBotCorrected = telResult.status === 'ok'
    const rows = buildRows(players, telResult.counts, telResult.assistCounts, telResult.damages, isBotCorrected)

    if (telResult.status === 'ok') {
      return { status: 'ok', rows, isBotCorrected: true }
    }
    if (telResult.status === 'missing') {
      return { status: 'telemetry_missing', rows, isBotCorrected: false }
    }
    return { status: 'telemetry_failed', rows, isBotCorrected: false, error: telResult.error }
  } catch (err) {
    console.warn('[botKills] analyzeMatchData 예기치 못한 오류:', err)
    return { status: 'unknown_error', rows: [], isBotCorrected: false, error: err }
  }
}

/**
 * matchId만으로 분석 (내부에서 매치 fetch 포함).
 * bot-kills.js API 등 matchData가 없는 경우에 사용.
 *
 * @returns {{ status, rows, isBotCorrected, error? }}
 */
export async function analyzeMatch(matchId, platform) {
  if (!matchId || !platform) {
    return { status: 'invalid_args', rows: [], isBotCorrected: false }
  }

  try {
    const res = await fetchWithRetry(
      `${BASE_URL}/${platform}/matches/${matchId}`,
      { headers: PUBG_HEADERS },
      10000
    )
    if (!res || !res.ok) {
      console.warn('[botKills] match fetch 실패:', res?.status)
      return { status: 'match_failed', rows: [], isBotCorrected: false }
    }
    const matchData = await res.json()
    return analyzeMatchData(matchData, matchId)
  } catch (err) {
    console.warn('[botKills] analyzeMatch 예기치 못한 오류:', err)
    return { status: 'match_failed', rows: [], isBotCorrected: false, error: err }
  }
}
