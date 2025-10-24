import React from 'react';

const modeLabels = {
  'squad-fpp': '스쿼드 FPP',
  squad: '스쿼드',
  'duo-fpp': '듀오 FPP',
  'solo-fpp': '솔로 FPP',
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
          <span>
            K/D {typeof mode.kd === 'number' ? mode.kd.toFixed(1) : '0.0'}
          </span>
          <span>
            평균 딜량{' '}
            {typeof mode.avgDamage === 'number'
              ? mode.avgDamage.toFixed(0)
              : '0'}
          </span>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>현재 티어: {mode.currentTier || 'Unranked'}</span>
          {mode.currentTier && mode.subTier && (
            <span> ({mode.subTier}단계)</span>
          )}
        </div>
      </div>

      {/* 주요 통계 */}
      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">현재 RP</span>
          <span className="font-medium text-yellow-600 dark:text-yellow-400">
            {typeof mode.currentRankPoint === 'number'
              ? mode.currentRankPoint.toLocaleString()
              : '0'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">승률</span>
          <span className="font-medium text-green-600 dark:text-green-400">
            {typeof mode.winRate === 'number' ? mode.winRate.toFixed(1) : '0.0'}
            %
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">헤드샷 킬수</span>
          <span className="font-medium text-red-600 dark:text-red-400">
            {typeof mode.headshotKills === 'number'
              ? mode.headshotKills.toLocaleString()
              : '0'}
            개
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">헤드샷 비율</span>
          <span className="font-medium text-red-600 dark:text-red-400">
            {typeof mode.headshotRate === 'number'
              ? mode.headshotRate.toFixed(1)
              : typeof mode.headshotKills === 'number' &&
                  typeof mode.kills === 'number' &&
                  mode.kills > 0
                ? ((mode.headshotKills / mode.kills) * 100).toFixed(1)
                : '0.0'}
            %
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">KDA</span>
          <span className="font-medium text-blue-600 dark:text-blue-400">
            {typeof mode.kda === 'number' ? mode.kda.toFixed(1) : '0.0'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">평균 등수</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {typeof mode.avgRank === 'number' ? mode.avgRank.toFixed(1) : '0.0'}
          </span>
        </div>
      </div>

      {/* 기본 통계 */}
      <div className="space-y-2 text-sm mb-4 pt-3 border-t border-gray-200 dark:border-gray-600">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">킬 수</span>
          <span className="font-medium text-red-600 dark:text-red-400">
            {typeof mode.kills === 'number' ? mode.kills.toLocaleString() : '0'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">데스 수</span>
          <span className="font-medium text-gray-600 dark:text-gray-400">
            {typeof mode.deaths === 'number'
              ? mode.deaths.toLocaleString()
              : '0'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">어시스트</span>
          <span className="font-medium text-blue-600 dark:text-blue-400">
            {typeof mode.assists === 'number'
              ? mode.assists.toLocaleString()
              : '0'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">승리 수</span>
          <span className="font-medium text-green-600 dark:text-green-400">
            {typeof mode.wins === 'number' ? mode.wins.toLocaleString() : '0'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">총 딜량</span>
          <span className="font-medium text-orange-600 dark:text-orange-400">
            {typeof mode.damageDealt === 'number'
              ? mode.damageDealt.toLocaleString()
              : '0'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">
            플레이한 라운드
          </span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {typeof mode.roundsPlayed === 'number'
              ? mode.roundsPlayed.toLocaleString()
              : '0'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Top 10 비율</span>
          <span className="font-medium text-yellow-600 dark:text-yellow-400">
            {typeof mode.top10Ratio === 'number'
              ? (mode.top10Ratio * 100).toFixed(1) + '%'
              : '0.0%'}
          </span>
        </div>
      </div>
      {/* 추가 통계 */}
      <div className="space-y-2 text-sm pt-3 border-t border-gray-200 dark:border-gray-600">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">최고 티어</span>
          <span className="font-medium text-yellow-600 dark:text-yellow-400">
            {mode.bestTier || 'Unranked'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">최고 RP</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {typeof mode.bestRankPoint === 'number'
              ? mode.bestRankPoint.toLocaleString()
              : '0'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">
            한 라운드 최다 킬
          </span>
          <span className="font-medium text-purple-600 dark:text-purple-400">
            {typeof mode.roundMostKills === 'number'
              ? mode.roundMostKills
              : '0'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">기절시킨 수</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {typeof mode.dBNOs === 'number' ? mode.dBNOs : '0'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">최장 킬 거리</span>
          <span className="font-medium text-blue-600 dark:text-blue-400">
            {typeof mode.longestKill === 'number'
              ? mode.longestKill.toFixed(0)
              : '0'}
            m
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">부활시킨 수</span>
          <span className="font-medium text-green-600 dark:text-green-400">
            {typeof mode.revives === 'number' ? mode.revives : '0'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">힐 사용</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {typeof mode.heals === 'number' ? mode.heals : '0'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">부스터 사용</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {typeof mode.boosts === 'number' ? mode.boosts : '0'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">
            평균 생존시간
          </span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {typeof mode.survivalTime === 'number'
              ? mode.survivalTime.toFixed(0)
              : '0'}
            초
          </span>
        </div>
      </div>
    </div>
  );
}
