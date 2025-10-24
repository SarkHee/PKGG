import React from 'react';
import RankedSummaryCard from './RankedSummaryCard';
import RankedModeCard from './RankedModeCard';

export default function RankedStatsSection({
  rankedSummary,
  rankedStats,
  dataSource,
}) {
  // rankedSummary와 rankedStats가 존재하면 표시 (rounds > 0 조건 제거)
  const hasRanked =
    rankedSummary &&
    rankedStats &&
    Array.isArray(rankedStats) &&
    rankedStats.length > 0;

  // 데이터 소스별 메시지 설정
  const getDataSourceInfo = () => {
    switch (dataSource) {
      case 'database':
        return {
          bgColor: 'from-yellow-50 to-yellow-100',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          badgeColor: 'bg-yellow-500',
          subTextColor: 'text-yellow-600',
          title: 'DB 데이터 표시',
          description: '일부 정보 제한 가능',
          subtitle: '최신화하기로 실시간 데이터 조회 가능',
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
          subtitle: '실시간으로 업데이트된 데이터입니다',
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
          subtitle: '백그라운드에서 자동 업데이트됩니다',
        };
    }
  };

  const dataInfo = getDataSourceInfo();

  return (
    <section>
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
        경쟁전 통계
      </h2>
      {hasRanked ? (
        <>
          <RankedSummaryCard summary={rankedSummary} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {rankedStats.map((r) => (
              <RankedModeCard key={r.mode} mode={r} />
            ))}
          </div>
        </>
      ) : (
        <div className="mb-3 p-6 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 text-orange-900 rounded-xl shadow-sm">
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 text-center">
            <div className="inline-block px-3 py-1 bg-orange-500 text-white text-xs font-semibold rounded-full mb-3">
              🏆 경쟁전 데이터 안내
            </div>
            <div className="text-lg font-bold mb-2">
              경쟁전 데이터를 찾을 수 없습니다
            </div>
            <div className="text-sm font-medium mb-3">
              <strong>PUBG 공식 API 제한사항:</strong> 경쟁전 데이터는 현재
              제한적으로만 제공됩니다
            </div>
            <div className="bg-orange-100 rounded-lg p-3 mb-3">
              <div className="text-xs text-orange-700 space-y-1">
                <div>
                  • <strong>현재 시즌</strong>: 경쟁전 API 데이터 제한
                </div>
                <div>
                  • <strong>대안</strong>: OP.GG 등은 별도 데이터 소스 사용
                </div>
                <div>
                  • <strong>참고</strong>: 일반 매치 데이터로 실력 분석 가능
                </div>
              </div>
            </div>
            <div className="text-xs text-orange-600">
              💡 <strong>대신 확인해보세요:</strong> 시즌 통계, MMR 추이, 딜량
              분석
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
