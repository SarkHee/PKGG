// pages/aim-trainer.js — PUBG 에임 트레이너
import Head from 'next/head';
import { useState, useRef, useEffect, useCallback } from 'react';
import Header from '../components/layout/Header';

const GAME_SECS       = 30;
const REACTION_ROUNDS = 5;
const CW              = 1200; // canvas internal width
const CH              = 480;  // canvas internal height
const CANVAS_CSS      = { display: 'block', width: '100%', height: 'auto' };

const MODES = [
  { id: 'reaction', label: '반응속도',   icon: '⚡', desc: '초록으로 바뀌면 즉시 클릭 · 5라운드' },
  { id: 'flicker',  label: '플리커 에임', icon: '🎯', desc: '나타나는 원을 최대한 빨리 적중 · 30초' },
  { id: 'tracking', label: '이동 타겟',  icon: '🔴', desc: '움직이는 타겟을 클릭 · 30초' },
];

// ── 배경 그리기 유틸 ───────────────────────────────────────────────────────
function drawBg(ctx, w, h) {
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y <= h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
}

// ── 클릭 캔버스 좌표 변환 ──────────────────────────────────────────────────
function canvasCoords(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (CW / rect.width),
    y: (e.clientY - rect.top)  * (CH / rect.height),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// ── 반응속도 게임 ─────────────────────────────────────────────────────────
function ReactionGame({ onDone }) {
  const [phase, setPhase]   = useState('start'); // start|waiting|go|early|between
  const [round, setRound]   = useState(0);
  const [times, setTimes]   = useState([]);
  const [lastMs, setLastMs] = useState(null);
  const t0Ref   = useRef(null);
  const toRef   = useRef(null);
  const timesRef = useRef([]);

  const beginWait = useCallback(() => {
    setPhase('waiting');
    const delay = 1500 + Math.random() * 3000;
    toRef.current = setTimeout(() => {
      setPhase('go');
      t0Ref.current = performance.now();
    }, delay);
  }, []);

  const recordTime = useCallback((ms) => {
    const next = [...timesRef.current, ms];
    timesRef.current = next;
    setTimes(next);
    return next;
  }, []);

  const handleStart = () => { setRound(1); timesRef.current = []; beginWait(); };

  const handleClick = useCallback(() => {
    if (phase === 'go') {
      const ms = performance.now() - t0Ref.current;
      setLastMs(ms);
      const next = recordTime(ms);
      if (next.length >= REACTION_ROUNDS) { onDone({ mode: 'reaction', times: next }); return; }
      setRound(r => r + 1);
      setPhase('between');
      setTimeout(beginWait, 900);
    } else if (phase === 'waiting') {
      clearTimeout(toRef.current);
      const next = recordTime(999);
      setLastMs(null);
      if (next.length >= REACTION_ROUNDS) { onDone({ mode: 'reaction', times: next }); return; }
      setRound(r => r + 1);
      setPhase('early');
      setTimeout(beginWait, 1300);
    }
  }, [phase, recordTime, beginWait, onDone]);

  useEffect(() => () => clearTimeout(toRef.current), []);

  const bgCls = phase === 'go'    ? 'bg-green-600 cursor-pointer'
              : phase === 'early' ? 'bg-red-800/80'
              : phase === 'waiting' ? 'bg-gray-900 cursor-pointer'
              : 'bg-gray-900';

  if (phase === 'start') return (
    <div className="flex items-center justify-center bg-gray-900 border border-gray-700 rounded-2xl" style={{ height: CH / 2 }}>
      <div className="text-center">
        <div className="text-5xl mb-3">⚡</div>
        <p className="text-white font-bold text-xl mb-1">반응속도 테스트</p>
        <p className="text-gray-400 text-sm mb-6">초록으로 바뀌면 즉시 클릭 · {REACTION_ROUNDS}라운드</p>
        <button onClick={handleStart} className="px-10 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all">시작</button>
      </div>
    </div>
  );

  return (
    <div
      className={`relative rounded-2xl select-none transition-colors ${bgCls}`}
      style={{ height: CH / 2 }}
      onClick={handleClick}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        {/* 라운드 도트 */}
        <div className="flex gap-2">
          {Array.from({ length: REACTION_ROUNDS }, (_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full transition-all ${
              i < timesRef.current.length ? 'bg-white'
              : i === timesRef.current.length ? 'bg-white/40' : 'bg-white/12'
            }`} />
          ))}
        </div>
        <div className="text-xs text-white/40">{round} / {REACTION_ROUNDS}</div>

        {phase === 'waiting' && <p className="text-white/70 font-bold text-2xl">기다리세요...</p>}
        {phase === 'go'      && <p className="text-white font-black text-5xl drop-shadow-lg">지금!</p>}
        {phase === 'early'   && <p className="text-red-200 font-bold text-2xl">너무 일찍! — 패널티 +999ms</p>}
        {phase === 'between' && lastMs != null && (
          <div className="text-center">
            <p className="text-green-300 font-black text-3xl">{Math.round(lastMs)}ms</p>
            <p className="text-white/40 text-xs mt-1">다음 라운드 준비 중...</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── 플리커 에임 게임 ──────────────────────────────────────────────────────
const FR  = 28;   // target radius
const TTL = 2300; // target lifetime ms

function FlickerGame({ onDone }) {
  const canvasRef = useRef(null);
  const st        = useRef({ targets: [], hits: 0, shots: 0, timeLeft: GAME_SECS, active: false });
  const rafRef    = useRef(null);
  const tmrRef    = useRef(null);
  const [uiTime, setUiTime] = useState(GAME_SECS);
  const [uiHits, setUiHits] = useState(0);
  const [phase,  setPhase]  = useState('idle');

  const spawn = useCallback(() => {
    const pad = FR + 24;
    st.current.targets.push({ x: pad + Math.random() * (CW - pad * 2), y: pad + Math.random() * (CH - pad * 2), born: performance.now() });
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const now = performance.now();
    drawBg(ctx, CW, CH);

    st.current.targets = st.current.targets.filter(t => now - t.born < TTL);
    if (st.current.active && st.current.targets.length < 2) spawn();

    st.current.targets.forEach(t => {
      const ratio = 1 - (now - t.born) / TTL;
      const hue = ratio * 110;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = `hsl(${hue},85%,60%)`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(t.x, t.y, FR, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `hsla(${hue},85%,60%,.12)`; ctx.fill();
      ctx.fillStyle = `hsl(${hue},85%,72%)`; ctx.globalAlpha = ratio;
      ctx.beginPath(); ctx.arc(t.x, t.y, 3, 0, Math.PI * 2); ctx.fill();
      // timer arc
      ctx.strokeStyle = `hsl(${hue},85%,60%)`; ctx.lineWidth = 2; ctx.globalAlpha = .3;
      ctx.beginPath(); ctx.arc(t.x, t.y, FR + 7, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2); ctx.stroke();
      ctx.restore();
    });

    rafRef.current = requestAnimationFrame(draw);
  }, [spawn]);

  const start = useCallback(() => {
    Object.assign(st.current, { targets: [], hits: 0, shots: 0, timeLeft: GAME_SECS, active: true });
    setUiHits(0); setUiTime(GAME_SECS); setPhase('playing');
    spawn(); spawn();
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
    let elapsed = 0;
    const sid = setInterval(spawn, 1400);
    const tid = setInterval(() => {
      const left = GAME_SECS - ++elapsed;
      st.current.timeLeft = left; setUiTime(left);
      if (left <= 0) {
        clearInterval(sid); clearInterval(tid);
        st.current.active = false;
        setTimeout(() => { cancelAnimationFrame(rafRef.current); setPhase('done'); onDone({ mode: 'flicker', hits: st.current.hits, shots: st.current.shots }); }, 350);
      }
    }, 1000);
    tmrRef.current = { sid, tid };
  }, [spawn, draw, onDone]);

  const handleClick = useCallback((e) => {
    if (!st.current.active) return;
    const { x, y } = canvasCoords(e, canvasRef.current);
    st.current.shots++;
    let hit = false;
    st.current.targets = st.current.targets.filter(t => {
      if (Math.hypot(t.x - x, t.y - y) < FR) { hit = true; return false; }
      return true;
    });
    if (hit) { st.current.hits++; setUiHits(st.current.hits); spawn(); }
  }, [spawn]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    if (tmrRef.current) { clearInterval(tmrRef.current.sid); clearInterval(tmrRef.current.tid); }
  }, []);

  return (
    <div className="relative w-full">
      <canvas ref={canvasRef} width={CW} height={CH} style={CANVAS_CSS} className="rounded-2xl cursor-crosshair" onClick={handleClick} />
      {phase === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 rounded-2xl">
          <div className="text-center">
            <div className="text-5xl mb-3">🎯</div>
            <p className="text-white font-bold text-xl mb-1">플리커 에임</p>
            <p className="text-gray-400 text-sm mb-6">나타나는 원을 클릭 · 30초 타임어택</p>
            <button onClick={start} className="px-10 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all">시작</button>
          </div>
        </div>
      )}
      {phase === 'playing' && (
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="bg-black/65 text-yellow-400 font-mono text-sm px-3 py-1.5 rounded-lg">{uiTime}s</span>
          <span className="bg-black/65 text-emerald-400 font-mono text-sm px-3 py-1.5 rounded-lg">💥 {uiHits}</span>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── 이동 타겟 게임 ────────────────────────────────────────────────────────
const TR    = 30;   // target radius
const SPEED = 200;  // px/s

function TrackingGame({ onDone }) {
  const canvasRef = useRef(null);
  const st        = useRef({ x: CW / 2, y: CH / 2, vx: SPEED, vy: SPEED * 0.65, hits: 0, shots: 0, active: false, timeLeft: GAME_SECS, last: 0 });
  const rafRef    = useRef(null);
  const tmrRef    = useRef(null);
  const [uiTime, setUiTime] = useState(GAME_SECS);
  const [uiHits, setUiHits] = useState(0);
  const [phase,  setPhase]  = useState('idle');

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const now = performance.now();
    const dt = (now - (st.current.last || now)) / 1000;
    st.current.last = now;

    if (st.current.active) {
      st.current.x += st.current.vx * dt;
      st.current.y += st.current.vy * dt;
      if (st.current.x < TR || st.current.x > CW - TR) { st.current.vx *= -1; st.current.x = Math.max(TR, Math.min(CW - TR, st.current.x)); }
      if (st.current.y < TR || st.current.y > CH - TR) { st.current.vy *= -1; st.current.y = Math.max(TR, Math.min(CH - TR, st.current.y)); }
    }

    drawBg(ctx, CW, CH);
    const { x, y } = st.current;
    // outer glow
    ctx.save();
    ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 12;
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.5; ctx.globalAlpha = .9;
    ctx.beginPath(); ctx.arc(x, y, TR, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    // fill
    ctx.fillStyle = 'rgba(239,68,68,.10)';
    ctx.beginPath(); ctx.arc(x, y, TR, 0, Math.PI * 2); ctx.fill();
    // inner
    ctx.strokeStyle = '#fca5a5'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, TR * 0.45, 0, Math.PI * 2); ctx.stroke();
    // crosshair lines inside
    ctx.strokeStyle = 'rgba(255,160,160,.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - TR + 6, y); ctx.lineTo(x + TR - 6, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - TR + 6); ctx.lineTo(x, y + TR - 6); ctx.stroke();
    // center dot
    ctx.fillStyle = '#f87171';
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  const start = useCallback(() => {
    Object.assign(st.current, { x: CW / 2, y: CH / 2, vx: SPEED, vy: SPEED * 0.65, hits: 0, shots: 0, active: true, timeLeft: GAME_SECS, last: performance.now() });
    setUiHits(0); setUiTime(GAME_SECS); setPhase('playing');
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
    let elapsed = 0;
    const tid = setInterval(() => {
      const left = GAME_SECS - ++elapsed;
      st.current.timeLeft = left; setUiTime(left);
      if (left <= 0) {
        clearInterval(tid); st.current.active = false;
        setTimeout(() => { cancelAnimationFrame(rafRef.current); setPhase('done'); onDone({ mode: 'tracking', hits: st.current.hits, shots: st.current.shots }); }, 300);
      }
    }, 1000);
    tmrRef.current = tid;
  }, [draw, onDone]);

  const handleClick = useCallback((e) => {
    if (!st.current.active) return;
    const { x, y } = canvasCoords(e, canvasRef.current);
    st.current.shots++;
    if (Math.hypot(st.current.x - x, st.current.y - y) < TR) {
      st.current.hits++;
      setUiHits(st.current.hits);
      const a = Math.random() * Math.PI * 2;
      st.current.vx = SPEED * Math.cos(a);
      st.current.vy = SPEED * Math.sin(a);
    }
  }, []);

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); clearInterval(tmrRef.current); }, []);

  return (
    <div className="relative w-full">
      <canvas ref={canvasRef} width={CW} height={CH} style={CANVAS_CSS} className="rounded-2xl cursor-crosshair" onClick={handleClick} />
      {phase === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 rounded-2xl">
          <div className="text-center">
            <div className="text-5xl mb-3">🔴</div>
            <p className="text-white font-bold text-xl mb-1">이동 타겟</p>
            <p className="text-gray-400 text-sm mb-6">움직이는 타겟을 최대한 많이 클릭 · 30초</p>
            <button onClick={start} className="px-10 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all">시작</button>
          </div>
        </div>
      )}
      {phase === 'playing' && (
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="bg-black/65 text-yellow-400 font-mono text-sm px-3 py-1.5 rounded-lg">{uiTime}s</span>
          <span className="bg-black/65 text-emerald-400 font-mono text-sm px-3 py-1.5 rounded-lg">💥 {uiHits}</span>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── 결과 화면 ─────────────────────────────────────────────────────────────
function Results({ result, onRetry }) {
  const [copied, setCopied] = useState(false);

  let mainVal, mainLabel, subStats, rating;

  if (result.mode === 'reaction') {
    const valid = result.times.filter(t => t < 900);
    const avg   = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 999;
    const best  = valid.length ? Math.round(Math.min(...valid)) : 999;
    const worst = valid.length ? Math.round(Math.max(...valid)) : 999;
    mainVal = `${avg}ms`; mainLabel = '평균 반응속도';
    subStats = [
      { label: '최속', value: `${best}ms` },
      { label: '최저', value: `${worst}ms` },
      { label: '패널티', value: `${result.times.filter(t => t >= 900).length}회` },
    ];
    rating = avg < 180 ? '🔥 프로급 반응속도!' : avg < 280 ? '👍 훌륭한 반응속도' : avg < 420 ? '✅ 평균 수준' : '💡 더 연습해보세요';
  } else {
    const acc = result.shots > 0 ? Math.round(result.hits / result.shots * 100) : 0;
    mainVal = `${result.hits}점`; mainLabel = '적중 수';
    subStats = [
      { label: '시도', value: `${result.shots}회` },
      { label: '정확도', value: `${acc}%` },
      { label: '분당', value: `${(result.hits / GAME_SECS * 60).toFixed(1)}회` },
    ];
    rating = result.hits >= 35 ? '🔥 에임갓!' : result.hits >= 22 ? '👍 훌륭한 에임' : result.hits >= 12 ? '✅ 평균 수준' : '💡 감도 조절 or 더 연습해보세요';
  }

  const share = () => {
    const label = MODES.find(m => m.id === result.mode)?.label || result.mode;
    const text = [
      '🎯 PKGG 에임 트레이너',
      `모드: ${label}`,
      `결과: ${mainVal} — ${rating}`,
      subStats.map(s => `${s.label} ${s.value}`).join(' / '),
      'pk.gg/aim-trainer',
    ].join('\n');
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 text-center">
      <div className="text-6xl font-black text-emerald-400 mb-1">{mainVal}</div>
      <div className="text-gray-400 text-sm mb-2">{mainLabel}</div>
      <div className="text-gray-100 font-semibold text-lg mb-8">{rating}</div>
      <div className="flex justify-center gap-10 mb-10">
        {subStats.map(s => (
          <div key={s.label}>
            <div className="text-2xl font-black text-white">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-3">
        <button onClick={onRetry} className="px-7 py-2.5 rounded-xl bg-gray-700 text-gray-200 font-semibold hover:bg-gray-600 transition-all">
          다시 하기
        </button>
        <button onClick={share} className="px-7 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-all">
          {copied ? '✅ 복사 완료' : '📋 결과 공유'}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ── 메인 페이지 ───────────────────────────────────────────────────────────
export default function AimTrainerPage() {
  const [mode,    setMode]    = useState('flicker');
  const [gameKey, setGameKey] = useState(0);
  const [result,  setResult]  = useState(null);

  const handleDone  = useCallback((res) => setResult(res), []);
  const handleRetry = useCallback(() => { setResult(null); setGameKey(k => k + 1); }, []);
  const changeMode  = (m) => { setMode(m); setResult(null); setGameKey(k => k + 1); };

  return (
    <div className="min-h-screen bg-gray-950">
      <Head>
        <title>에임 트레이너 | PKGG</title>
        <meta name="description" content="PUBG 에임 트레이너 — 반응속도 테스트, 플리커 에임, 이동 타겟 클릭 연습" />
        <meta property="og:title" content="에임 트레이너 | PKGG" />
        <meta property="og:description" content="반응속도 · 플리커 에임 · 이동 타겟 — 브라우저에서 바로 플레이" />
        <meta property="og:image" content="https://pk.gg/og.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://pk.gg/og.png" />
      </Head>
      <Header />

      <main className="max-w-screen-xl mx-auto px-4 py-8 space-y-6">

        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-black text-white mb-1">🎯 에임 트레이너</h1>
          <p className="text-gray-400 text-sm">반응속도 · 플리커 에임 · 이동 타겟 — 브라우저에서 바로 플레이</p>
        </div>

        {/* 모드 선택 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => changeMode(m.id)}
              className={`p-5 rounded-2xl border text-left transition-all ${
                mode === m.id
                  ? 'bg-blue-600/20 border-blue-500 text-white'
                  : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
              }`}
            >
              <div className="text-2xl mb-2">{m.icon}</div>
              <div className="font-bold text-sm mb-0.5">{m.label}</div>
              <div className="text-xs opacity-60 leading-relaxed">{m.desc}</div>
            </button>
          ))}
        </div>

        {/* 게임 영역 */}
        {result ? (
          <Results result={result} onRetry={handleRetry} />
        ) : (
          <div key={gameKey}>
            {mode === 'reaction' && <ReactionGame onDone={handleDone} />}
            {mode === 'flicker'  && <FlickerGame  onDone={handleDone} />}
            {mode === 'tracking' && <TrackingGame  onDone={handleDone} />}
          </div>
        )}

        {/* 가이드 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
            <div className="text-xl mb-2">⚡</div>
            <div className="font-bold text-yellow-400 text-sm mb-1">반응속도 기준</div>
            <div className="text-xs text-gray-400 leading-relaxed">
              180ms 미만: 프로급<br />
              180~280ms: 상위권<br />
              280~420ms: 평균<br />
              420ms 이상: 개선 여지 있음
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
            <div className="text-xl mb-2">🎯</div>
            <div className="font-bold text-emerald-400 text-sm mb-1">플리커 에임 팁</div>
            <div className="text-xs text-gray-400 leading-relaxed">
              30초에 22개 이상이면 훌륭한 수준. 원 색이 빨개질수록 사라질 시간이 가까우니 우선 클릭하세요.
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
            <div className="text-xl mb-2">🔴</div>
            <div className="font-bold text-red-400 text-sm mb-1">이동 타겟 팁</div>
            <div className="text-xs text-gray-400 leading-relaxed">
              이동 경로를 예측해서 타겟이 올 위치에 미리 클릭하면 유리합니다. 적중 시 방향이 무작위로 바뀝니다.
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
