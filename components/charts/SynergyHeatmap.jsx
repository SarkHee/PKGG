import React from 'react';

/**
 * props: matches (recentMatches), myNickname, clanMembers, playerClan
 * 각 match.teammatesDetail: [{ name, isSelf, ... }]
 * 각 match: { teammatesDetail, damage, win, ... }
 */
export default function SynergyHeatmap({
  matches,
  myNickname,
  clanMembers = [],
  playerClan,
}) {
  const clanMemberNames = new Set(
    clanMembers
      .map((member) =>
        typeof member === 'string'
          ? member.toLowerCase()
          : member.nickname?.toLowerCase()
      )
      .filter(Boolean)
  );

  const synergyMap = {};
  let hasTeammateData = false;

  (matches || []).forEach((match) => {
    if (!Array.isArray(match.teammatesDetail)) return;
    hasTeammateData = true;

    const myRank = match.rank || match.placement || match.winPlace || 0;
    const isWin = match.win === true || match.win === 1 || myRank === 1;

    match.teammatesDetail.forEach((teammate) => {
      if (teammate.name === myNickname) return;

      const isTeammateClanMember = clanMemberNames.has(teammate.name.toLowerCase());
      if (!isTeammateClanMember) return;

      if (!synergyMap[teammate.name]) {
        synergyMap[teammate.name] = {
          games: 0,
          totalDamage: 0,
          totalWins: 0,
          totalRank: 0,
          rankCount: 0,
        };
      }
      synergyMap[teammate.name].games += 1;
      synergyMap[teammate.name].totalDamage += match.damage ?? 0;
      synergyMap[teammate.name].totalWins += isWin ? 1 : 0;

      if (myRank > 0) {
        synergyMap[teammate.name].totalRank += myRank;
        synergyMap[teammate.name].rankCount += 1;
      }
    });
  });

  const synergyArr = Object.entries(synergyMap)
    .map(([name, stat]) => ({
      name,
      games: stat.games,
      avgDamage: stat.games ? stat.totalDamage / stat.games : 0,
      winRate: stat.games ? (stat.totalWins / stat.games) * 100 : 0,
      avgRank: stat.rankCount ? stat.totalRank / stat.rankCount : null,
    }))
    .sort((a, b) => b.winRate - a.winRate);

  const emptyState = (msg) => (
    <div className="text-center text-gray-500 dark:text-gray-400 py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
      {msg}
    </div>
  );

  return (
    <div>
      <div className="font-bold text-base text-blue-600 dark:text-blue-400 mb-4">
        베스트 시너지 클랜원
      </div>

      {!hasTeammateData
        ? emptyState('클랜원 시너지 정보가 없습니다. 실시간 데이터 조회 시 표시됩니다.')
        : !playerClan || clanMemberNames.size === 0
        ? emptyState('클랜에 소속되어 있지 않거나 클랜원 정보가 없습니다.')
        : synergyArr.length === 0
        ? emptyState('최근 경기에서 함께한 클랜원이 없습니다.')
        : (
          <div className="flex flex-col gap-3">
            {synergyArr.slice(0, 4).map((user, index) => (
              <div
                key={user.name}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                {/* 왼쪽: 순위 + 이름 */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base text-gray-900 dark:text-gray-100 truncate">
                        {user.name}
                      </span>
                      {index < 3 && (
                        <span
                          className="text-[11px] font-bold text-white px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: index === 0 ? '#fbbf24' : index === 1 ? '#9ca3af' : '#f97316',
                          }}
                        >
                          BEST {index + 1}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">함께한 경기 {user.games}회</div>
                  </div>
                </div>

                {/* 오른쪽: 스탯 3개 */}
                <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-6">
                  <div className="text-center">
                    <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">승률</div>
                    <div className={`text-base font-bold ${user.winRate >= 50 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {user.winRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">평균 딜량</div>
                    <div className="text-base font-bold text-gray-800 dark:text-gray-100">
                      {user.avgDamage.toFixed(0)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">평균 등수</div>
                    <div className="text-base font-bold text-gray-800 dark:text-gray-100">
                      {user.avgRank !== null ? user.avgRank.toFixed(1) : '-'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }

      <div className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
        승률이 높은 순으로 정렬되며, 상위 3명에게는 BEST 뱃지가 표시됩니다.
      </div>
    </div>
  );
}
