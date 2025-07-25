import React from "react";

/**
 * props: matches (recentMatches), myNickname, clanMembers, playerClan
 * 각 match.teammatesDetail: [{ name, isSelf, ... }]
 * 각 match: { teammatesDetail, damage, win, ... }
 */
export default function SynergyHeatmap({ matches, myNickname, clanMembers = [], playerClan }) {
  // 클랜원 닉네임 목록 생성 (소문자로 변환해서 비교용)
  const clanMemberNames = new Set(
    clanMembers.map(member => 
      typeof member === 'string' ? member.toLowerCase() : member.nickname?.toLowerCase()
    ).filter(Boolean)
  );
  
  // 유저별 집계 (클랜원만)
  const synergyMap = {};
  let hasTeammateData = false;
  
  (matches || []).forEach(match => {
    if (!Array.isArray(match.teammatesDetail)) return;
    hasTeammateData = true;
    
    // 승리 여부 판단 (rank가 1이면 승리)
    const isWin = match.rank === 1;
    
    match.teammatesDetail.forEach(teammate => {
      if (teammate.name === myNickname) return;
      
      // 클랜원인지 확인
      const isTeammateClanMember = clanMemberNames.has(teammate.name.toLowerCase());
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
  const synergyArr = Object.entries(synergyMap).map(([name, stat]) => ({
    name,
    games: stat.games,
    avgDamage: stat.games ? stat.totalDamage / stat.games : 0,
    winRate: stat.games ? (stat.totalWins / stat.games) * 100 : 0,
    avgRank: stat.rankCount ? stat.totalRank / stat.rankCount : null,
  })).sort((a, b) => b.games - a.games);

  // 색상: 승률 기준 (높을수록 진한 파랑, 낮을수록 연한 회색)
  function winRateColor(rate) {
    if (rate >= 70) return '#2563eb';
    if (rate >= 50) return '#60a5fa';
    if (rate >= 30) return '#a5b4fc';
    return '#e5e7eb';
  }

  return (
    <div style={{ margin: '0' }}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: '#2563eb' }}>
        클랜원 시너지 분석
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 480, width: '100%' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: 8, fontWeight: 600 }}>클랜원</th>
              <th style={{ padding: 8, fontWeight: 600 }}>함께한 경기</th>
              <th style={{ padding: 8, fontWeight: 600 }}>평균 딜량</th>
              <th style={{ padding: 8, fontWeight: 600 }}>승률</th>
              <th style={{ padding: 8, fontWeight: 600 }}>평균 등수</th>
            </tr>
          </thead>
          <tbody>
            {!hasTeammateData ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: 16 }}>
                클랜원 시너지 정보가 없습니다. 실시간 데이터 조회 시 표시됩니다.
              </td></tr>
            ) : !playerClan || clanMemberNames.size === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: 16 }}>
                클랜에 소속되어 있지 않거나 클랜원 정보가 없습니다.
              </td></tr>
            ) : synergyArr.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: 16 }}>
                최근 경기에서 함께한 클랜원이 없습니다.
              </td></tr>
            ) : synergyArr.map(user => (
              <tr key={user.name} style={{ background: winRateColor(user.winRate) }}>
                <td style={{ padding: 8, fontWeight: 600, color: '#222' }}>{user.name}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>{user.games}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>{user.avgDamage.toFixed(1)}</td>
                <td style={{ padding: 8, textAlign: 'center' }}>{user.winRate.toFixed(1)}%</td>
                <td style={{ padding: 8, textAlign: 'center' }}>{user.avgRank !== null ? user.avgRank.toFixed(1) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
        * 클랜원과의 시너지를 분석합니다. 승률이 높을수록 진한 파랑색으로 표시됩니다.
      </div>
    </div>
  );
}
