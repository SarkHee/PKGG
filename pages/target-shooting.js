// pages/target-shooting.js — FPS 스타일 표적 사격 미니게임 (두더지잡기 방식, 60초, 닉네임 리더보드)
import Head from 'next/head'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import Header from '../components/layout/Header'

const CW = 960
const CH = 540
const GAME_SECS = 60
const HIT_SCORE = 10
const NICK_KEY = 'pkgg_shooting_nickname'
const OVERLAP_PADDING = 6 // 표적끼리 최소 이 간격만큼은 떨어뜨려서 배치

function lerp(a, b, t) {
  return a + (b - a) * Math.min(1, Math.max(0, t))
}

// 경과 비율(0~1)에 따른 난이도 곡선 — 표적 생존시간/크기는 줄고, 동시 표적 수는 늘어난다
function lifetimeMsAt(progress) { return lerp(1400, 500, progress) }
function radiusAt(progress) { return lerp(42, 26, progress) }
function maxConcurrentAt(progress) { return Math.floor(lerp(3, 5.9, progress)) } // 시작 3개 → 막판 5개
function spawnIntervalMsAt(progress) { return lerp(500, 260, progress) }

function formatTime(sec) {
  const s = Math.max(0, Math.ceil(sec))
  return `0:${String(s).padStart(2, '0')}`
}

export default function TargetShootingPage() {
  const { data: session } = useSession()
  const [screen, setScreen] = useState('menu') // menu | playing | result
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_SECS)
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [nickname, setNickname] = useState('')
  const [submitState, setSubmitState] = useState('idle') // idle | submitting | done | error
  const [submitError, setSubmitError] = useState('')
  const [bestScoreInfo, setBestScoreInfo] = useState(null) // { updated, bestScore }
  const [linkedNickname, setLinkedNickname] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const linkedNicknameRef = useRef(null)
  useEffect(() => { linkedNicknameRef.current = linkedNickname }, [linkedNickname])

  const canvasRef = useRef(null)
  const gameAreaRef = useRef(null)
  const targetsRef = useRef([]) // { id, x, y, r, bornAt, lifeMs }
  const hitEffectsRef = useRef([]) // { x, y, bornAt }
  const scoreRef = useRef(0)
  const rafRef = useRef(null)
  const spawnTORef = useRef(null)
  const tickIntervalRef = useRef(null)
  const startTimeRef = useRef(0)
  const mouseRef = useRef({ x: CW / 2, y: CH / 2, inside: false })
  const nextIdRef = useRef(1)

  // 닉네임 기억 (직접 입력용 기본값)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NICK_KEY)
      if (saved) setNickname(saved)
    } catch {}
  }, [])

  // 로그인 + PUBG 계정 연동 여부 확인 → 연동 닉네임 있으면 기본 모드로 사용
  useEffect(() => {
    if (!session) { setLinkedNickname(null); return }
    fetch('/api/user/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const accounts = data?.user?.pubgAccounts || []
        const main = accounts.find((a) => a.id === data.user.mainAccountId) || accounts[0]
        if (main?.nickname) setLinkedNickname(main.nickname)
      })
      .catch(() => {})
  }, [session])

  const fetchLeaderboard = useCallback(() => {
    setLeaderboardLoading(true)
    fetch('/api/target-shooting/leaderboard')
      .then((r) => r.json())
      .then((d) => setLeaderboard(d.leaderboard || []))
      .catch(() => {})
      .finally(() => setLeaderboardLoading(false))
  }, [])

  useEffect(() => { fetchLeaderboard() }, [fetchLeaderboard])

  // ── 전체화면 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      gameAreaRef.current?.requestFullscreen?.()
    }
  }

  const getCanvasPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const ratio = CW / rect.width
    return { x: (e.clientX - rect.left) * ratio, y: (e.clientY - rect.top) * ratio }
  }

  // 기존 표적들과 최소 간격을 두고 배치될 위치를 몇 번 시도해서 찾는다 (다 실패하면 마지막 시도 위치라도 사용)
  const findSpawnPosition = (r) => {
    let best = null
    for (let attempt = 0; attempt < 20; attempt++) {
      const x = lerp(r + 10, CW - r - 10, Math.random())
      const y = lerp(r + 10, CH - r - 10, Math.random())
      const overlaps = targetsRef.current.some((t) => {
        const dx = x - t.x, dy = y - t.y
        const minDist = t.r + r + OVERLAP_PADDING
        return dx * dx + dy * dy < minDist * minDist
      })
      if (!overlaps) return { x, y }
      best = { x, y }
    }
    return best
  }

  const spawnTarget = useCallback((progress) => {
    const r = radiusAt(progress)
    const pos = findSpawnPosition(r)
    targetsRef.current.push({
      id: nextIdRef.current++,
      x: pos.x, y: pos.y, r,
      bornAt: performance.now(),
      lifeMs: lifetimeMsAt(progress),
    })
  }, [])

  const scheduleSpawn = useCallback(() => {
    const elapsed = (performance.now() - startTimeRef.current) / 1000
    const progress = Math.min(1, elapsed / GAME_SECS)
    if (targetsRef.current.length < maxConcurrentAt(progress)) {
      spawnTarget(progress)
    }
    spawnTORef.current = setTimeout(scheduleSpawn, spawnIntervalMsAt(progress))
  }, [spawnTarget])

  // ── 렌더 루프 ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'playing') return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    function draw() {
      const now = performance.now()

      // 배경
      const grd = ctx.createRadialGradient(CW / 2, CH / 2, 40, CW / 2, CH / 2, CW * 0.7)
      grd.addColorStop(0, '#111827')
      grd.addColorStop(1, '#030712')
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, CW, CH)
      ctx.strokeStyle = 'rgba(148,163,184,0.06)'
      ctx.lineWidth = 1
      for (let x = 0; x <= CW; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke() }
      for (let y = 0; y <= CH; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke() }

      // 만료된 표적 제거 (놓침 — 감점 없음)
      targetsRef.current = targetsRef.current.filter((t) => now - t.bornAt < t.lifeMs)

      // 표적 그리기 (남은 시간 링 포함)
      for (const t of targetsRef.current) {
        const remain = 1 - (now - t.bornAt) / t.lifeMs
        ctx.beginPath()
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(239,68,68,0.85)'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(t.x, t.y, t.r * 0.45, 0, Math.PI * 2)
        ctx.fillStyle = '#fff5f5'
        ctx.fill()
        // 남은 생존시간 링
        ctx.beginPath()
        ctx.arc(t.x, t.y, t.r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remain)
        ctx.strokeStyle = '#fde047'
        ctx.lineWidth = 3
        ctx.stroke()
      }

      // 히트마커 이펙트 (붉은 X, 빠르게 페이드아웃)
      hitEffectsRef.current = hitEffectsRef.current.filter((h) => now - h.bornAt < 250)
      for (const h of hitEffectsRef.current) {
        const fade = 1 - (now - h.bornAt) / 250
        const size = 14 + (1 - fade) * 6
        ctx.globalAlpha = fade
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.moveTo(h.x - size, h.y - size); ctx.lineTo(h.x + size, h.y + size)
        ctx.moveTo(h.x + size, h.y - size); ctx.lineTo(h.x - size, h.y + size)
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      // 커스텀 크로스헤어 커서
      if (mouseRef.current.inside) {
        const { x, y } = mouseRef.current
        ctx.strokeStyle = '#22d3ee'
        ctx.lineWidth = 2
        const gap = 5, len = 9
        ctx.beginPath()
        ctx.moveTo(x - gap - len, y); ctx.lineTo(x - gap, y)
        ctx.moveTo(x + gap, y); ctx.lineTo(x + gap + len, y)
        ctx.moveTo(x, y - gap - len); ctx.lineTo(x, y - gap)
        ctx.moveTo(x, y + gap); ctx.lineTo(x, y + gap + len)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(x, y, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = '#22d3ee'
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [screen])

  // 서버에 점수 기록 (닉네임 있으면 즉시 호출 — 연동 유저는 게임 종료 즉시, 익명 유저는 닉네임 입력 확인 즉시)
  const submitScore = useCallback(async (nick) => {
    setSubmitState('submitting')
    setSubmitError('')
    try {
      const res = await fetch('/api/target-shooting/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nick, score: scoreRef.current }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '기록 저장 실패')
      if (!linkedNicknameRef.current) {
        try { localStorage.setItem(NICK_KEY, nick) } catch {}
      }
      setBestScoreInfo({ updated: data.updated, bestScore: data.bestScore })
      setSubmitState('done')
      fetchLeaderboard()
    } catch (err) {
      setSubmitError(err.message)
      setSubmitState('error')
    }
  }, [fetchLeaderboard])

  const endGame = useCallback(() => {
    clearTimeout(spawnTORef.current)
    clearInterval(tickIntervalRef.current)
    cancelAnimationFrame(rafRef.current)
    targetsRef.current = []
    hitEffectsRef.current = []
    setScreen('result')
    if (linkedNicknameRef.current) {
      submitScore(linkedNicknameRef.current) // 연동 유저는 별도 입력 없이 즉시 자동 기록
    }
  }, [submitScore])

  const startGame = () => {
    setScore(0)
    scoreRef.current = 0
    setSubmitState('idle')
    setSubmitError('')
    setBestScoreInfo(null)
    targetsRef.current = []
    hitEffectsRef.current = []
    setTimeLeft(GAME_SECS)
    setScreen('playing')
    startTimeRef.current = performance.now()

    // 시작하자마자 최소 동시 표적 수만큼 바로 채워서 대기 없이 시작
    for (let i = 0; i < maxConcurrentAt(0); i++) spawnTarget(0)
    scheduleSpawn()
    tickIntervalRef.current = setInterval(() => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000
      const remain = GAME_SECS - elapsed
      setTimeLeft(remain)
      if (remain <= 0) endGame()
    }, 100)
  }

  useEffect(() => () => {
    clearTimeout(spawnTORef.current)
    clearInterval(tickIntervalRef.current)
    cancelAnimationFrame(rafRef.current)
  }, [])

  const handleCanvasMouseMove = (e) => {
    const { x, y } = getCanvasPos(e)
    mouseRef.current = { x, y, inside: true }
  }
  const handleCanvasMouseLeave = () => { mouseRef.current.inside = false }

  const handleCanvasClick = (e) => {
    if (screen !== 'playing') return
    const { x, y } = getCanvasPos(e)
    const list = targetsRef.current
    for (let i = list.length - 1; i >= 0; i--) {
      const t = list[i]
      const dx = x - t.x, dy = y - t.y
      if (dx * dx + dy * dy <= t.r * t.r) {
        list.splice(i, 1)
        hitEffectsRef.current.push({ x: t.x, y: t.y, bornAt: performance.now() })
        scoreRef.current += HIT_SCORE
        setScore(scoreRef.current)
        return
      }
    }
  }

  const handleManualSubmit = () => {
    const trimmed = nickname.trim()
    if (!trimmed || submitState === 'submitting') return
    submitScore(trimmed)
  }
  const handleNicknameKeyDown = (e) => {
    if (e.key === 'Enter') handleManualSubmit()
  }

  const rankBadge = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`)

  return (
    <>
      <Head>
        <title>타겟프랙티스 | PK.GG</title>
        <meta name="description" content="60초 동안 랜덤으로 나타나는 표적을 맞춰 점수를 겨루는 미니게임" />
      </Head>
      <Header />
      <div className="min-h-screen bg-gray-950 text-white px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">🎯 타겟프랙티스</h1>
          <p className="text-sm text-gray-400 mb-6">
            60초 동안 랜덤하게 나타나는 표적을 최대한 많이 맞춰보세요. 시간이 지날수록 표적이 빨리 사라지고 개수도 늘어납니다.
          </p>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* 게임 영역 (전체화면 대상) */}
            <div className="flex-1 min-w-0">
              <div
                ref={gameAreaRef}
                className="relative w-full rounded-xl overflow-hidden border border-gray-800 bg-gray-950"
                style={{ aspectRatio: `${CW} / ${CH}` }}
              >
                {/* 전체화면 토글 — 항상 우상단에 노출 */}
                <button
                  onClick={toggleFullscreen}
                  className="absolute top-2 right-2 z-10 px-2.5 py-1.5 rounded-md bg-black/50 hover:bg-black/70 text-xs text-gray-200 transition-colors"
                >
                  {isFullscreen ? '⤢ 전체화면 종료' : '⛶ 전체화면'}
                </button>

                {screen === 'playing' && (
                  <>
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-2 text-sm">
                      <span className="font-semibold text-cyan-400 bg-black/50 px-2.5 py-1 rounded-md">점수 {score}</span>
                      <span className="font-mono text-gray-200 bg-black/50 px-2.5 py-1 rounded-md">{formatTime(timeLeft)}</span>
                    </div>
                    <canvas
                      ref={canvasRef}
                      width={CW}
                      height={CH}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseLeave={handleCanvasMouseLeave}
                      onClick={handleCanvasClick}
                      style={{ cursor: 'none', display: 'block', width: '100%', height: '100%' }}
                    />
                  </>
                )}

                {screen === 'menu' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-gray-900">
                    <div className="text-5xl">🎯</div>
                    <div className="text-center text-sm text-gray-400 max-w-xs leading-relaxed">
                      원형 표적이 짧게 나타났다 사라집니다.<br />
                      제한시간 60초, 명중당 {HIT_SCORE}점!
                    </div>
                    <button
                      onClick={startGame}
                      className="px-8 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-lg transition-colors"
                    >
                      시작하기
                    </button>
                  </div>
                )}

                {screen === 'result' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-900 px-6">
                    <div className="text-sm text-gray-400">최종 점수</div>
                    <div className="text-5xl font-extrabold text-cyan-400">{score}</div>

                    {linkedNickname ? (
                      // 연동 유저 — 입력 UI 없이 자동 기록, 상태만 표시
                      <div className="text-center text-sm">
                        {submitState === 'submitting' && <p className="text-gray-400">기록 저장 중...</p>}
                        {submitState === 'done' && bestScoreInfo && (
                          <p className={bestScoreInfo.updated ? 'text-emerald-400' : 'text-gray-400'}>
                            {bestScoreInfo.updated
                              ? '🎉 신기록으로 등록되었습니다!'
                              : `이전 최고 기록(${bestScoreInfo.bestScore}점)이 더 높아 유지됩니다.`}
                          </p>
                        )}
                        {submitState === 'error' && <p className="text-red-400">{submitError}</p>}
                      </div>
                    ) : submitState !== 'done' ? (
                      <div className="flex flex-col items-center gap-2 w-full max-w-xs mt-2">
                        <input
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          onKeyDown={handleNicknameKeyDown}
                          maxLength={20}
                          placeholder="닉네임 입력"
                          autoFocus
                          className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                        />
                        {submitState === 'error' && <p className="text-xs text-red-400">{submitError}</p>}
                        <button
                          onClick={handleManualSubmit}
                          disabled={submitState === 'submitting' || !nickname.trim()}
                          className="w-full px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm transition-colors"
                        >
                          {submitState === 'submitting' ? '저장 중...' : '확인'}
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-emerald-400">✓ 기록이 등록되었습니다!</p>
                    )}

                    <button
                      onClick={startGame}
                      className="mt-2 px-6 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium transition-colors"
                    >
                      다시 하기
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 리더보드 */}
            <div className="w-full lg:w-72 shrink-0">
              <h2 className="text-sm font-semibold text-gray-300 mb-2">🏆 TOP 10</h2>
              <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800 overflow-hidden">
                {leaderboardLoading ? (
                  <p className="text-xs text-gray-500 p-4 text-center">불러오는 중...</p>
                ) : leaderboard.length === 0 ? (
                  <p className="text-xs text-gray-500 p-4 text-center">아직 등록된 기록이 없습니다.</p>
                ) : (
                  leaderboard.map((row, i) => (
                    <div key={row.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 text-center text-xs text-gray-400 shrink-0">{rankBadge(i)}</span>
                        <span className="truncate text-gray-200">{row.nickname}</span>
                        {row.verified && (
                          <span className="text-cyan-400 text-xs shrink-0" title="연동 계정으로 등록된 기록">✓</span>
                        )}
                      </div>
                      <span className="font-mono font-semibold text-cyan-400 shrink-0">{row.score}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
