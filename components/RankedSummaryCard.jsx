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
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-6 rounded-xl border border-yellow-200 dark:border-yellow-700 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">🏆</span>
          </div>
          <div>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {modeLabels[summary.mode] || summary.mode}
            </span>
            <div className="text-sm text-yellow-700 dark:text-yellow-300 font-semibold">
              {summary.tier}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {summary.rp.toLocaleString()} <span className="text-sm font-normal text-gray-500">RP</span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {summary.games} 게임
          </div>
        </div>
      </div>
      
      {/* RP 진행 바 */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all duration-300"
            style={{width: `${Math.min(100, summary.rp/3000*100)}%`}} 
          />
        </div>
      </div>
      
      {/* 통계 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="text-center">
          <div className="text-gray-600 dark:text-gray-400 text-xs">K/D</div>
          <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
            {typeof summary.kd === 'number' ? summary.kd.toFixed(2) : '0.00'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-600 dark:text-gray-400 text-xs">평균 딜량</div>
          <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
            {typeof summary.avgDamage === 'number' ? summary.avgDamage.toFixed(0) : '0'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-600 dark:text-gray-400 text-xs">승률</div>
          <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
            {typeof summary.winRate === 'number' ? summary.winRate.toFixed(1) : '0.0'}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-600 dark:text-gray-400 text-xs">Top 10%</div>
          <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
            {summary.top10Rate ? summary.top10Rate.toFixed(1) + '%' : '-'}
          </div>
        </div>
      </div>
      
      {/* 추가 통계 (접을 수 있는 형태) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-yellow-200 dark:border-yellow-700 text-xs">
        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400">평균등수</span>
          <div className="font-medium text-gray-900 dark:text-gray-100">{summary.avgRank ?? '-'}</div>
        </div>
        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400">KDA</span>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {typeof summary.kda === 'number' ? summary.kda.toFixed(2) : '-'}
          </div>
        </div>
        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400">평균 킬</span>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {typeof summary.avgKill === 'number' ? summary.avgKill.toFixed(1) : '-'}
          </div>
        </div>
        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400">평균 어시스트</span>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {typeof summary.avgAssist === 'number' ? summary.avgAssist.toFixed(1) : '-'}
          </div>
        </div>
      </div>
    </div>
  );
}
