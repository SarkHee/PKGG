
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
    <div 
      className={`border border-gray-200 dark:border-gray-600 rounded-xl mb-4 p-4 cursor-pointer transition-all hover:shadow-md ${
        isOpen ? 'bg-blue-50 dark:bg-blue-900/20 shadow-md' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
      }`} 
      onClick={onToggle}
    >
      <div className="flex items-center gap-4 flex-wrap">
        {/* 경기 모드 타입 (경쟁전/일반) */}
        <div className="min-w-[60px] text-center">
          <div className={`text-xs font-bold px-3 py-1 rounded-full border ${
            match.modeType === '경쟁전' 
              ? 'text-red-600 bg-red-50 border-red-200' 
              : 'text-green-600 bg-green-50 border-green-200'
          }`}>
            {match.modeType || '일반'}
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
        <div className="min-w-[32px] text-center text-lg text-gray-400">
          {isOpen ? '▾' : '▸'}
        </div>
      </div>
      
      {/* 상세 정보 (팀원별 스탯, 상세 로그) */}
      {isOpen && (
        <div className="mt-6 bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border-t border-gray-200 dark:border-gray-600">
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
