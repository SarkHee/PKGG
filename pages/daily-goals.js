// pages/daily-goals.js — 일일 목표 트래커
import Head from 'next/head';
import { useState, useEffect } from 'react';

const PRESET_GOALS = [
  { id: 'kd',        icon: '💀', label: 'K/D 비율',     unit: '',    target: 2.0,  step: 0.1, min: 0.5, max: 10,  type: 'float' },
  { id: 'damage',    icon: '💥', label: '평균 데미지',   unit: '',    target: 400,  step: 10,  min: 100, max: 2000, type: 'int' },
  { id: 'kills',     icon: '🔫', label: '킬 수',         unit: '킬',  target: 5,    step: 1,   min: 1,   max: 50,   type: 'int' },
  { id: 'top10',     icon: '🏅', label: 'Top10 진입',   unit: '회',  target: 3,    step: 1,   min: 1,   max: 20,   type: 'int' },
  { id: 'win',       icon: '🏆', label: '치킨 먹기',    unit: '회',  target: 1,    step: 1,   min: 1,   max: 5,    type: 'int' },
  { id: 'headshot',  icon: '🎯', label: '헤드샷 비율',  unit: '%',   target: 20,   step: 5,   min: 5,   max: 80,   type: 'int' },
  { id: 'survive',   icon: '⏱️', label: '평균 생존시간', unit: '분', target: 15,   step: 1,   min: 5,   max: 40,   type: 'int' },
  { id: 'games',     icon: '🎮', label: '게임 수',       unit: '판',  target: 10,   step: 1,   min: 1,   max: 50,   type: 'int' },
];

const STORAGE_KEY = 'pkgg_daily_goals';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadData() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}

function saveData(data) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function DailyGoals() {
  const [phase, setPhase] = useState('loading'); // loading | setup | track | done
  const [today] = useState(getTodayKey());
  const [selectedGoals, setSelectedGoals] = useState([]); // 선택된 목표 ids
  const [targets, setTargets] = useState({});             // { id: targetValue }
  const [progress, setProgress] = useState({});           // { id: currentValue }
  const [inputVal, setInputVal] = useState({});           // progress 입력용

  // 로드
  useEffect(() => {
    const data = loadData();
    if (data?.date === today && data?.phase) {
      setSelectedGoals(data.selectedGoals || []);
      setTargets(data.targets || {});
      setProgress(data.progress || {});
      setInputVal(data.progress || {});
      setPhase(data.phase);
    } else {
      setPhase('setup');
    }
  }, [today]);

  const save = (ph, sel, tgt, prog) => {
    saveData({ date: today, phase: ph, selectedGoals: sel, targets: tgt, progress: prog });
  };

  const toggleGoal = (id) => {
    setSelectedGoals(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const setTargetVal = (id, val) => {
    setTargets(t => ({ ...t, [id]: val }));
  };

  const startTracking = () => {
    if (selectedGoals.length === 0) return;
    const init = {};
    selectedGoals.forEach(id => { init[id] = 0; });
    setProgress(init);
    setInputVal(init);
    setPhase('track');
    save('track', selectedGoals, targets, init);
  };

  const updateProgress = (id, val) => {
    const next = { ...progress, [id]: val };
    setProgress(next);
    save('track', selectedGoals, targets, next);
  };

  const allDone = selectedGoals.every(id => {
    const g = PRESET_GOALS.find(g => g.id === id);
    if (!g) return false;
    const cur = progress[id] ?? 0;
    const tgt = targets[id] ?? g.target;
    return cur >= tgt;
  });

  const completedCount = selectedGoals.filter(id => {
    const g = PRESET_GOALS.find(g => g.id === id);
    if (!g) return false;
    return (progress[id] ?? 0) >= (targets[id] ?? g.target);
  }).length;

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSelectedGoals([]);
    setTargets({});
    setProgress({});
    setInputVal({});
    setPhase('setup');
  };

  if (phase === 'loading') return null;

  return (
    <>
      <Head><title>일일 목표 트래커 — PK.GG</title></Head>
      <div style={{ minHeight: '100vh', background: '#030712', color: '#fff', padding: '24px 16px', fontFamily: 'sans-serif' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>

          {/* 헤더 */}
          <div style={{ marginBottom: 20 }}>
            <a href="/" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>← 홈으로</a>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: '8px 0 2px' }}>📅 일일 목표 트래커</h1>
            <p style={{ fontSize: 12, color: '#4b5563', margin: 0 }}>{today}</p>
          </div>

          {/* 목표 설정 */}
          {phase === 'setup' && (
            <div>
              <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>오늘 달성할 목표를 선택하고 타겟 수치를 설정하세요.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {PRESET_GOALS.map(g => {
                  const sel = selectedGoals.includes(g.id);
                  const tgt = targets[g.id] ?? g.target;
                  return (
                    <div key={g.id} onClick={() => toggleGoal(g.id)}
                      style={{ background: sel ? 'rgba(37,99,235,0.15)' : '#111827', border: `2px solid ${sel ? '#2563eb' : '#1e293b'}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 20 }}>{g.icon}</span>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 700, color: sel ? '#93c5fd' : '#e2e8f0', margin: 0 }}>{g.label}</p>
                            <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>기본 목표: {g.target}{g.unit}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                          {sel && (
                            <>
                              <button onClick={() => setTargetVal(g.id, Math.max(g.min, (tgt - g.step)))}
                                style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #374151', background: '#1e293b', color: '#fff', cursor: 'pointer', fontSize: 14 }}>-</button>
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#60a5fa', minWidth: 40, textAlign: 'center' }}>
                                {g.type === 'float' ? tgt.toFixed(1) : tgt}{g.unit}
                              </span>
                              <button onClick={() => setTargetVal(g.id, Math.min(g.max, (tgt + g.step)))}
                                style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #374151', background: '#1e293b', color: '#fff', cursor: 'pointer', fontSize: 14 }}>+</button>
                            </>
                          )}
                          <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${sel ? '#2563eb' : '#374151'}`, background: sel ? '#2563eb' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
                            {sel && '✓'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={startTracking} disabled={selectedGoals.length === 0}
                style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: selectedGoals.length > 0 ? '#2563eb' : '#1e293b', color: selectedGoals.length > 0 ? '#fff' : '#4b5563', fontSize: 15, fontWeight: 700, cursor: selectedGoals.length > 0 ? 'pointer' : 'not-allowed' }}>
                목표 {selectedGoals.length}개 설정하고 시작
              </button>
            </div>
          )}

          {/* 트래킹 */}
          {phase === 'track' && (
            <div>
              {/* 전체 진행 */}
              <div style={{ background: '#111827', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
                  <svg width="60" height="60" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="30" cy="30" r="24" fill="none" stroke="#1e293b" strokeWidth="6"/>
                    <circle cx="30" cy="30" r="24" fill="none" stroke="#2563eb" strokeWidth="6"
                      strokeDasharray={`${(completedCount / selectedGoals.length) * 150.8} 150.8`}
                      strokeLinecap="round"/>
                  </svg>
                  <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 13, fontWeight: 900, color: '#fff' }}>
                    {completedCount}/{selectedGoals.length}
                  </span>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>
                    {completedCount === selectedGoals.length ? '🎉 오늘 목표 달성!' : `${selectedGoals.length - completedCount}개 목표 남음`}
                  </p>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{today}</p>
                </div>
                <button onClick={reset} style={{ marginLeft: 'auto', padding: '6px 10px', borderRadius: 7, border: '1px solid #374151', background: 'transparent', color: '#6b7280', fontSize: 11, cursor: 'pointer' }}>
                  초기화
                </button>
              </div>

              {/* 목표 목록 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedGoals.map(id => {
                  const g = PRESET_GOALS.find(g => g.id === id);
                  if (!g) return null;
                  const tgt = targets[id] ?? g.target;
                  const cur = progress[id] ?? 0;
                  const done = cur >= tgt;
                  const pct = Math.min(100, Math.round((cur / tgt) * 100));

                  return (
                    <div key={id} style={{ background: done ? 'rgba(34,197,94,0.08)' : '#111827', border: `1px solid ${done ? '#22c55e33' : '#1e293b'}`, borderRadius: 12, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 18 }}>{g.icon}</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: done ? '#4ade80' : '#e2e8f0' }}>{g.label}</span>
                          {done && <span style={{ fontSize: 11, color: '#4ade80' }}>✓ 달성!</span>}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: done ? '#4ade80' : '#60a5fa' }}>
                          {g.type === 'float' ? cur.toFixed(1) : cur}{g.unit} / {g.type === 'float' ? tgt.toFixed(1) : tgt}{g.unit}
                        </span>
                      </div>

                      {/* 프로그레스 바 */}
                      <div style={{ background: '#1e293b', borderRadius: 99, height: 6, marginBottom: 10 }}>
                        <div style={{ height: '100%', borderRadius: 99, background: done ? '#22c55e' : '#2563eb', width: `${pct}%`, transition: 'width 0.3s' }} />
                      </div>

                      {/* 입력 */}
                      {!done && (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button onClick={() => updateProgress(id, Math.max(0, cur - g.step))}
                            style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #374151', background: '#1e293b', color: '#fff', cursor: 'pointer', fontSize: 14 }}>-</button>
                          <input type="number" value={inputVal[id] ?? cur}
                            onChange={e => setInputVal(v => ({ ...v, [id]: e.target.value }))}
                            onBlur={e => updateProgress(id, g.type === 'float' ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0)}
                            style={{ flex: 1, background: '#1e293b', border: '1px solid #374151', borderRadius: 7, color: '#fff', padding: '5px 8px', fontSize: 13, textAlign: 'center' }} />
                          <button onClick={() => updateProgress(id, Math.min(g.max * 2, cur + g.step))}
                            style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #374151', background: '#1e293b', color: '#fff', cursor: 'pointer', fontSize: 14 }}>+</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {allDone && (
                <div style={{ background: 'rgba(250,204,21,0.1)', border: '1px solid #fbbf2444', borderRadius: 12, padding: 16, textAlign: 'center', marginTop: 16 }}>
                  <p style={{ fontSize: 20, margin: '0 0 4px' }}>🎉</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#fbbf24', margin: '0 0 2px' }}>오늘 모든 목표 달성!</p>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>내일 또 도전해보세요</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
