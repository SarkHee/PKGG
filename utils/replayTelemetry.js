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
// 매치 시작(t=0, 비행기 탑승 전 대기)부터 착지 이후까지 위치 전 구간 포함
function buildReplayJson(telemetry, matchId, mapName) {
  if (!Array.isArray(telemetry) || telemetry.length === 0) return null

  // telemetry[0]이 항상 시간순으로 가장 이른 이벤트는 아님(예: LogMatchDefinition이 배열 맨 앞이지만
  // 실제 타임스탬프는 더 나중인 경우가 있음) — 전체 이벤트 중 가장 이른 시각을 t=0 기준으로 사용
  let refMs = Infinity
  for (const e of telemetry) {
    if (!e._D) continue
    const ms = new Date(e._D).getTime()
    if (ms < refMs) refMs = ms
  }
  if (!Number.isFinite(refMs)) refMs = new Date(telemetry[0]._D).getTime()

  const roster = extractRoster(telemetry)

  const positions = []
  for (const e of telemetry) {
    if (e._T !== 'LogPlayerPosition') continue
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
      iv: !!ch.isInVehicle, // 비행기(탑승) 판별용 — 프론트에서 착지 전 상태와 조합해 낙하산/비행기 단계 구분
    })
  }

  // 비행기 항로 — 낙하산 투입 전(isGame<1) 구간 중 탑승 상태(iv) 위치들의 시작/끝 지점으로
  // 직선 항로를 근사 (실제 항로는 일직선이라 두 지점만으로 충분)
  let planePath = null
  {
    const planePts = []
    for (const e of telemetry) {
      if (e._T !== 'LogPlayerPosition') continue
      if ((e.common?.isGame ?? 1) >= 1) continue
      const ch = e.character
      if (!ch?.isInVehicle || !ch.location) continue
      planePts.push({ t: toSec(e._D, refMs), x: ch.location.x, y: ch.location.y })
    }
    if (planePts.length >= 2) {
      planePts.sort((a, b) => a.t - b.t)
      const first = planePts[0]
      const last = planePts[planePts.length - 1]
      planePath = {
        t1: first.t, x1: Math.round(first.x), y1: Math.round(first.y),
        t2: last.t, x2: Math.round(last.x), y2: Math.round(last.y),
      }
    }
  }

  // 착지 이벤트 (낙하산 하강 종료 시점/위치)
  const landings = []
  for (const e of telemetry) {
    if (e._T !== 'LogParachuteLanding') continue
    const ch = e.character
    if (!ch?.accountId?.startsWith('account.') || !ch.location) continue
    landings.push({
      t: toSec(e._D, refMs),
      id: ch.accountId,
      x: Math.round(ch.location.x),
      y: Math.round(ch.location.y),
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
  // 가해자→피해자 방향선 표시를 위해 양쪽 좌표 모두 저장 (kills와 동일한 형태)
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
      ax: attacker?.location ? Math.round(attacker.location.x) : null,
      ay: attacker?.location ? Math.round(attacker.location.y) : null,
      weapon: e.damageCauserName || null,
    })
  }

  // 피격(LogPlayerTakeDamage) — 넉다운/확인사살로 이어지지 않은 일반 피격만.
  // 가해자·피해자 모두 실제 플레이어 + damage>0 + 자해 제외.
  // 같은 (가해자,피해자,초) 조합이 kills/downs에 이미 있으면 제외 — 그 타격이 곧 킬/넉다운이므로
  // 파란 피격선과 빨강/노랑 킬·다운선이 같은 자리에 겹쳐 그려지는 중복을 막는다.
  const lethalHitKeys = new Set()
  for (const k of kills) {
    if (k.killer) lethalHitKeys.add(`${k.killer}|${k.victim}|${k.t}`)
  }
  for (const d of downs) {
    if (d.attacker) lethalHitKeys.add(`${d.attacker}|${d.victim}|${d.t}`)
  }
  const hits = []
  for (const e of telemetry) {
    if (e._T !== 'LogPlayerTakeDamage') continue
    if (!((e.damage ?? 0) > 0)) continue
    const attacker = e.attacker
    const victim = e.victim
    if (!attacker?.accountId?.startsWith('account.')) continue
    if (!victim?.accountId?.startsWith('account.')) continue
    if (attacker.accountId === victim.accountId) continue
    if (!attacker.location || !victim.location) continue
    const t = toSec(e._D, refMs)
    if (lethalHitKeys.has(`${attacker.accountId}|${victim.accountId}|${t}`)) continue
    hits.push({
      t,
      attacker: attacker.accountId,
      victim: victim.accountId,
      ax: Math.round(attacker.location.x),
      ay: Math.round(attacker.location.y),
      vx: Math.round(victim.location.x),
      vy: Math.round(victim.location.y),
    })
  }

  const duration = positions.length ? Math.max(...positions.map((p) => p.t)) : 0
  // 재생 시작 기준점 — 비행기 탑승 시점(로비/대기 구간 데이터는 유지하되 재생은 여기서부터 시작)
  const boardingStart = planePath ? planePath.t1 : 0

  return {
    matchId,
    mapName: mapName || null,
    duration,
    boardingStart,
    players: [...roster.values()],
    positions,
    zones,
    kills,
    downs,
    hits,
    landings,
    planePath,
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
