import { useState } from 'react';
import Tooltip from '../ui/Tooltip';
import { calculateMMR, getMMRTier, MMR_DISCLAIMER } from '../../utils/mmrCalculator';

const PlayerHeader = ({
  profile,
  summary,
  rankedSummary,
  seasonStats,
  clanInfo,
  recentMatches,
  onRefresh,
  refreshing,
  cooldown,
  refreshMsg,
  mmr = 1000,
}) => {
  const [showRankedDetails, setShowRankedDetails] = useState(false);

  // ── 시즌 통계 전체 모드 통합 집계 ──
  const seasonData = Object.values(seasonStats || {})[0] || {};
  let tR = 0, tW = 0, tT10 = 0, tDmg = 0, tKills = 0, tAssists = 0, tSurvival = 0;
  for (const ms of Object.values(seasonData)) {
    const r = ms.rounds || 0;
    if (r === 0) continue;
    tR += r; tW += ms.wins || 0; tT10 += ms.top10s || 0;
    tDmg += (ms.avgDamage || 0) * r;
    tKills += (ms.totalKills || 0);
    tAssists += (ms.assists || 0);
    tSurvival += (ms.avgSurvivalTime || 0) * r;
  }
  const combinedStat = tR > 0 ? {
    rounds:     tR,
    avgDamage:  Math.round(tDmg / tR),
    avgKills:   parseFloat((tKills / tR).toFixed(2)),
    winRate:    parseFloat(((tW / tR) * 100).toFixed(1)),
    top10Rate:  parseFloat(((tT10 / tR) * 100).toFixed(1)),
    avgSurvival: Math.round(tSurvival / tR),
    score: Math.round(1000 + (tDmg / tR) * 0.5 + (tKills / tR) * 50 + ((tW / tR) * 100) * 10 + ((tT10 / tR) * 100) * 3),
  } : null;
  // combinedStat가 없으면 summary 데이터로 폴백
  const seasonStat = combinedStat || (summary?.avgDamage ? {
    rounds:      summary.roundsPlayed || 0,
    avgDamage:   Math.round(summary.avgDamage || 0),
    avgKills:    parseFloat((summary.avgKills || 0).toFixed(2)),
    winRate:     parseFloat((summary.winRate || 0).toFixed(1)),
    top10Rate:   parseFloat((summary.top10Rate || 0).toFixed(1)),
    avgSurvival: Math.round(summary.avgSurviveTime || 0),
    score:       summary.score || 1000,
  } : null);

  // 최근 20경기 통계 계산
  const calculate20MatchStats = (matches) => {
    if (!matches || matches.length === 0) {
      return {
        avgDamage: 0,
        avgKills: 0,
        avgAssists: 0,
        winRate: 0,
        top10Rate: 0,
        avgSurvivalTime: 0,
        totalMatches: 0,
      };
    }

    const recent20 = matches.slice(0, 20);
    const totalMatches = recent20.length;

    const totalDamage = recent20.reduce((sum, match) => sum + (match.damage || 0), 0);
    const totalKills = recent20.reduce((sum, match) => sum + (match.kills || 0), 0);
    const totalAssists = recent20.reduce((sum, match) => sum + (match.assists || 0), 0);
    const totalSurvivalTime = recent20.reduce((sum, match) => sum + (match.surviveTime || 0), 0);

    const wins = recent20.filter((match) => (match.rank || match.placement) === 1).length;
    const top10s = recent20.filter((match) => (match.rank || match.placement) <= 10).length;

    return {
      avgDamage: totalMatches > 0 ? totalDamage / totalMatches : 0,
      avgKills: totalMatches > 0 ? totalKills / totalMatches : 0,
      avgAssists: totalMatches > 0 ? totalAssists / totalMatches : 0,
      winRate: totalMatches > 0 ? (wins / totalMatches) * 100 : 0,
      top10Rate: totalMatches > 0 ? (top10s / totalMatches) * 100 : 0,
      avgSurvivalTime: totalMatches > 0 ? totalSurvivalTime / totalMatches : 0,
      totalMatches,
    };
  };

  const recent20Stats = calculate20MatchStats(recentMatches);

  const recent20Score = recent20Stats.totalMatches === 0
    ? 1000
    : calculateMMR({
        avgDamage:       recent20Stats.avgDamage,
        avgKills:        recent20Stats.avgKills,
        winRate:         recent20Stats.winRate,
        top10Rate:       recent20Stats.top10Rate,
        avgSurvivalTime: recent20Stats.avgSurvivalTime,
        avgAssists:      recent20Stats.avgAssists,
      });

  const calculateFormStatus = (matches) => {
    if (!matches || matches.length < 5)
      return { form: '데이터 부족', comment: '경기가 더 필요합니다.' };

    const recent5 = matches.slice(0, 5);
    const previous5 = matches.slice(5, 10);

    if (previous5.length === 0) return { form: '신규', comment: '신규 플레이어입니다.' };

    const recent5Avg = recent5.reduce((sum, m) => sum + (m.damage || 0), 0) / recent5.length;
    const previous5Avg = previous5.reduce((sum, m) => sum + (m.damage || 0), 0) / previous5.length;
    const improvement = ((recent5Avg - previous5Avg) / previous5Avg) * 100;

    if (improvement > 15) return { form: '급상승', comment: '최근 성과가 크게 향상되었습니다!' };
    if (improvement > 5) return { form: '상승', comment: '꾸준히 성과가 향상되고 있습니다.' };
    if (improvement > -5) return { form: '안정', comment: '일정한 성과를 유지하고 있습니다.' };
    if (improvement > -15) return { form: '하락', comment: '최근 성과가 다소 아쉽습니다.' };
    return { form: '급감', comment: '컨디션 회복이 필요해 보입니다.' };
  };

  const recent20Form = calculateFormStatus(recentMatches);

  const getStyleString = (summary) => {
    const style = summary?.realPlayStyle || summary?.playstyle || summary?.style;
    if (typeof style === 'string') {
      return style.replace(/^[^\w\s가-힣]+\s*/, '').trim() || '일반 밸런스형';
    }
    if (typeof style === 'object' && style !== null) {
      console.warn('PlayerHeader: style is an object, using default value', style);
      return '일반 밸런스형';
    }
    return '일반 밸런스형';
  };

  const styleString = getStyleString(summary);

  const getCleanStyleText = (text) => {
    if (!text) return '';
    return text.replace(/^[^\w\s가-힣]+\s*/, '').trim();
  };

  const basicStyleText = getCleanStyleText(summary?.playstyle);
  const detailStyleText = getCleanStyleText(summary?.realPlayStyle);
  const isDifferentStyles = basicStyleText !== detailStyleText;

  const getStyleDescription = (style) => {
    const cleanStyle = getCleanStyleText(style);
    const descriptions = {
      캐리형: '높은 점수와 딜량으로 팀을 이끄는 핵심 플레이어',
      안정형: '균형잡힌 성과로 꾸준한 기여를 하는 플레이어',
      수비형: '생존을 우선시하며 신중하게 플레이하는 타입',
      '극단적 공격형': '매우 높은 딜량과 킬로 압도적인 공격력을 보이는 하드캐리형',
      순간광폭형: '초반에 폭발적인 딜량을 뽑아내지만 빠르게 사망하는 하이리스크형',
      '극단적 수비형': '최소한의 교전으로 최대한 오래 생존하는 완전 수비형',
      '도박형 파밍러': '초반 파밍 실패로 즉사하는 경우가 많은 불안정한 타입',
      '치명적 저격수': '장거리에서 정밀한 헤드샷으로 적을 제거하는 저격 전문가',
      '고효율 승부사': '적은 딜량으로도 킬을 잘 따내는 마무리 전문가',
      '전략적 어시스트러': '킬보다는 팀원 지원과 어시스트에 특화된 서포터형',
      '유령 생존자': '교전을 완전히 피하며 은신으로 높은 순위를 달성하는 타입',
      '지속 전투형': '높은 딜량과 긴 생존시간으로 지속적인 교전을 이어가는 타입',
      교전형: '적극적인 교전으로 높은 딜량과 킬을 기록하는 공격적 플레이어',
      '초반 돌격형': '게임 시작부터 적극적으로 교전에 나서는 어그로형',
      '장거리 정찰러': '넓은 범위를 이동하며 정찰과 포지셔닝을 중시하는 타입',
      '저격 위주': '원거리에서 저격으로 안정적인 딜량을 누적하는 스타일',
      '후반 존버형': '초중반을 버티고 후반까지 생존하여 높은 순위를 노리는 타입',
      '중거리 안정형': '중거리 교전을 선호하며 안정적인 성과를 보이는 밸런스형',
      공격형: '평균 이상의 딜량으로 공격적인 플레이를 보이는 타입',
      생존형: '생존시간을 우선시하며 신중한 플레이를 하는 타입',
      이동형: '넓은 범위를 이동하며 포지셔닝을 중시하는 타입',
    };
    return descriptions[cleanStyle] || '플레이스타일 분석 중입니다.';
  };

  const getPlayerStyle = (style) => {
    const styles = {
      '극단적 공격형': { icon: '☠️', color: 'red', bg: 'from-red-500 to-red-600' },
      '초반 돌격형': { icon: '🚀', color: 'orange', bg: 'from-orange-500 to-orange-600' },
      '극단적 수비형': { icon: '🛡️', color: 'green', bg: 'from-green-500 to-green-600' },
      '후반 존버형': { icon: '🏕️', color: 'yellow', bg: 'from-yellow-500 to-yellow-600' },
      '장거리 정찰러': { icon: '🏃', color: 'blue', bg: 'from-blue-500 to-blue-600' },
      '저격 위주': { icon: '🎯', color: 'purple', bg: 'from-purple-500 to-purple-600' },
      '중거리 안정형': { icon: '⚖️', color: 'gray', bg: 'from-gray-500 to-gray-600' },
      '지속 전투형': { icon: '🔥', color: 'red', bg: 'from-red-600 to-red-700' },
      '일반 밸런스형': { icon: '📦', color: 'gray', bg: 'from-gray-400 to-gray-500' },
      '☠️ 극단적 공격형': { icon: '☠️', color: 'red', bg: 'from-red-500 to-red-600' },
      '🚀 초반 돌격형': { icon: '🚀', color: 'orange', bg: 'from-orange-500 to-orange-600' },
      '🛡️ 극단적 수비형': { icon: '🛡️', color: 'green', bg: 'from-green-500 to-green-600' },
      '🏕️ 후반 존버형': { icon: '🏕️', color: 'yellow', bg: 'from-yellow-500 to-yellow-600' },
      '🏃 장거리 정찰러': { icon: '🏃', color: 'blue', bg: 'from-blue-500 to-blue-600' },
      '🎯 저격 위주': { icon: '🎯', color: 'purple', bg: 'from-purple-500 to-purple-600' },
      '⚖️ 중거리 안정형': { icon: '⚖️', color: 'gray', bg: 'from-gray-500 to-gray-600' },
      '🔥 지속 전투형': { icon: '🔥', color: 'red', bg: 'from-red-600 to-red-700' },
      '📦 일반 밸런스형': { icon: '📦', color: 'gray', bg: 'from-gray-400 to-gray-500' },
      어그로: { icon: '⚔️', color: 'red', bg: 'from-red-500 to-red-600' },
      서포터: { icon: '🤝', color: 'blue', bg: 'from-blue-500 to-blue-600' },
      생존형: { icon: '🛡️', color: 'green', bg: 'from-green-500 to-green-600' },
      킬러: { icon: '💀', color: 'purple', bg: 'from-purple-500 to-purple-600' },
      밸런스: { icon: '⚖️', color: 'gray', bg: 'from-gray-500 to-gray-600' },
      캐리형: { icon: '🔥', color: 'red', bg: 'from-red-500 to-red-600' },
      안정형: { icon: '⚖️', color: 'gray', bg: 'from-gray-500 to-gray-600' },
      수비형: { icon: '🛡️', color: 'green', bg: 'from-green-500 to-green-600' },
      '🔥 캐리형': { icon: '🔥', color: 'red', bg: 'from-red-500 to-red-600' },
      '⚖️ 안정형': { icon: '⚖️', color: 'gray', bg: 'from-gray-500 to-gray-600' },
      '🛡️ 수비형': { icon: '🛡️', color: 'green', bg: 'from-green-500 to-green-600' },
    };
    return styles[style] || styles['일반 밸런스형'];
  };

  const playerStyleInfo = getPlayerStyle(summary?.playstyle || styleString);

  const getFormStyle = (form) => {
    if (form === '급상승' || form === '상승') return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    if (form === '하락' || form === '급감') return 'bg-red-100 text-red-700 border border-red-200';
    return 'bg-blue-100 text-blue-700 border border-blue-200';
  };

  return (
    <div className="mb-8 rounded-2xl overflow-hidden shadow-xl">
      {/* 상단 헤더 영역 - 다크 블루 배경 */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 px-8 py-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* 플레이어 기본 정보 */}
          <div className="flex items-center gap-5">
            {/* 아바타 */}
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg flex-shrink-0">
              {(profile?.nickname || 'P').charAt(0).toUpperCase()}
            </div>
            <div>
              {/* 닉네임 */}
              <h1 className="text-3xl font-black text-white tracking-tight">
                {profile?.nickname || '-'}
              </h1>
              {/* 클랜 + 플레이스타일 */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {clanInfo && (
                  <span className="px-3 py-1 bg-blue-700/60 text-blue-200 border border-blue-600/50 rounded-full text-xs font-semibold backdrop-blur-sm">
                    [{clanInfo.tag || 'CLAN'}] {clanInfo.name || '클랜'}
                    {clanInfo.level ? ` Lv.${clanInfo.level}` : ''}
                  </span>
                )}
                <Tooltip content={getStyleDescription(summary?.playstyle)}>
                  <span className={`px-3 py-1 bg-gradient-to-r ${playerStyleInfo.bg} text-white rounded-full text-xs font-semibold cursor-help shadow-sm`}>
                    {summary?.playstyle || styleString}
                  </span>
                </Tooltip>
                {summary?.realPlayStyle && isDifferentStyles && (
                  <Tooltip content={getStyleDescription(summary?.realPlayStyle)}>
                    <span className="px-3 py-1 bg-purple-600/70 text-purple-100 border border-purple-500/50 rounded-full text-xs font-semibold cursor-help">
                      {summary.realPlayStyle}
                    </span>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>

          {/* 우측 액션 버튼 */}
          <div className="flex items-center gap-3">
            {/* MMR 배지 */}
            {(() => {
              const tier = getMMRTier(mmr);
              return (
                <Tooltip content={MMR_DISCLAIMER}>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border cursor-help ${tier.bgColor} ${tier.borderColor} select-none`}>
                    <span className="text-base leading-none">{tier.emoji}</span>
                    <div className="flex flex-col leading-none">
                      <span className={`text-xs font-black ${tier.textColor}`}>{mmr.toLocaleString()}</span>
                      <span className={`text-[10px] font-semibold ${tier.textColor} opacity-70`}>{tier.label}</span>
                    </div>
                    <span className="text-xs text-gray-400 font-bold ml-0.5">?</span>
                  </div>
                </Tooltip>
              );
            })()}
            <select
              className="px-3 py-2 bg-blue-800/60 border border-blue-600/50 rounded-lg text-sm font-medium text-blue-100 hover:bg-blue-700/60 transition-colors backdrop-blur-sm"
              defaultValue="current"
            >
              <option value="current">현재 시즌</option>
              <option value="season-31">시즌 31</option>
              <option value="season-30">시즌 30</option>
              <option value="season-29">시즌 29</option>
              <option value="season-28">시즌 28</option>
            </select>
            <button
              onClick={onRefresh}
              disabled={refreshing || cooldown > 0}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2 ${
                refreshing || cooldown > 0
                  ? 'bg-blue-800/40 text-blue-400 cursor-not-allowed border border-blue-700/40'
                  : 'bg-blue-500 hover:bg-blue-400 text-white shadow-md hover:shadow-lg'
              }`}
            >
              {refreshing ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                  <span>최신화 중</span>
                </>
              ) : cooldown > 0 ? (
                `${cooldown}초 대기`
              ) : (
                <>
                  <span>🔄</span>
                  <span>최신화</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 스탯 카드 영역 - 흰 배경 */}
      <div className="bg-white border-x border-b border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">

          {/* 1. 시즌 성과 - 전체 통합 평균 */}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">시즌 성과</h2>
              {seasonStat && (
                <span className="text-xs text-gray-400 ml-auto">{seasonStat.rounds}경기</span>
              )}
            </div>

            {seasonStat ? (
              <>
                {/* 핵심 3개 스탯 */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center">
                    <div className="text-xs text-gray-400 mb-1">평균 딜량</div>
                    <div className="text-xl font-black text-gray-900">{seasonStat.avgDamage}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400 mb-1">평균 킬</div>
                    <div className="text-xl font-black text-gray-900">{seasonStat.avgKills}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400 mb-1">
                      <Tooltip content="PKGG 자체 산출 점수 (시즌 전체 기준)&#10;딜량·킬·승률·TOP10을 가중 합산합니다.&#10;배그 공식 RP와 무관합니다.">
                        PKGG 점수 ℹ️
                      </Tooltip>
                    </div>
                    <div className="text-xl font-black text-blue-600">{seasonStat.score}</div>
                    <div className="text-xs text-gray-400">
                      {seasonStat.score >= 1600 ? '우수' : seasonStat.score >= 1300 ? '보통' : '성장형'}
                    </div>
                  </div>
                </div>

                {/* 보조 스탯 */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                  <div className="text-center">
                    <div className="text-xs text-gray-400">승률</div>
                    <div className="text-sm font-bold text-gray-700">{seasonStat.winRate}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">TOP10</div>
                    <div className="text-sm font-bold text-gray-700">{seasonStat.top10Rate}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400">생존</div>
                    <div className="text-sm font-bold text-gray-700">{Math.round(seasonStat.avgSurvival / 60)}분</div>
                  </div>
                </div>

                {/* 폼 상태 */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getFormStyle(recent20Form.form)}`}>
                    {recent20Form.form}
                  </span>
                  <span className="text-xs text-gray-400 truncate">{recent20Form.comment}</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="text-3xl mb-2">📊</div>
                <div className="text-sm text-gray-500">시즌 데이터가 없습니다</div>
                <div className="text-xs text-gray-400 mt-1">최신화 버튼으로 데이터를 불러오세요</div>
              </div>
            )}
          </div>

          {/* 2. 최근 N경기 요약 */}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-cyan-500 rounded-full"></div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                최근 {recent20Stats.totalMatches}경기
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">평균 딜량</div>
                <div className="text-xl font-black text-gray-900">
                  {recent20Stats.avgDamage.toFixed(0)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">평균 킬</div>
                <div className="text-xl font-black text-gray-900">
                  {recent20Stats.avgKills.toFixed(1)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">
                  <Tooltip content="킬 + 딜량 + 생존 시간을 가중치 기반으로 조합한 경기 성과 기반 내부 점수입니다. (공식 랭킹 RP가 아님)">
                    PKGG 점수 ℹ️
                  </Tooltip>
                </div>
                <div className="text-xl font-black text-blue-600">
                  {recent20Score}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">승률</div>
                <div className="text-xl font-black text-gray-900">
                  {recent20Stats.winRate.toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">Top10</div>
                <div className="text-xl font-black text-gray-900">
                  {recent20Stats.top10Rate.toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">폼</div>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${getFormStyle(recent20Form.form)}`}>
                  {recent20Form.form}
                </span>
              </div>
            </div>
          </div>

          {/* 3. 경쟁전 */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-amber-500 rounded-full"></div>
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">경쟁전</h2>
              </div>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">PUBG 공식</span>
            </div>

            {rankedSummary && rankedSummary.games > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                    <div className="text-xs text-amber-500 mb-1 font-medium">랭크</div>
                    <div className="text-base font-black text-gray-900">
                      {rankedSummary.currentTier || rankedSummary.tier || 'Unranked'}
                      {rankedSummary.subTier && rankedSummary.subTier > 0 ? ` ${rankedSummary.subTier}` : ''}
                    </div>
                    <div className="text-xs text-amber-500 font-semibold">{rankedSummary.rp || 0} RP</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                    <div className="text-xs text-gray-400 mb-1">게임수</div>
                    <div className="text-base font-black text-gray-900">{rankedSummary.games || 0}</div>
                    <div className="text-xs text-gray-400">K/D {(rankedSummary.kd || 0).toFixed(1)}</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                    <div className="text-xs text-blue-500 mb-1">평균 딜량</div>
                    <div className="text-base font-black text-blue-600">{(rankedSummary.avgDamage || 0).toFixed(0)}</div>
                    <div className="text-xs text-blue-400">승률 {(rankedSummary.winRate || 0).toFixed(1)}%</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                    <div className="text-xs text-gray-400 mb-1">TOP10</div>
                    <div className="text-base font-black text-gray-900">
                      {typeof rankedSummary.top10Ratio === 'number'
                        ? (rankedSummary.top10Ratio * 100).toFixed(1)
                        : (rankedSummary.top10Rate || 0).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-400">평균 {(rankedSummary.avgRank || 0).toFixed(1)}등</div>
                  </div>
                </div>

                {/* 상세보기 버튼 */}
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowRankedDetails(!showRankedDetails)}
                    className="px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-lg hover:from-amber-500 hover:to-orange-600 transition-all duration-200 shadow-sm"
                  >
                    {showRankedDetails ? '▲ 상세 숨기기' : '▼ 상세 통계 보기'}
                  </button>
                </div>

                {showRankedDetails && (
                  <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 text-center">상세 경쟁전 통계</h3>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
                        <div className="text-xs text-red-400 mb-1">킬 수</div>
                        <div className="text-sm font-black text-gray-900">{(rankedSummary.kills || 0).toLocaleString()}</div>
                      </div>
                      <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
                        <div className="text-xs text-gray-400 mb-1">데스 수</div>
                        <div className="text-sm font-black text-gray-900">{(rankedSummary.deaths || 0).toLocaleString()}</div>
                      </div>
                      <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
                        <div className="text-xs text-blue-400 mb-1">어시스트</div>
                        <div className="text-sm font-black text-gray-900">{(rankedSummary.assists || 0).toLocaleString()}</div>
                      </div>
                      <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
                        <div className="text-xs text-blue-400 mb-1">KDA</div>
                        <div className="text-sm font-black text-gray-900">
                          {typeof rankedSummary.kda === 'number' ? rankedSummary.kda.toFixed(1) : '0.0'}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
                        <div className="text-xs text-green-400 mb-1">승리</div>
                        <div className="text-sm font-black text-gray-900">{(rankedSummary.wins || 0).toLocaleString()}</div>
                      </div>
                      <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
                        <div className="text-xs text-orange-400 mb-1">총 딜량</div>
                        <div className="text-sm font-black text-gray-900">{(rankedSummary.damageDealt || 0).toLocaleString()}</div>
                      </div>
                      <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
                        <div className="text-xs text-gray-400 mb-1">기절</div>
                        <div className="text-sm font-black text-gray-900">{(rankedSummary.dBNOs || 0).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
                        <div className="text-xs text-red-400 mb-1">헤드샷 킬</div>
                        <div className="text-sm font-black text-gray-900">{(rankedSummary.headshotKills || 0).toLocaleString()}</div>
                      </div>
                      <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
                        <div className="text-xs text-red-400 mb-1">헤드샷 비율</div>
                        <div className="text-sm font-black text-gray-900">
                          {typeof rankedSummary.headshotRate === 'number' ? rankedSummary.headshotRate.toFixed(1) : '0.0'}%
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
                        <div className="text-xs text-amber-400 mb-1">최고 티어</div>
                        <div className="text-sm font-black text-gray-900">{rankedSummary.bestTier || 'Unranked'}</div>
                      </div>
                      <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
                        <div className="text-xs text-amber-400 mb-1">최고 RP</div>
                        <div className="text-sm font-black text-gray-900">{(rankedSummary.bestRankPoint || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100">
                <div className="text-3xl mb-2">🏆</div>
                <div className="text-sm text-gray-500 font-medium">아직 경쟁전 기록이 없습니다</div>
                <div className="text-xs text-gray-400 mt-1">경쟁전에 참여하면 랭크 정보가 표시됩니다</div>
              </div>
            )}
          </div>
        </div>

        {refreshMsg && (
          <div className="px-8 py-3 bg-blue-50 border-t border-blue-100 text-center text-sm text-blue-700 font-medium">
            {refreshMsg}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerHeader;
