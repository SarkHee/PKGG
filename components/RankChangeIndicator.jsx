import React from "react";

/**
 * 랭크 점수 상승/하락 애니메이션 컴포넌트 (op.gg 스타일)
 * @param {Object} props
 * @param {number} prevScore - 이전 점수
 * @param {number} currentScore - 현재 점수
 */
export default function RankChangeIndicator({ prevScore, currentScore }) {
  if (typeof prevScore !== 'number' || typeof currentScore !== 'number') return null;
  const diff = currentScore - prevScore;
  let color = '#64748b';
  let icon = '';
  if (diff > 0) { color = '#38bdf8'; icon = '▲'; }
  else if (diff < 0) { color = '#f87171'; icon = '▼'; }
  return (
    <span className="rank-change-indicator" style={{color, fontWeight:700, marginLeft:8, fontSize:16, transition:'color 0.3s'}}>
      {icon} {diff !== 0 ? Math.abs(diff) : ''}
    </span>
  );
}
