// pages/recoil-quiz.js — 반동 패턴 퀴즈
import Head from 'next/head';
import { useState, useRef, useEffect, useCallback } from 'react';

const WEAPONS = [
  { id: 'M416',  name: 'M416',       cal: '5.56mm', color: '#3B82F6',
    pattern: [[0.00,0.040],[0.02,0.090],[0.04,0.160],[0.07,0.240],[0.09,0.320],[0.08,0.400],[0.06,0.470],[0.04,0.540],[0.01,0.590],[-0.03,0.630],[-0.07,0.660],[-0.09,0.680],[-0.07,0.700],[-0.04,0.720],[-0.01,0.740],[0.03,0.760],[0.06,0.780],[0.07,0.800],[0.05,0.820],[0.03,0.840]] },
  { id: 'AKM',   name: 'AKM',        cal: '7.62mm', color: '#EF4444',
    pattern: [[0.00,0.060],[0.04,0.130],[0.09,0.220],[0.14,0.320],[0.18,0.430],[0.16,0.520],[0.12,0.600],[0.08,0.660],[0.02,0.700],[-0.05,0.740],[-0.12,0.760],[-0.16,0.780],[-0.12,0.800],[-0.06,0.820],[0.00,0.840],[0.07,0.860],[0.12,0.870],[0.10,0.880],[0.07,0.890],[0.04,0.900]] },
  { id: 'SCAR',  name: 'SCAR-L',     cal: '5.56mm', color: '#F59E0B',
    pattern: [[0.00,0.035],[0.01,0.080],[0.03,0.130],[0.05,0.190],[0.06,0.250],[0.05,0.320],[0.03,0.380],[0.01,0.440],[-0.02,0.490],[-0.05,0.530],[-0.07,0.560],[-0.06,0.580],[-0.03,0.600],[0.01,0.620],[0.04,0.640],[0.06,0.660],[0.06,0.680],[0.04,0.700],[0.02,0.720],[0.00,0.740]] },
  { id: 'BERYL', name: 'Beryl M762', cal: '7.62mm', color: '#F97316',
    pattern: [[0.00,0.070],[0.05,0.150],[0.12,0.250],[0.18,0.360],[0.22,0.480],[0.20,0.570],[0.16,0.640],[0.10,0.700],[0.03,0.740],[-0.06,0.770],[-0.14,0.800],[-0.19,0.820],[-0.14,0.840],[-0.07,0.860],[0.01,0.870],[0.08,0.880],[0.12,0.890],[0.10,0.900],[0.07,0.910],[0.04,0.920]] },
  { id: 'QBZ',   name: 'QBZ',        cal: '5.56mm', color: '#10B981',
    pattern: [[0.00,0.040],[0.02,0.090],[0.04,0.150],[0.06,0.220],[0.07,0.290],[0.05,0.360],[0.02,0.430],[-0.01,0.490],[-0.05,0.540],[-0.08,0.580],[-0.07,0.610],[-0.04,0.630],[0.00,0.650],[0.04,0.670],[0.07,0.690],[0.07,0.710],[0.05,0.730],[0.02,0.750],[-0.01,0.770],[-0.02,0.780]] },
  { id: 'AUG',   name: 'AUG A3',     cal: '5.56mm', color: '#06B6D4',
    pattern: [[0.00,0.040],[0.01,0.090],[0.02,0.150],[0.04,0.210],[0.05,0.280],[0.04,0.350],[0.03,0.420],[0.01,0.480],[-0.01,0.530],[-0.04,0.570],[-0.05,0.600],[-0.04,0.620],[-0.02,0.640],[0.00,0.660],[0.02,0.680],[0.04,0.700],[0.04,0.720],[0.03,0.740],[0.01,0.760],[0.00,0.780]] },
  { id: 'UMP',   name: 'UMP45',      cal: '.45 ACP', color: '#8B5CF6',
    pattern: [[0.00,0.025],[0.01,0.055],[0.01,0.090],[0.02,0.120],[0.02,0.155],[0.01,0.190],[0.00,0.220],[-0.01,0.250],[-0.02,0.280],[-0.02,0.310],[-0.01,0.340],[0.00,0.370],[0.01,0.400],[0.01,0.420],[0.01,0.440],[0.00,0.460],[-0.01,0.480],[-0.01,0.500],[0.00,0.520],[0.00,0.540]] },
  { id: 'GROZA', name: 'Groza',      cal: '7.62mm', color: '#EC4899',
    pattern: [[0.00,0.065],[0.05,0.140],[0.11,0.230],[0.17,0.330],[0.21,0.440],[0.18,0.540],[0.14,0.620],[0.09,0.680],[0.02,0.720],[-0.06,0.750],[-0.13,0.780],[-0.17,0.800],[-0.13,0.820],[-0.07,0.840],[-0.01,0.850],[0.06,0.860],[0.11,0.870],[0.09,0.880],[0.06,0.890],[0.03,0.900]] },
];

const TOTAL_ROUNDS = 8;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function drawPattern(canvas, pattern, color) {
  if (!canvas) return;
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  // grid
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,H*0.12); ctx.lineTo(W,H*0.12); ctx.stroke();

  const maxNy = Math.max(...pattern.map(([,ny]) => ny));
  const maxNx = Math.max(...pattern.map(([nx]) => Math.abs(nx)));
  const scaleY = (H * 0.82) / Math.max(maxNy, 0.1);
  const scaleX = (W * 0.38) / Math.max(maxNx, 0.05);

  const pts = pattern.map(([nx, ny]) => ({
    x: W/2 + nx * scaleX,
    y: H*0.12 + ny * scaleY,
  }));

  // line
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = color + '88';
  ctx.lineWidth = 2;
  ctx.stroke();

  // dots
  pts.forEach((p, i) => {
    const ratio = i / Math.max(1, pts.length - 1);
    const r = i === 0 ? 6 : 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = i === 0
      ? '#f97316'
      : `hsl(${210 - ratio*120},80%,60%)`;
    ctx.fill();
    if (i === 0) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    if (i < pts.length - 1) {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(pts[i+1].x, pts[i+1].y);
      ctx.strokeStyle = `hsla(${210 - ratio*120},80%,60%,0.5)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });

  // 발사 번호
  pts.forEach((p, i) => {
    ctx.fillStyle = '#64748b';
    ctx.font = '8px monospace';
    ctx.fillText(i+1, p.x + 5, p.y - 2);
  });
}

function PatternCanvas({ pattern, color, size = 180 }) {
  const ref = useRef(null);
  useEffect(() => {
    drawPattern(ref.current, pattern, color);
  }, [pattern, color]);
  return (
    <canvas ref={ref} width={size} height={size}
      style={{ background: '#0f172a', borderRadius: 8, display: 'block' }} />
  );
}

export default function RecoilQuiz() {
  const [phase, setPhase] = useState('start'); // start | quiz | result
  const [rounds, setRounds] = useState([]);
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState([]);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const startGame = useCallback(() => {
    const shuffled = shuffle(WEAPONS).slice(0, TOTAL_ROUNDS);
    const gameRounds = shuffled.map(correct => {
      const others = shuffle(WEAPONS.filter(w => w.id !== correct.id)).slice(0, 3);
      const choices = shuffle([correct, ...others]);
      return { correct, choices };
    });
    setRounds(gameRounds);
    setRound(0);
    setScore(0);
    setHistory([]);
    setSelected(null);
    setConfirmed(false);
    setStreak(0);
    setBestStreak(0);
    setPhase('quiz');
  }, []);

  const handleSelect = (id) => {
    if (confirmed) return;
    setSelected(id);
  };

  const handleConfirm = () => {
    if (!selected) return;
    const correct = rounds[round].correct;
    const isCorrect = selected === correct.id;
    const newStreak = isCorrect ? streak + 1 : 0;
    setStreak(newStreak);
    if (newStreak > bestStreak) setBestStreak(newStreak);
    if (isCorrect) setScore(s => s + 1);
    setHistory(h => [...h, { correct: correct.id, selected, isCorrect }]);
    setConfirmed(true);
  };

  const handleNext = () => {
    if (round + 1 >= TOTAL_ROUNDS) {
      setPhase('result');
    } else {
      setRound(r => r + 1);
      setSelected(null);
      setConfirmed(false);
    }
  };

  const cur = rounds[round];
  const pct = Math.round((score / TOTAL_ROUNDS) * 100);

  return (
    <>
      <Head>
        <title>반동 패턴 퀴즈 — PK.GG</title>
      </Head>
      <div style={{ minHeight: '100vh', background: '#030712', color: '#fff', padding: '24px 16px', fontFamily: 'sans-serif' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>

          {/* 헤더 */}
          <div style={{ marginBottom: 24 }}>
            <a href="/" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>← 홈으로</a>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '8px 0 4px' }}>🎯 반동 패턴 퀴즈</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>반동 패턴 모양을 보고 무기를 맞춰보세요</p>
          </div>

          {/* 시작 화면 */}
          {phase === 'start' && (
            <div style={{ background: '#111827', borderRadius: 16, padding: 28, textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🔫</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>패턴으로 무기를 맞춰라</h2>
              <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 24, lineHeight: 1.6 }}>
                8종 무기의 반동 패턴 중 {TOTAL_ROUNDS}문제가 출제됩니다.<br/>
                탄착 경로를 보고 4지선다에서 무기를 고르세요.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
                {[
                  { icon: '🎯', label: '총 문제', val: `${TOTAL_ROUNDS}문제` },
                  { icon: '🔥', label: '무기 종류', val: '8종' },
                  { icon: '📈', label: '연속 보너스', val: '스트릭 추적' },
                  { icon: '🏆', label: '최고 점수', val: '매 게임마다' },
                ].map(it => (
                  <div key={it.label} style={{ background: '#1e293b', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{it.icon}</div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>{it.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{it.val}</div>
                  </div>
                ))}
              </div>
              <button onClick={startGame}
                style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: '#2563eb', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                게임 시작
              </button>
            </div>
          )}

          {/* 퀴즈 화면 */}
          {phase === 'quiz' && cur && (
            <div>
              {/* 진행 바 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: '#9ca3af' }}>{round + 1} / {TOTAL_ROUNDS}</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {streak >= 2 && (
                    <span style={{ fontSize: 12, color: '#fb923c', fontWeight: 700 }}>🔥 {streak}연속</span>
                  )}
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>✓ {score}</span>
                </div>
              </div>
              <div style={{ width: '100%', background: '#1e293b', borderRadius: 99, height: 4, marginBottom: 20 }}>
                <div style={{ height: '100%', borderRadius: 99, background: '#2563eb', width: `${(round / TOTAL_ROUNDS) * 100}%`, transition: 'width 0.3s' }} />
              </div>

              {/* 패턴 캔버스 */}
              <div style={{ background: '#111827', borderRadius: 12, padding: 20, marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>이 반동 패턴은 어떤 무기인가요?</p>
                <PatternCanvas pattern={cur.correct.pattern} color={confirmed ? cur.correct.color : '#60a5fa'} size={200} />
                <p style={{ fontSize: 10, color: '#374151', margin: 0 }}>주황색 점 = 첫 발, 번호 = 발사 순서</p>
              </div>

              {/* 선택지 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {cur.choices.map(w => {
                  const isCorrect = w.id === cur.correct.id;
                  const isSelected = w.id === selected;
                  let bg = '#111827', border = '#374151', textColor = '#e2e8f0';
                  if (confirmed) {
                    if (isCorrect) { bg = 'rgba(34,197,94,0.15)'; border = '#22c55e'; textColor = '#4ade80'; }
                    else if (isSelected && !isCorrect) { bg = 'rgba(239,68,68,0.15)'; border = '#ef4444'; textColor = '#f87171'; }
                  } else if (isSelected) {
                    bg = 'rgba(37,99,235,0.2)'; border = '#2563eb'; textColor = '#93c5fd';
                  }
                  return (
                    <button key={w.id} onClick={() => handleSelect(w.id)}
                      style={{ background: bg, border: `2px solid ${border}`, borderRadius: 10, padding: '12px 10px', cursor: confirmed ? 'default' : 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: textColor, marginBottom: 2 }}>
                        {confirmed && isCorrect ? '✓ ' : confirmed && isSelected && !isCorrect ? '✗ ' : ''}{w.name}
                      </div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>{w.cal}</div>
                      {confirmed && (
                        <div style={{ marginTop: 6 }}>
                          <PatternCanvas pattern={w.pattern} color={w.color} size={80} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* 정답 해설 */}
              {confirmed && (
                <div style={{ background: selected === cur.correct.id ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${selected === cur.correct.id ? '#22c55e44' : '#ef444444'}`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
                  <p style={{ fontWeight: 700, color: selected === cur.correct.id ? '#4ade80' : '#f87171', margin: '0 0 4px' }}>
                    {selected === cur.correct.id ? '✓ 정답!' : `✗ 오답 — 정답: ${cur.correct.name}`}
                  </p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                    {cur.correct.id === 'M416' ? '가장 대중적인 AR. 수직 반동 후 우→좌로 흐름.' :
                     cur.correct.id === 'AKM' ? '7.62mm 강반동. 초반 강하게 위로 솟고 크게 우→좌.' :
                     cur.correct.id === 'SCAR' ? '느린 RPM에 완만한 패턴. 수평 흔들림 거의 없음.' :
                     cur.correct.id === 'BERYL' ? '고속+고반동. AKM보다 더 크게 우→좌 스윙.' :
                     cur.correct.id === 'QBZ' ? 'M416과 유사하나 초반 수직이 약간 더 강함.' :
                     cur.correct.id === 'AUG' ? '수평 반동 극소. 거의 직선형 수직 패턴.' :
                     cur.correct.id === 'UMP' ? 'SMG 최소 반동. 패턴이 매우 촘촘하고 작음.' :
                     'AKM급 반동에 750RPM. 초반 강한 우→좌 스윙 특징.'}
                  </p>
                </div>
              )}

              {/* 버튼 */}
              {!confirmed ? (
                <button onClick={handleConfirm} disabled={!selected}
                  style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: selected ? '#2563eb' : '#1e293b', color: selected ? '#fff' : '#4b5563', fontSize: 15, fontWeight: 700, cursor: selected ? 'pointer' : 'not-allowed' }}>
                  확인
                </button>
              ) : (
                <button onClick={handleNext}
                  style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  {round + 1 >= TOTAL_ROUNDS ? '결과 보기' : '다음 문제 →'}
                </button>
              )}
            </div>
          )}

          {/* 결과 화면 */}
          {phase === 'result' && (
            <div style={{ background: '#111827', borderRadius: 16, padding: 24 }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 52, marginBottom: 8 }}>
                  {pct === 100 ? '🏆' : pct >= 75 ? '🎯' : pct >= 50 ? '📊' : '💪'}
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>
                  {score} / {TOTAL_ROUNDS} 정답
                </h2>
                <p style={{ fontSize: 28, fontWeight: 900,
                  color: pct === 100 ? '#fbbf24' : pct >= 75 ? '#4ade80' : pct >= 50 ? '#60a5fa' : '#f87171',
                  margin: '0 0 4px' }}>{pct}%</p>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
                  {pct === 100 ? '완벽한 반동 패턴 마스터!' : pct >= 75 ? '훌륭한 무기 지식!' : pct >= 50 ? '조금만 더 연습하면 완벽!' : '반동 패턴 시뮬레이터로 공부해보세요!'}
                </p>
              </div>

              {/* 스트릭 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                <div style={{ background: '#1e293b', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: '#6b7280', margin: '0 0 4px' }}>최고 연속 정답</p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: '#fb923c', margin: 0 }}>🔥 {bestStreak}</p>
                </div>
                <div style={{ background: '#1e293b', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: '#6b7280', margin: '0 0 4px' }}>정답률</p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: '#4ade80', margin: 0 }}>{pct}%</p>
                </div>
              </div>

              {/* 문제별 결과 */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>문제별 결과</p>
                <div style={{ display: 'flex', gap: 4 }}>
                  {history.map((h, i) => (
                    <div key={i} title={WEAPONS.find(w=>w.id===h.correct)?.name}
                      style={{ flex: 1, height: 8, borderRadius: 99, background: h.isCorrect ? '#22c55e' : '#ef4444' }} />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={startGame}
                  style={{ flex: 1, padding: 13, borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  다시 도전
                </button>
                <a href="/recoil-pattern"
                  style={{ flex: 1, padding: 13, borderRadius: 10, background: '#1e293b', color: '#9ca3af', fontWeight: 700, textAlign: 'center', textDecoration: 'none', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  패턴 연습하기
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
