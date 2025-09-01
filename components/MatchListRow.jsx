
import React from "react";
import MatchDetailLog from "./MatchDetailLog.jsx";
import MatchTeammateStats from "./MatchTeammateStats.jsx";
import RankChangeIndicator from "./RankChangeIndicator.jsx";



export default function MatchListRow({ match, isOpen, onToggle, prevMatch, playerData }) {
  // MMR 변화량 계산 (이전 경기 avgMmr과 현재 avgMmr 비교)
  const prevScore = prevMatch?.avgMmr;
  const currentScore = match.avgMmr;
  
  // 게임 모드를 한글로 변환하는 함수
  const translateGameMode = (mode) => {
    if (!mode) return mode;
    const modeStr = mode.toString().toLowerCase();
    if (modeStr === 'squad' || modeStr === 'squad-fpp') return '스쿼드';
    if (modeStr === 'duo' || modeStr === 'duo-fpp') return '듀오';
    if (modeStr === 'solo' || modeStr === 'solo-fpp') return '솔로';
    return mode;
  };
  
    // 게임 모드 분석 함수 (완전히 새로운 접근법)
  const getGameModeInfo = (match, playerData) => {
    console.log('🔍 게임 모드 분석 중...', {
      matchId: match.matchId || match.id,
      gameMode: match.gameMode,
      matchType: match.matchType,
      mapName: match.mapName,
      modeType: match.modeType
    });

    // 1. 기존에 modeType이 이미 올바르게 설정되어 있는 경우
    if (match.modeType && match.modeType !== '일반') {
      console.log(`✅ 기존 modeType 사용: "${match.modeType}"`);
      return { type: 'ranked', label: match.modeType, color: '#dc2626' };
    }

    // 2. 다양한 필드에서 랭크 모드 감지
    const modeFields = [
      match.gameMode,
      match.matchType, 
      match.mode,
      match.type,
      match.queueType,
      match.customMode
    ];

    // 랭크 키워드 검사
    const rankedKeywords = [
      'ranked', 'rank', 'competitive', 'comp', 'rating', 'mmr'
    ];

    for (const field of modeFields) {
      if (field && typeof field === 'string') {
        const fieldLower = field.toLowerCase();
        for (const keyword of rankedKeywords) {
          if (fieldLower.includes(keyword.toLowerCase())) {
            console.log(`✅ 랭크 키워드 발견: "${keyword}" in "${field}"`);
            return { type: 'ranked', label: '경쟁전', color: '#dc2626' };
          }
        }
      }
    }

    // 3. 플레이어의 랭킹 정보를 기반으로 추정
    if (playerData?.rankedSummary) {
      const rankedData = playerData.rankedSummary;
      
      // 랭킹 게임을 충분히 한 플레이어인지 확인 (50경기 이상)
      if (rankedData.games >= 50 || rankedData.roundsPlayed >= 50) {
        console.log(`🎯 랭킹 데이터 기반 판단: ${rankedData.games || rankedData.roundsPlayed}경기, 티어: ${rankedData.tier || rankedData.currentTier}`);
        
        // 매치가 최근 것이라면 (7일 이내) 경쟁전으로 추정
        if (match.matchTimestamp) {
          const daysSinceMatch = (Date.now() - match.matchTimestamp) / (1000 * 60 * 60 * 24);
          if (daysSinceMatch <= 7) {
            console.log(`✅ 최근 7일 내 매치 + 랭킹 플레이어 = 경쟁전으로 추정`);
            return { type: 'ranked', label: '경쟁전', color: '#dc2626' };
          }
        }
      }
    }

    // 4. 게임 모드별 기본 분류
    const gameMode = match.gameMode || match.mode || '';
    if (gameMode.toLowerCase().includes('event') || gameMode.toLowerCase().includes('arcade')) {
      console.log(`🎪 이벤트 모드 감지: "${gameMode}"`);
      return { type: 'event', label: '이벤트', color: '#f59e0b' };
    }

    console.log('❌ 랭크 정보를 찾을 수 없음. 일반 모드로 처리');
    return { type: 'normal', label: '일반', color: '#059669' };
  };
  
  const modeInfo = getGameModeInfo(match, playerData);
  
  // OP.GG 스타일: 필드 순서, 명칭, 구조, 스타일 제거, robust empty 처리
  if (!match) return (
    <div style={{ padding: '16px', textAlign: 'center', color: '#888' }}>경기 데이터 없음</div>
  );
  return (
    <div 
      className={`border border-gray-200 dark:border-gray-600 rounded-xl mb-4 p-4 cursor-pointer transition-all hover:shadow-md ${
        isOpen ? 'bg-blue-50 dark:bg-blue-900/20 shadow-md' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
      }`} 
      onClick={onToggle}
    >
      <div className="flex items-center gap-4 flex-wrap">
        {/* 경기 모드 타입 (경쟁전/일반) */}
        <div className="min-w-[80px] text-center">
          <div className={`text-xs font-bold px-2 py-1 rounded-full border mb-1 ${
            modeInfo.isRanked
              ? 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400' 
              : 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400'
          }`}>
            {modeInfo.type}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {translateGameMode(match.mode)}
          </div>
        </div>
        
        {/* 경기 시간/날짜 */}
        <div className="min-w-[80px] text-center">
          <div className="font-medium text-gray-900 dark:text-gray-100">{formatRelativeTime(match.matchTimestamp)}</div>
          <div className="text-xs text-gray-500">{formatTime(match.matchTimestamp)}</div>
        </div>
        
        {/* 등수 */}
        <div className="min-w-[60px] font-bold text-xl text-blue-600 dark:text-blue-400">
          #{match.rank ?? '-'}
        </div>
        
        {/* 킬 */}
        <div className="min-w-[48px] text-center">
          <div className="font-bold text-gray-900 dark:text-gray-100">{match.kills ?? 0}</div>
          <div className="text-xs text-gray-500">킬</div>
        </div>
        
        {/* 데미지 */}
        <div className="min-w-[60px] text-center">
          <div className="font-bold text-gray-900 dark:text-gray-100">{(match.damage ?? 0).toFixed(1)}</div>
          <div className="text-xs text-gray-500">데미지</div>
        </div>
        
        {/* 이동거리 */}
        <div className="min-w-[70px] text-center">
          <div className="font-bold text-gray-900 dark:text-gray-100">{match.distance ? (match.distance/1000).toFixed(2) : '0.00'}km</div>
          <div className="text-xs text-gray-500">이동</div>
        </div>
        
        {/* opGrade */}
        <div className="min-w-[60px] text-center">
          <div className="font-bold text-orange-500">{match.opGrade ?? '-'}</div>
          <div className="text-xs text-gray-500">등급</div>
        </div>
        
        {/* 승/패, Top10 */}
        <div className="min-w-[60px] text-center">
          <div className={`font-bold ${match.win ? 'text-blue-600' : 'text-gray-400'}`}>
            {match.win ? 'WIN' : '-'}
          </div>
          <div className="text-xs text-gray-500">{match.top10 ? 'Top10' : ''}</div>
        </div>
        
        {/* 팀 전체 딜량 */}
        <div className="min-w-[70px] text-center">
          <div className="font-bold text-gray-900 dark:text-gray-100">
            {typeof match.totalTeamDamage === 'number' ? match.totalTeamDamage.toFixed(1) : '-'}
          </div>
          <div className="text-xs text-gray-500">팀딜</div>
        </div>
        
        {/* 팀원 */}
        <div className="flex-1 min-w-[120px] text-sm">
          {Array.isArray(match.teammatesDetail) && match.teammatesDetail.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {match.teammatesDetail.map((t, i) => (
                <span 
                  key={t.name} 
                  className={`px-2 py-1 rounded-full text-xs ${
                    t.isSelf 
                      ? 'bg-blue-100 text-blue-800 font-bold' 
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {t.name}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
        
        {/* MMR 변화량 */}
        <div className="min-w-[60px] text-center">
          <RankChangeIndicator prevScore={prevScore} currentScore={currentScore} />
        </div>
        
        {/* 펼치기 화살표 */}
        <div className="min-w-[40px] text-center">
          <button 
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isOpen 
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            <span className={`transform transition-transform ${isOpen ? 'rotate-90' : ''}`}>
              ▶
            </span>
          </button>
        </div>
      </div>
      
      {/* 상세 정보 (팀원별 스탯, 상세 로그) */}
      {isOpen && (
        <div className="mt-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-inner">
          {/* 경기 상세 정보 헤더 */}
          <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              📊 경기 상세 분석
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {match.mapName && `${match.mapName} • `}
              {translateGameMode(match.mode)} • 
              {Math.floor((match.survivalTime || match.surviveTime || 0)/60)}분 생존
            </div>
          </div>
          
          <MatchTeammateStats teammatesDetail={match.teammatesDetail} />
          <div className="mt-6">
            <MatchDetailLog match={match} />
          </div>
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
