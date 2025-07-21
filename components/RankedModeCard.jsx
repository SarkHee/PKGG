import React from "react";

const modeLabels = {
  "squad-fpp": "스쿼드 FPP",
  "squad": "스쿼드",
  "duo-fpp": "듀오 FPP",
  "solo-fpp": "솔로 FPP",
};

export default function RankedModeCard({ mode }) {
  if (!mode.rounds || mode.rounds === 0) {
    return (
      <div>
        <div>❗</div>
        <div>아직 경쟁전 {modeLabels[mode.mode] || mode.mode} 경기가 없습니다.</div>
      </div>
    );
  }
  return (
    <div>
      <div>{modeLabels[mode.mode] || mode.mode}</div>
      <div>
        <span>{mode.rounds} 게임</span>
        <span>K/D {mode.kd}</span>
        <span>경기 당 데미지 {mode.avgDamage}</span>
      </div>
      <div>
        <div><span>승 %</span><span>{mode.winRate}%</span></div>
        <div><span>평균 생존시간</span><span>{mode.survivalTime}</span></div>
        <div><span>경기 수</span><span>{mode.rounds}</span></div>
      </div>
    </div>
  );
}
