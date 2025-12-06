import React, { useState } from 'react';
import Tooltip from '../ui/Tooltip';

const PlayerHeader = ({
  profile,
  summary,
  rankedSummary,
  clanInfo,
  recentMatches,
  onRefresh,
  refreshing,
  cooldown,
  refreshMsg,
}) => {
  // 경쟁전 상세보기 상태
  const [showRankedDetails, setShowRankedDetails] = useState(false);

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

    const totalDamage = recent20.reduce(
      (sum, match) => sum + (match.damage || 0),
      0
    );
    const totalKills = recent20.reduce(
      (sum, match) => sum + (match.kills || 0),
      0
    );
    const totalAssists = recent20.reduce(
      (sum, match) => sum + (match.assists || 0),
      0
    );
    const totalSurvivalTime = recent20.reduce(
      (sum, match) => sum + (match.surviveTime || 0),
      0
    );

    const wins = recent20.filter(
      (match) => (match.rank || match.placement) === 1
    ).length;
    const top10s = recent20.filter(
      (match) => (match.rank || match.placement) <= 10
    ).length;

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

  // PK.GG 점수 계산 (최근 20경기 기준)
  const calculate20MatchScore = (stats) => {
    if (stats.totalMatches === 0) return 1000;

    // 딜량 * 0.4 + 킬 * 40 + Top10 비율 * 100
    const score = stats.avgDamage * 0.4 + stats.avgKills * 40 + stats.top10Rate;
    return Math.round(score + 1000); // 기본 1000점에서 시작
  };

  const recent20Score = calculate20MatchScore(recent20Stats);

  // 폼 상태 계산 (최근 20경기 기준)
  const calculateFormStatus = (matches) => {
    if (!matches || matches.length < 5)
      return { form: '데이터 부족', comment: '경기가 더 필요합니다.' };

    const recent5 = matches.slice(0, 5);
    const previous5 = matches.slice(5, 10);

    if (previous5.length === 0)
      return { form: '신규', comment: '신규 플레이어입니다.' };

    const recent5Avg =
      recent5.reduce((sum, m) => sum + (m.damage || 0), 0) / recent5.length;
    const previous5Avg =
      previous5.reduce((sum, m) => sum + (m.damage || 0), 0) / previous5.length;

    const improvement = ((recent5Avg - previous5Avg) / previous5Avg) * 100;

    if (improvement > 15)
      return { form: '급상승', comment: '최근 성과가 크게 향상되었습니다!' };
    if (improvement > 5)
      return { form: '상승', comment: '꾸준히 성과가 향상되고 있습니다.' };
    if (improvement > -5)
      return { form: '안정', comment: '일정한 성과를 유지하고 있습니다.' };
    if (improvement > -15)
      return { form: '하락', comment: '최근 성과가 다소 아쉽습니다.' };
    return { form: '급감', comment: '컨디션 회복이 필요해 보입니다.' };
  };

  const recent20Form = calculateFormStatus(recentMatches);

  // 플레이스타일 값을 안전하게 문자열로 변환 (realPlayStyle 우선, 그 다음 playstyle, 마지막으로 style)
  const getStyleString = (summary) => {
    const style =
      summary?.realPlayStyle || summary?.playstyle || summary?.style;
    if (typeof style === 'string') {
      // 이모지 제거하고 텍스트만 반환
      return style.replace(/^[^\w\s가-힣]+\s*/, '').trim() || '일반 밸런스형';
    }
    if (typeof style === 'object' && style !== null) {
      // 객체인 경우 JSON.stringify 후 기본값 반환
      console.warn(
        'PlayerHeader: style is an object, using default value',
        style
      );
      return '일반 밸런스형';
    }
    return '일반 밸런스형';
  };

  const styleString = getStyleString(summary);

  // 기본 플레이스타일과 상세 플레이스타일이 같은지 확인하는 함수
  const getCleanStyleText = (text) => {
    if (!text) return '';
    return text.replace(/^[^\w\s가-힣]+\s*/, '').trim();
  };

  const basicStyleText = getCleanStyleText(summary?.playstyle);
  const detailStyleText = getCleanStyleText(summary?.realPlayStyle);
  const isDifferentStyles = basicStyleText !== detailStyleText;

  // 플레이스타일별 설명 정의
  const getStyleDescription = (style) => {
    const cleanStyle = getCleanStyleText(style);
    const descriptions = {
      // 기본 스타일
      캐리형: '높은 점수와 딜량으로 팀을 이끄는 핵심 플레이어',
      안정형: '균형잡힌 성과로 꾸준한 기여를 하는 플레이어',
      수비형: '생존을 우선시하며 신중하게 플레이하는 타입',

      // 극단적 스타일
      '극단적 공격형':
        '매우 높은 딜량과 킬로 압도적인 공격력을 보이는 하드캐리형',
      순간광폭형:
        '초반에 폭발적인 딜량을 뽑아내지만 빠르게 사망하는 하이리스크형',
      '극단적 수비형': '최소한의 교전으로 최대한 오래 생존하는 완전 수비형',
      '도박형 파밍러': '초반 파밍 실패로 즉사하는 경우가 많은 불안정한 타입',

      // 특화 스타일
      '치명적 저격수': '장거리에서 정밀한 헤드샷으로 적을 제거하는 저격 전문가',
      '고효율 승부사': '적은 딜량으로도 킬을 잘 따내는 마무리 전문가',
      '전략적 어시스트러': '킬보다는 팀원 지원과 어시스트에 특화된 서포터형',
      '유령 생존자': '교전을 완전히 피하며 은신으로 높은 순위를 달성하는 타입',

      // 교전 스타일
      '지속 전투형':
        '높은 딜량과 긴 생존시간으로 지속적인 교전을 이어가는 타입',
      교전형: '적극적인 교전으로 높은 딜량과 킬을 기록하는 공격적 플레이어',
      '초반 돌격형': '게임 시작부터 적극적으로 교전에 나서는 어그로형',

      // 이동/거리 스타일
      '장거리 정찰러': '넓은 범위를 이동하며 정찰과 포지셔닝을 중시하는 타입',
      '저격 위주': '원거리에서 저격으로 안정적인 딜량을 누적하는 스타일',

      // 생존 스타일
      '후반 존버형':
        '초중반을 버티고 후반까지 생존하여 높은 순위를 노리는 타입',
      '중거리 안정형': '중거리 교전을 선호하며 안정적인 성과를 보이는 밸런스형',

      // 안전망 스타일
      공격형: '평균 이상의 딜량으로 공격적인 플레이를 보이는 타입',
      생존형: '생존시간을 우선시하며 신중한 플레이를 하는 타입',
      이동형: '넓은 범위를 이동하며 포지셔닝을 중시하는 타입',
    };

    return descriptions[cleanStyle] || '플레이스타일 분석 중입니다.';
  };

  const getPlayerStyle = (style) => {
    const styles = {
      // 이모지가 제거된 텍스트 기반 매핑
      '극단적 공격형': {
        icon: '☠️',
        color: 'red',
        bg: 'from-red-500 to-red-600',
      },
      '초반 돌격형': {
        icon: '🚀',
        color: 'orange',
        bg: 'from-orange-500 to-orange-600',
      },
      '극단적 수비형': {
        icon: '🛡️',
        color: 'green',
        bg: 'from-green-500 to-green-600',
      },
      '후반 존버형': {
        icon: '🏕️',
        color: 'yellow',
        bg: 'from-yellow-500 to-yellow-600',
      },
      '장거리 정찰러': {
        icon: '🏃',
        color: 'blue',
        bg: 'from-blue-500 to-blue-600',
      },
      '저격 위주': {
        icon: '🎯',
        color: 'purple',
        bg: 'from-purple-500 to-purple-600',
      },
      '중거리 안정형': {
        icon: '⚖️',
        color: 'gray',
        bg: 'from-gray-500 to-gray-600',
      },
      '지속 전투형': {
        icon: '🔥',
        color: 'red',
        bg: 'from-red-600 to-red-700',
      },
      '일반 밸런스형': {
        icon: '📦',
        color: 'gray',
        bg: 'from-gray-400 to-gray-500',
      },

      // API의 realPlayStyle 기반 매핑 (기존 호환성)
      '☠️ 극단적 공격형': {
        icon: '☠️',
        color: 'red',
        bg: 'from-red-500 to-red-600',
      },
      '🚀 초반 돌격형': {
        icon: '🚀',
        color: 'orange',
        bg: 'from-orange-500 to-orange-600',
      },
      '🛡️ 극단적 수비형': {
        icon: '🛡️',
        color: 'green',
        bg: 'from-green-500 to-green-600',
      },
      '🏕️ 후반 존버형': {
        icon: '🏕️',
        color: 'yellow',
        bg: 'from-yellow-500 to-yellow-600',
      },
      '🏃 장거리 정찰러': {
        icon: '🏃',
        color: 'blue',
        bg: 'from-blue-500 to-blue-600',
      },
      '🎯 저격 위주': {
        icon: '🎯',
        color: 'purple',
        bg: 'from-purple-500 to-purple-600',
      },
      '⚖️ 중거리 안정형': {
        icon: '⚖️',
        color: 'gray',
        bg: 'from-gray-500 to-gray-600',
      },
      '🔥 지속 전투형': {
        icon: '🔥',
        color: 'red',
        bg: 'from-red-600 to-red-700',
      },
      '📦 일반 밸런스형': {
        icon: '📦',
        color: 'gray',
        bg: 'from-gray-400 to-gray-500',
      },

      // 기존 스타일 호환성 유지 (레거시)
      어그로: { icon: '⚔️', color: 'red', bg: 'from-red-500 to-red-600' },
      서포터: { icon: '🤝', color: 'blue', bg: 'from-blue-500 to-blue-600' },
      생존형: { icon: '🛡️', color: 'green', bg: 'from-green-500 to-green-600' },
      킬러: {
        icon: '💀',
        color: 'purple',
        bg: 'from-purple-500 to-purple-600',
      },
      밸런스: { icon: '⚖️', color: 'gray', bg: 'from-gray-500 to-gray-600' },

      // 간단한 점수 기반 스타일 (playstyle)
      캐리형: { icon: '🔥', color: 'red', bg: 'from-red-500 to-red-600' },
      안정형: { icon: '⚖️', color: 'gray', bg: 'from-gray-500 to-gray-600' },
      수비형: { icon: '🛡️', color: 'green', bg: 'from-green-500 to-green-600' },
      '🔥 캐리형': { icon: '🔥', color: 'red', bg: 'from-red-500 to-red-600' },
      '⚖️ 안정형': {
        icon: '⚖️',
        color: 'gray',
        bg: 'from-gray-500 to-gray-600',
      },
      '🛡️ 수비형': {
        icon: '🛡️',
        color: 'green',
        bg: 'from-green-500 to-green-600',
      },
    };
    return styles[style] || styles['일반 밸런스형'];
  };

  const playerStyleInfo = getPlayerStyle(summary?.playstyle || styleString);

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl p-8 border border-indigo-100 dark:border-slate-700 shadow-lg dark:shadow-none mb-8">
      {/* 1. 플레이어 기본 프로필 섹션 */}
      <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-slate-800 dark:to-slate-800 rounded-xl p-6 mb-6 border-l-4 border-indigo-500 dark:border-sky-600">
        <div className="flex items-center gap-4 mb-4">
          <h1
            className="text-3xl font-extrabold text-gray-900 dark:text-sky-300"
            style={{ lineHeight: 1.1, color: '#0f172a' }}
          >
            {profile?.nickname || '-'}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-sky-400 rounded-2xl flex items-center justify-center text-2xl font-bold text-white">
            {(profile?.nickname || 'P').charAt(0).toUpperCase()}
          </div>
          <div>
            {/* 시즌 선택 버튼 */}
            <div className="mb-3">
              <select
                className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-600"
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
              {clanInfo && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium dark:bg-blue-900/30 dark:text-blue-300">
                  [{clanInfo.tag || 'CLAN'}] {clanInfo.name || '클랜'}
                  {clanInfo.level ? ` Lv.${clanInfo.level}` : ''}
                </span>
              )}
              <div
                className={`flex items-center gap-2 px-3 py-1 bg-gradient-to-r ${playerStyleInfo.bg} text-white rounded-full text-sm font-medium`}
              >
                <span>{styleString}</span>
              </div>
              <button
                onClick={onRefresh}
                disabled={refreshing || cooldown > 0}
                className={`px-3 py-1 rounded-lg font-medium text-sm transition-all duration-200 ${
                  refreshing || cooldown > 0
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-slate-700 dark:text-gray-400'
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
        <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-slate-800 dark:to-slate-800 rounded-xl p-6 border-l-4 border-indigo-400 dark:border-indigo-600">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">
              시즌 성과 (전체 경기)
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white bg-opacity-60 dark:bg-slate-800 dark:bg-opacity-80 rounded-lg p-3 border border-indigo-200 dark:border-slate-700">
              <div className="text-xs font-medium text-indigo-600 mb-1 dark:text-indigo-300">
                평균 딜량
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-slate-100">
                {(summary?.seasonAvgDamage || 0).toFixed(1)}
              </div>
            </div>

            <div className="bg-white bg-opacity-60 dark:bg-slate-800 dark:bg-opacity-80 rounded-lg p-3 border border-indigo-200 dark:border-slate-700">
              <div className="text-xs font-medium text-indigo-600 mb-1 dark:text-indigo-300">
                평균 생존시간
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-slate-100">
                {Math.floor(summary?.averageSurvivalTime || 0)}초
              </div>
            </div>

            <div className="bg-white bg-opacity-60 dark:bg-slate-800 dark:bg-opacity-80 rounded-lg p-3 border border-indigo-200 dark:border-slate-700">
              <div className="text-xs font-medium text-indigo-600 mb-1 dark:text-indigo-300">
                <Tooltip content="킬 + 딜량 + 생존 시간을 가중치 기반으로 조합한 경기 성과 기반 내부 점수입니다. (공식 랭킹 RP가 아님)">
                  PK.GG 점수 ℹ️
                </Tooltip>
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-slate-100">
                {summary?.averageScore || 1000}
                <span className="text-xs text-gray-500 ml-2 dark:text-slate-300">
                  {(summary?.averageScore || 1000) >= 1500
                    ? '(우수)'
                    : (summary?.averageScore || 1000) >= 1200
                      ? '(보통)'
                      : '(성장형)'}
                </span>
              </div>
            </div>

            <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 border border-indigo-200 dark:border-slate-700 col-span-3">
              <div className="text-xs font-medium text-indigo-600 mb-2 dark:text-indigo-300">
                플레이스타일
              </div>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    summary?.recentForm === '상승'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                      : summary?.recentForm === '하락' ||
                          summary?.recentForm === '급감'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200'
                  }`}
                >
                  {summary?.recentForm || '안정'}
                </span>
                <Tooltip content={getStyleDescription(summary?.playstyle)}>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${playerStyleInfo.bg} text-white cursor-help`}
                  >
                    {summary?.playstyle || styleString}
                  </span>
                </Tooltip>
                {summary?.realPlayStyle && isDifferentStyles && (
                  <Tooltip
                    content={getStyleDescription(summary?.realPlayStyle)}
                  >
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700 cursor-help dark:bg-purple-800/30 dark:text-purple-200">
                      {summary.realPlayStyle}
                    </span>
                  </Tooltip>
                )}
              </div>
              <div className="text-sm text-gray-600 mb-1 dark:text-slate-300">
                {summary?.formComment || '시즌 전체 성과를 분석 중입니다.'}
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-400">
                {summary?.distanceStyleHint || '시즌 전체 플레이스타일 분석'}
                {summary?.realPlayStyle &&
                  isDifferentStyles &&
                  ` • 상세: ${summary.realPlayStyle}`}
              </div>
            </div>
          </div>
        </div>

        {/* 3. 핵심 성과 요약 섹션 */}
        <div className="bg-gradient-to-r from-sky-50 to-sky-100 dark:from-slate-800 dark:to-slate-900 rounded-xl p-6 border-l-4 border-sky-400 dark:border-sky-600">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">
              최근 {recent20Stats.totalMatches}경기 요약
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white bg-opacity-60 dark:bg-slate-800 dark:bg-opacity-80 rounded-lg p-3 border border-sky-200 dark:border-slate-700">
              <div className="text-xs font-medium text-sky-600 mb-1 dark:text-sky-300">평균 딜량</div>
              <div className="text-xl font-bold text-gray-900 dark:text-slate-100">
                {recent20Stats.avgDamage.toFixed(1)}
              </div>
            </div>

            <div className="bg-white bg-opacity-60 dark:bg-slate-800 dark:bg-opacity-80 rounded-lg p-3 border border-sky-200 dark:border-slate-700">
              <div className="text-xs font-medium text-sky-600 mb-1 dark:text-sky-300">평균 킬</div>
              <div className="text-xl font-bold text-gray-900 dark:text-slate-100">
                {recent20Stats.avgKills.toFixed(1)}
              </div>
            </div>

            <div className="bg-white bg-opacity-60 dark:bg-slate-800 dark:bg-opacity-80 rounded-lg p-3 border border-sky-200 dark:border-slate-700">
              <div className="text-xs font-medium text-sky-600 mb-1 dark:text-sky-300">
                <Tooltip content="킬 + 딜량 + 생존 시간을 가중치 기반으로 조합한 경기 성과 기반 내부 점수입니다. (공식 랭킹 RP가 아님)">
                  PK.GG 점수 ℹ️
                </Tooltip>
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-slate-100">
                {recent20Score}
              </div>
            </div>

            <div className="bg-white bg-opacity-60 dark:bg-slate-800 dark:bg-opacity-80 rounded-lg p-3 border border-sky-200 dark:border-slate-700">
              <div className="text-xs font-medium text-sky-600 mb-1 dark:text-sky-300">승률</div>
              <div className="text-xl font-bold text-gray-900 dark:text-slate-100">
                {recent20Stats.winRate.toFixed(1)}%
              </div>
            </div>

            <div className="bg-white bg-opacity-60 dark:bg-slate-800 dark:bg-opacity-80 rounded-lg p-3 border border-sky-200 dark:border-slate-700">
              <div className="text-xs font-medium text-sky-600 mb-1 dark:text-sky-300">Top10 비율</div>
              <div className="text-xl font-bold text-gray-900 dark:text-slate-100">
                {recent20Stats.top10Rate.toFixed(1)}%
              </div>
            </div>

            <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 border border-sky-200 dark:border-slate-700">
              <div className="text-xs font-medium text-sky-600 mb-1 dark:text-sky-300">최근 폼 상태</div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    recent20Form.form === '급상승' ||
                    recent20Form.form === '상승'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                      : recent20Form.form === '하락' ||
                          recent20Form.form === '급감'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-200'
                  }`}
                >
                  {recent20Form.form}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1 dark:text-slate-300">
                {recent20Form.comment}
              </div>
            </div>
          </div>
        </div>

        {/* 4. 경쟁전 요약 */}
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-slate-800 dark:to-slate-900 rounded-xl p-6 border-l-4 border-amber-400 dark:border-amber-600">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">경쟁전</h2>
            <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full dark:bg-amber-900/20 dark:text-amber-200">
              PUBG 공식
            </span>
          </div>

          {rankedSummary && rankedSummary.games > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 text-center border dark:border-slate-700">
                  <div className="text-xs text-amber-600 mb-1 dark:text-amber-300">랭크</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
                    {rankedSummary.currentTier ||
                      rankedSummary.tier ||
                      'Unranked'}
                    {rankedSummary.subTier && rankedSummary.subTier > 0
                      ? ` ${rankedSummary.subTier}`
                      : ''}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-300">
                    {rankedSummary.rp || 0} RP
                  </div>
                </div>
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 text-center border dark:border-slate-700">
                  <div className="text-xs text-amber-600 mb-1 dark:text-amber-300">게임수</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
                    {rankedSummary.games || 0}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-300">
                    K/D {(rankedSummary.kd || 0).toFixed(1)}
                  </div>
                </div>
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 text-center border dark:border-slate-700">
                  <div className="text-xs text-amber-600 mb-1 dark:text-amber-300">평균 딜량</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
                    {(rankedSummary.avgDamage || 0).toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-300">
                    승률 {(rankedSummary.winRate || 0).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 text-center border dark:border-slate-700">
                  <div className="text-xs text-amber-600 mb-1 dark:text-amber-300">TOP10</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
                    {typeof rankedSummary.top10Ratio === 'number'
                      ? (rankedSummary.top10Ratio * 100).toFixed(1)
                      : (rankedSummary.top10Rate || 0).toFixed(1)}
                    %
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-300">
                    평균 등수 {(rankedSummary.avgRank || 0).toFixed(1)}
                  </div>
                </div>
              </div>

              {/* 상세보기 버튼 */}
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowRankedDetails(!showRankedDetails)}
                  className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-medium rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 shadow-sm"
                >
                  {showRankedDetails
                    ? '▲ 상세 통계 숨기기'
                    : '▼ 상세 통계 보기'}
                </button>
              </div>

              {/* 상세 통계 섹션 */}
              {showRankedDetails && (
                <div className="mt-4 bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 border border-yellow-200 dark:border-slate-700">
                  <h3 className="text-sm font-bold text-gray-800 mb-3 text-center dark:text-slate-100">
                    상세 경쟁전 통계
                  </h3>

                  {/* 기본 전투 통계 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 text-center border dark:border-slate-700">
                      <div className="text-xs text-red-600 mb-1 dark:text-red-300">킬 수</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
                        {(rankedSummary.kills || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 text-center border dark:border-slate-700">
                      <div className="text-xs text-gray-600 mb-1 dark:text-slate-300">데스 수</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
                        {(rankedSummary.deaths || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 text-center border dark:border-slate-700">
                      <div className="text-xs text-blue-600 mb-1 dark:text-blue-300">어시스트</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
                        {(rankedSummary.assists || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 text-center border dark:border-slate-700">
                      <div className="text-xs text-blue-600 mb-1 dark:text-blue-300">KDA</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
                        {typeof rankedSummary.kda === 'number'
                          ? rankedSummary.kda.toFixed(1)
                          : '0.0'}
                      </div>
                    </div>
                  </div>

                  {/* 성과 통계 */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 text-center border dark:border-slate-700">
                      <div className="text-xs text-green-600 mb-1 dark:text-green-300">승리 수</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
                        {(rankedSummary.wins || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 text-center border dark:border-slate-700">
                      <div className="text-xs text-orange-600 mb-1 dark:text-orange-300">총 딜량</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
                        {(rankedSummary.damageDealt || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 text-center border dark:border-slate-700">
                      <div className="text-xs text-gray-600 mb-1 dark:text-slate-300">기절시킨 수</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
                        {(rankedSummary.dBNOs || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* 헤드샷 통계 */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 text-center border dark:border-slate-700">
                      <div className="text-xs text-red-600 mb-1 dark:text-red-300">헤드샷 킬 수</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
                        {(rankedSummary.headshotKills || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 text-center border dark:border-slate-700">
                      <div className="text-xs text-red-600 mb-1 dark:text-red-300">헤드샷 비율</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
                        {typeof rankedSummary.headshotRate === 'number'
                          ? rankedSummary.headshotRate.toFixed(1)
                          : '0.0'}
                        %
                      </div>
                    </div>
                  </div>

                  {/* 최고 기록 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 text-center border dark:border-slate-700">
                      <div className="text-xs text-yellow-600 mb-1 dark:text-yellow-300">최고 티어</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
                        {rankedSummary.bestTier || 'Unranked'}
                      </div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-3 text-center border dark:border-slate-700">
                      <div className="text-xs text-yellow-600 mb-1 dark:text-yellow-300">최고 RP</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-slate-100">
                        {(rankedSummary.bestRankPoint || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-6 text-center">
              <div className="text-4xl mb-3">❗</div>
              <div className="text-gray-600 font-medium dark:text-slate-300">
                아직 경쟁전 경기가 없습니다.
              </div>
              <div className="text-sm text-gray-500 mt-2 dark:text-slate-400">
                경쟁전에 참여하면 랭크 정보가 표시됩니다.
              </div>
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
