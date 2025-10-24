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

    // 승리 여부 판단 (rank가 1이면 승리)
    const isWin = match.rank === 1;

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
      synergyMap[teammate.name].totalDamage += teammate.damage ?? 0;
      synergyMap[teammate.name].totalWins += isWin ? 1 : 0;

      // 순위 정보가 있으면 평균 등수 계산용으로 사용
      if (typeof match.rank === 'number' && match.rank > 0) {
        synergyMap[teammate.name].totalRank += match.rank;
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {synergyArr.map((user, index) => (
            <div
              key={user.name}
              style={{
                background: '#ffffff',
                border: '1px solid #e9ecef',
                borderRadius: 8,
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#4f46e5',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: 14,
                    marginRight: 12,
                  }}
                >
                  {index + 1}
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 16,
                        color: '#222',
                        marginRight: 8,
                      }}
                    >
                      {user.name}
                    </span>
                    {index < 3 && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color: '#FFFFFF',
                          backgroundColor:
                            index === 0
                              ? '#fbbf24'
                              : index === 1
                                ? '#9ca3af'
                                : '#f97316',
                          padding: '2px 6px',
                          borderRadius: '12px',
                          display: 'inline-block',
                        }}
                      >
                        BEST {index + 1}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: '#666' }}>
                    함께한 경기 {user.games}회
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>
                    승률
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: user.winRate >= 50 ? '#10b981' : '#ef4444',
                    }}
                  >
                    {user.winRate.toFixed(1)}%
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>
                    평균 딜량
                  </div>
                  <div
                    style={{ fontSize: 16, fontWeight: 'bold', color: '#222' }}
                  >
                    {user.avgDamage.toFixed(0)}
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>
                    평균 등수
                  </div>
                  <div
                    style={{ fontSize: 16, fontWeight: 'bold', color: '#222' }}
                  >
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
