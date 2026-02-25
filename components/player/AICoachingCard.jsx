import { useState, useEffect, useRef } from 'react';
import { analyzePlayStyle } from '../../utils/aiCoaching';

const STYLE_NAMES = {
  AGGRESSIVE: '공격형',
  PASSIVE: '생존형',
  SNIPER: '저격형',
  SUPPORT: '지원형',
  BALANCED: '균형형',
};

const STYLE_ICONS = {
  AGGRESSIVE: '⚔️',
  PASSIVE: '🛡️',
  SNIPER: '🎯',
  SUPPORT: '🤝',
  BALANCED: '⚖️',
};

// PUBG-specific playstyle descriptions
const STYLE_DESCRIPTIONS = {
  AGGRESSIVE: '초반 핫드랍을 즐기며 교전을 주도하는 스타일. 킬과 딜량으로 팀을 이끌지만 무리한 돌진에 주의 필요',
  PASSIVE: '안전지대 위주로 포지셔닝하며 꾸준히 Top10에 진입하는 안정형. 킬 기회 포착이 추가 성장 포인트',
  SNIPER: '원거리 라이플로 교전을 주도하는 스타일. 정밀한 에임과 포지셔닝 선택이 핵심',
  SUPPORT: '팀원과 함께하며 어시스트와 정보 공유로 팀 승리를 만드는 협력형 플레이어',
  BALANCED: '공격과 생존을 상황에 따라 유연하게 전환하는 올라운더 플레이어',
};

// PUBG-specific weapon recommendations per playstyle
const WEAPON_RECOMMENDATIONS = {
  AGGRESSIVE: {
    primary: { name: 'M416', note: 'AR 전체 중 가장 안정적인 반동, 중근거리 최강', attach: '보정기+수직그립+확장탄창' },
    secondary: { name: 'UMP45', note: '근접 클리어링 및 실내 교전 최적', attach: '소음기+확장탄창' },
    tip: 'M416 + UMP45 조합으로 15m~200m 교전을 모두 커버하세요',
  },
  PASSIVE: {
    primary: { name: 'SCAR-L / QBZ', note: '반동 제어가 쉬워 안정적인 중거리 딜', attach: '보정기+수직그립' },
    secondary: { name: 'SKS / Mini14', note: '원거리 견제로 상대 접근을 차단', attach: '8배율+소음기' },
    tip: '안전지대 외곽에서 DMR로 블루존 압박 상대를 사냥하세요',
  },
  SNIPER: {
    primary: { name: 'Kar98k / M24', note: '1샷 헬멧 관통으로 넉다운 가능한 볼트액션', attach: '8배율+탄알집' },
    secondary: { name: 'Mini14 / SLR', note: '반자동 원거리 지원 및 DMR 연속 딜', attach: '8배율+소음기' },
    tip: 'Kar98k 300m 기준 조준점을 약 3밀 위로 보정하는 감각을 익히세요',
  },
  SUPPORT: {
    primary: { name: 'M416', note: '다목적 지원, 어느 상황에서도 팀 엄호 가능', attach: '소음기+수직그립+확장탄창' },
    secondary: { name: 'S686 / 어도부', note: '근접 적 방어 및 팀원 부활 커버', attach: '소음기' },
    tip: '레벨3 헬멧·방탄복 습득 시 팀원에게 먼저 제공하세요',
  },
  BALANCED: {
    primary: { name: 'M416', note: '모든 거리를 커버하는 배그 최고의 다용도 AR', attach: '보정기+수직그립+확장탄창' },
    secondary: { name: '상황별 선택', note: '근접엔 UMP45, 원거리엔 SKS / Mini14', attach: '상황에 맞게' },
    tip: 'M416을 기준으로 상황에 맞는 서브 무기를 유연하게 바꾸세요',
  },
};

const PRIORITY_BADGE = {
  긴급: 'bg-red-100 text-red-700',
  중요: 'bg-orange-100 text-orange-700',
  권장: 'bg-blue-100 text-blue-700',
};

// Build PUBG-specific action plans
function getPUBGActions(stats, playStyle) {
  const actions = [];

  // 1. Damage-based advice
  if (stats.avgDamage < 150) {
    actions.push({
      priority: '긴급',
      action: `Training Grounds에서 M416 반동(우하방)을 마우스로 당겨올리는 연습을 매일 15분씩 하세요. 100m 타겟에 30발 연속 명중을 목표로 잡으면 딜량이 빠르게 향상됩니다`,
    });
  } else if (stats.avgDamage < 280) {
    actions.push({
      priority: '중요',
      action: `딜량 ${Math.round(stats.avgDamage)}은 배그 평균보다 낮습니다. 교전 전 앉거나 엎드려 반동을 줄이고, 100-150m 거리에서 4배율 스코프로 점사(2~3발) 습관을 들이세요`,
    });
  } else if (stats.avgDamage < 400) {
    actions.push({
      priority: '권장',
      action: `딜량 ${Math.round(stats.avgDamage)}은 양호합니다. 200m 이상 원거리에서 DMR(SKS·Mini14) 견제를 추가하면 딜량과 어시스트를 동시에 올릴 수 있습니다`,
    });
  } else {
    actions.push({
      priority: '권장',
      action: `딜량 ${Math.round(stats.avgDamage)}은 상위권입니다. 원거리 교전 비중을 높이고, 팀원 부활 커버 시 DMR로 상대 포지션을 압박하는 고급 전술을 연습하세요`,
    });
  }

  // 2. Survival / win rate advice
  if (stats.winRate < 3) {
    actions.push({
      priority: '긴급',
      action: `치킨까지 살아남는 연습이 필요합니다. Top10 이후엔 먼저 뛰지 마세요 — 언덕·바위·건물 1층에 고정하고 상대가 이동할 때 사냥하세요. 먼저 움직이면 먼저 맞습니다`,
    });
  } else if (stats.winRate < 8) {
    actions.push({
      priority: '중요',
      action: `Top5 진입 후 고지대(언덕·언덕 능선)를 우선 확보하세요. 조준선 우위 = 교전 우위. 평지에서 위를 향해 싸우면 무조건 불리합니다`,
    });
  } else {
    actions.push({
      priority: '권장',
      action: `엔드게임 실력이 좋습니다(${stats.winRate.toFixed(1)}% 승률). 연막탄 1~2개 상시 소지로 불리한 포지션에서 탈출 루트를 만드는 고급 기술을 연습하세요`,
    });
  }

  // 3. Playstyle-specific advice
  const styleActions = {
    AGGRESSIVE: '교전 직전 팀원 위치를 확인하고 "돌격합니다" 콜을 하세요. 1명 단독 돌진보다 팀 엄호 사격 + 1명 진입 조합이 생존율을 2배 높입니다. 써드파티(제3자 개입)를 항상 경계하세요',
    PASSIVE: '중반(약 15분 후) 에너지드링크 3개를 상시 유지하여 블루존을 맞으며 이동할 수 있게 하세요. 붕대에만 의존하면 노출 시간이 길어져 죽습니다',
    SNIPER: '스나이핑 후 즉시 20m 옆으로 이동하는 습관을 들이세요. 1발 쏜 자리에 계속 있으면 역스나이핑 당합니다. 반드시 "쏘고 이동"을 반복하세요',
    SUPPORT: '스모크 그레네이드 1~2개와 어도부 권총을 항상 소지하세요. 팀원 넉다운 시 스모크로 시야 차단 후 안전하게 부활시키는 루틴을 팀과 공유하세요',
    BALANCED: '교전 참여 여부를 3초 내에 결정하세요. 배그에서 망설임은 죽음입니다. 유리하면 즉시 공격, 불리하면 즉시 이탈 — 이 판단력이 승률을 결정합니다',
  };

  actions.push({
    priority: '중요',
    action: styleActions[playStyle] || styleActions.BALANCED,
  });

  return actions;
}

// Build PUBG-specific strengths
function getPUBGStrengths(stats, analysis) {
  const list = [];

  if (stats.avgDamage >= 400)
    list.push({ title: '화력 우수', desc: `평균 딜량 ${Math.round(stats.avgDamage)} — 경기당 4명에게 피해를 주는 상위권 수준` });
  else if (stats.avgDamage >= 250)
    list.push({ title: '안정적인 딜량', desc: `평균 딜량 ${Math.round(stats.avgDamage)} — 팀 딜량에 꾸준히 기여` });

  if (stats.avgKills >= 3.0)
    list.push({ title: '킬링 머신', desc: `경기당 평균 ${stats.avgKills.toFixed(1)}킬 — 팀 전투력을 혼자 끌어올리는 수준` });
  else if (stats.avgKills >= 2.0)
    list.push({ title: '교전 능력 우수', desc: `경기당 평균 ${stats.avgKills.toFixed(1)}킬 — 안정적인 전투 기여도` });

  if (stats.winRate >= 15)
    list.push({ title: '치킨 본능', desc: `승률 ${stats.winRate.toFixed(1)}% — 최종 안전지대 운영 탁월` });
  else if (stats.winRate >= 8)
    list.push({ title: '엔드게임 실력', desc: `승률 ${stats.winRate.toFixed(1)}% — 상황판단과 포지셔닝 능숙` });

  if (stats.top10Rate >= 50)
    list.push({ title: '뛰어난 생존력', desc: `Top10 ${stats.top10Rate.toFixed(0)}% — 안전지대 관리와 이동 타이밍 최상` });
  else if (stats.top10Rate >= 35)
    list.push({ title: '안정적 생존', desc: `Top10 ${stats.top10Rate.toFixed(0)}% — 꾸준히 후반부까지 살아남는 실력` });

  if (stats.avgAssists >= 1.5)
    list.push({ title: '팀 기여 탁월', desc: `어시스트 ${stats.avgAssists.toFixed(1)}개 — 팀원 지원과 협력 플레이 능숙` });

  if (stats.headshotRate >= 30)
    list.push({ title: '헤드샷 정확도', desc: `헤드샷 비율 ${stats.headshotRate.toFixed(0)}% — 빠른 넉다운으로 교전 효율 높음` });

  if (stats.avgSurvivalTime >= 1400)
    list.push({ title: '포지셔닝 능력', desc: `평균 ${Math.round(stats.avgSurvivalTime / 60)}분 생존 — 루팅과 이동 경로 선택이 뛰어남` });

  if (analysis?.consistencyIndex > 70)
    list.push({ title: '일관성 있는 실력', desc: `일관성 ${Math.round(analysis.consistencyIndex)}% — 컨디션에 무관하게 믿을 수 있는 퍼포먼스` });

  if (list.length === 0)
    list.push({ title: '성장 잠재력', desc: `${stats.totalMatches}경기 데이터 기반 — 꾸준한 플레이로 빠른 성장이 예상됨` });

  return list;
}

// Build PUBG-specific improvements
function getPUBGImprovements(stats, analysis) {
  const list = [];

  if (stats.avgDamage < 180)
    list.push({ title: '딜량 향상 시급', desc: `평균 ${Math.round(stats.avgDamage)} — 배그 평균(200) 미달. 반동 제어 연습과 교전 거리 조정 필요` });
  else if (stats.avgDamage < 280)
    list.push({ title: '중거리 딜링 개선', desc: `평균 ${Math.round(stats.avgDamage)} → 300+ 목표. 100-200m 스코프(4배율) 점사 교전을 늘리세요` });

  if (stats.avgKills < 1.0)
    list.push({ title: '교전 참여 부족', desc: `경기당 ${stats.avgKills.toFixed(1)}킬 — 블루존 밖 이동하는 적이나 교전 중인 팀을 써드파티하는 타이밍을 노리세요` });
  else if (stats.avgKills < 1.5)
    list.push({ title: '교전 기회 확대 필요', desc: `경기당 ${stats.avgKills.toFixed(1)}킬 → 1.5+ 목표. 안전지대 안쪽 포지션에서 진입하는 적을 기다리세요` });

  if (stats.winRate < 3)
    list.push({ title: '최종 안전지대 운영', desc: `승률 ${stats.winRate.toFixed(1)}% — Top5 이후 무리한 킬보다 고지대 포지션 확보 우선 필요` });
  else if (stats.winRate < 6)
    list.push({ title: '엔드게임 결정력', desc: `승률 ${stats.winRate.toFixed(1)}% — 최종 안전지대 축소 시 1:1 교전 자신감과 포지션 싸움 개선 필요` });

  if (stats.top10Rate < 15)
    list.push({ title: '블루존 피해 과다 의심', desc: `Top10 ${stats.top10Rate.toFixed(0)}% — 미니맵 안전지대 확인을 습관화하고 이동 타이밍을 앞당기세요` });
  else if (stats.top10Rate < 25)
    list.push({ title: '중반 포지셔닝 개선', desc: `Top10 ${stats.top10Rate.toFixed(0)}% → 30%+ 목표. 안전지대 축소 직전 이동으로 블루존 데미지를 줄이세요` });

  if (stats.avgSurvivalTime < 480)
    list.push({ title: '초반 생존 전략 재검토', desc: `평균 ${Math.round(stats.avgSurvivalTime / 60)}분 생존 — 핫드랍 후 루팅 경쟁에서 패배할 가능성. 착지 지점 분산 또는 변경 고려` });
  else if (stats.avgSurvivalTime < 800)
    list.push({ title: '중반 생존율 개선', desc: `평균 ${Math.round(stats.avgSurvivalTime / 60)}분 생존 — 1차 안전지대 축소 시 이동 타이밍을 더 빠르게 잡으세요` });

  if (analysis?.consistencyIndex < 40)
    list.push({ title: '퍼포먼스 기복 심함', desc: `일관성 ${Math.round(analysis.consistencyIndex)}% — 매 게임 루팅 루트와 포지션을 정형화하여 안정성을 높이세요` });

  if (list.length === 0)
    list.push({ title: '고급 전술 습득', desc: '현재 지표 양호 — 그레네이드 활용, 차량 기동전, 팀 콜링 등 고급 스킬 도전을 추천합니다' });

  return list;
}

export default function AICoachingCard({ playerStats, playerInfo }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const savedKeyRef = useRef('');

  const getValue = (v) => {
    if (v == null) return 0;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  // 실제 수치 기반 stable key — 부모가 매 렌더마다 새 객체를 넘겨도 값이 같으면 동일한 문자열
  const statsKey = playerStats
    ? [
        playerStats.avgKills ?? playerStats.averageKills ?? 0,
        playerStats.avgDamage ?? playerStats.averageDamage ?? 0,
        playerStats.winRate ?? 0,
        playerStats.totalMatches ?? playerStats.roundsPlayed ?? 0,
      ].join('|')
    : '';

  const stats = {
    avgKills: getValue(playerStats?.avgKills ?? playerStats?.averageKills),
    avgDamage: getValue(playerStats?.avgDamage ?? playerStats?.averageDamage),
    avgSurvivalTime: getValue(playerStats?.avgSurvivalTime ?? playerStats?.avgSurviveTime),
    avgAssists: getValue(playerStats?.avgAssists),
    winRate: getValue(playerStats?.winRate),
    top10Rate: getValue(playerStats?.top10Rate),
    headshotRate: getValue(playerStats?.headshotRate),
    totalMatches: getValue(playerStats?.totalMatches ?? playerStats?.roundsPlayed),
    kd: getValue(playerStats?.kd),
  };

  useEffect(() => {
    if (!statsKey) return;
    try {
      const result = analyzePlayStyle(stats);
      setAnalysis(result);
      // 동일한 통계값으로는 API 1회만 호출
      if (savedKeyRef.current !== statsKey) {
        savedKeyRef.current = statsKey;
        fetch('/api/player/ai-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerNickname: playerInfo?.nickname,
            playerServer: playerInfo?.server,
            analysis: result,
          }),
        }).catch(() => {});
      }
    } catch (e) {
      console.error('AI 분석 오류:', e);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsKey]);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5">
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-10 h-10 bg-white/30 rounded-full" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-white/30 rounded" />
              <div className="h-3 w-48 bg-white/20 rounded" />
            </div>
          </div>
        </div>
        <div className="p-5 space-y-3 animate-pulse">
          <div className="h-14 bg-gray-100 rounded-lg" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasData = stats.avgKills > 0 || stats.avgDamage > 0 || stats.winRate > 0;
  if (!hasData || !analysis) {
    return (
      <div className="rounded-xl border border-gray-200 p-8 text-center">
        <div className="text-3xl mb-3">📊</div>
        <div className="text-sm font-bold text-gray-600 mb-1">분석 데이터 부족</div>
        <div className="text-xs text-gray-400">
          시즌 통계 데이터가 충분하지 않아 AI 코칭을 제공하기 어렵습니다.
          <br />더 많은 게임을 플레이한 후 다시 확인해보세요.
        </div>
      </div>
    );
  }

  const strengths = getPUBGStrengths(stats, analysis);
  const improvements = getPUBGImprovements(stats, analysis);
  const actions = getPUBGActions(stats, analysis.playStyle);
  const weapons = WEAPON_RECOMMENDATIONS[analysis.playStyle] || WEAPON_RECOMMENDATIONS.BALANCED;

  const styleColor = {
    AGGRESSIVE: 'from-red-600 to-orange-600',
    PASSIVE: 'from-blue-600 to-cyan-600',
    SNIPER: 'from-purple-600 to-violet-600',
    SUPPORT: 'from-green-600 to-teal-600',
    BALANCED: 'from-violet-600 to-indigo-600',
  };

  // Benchmark context for stats
  const statBenchmarks = [
    {
      label: '평균 킬',
      value: stats.avgKills.toFixed(1),
      color: 'text-red-600',
      sub: stats.avgKills >= 3 ? '상위 10%' : stats.avgKills >= 2 ? '상위 25%' : stats.avgKills >= 1 ? '평균' : '하위권',
      green: stats.avgKills >= 2,
      red: stats.avgKills < 1,
    },
    {
      label: '평균 딜량',
      value: Math.round(stats.avgDamage),
      color: 'text-orange-600',
      sub: stats.avgDamage >= 400 ? '상위 15%' : stats.avgDamage >= 280 ? '평균 이상' : stats.avgDamage >= 180 ? '평균' : '하위권',
      green: stats.avgDamage >= 280,
      red: stats.avgDamage < 180,
    },
    {
      label: '승률',
      value: `${stats.winRate.toFixed(1)}%`,
      color: 'text-green-600',
      sub: stats.winRate >= 15 ? '상위 10%' : stats.winRate >= 8 ? '상위 25%' : stats.winRate >= 4 ? '평균' : '하위권',
      green: stats.winRate >= 8,
      red: stats.winRate < 3,
    },
    {
      label: 'Top 10',
      value: `${stats.top10Rate.toFixed(1)}%`,
      color: 'text-blue-600',
      sub: stats.top10Rate >= 50 ? '상위 15%' : stats.top10Rate >= 30 ? '평균 이상' : stats.top10Rate >= 20 ? '평균' : '하위권',
      green: stats.top10Rate >= 30,
      red: stats.top10Rate < 15,
    },
  ];

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div
        className={`bg-gradient-to-r ${styleColor[analysis.playStyle] || 'from-violet-600 to-indigo-600'} px-6 py-5 text-white`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl flex-shrink-0">
            🤖
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm">AI 맞춤 코칭 리포트</div>
            <div className="text-white/70 text-xs">
              {playerInfo?.nickname}님의 {stats.totalMatches}경기 심층 분석
            </div>
          </div>
          <div className="ml-auto text-right flex-shrink-0">
            <div className="text-sm font-black">
              {STYLE_ICONS[analysis.playStyle]} {STYLE_NAMES[analysis.playStyle]}
            </div>
            <div className="text-white/70 text-xs">신뢰도 {Math.round(analysis.playstyleScore)}%</div>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* 플레이 스타일 설명 */}
        <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{STYLE_ICONS[analysis.playStyle]}</span>
          <div>
            <div className="text-sm font-bold text-gray-800">
              {playerInfo?.nickname}님은{' '}
              <span className="text-violet-700">{STYLE_NAMES[analysis.playStyle]} 플레이어</span>입니다
            </div>
            <div className="text-xs text-gray-600 mt-0.5">{STYLE_DESCRIPTIONS[analysis.playStyle]}</div>
          </div>
        </div>

        {/* 핵심 4개 지표 */}
        <div className="grid grid-cols-4 gap-2">
          {statBenchmarks.map(({ label, value, color, sub, green, red }) => (
            <div key={label} className="bg-white rounded-lg p-2.5 text-center border border-gray-200">
              <div className={`text-xl font-black ${color}`}>{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              <div
                className={`text-xs mt-0.5 ${green ? 'text-green-500' : red ? 'text-red-400' : 'text-gray-400'}`}
              >
                {sub}
              </div>
            </div>
          ))}
        </div>

        {/* AI 분석 지수 3개 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">AI 성향 분석 지수</div>
          <div className="space-y-3">
            {[
              {
                label: '공격성',
                value: analysis.aggressionIndex,
                barColor: 'bg-red-400',
                icon: '⚔️',
                desc:
                  analysis.aggressionIndex > 70
                    ? '매우 공격적'
                    : analysis.aggressionIndex > 45
                    ? '적극적'
                    : '신중함',
              },
              {
                label: '생존성',
                value: analysis.survivalIndex,
                barColor: 'bg-blue-400',
                icon: '🛡️',
                desc:
                  analysis.survivalIndex > 70
                    ? '생존 최우선'
                    : analysis.survivalIndex > 45
                    ? '균형 잡힘'
                    : '개선 필요',
              },
              {
                label: '일관성',
                value: analysis.consistencyIndex,
                barColor: 'bg-green-400',
                icon: '📈',
                desc:
                  analysis.consistencyIndex > 70
                    ? '매우 안정적'
                    : analysis.consistencyIndex > 45
                    ? '보통'
                    : '기복 심함',
              },
            ].map(({ label, value, barColor, icon, desc }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-sm w-5 text-center">{icon}</span>
                <span className="text-xs text-gray-600 w-12 flex-shrink-0">{label}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} rounded-full transition-all duration-700`}
                    style={{ width: `${Math.min(100, Math.round(value))}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-700 w-8 text-right">{Math.round(value)}</span>
                <span className="text-xs text-gray-400 w-16 hidden sm:block">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 강점 & 개선 포인트 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* 강점 */}
          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-emerald-600 text-sm">🏆</span>
              <span className="text-xs font-bold text-emerald-800">{playerInfo?.nickname}님의 강점</span>
            </div>
            <div className="space-y-2">
              {strengths.slice(0, 3).map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-4 h-4 bg-emerald-500 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-emerald-800">{s.title}</div>
                    <div className="text-xs text-emerald-600">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 개선 포인트 */}
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-orange-600 text-sm">⚡</span>
              <span className="text-xs font-bold text-orange-800">개선 우선순위</span>
            </div>
            <div className="space-y-2">
              {improvements.slice(0, 3).map((imp, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-4 h-4 bg-orange-500 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-orange-800">{imp.title}</div>
                    <div className="text-xs text-orange-600">{imp.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 추천 무기 & 전술 (PUBG 특화) */}
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-slate-600 text-sm">🔫</span>
            <span className="text-xs font-bold text-slate-800">
              {STYLE_NAMES[analysis.playStyle]} 스타일 추천 무기
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2.5">
            {[
              { label: '주무기', ...weapons.primary },
              { label: '보조무기', ...weapons.secondary },
            ].map(({ label, name, note, attach }) => (
              <div key={label} className="bg-white rounded-lg p-3 border border-slate-200">
                <div className="text-xs text-slate-400 mb-0.5">{label}</div>
                <div className="text-sm font-black text-slate-800">{name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{note}</div>
                <div className="text-xs text-blue-600 mt-1 font-medium">부착물: {attach}</div>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 rounded px-3 py-2 text-xs text-blue-700 border border-blue-100">
            💡 {weapons.tip}
          </div>
        </div>

        {/* 즉시 실행 액션 플랜 (PUBG 특화) */}
        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-indigo-600 text-sm">🚀</span>
            <span className="text-xs font-bold text-indigo-800">다음 게임부터 바로 적용할 개선 포인트</span>
          </div>
          <div className="space-y-2">
            {actions.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-2 bg-white/80 rounded-lg px-3 py-2.5 border border-indigo-100"
              >
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${PRIORITY_BADGE[item.priority]}`}
                >
                  {item.priority}
                </span>
                <span className="text-xs text-gray-700 leading-relaxed">{item.action}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-gray-400">
          시즌 {stats.totalMatches}경기 데이터 기반 AI 분석 •{' '}
          {new Date().toLocaleDateString('ko-KR')} 업데이트
        </div>
      </div>
    </div>
  );
}
