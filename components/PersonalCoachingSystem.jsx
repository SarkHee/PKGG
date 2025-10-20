// components/PersonalCoachingSystem.jsx
// 개인 맞춤형 훈련/피드백 시스템

import { useState, useEffect } from 'react';

// AI 코칭 분석 함수
function analyzePlayerBehavior(playerStats, matches) {
  const analysis = {
    combatTiming: {},
    deathCauses: {},
    weaknesses.push('낮은 K/D 비율 (' + playerKdr.toFixed(1) + ')');
  } else if (playerKdr > 1.3) {
    strengths.push('우수한 교전 능력 (K/D: ' + playerKdr.toFixed(1) + ')'); weaponPerformance: {},
    mapPerformance: {},
    recommendations: [],
    strengths: [],
    weaknesses: []
  };

  console.log('🔍 AI 코칭 분석 시작 - 플레이어 통계:', playerStats);
  console.log('🔍 AI 코칭 분석 시작 - 경기 데이터:', matches?.length, '경기');

  // 최근 경기 데이터로부터 실시간 통계 계산 (playerStats가 0인 경우 대비)
  let calculatedStats = {
    avgDamage: playerStats?.avgDamage || 0,
    avgKills: playerStats?.avgKills || 0,
    avgDeaths: playerStats?.avgDeaths || 1,
    avgAssists: playerStats?.avgAssists || 0,
    winRatio: playerStats?.winRatio || playerStats?.winRate || 0,
    avgSurvivalTime: playerStats?.avgSurvivalTime || 0
  };

  // playerStats가 모두 0이면 최근 경기에서 직접 계산
  if (matches && matches.length > 0 && 
      (calculatedStats.avgDamage === 0 || calculatedStats.avgKills === 0)) {
    
    const recentMatches = matches.slice(0, 20);
    const totalMatches = recentMatches.length;
    
    if (totalMatches > 0) {
      const totalDamage = recentMatches.reduce((sum, match) => sum + (match.damage || 0), 0);
      const totalKills = recentMatches.reduce((sum, match) => sum + (match.kills || 0), 0);
      const totalAssists = recentMatches.reduce((sum, match) => sum + (match.assists || 0), 0);
      const totalSurvivalTime = recentMatches.reduce((sum, match) => sum + (match.survivalTime || match.surviveTime || 0), 0);
      const wins = recentMatches.filter(match => (match.placement || match.winPlace || 100) === 1).length;
      
      calculatedStats = {
        avgDamage: totalDamage / totalMatches,
        avgKills: totalKills / totalMatches,
        avgDeaths: 1, // 기본값, 실제로는 계산하기 어려움
        avgAssists: totalAssists / totalMatches,
        winRatio: (wins / totalMatches) * 100,
        avgSurvivalTime: totalSurvivalTime / totalMatches
      };

      console.log('📊 최근 경기 기반 실시간 계산된 통계:', calculatedStats);
    }
  }

  // 이후 분석에서는 calculatedStats 사용
  const avgDamage = calculatedStats.avgDamage;
  const avgKills = calculatedStats.avgKills;
  const playerKdr = avgKills / Math.max(1, calculatedStats.avgDeaths);

  console.log('🎯 최종 사용할 통계:', { avgDamage, avgKills, playerKdr, winRatio: calculatedStats.winRatio });

  // 교전 타이밍 분석 (실제 경기 데이터 기반)
  if (matches && matches.length > 0) {
    const validMatches = matches.filter(match => match.survivalTime || match.surviveTime);
    const totalSurvivalTime = validMatches.reduce((sum, match) => {
      return sum + (match.survivalTime || match.surviveTime || 0);
    }, 0);
    
    const avgSurviveTime = validMatches.length > 0 ? totalSurvivalTime / validMatches.length : 0;
    const earlyDeaths = validMatches.filter(match => (match.survivalTime || match.surviveTime || 0) < 300).length; // 5분 미만
    const earlyDeathRate = validMatches.length > 0 ? (earlyDeaths / validMatches.length) * 100 : 0;

    analysis.combatTiming = {
      avgSurviveTime: Math.round(avgSurviveTime),
      earlyDeathRate: Math.round(earlyDeathRate),
      recommendedEngagementTime: earlyDeathRate > 40 ? 600 : 300, // 10분 vs 5분
      totalMatches: validMatches.length
    };

    console.log('⏰ 교전 타이밍 분석:', analysis.combatTiming);
  }

  // 사망 원인 분석 (실제 경기 데이터 기반으로 개선)
  let deathAnalysis = [];
  
  if (matches && matches.length > 0) {
    const validMatches = matches.filter(match => match.survivalTime || match.surviveTime);
    let hotDropDeaths = 0;
    let lateGameDeaths = 0;
    let midGameDeaths = 0;
    let lowPlacementDeaths = 0;
    let highDamageDeaths = 0;

    validMatches.forEach(match => {
      const survivalTime = match.survivalTime || match.surviveTime || 0;
      const placement = match.placement || 100;
      const damage = match.damage || 0;

      // 초반 사망 (5분 미만)
      if (survivalTime < 300) {
        hotDropDeaths++;
      }
      // 중반 사망 (5-15분)
      else if (survivalTime < 900) {
        midGameDeaths++;
      }
      // 후반 사망 (15분 이상)
      else {
        lateGameDeaths++;
      }

      // 낮은 순위에서 사망 (50위 이하)
      if (placement > 50) {
        lowPlacementDeaths++;
      }

      // 높은 데미지 경기에서 사망
      if (damage > (playerStats?.avgDamage || 0) * 1.2) {
        highDamageDeaths++;
      }
    });

    const totalMatches = validMatches.length;
    
    deathAnalysis = [
      { 
        cause: '초반 핫드롭 교전', 
        rate: totalMatches > 0 ? Math.round((hotDropDeaths / totalMatches) * 100) : 0,
        count: hotDropDeaths,
        icon: '🔥'
      },
      { 
        cause: '중반 교전 사망', 
        rate: totalMatches > 0 ? Math.round((midGameDeaths / totalMatches) * 100) : 0,
        count: midGameDeaths,
        icon: '⚔️'
      },
      { 
        cause: '후반 존 단계', 
        rate: totalMatches > 0 ? Math.round((lateGameDeaths / totalMatches) * 100) : 0,
        count: lateGameDeaths,
        icon: '⚡'
      },
      { 
        cause: '순위권 밖 사망', 
        rate: totalMatches > 0 ? Math.round((lowPlacementDeaths / totalMatches) * 100) : 0,
        count: lowPlacementDeaths,
        icon: '📉'
      }
    ].sort((a, b) => b.rate - a.rate);

    console.log('💀 사망 원인 분석:', deathAnalysis);
  } else {
    // 경기 데이터가 없는 경우 기본값
    deathAnalysis = [
      { cause: '데이터 부족', rate: 0, count: 0, icon: '❓' },
      { cause: '분석 불가', rate: 0, count: 0, icon: '❓' },
      { cause: '경기 필요', rate: 0, count: 0, icon: '❓' }
    ];
  }

  analysis.deathCauses = deathAnalysis.slice(0, 3);

  // 무기별 성과 분석 (실제 통계 기반으로 개선)
  const weaponTypes = [
    { 
      type: 'AR (소총)', 
      performance: avgDamage > 300 ? 'excellent' : avgDamage > 200 ? 'good' : avgDamage > 100 ? 'average' : 'poor',
      recommendation: avgDamage < 150 ? '소총 조준 연습 필요 (현재: ' + Math.round(avgDamage) + ' 데미지)' : 
                      avgDamage > 250 ? '소총 활용 우수 (현재: ' + Math.round(avgDamage) + ' 데미지)' :
                      '소총 실력 보통 수준 (현재: ' + Math.round(avgDamage) + ' 데미지)',
      score: avgDamage
    },
    { 
      type: 'SR (저격총)', 
      performance: avgKills > 3 ? 'excellent' : avgKills > 2 ? 'good' : avgKills > 1 ? 'average' : 'poor',
      recommendation: avgKills < 1 ? '저격총 연습 권장 (현재 평균 킬: ' + avgKills.toFixed(1) + ')' : 
                      avgKills > 2.5 ? '저격 실력 우수 (현재 평균 킬: ' + avgKills.toFixed(1) + ')' :
                      '저격 실력 보통 수준 (현재 평균 킬: ' + avgKills.toFixed(1) + ')',
      score: avgKills
    },
    { 
      type: 'CQC (근접전)', 
      performance: playerKdr > 1.5 ? 'good' : playerKdr > 0.8 ? 'average' : 'poor',
      recommendation: playerKdr < 0.8 ? '근접 교전 승률 향상 필요 (K/D: ' + playerKdr.toFixed(1) + ')' :
                      playerKdr > 1.3 ? '근접 교전 능력 우수 (K/D: ' + playerKdr.toFixed(1) + ')' :
                      '근접 교전 능력 보통 수준 (K/D: ' + playerKdr.toFixed(1) + ')',
      score: playerKdr
    }
  ];

  analysis.weaponPerformance = weaponTypes;

  console.log('🔫 무기별 성과 분석:', weaponTypes);

  // AI 추천 사항 생성 (더 정확한 데이터 기반)
  const recommendations = [];
  const strengths = [];
  const weaknesses = [];

  // 생존 시간 기반 추천
  if (analysis.combatTiming.earlyDeathRate > 40) {
    recommendations.push({
      type: 'combat_timing',
      title: '교전 타이밍 조절',
      message: `최근 ${analysis.combatTiming.totalMatches}경기 중 ${Math.round(analysis.combatTiming.earlyDeathRate)}%가 초반(5분 미만) 사망입니다. ${Math.round(analysis.combatTiming.recommendedEngagementTime / 60)}분 이후 교전을 추천합니다.`,
      priority: 'high',
      icon: '⏰',
      data: `평균 생존시간: ${Math.floor(analysis.combatTiming.avgSurviveTime)}초`
    });
    weaknesses.push('초반 교전 생존율 낮음 (' + Math.round(analysis.combatTiming.earlyDeathRate) + '%)');
  } else if (analysis.combatTiming.earlyDeathRate < 20) {
    strengths.push('초반 생존 능력 우수 (' + Math.round(100 - analysis.combatTiming.earlyDeathRate) + '% 생존)');
  }

  // 데미지 기반 추천
  if (avgDamage < 150) {
    recommendations.push({
      type: 'damage',
      title: '화력 강화 훈련',
      message: `현재 평균 데미지 ${Math.round(avgDamage)}이 낮습니다. 조준 연습과 무기 선택 개선이 필요합니다.`,
      priority: 'high',
      icon: '🎯',
      data: `목표: 200+ 데미지`
    });
    weaknesses.push('평균 데미지 부족 (' + Math.round(avgDamage) + ')');
  } else if (avgDamage > 250) {
    strengths.push('높은 화력 기여도 (' + Math.round(avgDamage) + ' 데미지)');
  }

  // K/D 비율 기반 추천
  if (playerKdr < 0.8) {
    recommendations.push({
      type: 'kdr',
      title: '교전 효율성 개선',
      message: `K/D 비율 ${playerKdr.toFixed(1)}로 교전 선택과 포지셔닝 개선이 필요합니다.`,
      priority: 'medium',
      icon: '⚔️',
      data: `목표: 1.0+ K/D`
    });
    weaknesses.push('낮은 K/D 비율 (' + playerKdr.toFixed(1) + ')');
  } else if (playerKdr > 1.5) {
    strengths.push('우수한 교전 능력 (K/D: ' + playerKdr.toFixed(1) + ')');
  }

  // 승률 기반 추천
  const winRate = calculatedStats.winRatio;
  if (winRate < 10) {
    recommendations.push({
      type: 'positioning',
      title: '포지셔닝 및 존 관리',
      message: `승률 ${winRate.toFixed(1)}%가 낮습니다. 존 타이밍과 안전지대 이동 패턴을 개선하세요.`,
      priority: 'medium',
      icon: '📍',
      data: `현재 승률: ${winRate.toFixed(1)}%`
    });
    weaknesses.push('낮은 승률 (' + winRate.toFixed(1) + '%)');
  } else if (winRate > 15) {
    strengths.push('높은 승률 유지 (' + winRate.toFixed(1) + '%)');
  }

  // 어시스트 기반 팀플레이 분석
  const avgAssists = calculatedStats.avgAssists;
  if (avgAssists < 0.5) {
    recommendations.push({
      type: 'teamwork',
      title: '팀워크 향상',
      message: `평균 어시스트 ${avgAssists.toFixed(1)}로 팀원과의 협력을 늘려보세요.`,
      priority: 'low',
      icon: '🤝',
      data: `목표: 1.0+ 어시스트`
    });
  } else if (avgAssists > 1.5) {
    strengths.push('우수한 팀워크 (' + avgAssists.toFixed(1) + ' 어시스트)');
  }

  // 분석 결과 저장
  analysis.recommendations = recommendations.slice(0, 3); // 상위 3개만
  analysis.strengths = strengths;
  analysis.weaknesses = weaknesses;

  console.log('🎯 AI 코치 최종 분석:', {
    recommendations: analysis.recommendations.length,
    strengths: analysis.strengths.length,
    weaknesses: analysis.weaknesses.length
  });

  return analysis;
}

// 메인 컴포넌트
export default function PersonalCoachingSystem({ playerStats, matches }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    if (playerStats) {
      setLoading(true);
      // AI 분석 실행
      const result = analyzePlayerBehavior(playerStats, matches);
      setAnalysis(result);
      setLoading(false);
    }
  }, [playerStats, matches]);

  if (loading || !analysis) {
    return (
      <div className="bg-gradient-to-br from-violet-50 to-purple-100 dark:from-violet-900/30 dark:to-purple-800/30 border border-violet-200 dark:border-violet-700 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🤖</span>
          <h2 className="text-xl font-bold text-violet-800 dark:text-violet-200">개인 맞춤형 AI 코칭</h2>
        </div>
        <div className="text-violet-600 dark:text-violet-400">분석 중...</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-100 dark:from-violet-900/30 dark:to-purple-800/30 border border-violet-200 dark:border-violet-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">🤖</span>
        <h2 className="text-xl font-bold text-violet-800 dark:text-violet-200">개인 맞춤형 AI 코칭</h2>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex space-x-1 mb-6 bg-violet-100 dark:bg-violet-800/50 rounded-lg p-1 border border-violet-200 dark:border-violet-600">
        {[
          { id: 'overview', label: '종합 분석', icon: '📊' },
          { id: 'combat', label: '교전 분석', icon: '⚔️' },
          { id: 'training', label: '훈련 계획', icon: '🎯' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              selectedTab === tab.id
                ? 'bg-violet-600 dark:bg-violet-500 text-white shadow-sm'
                : 'text-violet-700 dark:text-violet-300 hover:text-violet-900 dark:hover:text-violet-100 hover:bg-violet-200 dark:hover:bg-violet-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 종합 분석 탭 */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* 강점과 약점 */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* 강점 */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-800/30 border border-green-200 dark:border-green-600 rounded-lg p-4 shadow-sm">
              <h3 className="text-green-700 dark:text-green-300 font-bold mb-3 flex items-center gap-2">
                ✅ 강점 분야
              </h3>
              {analysis.strengths.length > 0 ? (
                <ul className="space-y-2">
                  {analysis.strengths.map((strength, idx) => (
                    <li key={idx} className="text-green-800 dark:text-green-200 text-sm flex items-center gap-2">
                      <span className="text-green-600 dark:text-green-400">•</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-green-600 dark:text-green-400 text-sm">분석 중입니다...</p>
              )}
            </div>

            {/* 약점 */}
            <div className="bg-gradient-to-br from-red-50 to-pink-100 dark:from-red-900/30 dark:to-pink-800/30 border border-red-200 dark:border-red-600 rounded-lg p-4 shadow-sm">
              <h3 className="text-red-700 dark:text-red-300 font-bold mb-3 flex items-center gap-2">
                ⚠️ 개선 필요 분야
              </h3>
              {analysis.weaknesses.length > 0 ? (
                <ul className="space-y-2">
                  {analysis.weaknesses.map((weakness, idx) => (
                    <li key={idx} className="text-red-800 dark:text-red-200 text-sm flex items-center gap-2">
                      <span className="text-red-600 dark:text-red-400">•</span>
                      {weakness}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-red-600 dark:text-red-400 text-sm">특별한 약점이 발견되지 않았습니다.</p>
              )}
            </div>
          </div>

          {/* AI 추천사항 */}
          <div>
            <h3 className="text-violet-800 dark:text-violet-200 font-bold mb-4 flex items-center gap-2">
              🎯 AI 추천사항
            </h3>
            <div className="space-y-3">
              {analysis.recommendations.map((rec, idx) => (
                <div key={idx} className={`p-4 rounded-lg border shadow-sm ${
                  rec.priority === 'high' ? 'bg-gradient-to-r from-orange-50 to-red-100 dark:from-orange-900/40 dark:to-red-800/40 border-orange-200 dark:border-orange-600' :
                  rec.priority === 'medium' ? 'bg-gradient-to-r from-yellow-50 to-amber-100 dark:from-yellow-900/40 dark:to-amber-800/40 border-yellow-200 dark:border-yellow-600' :
                  'bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-800/40 border-blue-200 dark:border-blue-600'
                }`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{rec.icon}</span>
                    <div className="flex-1">
                      <h4 className={`font-semibold mb-2 ${
                        rec.priority === 'high' ? 'text-orange-800 dark:text-orange-200' :
                        rec.priority === 'medium' ? 'text-yellow-800 dark:text-yellow-200' :
                        'text-blue-800 dark:text-blue-200'
                      }`}>
                        {rec.title}
                      </h4>
                      <p className={`text-sm leading-relaxed mb-2 ${
                        rec.priority === 'high' ? 'text-orange-700 dark:text-orange-300' :
                        rec.priority === 'medium' ? 'text-yellow-700 dark:text-yellow-300' :
                        'text-blue-700 dark:text-blue-300'
                      }`}>
                        {rec.message}
                      </p>
                      {rec.data && (
                        <div className={`text-xs px-2 py-1 rounded font-mono ${
                          rec.priority === 'high' ? 'bg-orange-200 dark:bg-orange-800/50 text-orange-800 dark:text-orange-200' :
                          rec.priority === 'medium' ? 'bg-yellow-200 dark:bg-yellow-800/50 text-yellow-800 dark:text-yellow-200' :
                          'bg-blue-200 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200'
                        }`}>
                          {rec.data}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 교전 분석 탭 */}
      {selectedTab === 'combat' && (
        <div className="space-y-6">
          {/* 교전 타이밍 분석 */}
          <div className="bg-gradient-to-br from-cyan-50 to-teal-100 dark:from-cyan-900/30 dark:to-teal-800/30 border border-cyan-200 dark:border-cyan-600 rounded-lg p-4 shadow-sm">
            <h3 className="text-cyan-800 dark:text-cyan-200 font-bold mb-4 flex items-center gap-2">
              ⏰ 교전 타이밍 분석
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
                  {Math.floor(analysis.combatTiming.avgSurviveTime / 60)}분 {analysis.combatTiming.avgSurviveTime % 60}초
                </div>
                <div className="text-sm text-cyan-600 dark:text-cyan-400">평균 생존시간</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {analysis.combatTiming.earlyDeathRate}%
                </div>
                <div className="text-sm text-orange-600 dark:text-orange-400">초반 사망률</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {Math.floor(analysis.combatTiming.recommendedEngagementTime / 60)}분+
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">권장 교전 시작</div>
              </div>
            </div>
          </div>

          {/* 사망 원인 TOP 3 */}
          <div className="bg-gradient-to-br from-red-50 to-pink-100 dark:from-red-900/30 dark:to-pink-800/30 border border-red-200 dark:border-red-600 rounded-lg p-4 shadow-sm">
            <h3 className="text-red-800 dark:text-red-200 font-bold mb-4 flex items-center gap-2">
              💀 주요 사망 원인 TOP 3
            </h3>
            <div className="space-y-3">
              {analysis.deathCauses.map((cause, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white/60 dark:bg-red-800/20 rounded-lg border border-red-100 dark:border-red-700/50">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cause.icon}</span>
                    <span className="text-red-800 dark:text-red-200 font-medium">#{idx + 1} {cause.cause}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-700 dark:text-red-300">{Math.round(cause.rate)}%</div>
                    {cause.count && (
                      <div className="text-xs text-red-600 dark:text-red-400">{cause.count}회</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 무기별 성과 */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-900/30 dark:to-purple-800/30 border border-indigo-200 dark:border-indigo-600 rounded-lg p-4 shadow-sm">
            <h3 className="text-indigo-800 dark:text-indigo-200 font-bold mb-4 flex items-center gap-2">
              🔫 무기별 성과 분석
            </h3>
            <div className="space-y-3">
              {analysis.weaponPerformance.map((weapon, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white/60 dark:bg-indigo-800/20 rounded-lg border border-indigo-100 dark:border-indigo-700/50">
                  <div className="flex-1">
                    <div className="text-indigo-800 dark:text-indigo-200 font-medium">{weapon.type}</div>
                    <div className="text-sm text-indigo-600 dark:text-indigo-400">{weapon.recommendation}</div>
                    {weapon.score && (
                      <div className="text-xs text-indigo-500 dark:text-indigo-300 mt-1">
                        점수: {typeof weapon.score === 'number' ? weapon.score.toFixed(1) : weapon.score}
                      </div>
                    )}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    weapon.performance === 'excellent' ? 'bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-200' :
                    weapon.performance === 'good' ? 'bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200' :
                    weapon.performance === 'average' ? 'bg-yellow-100 dark:bg-yellow-800/50 text-yellow-800 dark:text-yellow-200' :
                    'bg-red-100 dark:bg-red-800/50 text-red-800 dark:text-red-200'
                  }`}>
                    {weapon.performance === 'excellent' ? '우수' :
                     weapon.performance === 'good' ? '양호' :
                     weapon.performance === 'average' ? '보통' : '개선필요'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 훈련 계획 탭 */}
      {selectedTab === 'training' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900/30 dark:to-teal-800/30 border border-emerald-200 dark:border-emerald-600 rounded-lg p-6 shadow-sm">
            <h3 className="text-emerald-800 dark:text-emerald-200 font-bold mb-4 flex items-center gap-2">
              🎯 맞춤형 훈련 계획
            </h3>
            
            <div className="space-y-4">
              {/* 단계별 훈련 */}
              <div className="bg-white/60 dark:bg-emerald-800/20 rounded-lg p-4 border border-emerald-100 dark:border-emerald-700/50">
                <h4 className="text-emerald-700 dark:text-emerald-300 font-semibold mb-3">1단계: 기초 실력 향상</h4>
                <ul className="space-y-2 text-sm text-emerald-800 dark:text-emerald-200">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                    사격장에서 매일 10분 조준 연습
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    다양한 무기 반동 패턴 학습
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    민감도 설정 최적화
                  </li>
                </ul>
              </div>

              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-yellow-300 font-semibold mb-3">2단계: 전술적 개선</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                    다양한 무기 반동 패턴 숙지
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                    기본 이동 및 엄폐 기술 습득
                  </li>
                </ul>
              </div>

              <div className="bg-white/60 dark:bg-emerald-800/20 rounded-lg p-4 border border-emerald-100 dark:border-emerald-700/50">
                <h4 className="text-amber-700 dark:text-amber-300 font-semibold mb-3">2단계: 전술적 사고</h4>
                <ul className="space-y-2 text-sm text-emerald-800 dark:text-emerald-200">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400">◐</span>
                    안전한 낙하 지점 선택 연습
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400">◐</span>
                    맵별 포지셔닝 전략 학습
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400">◐</span>
                    존 타이밍과 이동 경로 계획
                  </li>
                </ul>
              </div>

              <div className="bg-white/60 dark:bg-emerald-800/20 rounded-lg p-4 border border-emerald-100 dark:border-emerald-700/50">
                <h4 className="text-purple-700 dark:text-purple-300 font-semibold mb-3">3단계: 고급 전술</h4>
                <ul className="space-y-2 text-sm text-emerald-800 dark:text-emerald-200">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 dark:text-emerald-500">○</span>
                    팀 커뮤니케이션 향상
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 dark:text-emerald-500">○</span>
                    상황별 교전/회피 판단
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400 dark:text-emerald-500">○</span>
                    고급 건물 컨트롤 기술
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* 주간 목표 */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-800/30 border border-blue-200 dark:border-blue-600 rounded-lg p-4 shadow-sm">
            <h3 className="text-blue-800 dark:text-blue-200 font-bold mb-4 flex items-center gap-2">
              📅 주간 개선 목표
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-blue-100 dark:bg-blue-800/30 border border-blue-200 dark:border-blue-600/50 rounded-lg p-3">
                <h4 className="text-blue-800 dark:text-blue-200 font-semibold mb-2">이번 주 목표</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  평균 생존시간 {Math.floor(analysis.combatTiming.avgSurviveTime) + 120}초 달성하기
                </p>
              </div>
              <div className="bg-green-100 dark:bg-green-800/30 border border-green-200 dark:border-green-600/50 rounded-lg p-3">
                <h4 className="text-green-800 dark:text-green-200 font-semibold mb-2">장기 목표</h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  킬/데스 비율 1.5 이상 유지하기
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
