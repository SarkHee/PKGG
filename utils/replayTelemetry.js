// utils/replayTelemetry.js — 매치 텔레메트리 → 2D 리플레이용 경량 JSON 파이프라인
// 원본 텔레메트리(수십 MB)는 저장하지 않고, 파싱된 경량 결과만 Redis에 캐싱한다 (TTL 1시간)
// 캐싱/에러 처리 패턴은 utils/botKills.js와 동일

import { redisGet, redisSet } from './redis.js'

const BASE_URL = 'https://api.pubg.com/shards'
const PUBG_HEADERS = { Accept: 'application/vnd.api+json' }
const MAX_RETRIES = 2
const REPLAY_TTL = 60 * 60 // 1시간

function replayCacheKey(matchId) {
  return `replay:${matchId}`
}

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

// LogMatchStart 이벤트에서 참가자 로스터(accountId → name/teamId) 추출
function extractRoster(telemetry) {
  const roster = new Map()
  const start = telemetry.find((e) => e._T === 'LogMatchStart')
  for (const c of start?.characters ?? []) {
    const ch = c.character
    if (!ch?.accountId?.startsWith('account.')) continue
    roster.set(ch.accountId, { id: ch.accountId, name: ch.name, teamId: ch.teamId })
  }
  return roster
}

function toSec(iso, refMs) {
  return Math.round((new Date(iso).getTime() - refMs) / 1000)
}

// 원본 텔레메트리 → 경량 리플레이 JSON (위치 10초 간격 + 자기장 + 킬 이벤트만 추출)
function buildReplayJson(telemetry, matchId, mapName) {
  if (!Array.isArray(telemetry) || telemetry.length === 0) return null

  const refMs = new Date(telemetry[0]._D).getTime()
  const roster = extractRoster(telemetry)

  const positions = []
  for (const e of telemetry) {
    if (e._T !== 'LogPlayerPosition') continue
    if ((e.common?.isGame ?? 1) < 1) continue // 비행기/낙하산 구간 제외
    const ch = e.character
    const loc = ch?.location
    if (!ch?.accountId?.startsWith('account.') || !loc) continue
    positions.push({
      t: toSec(e._D, refMs),
      id: ch.accountId,
      x: Math.round(loc.x),
      y: Math.round(loc.y),
      hp: Math.round(ch.health ?? 0),
      bz: !!ch.isInBlueZone,
      dbno: !!ch.isDBNO,
    })
  }

  const zones = []
  for (const e of telemetry) {
    if (e._T !== 'LogGameStatePeriodic') continue
    const gs = e.gameState
    if (!gs) continue
    zones.push({
      t: toSec(e._D, refMs),
      safe: gs.safetyZonePosition
        ? { x: Math.round(gs.safetyZonePosition.x), y: Math.round(gs.safetyZonePosition.y), r: Math.round(gs.safetyZoneRadius ?? 0) }
        : null,
      warn: gs.poisonGasWarningRadius
        ? { x: Math.round(gs.poisonGasWarningPosition.x), y: Math.round(gs.poisonGasWarningPosition.y), r: Math.round(gs.poisonGasWarningRadius) }
        : null,
      aliveTeams: gs.numAliveTeams ?? null,
      alivePlayers: gs.numAlivePlayers ?? null,
    })
  }

  const kills = []
  for (const e of telemetry) {
    if (e._T !== 'LogPlayerKillV2') continue
    const victim = e.victim
    const attacker = e.finisher || e.killer || e.dBNOMaker
    if (!victim?.accountId) continue
    kills.push({
      t: toSec(e._D, refMs),
      killer: attacker?.accountId?.startsWith('account.') ? attacker.accountId : null,
      victim: victim.accountId,
      kx: victim.location ? Math.round(victim.location.x) : null,
      ky: victim.location ? Math.round(victim.location.y) : null,
      ax: attacker?.location ? Math.round(attacker.location.x) : null,
      ay: attacker?.location ? Math.round(attacker.location.y) : null,
      weapon: e.finishDamageInfo?.damageCauserName || null,
    })
  }

  // 넉다운(LogPlayerMakeGroggy) — 확인사살(kills)과 구분해서 기록
  const downs = []
  for (const e of telemetry) {
    if (e._T !== 'LogPlayerMakeGroggy') continue
    const victim = e.victim
    const attacker = e.attacker
    if (!victim?.accountId) continue
    downs.push({
      t: toSec(e._D, refMs),
      attacker: attacker?.accountId?.startsWith('account.') ? attacker.accountId : null,
      victim: victim.accountId,
      x: victim.location ? Math.round(victim.location.x) : null,
      y: victim.location ? Math.round(victim.location.y) : null,
      weapon: e.damageCauserName || null,
    })
  }

  const duration = positions.length ? Math.max(...positions.map((p) => p.t)) : 0

  return {
    matchId,
    mapName: mapName || null,
    duration,
    players: [...roster.values()],
    positions,
    zones,
    kills,
    downs,
  }
}

/**
 * matchId + platform으로 2D 리플레이용 경량 텔레메트리 JSON을 가져온다.
 * 1) Redis(replay:{matchId}, TTL 1시간) 조회 → 있으면 PUBG API 호출 없이 즉시 반환
 * 2) 없으면 매치 메타 → 텔레메트리 원본 순으로 fetch → 경량 JSON 파싱 → Redis 저장 → 반환
 * 원본 텔레메트리는 어떤 경우에도 캐싱하지 않는다.
 *
 * @returns {{ status: 'ok'|'match_failed'|'telemetry_missing'|'telemetry_failed'|'invalid_args', data: object|null, fromCache?: boolean }}
 */
export async function getMatchReplay(matchId, platform) {
  if (!matchId || !platform) return { status: 'invalid_args', data: null }

  const cached = await redisGet(replayCacheKey(matchId))
  if (cached) {
    const data = typeof cached === 'string' ? JSON.parse(cached) : cached
    return { status: 'ok', data, fromCache: true }
  }

  try {
    const matchRes = await fetchWithRetry(`${BASE_URL}/${platform}/matches/${matchId}`, { headers: PUBG_HEADERS }, 10000)
    if (!matchRes || !matchRes.ok) {
      console.warn('[replayTelemetry] 매치 fetch 실패:', matchRes?.status)
      return { status: 'match_failed', data: null }
    }
    const matchData = await matchRes.json()
    const mapName = matchData?.data?.attributes?.mapName || null

    const telemetryUrl = getTelemetryUrl(matchData)
    if (!telemetryUrl) return { status: 'telemetry_missing', data: null }

    const telRes = await fetchWithRetry(telemetryUrl, { headers: PUBG_HEADERS }, 45000)
    if (!telRes || !telRes.ok) {
      console.warn('[replayTelemetry] 텔레메트리 fetch 실패:', telRes?.status)
      return { status: 'telemetry_failed', data: null }
    }
    const telemetry = await telRes.json()

    const replayData = buildReplayJson(telemetry, matchId, mapName)
    if (!replayData) return { status: 'telemetry_failed', data: null }

    await redisSet(replayCacheKey(matchId), replayData, REPLAY_TTL)
    return { status: 'ok', data: replayData, fromCache: false }
  } catch (err) {
    console.warn('[replayTelemetry] 처리 오류:', err.message)
    return { status: 'telemetry_failed', data: null, error: err.message }
  }
}
