// pages/battle-sim.js — 배그 능선 전략 시뮬레이터
import Head from 'next/head';
import { useState, useCallback, useRef, useEffect } from 'react';
import Header from '../components/layout/Header';

// ─── 방어 포지션 5개 (능선 위) ──────────────────────
// x, y: 맵 컨테이너 내 % 위치
const POSITIONS = [
  {
    id: 'peak', label: '정상', sub: '최고점',
    x: 50, y: 18,
    atkBonus: 0.40, defBonus: 0.0,
    cover: false, height: 3,
    tip: '시야 최대 — 모든 방향 사격 가능. 단, 엄폐 없어 피해 그대로',
    engages: ['e2', 'e3'], // 주로 상대하는 적
  },
  {
    id: 'lhigh', label: '좌 고지', sub: '좌측 능선',
    x: 26, y: 30,
    atkBonus: 0.20, defBonus: 0.10,
    cover: true, height: 2,
    tip: '왼쪽 공격에 강함. 고지 보너스 + 약간의 엄폐',
    engages: ['e1', 'e2'],
  },
  {
    id: 'rhigh', label: '우 고지', sub: '우측 능선',
    x: 74, y: 30,
    atkBonus: 0.20, defBonus: 0.10,
    cover: true, height: 2,
    tip: '오른쪽 공격에 강함. 고지 보너스 + 약간의 엄폐',
    engages: ['e3', 'e4'],
  },
  {
    id: 'lflank', label: '좌 측면', sub: '좌측 하단',
    x: 10, y: 50,
    atkBonus: 0.0, defBonus: 0.35,
    cover: true, height: 1,
    tip: '두꺼운 엄폐물. 피해 최소화. 단, 공격력 낮음',
    engages: ['e1'],
  },
  {
    id: 'rflank', label: '우 측면', sub: '우측 하단',
    x: 90, y: 50,
    atkBonus: 0.0, defBonus: 0.35,
    cover: true, height: 1,
    tip: '두꺼운 엄폐물. 피해 최소화. 단, 공격력 낮음',
    engages: ['e4'],
  },
];

// ─── AI 공격자 4명 (능선 아래) ────────────────────
const ATTACKERS = [
  { id: 'e1', label: '적1', x: 10,  y: 80 },
  { id: 'e2', label: '적2', x: 37,  y: 85 },
  { id: 'e3', label: '적3', x: 63,  y: 85 },
  { id: 'e4', label: '적4', x: 90,  y: 80 },
];

const BASE_HP   = 100;
const BASE_DMG  = 28;

function rollDmg(base) { return base + Math.floor(Math.random() * 12) - 4; }

// 적이 가장 가까운 방어자를 타겟으로 삼음
function findTarget(atk, defenders) {
  const alive = defenders.filter(d => d.hp > 0);
  if (!alive.length) return null;
  return alive.reduce((best, d) => {
    const dist = Math.hypot(atk.x - d.x, atk.y - d.y);
    const bestDist = Math.hypot(atk.x - best.x, atk.y - best.y);
    return dist < bestDist ? d : best;
  }, alive[0]);
}

// 방어자가 교전하는 적 찾기
function findDefTarget(def, attackers) {
  const alive = attackers.filter(a => a.hp > 0);
  if (!alive.length) return null;
  const engaged = alive.filter(a => def.pos.engages.includes(a.id));
  const pool = engaged.length ? engaged : alive;
  return pool.reduce((best, a) => {
    const dist = Math.hypot(def.pos.x - a.x, def.pos.y - a.y);
    const bestDist = Math.hypot(def.pos.x - best.x, def.pos.y - best.y);
    return dist < bestDist ? a : best;
  }, pool[0]);
}

// ─── 시뮬레이션 실행 ──────────────────────────────
function runSimulation(selectedPositions) {
  const defenders = selectedPositions.map((pos, i) => ({
    id: 'd' + i, pos, hp: BASE_HP, maxHp: BASE_HP, log: [],
  }));
  const attackers = ATTACKERS.map(a => ({ ...a, hp: BASE_HP, maxHp: BASE_HP }));

  const rounds = [];

  for (let round = 1; round <= 12; round++) {
    const aliveDef = defenders.filter(d => d.hp > 0);
    const aliveAtk = attackers.filter(a => a.hp > 0);
    if (!aliveDef.length || !aliveAtk.length) break;

    const events = [];

    // 방어자 사격
    for (const def of aliveDef) {
      const target = findDefTarget(def, attackers);
      if (!target || target.hp <= 0) continue;
      const rawDmg = rollDmg(BASE_DMG);
      const dmg = Math.round(rawDmg * (1 + def.pos.atkBonus));
      target.hp = Math.max(0, target.hp - dmg);
      events.push({
        type: 'def_attack',
        from: def.pos.label,
        to: target.label,
        dmg,
        killed: target.hp <= 0,
        bonus: def.pos.atkBonus > 0 ? `고지 +${Math.round(def.pos.atkBonus * 100)}%` : null,
      });
    }

    // 공격자 사격
    for (const atk of aliveAtk) {
      if (atk.hp <= 0) continue;
      const target = findTarget(atk, defenders);
      if (!target || target.hp <= 0) continue;
      const rawDmg = rollDmg(BASE_DMG);
      const dmg = Math.round(rawDmg * (1 - target.pos.defBonus));
      target.hp = Math.max(0, target.hp - dmg);
      events.push({
        type: 'atk_attack',
        from: atk.label,
        to: target.pos.label,
        dmg,
        killed: target.hp <= 0,
        reduced: target.pos.defBonus > 0 ? `엄폐 -${Math.round(target.pos.defBonus * 100)}%` : null,
      });
    }

    rounds.push({
      round,
      events,
      defSnap: defenders.map(d => ({ id: d.id, label: d.pos.label, hp: d.hp, maxHp: d.maxHp })),
      atkSnap: attackers.map(a => ({ id: a.id, label: a.label, hp: a.hp, maxHp: a.maxHp })),
    });
  }

  const defSurvived = defenders.filter(d => d.hp > 0).length;
  const atkSurvived = attackers.filter(a => a.hp > 0).length;
  const victory = atkSurvived === 0 || defSurvived > atkSurvived;

  return { rounds, victory, defSurvived, atkSurvived, defenders, attackers: ATTACKERS };
}

// ─── 전략 분석 텍스트 ─────────────────────────────
function analyzeFormation(selected, victory) {
  const hasPeak   = selected.some(p => p.id === 'peak');
  const hasHigh   = selected.filter(p => p.id === 'lhigh' || p.id === 'rhigh').length;
  const hasCover  = selected.filter(p => p.id === 'lflank' || p.id === 'rflank').length;
  const avgAtk    = selected.reduce((s, p) => s + p.atkBonus, 0) / selected.length;
  const avgDef    = selected.reduce((s, p) => s + p.defBonus, 0) / selected.length;

  const tips = [];
  if (victory) {
    if (hasPeak && hasHigh >= 2) tips.push('정상 + 고지 조합 — 화력 집중 전략이 효과적이었습니다');
    else if (hasCover >= 2) tips.push('엄폐 중심 배치 — 피해를 최소화하며 버텼습니다');
    else tips.push('균형 잡힌 배치로 방어에 성공했습니다');
    if (avgAtk > 0.2) tips.push('공격 보너스를 잘 활용했습니다');
  } else {
    if (!hasHigh && !hasPeak) tips.push('고지대를 점령하지 않아 공격력이 부족했습니다');
    if (hasPeak && hasCover < 1) tips.push('정상은 강력하지만 엄폐 없이 홀로 배치하면 위험합니다');
    tips.push('좌우 고지(좌 고지 + 우 고지)를 함께 잡으면 교차사격이 가능합니다');
  }
  return tips;
}

// ─── HP 바 컴포넌트 ────────────────────────────────
function HpBar({ hp, maxHp, color = 'bg-green-500' }) {
  const pct = Math.round(hp / maxHp * 100);
  const col = pct > 60 ? 'bg-green-500' : pct > 30 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
      <div className={`h-full ${col} transition-all duration-300`} style={{ width: pct + '%' }} />
    </div>
  );
}

// ══════════════════════════════════════════════════
export default function BattleSim() {
  const [screen, setScreen]       = useState('menu');    // menu|setup|combat|result
  const [selected, setSelected]   = useState([]);        // 선택된 포지션 id[]
  const [hovered, setHovered]     = useState(null);
  const [simResult, setSimResult] = useState(null);
  const [playRound, setPlayRound] = useState(0);         // 현재 재생 중인 라운드
  const [simData, setSimData]     = useState(null);
  const intervalRef = useRef(null);

  // ─── 포지션 선택/해제 ─────────────────────────
  const togglePos = useCallback((id) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }, []);

  // ─── 전투 시작 ────────────────────────────────
  const startCombat = useCallback(() => {
    const selPos = POSITIONS.filter(p => selected.includes(p.id));
    const data = runSimulation(selPos);
    setSimData(data);
    setPlayRound(0);
    setScreen('combat');

    // 라운드 순차 재생
    let r = 0;
    intervalRef.current = setInterval(() => {
      r += 1;
      setPlayRound(r);
      if (r >= data.rounds.length) {
        clearInterval(intervalRef.current);
        setTimeout(() => {
          setSimResult(data);
          setScreen('result');
        }, 800);
      }
    }, 700);
  }, [selected]);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  // ─── 메뉴 ─────────────────────────────────────
  if (screen === 'menu') return (
    <>
      <Head><title>능선 전략 시뮬레이터 | PKGG</title></Head>
      <Header />
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-8 px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">⚔️</div>
          <h1 className="text-3xl font-bold mb-2">능선 전략 시뮬레이터</h1>
          <p className="text-gray-400">5개 포지션 중 4명 배치 → 자동 전투 시뮬레이션</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full text-sm">
          <div className="bg-gray-900 border border-emerald-700/40 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">▲</div>
            <div className="text-emerald-400 font-bold">고지 포지션</div>
            <div className="text-gray-400 text-xs mt-1">공격력 +20~40%<br />시야 넓음</div>
          </div>
          <div className="bg-gray-900 border border-amber-700/40 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">🪨</div>
            <div className="text-amber-400 font-bold">엄폐 포지션</div>
            <div className="text-gray-400 text-xs mt-1">피해 -35%<br />생존력 최대</div>
          </div>
          <div className="bg-gray-900 border border-gray-600/40 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">⚖️</div>
            <div className="text-gray-300 font-bold">균형 포지션</div>
            <div className="text-gray-400 text-xs mt-1">공격+방어 모두<br />중간 성능</div>
          </div>
        </div>
        <button onClick={() => setScreen('setup')}
          className="px-10 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-xl font-bold transition hover:scale-105 active:scale-95">
          포지션 배치 시작
        </button>
      </div>
    </>
  );

  // ─── 배치 화면 ────────────────────────────────
  if (screen === 'setup') {
    const hovPos = hovered ? POSITIONS.find(p => p.id === hovered) : null;

    return (
      <>
        <Head><title>포지션 배치 | PKGG</title></Head>
        <Header />
        <div className="min-h-screen bg-gray-950 text-white py-6 px-4">
          <div className="max-w-3xl mx-auto flex flex-col gap-5">
            <div className="text-center">
              <h1 className="text-2xl font-bold">⚔️ 포지션 배치</h1>
              <p className="text-gray-400 text-sm mt-1">5개 포지션 중 <strong className="text-white">4명</strong> 선택 ({selected.length}/4)</p>
            </div>

            {/* 능선 맵 */}
            <div className="relative w-full rounded-2xl overflow-hidden border border-gray-700"
              style={{ paddingBottom: '62%', background: 'linear-gradient(to bottom, #1a0a0a 0%, #2d1a1a 25%, #3a2a10 42%, #1a2d10 58%, #0a1a0a 100%)' }}>

              {/* 능선 산 모양 (SVG) */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 62" preserveAspectRatio="none">
                {/* 능선 산 */}
                <polygon points="5,55 20,38 35,28 50,18 65,28 80,38 95,55" fill="rgba(60,50,20,0.5)" />
                <polygon points="5,55 20,38 35,28 50,18 65,28 80,38 95,55" fill="none" stroke="rgba(100,80,30,0.6)" strokeWidth="0.5" />
                {/* 고지대 하이라이트 */}
                <polygon points="35,28 50,18 65,28 60,32 50,24 40,32" fill="rgba(80,120,40,0.2)" />
              </svg>

              {/* AI 공격자들 (고정, 빨강) */}
              {ATTACKERS.map(a => (
                <div key={a.id}
                  className="absolute flex flex-col items-center gap-0.5 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: a.x + '%', top: a.y + '%' }}>
                  <div className="w-8 h-8 rounded-full bg-red-700 border-2 border-red-400 flex items-center justify-center text-white text-xs font-bold shadow-lg">E</div>
                  <div className="text-red-400 text-[9px] font-mono">{a.label}</div>
                </div>
              ))}

              {/* 방어 포지션들 (클릭 가능) */}
              {POSITIONS.map(pos => {
                const isSelected = selected.includes(pos.id);
                const isHovered  = hovered === pos.id;
                return (
                  <div key={pos.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                    style={{ left: pos.x + '%', top: pos.y + '%' }}
                    onClick={() => togglePos(pos.id)}
                    onMouseEnter={() => setHovered(pos.id)}
                    onMouseLeave={() => setHovered(null)}>
                    <div className={`w-10 h-10 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-150 shadow-lg
                      ${isSelected
                        ? 'bg-blue-600 border-blue-300 scale-110'
                        : isHovered
                        ? 'bg-gray-600 border-gray-300 scale-105'
                        : 'bg-gray-800 border-gray-500'}`}>
                      <span className="text-white font-bold text-xs">{pos.cover ? '🪨' : pos.height === 3 ? '▲' : '◆'}</span>
                    </div>
                    <div className={`text-center mt-0.5 text-[9px] font-mono leading-tight
                      ${isSelected ? 'text-blue-300' : 'text-gray-400'}`}>
                      {pos.label}
                    </div>
                    {/* 선택 번호 */}
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 border border-white flex items-center justify-center text-white text-[9px] font-bold">
                        {selected.indexOf(pos.id) + 1}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 구역 라벨 */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 text-red-400/40 text-xs font-mono">▲ 적 공격 방향</div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-blue-400/30 text-xs font-mono">▼ 아군 방어선</div>
            </div>

            {/* 호버 툴팁 */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 min-h-16 text-sm">
              {hovPos ? (
                <div className="flex gap-4 flex-wrap">
                  <div>
                    <div className="font-bold text-white">{hovPos.label} <span className="text-gray-400 font-normal text-xs">({hovPos.sub})</span></div>
                    <div className="text-gray-400 text-xs mt-1">{hovPos.tip}</div>
                  </div>
                  <div className="flex gap-3 text-xs ml-auto self-center">
                    <div className="text-center"><div className="text-emerald-400 font-bold">+{Math.round(hovPos.atkBonus * 100)}%</div><div className="text-gray-500">공격</div></div>
                    <div className="text-center"><div className="text-blue-400 font-bold">-{Math.round(hovPos.defBonus * 100)}%</div><div className="text-gray-500">피해</div></div>
                    <div className="text-center"><div className="text-yellow-400 font-bold">{'★'.repeat(hovPos.height)}{'☆'.repeat(3 - hovPos.height)}</div><div className="text-gray-500">고도</div></div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-xs">포지션에 마우스를 올려 정보를 확인하세요</p>
              )}
            </div>

            {/* 선택된 포지션 목록 */}
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map(i => {
                const posId = selected[i];
                const pos = posId ? POSITIONS.find(p => p.id === posId) : null;
                return (
                  <div key={i} className={`rounded-xl border p-3 text-center text-sm transition ${pos ? 'bg-blue-900/30 border-blue-600/50' : 'bg-gray-900 border-gray-700 border-dashed'}`}>
                    {pos ? (
                      <>
                        <div className="font-bold text-white text-xs">{pos.label}</div>
                        <div className="text-gray-400 text-[10px] mt-0.5">
                          공격+{Math.round(pos.atkBonus * 100)}% / 피해-{Math.round(pos.defBonus * 100)}%
                        </div>
                        <button onClick={() => togglePos(pos.id)} className="text-red-400 text-[10px] mt-1 hover:text-red-300">제거</button>
                      </>
                    ) : (
                      <span className="text-gray-600 text-xs">병사 {i + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={() => setScreen('menu')}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm font-bold transition">
                메뉴로
              </button>
              <button
                onClick={startCombat}
                disabled={selected.length < 4}
                className={`px-10 py-3 rounded-xl text-lg font-bold transition ${selected.length === 4 ? 'bg-green-600 hover:bg-green-500 hover:scale-105 active:scale-95' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
                {selected.length < 4 ? `${4 - selected.length}명 더 배치하세요` : '⚔️ 전투 시작!'}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── 전투 화면 (라운드 재생) ─────────────────────
  if (screen === 'combat' && simData) {
    const shownRounds = simData.rounds.slice(0, playRound);
    const latest = shownRounds[shownRounds.length - 1];
    const defSnap = latest ? latest.defSnap : simData.rounds[0]?.defSnap ?? [];
    const atkSnap = latest ? latest.atkSnap : ATTACKERS.map(a => ({ ...a, maxHp: BASE_HP }));

    return (
      <>
        <Head><title>전투 진행 중 | PKGG</title></Head>
        <Header />
        <div className="min-h-screen bg-gray-950 text-white py-8 px-4">
          <div className="max-w-2xl mx-auto flex flex-col gap-5">
            <div className="text-center">
              <h1 className="text-2xl font-bold">⚔️ 전투 진행 중...</h1>
              <p className="text-gray-400 text-sm">라운드 {playRound} / {simData.rounds.length}</p>
            </div>

            {/* 적 HP */}
            <div className="bg-gray-900 border border-red-900/50 rounded-xl p-4">
              <div className="text-red-400 font-bold text-sm mb-3">공격팀 (AI)</div>
              <div className="grid grid-cols-4 gap-3">
                {atkSnap.map(a => (
                  <div key={a.id} className="text-center">
                    <div className={`w-8 h-8 rounded-full border-2 mx-auto flex items-center justify-center text-xs font-bold mb-1 transition-all ${a.hp <= 0 ? 'bg-gray-800 border-gray-700 text-gray-600' : 'bg-red-700 border-red-400 text-white'}`}>
                      {a.hp <= 0 ? '✕' : 'E'}
                    </div>
                    <HpBar hp={a.hp} maxHp={a.maxHp} />
                    <div className="text-xs text-gray-500 mt-0.5">{a.hp > 0 ? a.hp : '사망'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 방어 HP */}
            <div className="bg-gray-900 border border-blue-900/50 rounded-xl p-4">
              <div className="text-blue-400 font-bold text-sm mb-3">방어팀 (아군)</div>
              <div className="grid grid-cols-4 gap-3">
                {defSnap.map(d => (
                  <div key={d.id} className="text-center">
                    <div className={`w-8 h-8 rounded-full border-2 mx-auto flex items-center justify-center text-xs font-bold mb-1 transition-all ${d.hp <= 0 ? 'bg-gray-800 border-gray-700 text-gray-600' : 'bg-blue-600 border-blue-300 text-white'}`}>
                      {d.hp <= 0 ? '✕' : 'P'}
                    </div>
                    <HpBar hp={d.hp} maxHp={d.maxHp} />
                    <div className="text-xs text-gray-500 mt-0.5">{d.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 이벤트 로그 */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 min-h-32 max-h-56 overflow-y-auto text-xs space-y-1">
              {shownRounds.flatMap((r, ri) => [
                <div key={`r${ri}`} className="text-gray-600 font-mono text-[10px] pt-1">— 라운드 {r.round} —</div>,
                ...r.events.map((ev, ei) => (
                  <div key={`e${ri}-${ei}`} className={ev.type === 'def_attack' ? 'text-green-400' : 'text-red-400'}>
                    {ev.type === 'def_attack'
                      ? `[${ev.from}] → ${ev.to} ${ev.dmg}dmg${ev.bonus ? ` (${ev.bonus})` : ''}${ev.killed ? ' 💀' : ''}`
                      : `[${ev.from}] → ${ev.to} ${ev.dmg}dmg${ev.reduced ? ` (${ev.reduced})` : ''}${ev.killed ? ' 💀' : ''}`}
                  </div>
                )),
              ])}
            </div>

            <div className="text-center text-gray-500 text-sm animate-pulse">전투 진행 중...</div>
          </div>
        </div>
      </>
    );
  }

  // ─── 결과 화면 ────────────────────────────────────
  if (screen === 'result' && simResult) {
    const { victory, defSurvived, atkSurvived, rounds } = simResult;
    const selPos = POSITIONS.filter(p => selected.includes(p.id));
    const tips = analyzeFormation(selPos, victory);

    return (
      <>
        <Head><title>전투 결과 | PKGG</title></Head>
        <Header />
        <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-7 px-4 py-10">
          <div className={`text-center p-8 rounded-2xl border ${victory ? 'border-yellow-500/50 bg-yellow-900/10' : 'border-red-500/50 bg-red-900/10'}`}>
            <div className="text-5xl mb-3">{victory ? '🏆' : '💀'}</div>
            <h1 className={`text-4xl font-black ${victory ? 'text-yellow-400' : 'text-red-400'}`}>
              {victory ? '방어 성공!' : '방어 실패'}
            </h1>
            <p className="text-gray-400 mt-2 text-sm">{rounds.length}라운드 교전</p>
          </div>

          <div className="grid grid-cols-2 gap-5 max-w-md w-full">
            <div className="bg-gray-900 border border-blue-500/30 rounded-xl p-5 text-center">
              <div className="text-3xl font-bold text-blue-400">{defSurvived} / 4</div>
              <div className="text-gray-400 text-sm mt-1">아군 생존</div>
            </div>
            <div className="bg-gray-900 border border-red-500/30 rounded-xl p-5 text-center">
              <div className="text-3xl font-bold text-red-400">{atkSurvived} / 4</div>
              <div className="text-gray-400 text-sm mt-1">적군 생존</div>
            </div>
          </div>

          {/* 내 포지션 요약 */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 w-full max-w-md">
            <div className="text-gray-400 font-bold text-sm mb-3">내 포지션 구성</div>
            <div className="grid grid-cols-2 gap-2">
              {selPos.map(pos => (
                <div key={pos.id} className="bg-gray-800 rounded-lg p-2 text-xs">
                  <div className="font-bold text-white">{pos.cover ? '🪨' : '▲'} {pos.label}</div>
                  <div className="text-gray-400 mt-0.5">
                    공격+{Math.round(pos.atkBonus * 100)}% · 피해-{Math.round(pos.defBonus * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 전략 분석 */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 w-full max-w-md text-sm">
            <div className="font-bold text-gray-300 mb-3">전략 분석</div>
            <ul className="space-y-2">
              {tips.map((tip, i) => (
                <li key={i} className={`flex gap-2 ${victory ? 'text-green-400/80' : 'text-orange-400/80'}`}>
                  <span>{victory ? '✓' : '→'}</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-4">
            <button onClick={() => { setSelected([]); setScreen('setup'); }}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition">
              다시 배치
            </button>
            <button onClick={() => setScreen('menu')}
              className="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold transition">
              메뉴로
            </button>
          </div>
        </div>
      </>
    );
  }

  return null;
}
