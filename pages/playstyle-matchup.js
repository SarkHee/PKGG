// pages/playstyle-matchup.js — 플레이스타일 상성 분석
import Head from 'next/head';
import { useState } from 'react';
import Header from '../components/layout/Header';
import { TYPES } from '../utils/playstyleClassifier';

const MATCHUP = {
  HYPER_CARRY: {
    HYPER_CARRY:3, PRECISION_SNIPER:2, AGGRESSIVE_CARRY:4,
    EARLY_RUSHER:4, DAMAGE_DEALER:4, KILL_FARMER:4,
    TACTICAL_LEADER:3, PRECISION_FIGHTER:4, SURVIVAL_WINNER:4,
    CAMPER:5, TEAM_SUPPORT:4, BALANCED:4,
    AGGRESSIVE_BEGINNER:5, BEGINNER:5,
  },
  PRECISION_SNIPER: {
    HYPER_CARRY:3, PRECISION_SNIPER:3, AGGRESSIVE_CARRY:3,
    EARLY_RUSHER:4, DAMAGE_DEALER:3, KILL_FARMER:3,
    TACTICAL_LEADER:3, PRECISION_FIGHTER:3, SURVIVAL_WINNER:3,
    CAMPER:4, TEAM_SUPPORT:3, BALANCED:3,
    AGGRESSIVE_BEGINNER:4, BEGINNER:4,
  },
  AGGRESSIVE_CARRY: {
    HYPER_CARRY:2, PRECISION_SNIPER:3, AGGRESSIVE_CARRY:3,
    EARLY_RUSHER:4, DAMAGE_DEALER:3, KILL_FARMER:3,
    TACTICAL_LEADER:2, PRECISION_FIGHTER:3, SURVIVAL_WINNER:3,
    CAMPER:4, TEAM_SUPPORT:3, BALANCED:3,
    AGGRESSIVE_BEGINNER:4, BEGINNER:5,
  },
  EARLY_RUSHER: {
    HYPER_CARRY:2, PRECISION_SNIPER:2, AGGRESSIVE_CARRY:2,
    EARLY_RUSHER:3, DAMAGE_DEALER:3, KILL_FARMER:3,
    TACTICAL_LEADER:2, PRECISION_FIGHTER:2, SURVIVAL_WINNER:1,
    CAMPER:3, TEAM_SUPPORT:2, BALANCED:2,
    AGGRESSIVE_BEGINNER:3, BEGINNER:4,
  },
  DAMAGE_DEALER: {
    HYPER_CARRY:2, PRECISION_SNIPER:3, AGGRESSIVE_CARRY:3,
    EARLY_RUSHER:3, DAMAGE_DEALER:3, KILL_FARMER:2,
    TACTICAL_LEADER:3, PRECISION_FIGHTER:3, SURVIVAL_WINNER:3,
    CAMPER:4, TEAM_SUPPORT:3, BALANCED:3,
    AGGRESSIVE_BEGINNER:4, BEGINNER:4,
  },
  KILL_FARMER: {
    HYPER_CARRY:2, PRECISION_SNIPER:3, AGGRESSIVE_CARRY:3,
    EARLY_RUSHER:3, DAMAGE_DEALER:4, KILL_FARMER:3,
    TACTICAL_LEADER:2, PRECISION_FIGHTER:3, SURVIVAL_WINNER:2,
    CAMPER:3, TEAM_SUPPORT:3, BALANCED:3,
    AGGRESSIVE_BEGINNER:3, BEGINNER:4,
  },
  TACTICAL_LEADER: {
    HYPER_CARRY:3, PRECISION_SNIPER:3, AGGRESSIVE_CARRY:4,
    EARLY_RUSHER:4, DAMAGE_DEALER:3, KILL_FARMER:4,
    TACTICAL_LEADER:3, PRECISION_FIGHTER:3, SURVIVAL_WINNER:3,
    CAMPER:3, TEAM_SUPPORT:4, BALANCED:3,
    AGGRESSIVE_BEGINNER:4, BEGINNER:4,
  },
  PRECISION_FIGHTER: {
    HYPER_CARRY:2, PRECISION_SNIPER:3, AGGRESSIVE_CARRY:3,
    EARLY_RUSHER:4, DAMAGE_DEALER:3, KILL_FARMER:3,
    TACTICAL_LEADER:3, PRECISION_FIGHTER:3, SURVIVAL_WINNER:3,
    CAMPER:4, TEAM_SUPPORT:3, BALANCED:3,
    AGGRESSIVE_BEGINNER:4, BEGINNER:4,
  },
  SURVIVAL_WINNER: {
    HYPER_CARRY:2, PRECISION_SNIPER:3, AGGRESSIVE_CARRY:3,
    EARLY_RUSHER:5, DAMAGE_DEALER:3, KILL_FARMER:4,
    TACTICAL_LEADER:3, PRECISION_FIGHTER:3, SURVIVAL_WINNER:3,
    CAMPER:3, TEAM_SUPPORT:3, BALANCED:3,
    AGGRESSIVE_BEGINNER:4, BEGINNER:4,
  },
  CAMPER: {
    HYPER_CARRY:1, PRECISION_SNIPER:2, AGGRESSIVE_CARRY:2,
    EARLY_RUSHER:3, DAMAGE_DEALER:2, KILL_FARMER:3,
    TACTICAL_LEADER:3, PRECISION_FIGHTER:2, SURVIVAL_WINNER:3,
    CAMPER:3, TEAM_SUPPORT:3, BALANCED:2,
    AGGRESSIVE_BEGINNER:3, BEGINNER:3,
  },
  TEAM_SUPPORT: {
    HYPER_CARRY:2, PRECISION_SNIPER:3, AGGRESSIVE_CARRY:3,
    EARLY_RUSHER:4, DAMAGE_DEALER:3, KILL_FARMER:3,
    TACTICAL_LEADER:2, PRECISION_FIGHTER:3, SURVIVAL_WINNER:3,
    CAMPER:3, TEAM_SUPPORT:3, BALANCED:3,
    AGGRESSIVE_BEGINNER:4, BEGINNER:4,
  },
  BALANCED: {
    HYPER_CARRY:2, PRECISION_SNIPER:3, AGGRESSIVE_CARRY:3,
    EARLY_RUSHER:4, DAMAGE_DEALER:3, KILL_FARMER:3,
    TACTICAL_LEADER:3, PRECISION_FIGHTER:3, SURVIVAL_WINNER:3,
    CAMPER:4, TEAM_SUPPORT:3, BALANCED:3,
    AGGRESSIVE_BEGINNER:4, BEGINNER:4,
  },
  AGGRESSIVE_BEGINNER: {
    HYPER_CARRY:1, PRECISION_SNIPER:2, AGGRESSIVE_CARRY:2,
    EARLY_RUSHER:3, DAMAGE_DEALER:2, KILL_FARMER:3,
    TACTICAL_LEADER:2, PRECISION_FIGHTER:2, SURVIVAL_WINNER:2,
    CAMPER:3, TEAM_SUPPORT:2, BALANCED:2,
    AGGRESSIVE_BEGINNER:3, BEGINNER:3,
  },
  BEGINNER: {
    HYPER_CARRY:1, PRECISION_SNIPER:1, AGGRESSIVE_CARRY:1,
    EARLY_RUSHER:2, DAMAGE_DEALER:2, KILL_FARMER:2,
    TACTICAL_LEADER:2, PRECISION_FIGHTER:2, SURVIVAL_WINNER:2,
    CAMPER:2, TEAM_SUPPORT:2, BALANCED:2,
    AGGRESSIVE_BEGINNER:3, BEGINNER:3,
  },
};

const TYPE_KEYS = Object.keys(MATCHUP);

function scoreLabel(score) {
  if (score >= 5) return '매우 유리';
  if (score === 4) return '유리';
  if (score === 3) return '비슷';
  if (score === 2) return '불리';
  return '매우 불리';
}

function avgScore(code) {
  const scores = Object.entries(MATCHUP[code] || {})
    .filter(([k]) => k !== code)
    .map(([, v]) => v);
  return scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '?';
}

function scoreColor(score, isSelf) {
  if (isSelf) return 'bg-gray-700 text-gray-500';
  if (score >= 5) return 'bg-emerald-500/30 text-emerald-300';
  if (score === 4) return 'bg-green-500/20 text-green-400';
  if (score === 3) return 'bg-yellow-500/15 text-yellow-400';
  if (score === 2) return 'bg-orange-500/20 text-orange-400';
  return 'bg-red-500/20 text-red-400';
}

export default function PlaystyleMatchup() {
  const [selected, setSelected] = useState(null);
  const [showMatrix, setShowMatrix] = useState(false);

  const selectedType = selected ? TYPES[selected] : null;
  const matchups = selected
    ? {
        win:     TYPE_KEYS.filter((k) => k !== selected && MATCHUP[selected][k] >= 4),
        neutral: TYPE_KEYS.filter((k) => k !== selected && MATCHUP[selected][k] === 3),
        lose:    TYPE_KEYS.filter((k) => k !== selected && MATCHUP[selected][k] <= 2),
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-950">
      <Head>
        <title>플레이스타일 상성 분석 | PKGG</title>
        <meta name="description" content="14가지 PUBG 플레이스타일 간 교전 궁합을 확인하세요." />
      </Head>
      <Header />

      <main className="max-w-screen-xl mx-auto px-4 py-8">

        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-white mb-2">⚔️ 플레이스타일 상성 분석</h1>
          <p className="text-gray-400 text-sm">내 플레이스타일을 클릭하면 유리한 상대와 주의할 상대를 알려드립니다</p>
        </div>

        {/* 타입 선택 그리드 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-8">
          {TYPE_KEYS.map((key) => {
            const tp = TYPES[key];
            const isSelected = selected === key;
            const emoji = tp?.label?.split(' ')[0] || '?';
            const name  = tp?.label?.split(' ').slice(1).join(' ') || key;
            return (
              <button
                key={key}
                onClick={() => setSelected(isSelected ? null : key)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  isSelected
                    ? 'scale-105 shadow-lg'
                    : 'border-gray-700 bg-gray-900/40 hover:border-gray-500 hover:bg-gray-800/60'
                }`}
                style={isSelected
                  ? { borderColor: (tp?.primary || '#6366F1') + 'CC', backgroundColor: (tp?.primary || '#6366F1') + '20' }
                  : {}
                }
              >
                <div className="text-2xl mb-1 leading-none">{emoji}</div>
                <div
                  className="text-[10px] font-bold leading-tight"
                  style={{ color: isSelected ? (tp?.primary || '#A78BFA') : '#9CA3AF' }}
                >
                  {name}
                </div>
              </button>
            );
          })}
        </div>

        {/* 선택 전 안내 */}
        {!selected && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">☝️</div>
            <p className="text-lg font-medium text-gray-500">위에서 내 플레이스타일을 클릭하세요</p>
            <p className="text-sm text-gray-600 mt-1">플레이어 상세 페이지에서 내 스타일을 확인할 수 있어요</p>
          </div>
        )}

        {/* 선택 후 결과 */}
        {selected && selectedType && matchups && (
          <div>
            {/* 선택된 타입 요약 */}
            <div className={`flex items-center gap-4 p-5 rounded-2xl border mb-6 ${selectedType.bg} ${selectedType.border}`}>
              <div className="text-4xl">{selectedType.label?.split(' ')[0]}</div>
              <div className="flex-1 min-w-0">
                <div className={`font-black text-lg ${selectedType.color}`}>{selectedType.label}</div>
                <div className="text-sm text-gray-400 mt-0.5">{selectedType.desc}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xs text-gray-500 mb-0.5">평균 상성 점수</div>
                <div className={`text-2xl font-black ${selectedType.color}`}>
                  {avgScore(selected)}<span className="text-sm text-gray-500 ml-1">/ 5</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-600 hover:text-gray-400 text-xl flex-shrink-0">✕</button>
            </div>

            {/* 3분류 결과 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

              {/* 유리 */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="font-bold text-emerald-400 text-sm">이길 가능성 높음 ({matchups.win.length})</span>
                </div>
                {matchups.win.length === 0
                  ? <p className="text-xs text-gray-600 py-2">해당 없음</p>
                  : (
                    <div className="space-y-2">
                      {matchups.win.map((key) => {
                        const tp = TYPES[key];
                        const score = MATCHUP[selected][key];
                        return (
                          <div key={key} className="flex items-center gap-3 bg-gray-900/60 rounded-xl p-2.5">
                            <span className="text-xl flex-shrink-0">{tp?.label?.split(' ')[0]}</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-gray-200 truncate">{tp?.label?.split(' ').slice(1).join(' ')}</div>
                              <div className="text-[10px] text-emerald-400">{scoreLabel(score)}</div>
                            </div>
                            <div className="text-emerald-400 font-black text-sm flex-shrink-0">{score}</div>
                          </div>
                        );
                      })}
                    </div>
                  )
                }
              </div>

              {/* 비슷 */}
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <span className="font-bold text-yellow-400 text-sm">비슷한 상대 ({matchups.neutral.length})</span>
                </div>
                {matchups.neutral.length === 0
                  ? <p className="text-xs text-gray-600 py-2">해당 없음</p>
                  : (
                    <div className="space-y-2">
                      {matchups.neutral.map((key) => {
                        const tp = TYPES[key];
                        return (
                          <div key={key} className="flex items-center gap-3 bg-gray-900/60 rounded-xl p-2.5">
                            <span className="text-xl flex-shrink-0">{tp?.label?.split(' ')[0]}</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-gray-200 truncate">{tp?.label?.split(' ').slice(1).join(' ')}</div>
                              <div className="text-[10px] text-yellow-400">비슷</div>
                            </div>
                            <div className="text-yellow-400 font-black text-sm flex-shrink-0">3</div>
                          </div>
                        );
                      })}
                    </div>
                  )
                }
              </div>

              {/* 불리 */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="font-bold text-red-400 text-sm">조심해야 할 상대 ({matchups.lose.length})</span>
                </div>
                {matchups.lose.length === 0
                  ? <p className="text-xs text-gray-600 py-2">해당 없음</p>
                  : (
                    <div className="space-y-2">
                      {matchups.lose.map((key) => {
                        const tp = TYPES[key];
                        const score = MATCHUP[selected][key];
                        return (
                          <div key={key} className="flex items-center gap-3 bg-gray-900/60 rounded-xl p-2.5">
                            <span className="text-xl flex-shrink-0">{tp?.label?.split(' ')[0]}</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-gray-200 truncate">{tp?.label?.split(' ').slice(1).join(' ')}</div>
                              <div className="text-[10px] text-red-400">{scoreLabel(score)}</div>
                            </div>
                            <div className="text-red-400 font-black text-sm flex-shrink-0">{score}</div>
                          </div>
                        );
                      })}
                    </div>
                  )
                }
              </div>
            </div>

            {/* 안내 */}
            <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-2xl text-xs text-gray-600 mb-6">
              <strong className="text-gray-400">📌 참고:</strong> 상성 점수는 1:1 교전 기준이며, 실제 게임에서는 포지션·무기·팀 구성에 따라 달라질 수 있습니다.
              점수 5=매우 유리 · 4=유리 · 3=비슷 · 2=불리 · 1=매우 불리
            </div>
          </div>
        )}

        {/* 전체 매트릭스 토글 */}
        <button
          onClick={() => setShowMatrix(!showMatrix)}
          className="w-full py-3 rounded-xl border border-gray-700 bg-gray-900/40 text-sm text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-all font-medium"
        >
          {showMatrix ? '▲ 14×14 전체 상성표 숨기기' : '▼ 14×14 전체 상성표 보기'}
        </button>

        {showMatrix && (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-800">
            <div className="flex flex-wrap gap-3 p-3 bg-gray-900/60 border-b border-gray-800">
              {[{s:5,l:'매우 유리'},{s:4,l:'유리'},{s:3,l:'비슷'},{s:2,l:'불리'},{s:1,l:'매우 불리'}].map(({s,l}) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`w-5 h-5 rounded text-[10px] font-black flex items-center justify-center ${scoreColor(s, false)}`}>{s}</div>
                  <span className="text-[10px] text-gray-400">{l}</span>
                </div>
              ))}
              <span className="text-[10px] text-gray-600 ml-2">행 = 내 타입 / 열 = 상대 타입</span>
            </div>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="bg-gray-900 p-2 text-gray-600 min-w-[110px] sticky left-0 z-10 border-b border-r border-gray-800" />
                  {TYPE_KEYS.map((colKey) => (
                    <th key={colKey} className="bg-gray-900 p-2 border-b border-gray-800 text-center min-w-[44px]" title={TYPES[colKey]?.label}>
                      <div className="text-base leading-none">{TYPES[colKey]?.label?.split(' ')[0] || '?'}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TYPE_KEYS.map((rowKey) => {
                  const rowType = TYPES[rowKey];
                  return (
                    <tr key={rowKey} className="border-b border-gray-800/50 hover:bg-gray-900/40">
                      <td className="bg-gray-900 p-2 sticky left-0 z-10 border-r border-gray-800">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{rowType?.label?.split(' ')[0]}</span>
                          <span className={`text-[10px] font-bold truncate max-w-[60px] ${rowType?.color}`}>
                            {rowType?.label?.split(' ').slice(1).join(' ')}
                          </span>
                        </div>
                      </td>
                      {TYPE_KEYS.map((colKey) => {
                        const score = MATCHUP[rowKey]?.[colKey] ?? 3;
                        const isSelf = rowKey === colKey;
                        return (
                          <td key={colKey} className="p-1 text-center">
                            <div
                              className={`w-8 h-8 mx-auto rounded-lg text-xs font-black flex items-center justify-center ${scoreColor(score, isSelf)}`}
                              title={isSelf ? '동일 타입' : `${rowType?.label} vs ${TYPES[colKey]?.label}: ${scoreLabel(score)}`}
                            >
                              {isSelf ? '–' : score}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </main>
    </div>
  );
}
