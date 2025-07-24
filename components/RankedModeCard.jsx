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
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
        <div className="text-center py-4">
          <div className="text-2xl mb-2">❗</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            아직 경쟁전 {modeLabels[mode.mode] || mode.mode} 경기가 없습니다.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="text-center mb-3">
        <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100">
          {modeLabels[mode.mode] || mode.mode}
        </h4>
        <div className="text-sm text-gray-500 dark:text-gray-400 space-x-3">
          <span>{mode.rounds} 게임</span>
          <span>K/D {typeof mode.kd === 'number' ? mode.kd.toFixed(2) : '0.00'}</span>
          <span>평균 딜량 {typeof mode.avgDamage === 'number' ? mode.avgDamage.toFixed(0) : '0'}</span>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">승률</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {typeof mode.winRate === 'number' ? mode.winRate.toFixed(1) : '0.0'}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">평균 생존시간</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {typeof mode.survivalTime === 'number' ? mode.survivalTime.toFixed(0) : '0'}초
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">경기 수</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{mode.rounds}</span>
        </div>
      </div>
    </div>
  );
}
