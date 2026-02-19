import { useState, useEffect } from 'react';
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

const STYLE_DESCRIPTIONS = {
  AGGRESSIVE: '교전을 적극적으로 주도하며 높은 딜량과 킬로 팀을 이끄는 스타일',
  PASSIVE: '안전한 포지셔닝과 신중한 판단으로 꾸준히 상위권에 진입하는 스타일',
  SNIPER: '원거리 사격과 정밀한 에임으로 적을 제압하는 전문 사수 스타일',
  SUPPORT: '어시스트와 팀 기여를 통해 팀 전체 승률을 끌어올리는 스타일',
  BALANCED: '상황에 따라 유연하게 대응하며 다양한 역할을 소화하는 스타일',
};

const PRIORITY_BADGE = {
  긴급: 'bg-red-100 text-red-700',
  중요: 'bg-orange-100 text-orange-700',
  권장: 'bg-blue-100 text-blue-700',
};

export default function AICoachingCard({ playerStats, playerInfo }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  const getValue = (v) => {
    if (v == null) return 0;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

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
    if (!playerStats) return;
    try {
      const result = analyzePlayStyle(stats);
      setAnalysis(result);
      // 서버에 분석 저장 (백그라운드)
      fetch('/api/player/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerNickname: playerInfo?.nickname,
          playerServer: playerInfo?.server,
          analysis: result,
        }),
      }).catch(() => {});
    } catch (e) {
      console.error('AI 분석 오류:', e);
    }
    setLoading(false);
  }, [playerStats]);

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
            {[1,2,3,4].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg" />)}
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

  // 강점 도출
  const strengths = [];
  if (stats.avgDamage > 400) strengths.push({ title: '정확한 에임', desc: `평균 ${Math.round(stats.avgDamage)} 딜량 — 상위 20% 수준` });
  if (stats.avgKills > 2.5) strengths.push({ title: '킬링 머신', desc: `경기당 평균 ${stats.avgKills.toFixed(1)}킬로 팀 전투력 기여` });
  if (stats.winRate > 15) strengths.push({ title: '승부 감각', desc: `${stats.winRate.toFixed(1)}% 승률 — 엔드게임 운영 능력 탁월` });
  if (stats.top10Rate > 35) strengths.push({ title: '안정적 생존', desc: `Top10 진입률 ${stats.top10Rate.toFixed(1)}% — 꾸준한 상위권` });
  if (stats.avgAssists > 1.2) strengths.push({ title: '팀 기여도', desc: `어시스트 ${stats.avgAssists.toFixed(1)}개 — 팀원 지원 능력 우수` });
  if (stats.headshotRate > 30) strengths.push({ title: '헤드샷 정확도', desc: `헤드샷 비율 ${stats.headshotRate.toFixed(0)}% — 교전 효율 높음` });
  if (analysis.consistencyIndex > 70) strengths.push({ title: '꾸준한 퍼포먼스', desc: `일관성 지수 ${Math.round(analysis.consistencyIndex)}% — 믿을 수 있는 실력` });
  if (strengths.length === 0) strengths.push({ title: '잠재력 보유', desc: `${stats.totalMatches}경기 데이터 기반 — 성장 가능성 확인됨` });

  // 개선 포인트 도출
  const improvements = [];
  if (stats.avgDamage < 250) improvements.push({ title: '딜량 향상 필요', desc: `현재 ${Math.round(stats.avgDamage)} → 목표 300+ (에임 훈련 2-3주)` });
  if (stats.avgKills < 1.5) improvements.push({ title: '교전 참여도 부족', desc: `현재 ${stats.avgKills.toFixed(1)}킬 → 더 적극적인 교전으로 1.5+ 목표` });
  if (stats.winRate < 5) improvements.push({ title: '엔드게임 결정력 부족', desc: `승률 ${stats.winRate.toFixed(1)}% → 최종 안전지대 운영 집중 필요` });
  if (stats.top10Rate < 20) improvements.push({ title: '중반 포지셔닝 개선', desc: `Top10 진입 ${stats.top10Rate.toFixed(1)}% → 안전지대 이동 타이밍 최적화` });
  if (stats.avgSurvivalTime < 900) improvements.push({ title: '초반 생존율 낮음', desc: `평균 ${Math.round(stats.avgSurvivalTime/60)}분 생존 → 랜딩 지점 재검토 필요` });
  if (analysis.consistencyIndex < 45) improvements.push({ title: '성과 기복 심함', desc: `일관성 ${Math.round(analysis.consistencyIndex)}% — 루틴 정립으로 안정성 확보` });
  if (improvements.length === 0) improvements.push({ title: '고급 단계 진입 가능', desc: '현재 지표 양호 — 더 높은 경쟁 레벨로의 도전 추천' });

  // 즉시 실행 액션
  const actions = [
    stats.avgDamage < 300
      ? { priority: '긴급', action: `훈련장에서 무기별 반동 패턴 매일 10분씩 연습 — 딜량 ${Math.round(stats.avgDamage)} → ${Math.round(stats.avgDamage * 1.2)} 목표` }
      : { priority: '권장', action: `현재 딜량(${Math.round(stats.avgDamage)}) 유지하며 원거리 교전 비중 높이기` },
    stats.winRate < 8
      ? { priority: '긴급', action: `Top10 진입 후 최종 안전지대 포지션 학습 — 승률 ${stats.winRate.toFixed(1)}% → 8% 목표` }
      : { priority: '중요', action: `현재 승률(${stats.winRate.toFixed(1)}%) 유지하며 클러치 상황 대처 연습` },
    analysis.playStyle === 'AGGRESSIVE'
      ? { priority: '중요', action: '교전 전 팀원 포지션 확인 습관화 — 무모한 돌진 대신 타이밍 교전으로 생존율 향상' }
      : analysis.playStyle === 'PASSIVE'
      ? { priority: '중요', action: '중반 이후 적극적 교전 기회 포착 — 교전 회피로 놓치는 킬 포인트 회수' }
      : { priority: '권장', action: `${STYLE_NAMES[analysis.playStyle]} 스타일 특성 강화 — 상황별 역할 전환 능력 개발` },
  ];

  const styleColor = {
    AGGRESSIVE: 'from-red-600 to-orange-600',
    PASSIVE: 'from-blue-600 to-cyan-600',
    SNIPER: 'from-purple-600 to-violet-600',
    SUPPORT: 'from-green-600 to-teal-600',
    BALANCED: 'from-violet-600 to-indigo-600',
  };

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div className={`bg-gradient-to-r ${styleColor[analysis.playStyle] || 'from-violet-600 to-indigo-600'} px-6 py-5 text-white`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl flex-shrink-0">🤖</div>
          <div className="min-w-0">
            <div className="font-bold text-sm">AI 맞춤 코칭 리포트</div>
            <div className="text-white/70 text-xs">{playerInfo?.nickname}님의 {stats.totalMatches}경기 심층 분석</div>
          </div>
          <div className="ml-auto text-right flex-shrink-0">
            <div className="text-sm font-black">{STYLE_ICONS[analysis.playStyle]} {STYLE_NAMES[analysis.playStyle]}</div>
            <div className="text-white/70 text-xs">신뢰도 {Math.round(analysis.playstyleScore)}%</div>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* 플레이 스타일 설명 */}
        <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{STYLE_ICONS[analysis.playStyle]}</span>
          <div>
            <div className="text-sm font-bold text-gray-800">{playerInfo?.nickname}님은 <span className="text-violet-700">{STYLE_NAMES[analysis.playStyle]} 플레이어</span>입니다</div>
            <div className="text-xs text-gray-600 mt-0.5">{STYLE_DESCRIPTIONS[analysis.playStyle]}</div>
          </div>
        </div>

        {/* 핵심 4개 지표 */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: '평균 킬', value: stats.avgKills.toFixed(1), color: 'text-red-600', sub: stats.avgKills > 2 ? '상위권' : stats.avgKills > 1 ? '평균' : '개선필요' },
            { label: '평균 딜량', value: Math.round(stats.avgDamage), color: 'text-orange-600', sub: stats.avgDamage > 350 ? '우수' : stats.avgDamage > 200 ? '평균' : '개선필요' },
            { label: '승률', value: `${stats.winRate.toFixed(1)}%`, color: 'text-green-600', sub: stats.winRate > 12 ? '상위권' : stats.winRate > 5 ? '평균' : '개선필요' },
            { label: 'Top 10', value: `${stats.top10Rate.toFixed(1)}%`, color: 'text-blue-600', sub: stats.top10Rate > 35 ? '우수' : stats.top10Rate > 20 ? '평균' : '개선필요' },
          ].map(({ label, value, color, sub }) => (
            <div key={label} className="bg-white rounded-lg p-2.5 text-center border border-gray-200">
              <div className={`text-xl font-black ${color}`}>{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              <div className={`text-xs mt-0.5 ${sub === '상위권' || sub === '우수' ? 'text-green-500' : sub === '개선필요' ? 'text-red-400' : 'text-gray-400'}`}>{sub}</div>
            </div>
          ))}
        </div>

        {/* AI 분석 지수 3개 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">AI 성향 분석 지수</div>
          <div className="space-y-3">
            {[
              { label: '공격성', value: analysis.aggressionIndex, barColor: 'bg-red-400', icon: '⚔️',
                desc: analysis.aggressionIndex > 70 ? '매우 공격적' : analysis.aggressionIndex > 45 ? '적극적' : '신중함' },
              { label: '생존성', value: analysis.survivalIndex, barColor: 'bg-blue-400', icon: '🛡️',
                desc: analysis.survivalIndex > 70 ? '생존 최우선' : analysis.survivalIndex > 45 ? '균형 잡힘' : '개선 필요' },
              { label: '일관성', value: analysis.consistencyIndex, barColor: 'bg-green-400', icon: '📈',
                desc: analysis.consistencyIndex > 70 ? '매우 안정적' : analysis.consistencyIndex > 45 ? '보통' : '기복 심함' },
            ].map(({ label, value, barColor, icon, desc }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-sm w-5 text-center">{icon}</span>
                <span className="text-xs text-gray-600 w-12 flex-shrink-0">{label}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${Math.min(100, Math.round(value))}%` }} />
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
                  <span className="w-4 h-4 bg-emerald-500 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{i+1}</span>
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
                  <span className="w-4 h-4 bg-orange-500 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{i+1}</span>
                  <div>
                    <div className="text-xs font-bold text-orange-800">{imp.title}</div>
                    <div className="text-xs text-orange-600">{imp.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 즉시 실행 액션 플랜 */}
        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-indigo-600 text-sm">🚀</span>
            <span className="text-xs font-bold text-indigo-800">지금 바로 실행할 수 있는 개선 액션 3가지</span>
          </div>
          <div className="space-y-2">
            {actions.map((item, i) => (
              <div key={i} className="flex items-start gap-2 bg-white/80 rounded-lg px-3 py-2.5 border border-indigo-100">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${PRIORITY_BADGE[item.priority]}`}>{item.priority}</span>
                <span className="text-xs text-gray-700 leading-relaxed">{item.action}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-gray-400">
          시즌 {stats.totalMatches}경기 데이터 기반 AI 분석 • {new Date().toLocaleDateString('ko-KR')} 업데이트
        </div>
      </div>
    </div>
  );
}
