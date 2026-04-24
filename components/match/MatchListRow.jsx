import MatchDetailLog from './MatchDetailLog.jsx';
import MatchTeammateStats from './MatchTeammateStats.jsx';
import RankChangeIndicator from '../ui/RankChangeIndicator.jsx';
import { getMapName } from '../../utils/mapUtils';

// 개인 퍼포먼스 점수 (PPS) 계산
function calcPPS(match) {
  const damage      = match.damage || 0
  const kills       = match.kills || 0
  const assists     = match.assists || 0
  const surviveTime = match.survivalTime || match.surviveTime || 0
  const rank        = match.rank ?? match.placement ?? 100
  const totalSquads = match.totalSquads || 100

  const base           = damage * 0.3 + kills * 20 + assists * 8
  const survivalBonus  = Math.min(25, (surviveTime / 60) * 1.2)
  const placementBonus = Math.max(0, ((totalSquads - rank) / totalSquads) * 50)
  const total          = base + survivalBonus + placementBonus

  if (total >= 150) return { grade: 'S+', score: Math.round(total), color: 'text-purple-600', bg: 'bg-purple-50 border-purple-300' }
  if (total >= 110) return { grade: 'S',  score: Math.round(total), color: 'text-yellow-500', bg: 'bg-yellow-50 border-yellow-300' }
  if (total >= 75)  return { grade: 'A',  score: Math.round(total), color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200' }
  if (total >= 45)  return { grade: 'B',  score: Math.round(total), color: 'text-blue-500',   bg: 'bg-blue-50 border-blue-200' }
  if (total >= 20)  return { grade: 'C',  score: Math.round(total), color: 'text-gray-500',   bg: 'bg-gray-100 border-gray-200' }
  return                   { grade: 'D',  score: Math.round(total), color: 'text-gray-300',   bg: 'bg-gray-50 border-gray-100' }
}

// 팀 기여도 계산 (teammatesDetail 기반)
function calcTeamContrib(match, myNickname) {
  const teammates = match.teammatesDetail
  if (!Array.isArray(teammates) || teammates.length < 2) return null

  const lower = myNickname?.toLowerCase()
  const me = teammates.find((t) => t.name?.toLowerCase() === lower)
  if (!me) return null

  const teamKills  = teammates.reduce((s, t) => s + (t.kills  || 0), 0)
  const teamDamage = teammates.reduce((s, t) => s + (t.damage || 0), 0)
  const teamDbnos  = teammates.reduce((s, t) => s + (t.dbnos  || 0), 0)

  return {
    killPct:   teamKills  > 0 ? Math.round((me.kills  || 0) / teamKills  * 100) : 0,
    damagePct: teamDamage > 0 ? Math.round((me.damage || 0) / teamDamage * 100) : 0,
    dbnosPct:  teamDbnos  > 0 ? Math.round((me.dbnos  || 0) / teamDbnos  * 100) : 0,
    teamKills,
    teamDamage: Math.round(teamDamage),
    teamSize: teammates.length,
    myKills:  me.kills  || 0,
    myDamage: Math.round(me.damage || 0),
    myDbnos:  me.dbnos  || 0,
  }
}

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

  // matchType: PUBG API의 공식 필드 (official=일반, ranked=경쟁전, event/casual=이벤트)
  const getGameModeInfo = (match) => {
    const mt = (match.matchType || '').toLowerCase();

    // 1순위: matchType 필드 (가장 정확)
    if (mt === 'ranked' || mt === 'competitive') {
      return { type: 'ranked', label: '경쟁전', color: '#dc2626' };
    }
    if (mt === 'event' || mt === 'casual' || mt === 'airoyale') {
      return { type: 'event', label: '이벤트', color: '#f59e0b' };
    }
    if (mt === 'official' || mt === 'training') {
      // official은 일반게임, mode로 서브 구분
      const mode = (match.mode || '').toLowerCase();
      if (mode.includes('event') || mode.includes('arcade')) {
        return { type: 'event', label: '이벤트', color: '#f59e0b' };
      }
      return { type: 'normal', label: '일반', color: '#059669' };
    }

    // 2순위: matchType이 없는 경우 mode 필드로 추정
    const mode = (match.mode || '').toLowerCase();
    if (mode.includes('ranked')) {
      return { type: 'ranked', label: '경쟁전', color: '#dc2626' };
    }
    if (mode.includes('event') || mode.includes('arcade')) {
      return { type: 'event', label: '이벤트', color: '#f59e0b' };
    }
    return { type: 'normal', label: '일반', color: '#059669' };
  };

  const modeInfo = getGameModeInfo(match);

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
          {match.mapName && (
            <div className="text-[10px] text-gray-400 mt-0.5 truncate">
              {getMapName(match.mapName)}
            </div>
          )}
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

        {/* PPS 등급 배지 */}
        {(() => {
          const pps = calcPPS(match)
          return (
            <div className="w-12 flex-shrink-0 text-center">
              <span className={`inline-block px-1.5 py-0.5 text-xs font-black rounded border ${pps.bg} ${pps.color}`}>
                {pps.grade}
              </span>
              <div className="text-[10px] text-gray-400 mt-0.5">PPS</div>
            </div>
          )
        })()}

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
              {match.teammatesDetail.map((t) => {
                const shard = playerData?.profile?.shardId || 'steam';
                const chip = (
                  <span
                    key={t.name}
                    className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 max-w-[110px] ${
                      t.isSelf
                        ? 'bg-blue-100 text-blue-700 font-bold border border-blue-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors'
                    }`}
                  >
                    {t.clanTag && (
                      <span className="text-gray-400 font-normal">[{t.clanTag}]</span>
                    )}
                    <span className="truncate">{t.name}</span>
                  </span>
                );
                if (t.isSelf) return chip;
                return (
                  <a key={t.name} href={`/player/${shard}/${encodeURIComponent(t.name)}`}>
                    {chip}
                  </a>
                );
              })}
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
              {match.mapName && <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{getMapName(match.mapName)}</span>}
              <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{translateGameMode(match.mode)}</span>
              <span className="text-gray-400">{Math.round((match.survivalTime || match.surviveTime || 0) / 60)}분 생존</span>
            </div>
          </div>
          {/* 팀 기여도 + PPS 상세 */}
          {(() => {
            const myNick  = playerData?.profile?.nickname
            const contrib = calcTeamContrib(match, myNick)
            const pps     = calcPPS(match)
            return (
              <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* PPS 상세 */}
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-600">퍼포먼스 점수 (PPS)</span>
                    <span className={`text-lg font-black ${pps.color}`}>{pps.grade}</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { label: '딜량', val: match.damage || 0, pts: Math.round((match.damage || 0) * 0.3), fmt: (v) => Math.round(v) },
                      { label: '킬',   val: match.kills || 0,  pts: (match.kills || 0) * 20,              fmt: (v) => v },
                      { label: '어시', val: match.assists || 0,pts: (match.assists || 0) * 8,             fmt: (v) => v },
                      { label: '생존', val: Math.round((match.survivalTime || match.surviveTime || 0) / 60), pts: Math.round(Math.min(25, ((match.survivalTime || match.surviveTime || 0) / 60) * 1.2)), fmt: (v) => `${v}분` },
                    ].map(({ label, val, pts, fmt }) => (
                      <div key={label} className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 w-10">{label}</span>
                        <span className="text-gray-700 font-medium">{fmt(val)}</span>
                        <span className="text-blue-500 font-bold">+{pts}pt</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-100 pt-1.5 flex justify-between text-xs">
                      <span className="text-gray-500">총점</span>
                      <span className={`font-black ${pps.color}`}>{pps.score}pt</span>
                    </div>
                  </div>
                </div>

                {/* 팀 기여도 */}
                {contrib ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-600">팀 내 기여도</span>
                      <span className="text-[10px] text-gray-400">{contrib.teamSize}인 스쿼드</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: '딜 기여', pct: contrib.damagePct, my: `${contrib.myDamage}`, total: `${contrib.teamDamage}`, color: 'bg-orange-400' },
                        { label: '킬 기여', pct: contrib.killPct,   my: `${contrib.myKills}킬`, total: `${contrib.teamKills}킬`, color: 'bg-red-400' },
                        { label: '넉다운', pct: contrib.dbnosPct,  my: `${contrib.myDbnos}회`, total: null, color: 'bg-purple-400' },
                      ].map(({ label, pct, my, total, color }) => (
                        <div key={label}>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-gray-500">{label}</span>
                            <span className="font-bold text-gray-700">
                              {my}{total ? ` / 팀 ${total}` : ''} <span className="text-blue-600">({pct}%)</span>
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 flex items-center justify-center">
                    <span className="text-xs text-gray-400">팀 데이터 없음 (솔로 또는 DB 매치)</span>
                  </div>
                )}
              </div>
            )
          })()}

          <MatchTeammateStats teammatesDetail={match.teammatesDetail} shard={playerData?.profile?.shardId || 'steam'} />
          <div className="mt-4">
            <MatchDetailLog match={match} playerNickname={playerData?.profile?.name || ''} />
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
