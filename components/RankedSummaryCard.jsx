import React from "react";

const modeLabels = {
  "squad-fpp": "스쿼드 FPP",
  "squad": "스쿼드",
  "duo-fpp": "듀오 FPP",
  "solo-fpp": "솔로 FPP",
};

export default function RankedSummaryCard({ summary }) {
  if (!summary) return null;
  return (
    <div>
      <div>
        <span>{modeLabels[summary.mode] || summary.mode}</span>
        <span>{summary.tier}</span>
      </div>
      <div>
        <span>{summary.rp.toLocaleString()} RP</span>
        <span>{summary.games} 게임</span>
      </div>
      <div>
        <div style={{width: `${Math.min(100, summary.rp/3000*100)}%`}} />
      </div>
      <div>
        <div><span>K/D</span><span>{summary.kd}</span></div>
        <div><span>경기 당 데미지</span><span>{summary.avgDamage}</span></div>
        <div><span>승 %</span><span>{summary.winRate}%</span></div>
        <div><span>Top 10%</span><span>{summary.top10Rate ? summary.top10Rate + '%' : '-'}</span></div>
        <div><span>평균등수</span><span>{summary.avgRank ?? '-'}</span></div>
        <div><span>KDA</span><span>{summary.kda ?? '-'}</span></div>
        <div><span>평균 킬</span><span>{summary.avgKill ?? '-'}</span></div>
        <div><span>평균 어시스트</span><span>{summary.avgAssist ?? '-'}</span></div>
      </div>
    </div>
  );
}
