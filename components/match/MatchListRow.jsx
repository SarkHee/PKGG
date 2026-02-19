import MatchDetailLog from './MatchDetailLog.jsx';
import MatchTeammateStats from './MatchTeammateStats.jsx';
import RankChangeIndicator from '../ui/RankChangeIndicator.jsx';

export default function MatchListRow({
  match,
  isOpen,
  onToggle,
  prevMatch,
  playerData,
}) {
  const prevScore = prevMatch?.avgMmr;
  const currentScore = match.avgMmr;

  const translateGameMode = (mode) => {
    if (!mode) return mode;
    const modeStr = mode.toString().toLowerCase();
    if (modeStr === 'squad' || modeStr === 'squad-fpp') return '스쿼드';
    if (modeStr === 'duo' || modeStr === 'duo-fpp') return '듀오';
    if (modeStr === 'solo' || modeStr === 'solo-fpp') return '솔로';
    return mode;
  };

  const getGameModeInfo = (match, playerData) => {
    if (match.modeType && match.modeType !== '일반') {
      return { type: 'ranked', label: match.modeType, color: '#dc2626' };
    }

    const modeFields = [match.gameMode, match.matchType, match.mode, match.type, match.queueType, match.customMode];
    const rankedKeywords = ['ranked', 'rank', 'competitive', 'comp', 'rating', 'mmr'];

    for (const field of modeFields) {
      if (field && typeof field === 'string') {
        const fieldLower = field.toLowerCase();
        for (const keyword of rankedKeywords) {
          if (fieldLower.includes(keyword.toLowerCase())) {
            return { type: 'ranked', label: '경쟁전', color: '#dc2626' };
          }
        }
      }
    }

    if (playerData?.rankedSummary) {
      const rankedData = playerData.rankedSummary;
      if (rankedData.games >= 50 || rankedData.roundsPlayed >= 50) {
        if (match.matchTimestamp) {
          const daysSinceMatch = (Date.now() - match.matchTimestamp) / (1000 * 60 * 60 * 24);
          if (daysSinceMatch <= 7) {
            return { type: 'ranked', label: '경쟁전', color: '#dc2626' };
          }
        }
      }
    }

    const gameMode = match.gameMode || match.mode || '';
    if (gameMode.toLowerCase().includes('event') || gameMode.toLowerCase().includes('arcade')) {
      return { type: 'event', label: '이벤트', color: '#f59e0b' };
    }

    return { type: 'normal', label: '일반', color: '#059669' };
  };

  const modeInfo = getGameModeInfo(match, playerData);

  const isWin = match.win || (match.rank === 1) || (match.placement === 1);
  const isTop10 = match.top10 || ((match.rank || match.placement) <= 10);
  const rank = match.rank ?? match.placement ?? '-';

  // 등수에 따른 강조 색상
  const getRankStyle = (rank) => {
    if (rank === 1) return 'text-yellow-500 font-black text-2xl';
    if (rank <= 3) return 'text-orange-400 font-black text-xl';
    if (rank <= 10) return 'text-blue-500 font-bold text-xl';
    return 'text-gray-500 font-bold text-lg';
  };

  if (!match)
    return <div className="p-4 text-center text-gray-400">경기 데이터 없음</div>;

  return (
    <div
      className={`rounded-xl mb-3 cursor-pointer transition-all duration-200 overflow-hidden border ${
        isWin
          ? isOpen
            ? 'border-blue-400 shadow-md shadow-blue-100'
            : 'border-blue-200 hover:border-blue-300 hover:shadow-sm hover:shadow-blue-100'
          : isOpen
            ? 'border-gray-300 shadow-md'
            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
      onClick={onToggle}
    >
      {/* 경기 행 */}
      <div className={`flex items-center gap-3 px-4 py-3 ${
        isWin
          ? 'bg-gradient-to-r from-blue-50 to-white'
          : 'bg-white hover:bg-gray-50'
      }`}>

        {/* 왼쪽 컬러 바 (승/패 표시) */}
        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${
          isWin ? 'bg-blue-500' : 'bg-gray-300'
        }`} />

        {/* 모드 타입 */}
        <div className="w-16 flex-shrink-0 text-center">
          <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
            modeInfo.type === 'ranked'
              ? 'bg-red-100 text-red-600'
              : modeInfo.type === 'event'
                ? 'bg-amber-100 text-amber-600'
                : 'bg-emerald-100 text-emerald-600'
          }`}>
            {modeInfo.label}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {translateGameMode(match.mode)}
          </div>
        </div>

        {/* 시간 */}
        <div className="w-16 flex-shrink-0 text-center">
          <div className="text-sm font-medium text-gray-700">
            {formatRelativeTime(match.matchTimestamp)}
          </div>
          <div className="text-xs text-gray-400">
            {formatTime(match.matchTimestamp)}
          </div>
        </div>

        {/* 등수 - 핵심 강조 */}
        <div className="w-14 flex-shrink-0 text-center">
          {rank === 1 ? (
            <div className="flex flex-col items-center">
              <span className="text-lg">🏆</span>
              <span className="text-xs font-black text-yellow-500">1등</span>
            </div>
          ) : (
            <div>
              <span className={`${getRankStyle(rank)}`}>#{rank}</span>
            </div>
          )}
        </div>

        {/* 킬 */}
        <div className="w-12 flex-shrink-0 text-center">
          <div className={`text-lg font-black ${(match.kills ?? 0) >= 5 ? 'text-red-500' : (match.kills ?? 0) >= 3 ? 'text-orange-400' : 'text-gray-800'}`}>
            {match.kills ?? 0}
          </div>
          <div className="text-xs text-gray-400">킬</div>
        </div>

        {/* 어시스트 */}
        <div className="w-12 flex-shrink-0 text-center">
          <div className="text-base font-bold text-gray-600">
            {match.assists ?? 0}
          </div>
          <div className="text-xs text-gray-400">어시</div>
        </div>

        {/* 데미지 */}
        <div className="w-20 flex-shrink-0 text-center">
          <div className={`text-base font-black ${(match.damage ?? 0) >= 400 ? 'text-blue-600' : (match.damage ?? 0) >= 200 ? 'text-gray-800' : 'text-gray-500'}`}>
            {(match.damage ?? 0).toFixed(0)}
          </div>
          <div className="text-xs text-gray-400">딜량</div>
        </div>

        {/* 생존 시간 */}
        <div className="w-16 flex-shrink-0 text-center">
          <div className="text-sm font-bold text-gray-700">
            {Math.round((match.survivalTime || match.surviveTime || 0) / 60)}분
          </div>
          <div className="text-xs text-gray-400">생존</div>
        </div>

        {/* 승/패 배지 */}
        <div className="w-14 flex-shrink-0 text-center">
          {isWin ? (
            <span className="inline-block px-2 py-1 bg-blue-500 text-white text-xs font-black rounded-lg shadow-sm">
              WIN
            </span>
          ) : isTop10 ? (
            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-lg border border-gray-200">
              TOP10
            </span>
          ) : (
            <span className="inline-block px-2 py-0.5 text-gray-300 text-xs">-</span>
          )}
        </div>

        {/* 팀원 */}
        <div className="flex-1 min-w-0">
          {Array.isArray(match.teammatesDetail) && match.teammatesDetail.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {match.teammatesDetail.map((t) => (
                <span
                  key={t.name}
                  className={`px-2 py-0.5 rounded-full text-xs truncate max-w-[80px] ${
                    t.isSelf
                      ? 'bg-blue-100 text-blue-700 font-bold border border-blue-200'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {t.name}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-gray-300 text-xs">-</span>
          )}
        </div>

        {/* MMR 변화량 */}
        <div className="w-14 flex-shrink-0 text-center">
          <RankChangeIndicator prevScore={prevScore} currentScore={currentScore} />
        </div>

        {/* 펼치기 버튼 */}
        <div className="w-8 flex-shrink-0 text-center">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto transition-all ${
            isOpen
              ? 'bg-blue-100 text-blue-500'
              : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
          }`}>
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* 상세 정보 */}
      {isOpen && (
        <div className="bg-gray-50 border-t border-gray-200 p-5">
          <div className="mb-3 pb-3 border-b border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-500 rounded-full inline-block"></span>
              경기 상세 분석
            </h3>
            <div className="text-xs text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
              {match.mapName && <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{match.mapName}</span>}
              <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{translateGameMode(match.mode)}</span>
              <span className="text-gray-400">{Math.round((match.survivalTime || match.surviveTime || 0) / 60)}분 생존</span>
            </div>
          </div>
          <MatchTeammateStats teammatesDetail={match.teammatesDetail} />
          <div className="mt-4">
            <MatchDetailLog match={match} />
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(ts) {
  if (!ts) return '-';
  const now = new Date();
  const t = new Date(ts);
  const diff = Math.floor((now - t) / 1000);
  if (diff < 60) return `${diff}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

function formatTime(ts) {
  if (!ts) return '-';
  const t = new Date(ts);
  return `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`;
}
