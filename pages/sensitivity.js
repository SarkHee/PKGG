// pages/sensitivity.js — PUBG 감도 계산기 + 에임 체험
import Head from 'next/head';
import { useState, useRef, useEffect, useCallback } from 'react';
import Header from '../components/layout/Header';

const PUBG_COEFF = 0.0245;

// cm/360 = 36000 / (DPI × sens × coeff)
function calc360(dpi, sens, coeff) {
  if (!dpi || !sens || !coeff) return null;
  return 36000 / (dpi * sens * coeff);
}

// PUBG 권장 스코프 감도 (배율별)
const SCOPES = [
  { label: '홀로 / 레드닷', calc: (s) => s },
  { label: '2배 스코프',    calc: (s) => s + 5 },
  { label: '3배 스코프',    calc: (s) => s + 10 },
];

// eDPI 기반 플레이스타일 추천
const PLAYSTYLE_ZONES = [
  { label: '정밀 저격형',   min: 0,      max: 25000,  color: '#60A5FA', bar: 'bg-blue-400',   desc: '느린 감도. 원거리 미세조정에 유리. 근거리 빠른 에임 전환은 어려울 수 있음.' },
  { label: '균형 올라운더', min: 25000,  max: 50000,  color: '#34D399', bar: 'bg-emerald-400', desc: '대부분 플레이어에게 추천. 근·원거리 모두 무난. 입문자라면 이 범위 내에서 시작.' },
  { label: '공격 러셔형',   min: 50000,  max: 80000,  color: '#FBBF24', bar: 'bg-yellow-400',  desc: '빠른 에임 전환. 근거리 압박전에 유리. 정밀도는 다소 낮아질 수 있음.' },
  { label: '초고감도',      min: 80000,  max: Infinity,color: '#F87171', bar: 'bg-red-400',     desc: '매우 빠른 에임. 터치감이 예민해 적응 시간 필요. 고수 전용.' },
];

function getZone(eDPI) {
  return PLAYSTYLE_ZONES.find((z) => eDPI >= z.min && eDPI < z.max) || PLAYSTYLE_ZONES[0];
}

// ── 에임 체험 캔버스 컴포넌트 ──────────────────────────────────────────
const CANVAS_W = 900;
const CANVAS_H = 520;
const GAME_DURATION = 20; // 초

function AimDemo({ eDPI }) {
  const canvasRef   = useRef(null);
  const stateRef    = useRef({ x: CANVAS_W / 2, y: CANVAS_H / 2, targets: [], score: 0, active: false, timeLeft: GAME_DURATION });
  const rafRef      = useRef(null);
  const timerRef    = useRef(null);
  const [uiScore,   setUiScore]   = useState(0);
  const [uiTime,    setUiTime]    = useState(GAME_DURATION);
  const [phase,     setPhase]     = useState('idle'); // idle | playing | done

  const spawnTarget = useCallback(() => {
    const pad = 40;
    stateRef.current.targets.push({
      x: pad + Math.random() * (CANVAS_W - pad * 2),
      y: pad + Math.random() * (CANVAS_H - pad * 2),
      r: 22,
      born: performance.now(),
      ttl: 2400,
    });
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const st  = stateRef.current;
    const now = performance.now();

    // 배경
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 격자 (희미)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= CANVAS_W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, CANVAS_H); ctx.stroke(); }
    for (let gy = 0; gy <= CANVAS_H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(CANVAS_W, gy); ctx.stroke(); }

    // 타겟
    st.targets = st.targets.filter((t) => {
      const elapsed = now - t.born;
      const ratio   = 1 - elapsed / t.ttl;
      if (ratio <= 0) return false;

      const hue = ratio * 110; // 초록 → 빨강
      ctx.save();
      // 외곽 원
      ctx.strokeStyle = `hsl(${hue}, 85%, 60%)`;
      ctx.lineWidth   = 2;
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.stroke();
      // 내부 채우기
      ctx.fillStyle   = `hsla(${hue}, 85%, 60%, 0.15)`;
      ctx.fill();
      // 중심 점
      ctx.fillStyle   = `hsl(${hue}, 85%, 70%)`;
      ctx.globalAlpha = ratio;
      ctx.beginPath(); ctx.arc(t.x, t.y, 3, 0, Math.PI * 2); ctx.fill();
      // 시간 게이지 (외곽에 호)
      ctx.strokeStyle = `hsl(${hue}, 85%, 60%)`;
      ctx.lineWidth   = 2;
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r + 6, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2); ctx.stroke();
      ctx.restore();
      return true;
    });

    // 크로스헤어
    const cx = st.x, cy = st.y;
    const sz = 14;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 1.5;
    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur  = 3;
    ctx.beginPath();
    ctx.moveTo(cx - sz, cy); ctx.lineTo(cx - 4, cy);
    ctx.moveTo(cx + 4,  cy); ctx.lineTo(cx + sz, cy);
    ctx.moveTo(cx, cy - sz); ctx.lineTo(cx, cy - 4);
    ctx.moveTo(cx, cy + 4);  ctx.lineTo(cx, cy + sz);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle  = '#fff';
    ctx.beginPath(); ctx.arc(cx, cy, 1.5, 0, Math.PI * 2); ctx.fill();

    rafRef.current = requestAnimationFrame(drawFrame);
  }, []);

  const startGame = useCallback(() => {
    const st = stateRef.current;
    st.score    = 0;
    st.timeLeft = GAME_DURATION;
    st.targets  = [];
    st.x        = CANVAS_W / 2;
    st.y        = CANVAS_H / 2;
    st.active   = true;
    setUiScore(0);
    setUiTime(GAME_DURATION);
    setPhase('playing');
    spawnTarget(); spawnTarget(); spawnTarget();

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(drawFrame);

    const spawnId = setInterval(spawnTarget, 1200);
    let elapsed   = 0;
    const tickId  = setInterval(() => {
      elapsed += 1;
      const left = GAME_DURATION - elapsed;
      st.timeLeft = left;
      setUiTime(left);
      if (left <= 0) {
        clearInterval(tickId);
        clearInterval(spawnId);
        st.active = false;
        setTimeout(() => {
          cancelAnimationFrame(rafRef.current);
          setPhase('done');
        }, 500);
      }
    }, 1000);

    timerRef.current = { spawnId, tickId };
  }, [spawnTarget, drawFrame]);

  const stopGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current.spawnId);
      clearInterval(timerRef.current.tickId);
    }
    cancelAnimationFrame(rafRef.current);
    stateRef.current.active = false;
    setPhase('idle');
  }, []);

  useEffect(() => () => { stopGame(); }, [stopGame]);

  // 캔버스 초기 그림 (idle 상태)
  useEffect(() => {
    if (phase !== 'idle') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    for (let gx = 0; gx <= CANVAS_W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, CANVAS_H); ctx.stroke(); }
    for (let gy = 0; gy <= CANVAS_H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(CANVAS_W, gy); ctx.stroke(); }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 1.5;
    const cx = CANVAS_W / 2, cy = CANVAS_H / 2, sz = 14;
    ctx.beginPath();
    ctx.moveTo(cx - sz, cy); ctx.lineTo(cx - 4, cy);
    ctx.moveTo(cx + 4,  cy); ctx.lineTo(cx + sz, cy);
    ctx.moveTo(cx, cy - sz); ctx.lineTo(cx, cy - 4);
    ctx.moveTo(cx, cy + 4);  ctx.lineTo(cx, cy + sz);
    ctx.stroke();
  }, [phase]);

  const handleMouseMove = useCallback((e) => {
    if (!stateRef.current.active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    stateRef.current.x = (e.clientX - rect.left) * scaleX;
    stateRef.current.y = (e.clientY - rect.top) * scaleY;
  }, []);

  const handleClick = useCallback(() => {
    if (!stateRef.current.active) return;
    const { x, y } = stateRef.current;
    let hit = false;
    stateRef.current.targets = stateRef.current.targets.filter((t) => {
      if (Math.hypot(t.x - x, t.y - y) < t.r) { hit = true; return false; }
      return true;
    });
    if (hit) {
      stateRef.current.score += 1;
      setUiScore(stateRef.current.score);
      spawnTarget();
    }
  }, [spawnTarget]);

  const sensitivityLabel = eDPI < 25000 ? '느린 감도' : eDPI < 50000 ? '표준 감도' : '빠른 감도';

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
        <div>
          <span className="font-bold text-gray-200 text-sm">🎯 에임 체험 데모</span>
          <span className="ml-3 text-xs text-gray-500">
            eDPI {eDPI.toLocaleString()} — <span style={{ color: getZone(eDPI).color }}>{sensitivityLabel}</span>
          </span>
        </div>
        {phase === 'playing' && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-yellow-400">{uiTime}s</span>
            <span className="text-xs font-mono text-emerald-400">💥 {uiScore}</span>
            <button onClick={stopGame} className="text-xs px-3 py-1 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600">중단</button>
          </div>
        )}
      </div>

      {/* 캔버스 */}
      <div
        className="relative cursor-crosshair select-none w-full"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
        {phase === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <div className="text-6xl mb-4">🎯</div>
              <p className="text-white font-bold text-xl mb-1">감도 체험 데모</p>
              <p className="text-gray-400 text-sm mb-6">나타나는 원을 클릭해서 적중시키세요 · 20초 테스트</p>
              <button
                onClick={startGame}
                className="px-10 py-3 rounded-xl bg-blue-600 text-white font-bold text-base hover:bg-blue-500 active:scale-95 transition-all shadow-lg shadow-blue-500/30"
              >
                체험 시작
              </button>
            </div>
          </div>
        )}
        {phase === 'done' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-center">
              <div className="text-5xl font-black text-emerald-400 mb-1">{uiScore}</div>
              <div className="text-gray-400 text-sm mb-0.5">적중 수</div>
              <div className="text-blue-400 font-bold text-lg mb-2">분당 {(uiScore / GAME_DURATION * 60).toFixed(1)}회</div>
              <p className="text-gray-300 text-sm mb-6">
                {uiScore >= 30 ? '🔥 훌륭한 에임! 감도가 잘 맞습니다.' :
                 uiScore >= 15 ? '👍 나쁘지 않아요. 조금 더 연습해보세요.' :
                                 '💡 감도를 조절하고 다시 체험해보세요.'}
              </p>
              <button
                onClick={startGame}
                className="px-10 py-3 rounded-xl bg-blue-600 text-white font-bold text-base hover:bg-blue-500 active:scale-95 transition-all shadow-lg shadow-blue-500/30"
              >
                다시 하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────
export default function SensitivityPage() {
  const [dpi,  setDpi]  = useState(800);
  const [sens, setSens] = useState(47);

  const eDPI  = dpi * sens;
  const cm360 = calc360(dpi, sens, PUBG_COEFF);
  const zone  = getZone(eDPI);

  return (
    <div className="min-h-screen bg-gray-950">
      <Head>
        <title>PUBG 감도 계산기 | PKGG</title>
        <meta name="description" content="PUBG 감도(eDPI, cm/360) 계산, 타 게임 감도 변환, 스코프별 권장 감도, 에임 체험 데모" />
        <meta property="og:image" content="https://pk.gg/og.png" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <Header />

      <main className="max-w-screen-xl mx-auto px-4 py-8 space-y-8">

        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-black text-white mb-1">🖱️ PUBG 감도 계산기</h1>
          <p className="text-gray-400 text-sm">eDPI · cm/360 계산, 스코프별 권장 감도, 에임 체험까지 한 번에</p>
        </div>

        {/* ── 섹션 1: 기본 계산기 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 입력 */}
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6">
            <h2 className="font-bold text-gray-200 mb-5 text-base">내 설정 입력</h2>

            {/* DPI */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-400 mb-2">
                마우스 DPI
                <span className="ml-2 text-gray-600 font-normal">(마우스 소프트웨어에서 확인)</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {[400, 800, 1600, 3200].map((v) => (
                  <button
                    key={v}
                    onClick={() => setDpi(v)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                      dpi === v
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-400'
                    }`}
                  >{v}</button>
                ))}
                <input
                  type="number"
                  value={dpi}
                  onChange={(e) => setDpi(Math.max(100, Math.min(32000, Number(e.target.value))))}
                  className="w-24 px-3 py-2 rounded-xl bg-gray-800 border border-gray-600 text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="직접 입력"
                />
              </div>
            </div>

            {/* 인게임 감도 */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-400 mb-2">
                PUBG 일반 감도
                <span className="ml-2 text-gray-600 font-normal">(1 ~ 100, 기본값 47)</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1} max={100}
                  value={sens}
                  onChange={(e) => setSens(Number(e.target.value))}
                  className="flex-1 accent-blue-500"
                />
                <input
                  type="number"
                  value={sens}
                  onChange={(e) => setSens(Math.max(1, Math.min(100, Number(e.target.value))))}
                  className="w-16 px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-600 text-gray-200 text-sm text-center focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* 프리셋 */}
            <div>
              <div className="text-xs text-gray-500 mb-2">빠른 프리셋</div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: '저격형', dpi: 400, sens: 35 },
                  { label: '표준',   dpi: 800, sens: 47 },
                  { label: '러셔형', dpi: 800, sens: 70 },
                  { label: '고감도', dpi: 1600, sens: 60 },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => { setDpi(p.dpi); setSens(p.sens); }}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 text-xs hover:border-gray-500 hover:text-gray-200 transition-all"
                  >
                    {p.label} ({p.dpi} / {p.sens})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 결과 */}
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
            <h2 className="font-bold text-gray-200 mb-1 text-base">계산 결과</h2>

            {/* eDPI */}
            <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: zone.color + '15', border: `1px solid ${zone.color}40` }}>
              <div>
                <div className="text-xs text-gray-400 mb-0.5">eDPI</div>
                <div className="text-3xl font-black text-white">{eDPI.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold" style={{ color: zone.color }}>{zone.label}</div>
                <div className="text-xs text-gray-500 mt-0.5 max-w-[180px] text-right leading-tight">{zone.desc}</div>
              </div>
            </div>

            {/* cm/360 */}
            <div className="flex items-center justify-between p-4 bg-gray-800/60 rounded-xl border border-gray-700">
              <div>
                <div className="text-xs text-gray-400 mb-0.5">cm/360</div>
                <div className="text-2xl font-black text-white">{cm360 ? cm360.toFixed(1) : '—'}<span className="text-sm text-gray-500 ml-1">cm</span></div>
              </div>
              <div className="text-xs text-gray-500 text-right max-w-[200px] leading-relaxed">
                마우스를 {cm360 ? cm360.toFixed(1) : '—'}cm 움직여야<br />캐릭터가 360도 회전
              </div>
            </div>

            {/* eDPI 바 게이지 */}
            <div>
              <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                <span>0</span><span>25K</span><span>50K</span><span>80K+</span>
              </div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden relative">
                {/* 구간 표시 */}
                {[33, 62, 100].map((pct, i) => (
                  <div key={i} className="absolute top-0 bottom-0 border-r border-gray-600" style={{ left: `${pct}%` }} />
                ))}
                {/* 현재 위치 */}
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (eDPI / 100000) * 100)}%`,
                    backgroundColor: zone.color,
                  }}
                />
              </div>
              <div className="flex gap-3 mt-2 flex-wrap">
                {PLAYSTYLE_ZONES.map((z) => (
                  <div key={z.label} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />
                    <span className="text-[10px] text-gray-500">{z.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 스코프별 권장 감도 */}
            <div>
              <div className="text-xs font-semibold text-gray-400 mb-2">스코프별 권장 감도</div>
              <div className="grid grid-cols-3 gap-1.5">
                {SCOPES.map((sc) => {
                  const recommended = Math.max(1, sc.calc(sens));
                  return (
                    <div key={sc.label} className="bg-gray-800 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-gray-500 mb-0.5">{sc.label}</div>
                      <div className="text-sm font-bold text-gray-200">{recommended}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── 섹션 2: 에임 체험 데모 ── */}
        <div>
          <h2 className="font-bold text-gray-200 mb-3 text-base">🎯 실제 감도 체험 데모</h2>
          <p className="text-xs text-gray-500 mb-4">
            위에서 설정한 감도(<strong className="text-gray-300">eDPI {eDPI.toLocaleString()}</strong>)가 실제 인게임에서 어떻게 느껴지는지 체험해보세요.
            나타나는 원을 클릭해서 적중시키세요. 빨간색일수록 사라지기 직전입니다.
          </p>
          <AimDemo eDPI={eDPI} />
        </div>

        {/* ── 섹션 4: 가이드 ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
            <div className="text-xl mb-2">🐢</div>
            <div className="font-bold text-blue-400 text-sm mb-1">낮은 감도 추천</div>
            <div className="text-xs text-gray-400 leading-relaxed">
              원거리 저격이 많거나, 세밀한 조준이 중요한 플레이어.
              eDPI <strong className="text-gray-300">15,000 ~ 30,000</strong> 권장.
              큰 마우스패드를 사용하는 것이 좋습니다.
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
            <div className="text-xl mb-2">⚖️</div>
            <div className="font-bold text-emerald-400 text-sm mb-1">중간 감도 추천</div>
            <div className="text-xs text-gray-400 leading-relaxed">
              처음 시작하거나 올라운더 플레이어.
              eDPI <strong className="text-gray-300">30,000 ~ 50,000</strong> 권장.
              DPI 800 + 감도 40~60이 가장 흔한 조합입니다.
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
            <div className="text-xl mb-2">⚡</div>
            <div className="font-bold text-yellow-400 text-sm mb-1">높은 감도 주의</div>
            <div className="text-xs text-gray-400 leading-relaxed">
              근거리 러셔형이나 빠른 에임 전환이 필요한 경우.
              eDPI <strong className="text-gray-300">50,000+</strong>는 적응 기간이 필요하며
              미세 조정이 어려울 수 있습니다.
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
