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
      hour12: false
    });
  } catch (e) {
    console.error("Error formatting match timestamp:", timestamp, e);
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
    return <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">매치 데이터를 불러올 수 없습니다.</div>;
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
  const teammatesDetail = Array.isArray(match.teammatesDetail) ? match.teammatesDetail : [];
  const mapName = match.mapName ?? '알 수 없음';
  const gameMode = match.gameMode ?? '알 수 없음';


  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 mb-4 transform hover:scale-105 transition duration-300 ease-in-out border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">경기 상세 정보</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {formatMatchTime(match.matchTimestamp)}
          </p>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">Match ID: {match.matchId?.substring(0, 8)}...</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 dark:text-gray-300">
        <p className="text-lg">
          <span className="font-semibold">맵:</span> {mapName}
        </p>
        <p className="text-lg">
          <span className="font-semibold">모드:</span> {gameMode.toUpperCase()}
        </p>
        <p className="text-lg">
          <span className="font-semibold">최종 순위:</span> {rank}위 / 총 스쿼드: {totalSquads} ({opGrade})
        </p>
        <p className="text-lg">
          <span className="font-semibold">생존 시간:</span> {formatSurvivalTime(survivalTime)}
        </p>
        <p className="text-lg">
          <span className="font-semibold">평균 MMR:</span> {avgMmr}
        </p>
        <p className="text-lg">
          <span className="font-semibold">승리:</span> {win ? '✅' : '❌'}
          <span className="ml-4 font-semibold">TOP 10:</span> {top10 ? '✅' : '❌'}
        </p>
        <p className="text-lg col-span-full">
          <span className="font-semibold">총 딜량 (팀):</span> <span className="text-blue-500 dark:text-blue-400">{totalTeamDamage}</span>
        </p>
      </div>

      <div className="mt-6">
        <h4 className="text-md font-semibold mb-3 text-gray-800 dark:text-gray-200">팀원 딜량 리스트 (딜량 높은 순)</h4>
        <ul className="space-y-2">
          {teammatesDetail
            .sort((a, b) => b.damage - a.damage)
            .map((tm, index) => (
              <li key={tm.name || index} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                <span className="font-medium text-gray-700 dark:text-gray-300">{tm.name || '알 수 없는 팀원'}</span>
                <span className="text-blue-600 dark:text-blue-300">{tm.damage} dmg</span>
              </li>
            ))}
        </ul>
        {teammatesDetail.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">팀원 정보가 없거나 솔로 매치입니다.</p>
        )}
      </div>
    </div>
  );
};

export default MatchDetailCard;