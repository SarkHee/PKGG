import { useState } from 'react';

/**
 * 게임 모드별 통계 카드 컴포넌트
 */
export default function SeasonStatsTabs({ seasonStatsBySeason }) {
  const modeGroups = [
    {
      key: 'solo',
      title: '솔로',
      accent: 'orange',
      modes: ['solo-fpp', 'solo', 'ranked-solo-fpp', 'ranked-solo'],
    },
    {
      key: 'duo',
      title: '듀오',
      accent: 'teal',
      modes: ['duo-fpp', 'duo', 'ranked-duo-fpp', 'ranked-duo'],
    },
    {
      key: 'squad',
      title: '스쿼드',
      accent: 'purple',
      modes: [
        'squad-fpp',
        'squad',
        'ranked-squad-fpp',
        'ranked-squad',
        'normal-squad-fpp',
        'normal-squad',
      ],
    },
  ];

  const accentColors = {
    orange: { bar: 'bg-orange-400', bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-600 border-orange-200', dot: 'bg-orange-400' },
    teal:   { bar: 'bg-teal-400',   bg: 'bg-teal-50',   text: 'text-teal-700',   badge: 'bg-teal-100 text-teal-600 border-teal-200',   dot: 'bg-teal-400'   },
    purple: { bar: 'bg-purple-400', bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-600 border-purple-200', dot: 'bg-purple-400' },
  };

  const modeDisplayNames = {
    'solo-fpp': 'FPP', solo: 'TPP',
    'duo-fpp': 'FPP', duo: 'TPP',
    'squad-fpp': 'FPP', squad: 'TPP',
    'ranked-solo-fpp': 'RANKED FPP', 'ranked-solo': 'RANKED TPP',
    'ranked-duo-fpp': 'RANKED FPP', 'ranked-duo': 'RANKED TPP',
    'ranked-squad-fpp': 'RANKED FPP', 'ranked-squad': 'RANKED TPP',
    'normal-squad-fpp': 'NORMAL FPP', 'normal-squad': 'NORMAL TPP',
  };

  if (!seasonStatsBySeason || Object.keys(seasonStatsBySeason).length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-400 text-sm">
        통계 데이터가 없습니다.
      </div>
    );
  }

  const seasonList = Object.keys(seasonStatsBySeason).sort().reverse();
  const availableModesInData = new Set();
  seasonList.forEach((season) => {
    if (seasonStatsBySeason[season]) {
      Object.keys(seasonStatsBySeason[season]).forEach((mode) => availableModesInData.add(mode));
    }
  });

  // 동적 모드 추가
  availableModesInData.forEach((mode) => {
    if (mode.includes('solo')) {
      const g = modeGroups.find((g) => g.key === 'solo');
      if (g && !g.modes.includes(mode)) g.modes.push(mode);
    } else if (mode.includes('duo')) {
      const g = modeGroups.find((g) => g.key === 'duo');
      if (g && !g.modes.includes(mode)) g.modes.push(mode);
    } else if (mode.includes('squad')) {
      const g = modeGroups.find((g) => g.key === 'squad');
      if (g && !g.modes.includes(mode)) g.modes.push(mode);
    }
  });

  const allModeStats = {};
  [...new Set([...modeGroups.flatMap((g) => g.modes), ...availableModesInData])].forEach((mode) => {
    for (const season of seasonList) {
      if (seasonStatsBySeason[season]?.[mode]) {
        allModeStats[mode] = seasonStatsBySeason[season][mode];
        break;
      }
    }
  });

  const renderStatRow = (label, value, highlight = false) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-semibold ${highlight ? 'text-blue-600' : 'text-gray-800'}`}>{value}</span>
    </div>
  );

  const renderModeCard = (group) => {
    const colors = accentColors[group.accent];
    const availableModes = group.modes.filter((mode) => allModeStats[mode]);

    if (availableModes.length === 0) {
      return (
        <div key={group.key} className="rounded-xl border border-gray-200 overflow-hidden">
          <div className={`px-5 py-4 ${colors.bg} border-b border-gray-200 flex items-center gap-3`}>
            <div className={`w-1 h-5 ${colors.bar} rounded-full flex-shrink-0`}></div>
            <span className={`text-sm font-black ${colors.text}`}>{group.title}</span>
            <span className="ml-auto text-xs text-gray-400">0 게임</span>
          </div>
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <div className="text-3xl mb-2">🎮</div>
            <div className="text-sm font-medium text-gray-500 mb-1">플레이 기록 없음</div>
            <div className="text-xs text-gray-400">{group.title} 모드를 플레이해보세요!</div>
          </div>
        </div>
      );
    }

    const primaryMode = availableModes.find((mode) => mode.includes('fpp')) || availableModes[0];
    const stats = allModeStats[primaryMode];
    const totalGames = availableModes.reduce((sum, m) => sum + (allModeStats[m]?.rounds ?? allModeStats[m]?.roundsPlayed ?? 0), 0);

    const kd = stats?.kd ?? stats?.kda ?? '0.00';
    const avgDmg = (stats?.avgDamage ?? stats?.damageDealt ?? 0);
    const winRate = stats?.winRate ? `${stats.winRate}%` : stats?.winRatio ? `${(stats.winRatio * 100).toFixed(1)}%` : '0.0%';
    const top10Rate = stats?.top10Rate ? `${stats.top10Rate}%` : stats?.top10Ratio ? `${(stats.top10Ratio * 100).toFixed(1)}%` : '0.0%';
    const headshotRate = stats?.headshotRate
      ? `${stats.headshotRate}%`
      : stats?.headshotKillRatio
        ? `${(parseFloat(stats.headshotKillRatio) > 1 ? parseFloat(stats.headshotKillRatio) : parseFloat(stats.headshotKillRatio) * 100).toFixed(1)}%`
        : stats?.headshotKills && stats?.kills
          ? `${((stats.headshotKills / stats.kills) * 100).toFixed(1)}%`
          : '0.0%';
    const longestKill = stats?.longestKill ? `${stats.longestKill}m` : stats?.maxDistanceKill ? `${stats.maxDistanceKill}m` : '0m';
    const totalKills = stats?.kills ?? stats?.totalKills ?? 0;
    const maxKills = stats?.maxKills ?? stats?.mostKills ?? 0;
    const avgRank = stats?.avgRank ?? stats?.averageRank ?? '-';
    const avgSurvival = stats?.avgSurvivalTime
      ? `${Math.floor(stats.avgSurvivalTime / 60)}분`
      : stats?.timeSurvived
        ? `${Math.floor(stats.timeSurvived / 60000)}분`
        : '0분';

    return (
      <div key={group.key} className="rounded-xl border border-gray-200 overflow-hidden">
        {/* 헤더 */}
        <div className={`px-5 py-4 ${colors.bg} border-b border-gray-200`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-1 h-5 ${colors.bar} rounded-full flex-shrink-0`}></div>
            <span className={`text-sm font-black ${colors.text}`}>{group.title}</span>
            <span className="ml-auto text-xs text-gray-500 font-medium">{totalGames} 게임</span>
          </div>
          {/* 서브 모드 뱃지 */}
          <div className="flex flex-wrap gap-1.5 pl-4">
            {availableModes.map((mode) => (
              <span key={mode} className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors.badge}`}>
                {modeDisplayNames[mode]} {allModeStats[mode]?.rounds ?? allModeStats[mode]?.roundsPlayed ?? 0}
              </span>
            ))}
          </div>
        </div>

        {/* 핵심 지표 */}
        <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
          <div className="flex flex-col items-center py-4">
            <div className="text-2xl font-black text-gray-900">{typeof avgDmg === 'number' ? avgDmg.toFixed(1) : avgDmg}</div>
            <div className="text-xs text-gray-400 mt-0.5">평균 딜량</div>
          </div>
          <div className="flex flex-col items-center py-4">
            <div className="text-2xl font-black text-gray-900">{kd}</div>
            <div className="text-xs text-gray-400 mt-0.5">K/D</div>
          </div>
        </div>

        {/* 상세 스탯 목록 */}
        <div className="px-5 py-3">
          {renderStatRow('승 %', winRate, true)}
          {renderStatRow('Top 10 %', top10Rate)}
          {renderStatRow('헤드샷 비율', headshotRate)}
          {renderStatRow('총 킬수', `${totalKills}개`)}
          {renderStatRow('최대 킬', `${maxKills}킬`)}
          {renderStatRow('평균 등수', `#${avgRank}`)}
          {renderStatRow('평균 생존시간', avgSurvival)}
          {renderStatRow('최장 킬 거리', longestKill)}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {modeGroups.map((group) => renderModeCard(group))}
    </div>
  );
}
