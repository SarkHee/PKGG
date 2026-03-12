// pages/sensitivity-analyzer.js — PUBG 감도 분석기 + 슬로우모션 리뷰
import Head from 'next/head';
import { useState, useRef, useCallback, useEffect } from 'react';
import Header from '../components/layout/Header';

// ── PUBG 스코프 FOV 데이터 ──────────────────────────────────────────────────
const SCOPES = [
  { id: 'hip',   label: '일반 조준',   fov: 103, key: 'hip'   },
  { id: 'red',   label: '홀로/레드닷', fov: 78,  key: 'red'   },
  { id: 'x2',    label: '2배율',       fov: 55,  key: 'x2'    },
  { id: 'x3',    label: '3배율',       fov: 40,  key: 'x3'    },
];

const SPEED_OPTIONS = [
  { label: '0.1×', value: 0.1 },
  { label: '0.25×', value: 0.25 },
  { label: '0.5×', value: 0.5 },
  { label: '1×', value: 1 },
];

// Viewspeed 방식: sqrt(tan(fov_scope/2) / tan(fov_base/2))
function calcViewspeedSens(baseSens, baseFov, scopeFov) {
  const toRad = (d) => (d * Math.PI) / 180;
  const ratio = Math.sqrt(Math.tan(toRad(scopeFov / 2)) / Math.tan(toRad(baseFov / 2)));
  return Math.round(baseSens * ratio * 100) / 100;
}

// 0/76.8 방식 (픽셀 기준 일정)
function calc0768Sens(baseSens, baseFov, scopeFov) {
  const ratio = (1 / Math.tan((scopeFov / 2) * (Math.PI / 180))) /
                (1 / Math.tan((baseFov  / 2) * (Math.PI / 180)));
  // PUBG 인게임 스케일 보정 (~76.8 factor)
  const raw = baseSens * ratio;
  return Math.round(raw * 100) / 100;
}

function getEdpiProfile(edpi) {
  if (edpi < 400)  return { label: '매우 저감도', color: '#6366F1', tip: '정밀 스나이핑에 특화, 빠른 에임 전환 어려움' };
  if (edpi < 700)  return { label: '저감도',     color: '#3B82F6', tip: '안정적인 반동제어, 장거리 우세' };
  if (edpi < 1000) return { label: '중저감도',   color: '#10B981', tip: '대부분 상위 프로게이머 범위' };
  if (edpi < 1400) return { label: '중감도',     color: '#84CC16', tip: '균형잡힌 에임, 가장 일반적인 범위' };
  if (edpi < 2000) return { label: '고감도',     color: '#F59E0B', tip: '근거리 파이트, 빠른 에임 전환' };
  return { label: '초고감도', color: '#EF4444', tip: '반응속도 위주, 안정성 낮음' };
}

export default function SensitivityAnalyzer() {
  // ── 설정 입력 ──────────────────────────────────────────────────────────────
  const [dpi, setDpi] = useState(800);
  const [hipSens, setHipSens] = useState(50);
  const [vertSens, setVertSens] = useState(1.0);
  const [currentScopes, setCurrentScopes] = useState({
    red: 45, x2: 40, x3: 35,
  });
  const [method, setMethod] = useState('viewspeed'); // viewspeed | 0768

  // ── 체감 질문 ──────────────────────────────────────────────────────────────
  const [feel, setFeel] = useState({ overshoot: null, tracking: null, scope: null });

  // ── 결과 ───────────────────────────────────────────────────────────────────
  const [result, setResult] = useState(null);
  const [step, setStep] = useState('input'); // input | result

  // ── 영상 리뷰 (선택) ────────────────────────────────────────────────────────
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // ── 반동 마킹 ─────────────────────────────────────────────────────────────
  // markMode: null | 'enemy'
  const [markMode, setMarkMode] = useState(null);
  const [marks, setMarks] = useState([]);      // [{x, y, time}] 적 위치 — normalized 0-1
  const [targetBox, setTargetBox] = useState(null); // {x1,y1,x2,y2} 적 영역

  // canvas 다시 그리기
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // 적 영역 박스
    if (targetBox) {
      const bx = targetBox.x1 * W, by = targetBox.y1 * H;
      const bw = (targetBox.x2 - targetBox.x1) * W;
      const bh = (targetBox.y2 - targetBox.y1) * H;
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(249,115,22,0.12)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('적 영역', bx + 4, by + 13);
      // 중심점 십자
      const cx = (targetBox.x1 + targetBox.x2) / 2 * W;
      const cy = (targetBox.y1 + targetBox.y2) / 2 * H;
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8); ctx.stroke();
    }

    // 조준점 마크 + 화살표
    marks.forEach((m, i) => {
      const px = m.x * W, py = m.y * H;
      // 이전 점 → 현재 점 방향 화살표
      if (i > 0) {
        const prev = marks[i - 1];
        const x1 = prev.x * W, y1 = prev.y * H;
        const angle = Math.atan2(py - y1, px - x1);
        const len = Math.hypot(px - x1, py - y1);
        if (len > 2) {
          // 선
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(px, py);
          ctx.strokeStyle = 'rgba(59,130,246,0.8)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          // 화살촉
          const aLen = Math.min(10, len * 0.4);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px - aLen * Math.cos(angle - 0.4), py - aLen * Math.sin(angle - 0.4));
          ctx.lineTo(px - aLen * Math.cos(angle + 0.4), py - aLen * Math.sin(angle + 0.4));
          ctx.closePath();
          ctx.fillStyle = '#3b82f6';
          ctx.fill();
          // 이동 거리 레이블 (px 단위)
          const midX = (x1 + px) / 2, midY = (y1 + py) / 2;
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.font = '8px sans-serif';
          ctx.fillText(`${Math.round(len)}px`, midX + 3, midY - 2);
        }
      }
      // 점
      const color = i === 0 ? '#22c55e' : i === marks.length - 1 ? '#ef4444' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
      // 번호
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(i + 1, px + 7, py - 4);
    });
  }, [marks, targetBox]);

  useEffect(() => { redrawCanvas(); }, [redrawCanvas]);

  // 마우스 이벤트 — enemy: click (적 위치 마킹)
  const handleCanvasMouseDown = useCallback(() => {}, []);

  const handleCanvasMouseUp = useCallback((e) => {
    if (markMode !== 'enemy') return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const time = videoRef.current?.currentTime ?? 0;
    setMarks(prev => [...prev, { x, y, time }]);
    // 적 영역 자동 업데이트 (첫 마킹 기준 중심)
    if (marks.length === 0) {
      setTargetBox({ x1: x - 0.04, y1: y - 0.07, x2: x + 0.04, y2: y + 0.07 });
    }
  }, [markMode, marks]);

  // 발사 순서별 색상 (초록 → 노랑 → 빨강)
  const shotColor = (i, total) => {
    const t = total <= 1 ? 0 : i / (total - 1);
    const hue = Math.round(120 - t * 120);
    return `hsl(${hue},100%,55%)`;
  };

  const analyzeRecoil = () => {
    if (marks.length < 2) return null;
    const W = 1280, H = 720;
    // 첫 마킹을 기준점(적 중심)으로 사용
    const refX = targetBox ? (targetBox.x1 + targetBox.x2) / 2 : marks[0].x;
    const refY = targetBox ? (targetBox.y1 + targetBox.y2) / 2 : marks[0].y;

    // 각 마킹의 적 기준 절대 편차 (px)
    const shots = marks.map((m, i) => ({
      idx: i,
      rx: (m.x - refX) * W,   // + = 오른쪽
      ry: (m.y - refY) * H,   // + = 아래 (반동 = 위로 튐 → ry 감소)
      time: m.time,
    }));

    // 연속 벡터
    const vectors = marks.slice(1).map((m, i) => ({
      dx: (m.x - marks[i].x) * W,
      dy: (m.y - marks[i].y) * H,
      pxLen: Math.hypot((m.x - marks[i].x) * W, (m.y - marks[i].y) * H),
    }));

    const avgDx = vectors.reduce((s, v) => s + v.dx, 0) / vectors.length;
    const avgDy = vectors.reduce((s, v) => s + v.dy, 0) / vectors.length;
    const totalDist = Math.sqrt(vectors.reduce((s, v) => s + v.dx ** 2 + v.dy ** 2, 0) / vectors.length);
    const dyMean = vectors.reduce((s, v) => s + v.dy, 0) / vectors.length;
    const dyVar = vectors.reduce((s, v) => s + (v.dy - dyMean) ** 2, 0) / vectors.length;
    const consistency = Math.max(0, Math.round((1 - Math.sqrt(dyVar) / (totalDist + 0.001)) * 100));

    return { avgDx, avgDy, vectors, consistency, totalDist, shots };
  };

  // ── 영상 파일 처리 ─────────────────────────────────────────────────────────
  const handleVideoFile = useCallback((file) => {
    if (!file?.type.startsWith('video/')) return;
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoOpen(true);
  }, []);

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (playing) {
      vid.pause();
    } else {
      vid.play().catch(() => { vid.muted = true; vid.play().catch(() => {}); });
    }
  };

  const handleSpeedChange = (v) => {
    setSpeed(v);
    if (videoRef.current) videoRef.current.playbackRate = v;
  };

  // ── 감도 계산 ──────────────────────────────────────────────────────────────
  const calcSens = useCallback((baseSens, scopeFov) => {
    const baseFov = SCOPES[0].fov; // 103
    return method === 'viewspeed'
      ? calcViewspeedSens(baseSens, baseFov, scopeFov)
      : calc0768Sens(baseSens, baseFov, scopeFov);
  }, [method]);

  // 체감 기반 보정 배율
  const getFeelMultiplier = () => {
    let m = 1;
    if (feel.overshoot === 'yes') m *= 0.88;   // 과보정 → 낮춤
    if (feel.overshoot === 'no')  m *= 1.1;    // 너무 느림 → 높임
    if (feel.tracking === 'slow') m *= 1.08;
    if (feel.tracking === 'fast') m *= 0.92;
    return m;
  };

  const runAnalysis = () => {
    const mult = getFeelMultiplier();
    const adjustedHip = Math.round(hipSens * mult * 10) / 10;
    const edpi = dpi * (hipSens / 100);
    const adjustedEdpi = dpi * (adjustedHip / 100);

    const recommended = {};
    SCOPES.slice(1).forEach(s => {
      recommended[s.key] = calcSens(adjustedHip, s.fov);
    });

    // 현재 스코프 감도 분석
    const analysis = {};
    SCOPES.slice(1).forEach(s => {
      const ideal = calcSens(hipSens, s.fov);
      const current = currentScopes[s.key] || 0;
      const diff = current - ideal;
      analysis[s.key] = {
        ideal: Math.round(ideal * 10) / 10,
        current,
        diff: Math.round(diff * 10) / 10,
        status: Math.abs(diff) < 3 ? 'good' : diff > 0 ? 'high' : 'low',
      };
    });

    setResult({ adjustedHip, adjustedEdpi, edpi, recommended, analysis, mult, vertSens });
    setStep('result');
  };

  const edpi = dpi * (hipSens / 100);
  const edpiProfile = getEdpiProfile(edpi);

  const fmt = (t) => {
    const m = Math.floor(t / 60);
    const s = (t % 60).toFixed(1).padStart(4, '0');
    return `${m}:${s}`;
  };

  return (
    <>
      <Head>
        <title>감도 분석기 — PK.GG</title>
        <meta name="description" content="PUBG 감도 설정을 분석하고 스코프별 최적 감도를 추천합니다." />
      </Head>
      <div className="min-h-screen bg-gray-950 text-white">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-6">

          {/* 타이틀 */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-1.5 text-blue-400 text-sm mb-3">
              🎯 스코프별 최적 감도 자동 계산
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">감도 분석기</h1>
            <p className="text-gray-400 text-sm">DPI와 현재 감도를 입력하면 스코프별 최적 감도를 추천합니다. 연습 영상도 슬로우모션으로 복기할 수 있어요.</p>
          </div>

          {/* ── 영상 리뷰 섹션 (선택) ── */}
          <div className="bg-gray-800 rounded-xl mb-5 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">🎬 연습 영상 슬로우모션 리뷰</span>
                <span className="text-xs text-gray-400">(선택)</span>
              </div>
              <div className="flex items-center gap-2">
                {!videoUrl && (
                  <button
                    onClick={() => document.getElementById('videoFileInput').click()}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                  >
                    영상 불러오기
                  </button>
                )}
                {videoUrl && (
                  <button
                    onClick={() => setVideoOpen(o => !o)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                  >
                    {videoOpen ? '접기 ▲' : '펼치기 ▼'}
                  </button>
                )}
                <input id="videoFileInput" type="file" accept="video/*" className="hidden"
                  onChange={(e) => handleVideoFile(e.target.files[0])} />
              </div>
            </div>

            {videoUrl && videoOpen && (() => {
              const r = marks.length >= 2 ? analyzeRecoil() : null;
              // 반동 경로 SVG 계산
              const PW = 240, PH = 480;
              let pathPoints = [];
              let scatterScale = 50;
              if (r) {
                const maxR = Math.max(10, ...r.shots.map(s => Math.max(Math.abs(s.rx), Math.abs(s.ry))));
                scatterScale = maxR * 1.4;
                pathPoints = r.shots.map(s => ({
                  x: PW/2 + (s.rx / scatterScale) * (PW/2 - 20),
                  y: 30   + (s.ry / scatterScale) * (PH - 60),
                  rx: s.rx, ry: s.ry, idx: s.idx,
                }));
              }
              const SP = 180;
              return (
                <div className="px-4 pb-4">
                  {/* 3열 레이아웃 */}
                  <div className="grid gap-3" style={{ gridTemplateColumns: r ? '1fr 1fr 1fr' : '1fr' }}>

                    {/* ── 열1: 영상 플레이어 ── */}
                    <div className="space-y-2">
                      <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                        <video
                          key={videoUrl}
                          ref={videoRef}
                          src={videoUrl}
                          className="w-full h-full object-contain"
                          playsInline
                          preload="auto"
                          onLoadedMetadata={(e) => setDuration(e.target.duration)}
                          onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                          onPlay={() => setPlaying(true)}
                          onPause={() => setPlaying(false)}
                          onEnded={() => setPlaying(false)}
                        />
                        <canvas
                          ref={canvasRef}
                          width={1280}
                          height={720}
                          onMouseDown={handleCanvasMouseDown}
                          onMouseUp={handleCanvasMouseUp}
                          className="absolute inset-0 w-full h-full"
                          style={{ cursor: markMode === 'enemy' ? 'crosshair' : 'default' }}
                        />
                        {/* 발사 번호 오버레이 */}
                        {marks.length > 0 && (
                          <div className="absolute top-2 left-2 bg-black/80 rounded px-2 py-1 text-xs font-bold text-orange-400 pointer-events-none">
                            발사 #{marks.length}
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 bg-black/70 rounded px-2 py-0.5 text-xs font-mono text-white pointer-events-none">
                          {fmt(currentTime)} / {fmt(duration)} &nbsp;|&nbsp; {speed}×
                        </div>
                      </div>

                      {/* 시크바 */}
                      <input type="range" min="0" max={duration || 1} step="0.033"
                        value={currentTime}
                        onChange={(e) => { if (videoRef.current) videoRef.current.currentTime = Number(e.target.value); }}
                        className="w-full accent-blue-500 h-1.5" />

                      {/* 재생 컨트롤 */}
                      <div className="flex items-center gap-1 flex-wrap">
                        <button onClick={() => { if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = Math.max(0, currentTime - 1/30); }}}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">⏮1f</button>
                        <button onClick={togglePlay}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium">
                          {playing ? '⏸' : '▶'}
                        </button>
                        <button onClick={() => { if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = Math.min(duration, currentTime + 1/30); }}}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">1f⏭</button>
                        <div className="flex gap-1 ml-auto">
                          {SPEED_OPTIONS.map(s => (
                            <button key={s.value} onClick={() => handleSpeedChange(s.value)}
                              className={`px-2 py-1 rounded text-xs ${speed === s.value ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}`}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                        <button onClick={() => { setVideoUrl(null); setVideoOpen(false); }}
                          className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-500 hover:text-red-400">✕</button>
                      </div>

                      {/* 마킹 컨트롤 */}
                      <div className="bg-gray-900 rounded-lg p-3 space-y-2">
                        <p className="text-xs text-gray-400">총 쏠 때 <span className="text-orange-300 font-bold">적 몸통</span>을 프레임마다 클릭</p>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => { setMarkMode(m => m === 'enemy' ? null : 'enemy'); if (videoRef.current) videoRef.current.pause(); }}
                            className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors ${markMode === 'enemy' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-orange-600 hover:text-white'}`}>
                            {markMode === 'enemy' ? `🟠 마킹 중 (${marks.length}발)` : '🎯 마킹 ON'}
                          </button>
                          {marks.length > 0 && (
                            <button onClick={() => setMarks(p => p.slice(0, -1))}
                              className="px-3 py-1.5 rounded text-xs bg-gray-700 text-gray-400 hover:bg-gray-600">↩</button>
                          )}
                          {marks.length > 0 && (
                            <button onClick={() => { setMarks([]); setTargetBox(null); }}
                              className="px-3 py-1.5 rounded text-xs bg-gray-700 text-red-400 hover:bg-gray-600">초기화</button>
                          )}
                        </div>
                        {/* 발사별 수치 테이블 */}
                        {r && (
                          <div className="max-h-40 overflow-y-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-500 border-b border-gray-700">
                                  <th className="text-left pb-1">#</th>
                                  <th className="text-right pb-1">수직</th>
                                  <th className="text-right pb-1">수평</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.shots.map((s, i) => (
                                  <tr key={i} className="border-b border-gray-800">
                                    <td className="py-0.5" style={{ color: shotColor(i, r.shots.length) }}>발사{i+1}</td>
                                    <td className={`text-right py-0.5 ${s.ry < 0 ? 'text-orange-400' : s.ry > 0 ? 'text-blue-400' : 'text-gray-400'}`}>
                                      {s.ry < 0 ? '↑' : s.ry > 0 ? '↓' : '·'}{Math.abs(s.ry).toFixed(0)}px
                                    </td>
                                    <td className={`text-right py-0.5 ${Math.abs(s.rx) > 3 ? 'text-yellow-400' : 'text-gray-400'}`}>
                                      {s.rx > 0 ? '→' : s.rx < 0 ? '←' : '·'}{Math.abs(s.rx).toFixed(0)}px
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── 열2: 반동 경로 (큰 시각화) ── */}
                    {r && (
                      <div className="bg-gray-900 rounded-xl p-3 flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-white">반동 경로</span>
                          <div className="flex gap-3 text-xs text-gray-500">
                            <span className="text-green-400">● 1발</span>
                            <span className="text-yellow-400">● 중간</span>
                            <span className="text-red-400">● 마지막</span>
                          </div>
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                          <svg width={PW} height={PH} style={{ background: '#0f172a', borderRadius: 8 }}>
                            {/* 격자 */}
                            {[-2,-1,0,1,2].map(i => (
                              <line key={`v${i}`} x1={PW/2 + i*(PW/2-20)/2} y1={10} x2={PW/2 + i*(PW/2-20)/2} y2={PH-10} stroke="#1e293b" strokeWidth={i===0?1.5:0.5}/>
                            ))}
                            {[0,1,2,3,4].map(i => (
                              <line key={`h${i}`} x1={10} y1={30 + i*(PH-60)/4} x2={PW-10} y2={30 + i*(PH-60)/4} stroke="#1e293b" strokeWidth={i===0?1.5:0.5}/>
                            ))}
                            {/* 중심 크로스헤어 */}
                            <line x1={PW/2-10} y1={30} x2={PW/2+10} y2={30} stroke="#22c55e" strokeWidth="1.5"/>
                            <line x1={PW/2} y1={20} x2={PW/2} y2={40} stroke="#22c55e" strokeWidth="1.5"/>
                            <text x={PW/2+12} y={34} fill="#22c55e" fontSize="9" fontWeight="bold">조준점</text>
                            {/* 경로 선 */}
                            {pathPoints.slice(1).map((pt, i) => (
                              <line key={i}
                                x1={pathPoints[i].x} y1={pathPoints[i].y}
                                x2={pt.x} y2={pt.y}
                                stroke={shotColor(i, pathPoints.length)}
                                strokeWidth="2" strokeOpacity="0.8"
                              />
                            ))}
                            {/* 각 발사 점 */}
                            {pathPoints.map((pt, i) => (
                              <g key={i}>
                                <circle cx={pt.x} cy={pt.y} r="6" fill={shotColor(i, pathPoints.length)} stroke="#0f172a" strokeWidth="1.5"/>
                                <text x={pt.x} y={pt.y+4} textAnchor="middle" fill="#fff" fontSize="7" fontWeight="bold">{i+1}</text>
                              </g>
                            ))}
                            {/* 축 레이블 */}
                            <text x={PW/2} y={PH-2} textAnchor="middle" fill="#475569" fontSize="8">← 좌 / 우 →</text>
                            <text x={8} y={30} fill="#475569" fontSize="8">발사</text>
                            <text x={8} y={PH-12} fill="#475569" fontSize="8">끝</text>
                          </svg>
                        </div>
                        {/* 요약 */}
                        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                          <div className="bg-gray-800 rounded p-1.5">
                            <p className="text-xs text-gray-500">총 발수</p>
                            <p className="text-sm font-black text-white">{marks.length}</p>
                          </div>
                          <div className="bg-gray-800 rounded p-1.5">
                            <p className="text-xs text-gray-500">일관성</p>
                            <p className={`text-sm font-black ${r.consistency >= 70 ? 'text-green-400' : r.consistency >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{r.consistency}%</p>
                          </div>
                          <div className="bg-gray-800 rounded p-1.5">
                            <p className="text-xs text-gray-500">평균수직</p>
                            <p className={`text-sm font-black ${r.avgDy < -0.002 ? 'text-orange-400' : 'text-gray-300'}`}>{Math.abs(r.avgDy * 720).toFixed(0)}px</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── 열3: 탄착 분포 + 코칭 ── */}
                    {r && (
                      <div className="space-y-3">
                        {/* 탄착 분포 (scatter) */}
                        <div className="bg-gray-900 rounded-xl p-3">
                          <p className="text-xs font-bold text-white mb-2">탄착 분포</p>
                          <div className="flex justify-center">
                            <svg width={SP} height={SP} style={{ background: '#0f172a', borderRadius: 8 }}>
                              {/* 격자 */}
                              <line x1={SP/2} y1={0} x2={SP/2} y2={SP} stroke="#1e293b" strokeWidth="1"/>
                              <line x1={0} y1={SP/2} x2={SP} y2={SP/2} stroke="#1e293b" strokeWidth="1"/>
                              {/* 범위 원 */}
                              <circle cx={SP/2} cy={SP/2} r={SP/2-8} fill="none" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4,4"/>
                              <circle cx={SP/2} cy={SP/2} r={(SP/2-8)/2} fill="none" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4,4"/>
                              {/* 적 중심 */}
                              <circle cx={SP/2} cy={SP/2} r="7" fill="rgba(249,115,22,0.2)" stroke="#f97316" strokeWidth="1.5"/>
                              <line x1={SP/2-6} y1={SP/2} x2={SP/2+6} y2={SP/2} stroke="#f97316" strokeWidth="1.5"/>
                              <line x1={SP/2} y1={SP/2-6} x2={SP/2} y2={SP/2+6} stroke="#f97316" strokeWidth="1.5"/>
                              {/* 탄착점 */}
                              {r.shots.map((s, i) => {
                                const sx = SP/2 + (s.rx / scatterScale) * (SP/2 - 12);
                                const sy = SP/2 + (s.ry / scatterScale) * (SP/2 - 12);
                                return (
                                  <g key={i}>
                                    {i > 0 && (
                                      <line
                                        x1={SP/2+(r.shots[i-1].rx/scatterScale)*(SP/2-12)}
                                        y1={SP/2+(r.shots[i-1].ry/scatterScale)*(SP/2-12)}
                                        x2={sx} y2={sy}
                                        stroke={shotColor(i, r.shots.length)} strokeWidth="1" strokeOpacity="0.4"
                                      />
                                    )}
                                    <circle cx={sx} cy={sy} r="4" fill={shotColor(i, r.shots.length)} stroke="#0f172a" strokeWidth="1"/>
                                    <text x={sx+5} y={sy+3} fill="#fff" fontSize="6">{i+1}</text>
                                  </g>
                                );
                              })}
                            </svg>
                          </div>
                          <p className="text-xs text-gray-500 text-center mt-1">십자 = 적 중심 / 점 = 탄착</p>
                        </div>

                        {/* 코칭 */}
                        <div className="bg-gray-900 rounded-xl p-3 space-y-2">
                          <p className="text-xs font-bold text-white">💬 반동 분석</p>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">수직 반동</span>
                              <span className={r.avgDy < -0.002 ? 'text-orange-400 font-bold' : 'text-green-400'}>
                                {r.avgDy < -0.002 ? `↑ ${Math.abs(r.avgDy*720).toFixed(0)}px/f` : '안정 ✓'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">수평 편향</span>
                              <span className={Math.abs(r.avgDx) > 0.002 ? 'text-yellow-400 font-bold' : 'text-green-400'}>
                                {Math.abs(r.avgDx) > 0.002 ? `${r.avgDx > 0 ? '→' : '←'} ${Math.abs(r.avgDx*1280).toFixed(0)}px/f` : '안정 ✓'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">패턴 일관성</span>
                              <span className={r.consistency >= 70 ? 'text-green-400' : r.consistency >= 40 ? 'text-yellow-400' : 'text-red-400'}>
                                {r.consistency}%
                              </span>
                            </div>
                          </div>
                          <div className="border-t border-gray-700 pt-2 space-y-1">
                            {r.avgDy < -0.003 && <p className="text-xs text-orange-300">· 마우스를 아래로 당겨 반동 보정</p>}
                            {r.avgDy >= -0.003 && <p className="text-xs text-green-300">· 수직 반동 제어 양호 ✓</p>}
                            {Math.abs(r.avgDx) > 0.003 && <p className="text-xs text-yellow-300">· {r.avgDx > 0 ? '좌측' : '우측'}으로 {Math.abs(r.avgDx*1280).toFixed(0)}px 보정</p>}
                            {r.consistency < 50 && <p className="text-xs text-red-300">· 패턴 불규칙 — 감도 낮춰 안정화</p>}
                            {r.consistency >= 70 && <p className="text-xs text-green-300">· 반동 일관성 우수 ✓</p>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ── STEP 1: 입력 ── */}
          {step === 'input' && (
            <div className="grid sm:grid-cols-2 gap-4">

              {/* 왼쪽: 기본 설정 */}
              <div className="space-y-4">
                {/* DPI + 일반 감도 */}
                <div className="bg-gray-800 rounded-xl p-5">
                  <h3 className="font-bold text-white mb-4">현재 감도 설정</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">마우스 DPI</label>
                      <input type="number" value={dpi} min="100" max="16000" step="100"
                        onChange={e => setDpi(Number(e.target.value))}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs text-gray-400">일반 감도 (Hip-fire)</label>
                        <span className="text-xs text-white font-medium">{hipSens}</span>
                      </div>
                      <input type="range" min="1" max="100" step="1" value={hipSens}
                        onChange={e => setHipSens(Number(e.target.value))}
                        className="w-full accent-blue-500" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs text-gray-400">수직 감도 배율</label>
                        <span className="text-xs text-white font-medium">{vertSens.toFixed(2)}×</span>
                      </div>
                      <input type="range" min="0.5" max="2.0" step="0.05" value={vertSens}
                        onChange={e => setVertSens(Number(e.target.value))}
                        className="w-full accent-purple-500" />
                      <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                        <span>0.5×</span>
                        <span className={vertSens === 1.0 ? 'text-green-400' : 'text-gray-500'}>1.0× (기본)</span>
                        <span>2.0×</span>
                      </div>
                    </div>
                  </div>

                  {/* eDPI 표시 */}
                  <div className="mt-4 flex items-center gap-3 bg-gray-700/50 rounded-lg px-3 py-2">
                    <div>
                      <span className="text-xs text-gray-400">eDPI</span>
                      <p className="text-xl font-black text-white">{Math.round(edpi)}</p>
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-bold" style={{ color: edpiProfile.color }}>{edpiProfile.label}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{edpiProfile.tip}</p>
                    </div>
                  </div>
                </div>

                {/* 계산 방식 */}
                <div className="bg-gray-800 rounded-xl p-5">
                  <h3 className="font-bold text-white mb-3">스코프 감도 계산 방식</h3>
                  <div className="space-y-2">
                    <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${method === 'viewspeed' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'}`}>
                      <input type="radio" name="method" value="viewspeed" checked={method === 'viewspeed'} onChange={() => setMethod('viewspeed')} className="mt-0.5 accent-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-white">Viewspeed (추천)</p>
                        <p className="text-xs text-gray-400">FOV 변화에 따른 체감 속도를 균일하게. 프로 선수 다수 사용</p>
                      </div>
                    </label>
                    <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${method === '0768' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'}`}>
                      <input type="radio" name="method" value="0768" checked={method === '0768'} onChange={() => setMethod('0768')} className="mt-0.5 accent-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-white">0/76.8 (픽셀 균일)</p>
                        <p className="text-xs text-gray-400">스크린 픽셀당 이동량 동일. 정밀 에임 선호시</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* 오른쪽: 현재 스코프 + 체감 질문 */}
              <div className="space-y-4">
                {/* 현재 스코프 감도 */}
                <div className="bg-gray-800 rounded-xl p-5">
                  <h3 className="font-bold text-white mb-1">현재 스코프 감도</h3>
                  <p className="text-xs text-gray-400 mb-3">현재 설정값을 입력하면 이상적인 값과 비교해드려요</p>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {SCOPES.slice(1).map(s => (
                      <div key={s.key} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-24 flex-shrink-0">{s.label}</span>
                        <input type="range" min="1" max="100" step="1"
                          value={currentScopes[s.key] || 0}
                          onChange={e => setCurrentScopes(prev => ({ ...prev, [s.key]: Number(e.target.value) }))}
                          className="flex-1 accent-blue-500" />
                        <span className="text-xs text-white w-7 text-right flex-shrink-0">{currentScopes[s.key]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 체감 질문 */}
                <div className="bg-gray-800 rounded-xl p-5">
                  <h3 className="font-bold text-white mb-3">체감 질문 (선택)</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-300 mb-1.5">조준 시 적을 자주 지나치나요?</p>
                      <div className="flex gap-2">
                        {[['yes','자주 지나침'], ['no','느린 느낌'], ['fine','적당함']].map(([v, l]) => (
                          <button key={v} onClick={() => setFeel(f => ({ ...f, overshoot: v }))}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${feel.overshoot === v ? 'border-blue-400 bg-blue-500/20 text-blue-300' : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-300 mb-1.5">이동 타겟 추적 느낌은?</p>
                      <div className="flex gap-2">
                        {[['fast','너무 빠름'], ['slow','너무 느림'], ['ok','좋음']].map(([v, l]) => (
                          <button key={v} onClick={() => setFeel(f => ({ ...f, tracking: v }))}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${feel.tracking === v ? 'border-blue-400 bg-blue-500/20 text-blue-300' : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={runAnalysis}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors">
                  감도 분석하기 →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: 결과 ── */}
          {step === 'result' && result && (
            <div className="space-y-5">
              {/* 헤더 */}
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">현재 eDPI</p>
                  <p className="text-2xl font-black text-gray-300">{Math.round(result.edpi)}</p>
                </div>
                <div className={`rounded-xl p-4 text-center ${result.mult !== 1 ? 'bg-blue-900/40 border border-blue-500/30' : 'bg-gray-800'}`}>
                  <p className="text-xs text-blue-300 mb-1">추천 일반 감도</p>
                  <p className="text-2xl font-black text-blue-300">{result.adjustedHip}</p>
                  <p className="text-xs text-gray-400 mt-0.5">eDPI {Math.round(result.adjustedEdpi)}</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">수직 감도</p>
                  <p className="text-2xl font-black text-purple-300">{result.vertSens.toFixed(2)}×</p>
                  <p className="text-xs text-gray-400 mt-0.5">{method === 'viewspeed' ? 'Viewspeed' : '0/76.8'}</p>
                  {result.mult !== 1 && (
                    <p className="text-xs text-orange-400 mt-0.5">
                      체감 반영 {result.mult > 1 ? `+${Math.round((result.mult-1)*100)}%` : `${Math.round((result.mult-1)*100)}%`}
                    </p>
                  )}
                </div>
              </div>

              {/* 스코프별 추천 */}
              <div className="bg-gray-800 rounded-xl p-5">
                <h3 className="font-bold text-white mb-4">스코프별 추천 감도</h3>
                <div className="space-y-2">
                  {SCOPES.slice(1).map(s => {
                    const rec = result.recommended[s.key];
                    const a = result.analysis[s.key];
                    return (
                      <div key={s.key} className="flex items-center gap-3 bg-gray-700/50 rounded-lg px-3 py-2.5">
                        <span className="text-xs text-gray-400 w-24 flex-shrink-0">{s.label}</span>

                        {/* 현재값 */}
                        <div className="text-center flex-shrink-0 w-12">
                          <p className="text-xs text-gray-500">현재</p>
                          <p className="text-sm font-bold text-gray-300">{a.current}</p>
                        </div>

                        {/* 방향 화살표 */}
                        <div className="flex-shrink-0 text-lg">
                          {a.status === 'good'  && <span className="text-green-400">✓</span>}
                          {a.status === 'high'  && <span className="text-orange-400">▼</span>}
                          {a.status === 'low'   && <span className="text-blue-400">▲</span>}
                        </div>

                        {/* 추천값 */}
                        <div className="text-center flex-shrink-0 w-12">
                          <p className="text-xs text-blue-400">추천</p>
                          <p className="text-sm font-black text-blue-300">{rec}</p>
                        </div>

                        {/* 바 */}
                        <div className="flex-1 bg-gray-600 rounded-full h-1.5 hidden sm:block">
                          <div className="bg-blue-500 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, rec)}%` }} />
                        </div>

                        {/* 차이 */}
                        {a.status !== 'good' && (
                          <span className={`text-xs flex-shrink-0 ${a.status === 'high' ? 'text-orange-400' : 'text-blue-400'}`}>
                            {a.diff > 0 ? '+' : ''}{a.diff}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-gray-500 mt-3">
                  ✓ = 현재 설정이 이상적 범위 (±3 이내) &nbsp;|&nbsp; ▼ = 낮추기 권장 &nbsp;|&nbsp; ▲ = 높이기 권장
                </p>
              </div>

              {/* 전체 설정 복사 */}
              <div className="bg-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white">전체 추천 설정값</h3>
                  <button
                    onClick={() => {
                      const lines = [`DPI: ${dpi}`, `일반 감도: ${result.adjustedHip}`, `수직 감도: ${result.vertSens.toFixed(2)}×`, '---'];
                      SCOPES.slice(1).forEach(s => {
                        lines.push(`${s.label}: ${result.recommended[s.key]}`);
                      });
                      navigator.clipboard.writeText(lines.join('\n'));
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                  >
                    📋 복사
                  </button>
                </div>
                <div className="font-mono text-sm text-gray-300 bg-gray-900 rounded-lg p-3 space-y-0.5">
                  <div className="text-gray-400">DPI: <span className="text-white">{dpi}</span></div>
                  <div className="text-gray-400">일반 감도: <span className="text-blue-300 font-bold">{result.adjustedHip}</span></div>
                  <div className="text-gray-400">수직 감도: <span className="text-purple-300 font-bold">{result.vertSens.toFixed(2)}×</span></div>
                  <div className="text-gray-600 my-1">───────────────</div>
                  {SCOPES.slice(1).map(s => (
                    <div key={s.key} className="text-gray-400">
                      {s.label}: <span className="text-blue-300">{result.recommended[s.key]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={() => { setStep('input'); setResult(null); }}
                className="w-full py-3 rounded-xl bg-gray-700 text-gray-300 font-medium hover:bg-gray-600 transition-colors">
                ← 다시 설정하기
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
