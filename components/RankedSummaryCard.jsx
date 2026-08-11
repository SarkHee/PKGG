import React from 'react';

const modeLabels = {
  'squad-fpp': '스쿼드 FPP',
  squad: '스쿼드',
  'duo-fpp': '듀오 FPP',
  duo: '듀오',
  'solo-fpp': '솔로 FPP',
  solo: '솔로',
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
              {summary.currentTier || summary.tier}{' '}
              {summary.subTier && summary.subTier > 0
                ? summary.subTier + '단계'
                : ''}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {summary.rp.toLocaleString()}{' '}
            <span className="text-sm font-normal text-gray-500">RP</span>
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
            style={{ width: `${Math.min(100, (summary.rp / 3000) * 100)}%` }}
          />
        </div>
      </div>

      {/* 주요 통계 그리드 */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-sm">
        <div className="text-center">
          <div className="text-gray-600 dark:text-gray-400 text-xs">K/D</div>
          <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
            {typeof summary.kd === 'number' ? summary.kd.toFixed(1) : '0.0'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-600 dark:text-gray-400 text-xs">KDA</div>
          <div className="font-bold text-lg text-blue-600 dark:text-blue-400">
            {typeof summary.kda === 'number' ? summary.kda.toFixed(1) : '0.0'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-600 dark:text-gray-400 text-xs">
            평균 딜량
          </div>
          <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
            {typeof summary.avgDamage === 'number'
              ? summary.avgDamage.toFixed(0)
              : '0'}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-600 dark:text-gray-400 text-xs">승률</div>
          <div className="font-bold text-lg text-green-600 dark:text-green-400">
            {typeof summary.winRate === 'number'
              ? summary.winRate.toFixed(1)
              : '0.0'}
            %
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-600 dark:text-gray-400 text-xs">
            헤드샷 비율
          </div>
          <div className="font-bold text-lg text-red-600 dark:text-red-400">
            {typeof summary.headshotRate === 'number'
              ? summary.headshotRate.toFixed(1)
              : '0.0'}
            %
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-600 dark:text-gray-400 text-xs">
            Top 10%
          </div>
          <div className="font-bold text-lg text-yellow-600 dark:text-yellow-400">
            {typeof summary.top10Ratio === 'number'
              ? (summary.top10Ratio * 100).toFixed(1) + '%'
              : summary.top10Rate
                ? summary.top10Rate.toFixed(1) + '%'
                : '-'}
          </div>
        </div>
      </div>

      {/* 기본 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 pt-4 border-t border-yellow-200 dark:border-yellow-700 text-xs">
        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400">킬 수</span>
          <div className="font-medium text-red-600 dark:text-red-400">
            {typeof summary.kills === 'number'
              ? summary.kills.toLocaleString()
              : '-'}
          </div>
        </div>
        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400">데스 수</span>
          <div className="font-medium text-gray-600 dark:text-gray-400">
            {typeof summary.deaths === 'number'
              ? summary.deaths.toLocaleString()
              : '-'}
          </div>
        </div>
        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400">어시스트</span>
          <div className="font-medium text-blue-600 dark:text-blue-400">
            {typeof summary.assists === 'number'
              ? summary.assists.toLocaleString()
              : '-'}
          </div>
        </div>
        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400">승리 수</span>
          <div className="font-medium text-green-600 dark:text-green-400">
            {typeof summary.wins === 'number'
              ? summary.wins.toLocaleString()
              : '-'}
          </div>
        </div>
        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400">평균 등수</span>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {typeof summary.avgRank === 'number'
              ? summary.avgRank.toFixed(1)
              : '-'}
          </div>
        </div>
      </div>

      {/* 상세 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-xs">
        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400">헤드샷 킬</span>
          <div className="font-medium text-red-600 dark:text-red-400">
            {typeof summary.headshotKills === 'number'
              ? summary.headshotKills.toLocaleString()
              : '-'}
          </div>
        </div>
        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400">총 딜량</span>
          <div className="font-medium text-orange-600 dark:text-orange-400">
            {typeof summary.damageDealt === 'number'
              ? summary.damageDealt.toLocaleString()
              : '-'}
          </div>
        </div>
        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400">
            플레이한 라운드
          </span>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {typeof summary.roundsPlayed === 'number'
              ? summary.roundsPlayed.toLocaleString()
              : '-'}
          </div>
        </div>
        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400">현재 RP</span>
          <div className="font-medium text-yellow-600 dark:text-yellow-400">
            {typeof summary.currentRankPoint === 'number'
              ? summary.currentRankPoint.toLocaleString()
              : '-'}
          </div>
        </div>
      </div>

      {/* 추가 통계 (접을 수 있는 형태) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-yellow-200 dark:border-yellow-700 text-xs">
        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400">최고 티어</span>
          <div className="font-medium text-yellow-600 dark:text-yellow-400">
            {summary.bestTier || '-'}
          </div>
        </div>
        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400">최고 RP</span>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {typeof summary.bestRankPoint === 'number'
              ? summary.bestRankPoint.toLocaleString()
              : '-'}
          </div>
        </div>
        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400">
            한 라운드 최다 킬
          </span>
          <div className="font-medium text-purple-600 dark:text-purple-400">
            {typeof summary.roundMostKills === 'number'
              ? summary.roundMostKills
              : '-'}
          </div>
        </div>
        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400">기절시킨 수</span>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {typeof summary.dBNOs === 'number' ? summary.dBNOs : '-'}
          </div>
        </div>
      </div>

      {/* 추가 통계 두 번째 줄 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-xs">
        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400">최장 킬 거리</span>
          <div className="font-medium text-blue-600 dark:text-blue-400">
            {typeof summary.longestKill === 'number'
              ? summary.longestKill.toFixed(0) + 'm'
              : '-'}
          </div>
        </div>
        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400">부활시킨 수</span>
          <div className="font-medium text-green-600 dark:text-green-400">
            {typeof summary.revives === 'number' ? summary.revives : '-'}
          </div>
        </div>
        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400">힐 사용</span>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {typeof summary.heals === 'number' ? summary.heals : '-'}
          </div>
        </div>
        <div className="text-center">
          <span className="text-gray-600 dark:text-gray-400">부스터 사용</span>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {typeof summary.boosts === 'number' ? summary.boosts : '-'}
          </div>
        </div>
      </div>
    </div>
  );
}
