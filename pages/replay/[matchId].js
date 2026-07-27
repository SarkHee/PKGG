// pages/replay/[matchId].js — 2D 매치 리플레이 (맵 + 위치보간 + 자기장 + 킬이펙트/킬로그 + 배속)
// 접근 제어: 구글 로그인 + PUBG 계정 연동 + 본인이 실제 참여한 매치인지 서버에서 검증 (getServerSideProps)
import Head from 'next/head'
import { useRouter } from 'next/router'
import { signIn } from 'next-auth/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Layout from '../../components/layout/Layout'
import { getMaxCoord, getMapImage } from '../../utils/mapCoords'
import { getSessionAuthUser } from '../../utils/clanBattleAuth'
import prisma from '../../utils/prisma'

export async function getServerSideProps({ params, req, res }) {
  const { matchId } = params

  const authUser = await getSessionAuthUser(req, res)
  if (!authUser) {
    return { props: { accessError: 'not_logged_in' } }
  }
  if (!authUser.pubgAccounts || authUser.pubgAccounts.length === 0) {
    return { props: { accessError: 'not_linked' } }
  }

  const participated = await prisma.playerMatch.findFirst({
    where: {
      matchId,
      pubgAccountId: { in: authUser.pubgAccounts.map((a) => a.pubgAccountId) },
    },
    select: { shard: true, nickname: true },
  })

  if (!participated) {
    return { props: { accessError: 'not_participant' } }
  }

  return {
    props: {
      accessError: null,
      matchId,
      verifiedShard: participated.shard,
      verifiedNickname: participated.nickname,
    },
  }
}

const CANVAS_SIZE = 800
const ENGAGEMENT_FADE_SEC = 1.2 // 킬/넉다운 방향선 노출 시간 — 짧게 유지해 여러 건 겹쳐도 지저분해지지 않게
const HIT_FADE_SEC = 0.6 // 피격(비치명) 방향선 — 킬/넉다운보다 훨씬 빈번해서 더 짧게
const SPEEDS = [1, 2, 4, 8]
const MIN_MARKER_RADIUS = 1.5 // 확대해도 이 이하(월드 단위)로는 작아지지 않음

// 확대해도 화면상 크기가 거의 일정하게 유지되도록 반지름을 zoom 배율에 반비례시킴
// (ctx가 scale만큼 곱해서 그리므로, 여기서 미리 나눠두면 최종 화면 픽셀 크기가 일정해짐)
function scaledRadius(baseRadius, zoomScale) {
  return Math.max(MIN_MARKER_RADIUS, baseRadius / zoomScale)
}

// 팀 ID → 색상 (골든 앵글 회전으로 팀 수가 많아도 시각적으로 구분되게)
function teamColor(teamId) {
  const hue = (teamId * 137.508) % 360
  return `hsl(${hue}, 70%, 55%)`
}

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

// 시각 t에서의 스냅샷을 이진 탐색으로 찾아 선형보간 (경계 밖이면 양 끝값 고정)
function interpAt(snapshots, t, numericKeys) {
  if (!snapshots || snapshots.length === 0) return null
  if (t <= snapshots[0].t) return snapshots[0]
  const last = snapshots[snapshots.length - 1]
  if (t >= last.t) return last

  let lo = 0
  let hi = snapshots.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (snapshots[mid].t <= t) lo = mid
    else hi = mid
  }
  const a = snapshots[lo]
  const b = snapshots[hi]
  const span = b.t - a.t || 1
  const ratio = (t - a.t) / span
  const out = { ...a }
  for (const k of numericKeys) {
    if (typeof a[k] === 'number' && typeof b[k] === 'number') {
      out[k] = a[k] + (b[k] - a[k]) * ratio
    }
  }
  return out
}

export default function MatchReplayPage({ accessError, matchId, verifiedShard, verifiedNickname }) {
  const router = useRouter()
  const shard = verifiedShard
  const nickname = verifiedNickname

  const [replayData, setReplayData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [showTip, setShowTip] = useState(false)
  const [sidePanelTab, setSidePanelTab] = useState('squads') // 'squads' | 'kills'

  const canvasRef = useRef(null)
  const mapImgRef = useRef(null)
  const [mapImgReady, setMapImgReady] = useState(false)
  const rafRef = useRef(null)
  const lastTsRef = useRef(null)
  const killLogRef = useRef(null)

  // ── 확대/축소 + 드래그 이동 ──────────────────────────────────────────────
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 })
  const draggingRef = useRef(false)
  const dragStartRef = useRef(null) // { clientX, clientY, baseX, baseY }

  const resetView = () => setTransform({ scale: 1, x: 0, y: 0 })

  const handleCanvasMouseDown = (e) => {
    draggingRef.current = true
    dragStartRef.current = { clientX: e.clientX, clientY: e.clientY, baseX: transform.x, baseY: transform.y }
  }

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!draggingRef.current || !dragStartRef.current) return
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const ratio = CANVAS_SIZE / rect.width
      const { clientX, clientY, baseX, baseY } = dragStartRef.current
      setTransform((prev) => ({
        ...prev,
        x: baseX + (e.clientX - clientX) * ratio,
        y: baseY + (e.clientY - clientY) * ratio,
      }))
    }
    const onMouseUp = () => {
      draggingRef.current = false
      dragStartRef.current = null
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  // 휠 확대/축소 — 커서 위치를 기준으로 확대 (React onWheel은 passive라 preventDefault 안 먹어서 네이티브로 부착)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (e) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const ratio = CANVAS_SIZE / rect.width
      const mx = (e.clientX - rect.left) * ratio
      const my = (e.clientY - rect.top) * ratio
      setTransform((prev) => {
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
        const newScale = Math.min(8, Math.max(1, prev.scale * factor))
        const worldX = (mx - prev.x) / prev.scale
        const worldY = (my - prev.y) / prev.scale
        return { scale: newScale, x: mx - worldX * newScale, y: my - worldY * newScale }
      })
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [replayData]) // replayData 로드 후에야 canvas가 실제로 마운트되므로 이 시점에 다시 부착

  // ── 컨트롤 안내 툴팁 (최초 1회만) ───────────────────────────────────────
  useEffect(() => {
    if (!localStorage.getItem('pkgg_replay_tip_seen')) setShowTip(true)
  }, [])
  const dismissTip = () => {
    localStorage.setItem('pkgg_replay_tip_seen', '1')
    setShowTip(false)
  }

  // ── 데이터 로드 (접근 제어 통과한 경우에만) ────────────────────────────
  useEffect(() => {
    if (accessError || !matchId || !shard) return
    setLoading(true)
    setError(null)
    fetch(`/api/pubg/match-replay?matchId=${matchId}&shard=${shard}`)
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error || '불러오기 실패')))
        return res.json()
      })
      .then((data) => {
        setReplayData(data)
        setCurrentTime(data.boardingStart ?? 0) // 로비/대기 구간은 스킵하고 비행기 탑승 시점부터 재생 시작
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [accessError, matchId, shard])

  // ── 맵 이미지 로드 ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!replayData?.mapName) return
    const src = getMapImage(replayData.mapName)
    if (!src) { setMapImgReady(false); return }
    const img = new Image()
    img.onload = () => setMapImgReady(true)
    img.src = src
    mapImgRef.current = img
  }, [replayData?.mapName])

  // ── 플레이어별 위치 스냅샷 정리 ─────────────────────────────────────────
  const positionsByPlayer = useMemo(() => {
    const map = new Map()
    for (const p of replayData?.positions ?? []) {
      if (!map.has(p.id)) map.set(p.id, [])
      map.get(p.id).push(p)
    }
    for (const arr of map.values()) arr.sort((a, b) => a.t - b.t)
    return map
  }, [replayData])

  const zonesSorted = useMemo(() => {
    return [...(replayData?.zones ?? [])].sort((a, b) => a.t - b.t)
  }, [replayData])

  const nameById = useMemo(() => {
    const map = new Map()
    for (const p of replayData?.players ?? []) map.set(p.id, p.name)
    return map
  }, [replayData])

  // 각 플레이어의 확인사살 시각(첫 킬 기준) — 사망 후 계속 화면에서 사라지게 하는 용도
  const deathTimeByPlayer = useMemo(() => {
    const map = new Map()
    for (const k of replayData?.kills ?? []) {
      if (k.victim && !map.has(k.victim)) map.set(k.victim, k.t)
    }
    return map
  }, [replayData])

  // 각 플레이어의 착지 시각/위치 (LogParachuteLanding 기준) — 이전까지는 비행기/낙하산 단계
  const landingByPlayer = useMemo(() => {
    const map = new Map()
    for (const l of replayData?.landings ?? []) {
      if (l.id && !map.has(l.id)) map.set(l.id, l)
    }
    return map
  }, [replayData])

  // 각 플레이어가 처음 비행기에 탑승한 시각(iv=true 최초 시점) — 낙하산 단계 판별용
  const boardTimeByPlayer = useMemo(() => {
    const map = new Map()
    for (const [id, snapshots] of positionsByPlayer) {
      const first = snapshots.find((s) => s.iv)
      if (first) map.set(id, first.t)
    }
    return map
  }, [positionsByPlayer])

  // 킬로그: 시간순, 재생 시점까지 발생한 것만
  const killLog = useMemo(() => {
    return [...(replayData?.kills ?? [])].sort((a, b) => a.t - b.t)
  }, [replayData])
  const visibleKillLog = useMemo(
    () => killLog.filter((k) => k.t <= currentTime),
    [killLog, currentTime]
  )

  // 본인 닉네임으로 소속 팀 판별 (스쿼드 강조용)
  const highlightTeamId = useMemo(() => {
    if (!nickname || !replayData?.players) return null
    const me = replayData.players.find(
      (p) => p.name?.toLowerCase() === String(nickname).toLowerCase()
    )
    return me?.teamId ?? null
  }, [nickname, replayData])

  // 팀별 그룹핑 (본인 소속 팀을 맨 위로)
  const squadGroups = useMemo(() => {
    const map = new Map()
    for (const p of replayData?.players ?? []) {
      if (!map.has(p.teamId)) map.set(p.teamId, [])
      map.get(p.teamId).push(p)
    }
    return [...map.entries()]
      .map(([teamId, members]) => ({ teamId, members }))
      .sort((a, b) => {
        if (a.teamId === highlightTeamId) return -1
        if (b.teamId === highlightTeamId) return 1
        return a.teamId - b.teamId
      })
  }, [replayData, highlightTeamId])

  // 특정 팀 위치로 카메라(확대/이동) 포커스 이동
  const focusOnTeam = (teamId) => {
    const members = (replayData?.players ?? []).filter((p) => p.teamId === teamId)
    const pts = []
    for (const m of members) {
      const snapshots = positionsByPlayer.get(m.id)
      if (!snapshots) continue
      const pos = interpAt(snapshots, currentTime, ['x', 'y'])
      if (pos) pts.push(pos)
    }
    if (pts.length === 0) return
    const avgX = pts.reduce((s, p) => s + p.x, 0) / pts.length
    const avgY = pts.reduce((s, p) => s + p.y, 0) / pts.length
    const maxCoord = getMaxCoord(replayData.mapName)
    const cx = (avgX / maxCoord) * CANVAS_SIZE
    const cy = (avgY / maxCoord) * CANVAS_SIZE
    const scale = 4
    setTransform({ scale, x: CANVAS_SIZE / 2 - cx * scale, y: CANVAS_SIZE / 2 - cy * scale })
  }

  // 킬로그 새 항목 추가 시 자동 스크롤
  useEffect(() => {
    const el = killLogRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [visibleKillLog.length])

  // ── 재생 루프 (requestAnimationFrame, 배속 반영) ────────────────────────
  useEffect(() => {
    if (!isPlaying || !replayData) return
    lastTsRef.current = null

    function tick(ts) {
      if (lastTsRef.current == null) lastTsRef.current = ts
      const dt = (ts - lastTsRef.current) / 1000
      lastTsRef.current = ts
      setCurrentTime((prev) => {
        const next = prev + dt * speed
        if (next >= replayData.duration) {
          setIsPlaying(false)
          return replayData.duration
        }
        return next
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isPlaying, replayData, speed])

  // ── 캔버스 렌더링 ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !replayData) return
    const ctx = canvas.getContext('2d')
    const mapName = replayData.mapName
    const maxCoord = getMaxCoord(mapName)
    const toPx = (x, y) => ({ px: (x / maxCoord) * CANVAS_SIZE, py: (y / maxCoord) * CANVAS_SIZE })

    // 물리 캔버스 전체를 지운 뒤(항상 단위 변환으로), 확대/이동 변환을 적용해서 그 안에서만 그린다
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.x, transform.y)

    if (mapImgReady && mapImgRef.current) {
      ctx.drawImage(mapImgRef.current, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
    } else {
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    }

    // 자기장 (안전지대 = 파란 원, 다음 예고 = 흰 점선 원)
    const zone = interpAt(zonesSorted, currentTime, [])
    if (zone?.safe) {
      const { px, py } = toPx(zone.safe.x, zone.safe.y)
      const r = (zone.safe.r / maxCoord) * CANVAS_SIZE
      ctx.beginPath()
      ctx.arc(px, py, r, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(59,130,246,0.9)'
      ctx.lineWidth = 2
      ctx.stroke()
    }
    if (zone?.warn) {
      const { px, py } = toPx(zone.warn.x, zone.warn.y)
      const r = (zone.warn.r / maxCoord) * CANVAS_SIZE
      ctx.beginPath()
      ctx.arc(px, py, r, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.stroke()
      ctx.setLineDash([])
    }

    // 비행기 항로 (착지 전 구간에서만 표시) — 실선 궤적 + 이동하는 비행기 아이콘
    const planePath = replayData.planePath
    if (planePath && currentTime <= planePath.t2 + 15) {
      const start = toPx(planePath.x1, planePath.y1)
      const end = toPx(planePath.x2, planePath.y2)
      ctx.beginPath()
      ctx.moveTo(start.px, start.py)
      ctx.lineTo(end.px, end.py)
      ctx.strokeStyle = 'rgba(226,232,240,0.55)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.setLineDash([])

      const ratio = Math.max(0, Math.min(1, (currentTime - planePath.t1) / ((planePath.t2 - planePath.t1) || 1)))
      const px = planePath.x1 + (planePath.x2 - planePath.x1) * ratio
      const py = planePath.y1 + (planePath.y2 - planePath.y1) * ratio
      const planePx = toPx(px, py)
      ctx.save()
      ctx.translate(planePx.px, planePx.py)
      ctx.rotate(Math.atan2(end.py - start.py, end.px - start.px))
      ctx.beginPath()
      ctx.moveTo(9, 0); ctx.lineTo(-7, 5); ctx.lineTo(-4, 0); ctx.lineTo(-7, -5)
      ctx.closePath()
      ctx.fillStyle = '#e2e8f0'
      ctx.fill()
      ctx.restore()
    }

    // 플레이어 위치 — 착지 전(비행기 탑승/낙하산 하강)과 착지 후를 구분해서 표시
    for (const player of replayData.players) {
      const snapshots = positionsByPlayer.get(player.id)
      const deathT = deathTimeByPlayer.get(player.id)
      const isHighlight = highlightTeamId != null && player.teamId === highlightTeamId

      if (deathT != null && currentTime >= deathT) continue // 확인사살 이후엔 점 표시 안 함 (X 이펙트는 아래에서 별도 처리)

      if (!snapshots || snapshots.length === 0) continue
      const pos = interpAt(snapshots, currentTime, ['x', 'y', 'hp'])
      if (!pos) continue
      const { px, py } = toPx(pos.x, pos.y)

      const landing = landingByPlayer.get(player.id)
      const boardT = boardTimeByPlayer.get(player.id)
      const hasLanded = landing != null && currentTime >= landing.t
      const isFalling = !hasLanded && boardT != null && currentTime >= boardT && !pos.iv
      const isOnPlane = !hasLanded && pos.iv

      if (isOnPlane) continue // 비행기 탑승 중엔 위쪽의 공용 비행기 아이콘 하나로만 표시 (개별 점은 생략)

      if (isFalling) {
        // 낙하산 하강 중 — 팀 색 다이아몬드 마커
        const r = scaledRadius(isHighlight ? 7 : 5, transform.scale)
        ctx.beginPath()
        ctx.moveTo(px, py - r); ctx.lineTo(px + r, py); ctx.lineTo(px, py + r); ctx.lineTo(px - r, py)
        ctx.closePath()
        ctx.fillStyle = teamColor(player.teamId)
        ctx.fill()
        ctx.lineWidth = scaledRadius(isHighlight ? 3 : 1.5, transform.scale)
        ctx.strokeStyle = isHighlight ? '#ffffff' : 'rgba(0,0,0,0.6)'
        ctx.stroke()
        continue
      }

      ctx.beginPath()
      ctx.arc(px, py, scaledRadius(isHighlight ? 7 : 5, transform.scale), 0, Math.PI * 2)
      ctx.fillStyle = pos.dbno ? 'rgba(234,88,12,0.9)' : teamColor(player.teamId)
      ctx.fill()
      ctx.lineWidth = scaledRadius(isHighlight ? 3 : 1.5, transform.scale)
      ctx.strokeStyle = isHighlight ? '#ffffff' : 'rgba(0,0,0,0.6)'
      ctx.stroke()
    }

    // 착지 이펙트 — 착지 지점에 잠깐 옅어지는 흰 링 (낙하산 하강 종료 표시)
    // 마커와 동일하게 확대해도 화면상 크기가 일정하도록 scaledRadius 적용 (미적용 시 확대 시 거대한 흰 원으로 보이는 버그 있었음)
    for (const l of replayData.landings ?? []) {
      const fade = 1 - (currentTime - l.t) / 3
      if (fade <= 0 || fade > 1) continue
      const { px, py } = toPx(l.x, l.y)
      ctx.globalAlpha = fade * 0.6
      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = scaledRadius(1, transform.scale)
      ctx.beginPath()
      ctx.arc(px, py, scaledRadius(3 + (1 - fade) * 4, transform.scale), 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // 교전 이펙트: 가해자 → 피해자 방향선 + 화살촉 (피격=파랑, 넉다운=노랑, 확인사살=빨강)
    // 선 굵기/화살촉 크기는 확대와 무관하게 화면상 일정하게 유지
    const drawEngagementLine = (ax, ay, vx, vy, t, color, fadeSec, sizeScale = 1) => {
      const fade = 1 - (currentTime - t) / fadeSec
      if (fade <= 0 || fade > 1) return
      if (ax == null || ay == null || vx == null || vy == null) return
      const a = toPx(ax, ay)
      const v = toPx(vx, vy)
      const angle = Math.atan2(v.py - a.py, v.px - a.px)
      const lineW = scaledRadius(2.5 * sizeScale, transform.scale)
      const headLen = scaledRadius(9 * sizeScale, transform.scale)

      ctx.globalAlpha = fade
      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = lineW
      ctx.beginPath()
      ctx.moveTo(a.px, a.py)
      ctx.lineTo(v.px, v.py)
      ctx.stroke()

      // 피해자 쪽 화살촉
      ctx.save()
      ctx.translate(v.px, v.py)
      ctx.rotate(angle)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-headLen, headLen * 0.5)
      ctx.lineTo(-headLen, -headLen * 0.5)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      ctx.globalAlpha = 1
    }
    // 피격 — 킬/넉다운보다 훨씬 빈번해서 짧게(0.6초)+살짝 얇게 표시해 화면이 지저분해지지 않도록 함
    for (const h of replayData.hits ?? []) {
      if (h.t > currentTime) continue
      drawEngagementLine(h.ax, h.ay, h.vx, h.vy, h.t, '#38bdf8', HIT_FADE_SEC, 0.75)
    }
    for (const d of replayData.downs ?? []) {
      if (d.t > currentTime) continue
      drawEngagementLine(d.ax, d.ay, d.x, d.y, d.t, '#facc15', ENGAGEMENT_FADE_SEC) // 넉다운 = 노란색
    }
    for (const k of replayData.kills ?? []) {
      if (k.t > currentTime) continue
      drawEngagementLine(k.ax, k.ay, k.kx, k.ky, k.t, '#ef4444', ENGAGEMENT_FADE_SEC) // 확인사살 = 빨간색
    }
  }, [currentTime, replayData, mapImgReady, positionsByPlayer, zonesSorted, deathTimeByPlayer, highlightTeamId, landingByPlayer, boardTimeByPlayer, transform])

  const handleSeek = (e) => {
    setCurrentTime(Number(e.target.value))
  }

  const jumpTo = (t) => {
    setCurrentTime(t)
  }

  const alivePlayers = useMemo(() => {
    const zone = interpAt(zonesSorted, currentTime, [])
    return zone?.alivePlayers ?? null
  }, [zonesSorted, currentTime])

  const aliveTeams = useMemo(() => {
    const zone = interpAt(zonesSorted, currentTime, [])
    return zone?.aliveTeams ?? null
  }, [zonesSorted, currentTime])

  // ── 접근 제어 안내 화면 ─────────────────────────────────────────────────
  if (accessError) {
    const GATE = {
      not_logged_in: {
        icon: '🔐',
        title: '로그인이 필요합니다',
        desc: '2D 리플레이는 본인이 참여한 경기에 한해 구글 로그인 후 확인할 수 있습니다.',
        actionLabel: 'Google로 로그인',
        onAction: () => signIn('google'),
      },
      not_linked: {
        icon: '🔗',
        title: 'PUBG 계정 연동이 필요합니다',
        desc: '마이페이지에서 PUBG 닉네임을 먼저 연동해주세요.',
        actionLabel: '마이페이지로 이동',
        onAction: () => router.push('/mypage'),
      },
      not_participant: {
        icon: '🚫',
        title: '본인이 참여한 경기만 리플레이할 수 있습니다',
        desc: '이 매치는 로그인한 계정과 연동된 PUBG 닉네임이 참여한 경기가 아닙니다.',
        actionLabel: '메인으로',
        onAction: () => router.push('/'),
      },
    }[accessError]

    return (
      <Layout>
        <Head>
          <title>매치 리플레이 | PK.GG</title>
        </Head>
        <div className="max-w-2xl mx-auto mt-20 p-6">
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-700 shadow-lg text-center">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">{GATE.icon}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-100 mb-2">{GATE.title}</h1>
            <p className="text-gray-400 mb-8">{GATE.desc}</p>
            <button
              onClick={GATE.onAction}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold"
            >
              {GATE.actionLabel}
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <Head>
        <title>매치 리플레이 | PK.GG</title>
      </Head>
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <h1 className="text-xl font-bold text-gray-100 mb-4">2D 매치 리플레이</h1>

        {loading && <p className="text-gray-400">텔레메트리를 불러오는 중...</p>}
        {error && <p className="text-red-400">오류: {error}</p>}

        {replayData && (
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2 text-sm text-gray-400">
                <span>{replayData.mapName}</span>
                <span>생존 {alivePlayers ?? '-'}명 / {aliveTeams ?? '-'}팀</span>
              </div>

              <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
                <canvas
                  ref={canvasRef}
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  onMouseDown={handleCanvasMouseDown}
                  className="w-full h-full rounded-lg border border-gray-700 bg-gray-900 cursor-grab active:cursor-grabbing"
                />
                <button
                  onClick={resetView}
                  className="absolute top-2 right-2 px-2.5 py-1 text-xs rounded-md bg-gray-900/80 border border-gray-700 text-gray-300 hover:bg-gray-800"
                  title="확대/이동 초기화"
                >
                  🔄 리셋
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5">마우스 휠로 확대/축소, 드래그로 지도를 이동할 수 있어요</p>

              {/* 컨트롤 안내 툴팁 (최초 1회) */}
              {showTip && (
                <div className="mt-4 flex items-start gap-2 bg-blue-950/60 border border-blue-800 rounded-lg px-3 py-2.5 text-xs text-blue-200">
                  <span className="text-base leading-none mt-0.5">💡</span>
                  <ul className="flex-1 space-y-1 leading-relaxed">
                    <li>▶ 버튼으로 재생/일시정지할 수 있어요</li>
                    <li>타임라인을 드래그하면 원하는 시점으로 바로 이동합니다</li>
                    <li>배속 버튼(1x~8x)으로 재생 속도를 조절할 수 있어요</li>
                  </ul>
                  <button
                    onClick={dismissTip}
                    className="text-blue-300 hover:text-white shrink-0 px-1"
                    aria-label="안내 닫기"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* 재생 컨트롤 */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsPlaying((p) => !p)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 text-white shrink-0"
                >
                  {isPlaying ? '❚❚' : '▶'}
                </button>
                <span className="text-sm text-gray-400 shrink-0 w-24 text-center">
                  {formatTime(currentTime)} / {formatTime(replayData.duration)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={replayData.duration}
                  step={1}
                  value={Math.floor(currentTime)}
                  onChange={handleSeek}
                  className="flex-1 min-w-[140px]"
                />
                <div className="flex gap-1 shrink-0">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-2.5 py-1 text-xs rounded-md border ${
                        speed === s
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 사이드 패널: 스쿼드 목록 / 킬로그 탭 */}
            <div className="w-full lg:w-64 shrink-0">
              <div className="flex gap-1 mb-2">
                <button
                  onClick={() => setSidePanelTab('squads')}
                  className={`flex-1 px-2 py-1.5 text-xs font-semibold rounded-md ${
                    sidePanelTab === 'squads' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  스쿼드 목록
                </button>
                <button
                  onClick={() => setSidePanelTab('kills')}
                  className={`flex-1 px-2 py-1.5 text-xs font-semibold rounded-md ${
                    sidePanelTab === 'kills' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  킬로그 ({visibleKillLog.length})
                </button>
              </div>

              {sidePanelTab === 'squads' && (
                <div className="h-64 lg:h-[600px] overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg divide-y divide-gray-800">
                  {squadGroups.map(({ teamId, members }) => (
                    <button
                      key={teamId}
                      onClick={() => focusOnTeam(teamId)}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-800 transition-colors ${
                        teamId === highlightTeamId ? 'bg-blue-950/40' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: teamColor(teamId) }}
                        />
                        <span className="text-[11px] text-gray-500">팀 {teamId}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 pl-4">
                        {members.map((m, i) => {
                          const deathT = deathTimeByPlayer.get(m.id)
                          const isDead = deathT != null && currentTime >= deathT
                          return (
                            <span
                              key={m.id}
                              className={`text-xs ${
                                isDead ? 'text-gray-600 line-through' : 'text-gray-200'
                              }`}
                            >
                              {i + 1}번 {m.clanTag ? `[${m.clanTag}] ` : ''}{m.name}
                            </span>
                          )
                        })}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {sidePanelTab === 'kills' && (
                <div
                  ref={killLogRef}
                  className="h-64 lg:h-[600px] overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg divide-y divide-gray-800"
                >
                  {visibleKillLog.length === 0 && (
                    <p className="text-xs text-gray-500 p-3">아직 발생한 킬이 없습니다.</p>
                  )}
                  {visibleKillLog.map((k, i) => (
                    <button
                      key={`${k.t}-${k.victim}-${i}`}
                      onClick={() => jumpTo(k.t)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-800 transition-colors"
                    >
                      <div className="text-gray-500">{formatTime(k.t)}</div>
                      <div className="text-gray-200">
                        <span className="text-cyan-400">{nameById.get(k.killer) || '알 수 없음'}</span>
                        {' → '}
                        <span className="text-red-400">{nameById.get(k.victim) || '알 수 없음'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
