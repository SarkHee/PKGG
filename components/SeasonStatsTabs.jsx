import { useState } from 'react';

export default function SeasonStatsTabs({ seasonStatsBySeason }) {
  const modeGroups = [
    { key: 'solo',  title: '솔로',   accent: 'orange', fpp: ['solo-fpp', 'ranked-solo-fpp'],  tpp: ['solo', 'ranked-solo'] },
    { key: 'duo',   title: '듀오',   accent: 'teal',   fpp: ['duo-fpp',  'ranked-duo-fpp'],   tpp: ['duo',  'ranked-duo'] },
    { key: 'squad', title: '스쿼드', accent: 'purple', fpp: ['squad-fpp','ranked-squad-fpp'], tpp: ['squad','ranked-squad'] },
  ];

  const accentColors = {
    orange: { bar: 'bg-orange-400', bg: 'bg-orange-50', text: 'text-orange-700', activeFpp: 'bg-blue-600 text-white', activeTpp: 'bg-orange-500 text-white', tab: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
    teal:   { bar: 'bg-teal-400',   bg: 'bg-teal-50',   text: 'text-teal-700',   activeFpp: 'bg-blue-600 text-white', activeTpp: 'bg-teal-500 text-white',   tab: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
    purple: { bar: 'bg-purple-400', bg: 'bg-purple-50', text: 'text-purple-700', activeFpp: 'bg-blue-600 text-white', activeTpp: 'bg-purple-500 text-white', tab: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
  };

  if (!seasonStatsBySeason || Object.keys(seasonStatsBySeason).length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-400 text-sm">
        통계 데이터가 없습니다.
      </div>
    );
  }

  const seasonList = Object.keys(seasonStatsBySeason).sort().reverse();
  const allModeStats = {};
  const availableModesInData = new Set();
  seasonList.forEach((season) => {
    if (seasonStatsBySeason[season]) {
      Object.keys(seasonStatsBySeason[season]).forEach((mode) => availableModesInData.add(mode));
    }
  });

  [...new Set([...modeGroups.flatMap((g) => [...g.fpp, ...g.tpp]), ...availableModesInData])].forEach((mode) => {
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

  function ModeCard({ group }) {
    const colors = accentColors[group.accent];
    const hasFpp = group.fpp.some((m) => allModeStats[m]);
    const hasTpp = group.tpp.some((m) => allModeStats[m]);
    const [perspective, setPerspective] = useState(hasFpp ? 'fpp' : 'tpp');

    if (!hasFpp && !hasTpp) {
      return (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className={`px-5 py-4 ${colors.bg} border-b border-gray-200 flex items-center gap-3`}>
            <div className={`w-1 h-5 ${colors.bar} rounded-full flex-shrink-0`}></div>
            <span className={`text-sm font-black ${colors.text}`}>{group.title}</span>
            <span className="ml-auto text-xs text-gray-400">0 게임</span>
          </div>
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <div className="text-3xl mb-2">🎮</div>
            <div className="text-sm font-medium text-gray-500">플레이 기록 없음</div>
          </div>
        </div>
      );
    }

    const activeModes = perspective === 'fpp' ? group.fpp : group.tpp;
    const primaryMode = activeModes.find((m) => allModeStats[m]) || '';
    const stats = allModeStats[primaryMode] || {};
    const rankedMode = activeModes.find((m) => m.startsWith('ranked') && allModeStats[m]);
    const rankedStats = rankedMode ? allModeStats[rankedMode] : null;
    const normalGames = (primaryMode && !primaryMode.startsWith('ranked'))
      ? (stats?.rounds ?? 0)
      : 0;
    const rankedGames = rankedStats?.rounds ?? 0;
    const totalGames = normalGames + rankedGames;

    const kd = stats?.kd ?? '0.00';
    const avgDmg = stats?.avgDamage ?? 0;
    const winRate = stats?.winRate != null ? `${stats.winRate}%` : '0%';
    const top10Rate = stats?.top10Rate != null ? `${stats.top10Rate}%` : '0%';
    const headshotRate = stats?.headshotRate != null ? `${stats.headshotRate}%` : '0%';
    const longestKill = `${stats?.longestKill ?? 0}m`;
    const totalKills = stats?.totalKills ?? 0;
    const maxKills = stats?.maxKills ?? 0;
    const avgSurvival = `${Math.floor((stats?.avgSurvivalTime ?? 0) / 60)}분`;

    return (
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        {/* 헤더 */}
        <div className={`px-5 py-4 ${colors.bg} border-b border-gray-200`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-1 h-5 ${colors.bar} rounded-full flex-shrink-0`}></div>
            <span className={`text-sm font-black ${colors.text}`}>{group.title}</span>
            <span className="ml-auto text-xs text-gray-500 font-medium">{totalGames} 게임</span>
          </div>
          {/* 1인칭/3인칭 탭 */}
          <div className="flex gap-1.5">
            {hasFpp && (
              <button
                onClick={() => setPerspective('fpp')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  perspective === 'fpp' ? colors.activeFpp : colors.tab
                }`}
              >
                1인칭 FPP
                {hasFpp && <span className="ml-1 opacity-70">({group.fpp.filter(m => allModeStats[m]).reduce((s, m) => s + (allModeStats[m]?.rounds ?? 0), 0)})</span>}
              </button>
            )}
            {hasTpp && (
              <button
                onClick={() => setPerspective('tpp')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  perspective === 'tpp' ? colors.activeTpp : colors.tab
                }`}
              >
                3인칭 TPP
                {hasTpp && <span className="ml-1 opacity-70">({group.tpp.filter(m => allModeStats[m]).reduce((s, m) => s + (allModeStats[m]?.rounds ?? 0), 0)})</span>}
              </button>
            )}
          </div>
          {/* 경쟁전 뱃지 */}
          {rankedStats && (
            <div className="mt-2 flex items-center gap-1">
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                경쟁전 {rankedGames}게임 포함
              </span>
            </div>
          )}
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

        {/* 상세 스탯 */}
        <div className="px-5 py-3">
          {renderStatRow('승 %', winRate, true)}
          {renderStatRow('Top 10 %', top10Rate)}
          {renderStatRow('헤드샷 비율', headshotRate)}
          {renderStatRow('총 킬수', `${totalKills}개`)}
          {renderStatRow('최대 킬', `${maxKills}킬`)}
          {renderStatRow('평균 생존시간', avgSurvival)}
          {renderStatRow('최장 킬 거리', longestKill)}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {modeGroups.map((group) => <ModeCard key={group.key} group={group} />)}
    </div>
  );
}
