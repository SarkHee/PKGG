// PK.GG/components/MatchDetailCard.jsx

import React from 'react';

/**
 * 초 단위 생존 시간을 "분:초" 형식으로 변환합니다.
 * @param {number} seconds - 초 단위 시간
 * @returns {string} "분:초" 형식의 문자열
 */
function formatSurvivalTime(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    return 'N/A';
  }
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}분 ${sec}초`;
}

/**
 * 매치 타임스탬프를 읽기 쉬운 날짜/시간으로 변환합니다.
 * @param {string} timestamp - ISO 8601 형식의 타임스탬프 문자열
 * @returns {string} 형식화된 날짜/시간 문자열
 */
function formatMatchTime(timestamp) {
  if (!timestamp) return 'N/A';
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch (e) {
    console.error('Error formatting match timestamp:', timestamp, e);
    return '유효하지 않은 시간';
  }
}

/**
 * 단일 매치의 상세 정보를 표시하는 카드 컴포넌트.
 * @param {Object} props
 * @param {Object} props.match - 백엔드 API에서 받아온 단일 매치 데이터 객체.
 * 예: { matchId, matchTimestamp, mapName, gameMode, rank, totalSquads, opGrade, survivalTime, avgMmr, win, top10, totalTeamDamage, teammatesDetail[] }
 */
const MatchDetailCard = ({ match }) => {
  if (!match) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
        매치 데이터를 불러올 수 없습니다.
      </div>
    );
  }

  // 데이터 안전하게 추출 (기본값 설정)
  const rank = match.rank ?? 'N/A';
  const totalSquads = match.totalSquads ?? 'N/A';
  const opGrade = match.opGrade ?? 'N/A';
  const survivalTime = match.survivalTime ?? 0;
  const avgMmr = match.avgMmr ?? 'N/A';
  const win = match.win ?? false;
  const top10 = match.top10 ?? false;
  const totalTeamDamage = match.totalTeamDamage ?? 0;
  const teammatesDetail = Array.isArray(match.teammatesDetail)
    ? match.teammatesDetail
    : [];
  const mapName = match.mapName ?? '알 수 없음';
  const gameMode = match.gameMode ?? '알 수 없음';

  return (
    <div className="match-card">
      <div className="flex items-center justify-between mb-2">
        <div className="font-extrabold text-lg text-[#2563eb] tracking-tight">
          {mapName}
        </div>
        <div className="text-xs text-gray-400">
          {formatMatchTime(match.matchTimestamp)}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        <span className="px-3 py-1 rounded-full bg-[#2563eb] text-white text-xs font-semibold">
          {gameMode}
        </span>
        <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">
          순위: {rank} / {totalSquads}
        </span>
        <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">
          OP: {opGrade}
        </span>
        {win && (
          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
            WIN
          </span>
        )}
        {top10 && !win && (
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
            TOP10
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-2">
        <div>
          딜량:{' '}
          <span className="font-bold text-[#2563eb]">
            {(match.damage || 0).toFixed(1)}
          </span>
        </div>
        <div>
          생존:{' '}
          <span className="font-bold">{formatSurvivalTime(survivalTime)}</span>
        </div>
        <div>
          이동거리: <span className="font-bold">{match.distance}m</span>
        </div>
        <div>
          평균 MMR: <span className="font-bold text-[#2563eb]">{avgMmr}</span>
        </div>
        <div>
          팀 총딜:{' '}
          <span className="font-bold">{(totalTeamDamage || 0).toFixed(1)}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {match.teammates && match.teammates.length > 0 && (
          <span className="text-xs text-gray-500">
            팀원: {match.teammates.join(', ')}
          </span>
        )}
      </div>
    </div>
  );
};

export default MatchDetailCard;
