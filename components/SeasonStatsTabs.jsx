import React, { useState } from "react";

/**
 * 랭크 시즌별 통계(이전 시즌 포함) 탭 컴포넌트 (op.gg 스타일)
 * @param {Object} props
 * @param {Object} props.seasonStatsBySeason - { 시즌명: { ...스탯 } } 형태의 시즌별 통계 객체
 */
export default function SeasonStatsTabs({ seasonStatsBySeason }) {
  const seasonList = Object.keys(seasonStatsBySeason || {});
  const [selected, setSelected] = useState(seasonList[0] || "");
  if (!seasonList.length) return <div className="text-gray-500 dark:text-gray-400">시즌별 통계 데이터가 없습니다.</div>;
  const stats = seasonStatsBySeason[selected];
  return (
    <div className="season-stats-tabs bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mt-8">
      <div className="flex gap-2 mb-4">
        {seasonList.map(season => (
          <button
            key={season}
            className={`px-4 py-2 rounded-lg font-semibold border text-sm transition ${selected===season ? 'bg-blue-500 text-white border-blue-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-blue-100 dark:hover:bg-blue-800'}`}
            onClick={()=>setSelected(season)}
          >
            {season}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
          <ul className="text-sm space-y-1">
            <li>총 라운드: <span className="font-medium">{stats.rounds}</span></li>
            <li>승리: <span className="font-medium">{stats.wins}</span></li>
            <li>Top 10: <span className="font-medium">{stats.top10s}</span></li>
            <li>K/D: <span className="font-medium">{stats.kd}</span></li>
            <li>평균 딜량: <span className="font-medium">{stats.avgDamage}</span></li>
            <li>승률: <span className="font-medium">{stats.winRate}%</span></li>
            <li>Top 10 비율: <span className="font-medium">{stats.top10Rate}%</span></li>
            <li>최장 킬 거리: <span className="font-medium">{stats.longestKill}m</span></li>
            <li>헤드샷 킬: <span className="font-medium">{stats.headshots}</span></li>
            <li>최대 킬: <span className="font-medium">{stats.maxKills}</span></li>
            <li>최대 거리 킬: <span className="font-medium">{stats.maxDistanceKill}m</span></li>
            <li>헤드샷 비율: <span className="font-medium">{stats.headshotRate}%</span></li>
            <li>평균 등수: <span className="font-medium">{stats.avgRank}</span></li>
            <li>평균 생존시간: <span className="font-medium">{stats.avgSurvivalTime}초</span></li>
            <li>평균 어시스트: <span className="font-medium">{stats.avgAssists}</span></li>
            <li>어시스트: <span className="font-medium">{stats.assists}</span></li>
            <li>최대 어시스트: <span className="font-medium">{stats.mostAssists}</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
