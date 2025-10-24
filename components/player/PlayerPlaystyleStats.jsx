import React from 'react';

/**
 * 플레이스타일/통계 시각화(OP.GG 스타일)
 * @param {Object} props
 * @param {Object} summary - 플레이어 요약 통계
 */
export default function PlayerPlaystyleStats({ summary }) {
  if (!summary)
    return (
      <div style={{ color: '#888', fontSize: 14, padding: '8px 0' }}>
        플레이스타일 데이터 없음
      </div>
    );
  return (
    <section style={{ margin: '32px 0' }}>
      <h2
        style={{
          fontWeight: 700,
          fontSize: 20,
          marginBottom: 12,
          color: '#2563eb',
        }}
      >
        플레이스타일 & 주요 통계
      </h2>
      <div
        style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 16 }}
      >
        <StatBox label="평균 점수" value={summary.averageScore ?? '-'} />
        <StatBox label="평균 딜량" value={summary.avgDamage ?? '-'} />
        <StatBox
          label="시즌 평균 딜량"
          value={summary.seasonAvgDamage ?? '-'}
        />
        <StatBox
          label="평균 생존 시간"
          value={
            summary.avgSurvivalTime
              ? `${Math.round(summary.avgSurvivalTime)}초`
              : '-'
          }
        />
        <StatBox
          label="평균 이동 거리"
          value={
            summary.avgDistance
              ? `${(summary.avgDistance / 1000).toFixed(1)}km`
              : '-'
          }
        />
        <StatBox
          label="평균 교전 거리"
          value={
            summary.avgCombatDistance
              ? `${Math.round(summary.avgCombatDistance)}m`
              : '-'
          }
        />
        <StatBox label="평균 킬" value={summary.avgKills ?? '-'} />
        <StatBox label="평균 어시스트" value={summary.avgAssists ?? '-'} />
        <StatBox label="평균 랭크" value={summary.avgRank ?? '-'} />
      </div>
      <div
        style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 8 }}
      >
        <StatBox label="플레이 스타일" value={summary.playstyle ?? '-'} />
        <StatBox
          label="실제 플레이 성향"
          value={summary.realPlayStyle ?? '-'}
        />
        <StatBox
          label="이동 성향 힌트"
          value={summary.distanceStyleHint ?? '-'}
        />
      </div>
    </section>
  );
}

function StatBox({ label, value }) {
  return (
    <div
      style={{
        minWidth: 120,
        padding: 16,
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        background: '#f8fafc',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontWeight: 700, fontSize: 20, color: '#222' }}>
        {value}
      </div>
    </div>
  );
}
