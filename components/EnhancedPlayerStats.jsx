// 향상된 플레이어 통계 표시 컴포넌트
// /Users/mac/Desktop/PKGG/components/EnhancedPlayerStats.jsx

import { useState } from 'react';

export default function EnhancedPlayerStats({ enhancedStats, player, currentSeason }) {
  const [selectedStatType, setSelectedStatType] = useState('season');

  if (!enhancedStats) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4">향상된 통계</h3>
        <p className="text-gray-500 dark:text-gray-400">통계 데이터를 불러올 수 없습니다.</p>
      </div>
    );
  }

  const { season, ranked, lifetime } = enhancedStats;

  const statTypes = [
    { key: 'season', label: '시즌 통계', data: season, icon: '📊' },
    { key: 'ranked', label: '랭크 통계', data: ranked, icon: '🏆' },
    { key: 'lifetime', label: '라이프타임', data: lifetime, icon: '⏰' }
  ];

  const activeStats = statTypes.find(type => type.key === selectedStatType);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          📈 향상된 통계 분석
        </h3>
        {currentSeason && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            현재 시즌: {currentSeason.id.split('.').pop()}
          </div>
        )}
      </div>

      {/* 통계 타입 선택 탭 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {statTypes.map(type => (
          <button
            key={type.key}
            onClick={() => setSelectedStatType(type.key)}
            disabled={!type.data}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              selectedStatType === type.key
                ? 'bg-blue-500 text-white'
                : type.data
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-blue-800'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span>{type.icon}</span>
            <span>{type.label}</span>
            {!type.data && <span className="text-xs">(N/A)</span>}
          </button>
        ))}
      </div>

      {/* 선택된 통계 표시 */}
      {activeStats?.data ? (
        <div>
          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>{activeStats.icon}</span>
            {activeStats.label}
          </h4>
          
          {selectedStatType === 'season' && <SeasonStatsDisplay stats={season} />}
          {selectedStatType === 'ranked' && <RankedStatsDisplay stats={ranked} />}
          {selectedStatType === 'lifetime' && <LifetimeStatsDisplay stats={lifetime} />}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">😔</div>
          <p className="text-gray-500 dark:text-gray-400">
            {activeStats?.label} 데이터를 사용할 수 없습니다.
          </p>
        </div>
      )}
    </div>
  );
}

// 시즌 통계 표시 컴포넌트
function SeasonStatsDisplay({ stats }) {
  const gameModes = Object.keys(stats.gameModeStats || {});

  if (gameModes.length === 0) {
    return <p className="text-gray-500">시즌 통계가 없습니다.</p>;
  }

  return (
    <div className="space-y-6">
      {/* 매치 정보 */}
      <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
        <h5 className="font-medium mb-2">매치 정보</h5>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">최근 매치: </span>
            <span className="font-medium">{stats.matchCount}개</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">현재 시즌: </span>
            <span className="font-medium">{stats.season.isCurrentSeason ? '진행 중' : '종료'}</span>
          </div>
        </div>
      </div>

      {/* 게임모드별 통계 */}
      <div className="space-y-4">
        <h5 className="font-medium">게임모드별 통계</h5>
        {gameModes.map(mode => {
          const modeStats = stats.gameModeStats[mode];
          return (
            <GameModeStatsCard key={mode} mode={mode} stats={modeStats} />
          );
        })}
      </div>
    </div>
  );
}

// 랭크 통계 표시 컴포넌트
function RankedStatsDisplay({ stats }) {
  const rankedModes = Object.keys(stats.rankedGameModeStats || {});

  if (rankedModes.length === 0) {
    return <p className="text-gray-500">랭크 통계가 없습니다.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          🏆 랭크 통계는 시즌 7부터 제공됩니다.
        </p>
      </div>

      {rankedModes.map(mode => {
        const modeStats = stats.rankedGameModeStats[mode];
        return (
          <RankedModeStatsCard key={mode} mode={mode} stats={modeStats} />
        );
      })}
    </div>
  );
}

// 라이프타임 통계 표시 컴포넌트  
function LifetimeStatsDisplay({ stats }) {
  const gameModes = Object.keys(stats.gameModeStats || {});

  if (gameModes.length === 0) {
    return <p className="text-gray-500">라이프타임 통계가 없습니다.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
        <p className="text-sm text-green-800 dark:text-green-200">
          ⏰ {stats.startingSeason}부터의 누적 통계입니다.
        </p>
      </div>

      {gameModes.map(mode => {
        const modeStats = stats.gameModeStats[mode];
        return (
          <GameModeStatsCard key={mode} mode={mode} stats={modeStats} isLifetime={true} />
        );
      })}
    </div>
  );
}

// 게임모드 통계 카드
function GameModeStatsCard({ mode, stats, isLifetime = false }) {
  const formatNumber = (num) => {
    if (typeof num !== 'number') return 'N/A';
    return num.toLocaleString();
  };

  const formatFloat = (num, decimals = 2) => {
    if (typeof num !== 'number') return 'N/A';
    return num.toFixed(decimals);
  };

  const formatPercent = (num) => {
    if (typeof num !== 'number') return 'N/A';
    return `${(num * 100).toFixed(1)}%`;
  };

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
      <h6 className="font-medium mb-3 text-blue-600 dark:text-blue-400">
        {mode.replace('-', ' ').toUpperCase()}
      </h6>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
        <StatItem label="라운드" value={formatNumber(stats.roundsPlayed)} />
        <StatItem label="승리" value={formatNumber(stats.wins)} />
        <StatItem label="Top 10" value={formatNumber(stats.top10s)} />
        <StatItem label="킬" value={formatNumber(stats.kills)} />
        <StatItem label="데미지" value={formatNumber(stats.damageDealt)} />
        <StatItem label="어시스트" value={formatNumber(stats.assists)} />
        <StatItem label="승률" value={formatPercent(stats.winRatio)} />
        <StatItem label="Top 10률" value={formatPercent(stats.top10Ratio)} />
        <StatItem label="평균 킬" value={formatFloat(stats.kills / (stats.roundsPlayed || 1))} />
        <StatItem label="평균 데미지" value={formatFloat(stats.damageDealt / (stats.roundsPlayed || 1))} />
        <StatItem label="생존 시간" value={`${formatFloat(stats.timeSurvived / 60)}분`} />
        <StatItem label="이동 거리" value={`${formatFloat(stats.rideDistance / 1000)}km`} />
      </div>
    </div>
  );
}

// 랭크 모드 통계 카드
function RankedModeStatsCard({ mode, stats }) {
  return (
    <div className="border border-yellow-200 dark:border-yellow-600 rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20">
      <h6 className="font-medium mb-3 text-yellow-700 dark:text-yellow-300">
        🏆 {mode.replace('-', ' ').toUpperCase()}
      </h6>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <StatItem label="RP" value={stats.currentRankPoint || 'N/A'} />
        <StatItem label="티어" value={stats.currentTier?.tier || 'Unranked'} />
        <StatItem label="서브 티어" value={stats.currentTier?.subTier || 'N/A'} />
        <StatItem label="라운드" value={stats.roundsPlayed || 0} />
        <StatItem label="승리" value={stats.wins || 0} />
        <StatItem label="Top 10" value={stats.top10s || 0} />
        <StatItem label="킬" value={stats.kills || 0} />
        <StatItem label="데미지" value={stats.damageDealt || 0} />
        <StatItem label="최고 랭크" value={stats.bestRankPoint || 'N/A'} />
      </div>
    </div>
  );
}

// 통계 아이템 컴포넌트
function StatItem({ label, value }) {
  return (
    <div>
      <div className="text-gray-600 dark:text-gray-400 text-xs">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
