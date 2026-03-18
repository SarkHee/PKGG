// pages/crosshair-trainer.js — 크로스헤어 배치 트레이너
import Head from 'next/head';
import { useState, useRef, useEffect, useCallback } from 'react';

// 시나리오: 문/코너 각도별 크로스헤어 배치 위치
const SCENARIOS = [
  {
    id: 'door_right',
    name: '우측 문 피킹',
    desc: '우측에서 피킹할 때 문 프레임 왼쪽 가장자리에 크로스헤어 배치',
    tip: '문 안쪽 왼쪽 가장자리 (1/4 지점), 머리 높이',
    bg: '#1a1a2e',
    walls: [
      { x: 0, y: 0, w: 200, h: 400, color: '#374151' },      // 좌벽
      { x: 440, y: 0, w: 160, h: 400, color: '#374151' },     // 우벽
      { x: 200, y: 0, w: 50, h: 400, color: '#4b5563' },      // 문 왼 프레임
      { x: 390, y: 0, w: 50, h: 400, color: '#4b5563' },      // 문 우 프레임
      { x: 0, y: 180, w: 600, h: 20, color: '#1f2937' },      // 바닥선 (눈높이)
    ],
    targetZone: { x: 240, y: 100, w: 40, h: 40 }, // 정답 존
    targetLabel: '정답 위치',
  },
  {
    id: 'corner_wide',
    name: '넓은 코너 클리어링',
    desc: '넓은 코너를 클리어할 때 코너 가장자리에서 1픽셀 안쪽에 배치',
    tip: '코너 끝에서 바로 안쪽, 머리 높이 (Pre-aim)',
    bg: '#0f172a',
    walls: [
      { x: 0, y: 0, w: 280, h: 400, color: '#374151' },
      { x: 280, y: 200, w: 320, h: 200, color: '#374151' },
    ],
    targetZone: { x: 285, y: 100, w: 40, h: 40 },
    targetLabel: '코너 바로 안쪽',
  },
  {
    id: 'window',
    name: '창문 크로스헤어',
    desc: '창문 아래 프레임 위, 머리가 보일 높이에 미리 배치',
    tip: '창문 높이 중간보다 살짝 위 (적 머리가 나올 위치)',
    bg: '#1a1a2e',
    walls: [
      { x: 0, y: 0, w: 600, h: 400, color: '#374151' },
      { x: 180, y: 80, w: 240, h: 180, color: '#0f172a' },   // 창문 구멍
      { x: 0, y: 0, w: 180, h: 400, color: '#4b5563' },      // 왼벽
      { x: 420, y: 0, w: 180, h: 400, color: '#4b5563' },    // 우벽
      { x: 180, y: 0, w: 240, h: 80, color: '#4b5563' },     // 창문 위
      { x: 180, y: 260, w: 240, h: 140, color: '#4b5563' },  // 창문 아래
    ],
    targetZone: { x: 270, y: 100, w: 60, h: 50 },
    targetLabel: '창문 안 머리 높이',
  },
  {
    id: 'stairs',
    name: '계단 아래 클리어',
    desc: '계단 아래쪽에서 올라오는 적을 대비해 크로스헤어를 낮게 배치',
    tip: '계단 끝 지점, 낮은 높이 (쪼그려 앉은 적 기준)',
    bg: '#0f172a',
    walls: [
      { x: 0, y: 300, w: 600, h: 100, color: '#374151' },
      { x: 0, y: 200, w: 100, h: 100, color: '#374151' },
      { x: 100, y: 250, w: 100, h: 50, color: '#374151' },
      { x: 200, y: 275, w: 100, h: 25, color: '#374151' },
    ],
    targetZone: { x: 300, y: 255, w: 60, h: 40 },
    targetLabel: '계단 끝 낮은 위치',
  },
  {
    id: 'door_left',
    name: '좌측 문 피킹',
    desc: '좌측에서 피킹할 때 문 프레임 오른쪽 안쪽에 미리 배치',
    tip: '문 안쪽 오른쪽 (3/4 지점), 머리 높이',
    bg: '#1a1a2e',
    walls: [
      { x: 0, y: 0, w: 160, h: 400, color: '#374151' },
      { x: 440, y: 0, w: 160, h: 400, color: '#374151' },
      { x: 160, y: 0, w: 50, h: 400, color: '#4b5563' },
      { x: 390, y: 0, w: 50, h: 400, color: '#4b5563' },
      { x: 0, y: 180, w: 600, h: 20, color: '#1f2937' },
    ],
    targetZone: { x: 320, y: 100, w: 40, h: 40 },
    targetLabel: '정답 위치',
  },
];

const W = 480, H = 300;

function drawScene(ctx, scenario, clickPos, showAnswer) {
  ctx.clearRect(0, 0, W, H);

  // 바닥
  ctx.fillStyle = scenario.bg;
  ctx.fillRect(0, 0, W, H);

  // 벽/구조물
  scenario.walls.forEach(rect => {
    ctx.fillStyle = rect.color;
    ctx.fillRect(rect.x * W/600, rect.y * H/400, rect.w * W/600, rect.h * H/400);
  });

  // 정답 존 (showAnswer일 때)
  if (showAnswer) {
    const tz = scenario.targetZone;
    const sx = tz.x * W/600, sy = tz.y * H/400, sw = tz.w * W/600, sh = tz.h * H/400;
    ctx.fillStyle = 'rgba(34,197,94,0.25)';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.setLineDash([]);
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('✓ 이상적 위치', sx, sy - 4);
  }

  // 클릭 위치
  if (clickPos) {
    const cx = clickPos.x, cy = clickPos.y;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy); ctx.lineTo(cx + 12, cy);
    ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy + 12);
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#60a5fa';
    ctx.fill();
  }

  // 크로스헤어 가이드라인
  ctx.strokeStyle = '#ffffff18';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
  ctx.setLineDash([]);
}

function isInZone(pos, zone, scaleX, scaleY) {
  if (!pos) return false;
  const sx = zone.x * scaleX, sy = zone.y * scaleY;
  const sw = zone.w * scaleX, sh = zone.h * scaleY;
  return pos.x >= sx && pos.x <= sx+sw && pos.y >= sy && pos.y <= sy+sh;
}

function dist(pos, zone, scaleX, scaleY) {
  if (!pos) return 9999;
  const cx = (zone.x + zone.w/2) * scaleX;
  const cy = (zone.y + zone.h/2) * scaleY;
  return Math.hypot(pos.x - cx, pos.y - cy);
}

export default function CrosshairTrainer() {
  const canvasRef = useRef(null);
  const [phase, setPhase] = useState('start'); // start | quiz | result
  const [round, setRound] = useState(0);
  const [clickPos, setClickPos] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [scores, setScores] = useState([]);
  const [history, setHistory] = useState([]);

  const scaleX = W/600, scaleY = H/400;
  const scenarios = SCENARIOS;
  const cur = scenarios[round];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || phase !== 'quiz') return;
    const ctx = canvas.getContext('2d');
    drawScene(ctx, cur, clickPos, confirmed);
  }, [cur, clickPos, confirmed, phase]);

  const handleCanvasClick = useCallback((e) => {
    if (confirmed || phase !== 'quiz') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);
    setClickPos({ x, y });
  }, [confirmed, phase]);

  const handleConfirm = () => {
    if (!clickPos || confirmed) return;
    const hit = isInZone(clickPos, cur.targetZone, scaleX, scaleY);
    const d = dist(clickPos, cur.targetZone, scaleX, scaleY);
    const score = hit ? 3 : d < 40 ? 2 : d < 80 ? 1 : 0;
    setScores(s => [...s, score]);
    setHistory(h => [...h, { hit, d: Math.round(d), score }]);
    setConfirmed(true);
  };

  const handleNext = () => {
    if (round + 1 >= scenarios.length) {
      setPhase('result');
    } else {
      setRound(r => r + 1);
      setClickPos(null);
      setConfirmed(false);
    }
  };

  const totalScore = scores.reduce((s, v) => s + v, 0);
  const maxScore = scenarios.length * 3;
  const pct = Math.round((totalScore / maxScore) * 100);

  return (
    <>
      <Head><title>크로스헤어 배치 트레이너 — PK.GG</title></Head>
      <div style={{ minHeight: '100vh', background: '#030712', color: '#fff', padding: '24px 16px', fontFamily: 'sans-serif' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ marginBottom: 20 }}>
            <a href="/" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>← 홈으로</a>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: '8px 0 4px' }}>🎯 크로스헤어 배치 트레이너</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>각 상황에서 최적의 크로스헤어 위치를 클릭하세요</p>
          </div>

          {/* 시작 */}
          {phase === 'start' && (
            <div style={{ background: '#111827', borderRadius: 16, padding: 28, textAlign: 'center' }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🏹</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Pre-aim 배치 연습</h2>
              <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.7, marginBottom: 20 }}>
                문·창문·코너 등 5가지 상황에서<br/>크로스헤어를 어디 놓아야 하는지 클릭하세요.<br/>
                <span style={{ color: '#60a5fa' }}>정확도에 따라 0~3점</span>이 부여됩니다.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
                {[['⭐⭐⭐', '3점', '정확히 맞춤'],['⭐⭐', '2점', '40px 이내'],['⭐', '1점', '80px 이내']].map(([ic, sc, lb]) => (
                  <div key={sc} style={{ background: '#1e293b', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 16 }}>{ic}</div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{sc}</div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>{lb}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => setPhase('quiz')}
                style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                시작하기
              </button>
            </div>
          )}

          {/* 퀴즈 */}
          {phase === 'quiz' && cur && (
            <div>
              {/* 진행 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#9ca3af' }}>{round + 1} / {scenarios.length}</span>
                <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 700 }}>
                  {scores.reduce((s,v)=>s+v,0)} / {round * 3} pts
                </span>
              </div>
              <div style={{ background: '#1e293b', borderRadius: 99, height: 4, marginBottom: 16 }}>
                <div style={{ height: '100%', borderRadius: 99, background: '#2563eb', width: `${(round / scenarios.length) * 100}%` }} />
              </div>

              {/* 상황 설명 */}
              <div style={{ background: '#111827', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{cur.name}</p>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{cur.desc}</p>
              </div>

              {/* 캔버스 */}
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <canvas ref={canvasRef} width={W} height={H}
                  onClick={handleCanvasClick}
                  style={{ width: '100%', borderRadius: 10, cursor: confirmed ? 'default' : 'crosshair', display: 'block' }} />
                {!clickPos && !confirmed && (
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                    background: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: '6px 12px', pointerEvents: 'none' }}>
                    <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>클릭으로 크로스헤어 위치 선택</p>
                  </div>
                )}
              </div>

              {/* 결과 피드백 */}
              {confirmed && (
                <div style={{ background: history.at(-1)?.score === 3 ? 'rgba(34,197,94,0.1)' : history.at(-1)?.score >= 1 ? 'rgba(251,191,36,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${history.at(-1)?.score === 3 ? '#22c55e44' : history.at(-1)?.score >= 1 ? '#fbbf2444' : '#ef444444'}`,
                  borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
                  <p style={{ fontWeight: 700, margin: '0 0 4px',
                    color: history.at(-1)?.score === 3 ? '#4ade80' : history.at(-1)?.score >= 1 ? '#fbbf24' : '#f87171' }}>
                    {history.at(-1)?.score === 3 ? '⭐⭐⭐ 완벽!' : history.at(-1)?.score === 2 ? '⭐⭐ 좋아요!' : history.at(-1)?.score === 1 ? '⭐ 아쉬워요' : '❌ 미스'}
                    {' '}+{history.at(-1)?.score}점
                  </p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>💡 {cur.tip}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                {!confirmed ? (
                  <button onClick={handleConfirm} disabled={!clickPos}
                    style={{ flex: 1, padding: 13, borderRadius: 10, border: 'none', background: clickPos ? '#2563eb' : '#1e293b', color: clickPos ? '#fff' : '#4b5563', fontWeight: 700, cursor: clickPos ? 'pointer' : 'not-allowed' }}>
                    확인
                  </button>
                ) : (
                  <button onClick={handleNext}
                    style={{ flex: 1, padding: 13, borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                    {round + 1 >= scenarios.length ? '결과 보기' : '다음 →'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 결과 */}
          {phase === 'result' && (
            <div style={{ background: '#111827', borderRadius: 16, padding: 24 }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 52, marginBottom: 8 }}>
                  {pct >= 90 ? '🏆' : pct >= 70 ? '🎯' : pct >= 50 ? '📊' : '💪'}
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>
                  {totalScore} / {maxScore} 점
                </h2>
                <p style={{ fontSize: 26, fontWeight: 900, color: pct >= 90 ? '#fbbf24' : pct >= 70 ? '#4ade80' : pct >= 50 ? '#60a5fa' : '#f87171', margin: '0 0 6px' }}>{pct}%</p>
                <p style={{ fontSize: 13, color: '#9ca3af' }}>
                  {pct >= 90 ? '크로스헤어 배치 마스터!' : pct >= 70 ? '우수한 Pre-aim 실력!' : pct >= 50 ? '조금 더 연습이 필요해요' : '기초부터 다시 연습해보세요!'}
                </p>
              </div>

              {/* 문제별 */}
              <div style={{ marginBottom: 20 }}>
                {scenarios.map((sc, i) => (
                  <div key={sc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1e293b' }}>
                    <span style={{ fontSize: 13, color: '#e2e8f0' }}>{sc.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: history[i]?.score === 3 ? '#4ade80' : history[i]?.score >= 1 ? '#fbbf24' : '#f87171' }}>
                      {'⭐'.repeat(history[i]?.score ?? 0)} {history[i]?.score ?? 0}/3
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setPhase('quiz'); setRound(0); setClickPos(null); setConfirmed(false); setScores([]); setHistory([]); }}
                  style={{ flex: 1, padding: 13, borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                  다시 도전
                </button>
                <a href="/peek-trainer"
                  style={{ flex: 1, padding: 13, borderRadius: 10, background: '#1e293b', color: '#9ca3af', fontWeight: 700, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  피킹 트레이너
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
