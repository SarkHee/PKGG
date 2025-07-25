
import React from "react";
import MatchDetailLog from "./MatchDetailLog.jsx";
import MatchTeammateStats from "./MatchTeammateStats.jsx";
import RankChangeIndicator from "./RankChangeIndicator.jsx";



export default function MatchListRow({ match, isOpen, onToggle, prevMatch }) {
  // MMR 변화량 계산 (이전 경기 avgMmr과 현재 avgMmr 비교)
  const prevScore = prevMatch?.avgMmr;
  const currentScore = match.avgMmr;
  // OP.GG 스타일: 필드 순서, 명칭, 구조, 스타일 제거, robust empty 처리
  if (!match) return (
    <div style={{ padding: '16px', textAlign: 'center', color: '#888' }}>경기 데이터 없음</div>
  );
  return (
    <div style={{ borderBottom: '1px solid #eee', padding: '12px 0', background: isOpen ? '#f8fafc' : 'none', cursor: 'pointer' }} onClick={onToggle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* 경기 모드 타입 (경쟁전/일반) */}
        <div style={{ minWidth: 50, textAlign: 'center' }}>
          <div style={{ 
            fontSize: 10, 
            fontWeight: 700, 
            color: match.modeType === '경쟁전' ? '#dc2626' : '#059669',
            backgroundColor: match.modeType === '경쟁전' ? '#fef2f2' : '#f0fdf4',
            padding: '2px 6px',
            borderRadius: 4,
            border: `1px solid ${match.modeType === '경쟁전' ? '#fecaca' : '#bbf7d0'}`
          }}>
            {match.modeType || '일반'}
          </div>
        </div>
        {/* 경기 시간/날짜 */}
        <div style={{ minWidth: 80, textAlign: 'center' }}>
          <div>{formatRelativeTime(match.matchTimestamp)}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{formatTime(match.matchTimestamp)}</div>
        </div>
        {/* 등수 */}
        <div style={{ minWidth: 60, fontWeight: 700, fontSize: 18, color: '#2563eb' }}>#{match.rank ?? '-'}</div>
        {/* 킬 */}
        <div style={{ minWidth: 48, textAlign: 'center' }}>
          <div style={{ fontWeight: 700 }}>{match.kills ?? 0}</div>
          <div style={{ fontSize: 12, color: '#888' }}>킬</div>
        </div>
        {/* 데미지 */}
        <div style={{ minWidth: 60, textAlign: 'center' }}>
              <div style={{ fontWeight: 700 }}>{(match.damage ?? 0).toFixed(1)}</div>
          <div style={{ fontSize: 12, color: '#888' }}>데미지</div>
        </div>
        {/* 이동거리 */}
        <div style={{ minWidth: 70, textAlign: 'center' }}>
          <div style={{ fontWeight: 700 }}>{match.distance ? (match.distance/1000).toFixed(2) : '0.00'}km</div>
          <div style={{ fontSize: 12, color: '#888' }}>이동</div>
        </div>
        {/* opGrade */}
        <div style={{ minWidth: 60, textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: '#f59e42' }}>{match.opGrade ?? '-'}</div>
          <div style={{ fontSize: 12, color: '#888' }}>등급</div>
        </div>
        {/* 승/패, Top10 */}
        <div style={{ minWidth: 60, textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: match.win ? '#2563eb' : '#888' }}>{match.win ? 'WIN' : '-'}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{match.top10 ? 'Top10' : ''}</div>
        </div>
        {/* 팀 전체 딜량 */}
        <div style={{ minWidth: 70, textAlign: 'center' }}>
              <div style={{ fontWeight: 700 }}>{typeof match.totalTeamDamage === 'number' ? match.totalTeamDamage.toFixed(1) : '-'}</div>
          <div style={{ fontSize: 12, color: '#888' }}>팀딜</div>
        </div>
        {/* 팀원 */}
        <div style={{ flex: 1, minWidth: 120, fontSize: 14, color: '#222' }}>
          {Array.isArray(match.teammatesDetail) && match.teammatesDetail.length > 0 ? (
            match.teammatesDetail.map((t, i) => (
              <span key={t.name} style={{ fontWeight: t.isSelf ? 700 : 400, color: t.isSelf ? '#2563eb' : '#222', marginRight: 6 }}>{t.name}</span>
            ))
          ) : (
            <span style={{ color: '#aaa' }}>-</span>
          )}
        </div>
        {/* MMR 변화량 */}
        <div style={{ minWidth: 60, textAlign: 'center' }}>
          <RankChangeIndicator prevScore={prevScore} currentScore={currentScore} />
        </div>
        {/* 펼치기 화살표 */}
        <div style={{ minWidth: 32, textAlign: 'center', fontSize: 18, color: '#888' }}>{isOpen ? '▾' : '▸'}</div>
      </div>
      {/* 상세 정보 (팀원별 스탯, 상세 로그) */}
      {isOpen && (
        <div style={{ marginTop: 12, background: '#f1f5f9', borderRadius: 6, padding: 12 }}>
          <MatchTeammateStats teammatesDetail={match.teammatesDetail} />
          <MatchDetailLog match={match} />
        </div>
      )}
    </div>
  );
}


function formatRelativeTime(ts) {
  if (!ts) return "-";
  const now = new Date();
  const t = new Date(ts);
  const diff = Math.floor((now-t)/1000);
  if (diff < 60) return `${diff}초 전`;
  if (diff < 3600) return `${Math.floor(diff/60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff/3600)}시간 전`;
  return `${Math.floor(diff/86400)}일 전`;
}
function formatTime(ts) {
  if (!ts) return "-";
  const t = new Date(ts);
  return `${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}`;
}
