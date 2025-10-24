import React, { useState } from 'react';

/**
 * 게임 모드별 통계 카드 컴포넌트
 * @param {Object} props
 * @param {Object} props.seasonStatsBySeason - { 시즌명: { 모드명: { ...스탯 } } } 형태의 시즌별 통계 객체
 */
export default function SeasonStatsTabs({ seasonStatsBySeason }) {
  // 모드 그룹 정의 (FPP/TPP 통합 + 추가 모드 패턴)
  const modeGroups = [
    {
      key: 'solo',
      title: '솔로',
      color: 'from-orange-400 to-orange-500',
      modes: ['solo-fpp', 'solo', 'ranked-solo-fpp', 'ranked-solo'],
    },
    {
      key: 'duo',
      title: '듀오',
      color: 'from-teal-400 to-teal-600',
      modes: ['duo-fpp', 'duo', 'ranked-duo-fpp', 'ranked-duo'],
    },
    {
      key: 'squad',
      title: '스쿼드',
      color: 'from-purple-400 to-purple-600',
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

  const modeDisplayNames = {
    'solo-fpp': 'FPP',
    solo: 'TPP',
    'duo-fpp': 'FPP',
    duo: 'TPP',
    'squad-fpp': 'FPP',
    squad: 'TPP',
    'ranked-solo-fpp': 'RANKED FPP',
    'ranked-solo': 'RANKED TPP',
    'ranked-duo-fpp': 'RANKED FPP',
    'ranked-duo': 'RANKED TPP',
    'ranked-squad-fpp': 'RANKED FPP',
    'ranked-squad': 'RANKED TPP',
    'normal-squad-fpp': 'NORMAL FPP',
    'normal-squad': 'NORMAL TPP',
  };

  if (!seasonStatsBySeason || Object.keys(seasonStatsBySeason).length === 0) {
    return (
      <div className="text-gray-500 dark:text-gray-400">
        통계 데이터가 없습니다.
      </div>
    );
  }

  // 모든 시즌의 모드 데이터를 하나로 합치기 (최신 시즌 우선)
  const allModeStats = {};
  const seasonList = Object.keys(seasonStatsBySeason).sort().reverse();

  // 실제 데이터에서 사용 가능한 모든 모드 수집
  const availableModesInData = new Set();
  seasonList.forEach((season) => {
    if (seasonStatsBySeason[season]) {
      Object.keys(seasonStatsBySeason[season]).forEach((mode) => {
        availableModesInData.add(mode);
      });
    }
  });

  console.log('Available modes in data:', Array.from(availableModesInData));

  // 모든 모드에 대해 데이터가 있는 시즌에서 가져오기 (정의된 모드 + 발견된 모드)
  const allPossibleModes = new Set();
  modeGroups.forEach((group) => {
    group.modes.forEach((mode) => allPossibleModes.add(mode));
  });

  // 데이터에서 찾은 모드 중 각 그룹에 해당하는 모드도 추가
  availableModesInData.forEach((mode) => {
    if (mode.includes('solo')) {
      const soloGroup = modeGroups.find((g) => g.key === 'solo');
      if (soloGroup && !soloGroup.modes.includes(mode)) {
        soloGroup.modes.push(mode);
      }
    } else if (mode.includes('duo')) {
      const duoGroup = modeGroups.find((g) => g.key === 'duo');
      if (duoGroup && !duoGroup.modes.includes(mode)) {
        duoGroup.modes.push(mode);
      }
    } else if (mode.includes('squad')) {
      const squadGroup = modeGroups.find((g) => g.key === 'squad');
      if (squadGroup && !squadGroup.modes.includes(mode)) {
        squadGroup.modes.push(mode);
      }
    }
  });

  // 모든 가능한 모드에 대해 데이터 수집
  [...allPossibleModes, ...availableModesInData].forEach((mode) => {
    for (const season of seasonList) {
      if (seasonStatsBySeason[season] && seasonStatsBySeason[season][mode]) {
        allModeStats[mode] = seasonStatsBySeason[season][mode];
        break;
      }
    }
  });

  console.log('SeasonStatsTabs - seasonStatsBySeason:', seasonStatsBySeason);
  console.log('SeasonStatsTabs - allModeStats:', allModeStats);

  // 각 모드별 상세 데이터 로깅
  modeGroups.forEach((group) => {
    const availableModes = group.modes.filter((mode) => allModeStats[mode]);
    console.log(`Mode Group ${group.title}:`, {
      groupKey: group.key,
      possibleModes: group.modes,
      availableModes: availableModes,
      data: availableModes.map((mode) => ({ mode, stats: allModeStats[mode] })),
    });
  });

  // 각 모드 그룹별로 통계 카드 렌더링
  const renderModeCard = (group) => {
    // 해당 그룹에서 데이터가 있는 모드들 찾기
    const availableModes = group.modes.filter((mode) => allModeStats[mode]);

    if (availableModes.length === 0) {
      // 플레이 데이터가 없는 경우
      return (
        <div
          key={group.key}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden"
        >
          {/* 헤더 */}
          <div className={`bg-gradient-to-r ${group.color} text-white p-4`}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{group.title}</h3>
              <div className="text-sm opacity-90">0 게임</div>
            </div>
          </div>

          {/* 내용 */}
          <div className="p-6">
            <div className="text-center py-8">
              <div className="text-4xl mb-4">⚠️</div>
              <div className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                아직 출력 경기가 없습니다.
              </div>
              <div className="text-sm text-gray-400 dark:text-gray-500">
                {group.title} 모드를 플레이해보세요!
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 주요 통계를 위해 첫 번째 사용 가능한 모드 선택 (FPP 우선)
    const primaryMode =
      availableModes.find((mode) => mode.includes('fpp')) || availableModes[0];
    const stats = allModeStats[primaryMode];

    return (
      <div
        key={group.key}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden"
      >
        {/* 헤더 */}
        <div className={`bg-gradient-to-r ${group.color} text-white p-4`}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">{group.title}</h3>
            <div className="text-sm opacity-90">
              {stats?.rounds ?? stats?.roundsPlayed ?? 0} 게임
            </div>
          </div>

          {/* 서브 모드 표시 */}
          <div className="flex gap-2 mt-2">
            {availableModes.map((mode) => (
              <span
                key={mode}
                className="px-2 py-1 bg-white/20 rounded-md text-xs font-medium"
              >
                {modeDisplayNames[mode]}{' '}
                {allModeStats[mode]?.rounds ??
                  allModeStats[mode]?.roundsPlayed ??
                  0}
              </span>
            ))}
          </div>
        </div>

        {/* 메인 통계 */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats?.kd ?? stats?.kda ?? '0.00'}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                K/D
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {(stats?.avgDamage ?? stats?.damageDealt ?? 0).toFixed(1)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                경기 당 데미지
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="flex justify-between text-sm">
                <span>승 %</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {stats?.winRate
                    ? `${stats.winRate}%`
                    : stats?.winRatio
                      ? `${(stats.winRatio * 100).toFixed(1)}%`
                      : '0.0%'}
                </span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>Top 10%</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {stats?.top10Rate
                    ? `${stats.top10Rate}%`
                    : stats?.top10Ratio
                      ? `${(stats.top10Ratio * 100).toFixed(1)}%`
                      : '0.0%'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="flex justify-between text-sm">
                <span>최대 거리 킬</span>
                <span className="font-medium">
                  {stats?.longestKill
                    ? `${stats.longestKill}m`
                    : stats?.maxDistanceKill
                      ? `${stats.maxDistanceKill}m`
                      : '0.0m'}
                </span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>헤드샷 킬</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {stats?.headshotKills ?? stats?.headshots ?? '0'}개
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="flex justify-between text-sm">
                <span>헤드샷 비율</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {stats?.headshotRate
                    ? `${stats.headshotRate}%`
                    : stats?.headshotKillRatio
                      ? (() => {
                          const ratio = parseFloat(stats.headshotKillRatio);
                          return `${(ratio > 1 ? ratio : ratio * 100).toFixed(1)}%`;
                        })()
                      : stats?.headshotKills && stats?.kills
                        ? `${((stats.headshotKills / stats.kills) * 100).toFixed(1)}%`
                        : '0.0%'}
                </span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>총 킬수</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">
                  {stats?.kills ?? stats?.totalKills ?? '0'}개
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-sm">
                <span>평균등수</span>
                <span className="font-medium">
                  #{stats?.avgRank ?? stats?.averageRank ?? '0.0'}
                </span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>평균 생존시간</span>
                <span className="font-medium">
                  {stats?.avgSurvivalTime
                    ? `${Math.floor(stats.avgSurvivalTime)}초`
                    : stats?.timeSurvived
                      ? `${Math.floor(stats.timeSurvived / 1000)}초`
                      : '0초'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <div className="flex justify-between text-sm">
                <span>KDA</span>
                <span className="font-medium">
                  {stats?.kda ??
                    ((stats?.kd || 0) + (stats?.avgAssists || 0)).toFixed(1)}
                </span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>최대 킬</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {stats?.maxKills ?? stats?.mostKills ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="season-stats-tabs">
      {/* 모드별 카드 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {modeGroups.map((group) => renderModeCard(group))}
      </div>
    </div>
  );
}
