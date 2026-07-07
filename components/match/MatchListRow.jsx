import { useState, useEffect } from 'react'
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

// 이벤트/연습장 경기 판별 (봇 분석 제외 대상)
const EVENT_MATCH_TYPES = new Set(['event', 'casual', 'airoyale', 'arcade', 'custom', 'training', 'trainingroom'])
const EVENT_MODE_KEYWORDS = ['tdm', 'ibr', 'arcade', 'training', 'clansolo', 'clansquad', 'heistroyale']
const EVENT_MAP_KEYWORDS  = ['range_main', '_tdm_', '_training_', 'pillarcompound', 'boardwalk']
function isEventOrPractice(match) {
  const mt = (match.matchType || '').toLowerCase()
  const gm = (match.mode      || '').toLowerCase()
  const mn = (match.mapName   || '').toLowerCase()
  return EVENT_MATCH_TYPES.has(mt)
    || EVENT_MODE_KEYWORDS.some(k => gm.includes(k))
    || EVENT_MAP_KEYWORDS.some(k => mn.includes(k))
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

function getWeaponLabel(weaponId) {
  if (!weaponId) return null
  const v = weaponId.toLowerCase()
  if (v.includes('motorbike') || v.includes('sidecar')) return '오토바이'
  if (v.includes('uaz')) return 'UAZ'
  if (v.includes('pickup')) return '픽업트럭'
  if (v.includes('dacia')) return '다시아'
  if (v.includes('buggy')) return '버기'
  if (v.includes('mirado')) return '미라도'
  if (v.includes('rony')) return '로니'
  if (v.includes('snowmobile') || v.includes('snowbike')) return '설상 차량'
  if (v.includes('aquarail')) return '아쿠아레일'
  if (v.includes('boat') || v.includes('pg117') || v.includes('ponycoupe')) return '보트'
  if (v.includes('tukshai') || v.includes('tuktuk')) return '툭샤이'
  if (v.includes('helicopter') || v.includes('heli')) return '헬기'
  if (v.includes('brdm')) return 'BRDM-2'
  if (v.startsWith('bp_') || v.includes('vehicle') || v.includes('van') || v.includes('truck')) return '차량'
  if (/^player(female|male)/i.test(weaponId)) return '근접'
  if (weaponId === 'Pickaxe' || weaponId === 'Crowbar' || weaponId === 'Machete' || weaponId === 'Sickle') return '근접 무기'
  return weaponId.replace(/^(Weap|Proj)/, '').replace(/_C$/, '').replace(/_/g, ' ')
}

export default function MatchListRow({
  match,
  isOpen,
  onToggle,
  prevMatch,
  playerData,
}) {
  const [detailTab, setDetailTab]           = useState('summary')
  const [teamDmg, setTeamDmg]               = useState(null)
  const [teamDmgLoading, setTeamDmgLoading] = useState(false)

  const handleTeamDamageClick = (e) => {
    e.stopPropagation()
    setDetailTab('log')
    if (!isOpen) onToggle()
  }

  useEffect(() => {
    if (!isOpen || !match?.matchId || !match?.hasTeamDamage) return
    if (teamDmg !== null) return
    setTeamDmgLoading(true)
    fetch(`/api/team-damage/${match.matchId}`)
      .then((r) => r.json())
      .then((data) => setTeamDmg(data.rows ?? []))
      .catch(() => setTeamDmg([]))
      .finally(() => setTeamDmgLoading(false))
  }, [isOpen, match?.matchId, match?.hasTeamDamage])

  // 팀 피해 공격자 집계 맵 (닉네임 소문자 → 합산 데이터)
  const friendlyFireMap = {}
  if (Array.isArray(teamDmg)) {
    const myTeamNames = new Set(
      (match.teammatesDetail ?? []).map((t) => t.name?.toLowerCase()).filter(Boolean)
    )
    for (const row of teamDmg) {
      const a = row.attackerName?.toLowerCase()
      if (!a || !myTeamNames.has(a)) continue
      if (!friendlyFireMap[a]) friendlyFireMap[a] = { totalDamage: 0, groggyCount: 0, killCount: 0 }
      friendlyFireMap[a].totalDamage  += row.totalDamage  ?? 0
      friendlyFireMap[a].groggyCount  += row.groggyCount  ?? 0
      friendlyFireMap[a].killCount    += row.killCount     ?? 0
    }
  }

  function getFriendlyFireBadge(name) {
    const ff = friendlyFireMap[name?.toLowerCase()]
    if (!ff) return null
    if (ff.killCount >= 1)                      return { label: '팀킬', cls: 'bg-red-100 text-red-600 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700' }
    if (ff.groggyCount >= 1)                    return { label: '아군 기절', cls: 'bg-orange-100 text-orange-600 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700' }
    if (ff.totalDamage >= 100)                  return { label: '아군 딜', cls: 'bg-yellow-100 text-yellow-600 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700' }
    return null
  }
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

  // matchType: PUBG API 공식 필드
  // official=일반, ranked=경쟁전, event/casual/airoyale=이벤트,
  // custom=사용자 지정, training=훈련장
  const getGameModeInfo = (match) => {
    const mt   = (match.matchType || '').toLowerCase();
    const mode = (match.mode     || '').toLowerCase();
    const map  = (match.mapName  || '').toLowerCase();

    // 1순위: matchType 필드 (가장 정확)
    if (mt === 'ranked' || mt === 'competitive') {
      return { type: 'ranked', label: '경쟁전', color: '#dc2626' };
    }
    if (mt === 'event' || mt === 'casual' || mt === 'airoyale' || mt === 'arcade') {
      return { type: 'event', label: '이벤트', color: '#f59e0b' };
    }
    if (mt === 'custom') {
      return { type: 'custom', label: '사용자 지정', color: '#7c3aed' };
    }
    // PUBG API: 훈련장 = 'trainingroom', 구형 = 'training'
    if (mt === 'training' || mt === 'trainingroom') {
      return { type: 'training', label: '훈련장', color: '#0891b2' };
    }
    if (mt === 'official') {
      if (mode.includes('event') || mode.includes('arcade') || mode.includes('heistroyale') || mode.includes('clansolo') || mode.includes('clansquad') || map.includes('safehouse')) {
        return { type: 'event', label: '이벤트', color: '#f59e0b' };
      }
      if (mode.includes('tdm') || mode.includes('training') || map.includes('range_main') || map.includes('_training_')) {
        return { type: 'training', label: '훈련장', color: '#0891b2' };
      }
      return { type: 'normal', label: '일반', color: '#059669' };
    }

    // 2순위: matchType 미저장(DB 캐시) → mode·mapName으로 추정
    if (mode.includes('ranked')) {
      return { type: 'ranked', label: '경쟁전', color: '#dc2626' };
    }
    if (mode.includes('event') || mode.includes('arcade') || mode.includes('heistroyale') || mode.includes('clansolo') || mode.includes('clansquad') || map.includes('safehouse')) {
      return { type: 'event', label: '이벤트', color: '#f59e0b' };
    }
    if (mode.includes('tdm') || mode.includes('training') || map.includes('range_main') || map.includes('_training_')) {
      return { type: 'training', label: '훈련장', color: '#0891b2' };
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
            ? 'border-gray-300 dark:border-gray-600 shadow-md dark:shadow-none'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
      }`}
      onClick={onToggle}
    >
      {/* ── 모바일 카드 레이아웃 (sm 미만) ── */}
      <div className={`sm:hidden px-3 py-3 ${isWin ? 'bg-gradient-to-r from-blue-50 dark:from-blue-900/20 to-white dark:to-gray-900' : 'bg-white dark:bg-gray-900'}`}>
        {/* 1행: 모드 뱃지 + 맵/모드 + 시간 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              modeInfo.type === 'ranked' ? 'bg-red-100 text-red-600'
              : modeInfo.type === 'event' ? 'bg-amber-100 text-amber-600'
              : modeInfo.type === 'custom' ? 'bg-purple-100 text-purple-600'
              : modeInfo.type === 'training' ? 'bg-cyan-100 text-cyan-600'
              : 'bg-emerald-100 text-emerald-600'
            }`}>{modeInfo.label}</span>
            <span className="text-xs text-gray-400">{translateGameMode(match.mode)}</span>
            {match.mapName && <span className="text-xs text-gray-400">· {getMapName(match.mapName)}</span>}
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0" suppressHydrationWarning>{formatRelativeTime(match.matchTimestamp)}</span>
        </div>

        {/* 2행: 등수(좌) + WIN뱃지 + MMR(우) */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {rank === 1 ? (
              <span className="text-xl font-black text-yellow-500">🏆 1등</span>
            ) : (
              <span className={`font-black ${rank <= 3 ? 'text-orange-400 text-xl' : rank <= 10 ? 'text-blue-500 text-lg' : 'text-gray-500 text-lg'}`}>
                #{rank}
              </span>
            )}
            {isWin ? (
              <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-black rounded-lg">WIN</span>
            ) : isTop10 ? (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-lg border border-gray-200">TOP10</span>
            ) : null}
          </div>
          <RankChangeIndicator prevScore={prevScore} currentScore={currentScore} />
        </div>

        {/* 3행: 핵심 스탯 4개 */}
        <div className="grid grid-cols-4 gap-1 mb-1">
          <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-lg py-1.5">
            {match.isBotCorrected === true ? (
              <>
                <div className={`text-base font-black ${(match.kills ?? 0) >= 5 ? 'text-red-500' : (match.kills ?? 0) >= 3 ? 'text-orange-400' : 'text-gray-800 dark:text-gray-200'}`}>
                  {match.kills ?? 0}
                </div>
                <div className="text-[9px] text-gray-400">총킬</div>
                <div className="text-[9px] mt-0.5">
                  <span className="text-cyan-500">실{Math.max(0, match.realKills ?? 0)}</span>
                  <span className="text-gray-400"> / 봇{match.botKills ?? 0}</span>
                </div>
              </>
            ) : (
              <>
                <div className={`text-base font-black ${(match.kills ?? 0) >= 5 ? 'text-red-500' : (match.kills ?? 0) >= 3 ? 'text-orange-400' : 'text-gray-800 dark:text-gray-200'}`}>
                  {match.kills ?? 0}
                </div>
                <div className="text-[10px] text-gray-400">킬</div>
                {!isEventOrPractice(match) && (
                  <div className="text-[9px] text-blue-400">(분석 중...)</div>
                )}
              </>
            )}
          </div>
          <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-lg py-1.5">
            <div className="text-sm font-bold text-gray-600">{match.assists ?? 0}</div>
            <div className="text-[10px] text-gray-400">어시</div>
          </div>
          <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-lg py-1.5">
            <div className={`text-sm font-black ${(match.damage ?? 0) >= 400 ? 'text-blue-600' : (match.damage ?? 0) >= 200 ? 'text-gray-800' : 'text-gray-500'}`}>
              {(match.damage ?? 0).toFixed(0)}
            </div>
            <div className="text-[10px] text-gray-400">딜량</div>
          </div>
          <div className="text-center bg-gray-50 dark:bg-gray-800 rounded-lg py-1.5">
            <div className="text-sm font-bold text-gray-700">
              {Math.round((match.survivalTime || match.surviveTime || 0) / 60)}분
            </div>
            <div className="text-[10px] text-gray-400">생존</div>
          </div>
        </div>

        {/* 4행: 팀피해 뱃지 + 펼치기 버튼 */}
        <div className="flex items-center justify-between mt-1">
          {match.hasTeamDamage === true ? (
            <button
              onClick={handleTeamDamageClick}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                match.teamDamageType === 'kill'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-500 dark:text-red-400 hover:bg-red-100'
                  : match.teamDamageType === 'groggy'
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100'
                  : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700 text-orange-500 dark:text-orange-400 hover:bg-orange-100'
              }`}
            >
              {match.teamDamageType === 'kill' ? '💀 팀킬' : match.teamDamageType === 'groggy' ? '⚠️ 팀기절' : '⚠️ 팀피해'}
            </button>
          ) : <div />}
          <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-blue-100 text-blue-500' : 'text-gray-300'}`}>
            <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── PC 테이블 레이아웃 (sm 이상) ── */}
      <div className={`hidden sm:flex items-center gap-3 px-4 py-3 ${
        isWin ? 'bg-gradient-to-r from-blue-50 dark:from-blue-900/20 to-white dark:to-gray-900' : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}>
        {/* 왼쪽 컬러 바 */}
        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${isWin ? 'bg-blue-500' : 'bg-gray-300'}`} />

        {/* 모드 타입 */}
        <div className="w-16 flex-shrink-0 text-center">
          <div className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
            modeInfo.type === 'ranked' ? 'bg-red-100 text-red-600'
            : modeInfo.type === 'event' ? 'bg-amber-100 text-amber-600'
            : modeInfo.type === 'custom' ? 'bg-purple-100 text-purple-600'
            : modeInfo.type === 'training' ? 'bg-cyan-100 text-cyan-600'
            : 'bg-emerald-100 text-emerald-600'
          }`}>{modeInfo.label}</div>
          <div className="text-xs text-gray-400 mt-0.5">{translateGameMode(match.mode)}</div>
          {match.mapName && <div className="text-[10px] text-gray-400 mt-0.5 truncate">{getMapName(match.mapName)}</div>}
        </div>

        {/* 시간 */}
        <div className="w-16 flex-shrink-0 text-center">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300" suppressHydrationWarning>{formatRelativeTime(match.matchTimestamp)}</div>
          <div className="text-xs text-gray-400">{formatTime(match.matchTimestamp)}</div>
        </div>

        {/* 등수 */}
        <div className="w-14 flex-shrink-0 text-center">
          {rank === 1 ? (
            <div className="flex flex-col items-center"><span className="text-lg">🏆</span><span className="text-xs font-black text-yellow-500">1등</span></div>
          ) : (
            <span className={getRankStyle(rank)}>#{rank}</span>
          )}
        </div>

        {/* 킬 */}
        <div className="w-12 flex-shrink-0 text-center">
          {match.isBotCorrected === true ? (
            <>
              <div className={`text-lg font-black ${(match.kills ?? 0) >= 5 ? 'text-red-500' : (match.kills ?? 0) >= 3 ? 'text-orange-400' : 'text-gray-800 dark:text-gray-200'}`}>
                {match.kills ?? 0}
              </div>
              <div className="text-[10px] text-gray-400">총킬</div>
              <div className="text-[10px] mt-0.5">
                <span className="text-cyan-500">실{match.realKills ?? 0}</span>
                <span className="text-gray-400"> / 봇{match.botKills ?? 0}</span>
              </div>
            </>
          ) : (
            <>
              <div className={`text-lg font-black ${(match.kills ?? 0) >= 5 ? 'text-red-500' : (match.kills ?? 0) >= 3 ? 'text-orange-400' : 'text-gray-800 dark:text-gray-200'}`}>
                {match.kills ?? 0}
              </div>
              <div className="text-xs text-gray-400">킬</div>
              {!isEventOrPractice(match) && (
                <div className="text-[10px] text-blue-400">(분석 중...)</div>
              )}
            </>
          )}
        </div>

        {/* 어시스트 */}
        <div className="w-12 flex-shrink-0 text-center">
          <div className="text-base font-bold text-gray-600 dark:text-gray-400">{match.assists ?? 0}</div>
          <div className="text-xs text-gray-400">어시</div>
        </div>

        {/* 데미지 */}
        <div className="w-20 flex-shrink-0 text-center">
          <div className={`text-base font-black ${(match.damage ?? 0) >= 400 ? 'text-blue-600' : (match.damage ?? 0) >= 200 ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>{(match.damage ?? 0).toFixed(0)}</div>
          <div className="text-xs text-gray-400">딜량</div>
        </div>

        {/* 생존 시간 */}
        <div className="w-16 flex-shrink-0 text-center">
          <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{Math.round((match.survivalTime || match.surviveTime || 0) / 60)}분</div>
          <div className="text-xs text-gray-400">생존</div>
        </div>

        {/* PPS */}
        {(() => {
          const pps = calcPPS(match)
          return (
            <div className="w-12 flex-shrink-0 text-center">
              <span className={`inline-block px-1.5 py-0.5 text-xs font-black rounded border ${pps.bg} ${pps.color}`}>{pps.grade}</span>
              <div className="text-[10px] text-gray-400 mt-0.5">PPS</div>
            </div>
          )
        })()}

        {/* 승/패 배지 */}
        <div className="w-14 flex-shrink-0 text-center">
          {isWin ? (
            <span className="inline-block px-2 py-1 bg-blue-500 text-white text-xs font-black rounded-lg shadow-sm">WIN</span>
          ) : isTop10 ? (
            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-lg border border-gray-200">TOP10</span>
          ) : (
            <span className="inline-block px-2 py-0.5 text-gray-300 text-xs">-</span>
          )}
        </div>

        {/* 팀피해 뱃지 */}
        <div className="w-16 flex-shrink-0 text-center">
          {match.hasTeamDamage === true ? (
            <button
              onClick={handleTeamDamageClick}
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                match.teamDamageType === 'kill'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-500 dark:text-red-400 hover:bg-red-100'
                  : match.teamDamageType === 'groggy'
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100'
                  : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700 text-orange-500 dark:text-orange-400 hover:bg-orange-100'
              }`}
            >
              {match.teamDamageType === 'kill' ? '💀 팀킬' : match.teamDamageType === 'groggy' ? '⚠️ 팀기절' : '⚠️ 팀피해'}
            </button>
          ) : null}
        </div>

        {/* 팀원 */}
        <div className="flex-1 min-w-0">
          {Array.isArray(match.teammatesDetail) && match.teammatesDetail.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {match.teammatesDetail.map((t) => {
                const shard = playerData?.profile?.shardId || 'steam';
                const ffBadge = !t.isSelf ? getFriendlyFireBadge(t.name) : null
                const chip = (
                  <span key={t.name} className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 max-w-[160px] ${t.isSelf ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors'}`}>
                    {t.clanTag && <span className="text-gray-400 font-normal">[{t.clanTag}]</span>}
                    <span className="truncate">{t.name}</span>
                    {ffBadge && (
                      <span className={`flex-shrink-0 px-1 py-0.5 rounded text-[9px] font-bold border ${ffBadge.cls}`}>
                        {ffBadge.label}
                      </span>
                    )}
                  </span>
                );
                if (t.isSelf) return chip;
                return <a key={t.name} href={`/player/${shard}/${encodeURIComponent(t.name)}`}>{chip}</a>;
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
          <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto transition-all ${isOpen ? 'bg-blue-100 text-blue-500' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'}`}>
            <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* 상세 정보 */}
      {isOpen && (
        <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          {/* 경기 메타 + 탭 바 */}
          <div className="px-4 pt-3 pb-0 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {match.mapName && <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded text-xs">{getMapName(match.mapName)}</span>}
              <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded text-xs">{translateGameMode(match.mode)}</span>
              <span className="text-gray-400 text-xs">{Math.round((match.survivalTime || match.surviveTime || 0) / 60)}분 생존</span>
            </div>
            <div className="flex gap-1">
              {[
                { id: 'summary', label: '요약',     icon: '📊' },
                { id: 'log',     label: '전투 로그', icon: '🔍' },
              ].map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={(e) => { e.stopPropagation(); setDetailTab(id) }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
                    detailTab === id
                      ? 'text-blue-600 dark:text-blue-400 border-blue-500 bg-white dark:bg-gray-900'
                      : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <span className="mr-1">{icon}</span>{label}
                </button>
              ))}
            </div>
          </div>

          {/* 탭 콘텐츠 */}
          <div className="p-4">
            {/* 요약 탭 */}
            {detailTab === 'summary' && (() => {
              const myNick  = playerData?.profile?.nickname
              const contrib = calcTeamContrib(match, myNick)
              const pps     = calcPPS(match)
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* PPS 상세 */}
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400">퍼포먼스 점수 (PPS)</span>
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
                          <span className="text-gray-500 dark:text-gray-400 w-10">{label}</span>
                          <span className="text-gray-700 dark:text-gray-300 font-medium">{fmt(val)}</span>
                          <span className="text-blue-500 font-bold">+{pts}pt</span>
                        </div>
                      ))}
                      <div className="border-t border-gray-100 dark:border-gray-700 pt-1.5 flex justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">총점</span>
                        <span className={`font-black ${pps.color}`}>{pps.score}pt</span>
                      </div>
                    </div>
                  </div>

                  {/* 팀 기여도 */}
                  {contrib ? (
                    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400">팀 내 기여도</span>
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
                              <span className="text-gray-500 dark:text-gray-400">{label}</span>
                              <span className="font-bold text-gray-700 dark:text-gray-300">
                                {my}{total ? ` / 팀 ${total}` : ''} <span className="text-blue-600">({pct}%)</span>
                              </span>
                            </div>
                            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, pct)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-3 flex items-center justify-center">
                      <span className="text-xs text-gray-400">팀 데이터 없음 (솔로 또는 DB 매치)</span>
                    </div>
                  )}
                </div>
              )
            })()}
            {detailTab === 'summary' && (
              <MatchTeammateStats teammatesDetail={match.teammatesDetail} shard={playerData?.profile?.shardId || 'steam'} />
            )}

            {/* 전투 로그 탭 (팀 내 피해 포함) */}
            {detailTab === 'log' && (() => {
              const myNick = playerData?.profile?.nickname?.toLowerCase()
              const myTeamNames = new Set(
                (match.teammatesDetail ?? []).map((t) => t.name?.toLowerCase()).filter(Boolean)
              )
              const filtered = (teamDmg ?? []).filter((td) => {
                const a = td.attackerName?.toLowerCase()
                const v = td.victimName?.toLowerCase()
                return myTeamNames.has(a) || myTeamNames.has(v)
              })
              return (
                <>
                  <MatchDetailLog match={match} playerNickname={playerData?.profile?.nickname || ''} />

                  {/* 팀 내 피해 */}
                  {match.hasTeamDamage && (
                    <div className="mt-3 rounded-xl border border-orange-200 dark:border-orange-800/40 overflow-hidden">
                      <div className="px-4 py-2.5 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800/40 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">팀 내 피해</span>
                        {teamDmgLoading && (
                          <svg className="animate-spin w-3 h-3 text-orange-400 ml-1" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                        )}
                        <span className="ml-auto text-[10px] text-orange-400 dark:text-orange-500">같은 팀원에게 준/받은 피해</span>
                      </div>
                      <div className="p-3 bg-white dark:bg-gray-900">
                        {teamDmgLoading ? (
                          <div className="py-4 text-center text-xs text-gray-400">불러오는 중...</div>
                        ) : filtered.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-5 text-center">
                            <div className="text-xl mb-1">🤝</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">팀 내 피해 없음</div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {filtered.map((td, i) => {
                              const topWeapon = Object.entries(td.weapons ?? {}).sort((a, b) => b[1] - a[1])[0]
                              const weaponLabel = topWeapon ? getWeaponLabel(topWeapon[0]) : null
                              const isMyAttack = td.attackerName?.toLowerCase() === myNick
                              const isMyVictim = td.victimName?.toLowerCase() === myNick
                              return (
                                <div
                                  key={i}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                                    isMyAttack
                                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                      : isMyVictim
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                  }`}
                                >
                                  <span className={`font-bold truncate max-w-[90px] ${isMyAttack ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                    {td.attackerName || '?'}
                                  </span>
                                  <span className="text-gray-400 flex-shrink-0">→</span>
                                  <span className={`font-bold truncate max-w-[90px] ${isMyVictim ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                    {td.victimName || '?'}
                                  </span>
                                  <span className="ml-auto flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                                    {weaponLabel && <span className="text-[10px] text-gray-400 hidden sm:inline">{weaponLabel}</span>}
                                    {(td.groggyCount > 0) && (
                                      <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded font-bold">
                                        기절×{td.groggyCount}
                                      </span>
                                    )}
                                    {(td.killCount > 0) && (
                                      <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-bold">
                                        팀킬×{td.killCount}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-gray-400">{td.hitCount}회</span>
                                    <span className="font-black text-orange-500 dark:text-orange-400">{Math.round(td.totalDamage)}</span>
                                    <span className="text-[10px] text-gray-400">dmg</span>
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
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
