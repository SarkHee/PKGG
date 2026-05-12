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

// ── Redis 캐시 (봇킬 카운트만 저장, raw 텔레메트리 저장 안 함) ────────────────

function telCacheKey(matchId) {
  return `bot-kills:tel:${matchId}`
}

async function getCachedCounts(matchId) {
  const raw = await redisGet(telCacheKey(matchId))
  if (!raw) return null
  const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
  return new Map(Object.entries(obj).map(([k, v]) => [k, Number(v)]))
}

async function setCachedCounts(matchId, counts) {
  await redisSet(telCacheKey(matchId), Object.fromEntries(counts), TELEMETRY_TTL)
}

// ── 텔레메트리 안전 fetch ─────────────────────────────────────────────────────

async function safeFetchBotKills(matchData, matchId) {
  // Redis 캐시 우선
  const cached = await getCachedCounts(matchId)
  if (cached) return { status: 'ok', counts: cached }

  const telemetryUrl = getTelemetryUrl(matchData)
  if (!telemetryUrl) {
    return { status: 'missing', counts: new Map() }
  }

  try {
    // 텔레메트리 20~50MB, 타임아웃 넉넉히
    const res = await fetchWithRetry(telemetryUrl, { headers: PUBG_HEADERS }, 45000)
    if (!res || !res.ok) {
      console.warn('[botKills] 텔레메트리 fetch 실패:', res?.status)
      return { status: 'failed', counts: new Map() }
    }
    const telemetry = await res.json()
    const counts = countBotKillsByAccount(telemetry)
    await setCachedCounts(matchId, counts)
    return { status: 'ok', counts }
  } catch (err) {
    console.warn('[botKills] 텔레메트리 처리 오류:', err)
    return { status: 'failed', counts: new Map(), error: err }
  }
}

// ── rows 빌드 ─────────────────────────────────────────────────────────────────

function buildRows(players, botKillsById, isBotCorrected) {
  const rows = []
  for (const [pid, info] of players) {
    const botK  = isBotCorrected ? (botKillsById.get(pid) ?? 0) : 0
    const totalK = info.kills
    rows.push({
      accountId:  pid,
      name:       info.name,
      total:      totalK,
      bot:        botK,
      real:       totalK - botK,
      damage:     info.damageDealt,
      rank:       info.winPlace,
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
    const rows = buildRows(players, telResult.counts, isBotCorrected)

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
