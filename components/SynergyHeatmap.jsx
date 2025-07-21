import React from "react";

/**
 * props: matches (recentMatches), myNickname
 * 각 match.teammatesDetail: [{ name, isSelf, ... }]
 * 각 match: { teammatesDetail, damage, win, ... }
 */
export default function SynergyHeatmap({ matches, myNickname }) {
  // 유저별 집계
  const synergyMap = {};
  (matches || []).forEach(match => {
    if (!Array.isArray(match.teammatesDetail)) return;
    match.teammatesDetail.forEach(teammate => {
      if (teammate.name === myNickname) return;
      if (!synergyMap[teammate.name]) {
        synergyMap[teammate.name] = {
          games: 0,
          totalDamage: 0,
          totalWins: 0,
          totalTier: 0,
          tierCount: 0,
        };
      }
      synergyMap[teammate.name].games += 1;
      synergyMap[teammate.name].totalDamage += teammate.damage ?? 0;
      synergyMap[teammate.name].totalWins += match.win ? 1 : 0;
      if (typeof teammate.tierScore === 'number') {
        synergyMap[teammate.name].totalTier += teammate.tierScore;
        synergyMap[teammate.name].tierCount += 1;
      }
    });
  });
  // 유저별 평균 계산
  const synergyArr = Object.entries(synergyMap).map(([name, stat]) => ({
    name,
    games: stat.games,
    avgDamage: stat.games ? stat.totalDamage / stat.games : 0,
    winRate: stat.games ? (stat.totalWins / stat.games) * 100 : 0,
    avgTier: stat.tierCount ? stat.totalTier / stat.tierCount : null,
  })).sort((a, b) => b.games - a.games);

  // 색상: 승률 기준 (높을수록 진한 파랑, 낮을수록 연한 회색)
  function winRateColor(rate) {
    if (rate >= 70) return '#2563eb';
    if (rate >= 50) return '#60a5fa';
    if (rate >= 30) return '#a5b4fc';
    return '#e5e7eb';
  }

  return (
    <div style={{ margin: '32px 0' }}>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12, color: '#2563eb' }}>
        함께한 유저 시너지 히트맵
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 480, width: '100%' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: 8, fontWeight: 600 }}>유저명</th>
              <th style={{ padding: 8, fontWeight: 600 }}>함께한 경기</th>
              <th style={{ padding: 8, fontWeight: 600 }}>평균 딜량</th>
              <th style={{ padding: 8, fontWeight: 600 }}>승률</th>
              <th style={{ padding: 8, fontWeight: 600 }}>평균 티어</th>
            </tr>
          </thead>
          <tbody>
            {synergyArr.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: 16 }}>최근 함께한 유저 데이터가 없습니다.</td></tr>
            ) : synergyArr.map(user => (
              <tr key={user.name} style={{ background: winRateColor(user.winRate) }}>
                <td style={{ padding: 8, fontWeight: 600, color: '#222' }}>{user.name}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>{user.games}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>{user.avgDamage.toFixed(1)}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>{user.winRate.toFixed(1)}%</td>
                <td style={{ padding: 8, textAlign: 'center' }}>{user.avgTier !== null ? user.avgTier.toFixed(1) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
        * 승률이 높을수록 진한 파랑색으로 표시됩니다.
      </div>
    </div>
  );
}
