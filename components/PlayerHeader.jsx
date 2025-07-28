import React, { useState } from 'react';

const PlayerHeader = ({ profile, summary, rankedSummary, clanName, onRefresh, refreshing, cooldown, refreshMsg }) => {
  // 디버깅용 로그
  console.log('PlayerHeader rankedSummary:', rankedSummary);
  
  // 경쟁전 상세보기 상태
  const [showRankedDetails, setShowRankedDetails] = useState(false);
  
  // 플레이스타일 값을 안전하게 문자열로 변환 (realPlayStyle 우선, 그 다음 playstyle, 마지막으로 style)
  const getStyleString = (summary) => {
    const style = summary?.realPlayStyle || summary?.playstyle || summary?.style;
    if (typeof style === 'string') {
      // 이모지 제거하고 텍스트만 반환
      return style.replace(/^[^\w\s가-힣]+\s*/, '').trim() || '일반 밸런스형';
    }
    if (typeof style === 'object' && style !== null) {
      // 객체인 경우 JSON.stringify 후 기본값 반환
      console.warn('PlayerHeader: style is an object, using default value', style);
      return '일반 밸런스형';
    }
    return '일반 밸런스형';
  };

  const styleString = getStyleString(summary);

  const getPlayerStyle = (style) => {
    const styles = {
      // 이모지가 제거된 텍스트 기반 매핑
      '극단적 공격형': { icon: '☠️', color: 'red', bg: 'from-red-500 to-red-600' },
      '초반 돌격형': { icon: '🚀', color: 'orange', bg: 'from-orange-500 to-orange-600' },
      '극단적 수비형': { icon: '🛡️', color: 'green', bg: 'from-green-500 to-green-600' },
      '후반 존버형': { icon: '🏕️', color: 'yellow', bg: 'from-yellow-500 to-yellow-600' },
      '장거리 정찰러': { icon: '🏃', color: 'blue', bg: 'from-blue-500 to-blue-600' },
      '저격 위주': { icon: '🎯', color: 'purple', bg: 'from-purple-500 to-purple-600' },
      '중거리 안정형': { icon: '⚖️', color: 'gray', bg: 'from-gray-500 to-gray-600' },
      '지속 전투형': { icon: '🔥', color: 'red', bg: 'from-red-600 to-red-700' },
      '일반 밸런스형': { icon: '📦', color: 'gray', bg: 'from-gray-400 to-gray-500' },
      
      // API의 realPlayStyle 기반 매핑 (기존 호환성)
      '☠️ 극단적 공격형': { icon: '☠️', color: 'red', bg: 'from-red-500 to-red-600' },
      '🚀 초반 돌격형': { icon: '🚀', color: 'orange', bg: 'from-orange-500 to-orange-600' },
      '🛡️ 극단적 수비형': { icon: '🛡️', color: 'green', bg: 'from-green-500 to-green-600' },
      '🏕️ 후반 존버형': { icon: '🏕️', color: 'yellow', bg: 'from-yellow-500 to-yellow-600' },
      '🏃 장거리 정찰러': { icon: '🏃', color: 'blue', bg: 'from-blue-500 to-blue-600' },
      '🎯 저격 위주': { icon: '🎯', color: 'purple', bg: 'from-purple-500 to-purple-600' },
      '⚖️ 중거리 안정형': { icon: '⚖️', color: 'gray', bg: 'from-gray-500 to-gray-600' },
      '🔥 지속 전투형': { icon: '🔥', color: 'red', bg: 'from-red-600 to-red-700' },
      '📦 일반 밸런스형': { icon: '📦', color: 'gray', bg: 'from-gray-400 to-gray-500' },
      
      // 기존 스타일 호환성 유지 (레거시)
      '어그로': { icon: '⚔️', color: 'red', bg: 'from-red-500 to-red-600' },
      '서포터': { icon: '🤝', color: 'blue', bg: 'from-blue-500 to-blue-600' },
      '생존형': { icon: '🛡️', color: 'green', bg: 'from-green-500 to-green-600' },
      '킬러': { icon: '💀', color: 'purple', bg: 'from-purple-500 to-purple-600' },
      '밸런스': { icon: '⚖️', color: 'gray', bg: 'from-gray-500 to-gray-600' },
      
      // 간단한 점수 기반 스타일 (playstyle)
      '캐리형': { icon: '🔥', color: 'red', bg: 'from-red-500 to-red-600' },
      '안정형': { icon: '👀', color: 'blue', bg: 'from-blue-500 to-blue-600' },
      '교전 기피형': { icon: '⚡', color: 'yellow', bg: 'from-yellow-500 to-yellow-600' },
      '🔥 캐리형': { icon: '🔥', color: 'red', bg: 'from-red-500 to-red-600' },
      '👀 안정형': { icon: '👀', color: 'blue', bg: 'from-blue-500 to-blue-600' },
      '⚡ 교전 기피형': { icon: '⚡', color: 'yellow', bg: 'from-yellow-500 to-yellow-600' },
    };
    return styles[style] || styles['일반 밸런스형'];
  };

  const playerStyleInfo = getPlayerStyle(styleString);

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-lg mb-8">
      
      {/* 1. 플레이어 기본 프로필 섹션 */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-700/50 rounded-xl p-6 mb-6 border-l-4 border-blue-500">
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-3xl font-extrabold text-blue-700 dark:text-blue-200" style={{lineHeight:1.1}}>{profile?.nickname || '-'}</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white">
            {(profile?.nickname || 'P').charAt(0).toUpperCase()}
          </div>
          <div>
            {/* 시즌 선택 버튼 */}
            <div className="mb-3">
              <select 
                className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                defaultValue="current"
              >
                <option value="current">📅 현재 시즌</option>
                <option value="season-31">시즌 31</option>
                <option value="season-30">시즌 30</option>
                <option value="season-29">시즌 29</option>
                <option value="season-28">시즌 28</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              {clanName && (
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
                  {clanName}
                </span>
              )}
              <div className={`flex items-center gap-2 px-3 py-1 bg-gradient-to-r ${playerStyleInfo.bg} text-white rounded-full text-sm font-medium`}>
                <span>{styleString}</span>
              </div>
              <button
                onClick={onRefresh}
                disabled={refreshing || cooldown > 0}
                className={`px-3 py-1 rounded-lg font-medium text-sm transition-all duration-200 ${
                  refreshing || cooldown > 0 
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-sm hover:shadow-md'
                }`}
              >
                {refreshing ? (
                  <div className="flex items-center gap-1">
                    <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                    <span>최신화 중</span>
                  </div>
                ) : cooldown > 0 ? (
                  `쿨타임 ${cooldown}초`
                ) : (
                  <div className="flex items-center gap-1">
                    <span>🔄</span>
                    <span>최신화</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        

        {/* 2. 시즌 성과 카드형 요약 */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/20 dark:to-slate-800/20 rounded-xl p-6 border-l-4 border-slate-500">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">시즌 성과</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white bg-opacity-60 dark:bg-gray-800 dark:bg-opacity-60 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">평균 딜량</div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{Math.round(summary?.avgDamage || 0)}</div>
            </div>
            <div className="bg-white bg-opacity-60 dark:bg-gray-800 dark:bg-opacity-60 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">PK.GG 점수</div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{summary?.averageScore || 1000}
                <span className="text-xs text-gray-500 ml-2">
                  {(summary?.averageScore || 1000) >= 1500 ? '(우수)' : (summary?.averageScore || 1000) >= 1200 ? '(보통)' : '(성장형)'}
                </span>
              </div>
            </div>
            <div className="bg-white bg-opacity-60 dark:bg-gray-800 dark:bg-opacity-60 rounded-lg p-3 border border-slate-200 dark:border-slate-700 col-span-2">
              <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">폼 상태</div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  summary?.recentForm === '상승' ? 'bg-green-100 text-green-700' :
                  summary?.recentForm === '하락' || summary?.recentForm === '급감' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {summary?.recentForm || '안정'}
                </span>
                <span className="text-xs text-gray-500">
                  {summary?.formComment || '최근 성과를 분석 중입니다.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. 핵심 성과 요약 섹션 */}
        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-6 border-l-4 border-emerald-500">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">20경기 요약</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white bg-opacity-60 dark:bg-gray-800 dark:bg-opacity-60 rounded-lg p-3 border border-emerald-200 dark:border-emerald-700">
              <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">평균 딜량</div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{Math.round(summary?.avgDamage || 0)}</div>
            </div>
            
            <div className="bg-white bg-opacity-60 dark:bg-gray-800 dark:bg-opacity-60 rounded-lg p-3 border border-emerald-200 dark:border-emerald-700">
              <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">PK.GG 점수</div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{summary?.averageScore || 1000}</div>
            </div>

            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 border border-emerald-200 dark:border-emerald-700 col-span-2">
              <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">최근 폼 상태</div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {summary?.formComment || '데이터 분석 중...'}
              </div>
            </div>
          </div>
        </div>

        {/* 4. 경쟁전 요약 */}
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl p-6 border-l-4 border-amber-500">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">경쟁전</h2>
            <span className="text-xs bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-full">PUBG 공식</span>
          </div>
          
          {rankedSummary && rankedSummary.games > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-center">
                  <div className="text-xs text-amber-600 dark:text-amber-400 mb-1">랭크</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {(rankedSummary.currentTier || rankedSummary.tier || 'Unranked')}
                    {rankedSummary.subTier && rankedSummary.subTier > 0 ? ` ${rankedSummary.subTier}` : ''}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{rankedSummary.rp || 0} RP</div>
                </div>
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-center">
                  <div className="text-xs text-amber-600 dark:text-amber-400 mb-1">게임수</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{rankedSummary.games || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">K/D {(rankedSummary.kd || 0).toFixed(2)}</div>
                </div>
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-center">
                  <div className="text-xs text-amber-600 dark:text-amber-400 mb-1">평균 딜량</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{Math.round(rankedSummary.avgDamage || 0)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">승률 {(rankedSummary.winRate || 0).toFixed(1)}%</div>
                </div>
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-center">
                  <div className="text-xs text-amber-600 dark:text-amber-400 mb-1">TOP10</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {typeof rankedSummary.top10Ratio === 'number' ? (rankedSummary.top10Ratio * 100).toFixed(1) : 
                     (rankedSummary.top10Rate || 0).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">평균 등수 {(rankedSummary.avgRank || 0).toFixed(1)}</div>
                </div>
              </div>
              
              {/* 상세보기 버튼 */}
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowRankedDetails(!showRankedDetails)}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-medium rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 shadow-sm"
                >
                  {showRankedDetails ? '▲ 상세 통계 숨기기' : '▼ 상세 통계 보기'}
                </button>
              </div>
              
              {/* 상세 통계 섹션 */}
              {showRankedDetails && (
                <div className="mt-4 bg-white/40 dark:bg-gray-800/40 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 text-center">상세 경쟁전 통계</h3>
                  
                  {/* 기본 전투 통계 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-center">
                      <div className="text-xs text-red-600 dark:text-red-400 mb-1">킬 수</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {(rankedSummary.kills || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">데스 수</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {(rankedSummary.deaths || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-center">
                      <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">어시스트</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {(rankedSummary.assists || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-center">
                      <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">KDA</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {typeof rankedSummary.kda === 'number' ? rankedSummary.kda.toFixed(2) : '0.00'}
                      </div>
                    </div>
                  </div>
                  
                  {/* 성과 통계 */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-center">
                      <div className="text-xs text-green-600 dark:text-green-400 mb-1">승리 수</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {(rankedSummary.wins || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-center">
                      <div className="text-xs text-orange-600 dark:text-orange-400 mb-1">총 딜량</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {(rankedSummary.damageDealt || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">기절시킨 수</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {(rankedSummary.dBNOs || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  {/* 헤드샷 통계 */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-center">
                      <div className="text-xs text-red-600 dark:text-red-400 mb-1">헤드샷 킬 수</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {(rankedSummary.headshotKills || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-center">
                      <div className="text-xs text-red-600 dark:text-red-400 mb-1">헤드샷 비율</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {typeof rankedSummary.headshotRate === 'number' ? rankedSummary.headshotRate.toFixed(1) : '0.0'}%
                      </div>
                    </div>
                  </div>
                  
                  {/* 최고 기록 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-center">
                      <div className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">최고 티어</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {rankedSummary.bestTier || 'Unranked'}
                      </div>
                    </div>
                    <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3 text-center">
                      <div className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">최고 RP</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {(rankedSummary.bestRankPoint || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-6 text-center">
              <div className="text-4xl mb-3">❗</div>
              <div className="text-gray-600 dark:text-gray-400 font-medium">아직 경쟁전 경기가 없습니다.</div>
              <div className="text-sm text-gray-500 dark:text-gray-500 mt-2">경쟁전에 참여하면 랭크 정보가 표시됩니다.</div>
            </div>
          )}
        </div>
      </div>
      
      {refreshMsg && (
        <div className="text-center mt-3 text-sm text-indigo-700 dark:text-indigo-400 font-medium bg-indigo-100 dark:bg-indigo-900/30 rounded-lg p-2">
          {refreshMsg}
        </div>
      )}
    </div>
  );
};

export default PlayerHeader;
