// pages/playstyle-matchup.js — 플레이스타일 상성표
import Head from 'next/head';
import { useState } from 'react';
import Header from '../components/layout/Header';
import { TYPES } from '../utils/playstyleClassifier';

// ── 상성 점수 정의 (5 = 유리, 3 = 비슷, 1 = 불리) ─────────────────────────────
// 각 타입이 다른 타입과 만났을 때의 유리함 점수
const MATCHUP = {
  HYPER_CARRY: {
    HYPER_CARRY:        3, PRECISION_SNIPER:   2, AGGRESSIVE_CARRY:  4,
    EARLY_RUSHER:       4, DAMAGE_DEALER:      4, KILL_FARMER:       4,
    TACTICAL_LEADER:    3, PRECISION_FIGHTER:  4, SURVIVAL_WINNER:   4,
    CAMPER:             5, TEAM_SUPPORT:       4, BALANCED:          4,
    AGGRESSIVE_BEGINNER:5, BEGINNER:           5,
  },
  PRECISION_SNIPER: {
    HYPER_CARRY:        3, PRECISION_SNIPER:   3, AGGRESSIVE_CARRY:  3,
    EARLY_RUSHER:       4, DAMAGE_DEALER:      3, KILL_FARMER:       3,
    TACTICAL_LEADER:    3, PRECISION_FIGHTER:  3, SURVIVAL_WINNER:   3,
    CAMPER:             4, TEAM_SUPPORT:       3, BALANCED:          3,
    AGGRESSIVE_BEGINNER:4, BEGINNER:           4,
  },
  AGGRESSIVE_CARRY: {
    HYPER_CARRY:        2, PRECISION_SNIPER:   3, AGGRESSIVE_CARRY:  3,
    EARLY_RUSHER:       4, DAMAGE_DEALER:      3, KILL_FARMER:       3,
    TACTICAL_LEADER:    2, PRECISION_FIGHTER:  3, SURVIVAL_WINNER:   3,
    CAMPER:             4, TEAM_SUPPORT:       3, BALANCED:          3,
    AGGRESSIVE_BEGINNER:4, BEGINNER:           5,
  },
  EARLY_RUSHER: {
    HYPER_CARRY:        2, PRECISION_SNIPER:   2, AGGRESSIVE_CARRY:  2,
    EARLY_RUSHER:       3, DAMAGE_DEALER:      3, KILL_FARMER:       3,
    TACTICAL_LEADER:    2, PRECISION_FIGHTER:  2, SURVIVAL_WINNER:   1,
    CAMPER:             3, TEAM_SUPPORT:       2, BALANCED:          2,
    AGGRESSIVE_BEGINNER:3, BEGINNER:           4,
  },
  DAMAGE_DEALER: {
    HYPER_CARRY:        2, PRECISION_SNIPER:   3, AGGRESSIVE_CARRY:  3,
    EARLY_RUSHER:       3, DAMAGE_DEALER:      3, KILL_FARMER:       2,
    TACTICAL_LEADER:    3, PRECISION_FIGHTER:  3, SURVIVAL_WINNER:   3,
    CAMPER:             4, TEAM_SUPPORT:       3, BALANCED:          3,
    AGGRESSIVE_BEGINNER:4, BEGINNER:           4,
  },
  KILL_FARMER: {
    HYPER_CARRY:        2, PRECISION_SNIPER:   3, AGGRESSIVE_CARRY:  3,
    EARLY_RUSHER:       3, DAMAGE_DEALER:      4, KILL_FARMER:       3,
    TACTICAL_LEADER:    2, PRECISION_FIGHTER:  3, SURVIVAL_WINNER:   2,
    CAMPER:             3, TEAM_SUPPORT:       3, BALANCED:          3,
    AGGRESSIVE_BEGINNER:3, BEGINNER:           4,
  },
  TACTICAL_LEADER: {
    HYPER_CARRY:        3, PRECISION_SNIPER:   3, AGGRESSIVE_CARRY:  4,
    EARLY_RUSHER:       4, DAMAGE_DEALER:      3, KILL_FARMER:       4,
    TACTICAL_LEADER:    3, PRECISION_FIGHTER:  3, SURVIVAL_WINNER:   3,
    CAMPER:             3, TEAM_SUPPORT:       4, BALANCED:          3,
    AGGRESSIVE_BEGINNER:4, BEGINNER:           4,
  },
  PRECISION_FIGHTER: {
    HYPER_CARRY:        2, PRECISION_SNIPER:   3, AGGRESSIVE_CARRY:  3,
    EARLY_RUSHER:       4, DAMAGE_DEALER:      3, KILL_FARMER:       3,
    TACTICAL_LEADER:    3, PRECISION_FIGHTER:  3, SURVIVAL_WINNER:   3,
    CAMPER:             4, TEAM_SUPPORT:       3, BALANCED:          3,
    AGGRESSIVE_BEGINNER:4, BEGINNER:           4,
  },
  SURVIVAL_WINNER: {
    HYPER_CARRY:        2, PRECISION_SNIPER:   3, AGGRESSIVE_CARRY:  3,
    EARLY_RUSHER:       5, DAMAGE_DEALER:      3, KILL_FARMER:       4,
    TACTICAL_LEADER:    3, PRECISION_FIGHTER:  3, SURVIVAL_WINNER:   3,
    CAMPER:             3, TEAM_SUPPORT:       3, BALANCED:          3,
    AGGRESSIVE_BEGINNER:4, BEGINNER:           4,
  },
  CAMPER: {
    HYPER_CARRY:        1, PRECISION_SNIPER:   2, AGGRESSIVE_CARRY:  2,
    EARLY_RUSHER:       3, DAMAGE_DEALER:      2, KILL_FARMER:       3,
    TACTICAL_LEADER:    3, PRECISION_FIGHTER:  2, SURVIVAL_WINNER:   3,
    CAMPER:             3, TEAM_SUPPORT:       3, BALANCED:          2,
    AGGRESSIVE_BEGINNER:3, BEGINNER:           3,
  },
  TEAM_SUPPORT: {
    HYPER_CARRY:        2, PRECISION_SNIPER:   3, AGGRESSIVE_CARRY:  3,
    EARLY_RUSHER:       4, DAMAGE_DEALER:      3, KILL_FARMER:       3,
    TACTICAL_LEADER:    2, PRECISION_FIGHTER:  3, SURVIVAL_WINNER:   3,
    CAMPER:             3, TEAM_SUPPORT:       3, BALANCED:          3,
    AGGRESSIVE_BEGINNER:4, BEGINNER:           4,
  },
  BALANCED: {
    HYPER_CARRY:        2, PRECISION_SNIPER:   3, AGGRESSIVE_CARRY:  3,
    EARLY_RUSHER:       4, DAMAGE_DEALER:      3, KILL_FARMER:       3,
    TACTICAL_LEADER:    3, PRECISION_FIGHTER:  3, SURVIVAL_WINNER:   3,
    CAMPER:             4, TEAM_SUPPORT:       3, BALANCED:          3,
    AGGRESSIVE_BEGINNER:4, BEGINNER:           4,
  },
  AGGRESSIVE_BEGINNER: {
    HYPER_CARRY:        1, PRECISION_SNIPER:   2, AGGRESSIVE_CARRY:  2,
    EARLY_RUSHER:       3, DAMAGE_DEALER:      2, KILL_FARMER:       3,
    TACTICAL_LEADER:    2, PRECISION_FIGHTER:  2, SURVIVAL_WINNER:   2,
    CAMPER:             3, TEAM_SUPPORT:       2, BALANCED:          2,
    AGGRESSIVE_BEGINNER:3, BEGINNER:           3,
  },
  BEGINNER: {
    HYPER_CARRY:        1, PRECISION_SNIPER:   1, AGGRESSIVE_CARRY:  1,
    EARLY_RUSHER:       2, DAMAGE_DEALER:      2, KILL_FARMER:       2,
    TACTICAL_LEADER:    2, PRECISION_FIGHTER:  2, SURVIVAL_WINNER:   2,
    CAMPER:             2, TEAM_SUPPORT:       2, BALANCED:          2,
    AGGRESSIVE_BEGINNER:3, BEGINNER:           3,
  },
};

const TYPE_KEYS = Object.keys(MATCHUP);

// ── 점수 → 색상 ─────────────────────────────────────────────────────────────
function scoreColor(score, isSelf) {
  if (isSelf) return 'bg-gray-700 text-gray-500';
  if (score >= 5) return 'bg-emerald-500/30 text-emerald-300';
  if (score === 4) return 'bg-green-500/20 text-green-400';
  if (score === 3) return 'bg-yellow-500/15 text-yellow-400';
  if (score === 2) return 'bg-orange-500/20 text-orange-400';
  return 'bg-red-500/20 text-red-400';
}

function scoreLabel(score) {
  if (score >= 5) return '매우 유리';
  if (score === 4) return '유리';
  if (score === 3) return '비슷';
  if (score === 2) return '불리';
  return '매우 불리';
}

// ── 각 타입의 전체 평균 점수 계산 ───────────────────────────────────────────
function avgScore(code) {
  const scores = Object.entries(MATCHUP[code] || {})
    .filter(([k]) => k !== code)
    .map(([, v]) => v);
  return scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '?';
}

export default function PlaystyleMatchup() {
  const [selected, setSelected] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);

  const selectedType = selected ? TYPES[selected] : null;

  return (
    <div className="min-h-screen bg-gray-950">
      <Head>
        <title>플레이스타일 상성표 | PKGG</title>
        <meta name="description" content="14가지 PUBG 플레이스타일 간 교전 상성을 확인하세요." />
      </Head>
      <Header />

      <main className="max-w-screen-xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white mb-1">⚔️ 플레이스타일 상성표</h1>
          <p className="text-sm text-gray-400">14가지 플레이스타일 간 1:1 교전 유리함을 나타냅니다. 행 = 내 타입, 열 = 상대 타입</p>
        </div>

        {/* 범례 */}
        <div className="flex flex-wrap gap-3 mb-6">
          {[
            { score: 5, label: '매우 유리' },
            { score: 4, label: '유리' },
            { score: 3, label: '비슷' },
            { score: 2, label: '불리' },
            { score: 1, label: '매우 불리' },
          ].map(({ score, label }) => (
            <div key={score} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded text-xs font-black flex items-center justify-center ${scoreColor(score, false)}`}>
                {score}
              </div>
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          ))}
        </div>

        {/* 타입 선택 + 요약 */}
        {selected && selectedType && (
          <div className={`mb-6 p-4 rounded-2xl border ${selectedType.bg} ${selectedType.border} flex items-center gap-4 flex-wrap`}>
            <div className={`text-3xl`}>{selectedType.label.split(' ')[0]}</div>
            <div>
              <div className={`text-sm font-bold ${selectedType.color}`}>{selectedType.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{selectedType.desc}</div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-xs text-gray-500">평균 상성 점수</div>
              <div className={`text-xl font-black ${selectedType.color}`}>{avgScore(selected)}<span className="text-xs text-gray-500 ml-1">/ 5</span></div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-gray-600 hover:text-gray-400 text-sm"
            >
              ✕
            </button>
          </div>
        )}

        {/* 매트릭스 테이블 */}
        <div className="overflow-x-auto rounded-2xl border border-gray-800">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="bg-gray-900 p-2 text-gray-600 text-left font-semibold min-w-[120px] sticky left-0 z-10 border-b border-r border-gray-800">
                  내 타입 ↓ / 상대 →
                </th>
                {TYPE_KEYS.map((colKey) => {
                  const t = TYPES[colKey];
                  return (
                    <th
                      key={colKey}
                      className={`bg-gray-900 p-2 border-b border-gray-800 text-center min-w-[52px] cursor-pointer transition-colors ${selected === colKey ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
                      onClick={() => setSelected(selected === colKey ? null : colKey)}
                      title={t?.label}
                    >
                      <div className="text-lg leading-none">{t?.label?.split(' ')[0] || '?'}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {TYPE_KEYS.map((rowKey) => {
                const rowType = TYPES[rowKey];
                const isSelectedRow = selected === rowKey;
                return (
                  <tr
                    key={rowKey}
                    className={`border-b border-gray-800/50 transition-colors ${isSelectedRow ? 'bg-gray-800/30' : 'hover:bg-gray-900/60'}`}
                  >
                    {/* 행 헤더 */}
                    <td
                      className={`bg-gray-900 p-2 sticky left-0 z-10 border-r border-gray-800 cursor-pointer ${isSelectedRow ? 'bg-gray-800' : 'hover:bg-gray-800'}`}
                      onClick={() => setSelected(selected === rowKey ? null : rowKey)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{rowType?.label?.split(' ')[0] || '?'}</span>
                        <span className={`text-[10px] font-bold truncate max-w-[70px] ${rowType?.color}`}>
                          {rowType?.label?.split(' ').slice(1).join(' ')}
                        </span>
                      </div>
                    </td>
                    {/* 점수 셀 */}
                    {TYPE_KEYS.map((colKey) => {
                      const score = MATCHUP[rowKey]?.[colKey] ?? 3;
                      const isSelf = rowKey === colKey;
                      const isHighlighted = selected && (selected === rowKey || selected === colKey);
                      return (
                        <td
                          key={colKey}
                          className={`p-1 text-center transition-all ${!isHighlighted && selected ? 'opacity-30' : ''}`}
                          onMouseEnter={() => setHoveredCell({ row: rowKey, col: colKey, score })}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          <div className={`w-9 h-9 mx-auto rounded-lg text-xs font-black flex items-center justify-center transition-transform hover:scale-110 cursor-default ${scoreColor(score, isSelf)}`}
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

        {/* 호버 툴팁 */}
        {hoveredCell && !hoveredCell.isSelf && (
          <div className="mt-4 p-3 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-300 flex items-center gap-3">
            <span>{TYPES[hoveredCell.row]?.label}</span>
            <span className="text-gray-600">vs</span>
            <span>{TYPES[hoveredCell.col]?.label}</span>
            <span className="ml-auto">
              <span className={`font-black text-base ${scoreColor(hoveredCell.score, false).split(' ').find((c) => c.startsWith('text-'))}`}>
                {hoveredCell.score}/5
              </span>
              <span className="text-gray-500 text-xs ml-1">— {scoreLabel(hoveredCell.score)}</span>
            </span>
          </div>
        )}

        {/* 안내 */}
        <div className="mt-6 p-4 bg-gray-900/50 border border-gray-800 rounded-2xl text-xs text-gray-600 leading-relaxed">
          <strong className="text-gray-400">📌 참고사항:</strong> 상성 점수는 1:1 교전 기준이며, 실제 게임에서는 포지션·무기·팀 구성에 따라 달라질 수 있습니다.
          타입을 클릭하면 해당 타입의 상성을 강조 표시합니다.
        </div>
      </main>
    </div>
  );
}
