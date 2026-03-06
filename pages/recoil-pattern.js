// pages/recoil-pattern.js — PUBG 반동 패턴 시뮬레이터 + 연습 모드
import Head from 'next/head';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Header from '../components/layout/Header';

// ── 캔버스 좌표 설정 (시각화) ─────────────────────────────────────────────
const CW = 280, CH = 500;
const AIM_X = CW / 2, AIM_Y = CH - 50;
const SX = 112, SY = 385;

function ptCanvas(nx, ny) {
  return [AIM_X + nx * SX, AIM_Y - ny * SY];
}

// ── 어태치먼트 ────────────────────────────────────────────────────────────
const ATTACHMENTS = [
  { id: 'comp',  label: '보정기',      vx: 0.88, vy: 0.70, desc: '수직 -30% / 수평 -12%' },
  { id: 'vgrip', label: '수직 그립',   vx: 0.90, vy: 0.83, desc: '수직 -17% / 수평 -10%' },
  { id: 'agrip', label: '앵글드 그립', vx: 0.72, vy: 0.95, desc: '수평 -28% / 수직 -5%' },
];

function applyAttach(pattern, active) {
  const vx = active.comp ? 0.88 : active.agrip ? 0.72 : active.vgrip ? 0.90 : 1;
  const vy = active.comp ? 0.70 : active.vgrip ? 0.83 : active.agrip ? 0.95 : 1;
  return pattern.map(([nx, ny]) => [nx * vx, ny * vy]);
}

// ── 총기 데이터 ───────────────────────────────────────────────────────────
const WEAPONS = [
  {
    id: 'M416', name: 'M416', cal: '5.56mm', rpm: 750, dmg: 41, rounds: 30,
    color: '#3B82F6',
    pullDown: '많이', pullH: '우→좌 (약간)',
    desc: '가장 대중적인 AR. 보정기+수직그립 조합으로 패턴이 매우 안정적.',
    pattern: [
      [0.00, 0.040], [0.02, 0.090], [0.04, 0.160], [0.07, 0.240], [0.09, 0.320],
      [0.08, 0.400], [0.06, 0.470], [0.04, 0.540], [0.01, 0.590], [-0.03, 0.630],
      [-0.07, 0.660], [-0.09, 0.680], [-0.07, 0.700], [-0.04, 0.720], [-0.01, 0.740],
      [0.03, 0.760],  [0.06, 0.780], [0.07, 0.800], [0.05, 0.820],  [0.03, 0.840],
    ],
  },
  {
    id: 'AKM', name: 'AKM', cal: '7.62mm', rpm: 600, dmg: 47, rounds: 30,
    color: '#EF4444',
    pullDown: '매우 많이', pullH: '우→좌 (크게)',
    desc: '높은 데미지지만 강한 반동. 5발 점사 위주로 운용 권장.',
    pattern: [
      [0.00, 0.060], [0.04, 0.130], [0.09, 0.220], [0.14, 0.320], [0.18, 0.430],
      [0.16, 0.520], [0.12, 0.600], [0.08, 0.660], [0.02, 0.700], [-0.05, 0.740],
      [-0.12, 0.760], [-0.16, 0.780], [-0.12, 0.800], [-0.06, 0.820], [0.00, 0.840],
      [0.07, 0.860],  [0.12, 0.870], [0.10, 0.880], [0.07, 0.890],  [0.04, 0.900],
    ],
  },
  {
    id: 'SCAR', name: 'SCAR-L', cal: '5.56mm', rpm: 600, dmg: 43, rounds: 30,
    color: '#F59E0B',
    pullDown: '보통', pullH: '거의 없음',
    desc: '느린 발사속도와 낮은 반동. 입문자가 연사 제어를 배우기에 적합.',
    pattern: [
      [0.00, 0.035], [0.01, 0.080], [0.03, 0.130], [0.05, 0.190], [0.06, 0.250],
      [0.05, 0.320], [0.03, 0.380], [0.01, 0.440], [-0.02, 0.490], [-0.05, 0.530],
      [-0.07, 0.560], [-0.06, 0.580], [-0.03, 0.600], [0.01, 0.620], [0.04, 0.640],
      [0.06, 0.660],  [0.06, 0.680], [0.04, 0.700], [0.02, 0.720],  [0.00, 0.740],
    ],
  },
  {
    id: 'BERYL', name: 'Beryl M762', cal: '7.62mm', rpm: 750, dmg: 46, rounds: 30,
    color: '#F97316',
    pullDown: '매우 많이', pullH: '우→좌 (매우 크게)',
    desc: '고속+고데미지+강반동 삼박자. 연사 시 초반 제어가 핵심.',
    pattern: [
      [0.00, 0.070], [0.05, 0.150], [0.12, 0.250], [0.18, 0.360], [0.22, 0.480],
      [0.20, 0.570], [0.16, 0.640], [0.10, 0.700], [0.03, 0.740], [-0.06, 0.770],
      [-0.14, 0.800], [-0.19, 0.820], [-0.14, 0.840], [-0.07, 0.860], [0.01, 0.870],
      [0.08, 0.880],  [0.12, 0.890], [0.10, 0.900], [0.07, 0.910],  [0.04, 0.920],
    ],
  },
  {
    id: 'QBZ', name: 'QBZ', cal: '5.56mm', rpm: 750, dmg: 41, rounds: 30,
    color: '#10B981',
    pullDown: '많이', pullH: '우→좌 (약간)',
    desc: 'M416 대체재. 유사한 패턴이나 초반 수직 반동이 약간 더 강함.',
    pattern: [
      [0.00, 0.040], [0.02, 0.090], [0.04, 0.150], [0.06, 0.220], [0.07, 0.290],
      [0.05, 0.360], [0.02, 0.430], [-0.01, 0.490], [-0.05, 0.540], [-0.08, 0.580],
      [-0.07, 0.610], [-0.04, 0.630], [0.00, 0.650], [0.04, 0.670], [0.07, 0.690],
      [0.07, 0.710],  [0.05, 0.730], [0.02, 0.750], [-0.01, 0.770], [-0.02, 0.780],
    ],
  },
  {
    id: 'AUG', name: 'AUG A3', cal: '5.56mm', rpm: 700, dmg: 41, rounds: 30,
    color: '#06B6D4',
    pullDown: '많이', pullH: '거의 없음',
    desc: '수평 반동이 매우 적어 원거리 교전에 최적. 안정적인 풀오토 가능.',
    pattern: [
      [0.00, 0.040], [0.01, 0.090], [0.02, 0.150], [0.04, 0.210], [0.05, 0.280],
      [0.04, 0.350], [0.03, 0.420], [0.01, 0.480], [-0.01, 0.530], [-0.04, 0.570],
      [-0.05, 0.600], [-0.04, 0.620], [-0.02, 0.640], [0.00, 0.660], [0.02, 0.680],
      [0.04, 0.700],  [0.04, 0.720], [0.03, 0.740], [0.01, 0.760],  [0.00, 0.780],
    ],
  },
  {
    id: 'UMP', name: 'UMP45', cal: '.45 ACP', rpm: 600, dmg: 35, rounds: 35,
    color: '#8B5CF6',
    pullDown: '적게', pullH: '거의 없음',
    desc: 'SMG 최고 수준의 안정성. 실내 근거리 전투에 최적화.',
    pattern: [
      [0.00, 0.025], [0.01, 0.055], [0.01, 0.090], [0.02, 0.120], [0.02, 0.155],
      [0.01, 0.190], [0.00, 0.220], [-0.01, 0.250], [-0.02, 0.280], [-0.02, 0.310],
      [-0.01, 0.340], [0.00, 0.370], [0.01, 0.400], [0.01, 0.420], [0.01, 0.440],
      [0.00, 0.460],  [-0.01, 0.480], [-0.01, 0.500], [0.00, 0.520], [0.00, 0.540],
    ],
  },
  {
    id: 'GROZA', name: 'Groza', cal: '7.62mm', rpm: 750, dmg: 47, rounds: 30,
    color: '#EC4899',
    pullDown: '매우 많이', pullH: '우→좌 (크게)',
    desc: '에어드롭 전용 최강 AR. AKM급 반동에 750RPM. 반동 제어가 핵심.',
    pattern: [
      [0.00, 0.065], [0.05, 0.140], [0.11, 0.230], [0.17, 0.330], [0.21, 0.440],
      [0.18, 0.540], [0.14, 0.620], [0.09, 0.680], [0.02, 0.720], [-0.06, 0.750],
      [-0.13, 0.780], [-0.17, 0.800], [-0.13, 0.820], [-0.07, 0.840], [-0.01, 0.850],
      [0.06, 0.860],  [0.11, 0.870], [0.09, 0.880], [0.06, 0.890],  [0.03, 0.900],
    ],
  },
];

// ─── 시각화 캔버스 ────────────────────────────────────────────────────────
function PatternCanvas({ weapon, attachActive, animFrame }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pts = applyAttach(weapon.pattern, attachActive);
    const show = animFrame < 0 ? pts.length : animFrame;

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, CW, CH);

    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= CW; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke(); }
    for (let y = 0; y <= CH; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke(); }

    const sz = 9;
    ctx.strokeStyle = '#374151'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(AIM_X - sz, AIM_Y); ctx.lineTo(AIM_X + sz, AIM_Y);
    ctx.moveTo(AIM_X, AIM_Y - sz); ctx.lineTo(AIM_X, AIM_Y + sz);
    ctx.stroke();
    ctx.strokeStyle = '#6B7280'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(AIM_X, AIM_Y, 3.5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#4B5563'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
    ctx.fillText('조준점', AIM_X, AIM_Y + 18);

    if (show === 0) return;

    ctx.beginPath();
    ctx.moveTo(AIM_X, AIM_Y);
    for (let i = 0; i < show; i++) {
      const [xi, yi] = ptCanvas(pts[i][0], pts[i][1]);
      ctx.lineTo(xi, yi);
    }
    ctx.strokeStyle = `${weapon.color}30`; ctx.lineWidth = 1.5; ctx.stroke();

    for (let i = 0; i < show; i++) {
      const [xi, yi] = ptCanvas(pts[i][0], pts[i][1]);
      const ratio = i / (pts.length - 1);
      const hue = (1 - ratio) * 110;
      const isLast = i === show - 1 && animFrame >= 0;

      ctx.globalAlpha = isLast ? 1 : 0.82;
      ctx.fillStyle = `hsl(${hue},85%,55%)`;
      ctx.beginPath();
      ctx.arc(xi, yi, isLast ? 5.5 : 3.5, 0, Math.PI * 2);
      ctx.fill();

      if ((i + 1) % 5 === 0) {
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = '#fff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(i + 1, xi + 7, yi + 3);
      }
      if (isLast) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = weapon.color;
        ctx.beginPath();
        ctx.arc(xi, yi, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }, [weapon, attachActive, animFrame]);

  return (
    <canvas ref={canvasRef} width={CW} height={CH}
      style={{ display: 'block', width: '100%', height: 'auto' }}
      className="rounded-xl" />
  );
}

// ─── 연습 모드 ────────────────────────────────────────────────────────────
const PCW = 520, PCH = 520;
const PCX = PCW / 2, PCY = PCH / 2;
const PSX = 140, PSY = 210; // 정규화 → 픽셀 스케일

const DPI_PRESETS = [400, 800, 1200, 1600, 2400, 3200];

const SCOPE_PRESETS = [
  { id: 'none',   label: '기본',        mult: 1.00 },
  { id: 'reddot', label: '레드닷',      mult: 0.90 },
  { id: '2x',     label: '2배',         mult: 0.50 },
  { id: '3x',     label: '3배',         mult: 0.35 },
  { id: '4x',     label: '4배',         mult: 0.25 },
  { id: '6x',     label: '6배',         mult: 0.18 },
];

function PracticeMode({ weapon, attachActive }) {
  const canvasRef          = useRef(null);
  const compRef            = useRef({ x: 0, y: 0 });
  const frameRef           = useRef(0);
  const shotsRef           = useRef([]);
  const intervalRef        = useRef(null);
  const rAFRef             = useRef(null);
  const countdownTimersRef = useRef([]);
  const phaseRef           = useRef('idle');
  const countdownRef       = useRef(null); // 3 | 2 | 1 | 'GO!' | null

  const [phase,   setPhase]   = useState('idle'); // idle|countdown|playing|done
  const [results, setResults] = useState(null);
  const [dpi,     setDpi]     = useState(800);
  const [dpiInput,setDpiInput]= useState('800');
  const [scopeId, setScopeId] = useState('none');

  const scope = SCOPE_PRESETS.find((s) => s.id === scopeId) || SCOPE_PRESETS[0];
  // 마우스 1픽셀 이동 → 캔버스 보정 픽셀: DPI 높을수록, 스코프 낮을수록 민감도↑
  const totalSens = 1.0 * (dpi / 800) * scope.mult;

  const pattern = useMemo(() => applyAttach(weapon.pattern, attachActive), [weapon, attachActive]);
  const patternRef = useRef(pattern);
  useEffect(() => { patternRef.current = pattern; }, [pattern]);

  // ── 캔버스 렌더 ────────────────────────────────────────────────────────
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#08090f';
    ctx.fillRect(0, 0, PCW, PCH);

    // 동심원 (적중 기준선 r=30 강조)
    [{ r: 150, c: '#1a2030' }, { r: 110, c: '#1e2a3a' }, { r: 70, c: '#1a3a28' },
     { r: 30,  c: '#22543d' }, { r: 10,  c: '#16a34a' }].forEach(({ r, c }) => {
      ctx.beginPath(); ctx.arc(PCX, PCY, r, 0, Math.PI * 2);
      ctx.strokeStyle = c; ctx.lineWidth = r === 30 ? 2 : 1; ctx.stroke();
    });

    // 적중 기준 레이블
    ctx.font = '10px monospace'; ctx.fillStyle = '#22543d'; ctx.textAlign = 'left';
    ctx.fillText('적중 범위', PCX + 32, PCY - 2);

    // 중앙 십자선
    ctx.strokeStyle = '#374151'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PCX - 22, PCY); ctx.lineTo(PCX - 7, PCY);
    ctx.moveTo(PCX + 7,  PCY); ctx.lineTo(PCX + 22, PCY);
    ctx.moveTo(PCX, PCY - 22); ctx.lineTo(PCX, PCY - 7);
    ctx.moveTo(PCX, PCY + 7);  ctx.lineTo(PCX, PCY + 22);
    ctx.stroke();

    // 착탄 기록
    shotsRef.current.forEach(({ sx, sy }, i) => {
      const ratio = i / Math.max(1, patternRef.current.length - 1);
      const hue = (1 - ratio) * 110;
      ctx.globalAlpha = 0.88;
      ctx.beginPath(); ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${hue},80%,55%)`; ctx.fill();
    });
    ctx.globalAlpha = 1;

    // 현재 조준점 (playing 중)
    if (phaseRef.current === 'playing') {
      const f   = frameRef.current;
      const pat = patternRef.current;
      if (f < pat.length) {
        const [nx, ny] = pat[f];
        const aimX = PCX + nx * PSX - compRef.current.x;
        const aimY = PCY - ny * PSY + compRef.current.y;

        ctx.beginPath(); ctx.moveTo(PCX, PCY); ctx.lineTo(aimX, aimY);
        ctx.strokeStyle = 'rgba(251,191,36,0.12)'; ctx.lineWidth = 1; ctx.stroke();

        ctx.beginPath(); ctx.arc(aimX, aimY, 16, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(251,191,36,0.30)'; ctx.lineWidth = 2; ctx.stroke();

        ctx.beginPath(); ctx.arc(aimX, aimY, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24'; ctx.fill();
      }
    }

    // 카운트다운 오버레이
    if (phaseRef.current === 'countdown' && countdownRef.current !== null) {
      ctx.fillStyle = 'rgba(0,0,0,0.60)';
      ctx.fillRect(0, 0, PCW, PCH);

      const isGo = countdownRef.current === 'GO!';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = isGo ? 'bold 72px sans-serif' : 'bold 140px sans-serif';
      ctx.fillStyle = isGo ? '#22c55e' : '#ffffff';
      ctx.fillText(String(countdownRef.current), PCX, PCY);

      // 작은 힌트
      ctx.font = '14px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText('마우스를 아래로 당겨 반동을 잡으세요', PCX, PCY + 100);
    }
  }, []);

  // RAF 루프 (countdown + playing)
  useEffect(() => {
    if (phase === 'playing' || phase === 'countdown') {
      const loop = () => { drawCanvas(); rAFRef.current = requestAnimationFrame(loop); };
      rAFRef.current = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(rAFRef.current);
    } else {
      drawCanvas();
    }
  }, [phase, drawCanvas]);

  // 무기 변경 시 초기화
  useEffect(() => {
    if (phaseRef.current !== 'idle') stopGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weapon.id]);

  // ── 발사 시작 (카운트다운 후) ──────────────────────────────────────────
  const beginFiring = useCallback(() => {
    phaseRef.current = 'playing';
    setPhase('playing');
    countdownRef.current = null;

    const sensSnap = totalSens; // 발사 시작 시점 감도 고정
    const ms = Math.round(60000 / weapon.rpm);
    intervalRef.current = setInterval(() => {
      const pat = patternRef.current;
      const f   = frameRef.current;
      if (f >= pat.length) { clearInterval(intervalRef.current); return; }

      const [nx, ny] = pat[f];
      const sx = PCX + nx * PSX - compRef.current.x;
      const sy = PCY - ny * PSY + compRef.current.y;
      shotsRef.current.push({ sx, sy });
      frameRef.current++;

      if (frameRef.current >= pat.length) {
        clearInterval(intervalRef.current);
        const shots = [...shotsRef.current];
        const HIT_R = 30;
        const hits  = shots.filter(({ sx: x, sy: y }) => {
          const dx = x - PCX, dy = y - PCY;
          return Math.sqrt(dx * dx + dy * dy) <= HIT_R;
        }).length;
        const accuracy = Math.round((hits / shots.length) * 100);
        phaseRef.current = 'done';
        setResults({ accuracy, hits, total: shots.length });
        setPhase('done');
      }
    }, ms);

    // sensSnap 은 handleMouseMove ref에 반영되도록 sensRef 사용
    sensRef.current = sensSnap;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weapon.rpm, totalSens]);

  // sensRef — 발사 중 감도 (stale closure 방지)
  const sensRef = useRef(totalSens);
  useEffect(() => { sensRef.current = totalSens; }, [totalSens]);

  // ── 카운트다운 시작 ────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    // 이전 타이머 정리
    countdownTimersRef.current.forEach(clearTimeout);
    clearInterval(intervalRef.current);
    cancelAnimationFrame(rAFRef.current);

    compRef.current  = { x: 0, y: 0 };
    frameRef.current = 0;
    shotsRef.current = [];
    setResults(null);
    phaseRef.current   = 'countdown';
    countdownRef.current = 3;
    setPhase('countdown');

    const t1 = setTimeout(() => { countdownRef.current = 2; }, 1000);
    const t2 = setTimeout(() => { countdownRef.current = 1; }, 2000);
    const t3 = setTimeout(() => { countdownRef.current = 'GO!'; }, 3000);
    const t4 = setTimeout(() => { beginFiring(); }, 3500);
    countdownTimersRef.current = [t1, t2, t3, t4];
  }, [beginFiring]);

  // ── 중지 ──────────────────────────────────────────────────────────────
  const stopGame = useCallback(() => {
    countdownTimersRef.current.forEach(clearTimeout);
    clearInterval(intervalRef.current);
    cancelAnimationFrame(rAFRef.current);
    phaseRef.current   = 'idle';
    countdownRef.current = null;
    setPhase('idle');
    compRef.current  = { x: 0, y: 0 };
    frameRef.current = 0;
    shotsRef.current = [];
    setResults(null);
  }, []);

  useEffect(() => () => {
    countdownTimersRef.current.forEach(clearTimeout);
    clearInterval(intervalRef.current);
    cancelAnimationFrame(rAFRef.current);
  }, []);

  // ── 마우스 보정 ────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    if (phaseRef.current !== 'playing') return;
    compRef.current.x += e.movementX * sensRef.current;
    compRef.current.y += e.movementY * sensRef.current;
  }, []);

  const rating = results
    ? results.accuracy >= 80 ? { icon: '🏆', label: '마스터' }
    : results.accuracy >= 60 ? { icon: '⭐', label: '숙련' }
    : results.accuracy >= 40 ? { icon: '📈', label: '연습 중' }
    : { icon: '💪', label: '계속 연습하세요' }
    : null;

  const isIdle     = phase === 'idle';
  const isDone     = phase === 'done';
  const isPlaying  = phase === 'playing';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

      {/* 왼쪽: 설정 + 캔버스 */}
      <div className="space-y-3">

        {/* DPI + 스코프 설정 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {/* DPI */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400">DPI 설정</span>
              <input
                type="number"
                value={dpiInput}
                onChange={(e) => {
                  setDpiInput(e.target.value);
                  const v = parseInt(e.target.value, 10);
                  if (v >= 100 && v <= 16000) setDpi(v);
                }}
                className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-0.5 text-xs text-white font-mono text-center"
                min="100" max="16000"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {DPI_PRESETS.map((d) => (
                <button key={d} onClick={() => { setDpi(d); setDpiInput(String(d)); }}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition-all ${
                    dpi === d ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}>
                  {d}
                </button>
              ))}
            </div>
            <div className="mt-1.5 text-[10px] text-gray-500">
              기준(800) 대비 ×{(dpi / 800).toFixed(2)} 감도
            </div>
          </div>

          {/* 스코프 */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-3">
            <div className="text-xs font-semibold text-gray-400 mb-2">스코프 모드</div>
            <div className="flex gap-1 flex-wrap">
              {SCOPE_PRESETS.map((s) => (
                <button key={s.id} onClick={() => setScopeId(s.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                    scopeId === s.id ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="mt-1.5 text-[10px] text-gray-500">
              감도 배율: ×{scope.mult} &nbsp;|&nbsp; 최종 보정 감도: ×{totalSens.toFixed(2)}
            </div>
          </div>
        </div>

        {/* 캔버스 + 오버레이 */}
        <div className="relative rounded-2xl overflow-hidden bg-gray-950 border border-gray-700 select-none"
          style={{ cursor: isPlaying ? 'none' : 'default' }}
          onMouseMove={handleMouseMove}
        >
          <canvas ref={canvasRef} width={PCW} height={PCH}
            style={{ display: 'block', width: '100%', height: 'auto' }} />

          {/* idle 오버레이 — 중앙 시작 버튼 */}
          {isIdle && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button onClick={startGame}
                className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold px-10 py-4 rounded-2xl text-lg shadow-2xl shadow-blue-600/50 transition-all">
                🎮 연습 시작
              </button>
            </div>
          )}

          {/* done 오버레이 */}
          {isDone && results && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-3">
              <div className="text-5xl">{rating?.icon}</div>
              <div className="text-5xl font-black text-white">{results.accuracy}%</div>
              <div className="text-gray-300 text-sm">{results.hits} / {results.total}발 적중 · {rating?.label}</div>
              <button onClick={startGame}
                className="mt-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold px-8 py-3 rounded-xl text-sm shadow-xl transition-all">
                🔄 다시 연습
              </button>
              <button onClick={stopGame}
                className="text-gray-400 hover:text-white text-xs transition-colors">
                결과 닫기
              </button>
            </div>
          )}

          {/* playing 중 중지 버튼 (우상단) */}
          {isPlaying && (
            <button onClick={stopGame}
              className="absolute top-3 right-3 bg-gray-800/80 hover:bg-red-700 text-gray-300 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all">
              ⏹ 중지
            </button>
          )}
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-4 text-[10px] text-gray-500 px-1">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400"/>초반</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-yellow-400"/>중반</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400"/>후반</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-yellow-300"/>현재 조준</div>
          <div className="flex items-center gap-1.5 ml-auto"><div className="w-5 h-0.5 rounded bg-green-700 border border-green-600"/>적중 범위</div>
        </div>
      </div>

      {/* 오른쪽: 안내 + 무기 정보 */}
      <div className="space-y-4">

        {/* 방법 안내 */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
          <h3 className="font-bold text-white mb-3 text-sm">🎯 연습 방법</h3>
          <div className="space-y-2 text-sm text-gray-400">
            <p><span className="text-white font-semibold">1.</span> DPI · 스코프 설정 후 시작</p>
            <p><span className="text-white font-semibold">2.</span> 3·2·1 카운트다운 후 자동 발사</p>
            <p><span className="text-white font-semibold">3.</span> <span className="text-yellow-400">노란 조준점</span>을 마우스로 중앙에 유지</p>
            <p><span className="text-white font-semibold">4.</span> 발사 완료 후 정확도 표시</p>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500 space-y-1">
            <p>• 녹색 원 안 = <span className="text-green-400">적중</span> (반지름 30px)</p>
            <p>• 높은 DPI = 마우스 이동 적어도 됨 (쉬움)</p>
            <p>• 높은 배율 스코프 = 감도 감소 (더 어려움)</p>
          </div>
        </div>

        {/* 현재 무기 */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: weapon.color }} />
            <span className="font-bold text-white">{weapon.name}</span>
            <span className="text-gray-500 text-sm">{weapon.cal}</span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">{weapon.desc}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            {[
              { label: '데미지', v: weapon.dmg },
              { label: 'RPM',    v: weapon.rpm },
              { label: '간격',   v: `${Math.round(60000 / weapon.rpm)}ms` },
            ].map(({ label, v }) => (
              <div key={label} className="bg-gray-800 rounded-lg p-2">
                <div className="font-bold text-white text-sm">{v}</div>
                <div className="text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 현재 설정 요약 */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 text-xs space-y-1.5 text-gray-400">
          <div className="text-gray-300 font-semibold text-sm mb-2">현재 감도 설정</div>
          <div className="flex justify-between"><span>DPI</span><span className="text-white font-mono">{dpi}</span></div>
          <div className="flex justify-between"><span>스코프</span><span className="text-white">{scope.label} (×{scope.mult})</span></div>
          <div className="flex justify-between border-t border-gray-700 pt-1.5 mt-1.5">
            <span>최종 감도</span>
            <span className={`font-bold ${totalSens >= 1 ? 'text-green-400' : totalSens >= 0.4 ? 'text-yellow-400' : 'text-red-400'}`}>
              ×{totalSens.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────
export default function RecoilPattern() {
  const [weapon,    setWeapon]    = useState(WEAPONS[0]);
  const [active,    setActive]    = useState({ comp: false, vgrip: false, agrip: false });
  const [animFrame, setAnimFrame] = useState(-1);
  const [mode,      setMode]      = useState('view'); // 'view' | 'practice'
  const animRef = useRef(null);

  const toggleAttach = (id) => {
    setActive(prev => ({ comp: false, vgrip: false, agrip: false, [id]: !prev[id] }));
  };

  const playAnim = useCallback(() => {
    clearInterval(animRef.current);
    setAnimFrame(0);
    const ms = Math.round(60000 / weapon.rpm);
    let frame = 0;
    animRef.current = setInterval(() => {
      frame++;
      setAnimFrame(frame);
      if (frame >= weapon.pattern.length) {
        clearInterval(animRef.current);
        setTimeout(() => setAnimFrame(-1), 800);
      }
    }, ms);
  }, [weapon]);

  const stopAnim = useCallback(() => {
    clearInterval(animRef.current);
    setAnimFrame(-1);
  }, []);

  useEffect(() => () => clearInterval(animRef.current), []);

  const pattern = applyAttach(weapon.pattern, active);
  const maxNy   = Math.max(...pattern.map(([, ny]) => ny));
  const lastNx  = pattern[pattern.length - 1]?.[0] ?? 0;
  const isPlaying = animFrame >= 0;

  const dirArrow = Math.abs(lastNx) < 0.04 ? '↓'
                 : lastNx > 0 ? '↙' : '↘';

  return (
    <div className="min-h-screen bg-gray-950">
      <Head>
        <title>반동 패턴 시뮬레이터 | PKGG</title>
        <meta name="description" content="PUBG 총기별 반동 패턴 시각화 — M416, AKM, SCAR-L, Beryl, Groza 등 8종. 어태치먼트 효과 비교. 직접 반동을 제어해보는 연습 모드 제공." />
        <meta property="og:title" content="반동 패턴 시뮬레이터 | PKGG" />
        <meta property="og:image" content="https://pk.gg/og.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://pk.gg/og.png" />
      </Head>
      <Header />

      <main className="max-w-screen-xl mx-auto px-4 py-8 space-y-6">

        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-black text-white mb-1">🔫 반동 패턴 시뮬레이터</h1>
          <p className="text-gray-400 text-sm">총기별 연사 반동 패턴 시각화 — 어태치먼트 효과 비교 · 직접 반동 제어 연습</p>
        </div>

        {/* 모드 탭 */}
        <div className="flex gap-1 bg-gray-900 border border-gray-700 rounded-xl p-1 w-fit">
          {[
            { key: 'view',     label: '📊 패턴 보기' },
            { key: 'practice', label: '🎮 반동 연습' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => { setMode(key); stopAnim(); }}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === key
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* 총기 선택 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {WEAPONS.map(w => (
            <button key={w.id}
              onClick={() => { setWeapon(w); stopAnim(); }}
              className="p-3 rounded-xl border text-left transition-all"
              style={weapon.id === w.id
                ? { borderColor: w.color, backgroundColor: w.color + '20', color: '#fff' }
                : { borderColor: '#374151', backgroundColor: '#111827', color: '#9CA3AF' }
              }
            >
              <div className="font-bold text-sm">{w.name}</div>
              <div className="text-[10px] opacity-60 mt-0.5">{w.cal} · {w.rpm}RPM</div>
            </button>
          ))}
        </div>

        {/* ── 패턴 보기 ── */}
        {mode === 'view' && (
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">

            {/* 좌측: 캔버스 */}
            <div className="space-y-3">
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-3">
                <PatternCanvas weapon={weapon} attachActive={active} animFrame={animFrame} />
              </div>

              <div className="bg-gray-900 border border-gray-700 rounded-xl p-3">
                <div className="text-xs text-gray-500 font-semibold mb-2">어태치먼트 (하나만 선택)</div>
                <div className="flex gap-2">
                  {ATTACHMENTS.map(a => (
                    <button key={a.id} onClick={() => toggleAttach(a.id)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        active[a.id]
                          ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                      }`}>
                      {a.label}
                    </button>
                  ))}
                </div>
                {Object.values(active).some(Boolean) && (
                  <p className="text-[10px] text-gray-500 mt-2">
                    {ATTACHMENTS.filter(a => active[a.id]).map(a => a.desc).join(' / ')}
                  </p>
                )}
              </div>

              <button onClick={isPlaying ? stopAnim : playAnim}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                  isPlaying
                    ? 'bg-red-700/80 text-red-200 hover:bg-red-700'
                    : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20'
                }`}>
                {isPlaying ? `⏹ 정지  (${animFrame}/${weapon.pattern.length}발)` : '▶ 연사 시뮬레이션'}
              </button>

              <div className="flex items-center gap-4 text-[10px] text-gray-500 px-1">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400"/>초반</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-yellow-400"/>중반</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400"/>후반</div>
                <span className="ml-auto">숫자 = 5발 단위</span>
              </div>
            </div>

            {/* 우측: 정보 */}
            <div className="space-y-4">
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: weapon.color }} />
                  <h2 className="font-black text-white text-xl">{weapon.name}</h2>
                  <span className="text-gray-500 text-sm">{weapon.cal}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[{ label: '데미지', value: weapon.dmg }, { label: 'RPM', value: weapon.rpm }, { label: '기본 탄창', value: weapon.rounds }].map(s => (
                    <div key={s.label} className="bg-gray-800 rounded-xl p-3 text-center">
                      <div className="text-xl font-black text-white">{s.value}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{weapon.desc}</p>
              </div>

              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
                <h3 className="font-bold text-gray-200 mb-4 text-sm">🖱️ 마우스 보정 가이드</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="text-xs text-gray-500 mb-1">아래로 당기기</div>
                    <div className="font-bold text-white mb-2">{weapon.pullDown}</div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.round(maxNy * 100)}%`, backgroundColor: weapon.color }} />
                    </div>
                    <div className="text-[10px] text-gray-600 mt-1">{Math.round(maxNy * 100)}% 강도</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="text-xs text-gray-500 mb-1">보정 방향</div>
                    <div className="font-bold text-white mb-2">{weapon.pullH}</div>
                    <div className="text-4xl text-center" style={{ color: weapon.color }}>{dirArrow}</div>
                  </div>
                </div>
                <div className="bg-gray-800/60 rounded-xl p-3 text-xs text-gray-400 leading-relaxed">
                  <span className="text-gray-300 font-semibold">보정 요령:</span>{' '}
                  연사 시작과 함께 마우스를 <strong className="text-white">아래로 천천히 당깁니다</strong>.
                  패턴이 우측으로 흘러가면 <strong className="text-white">좌측 방향</strong>도 함께 보정하세요.
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
                <h3 className="font-bold text-gray-200 mb-3 text-sm">💡 연사 제어 팁</h3>
                <div className="space-y-2.5 text-sm text-gray-400">
                  <p>• 처음 3~5발은 가장 강하게 당기고, 이후 일정한 속도로 유지합니다.</p>
                  <p>• 원거리(100m+)에서는 5발 이내 점사가 훨씬 효율적입니다.</p>
                  <p>• 이동 중 연사는 반동이 크게 증가하므로 멈춰서 사격하세요.</p>
                  {weapon.cal === '7.62mm' && (
                    <p className="text-yellow-400/90">⚠ 7.62mm 무기는 수직 반동이 강합니다. 3~5발 점사를 먼저 숙달하세요.</p>
                  )}
                  {(weapon.id === 'BERYL' || weapon.id === 'GROZA') && (
                    <p className="text-red-400/90">⚠ 이 무기는 반동이 매우 강합니다. 근거리 전투에서만 풀오토를 권장합니다.</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
                <h3 className="font-bold text-gray-200 mb-3 text-sm">🔧 어태치먼트 효과 비교</h3>
                <div className="space-y-2">
                  {ATTACHMENTS.map(a => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{a.label}</span>
                      <span className="text-gray-300 text-xs font-mono">{a.desc}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-3">* 보정기는 소음기와 겸용 불가. 수직/앵글드 그립은 하나만 장착 가능.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── 반동 연습 ── */}
        {mode === 'practice' && (
          <PracticeMode weapon={weapon} attachActive={active} />
        )}

      </main>
    </div>
  );
}
