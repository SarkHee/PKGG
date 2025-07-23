import React from "react";
import RankedSummaryCard from "./RankedSummaryCard";
import RankedModeCard from "./RankedModeCard";

export default function RankedStatsSection({ rankedSummary, rankedStats, dataSource }) {
  // rankedSummary와 rankedStats가 존재하면 표시 (rounds > 0 조건 제거)
  const hasRanked = rankedSummary && rankedStats && Array.isArray(rankedStats) && rankedStats.length > 0;

  // 데이터 소스별 메시지 설정
  const getDataSourceInfo = () => {
    switch(dataSource) {
      case 'database':
        return {
          bgColor: 'from-yellow-50 to-yellow-100',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          badgeColor: 'bg-yellow-500',
          subTextColor: 'text-yellow-600',
          title: 'DB 데이터 표시',
          description: '일부 정보 제한 가능',
          subtitle: '최신화하기로 실시간 데이터 조회 가능'
        };
      case 'pubg_api_only':
      case 'pubg_api':
        return {
          bgColor: 'from-green-50 to-green-100',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          badgeColor: 'bg-green-500',
          subTextColor: 'text-green-600',
          title: '실시간 데이터',
          description: 'PUBG API 최신 정보',
          subtitle: '실시간으로 업데이트된 데이터입니다'
        };
      default: // 'db_with_api_enhancement'
        return {
          bgColor: 'from-blue-50 to-blue-100',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
          badgeColor: 'bg-blue-500',
          subTextColor: 'text-blue-600',
          title: '향상된 데이터',
          description: 'DB + PUBG API 실시간 데이터 조합',
          subtitle: '백그라운드에서 자동 업데이트됩니다'
        };
    }
  };

  const dataInfo = getDataSourceInfo();

  return (
    <section>
      <h2>경쟁전 요약</h2>
      {hasRanked ? (
        <>
          <RankedSummaryCard summary={rankedSummary} />
          <div>
            {rankedStats.map(r => (
              <RankedModeCard key={r.mode} mode={r} />
            ))}
          </div>
        </>
      ) : (
        <div className={`mb-3 p-4 bg-gradient-to-r ${dataInfo.bgColor} border-2 ${dataInfo.borderColor} ${dataInfo.textColor} rounded-xl shadow-sm`}>
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 text-center">
            <div className={`inline-block px-3 py-1 ${dataInfo.badgeColor} text-white text-xs font-semibold rounded-full mb-2`}>
              데이터 소스 안내
            </div>
            <div className="text-sm font-medium">
              <strong>{dataInfo.title}:</strong> {dataInfo.description}
            </div>
            <div className={`text-xs ${dataInfo.subTextColor} mt-1`}>
              {dataInfo.subtitle}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
