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
  // 클랜원 닉네임 목록 생성 (소문자로 변환해서 비교용)
  const clanMemberNames = new Set(
    clanMembers
      .map((member) =>
        typeof member === 'string'
          ? member.toLowerCase()
          : member.nickname?.toLowerCase()
      )
      .filter(Boolean)
  );

  // 유저별 집계 (클랜원만)
  const synergyMap = {};
  let hasTeammateData = false;

  (matches || []).forEach((match) => {
    if (!Array.isArray(match.teammatesDetail)) return;
    hasTeammateData = true;

    // 승리 여부 판단 (win 플래그 또는 rank/placement가 1이면 승리)
    const myRank = match.rank || match.placement || match.winPlace || 0;
    const isWin = match.win === true || match.win === 1 || myRank === 1;

    match.teammatesDetail.forEach((teammate) => {
      if (teammate.name === myNickname) return;

      // 클랜원인지 확인
      const isTeammateClanMember = clanMemberNames.has(
        teammate.name.toLowerCase()
      );
      if (!isTeammateClanMember) return; // 클랜원이 아니면 스킵

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
      // 파티 시 나의 딜량 (match.damage = 내 딜량)
      synergyMap[teammate.name].totalDamage += match.damage ?? 0;
      synergyMap[teammate.name].totalWins += isWin ? 1 : 0;

      // 순위 정보가 있으면 평균 등수 계산용으로 사용
      if (myRank > 0) {
        synergyMap[teammate.name].totalRank += myRank;
        synergyMap[teammate.name].rankCount += 1;
      }
    });
  });

  // 유저별 평균 계산
  const synergyArr = Object.entries(synergyMap)
    .map(([name, stat]) => ({
      name,
      games: stat.games,
      avgDamage: stat.games ? stat.totalDamage / stat.games : 0,
      winRate: stat.games ? (stat.totalWins / stat.games) * 100 : 0,
      avgRank: stat.rankCount ? stat.totalRank / stat.rankCount : null,
    }))
    .sort((a, b) => b.winRate - a.winRate); // 승률순으로 정렬

  return (
    <div style={{ margin: '0' }}>
      <div
        style={{
          fontWeight: 700,
          fontSize: 16,
          marginBottom: 16,
          color: '#2563eb',
        }}
      >
        베스트 시너지 클랜원
      </div>

      {!hasTeammateData ? (
        <div
          style={{
            textAlign: 'center',
            color: '#888',
            padding: 32,
            background: '#f8f9fa',
            borderRadius: 8,
            border: '1px solid #e9ecef',
          }}
        >
          클랜원 시너지 정보가 없습니다. 실시간 데이터 조회 시 표시됩니다.
        </div>
      ) : !playerClan || clanMemberNames.size === 0 ? (
        <div
          style={{
            textAlign: 'center',
            color: '#888',
            padding: 32,
            background: '#f8f9fa',
            borderRadius: 8,
            border: '1px solid #e9ecef',
          }}
        >
          클랜에 소속되어 있지 않거나 클랜원 정보가 없습니다.
        </div>
      ) : synergyArr.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            color: '#888',
            padding: 32,
            background: '#f8f9fa',
            borderRadius: 8,
            border: '1px solid #e9ecef',
          }}
        >
          최근 경기에서 함께한 클랜원이 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {synergyArr.slice(0, 4).map((user, index) => (
            <div
              key={user.name}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              {/* 왼쪽: 순위 + 이름 */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-base text-gray-900 truncate">
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
                  <div className="text-xs text-gray-500 mt-0.5">함께한 경기 {user.games}회</div>
                </div>
              </div>

              {/* 오른쪽: 스탯 3개 — 모바일은 grid 3열 */}
              <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-6">
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-0.5">승률</div>
                  <div className={`text-base font-bold ${user.winRate >= 50 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {user.winRate.toFixed(1)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-0.5">평균 딜량</div>
                  <div className="text-base font-bold text-gray-800">
                    {user.avgDamage.toFixed(0)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-0.5">평균 등수</div>
                  <div className="text-base font-bold text-gray-800">
                    {user.avgRank !== null ? user.avgRank.toFixed(1) : '-'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          fontSize: 13,
          color: '#888',
          marginTop: 12,
          textAlign: 'center',
        }}
      >
        승률이 높은 순으로 정렬되며, 상위 3명에게는 BEST 뱃지가 표시됩니다.
      </div>
    </div>
  );
}
