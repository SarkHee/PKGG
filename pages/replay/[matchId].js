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
const EFFECT_FADE_SEC = 5
const SPEEDS = [1, 2, 4, 8]

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

  const canvasRef = useRef(null)
  const mapImgRef = useRef(null)
  const [mapImgReady, setMapImgReady] = useState(false)
  const rafRef = useRef(null)
  const lastTsRef = useRef(null)
  const killLogRef = useRef(null)

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
        setCurrentTime(0)
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

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

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

    // 플레이어 위치
    for (const player of replayData.players) {
      const snapshots = positionsByPlayer.get(player.id)
      const deathT = deathTimeByPlayer.get(player.id)
      const isHighlight = highlightTeamId != null && player.teamId === highlightTeamId

      if (deathT != null && currentTime >= deathT) continue // 확인사살 이후엔 점 표시 안 함 (X 이펙트는 아래에서 별도 처리)

      if (!snapshots || snapshots.length === 0) continue
      const pos = interpAt(snapshots, currentTime, ['x', 'y', 'hp'])
      if (!pos) continue
      const { px, py } = toPx(pos.x, pos.y)

      ctx.beginPath()
      ctx.arc(px, py, isHighlight ? 7 : 5, 0, Math.PI * 2)
      ctx.fillStyle = pos.dbno ? 'rgba(234,88,12,0.9)' : teamColor(player.teamId)
      ctx.fill()
      ctx.lineWidth = isHighlight ? 3 : 1.5
      ctx.strokeStyle = isHighlight ? '#ffffff' : 'rgba(0,0,0,0.6)'
      ctx.stroke()
    }

    // 킬 이펙트: 넉다운(노란 X) / 확인사살(빨간 X) — 발생 후 5초간 페이드아웃
    const drawEffectX = (x, y, t, color) => {
      const fade = 1 - (currentTime - t) / EFFECT_FADE_SEC
      if (fade <= 0 || fade > 1) return
      const { px, py } = toPx(x, y)
      ctx.globalAlpha = fade
      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(px - 7, py - 7); ctx.lineTo(px + 7, py + 7)
      ctx.moveTo(px + 7, py - 7); ctx.lineTo(px - 7, py + 7)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    for (const d of replayData.downs ?? []) {
      if (d.x == null || d.y == null || d.t > currentTime) continue
      drawEffectX(d.x, d.y, d.t, '#facc15') // 넉다운 = 노란색
    }
    for (const k of replayData.kills ?? []) {
      if (k.kx == null || k.ky == null || k.t > currentTime) continue
      drawEffectX(k.kx, k.ky, k.t, '#ef4444') // 확인사살 = 빨간색
    }
  }, [currentTime, replayData, mapImgReady, positionsByPlayer, zonesSorted, deathTimeByPlayer, highlightTeamId])

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
                  className="w-full h-full rounded-lg border border-gray-700 bg-gray-900"
                />
              </div>

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

            {/* 킬로그 사이드 패널 */}
            <div className="w-full lg:w-64 shrink-0">
              <h2 className="text-sm font-semibold text-gray-300 mb-2">킬로그 ({visibleKillLog.length})</h2>
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
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
