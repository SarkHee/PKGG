import { useState, useEffect } from 'react';
import { analyzePlayStyle, generateTrainingPlan, getPersonalizedTips } from '../utils/aiCoaching';

export default function AICoachingCard({ playerStats, playerInfo }) {
  const [analysis, setAnalysis] = useState(null);
  const [trainingPlan, setTrainingPlan] = useState(null);
  const [personalizedTips, setPersonalizedTips] = useState([]);
  const [activeTab, setActiveTab] = useState('analysis');
  const [loading, setLoading] = useState(true);

  // 안전한 playerStats 데이터 처리
  const getSafePlayerStats = (stats) => {
    // 값이 존재하는지 먼저 확인하고, 존재하면 Number로 변환
    const getValue = (value) => {
      if (value === null || value === undefined) return 0;
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    };

    const safeStats = {
      avgKills: getValue(stats?.avgKills ?? stats?.averageKills ?? stats?.killsPerGame),
      avgDamage: getValue(stats?.avgDamage ?? stats?.averageDamage ?? stats?.damagePerGame),
      avgSurvivalTime: getValue(stats?.avgSurvivalTime ?? stats?.avgSurviveTime ?? stats?.averageSurvivalTime),
      avgAssists: getValue(stats?.avgAssists ?? stats?.averageAssists ?? stats?.assistsPerGame),
      winRate: getValue(stats?.winRate ?? stats?.winRatio ?? stats?.wins),
      top10Rate: getValue(stats?.top10Rate ?? stats?.top10Ratio ?? stats?.top10s),
      headshotRate: (() => {
        if (stats?.headshotRate !== undefined && stats?.headshotRate !== null) {
          return getValue(stats.headshotRate);
        }
        if (stats?.headshotKillRatio !== undefined && stats?.headshotKillRatio !== null) {
          const ratio = parseFloat(stats.headshotKillRatio);
          return getValue(ratio > 1 ? ratio : ratio * 100);
        }
        return 0;
      })(),
      totalMatches: getValue(stats?.totalMatches ?? stats?.roundsPlayed ?? stats?.games),
      kd: getValue(stats?.kd ?? stats?.kdRatio)
    };
    
    // 디버깅을 위한 로그
    console.log('🔍 getSafePlayerStats - 원본 데이터:', stats);
    console.log('🔍 getSafePlayerStats - 처리된 결과:', safeStats);
    
    // 각 필드별 상세 확인
    console.log('📊 필드별 매핑 결과:');
    console.log('  avgKills:', stats?.avgKills, '→', safeStats.avgKills);
    console.log('  winRate:', stats?.winRate, '→', safeStats.winRate);
    console.log('  top10Rate:', stats?.top10Rate, '→', safeStats.top10Rate);
    
    return safeStats;
  };

  const safePlayerStats = getSafePlayerStats(playerStats);

  // 디버깅을 위한 데이터 출력
  useEffect(() => {
    console.log('AICoachingCard - 원본 playerStats:', playerStats);
    console.log('AICoachingCard - 처리된 safePlayerStats:', safePlayerStats);
  }, [playerStats, safePlayerStats]);

  useEffect(() => {
    if (playerStats) {
      console.log('🎯 시즌 통계 기반 AI 분석 시작');
      generateAnalysis();
    }
  }, [playerStats]);

  const generateAnalysis = async () => {
    try {
      setLoading(true);
      
      console.log('🎯 AI 분석 시작 - 시즌 통계 기반:', safePlayerStats);
      
      // AI 분석 수행 (시즌 통계 기반)
      const analysisResult = analyzePlayStyle(safePlayerStats);
      setAnalysis(analysisResult);

      // 훈련 계획 생성 (시즌 통계 기반)
      const plan = generateTrainingPlan(
        analysisResult.playStyle, 
        analysisResult.strengths, 
        analysisResult.weaknesses,
        safePlayerStats
      );
      setTrainingPlan(plan);

      // 개인화된 팁 생성 (시즌 통계 기반)
      const tips = getPersonalizedTips(
        analysisResult.playStyle, 
        analysisResult.weaknesses,
        safePlayerStats
      );
      setPersonalizedTips(tips);

      // 서버에 분석 결과 저장
      await saveAnalysisToServer(analysisResult, plan);

    } catch (error) {
      console.error('AI 분석 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveAnalysisToServer = async (analysisResult, plan) => {
    try {
      await fetch('/api/player/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerNickname: playerInfo.nickname,
          playerServer: playerInfo.server,
          analysis: analysisResult,
          trainingPlan: plan
        })
      });
    } catch (error) {
      console.error('분석 결과 저장 실패:', error);
    }
  };

  const getPlayStyleColor = (style) => {
    const colors = {
      AGGRESSIVE: 'bg-red-100 text-red-800 border-red-200',
      PASSIVE: 'bg-blue-100 text-blue-800 border-blue-200',
      SNIPER: 'bg-purple-100 text-purple-800 border-purple-200',
      SUPPORT: 'bg-green-100 text-green-800 border-green-200',
      BALANCED: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[style] || colors.BALANCED;
  };

  const getPlayStyleIcon = (style) => {
    const icons = {
      AGGRESSIVE: '⚔️',
      PASSIVE: '🛡️',
      SNIPER: '🎯',
      SUPPORT: '🤝',
      BALANCED: '⚖️'
    };
    return icons[style] || '📊';
  };

  const getPlayStyleDescription = (style) => {
    const descriptions = {
      AGGRESSIVE: '공격적이고 적극적인 플레이를 선호하는 스타일',
      PASSIVE: '신중하고 안전한 플레이를 통해 생존을 우선시하는 스타일',
      SNIPER: '원거리에서 정밀한 사격으로 적을 제거하는 스타일',
      SUPPORT: '팀원들을 지원하며 팀플레이에 특화된 스타일',
      BALANCED: '상황에 따라 유연하게 대응하는 균형잡힌 스타일'
    };
    return descriptions[style] || '다양한 상황에 적응하는 스타일';
  };

  const getPersonalizedStrengths = (analysis, stats) => {
    const strengths = [];
    
    // 킬 수 기반 강점 분석
    if (stats.avgKills > 2.5) {
      strengths.push({
        title: '뛰어난 킬링 능력',
        score: Math.min(100, Math.round(stats.avgKills * 30)),
        description: `평균 ${stats.avgKills.toFixed(1)}킬로 상위 20% 수준의 킬링 실력`,
        personalizedTip: '공격적인 스타일을 유지하면서 생존력도 함께 기르면 더욱 강력해집니다',
        improvementPlan: '킬링 능력을 바탕으로 팀 리더십 역할 도전해보기'
      });
    }

    // 생존 시간 기반 강점 분석
    if (stats.avgSurvivalTime > 1200) { // 20분 이상
      strengths.push({
        title: '탁월한 생존 능력',
        score: Math.min(100, Math.round((stats.avgSurvivalTime / 1800) * 100)),
        description: `평균 ${Math.round(stats.avgSurvivalTime/60)}분 생존으로 뛰어난 판단력 보유`,
        personalizedTip: '생존력을 바탕으로 더 적극적인 플레이를 시도하면 킬 수도 증가할 것',
        improvementPlan: '안정적인 생존을 기반으로 중반 교전 참여도 높이기'
      });
    }

    // 데미지 기반 강점 분석
    if (stats.avgDamage > 400) {
      strengths.push({
        title: '정확한 사격 실력',
        score: Math.min(100, Math.round(stats.avgDamage / 6)),
        description: `평균 ${Math.round(stats.avgDamage)} 데미지로 정확한 조준 능력 보유`,
        personalizedTip: '뛰어난 에임을 활용해 원거리 교전에서 우위를 점하세요',
        improvementPlan: '정밀 사격 능력을 살려 저격수 역할로 특화 발전'
      });
    }

    // 어시스트 기반 팀워크 강점
    if (stats.avgAssists > 1) {
      strengths.push({
        title: '우수한 팀워크',
        score: Math.min(100, Math.round(stats.avgAssists * 40)),
        description: `평균 ${stats.avgAssists.toFixed(1)} 어시스트로 팀 기여도가 높음`,
        personalizedTip: '팀원들과의 소통을 더욱 활발히 하여 시너지를 극대화하세요',
        improvementPlan: '팀 리더십을 발휘하여 전략적 지휘 능력 개발'
      });
    }

    // 승률 기반 강점 분석
    if (stats.winRate > 15) { // 15% 이상 승률
      strengths.push({
        title: '우수한 승부 감각',
        score: Math.min(100, Math.round(stats.winRate * 4)),
        description: `${stats.winRate.toFixed(1)}% 승률로 뛰어난 경기 운영 능력`,
        personalizedTip: '승리 경험을 바탕으로 팀의 전략적 리더 역할을 해보세요',
        improvementPlan: '승률 유지하면서 개인 스탯도 함께 향상시키기'
      });
    }

    // 탑10 진입률 기반 강점 분석
    if (stats.top10Rate > 30) { // 30% 이상 탑10
      strengths.push({
        title: '안정적인 상위권 진입',
        score: Math.min(100, Math.round(stats.top10Rate * 2)),
        description: `${stats.top10Rate.toFixed(1)}% 탑10 진입률로 꾸준한 상위권 실력`,
        personalizedTip: '상위권 진입 능력을 바탕으로 최종 승리까지 이어가는 연습을 하세요',
        improvementPlan: '탑10에서 치킨까지의 마지막 단계 집중 훈련'
      });
    }

    // 일관성 지수 기반 강점
    if (analysis.consistencyIndex > 70) {
      strengths.push({
        title: '안정적인 퍼포먼스',
        score: Math.round(analysis.consistencyIndex),
        description: `${Math.round(analysis.consistencyIndex)}%의 높은 일관성으로 믿을 수 있는 실력`,
        personalizedTip: '꾸준한 실력을 바탕으로 더 높은 목표에 도전하세요',
        improvementPlan: '안정성을 기반으로 새로운 플레이 스타일 실험해보기'
      });
    }

    // 플레이 스타일별 특화 강점
    if (analysis.playStyle === 'AGGRESSIVE' && analysis.aggressionIndex > 75) {
      strengths.push({
        title: '강력한 공격성',
        score: Math.round(analysis.aggressionIndex),
        description: `${Math.round(analysis.aggressionIndex)}%의 공격성으로 압도적인 교전 능력`,
        personalizedTip: '공격적인 성향을 전략적으로 활용하여 팀의 핵심 딜러 역할',
        improvementPlan: '공격력과 생존력의 균형점 찾아 완벽한 어택커로 성장'
      });
    }

    if (analysis.playStyle === 'SNIPER' && playerStats.headshotRate > 30) {
      strengths.push({
        title: '정밀 저격 능력',
        score: Math.round(playerStats.headshotRate * 2),
        description: `${Math.round(playerStats.headshotRate)}% 헤드샷률로 저격수 특화 실력`,
        personalizedTip: '정밀 사격 능력을 극대화하여 원거리 제압력 강화',
        improvementPlan: '다양한 거리에서의 저격 능력과 빠른 재배치 기술 마스터'
      });
    }

    // 기본 강점이 없는 경우 잠재력 발견
    if (strengths.length === 0) {
      strengths.push({
        title: '숨겨진 잠재력',
        score: 60,
        description: `현재 데이터: 킬 ${stats.avgKills.toFixed(1)}, 승률 ${stats.winRate.toFixed(1)}%, 탑10 ${stats.top10Rate.toFixed(1)}% - 발전 가능성이 높은 플레이어`,
        personalizedTip: '다양한 플레이 스타일을 시도하며 자신만의 강점을 찾아보세요',
        improvementPlan: '체계적인 훈련을 통해 특화 분야 발굴하기'
      });
    }

    return strengths.slice(0, 4); // 최대 4개의 강점만 표시
  };

  const getStrengthAdvice = (strength) => {
    const adviceMap = {
      '높은 킬 수': '공격적인 스타일을 유지하면서 생존력도 함께 기르세요',
      '안정적인 생존': '생존력을 바탕으로 더 적극적인 플레이를 시도해보세요',
      '정확한 사격': '뛰어난 에임을 활용해 원거리 교전에서 우위를 점하세요',
      '팀워크': '팀원들과의 소통을 더욱 활발히 하여 시너지를 극대화하세요',
      '일관된 성과': '꾸준한 실력을 바탕으로 더 높은 목표에 도전하세요'
    };
    return adviceMap[strength] || '이 강점을 계속 발전시켜 나가세요';
  };

  const getPersonalizedWeaknesses = (analysis, stats) => {
    const weaknesses = [];
    
    // 킬 수 부족 분석
    if (stats.avgKills < 1.5) {
      weaknesses.push({
        title: '교전 참여도 부족',
        severity: Math.round((2 - stats.avgKills) * 50),
        description: `평균 ${stats.avgKills.toFixed(1)}킬로 더 적극적인 교전 참여 필요`,
        personalizedSolution: '안전한 위치에서 시작하여 점진적으로 교전 빈도를 늘려보세요',
        trainingFocus: '에임 훈련과 맵 포지션 학습을 통한 자신감 향상',
        expectedTime: '2-3주 집중 훈련으로 개선 가능'
      });
    }

    // 생존 시간 문제 분석
    if (stats.avgSurvivalTime < 900) { // 15분 미만
      weaknesses.push({
        title: '초반 생존력 부족',
        severity: Math.round((900 - stats.avgSurvivalTime) / 10),
        description: `평균 ${Math.round(stats.avgSurvivalTime/60)}분 생존으로 초반 사망 빈도가 높음`,
        personalizedSolution: '낙하 지점과 초반 루팅 패턴을 재검토하고 안전한 이동 경로 학습',
        trainingFocus: '맵 이해도 향상과 위험 지역 회피 능력 개발',
        expectedTime: '1-2주 훈련으로 생존 시간 30% 향상 가능'
      });
    }

    // 데미지 효율성 문제
    if (stats.avgDamage < 300) {
      weaknesses.push({
        title: '화력 투사 효율성 저하',
        severity: Math.round((400 - stats.avgDamage) / 5),
        description: `평균 ${Math.round(stats.avgDamage)} 데미지로 사격 정확도 개선 필요`,
        personalizedSolution: '훈련장에서 다양한 거리별 조준 연습과 무기별 반동 패턴 숙지',
        trainingFocus: '센서티비티 조정과 크로스헤어 배치 최적화',
        expectedTime: '3-4주 꾸준한 연습으로 정확도 크게 향상'
      });
    }

    // 팀워크 부족 분석
    if (stats.avgAssists < 0.5) {
      weaknesses.push({
        title: '팀 기여도 개선 필요',
        severity: Math.round((1 - stats.avgAssists) * 60),
        description: `평균 ${stats.avgAssists.toFixed(1)} 어시스트로 팀플레이 참여 부족`,
        personalizedSolution: '팀원들과의 거리 유지와 적극적인 지원 사격 연습',
        trainingFocus: '소통 능력 향상과 팀 전술 이해도 증진',
        expectedTime: '팀원들과 함께하는 2-3주 연습으로 개선'
      });
    }

    // 승률 부족 분석
    if (stats.winRate < 5) { // 5% 미만 승률
      weaknesses.push({
        title: '승부 결정력 부족',
        severity: Math.round((10 - stats.winRate) * 8),
        description: `${stats.winRate.toFixed(1)}% 승률로 최종 승부에서의 결정력 부족`,
        personalizedSolution: '후반 상황별 대처법과 최종 안전지대 운영 능력 향상',
        trainingFocus: '엔드게임 전략과 클러치 상황 대처 능력 개발',
        expectedTime: '4-5주 집중 훈련으로 승률 두 배 향상 가능'
      });
    }

    // 탑10 진입률 부족 분석
    if (stats.top10Rate < 20) { // 20% 미만 탑10
      weaknesses.push({
        title: '중반 운영 능력 부족',
        severity: Math.round((25 - stats.top10Rate) * 3),
        description: `${stats.top10Rate.toFixed(1)}% 탑10 진입률로 중반 게임 운영 개선 필요`,
        personalizedSolution: '중반 포지셔닝과 안전지대 이동 타이밍 최적화',
        trainingFocus: '맵 리딩 능력과 상황 판단력 향상',
        expectedTime: '3-4주 훈련으로 탑10 진입률 50% 이상 달성 가능'
      });
    }

    // 일관성 부족 분석
    if (analysis.consistencyIndex < 50) {
      weaknesses.push({
        title: '성과 일관성 부족',
        severity: Math.round(60 - analysis.consistencyIndex),
        description: `${Math.round(analysis.consistencyIndex)}%의 낮은 일관성으로 기복이 심함`,
        personalizedSolution: '규칙적인 연습 스케줄과 멘탈 관리를 통한 안정성 확보',
        trainingFocus: '루틴 개발과 스트레스 상황 대처 능력 향상',
        expectedTime: '4-6주 지속적인 훈련으로 안정성 확보'
      });
    }

    // 플레이 스타일별 특화 약점
    if (analysis.playStyle === 'AGGRESSIVE' && playerStats.avgSurvivalTime < 1000) {
      weaknesses.push({
        title: '무모한 돌진 성향',
        severity: 70,
        description: '공격적 성향이 과도하여 불필요한 리스크를 감수하는 경향',
        personalizedSolution: '공격 타이밍 판단력 향상과 후퇴 시점 인식 개선',
        trainingFocus: '상황 판단력과 리스크 관리 능력 개발',
        expectedTime: '2-3주 집중 훈련으로 균형잡힌 공격성 확보'
      });
    }

    if (analysis.playStyle === 'PASSIVE' && playerStats.avgKills < 1.0) {
      weaknesses.push({
        title: '과도한 소극성',
        severity: 65,
        description: '너무 신중한 플레이로 기회를 놓치는 경우가 많음',
        personalizedSolution: '안전한 교전 상황 인식과 점진적인 적극성 증가',
        trainingFocus: '기회 판단력과 교전 타이밍 감각 개발',
        expectedTime: '3-4주 단계적 훈련으로 균형 잡힌 플레이 스타일 확보'
      });
    }

    // 기본 약점이 없는 경우 발전 가능성 제시
    if (weaknesses.length === 0) {
      weaknesses.push({
        title: '지속적 발전 영역',
        severity: 30,
        description: `현재 스탯 양호: 킬 ${stats.avgKills.toFixed(1)}, 승률 ${stats.winRate.toFixed(1)}%, 탑10 ${stats.top10Rate.toFixed(1)}% - 더 높은 레벨로의 성장 가능`,
        personalizedSolution: '현재 강점을 극대화하면서 새로운 도전 영역 개척',
        trainingFocus: '고급 전술 학습과 리더십 능력 개발',
        expectedTime: '장기적 관점에서 지속적인 성장 추구'
      });
    }

    return weaknesses.slice(0, 3); // 최대 3개의 약점만 표시
  };

  const getWeaknessAdvice = (weakness) => {
    const adviceMap = {
      '낮은 킬 수': '교전 상황에서 더 적극적으로 참여하고 에임 연습을 늘리세요',
      '짧은 생존시간': '맵 이해도를 높이고 안전지대 이동 타이밍을 개선하세요',
      '부정확한 사격': '훈련장에서 반동 패턴 연습과 센서티비티 조정을 해보세요',
      '팀워크 부족': '팀원들과 더 많은 소통을 하고 역할 분담을 명확히 하세요',
      '불안정한 성과': '일정한 루틴을 만들고 멘탈 관리에 신경쓰세요'
    };
    return adviceMap[weakness] || '이 부분을 중점적으로 연습해보세요';
  };

  // 개인화된 훈련 계획을 위한 helper 함수들
  const getTargetImprovement = (analysis) => {
    const currentScore = analysis.playstyleScore;
    if (currentScore < 50) return 30;
    if (currentScore < 70) return 20;
    return 15;
  };

  const getSessionDescription = (sessionTitle, playStyle) => {
    const descriptions = {
      '기초 에임 훈련': `${playStyle} 스타일에 최적화된 정확도 향상 훈련`,
      '포지셔닝 연습': `${playStyle} 플레이어를 위한 전략적 위치 선정 가이드`,
      '생존 전략': `${playStyle} 스타일의 장점을 살린 생존 기술 연마`,
      '교전 능력 향상': `${playStyle} 특성에 맞는 전투 스킬 개발`,
      '팀워크 훈련': `${playStyle} 플레이어의 팀 기여도 극대화 방법`
    };
    return descriptions[sessionTitle] || `${playStyle} 스타일에 맞춘 전문 훈련`;
  };

  const getExercisePersonalizedTip = (exercise, analysis) => {
    const tips = {
      '훈련장에서 무기별 반동 패턴 연습': `현재 ${Math.round(analysis.aggressionIndex)}% 공격성을 고려해 중거리 전투에 집중하세요`,
      '움직이는 타겟 조준 연습': `생존성 지수 ${Math.round(analysis.survivalIndex)}%를 바탕으로 안전한 거리에서 연습하세요`,
      '1대1 교전 상황 시뮬레이션': `일관성 지수 ${Math.round(analysis.consistencyIndex)}% 수준에 맞춰 단계적으로 난이도를 높이세요`,
      '맵별 핫존 및 루팅 경로 학습': `${analysis.playStyle} 스타일에 최적화된 경로를 우선적으로 학습하세요`,
      '안전지대 이동 타이밍 연습': `현재 생존 패턴을 분석하여 개선점을 찾아보세요`
    };
    return tips[exercise] || '개인 스타일에 맞춰 집중적으로 연습하세요';
  };

  const getGoalPersonalizedMetric = (goal, stats) => {
    const currentAvgKills = stats.avgKills || 0;
    const currentWinRate = stats.winRate || 0;
    const currentDamage = stats.avgDamage || 0;
    const currentTop10Rate = stats.top10Rate || 0;
    const currentAssists = stats.avgAssists || 0;

    const metrics = {
      '킬 수 10% 향상': `현재 평균 ${currentAvgKills.toFixed(1)}킬 → 목표 ${(currentAvgKills * 1.1).toFixed(1)}킬`,
      '에임 정확도 향상': `현재 평균 데미지 ${Math.round(currentDamage)} → 목표 ${Math.round(currentDamage * 1.15)}`,
      '생존 시간 증가': `현재 승률 ${Math.round(currentWinRate)}% → 목표 ${Math.round(currentWinRate * 1.2)}%`,
      '안정적인 탑10 진입': `현재 탑10 진입률 ${currentTop10Rate.toFixed(1)}% → 목표 ${(currentTop10Rate * 1.25).toFixed(1)}%`,
      '팀워크 향상': `현재 어시스트 ${currentAssists.toFixed(1)} → 목표 ${(currentAssists * 1.3).toFixed(1)}`
    };
    return metrics[goal] || '개인 기록 기준으로 측정 가능한 목표 설정';
  };

  const getExpectedImprovement = (sessionTitle, analysis, stats) => {
    const improvements = {
      '기초 에임 훈련': `평균 데미지가 ${Math.round(stats.avgDamage)}에서 약 15-20% 향상 예상`,
      '포지셔닝 연습': `생존 시간 증가로 탑10 진입률 ${Math.round(stats.top10Rate)}%에서 25% 향상`,
      '생존 전략': `현재 승률 ${Math.round(stats.winRate)}%에서 2-3주 내 30% 개선 가능`,
      '교전 능력 향상': `평균 킬 수 ${stats.avgKills.toFixed(1)}에서 1개월 내 40% 증가`,
      '팀워크 훈련': `어시스트 수 ${stats.avgAssists.toFixed(1)}에서 팀 기여도 크게 향상`
    };
    return improvements[sessionTitle] || '꾸준한 연습으로 전반적인 실력 향상 기대';
  };

  const getPersonalizedTrainingTips = (analysis, playerStats) => {
    const tips = {
      focus: [],
      warnings: []
    };

    // 플레이 스타일별 집중 포인트
    if (analysis.playStyle === 'AGGRESSIVE') {
      tips.focus.push('빠른 킬을 위한 근거리 교전 능력 집중 개발');
      tips.focus.push('공격적 플레이 후 안전한 회복 타이밍 학습');
      tips.warnings.push('무모한 돌진보다는 계산된 공격성 유지');
    } else if (analysis.playStyle === 'PASSIVE') {
      tips.focus.push('안전한 포지션에서의 원거리 사격 능력 향상');
      tips.focus.push('후반 생존을 위한 자원 관리 및 이동 경로');
      tips.warnings.push('너무 소극적이면 기회를 놓칠 수 있음');
    } else if (analysis.playStyle === 'SNIPER') {
      tips.focus.push('장거리 정밀 사격과 스코프 활용법 마스터');
      tips.focus.push('저격 후 빠른 위치 변경 능력 개발');
      tips.warnings.push('근거리 교전 대비책도 반드시 준비');
    }

    // 공통 주의사항
    tips.warnings.push('훈련 강도를 점진적으로 높여 부상 방지');
    tips.warnings.push('실전 적용 전 충분한 연습으로 실수 최소화');

    return tips;
  };

  const getRecommendedSchedule = (playStyle, playerStats) => {
    const schedules = {
      'AGGRESSIVE': '월/수/금 30분씩 교전 훈련, 화/목 20분씩 생존 연습, 주말 실전 적용',
      'PASSIVE': '월/수/금 25분씩 포지셔닝 연습, 화/목/토 20분씩 사격 훈련, 일요일 휴식',
      'SNIPER': '매일 20분씩 조준 연습, 수/금 추가로 이동 및 재배치 훈련',
      'SUPPORT': '월-금 15분씩 팀워크 시뮬레이션, 주말 실제 팀원들과 합동 훈련',
      'BALANCED': '매일 다양한 스킬을 순환하며 20-30분씩 균형잡힌 훈련'
    };
    return schedules[playStyle] || '개인 일정에 맞춰 주 3-4회, 회당 20-30분 꾸준히 진행';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="animate-pulse">
          <div className="flex items-center mb-4">
            <div className="h-8 w-8 bg-gray-200 rounded-full mr-3"></div>
            <div className="h-6 w-48 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  // 데이터가 모두 0인 경우 체크
  const hasValidData = safePlayerStats.avgKills > 0 || safePlayerStats.avgDamage > 0 || safePlayerStats.winRate > 0;
  
  if (!hasValidData) {
    return (
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-8 border border-yellow-200">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-xl font-bold text-yellow-800 mb-2">플레이 데이터 부족</h3>
          <p className="text-yellow-700 mb-4">
            AI 분석을 위한 충분한 게임 데이터가 없습니다.
          </p>
          <div className="text-sm text-yellow-600 bg-yellow-100 rounded-lg p-4">
            <p className="mb-2"><strong>해결 방법:</strong></p>
            <ul className="text-left space-y-1">
              <li>• 더 많은 게임을 플레이해보세요</li>
              <li>• 데이터 새로고침을 시도해보세요</li>
              <li>• 시간이 지난 후 다시 확인해보세요</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="bg-white/20 rounded-full p-3 mr-4">
              <div className="text-3xl">🤖</div>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-1">AI 개인 맞춤 코칭</h2>
              <p className="text-violet-100 text-lg">
                {playerInfo.nickname}님을 위한 전문 분석 및 훈련 가이드
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-violet-200 mb-1">분석 완료</div>
            <div className="text-xs text-violet-300">
              {new Date().toLocaleDateString('ko-KR')}
            </div>
          </div>
        </div>
        
        {/* 플레이 스타일 카드 */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className={`px-6 py-3 rounded-full border-2 bg-white shadow-lg ${getPlayStyleColor(analysis.playStyle)}`}>
                <span className="text-2xl mr-2">{getPlayStyleIcon(analysis.playStyle)}</span>
                <span className="font-bold text-lg">{analysis.playStyle}</span>
              </div>
              <div className="text-white">
                <div className="text-sm opacity-90">분석 신뢰도</div>
                <div className="text-2xl font-bold">{Math.round(analysis.playstyleScore)}%</div>
              </div>
            </div>
            <div className="text-right text-white">
              <div className="text-sm opacity-90">분석된 경기 수</div>
              <div className="text-xl font-semibold">{safePlayerStats.totalMatches}경기</div>
              <div className="text-xs opacity-75 mt-1">경쟁전 포함 시즌 전체</div>
            </div>
          </div>
          
          {/* 핵심 특징 */}
          <div className="flex flex-wrap gap-2">
            {analysis.strengths.slice(0, 3).map((strength, idx) => (
              <span key={idx} className="bg-emerald-500/20 text-emerald-100 px-3 py-1 rounded-full text-sm border border-emerald-400/30">
                ✨ {strength}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="bg-gray-50 border-b border-gray-200">
        <nav className="flex justify-center space-x-2 px-6 py-4">
          {[
            { 
              id: 'analysis', 
              label: '스타일 분석', 
              icon: '📊',
              description: '플레이 패턴 및 특성 분석'
            },
            { 
              id: 'training', 
              label: '훈련 계획', 
              icon: '🏋️',
              description: '맞춤형 실력 향상 가이드'
            },
            { 
              id: 'tips', 
              label: '개인 맞춤 팁', 
              icon: '💡',
              description: '즉시 적용 가능한 조언'
            }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-6 py-4 rounded-xl font-medium text-sm transition-all duration-200 flex-1 max-w-xs ${
                activeTab === tab.id
                  ? 'bg-white text-violet-600 shadow-lg border-2 border-violet-200 transform scale-105'
                  : 'bg-transparent text-gray-600 hover:bg-white/50 hover:text-gray-800'
              }`}
            >
              <div className="flex flex-col items-center space-y-1">
                <span className="text-2xl">{tab.icon}</span>
                <span className="font-semibold">{tab.label}</span>
                <span className="text-xs opacity-75">{tab.description}</span>
              </div>
              {activeTab === tab.id && (
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-violet-500 rounded-full"></div>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="p-6">
        {activeTab === 'analysis' && (
          <div className="space-y-8">
            {/* AI 분석 개요 */}
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-6 border border-violet-200">
              <div className="flex items-start space-x-4">
                <div className="bg-violet-500 rounded-full p-3">
                  <span className="text-2xl text-white">{getPlayStyleIcon(analysis.playStyle)}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    {analysis.playStyle} 플레이어
                  </h3>
                  <p className="text-gray-700 text-lg mb-4">{getPlayStyleDescription(analysis.playStyle)}</p>
                  
                  {/* 추가 분석 정보 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-violet-600">
                        {safePlayerStats.avgKills > 0 ? safePlayerStats.avgKills.toFixed(1) : '0.0'}
                      </div>
                      <div className="text-gray-600">평균 킬</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {safePlayerStats.avgDamage > 0 ? Math.round(safePlayerStats.avgDamage) : '0'}
                      </div>
                      <div className="text-gray-600">평균 데미지</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {safePlayerStats.winRate > 0 ? safePlayerStats.winRate.toFixed(1) : '0.0'}%
                      </div>
                      <div className="text-gray-600">승률</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {safePlayerStats.top10Rate > 0 ? safePlayerStats.top10Rate.toFixed(1) : '0.0'}%
                      </div>
                      <div className="text-gray-600">탑10 진입률</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 성능 지표 - 개선된 버전 */}
            <div>
              <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                📊 AI 성능 분석
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border-2 border-red-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-red-700 font-bold text-lg">공격성 지수</span>
                      <p className="text-sm text-gray-600 mt-1">적극적인 교전 성향</p>
                    </div>
                    <div className="bg-red-100 rounded-full p-3">
                      <span className="text-red-600 text-2xl">⚔️</span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">진행도</span>
                      <span className="text-lg font-bold text-red-700">{Math.round(analysis.aggressionIndex)}/100</span>
                    </div>
                    <div className="w-full bg-red-100 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-red-400 to-red-600 h-3 rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${analysis.aggressionIndex}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {analysis.aggressionIndex > 70 ? '매우 공격적' : 
                     analysis.aggressionIndex > 50 ? '적당히 공격적' : 
                     analysis.aggressionIndex > 30 ? '보통' : '신중함'}
                  </div>
                </div>

                <div className="bg-white border-2 border-blue-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-blue-700 font-bold text-lg">생존성 지수</span>
                      <p className="text-sm text-gray-600 mt-1">안전한 플레이 능력</p>
                    </div>
                    <div className="bg-blue-100 rounded-full p-3">
                      <span className="text-blue-600 text-2xl">🛡️</span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">진행도</span>
                      <span className="text-lg font-bold text-blue-700">{Math.round(analysis.survivalIndex)}/100</span>
                    </div>
                    <div className="w-full bg-blue-100 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${analysis.survivalIndex}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {analysis.survivalIndex > 70 ? '뛰어난 생존력' : 
                     analysis.survivalIndex > 50 ? '안정적 생존' : 
                     analysis.survivalIndex > 30 ? '보통' : '개선 필요'}
                  </div>
                </div>

                <div className="bg-white border-2 border-green-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-green-700 font-bold text-lg">일관성 지수</span>
                      <p className="text-sm text-gray-600 mt-1">꾸준한 퍼포먼스</p>
                    </div>
                    <div className="bg-green-100 rounded-full p-3">
                      <span className="text-green-600 text-2xl">📈</span>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">진행도</span>
                      <span className="text-lg font-bold text-green-700">{Math.round(analysis.consistencyIndex)}/100</span>
                    </div>
                    <div className="w-full bg-green-100 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${analysis.consistencyIndex}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {analysis.consistencyIndex > 70 ? '매우 안정적' : 
                     analysis.consistencyIndex > 50 ? '꽤 일관적' : 
                     analysis.consistencyIndex > 30 ? '보통' : '변동 큼'}
                  </div>
                </div>
              </div>
            </div>

            {/* 개인화된 강점과 약점 분석 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 개인화된 강점 분석 */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-200">
                <div className="flex items-center mb-6">
                  <div className="bg-emerald-500 rounded-full p-3 mr-4">
                    <span className="text-white text-xl">🏆</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-emerald-800">{playerInfo.nickname}님의 강점</h4>
                    <p className="text-emerald-600 text-sm">데이터 기반 개인 특화 능력 분석</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {getPersonalizedStrengths(analysis, safePlayerStats).map((strength, index) => (
                    <div key={index} className="bg-white/80 rounded-lg p-5 border border-emerald-100 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-emerald-800 font-bold text-lg">{strength.title}</h5>
                        <div className="flex items-center space-x-2">
                          <div className="bg-emerald-100 px-3 py-1 rounded-full">
                            <span className="text-emerald-700 font-semibold text-sm">{strength.score}점</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-emerald-700 text-sm mb-3 leading-relaxed">
                        {strength.description}
                      </p>
                      <div className="bg-emerald-50 rounded-lg p-3 mb-3">
                        <p className="text-emerald-600 text-sm font-medium mb-1">💡 개인 맞춤 조언:</p>
                        <p className="text-emerald-700 text-sm">{strength.personalizedTip}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-blue-600 text-sm font-medium mb-1">🎯 발전 계획:</p>
                        <p className="text-blue-700 text-sm">{strength.improvementPlan}</p>
                      </div>
                      
                      {/* 스코어 바 */}
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-emerald-600">강점 지수</span>
                          <span className="text-xs text-emerald-600">{strength.score}/100</span>
                        </div>
                        <div className="w-full bg-emerald-100 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(strength.score, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 개인화된 개선 포인트 */}
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
                <div className="flex items-center mb-6">
                  <div className="bg-orange-500 rounded-full p-3 mr-4">
                    <span className="text-white text-xl">⚡</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-orange-800">{playerInfo.nickname}님의 개선 영역</h4>
                    <p className="text-orange-600 text-sm">데이터 기반 맞춤형 발전 계획</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {getPersonalizedWeaknesses(analysis, safePlayerStats).map((weakness, index) => (
                    <div key={index} className="bg-white/80 rounded-lg p-5 border border-orange-100 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-orange-800 font-bold text-lg">{weakness.title}</h5>
                        <div className="flex items-center space-x-2">
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            weakness.severity > 70 ? 'bg-red-100 text-red-700' :
                            weakness.severity > 50 ? 'bg-orange-100 text-orange-700' :
                            weakness.severity > 30 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {weakness.severity > 70 ? '긴급' :
                             weakness.severity > 50 ? '중요' :
                             weakness.severity > 30 ? '보통' : '낮음'}
                          </div>
                        </div>
                      </div>
                      <p className="text-orange-700 text-sm mb-3 leading-relaxed">
                        {weakness.description}
                      </p>
                      <div className="bg-orange-50 rounded-lg p-3 mb-3">
                        <p className="text-orange-600 text-sm font-medium mb-1">💡 맞춤 해결책:</p>
                        <p className="text-orange-700 text-sm">{weakness.personalizedSolution}</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 mb-3">
                        <p className="text-blue-600 text-sm font-medium mb-1">🎯 훈련 중점:</p>
                        <p className="text-blue-700 text-sm">{weakness.trainingFocus}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-green-600 text-sm font-medium mb-1">⏰ 예상 개선 기간:</p>
                        <p className="text-green-700 text-sm">{weakness.expectedTime}</p>
                      </div>
                      
                      {/* 심각도 바 */}
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-orange-600">개선 우선순위</span>
                          <span className="text-xs text-orange-600">{weakness.severity}/100</span>
                        </div>
                        <div className="w-full bg-orange-100 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              weakness.severity > 70 ? 'bg-gradient-to-r from-red-400 to-red-600' :
                              weakness.severity > 50 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                              weakness.severity > 30 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                              'bg-gradient-to-r from-green-400 to-green-600'
                            }`}
                            style={{ width: `${Math.min(weakness.severity, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI 추천 액션 플랜 */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
              <div className="flex items-center mb-4">
                <div className="bg-indigo-500 rounded-full p-3 mr-4">
                  <span className="text-white text-xl">🚀</span>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-indigo-800">즉시 실행 가능한 액션 플랜</h4>
                  <p className="text-indigo-600 text-sm">AI가 분석한 우선순위 기반 추천사항</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/80 rounded-lg p-4 border border-indigo-100">
                  <div className="text-indigo-600 font-semibold mb-2">🎯 단기 목표 (1주)</div>
                  <div className="text-sm text-gray-700">
                    가장 큰 약점인 "{analysis.weaknesses[0]}"를 중점적으로 개선
                  </div>
                </div>
                <div className="bg-white/80 rounded-lg p-4 border border-indigo-100">
                  <div className="text-indigo-600 font-semibold mb-2">📈 중기 목표 (1개월)</div>
                  <div className="text-sm text-gray-700">
                    강점인 "{analysis.strengths[0]}"를 더욱 극대화하여 경쟁 우위 확보
                  </div>
                </div>
                <div className="bg-white/80 rounded-lg p-4 border border-indigo-100">
                  <div className="text-indigo-600 font-semibold mb-2">🏆 장기 목표 (3개월)</div>
                  <div className="text-sm text-gray-700">
                    {analysis.playStyle} 스타일을 완성하여 상위 티어 진입
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'training' && trainingPlan && (
          <div className="space-y-8">
            {/* 개인화된 훈련 개요 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-500 rounded-full p-3">
                  <span className="text-white text-2xl">🎯</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-blue-800 mb-3">
                    {playerInfo.nickname}님을 위한 맞춤 훈련 계획
                  </h3>
                  <div className="bg-white/70 rounded-lg p-4 mb-4">
                    <p className="text-blue-700 text-lg font-medium">{trainingPlan.focus}</p>
                  </div>
                  
                  {/* 현재 레벨 및 목표 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">{analysis.playStyle}</div>
                      <div className="text-sm text-blue-700">현재 스타일</div>
                    </div>
                    <div className="bg-white/50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">{Math.round(analysis.playstyleScore)}%</div>
                      <div className="text-sm text-blue-700">스타일 완성도</div>
                    </div>
                    <div className="bg-white/50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {getTargetImprovement(analysis)}%
                      </div>
                      <div className="text-sm text-blue-700">목표 향상률</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 개인화된 훈련 세션들 */}
            <div className="space-y-6">
              <h4 className="text-xl font-bold text-gray-800 flex items-center">
                🏋️ 맞춤형 훈련 프로그램
                <span className="ml-3 text-sm bg-violet-100 text-violet-700 px-3 py-1 rounded-full">
                  {trainingPlan.sessions.length}단계 프로그램
                </span>
              </h4>

              {trainingPlan.sessions.map((session, index) => (
                <div key={index} className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all">
                  {/* 세션 헤더 */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="bg-gradient-to-r from-violet-500 to-purple-500 rounded-full p-3 text-white font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h5 className="text-xl font-bold text-gray-800">{session.title}</h5>
                        <p className="text-gray-600">
                          {getSessionDescription(session.title, analysis.playStyle)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="bg-gray-100 rounded-lg px-4 py-2">
                        <div className="text-sm text-gray-600">권장 시간</div>
                        <div className="text-lg font-bold text-gray-800">{session.duration}분</div>
                      </div>
                    </div>
                  </div>

                  {/* 개인화된 훈련 내용 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 훈련 내용 */}
                    <div className="bg-blue-50 rounded-lg p-5">
                      <h6 className="font-semibold text-blue-800 mb-4 flex items-center">
                        📋 개인 맞춤 훈련 내용
                      </h6>
                      <div className="space-y-3">
                        {session.exercises.map((exercise, exIndex) => (
                          <div key={exIndex} className="flex items-start space-x-3 bg-white/60 rounded-lg p-3">
                            <div className="bg-blue-500 rounded-full p-1 mt-1">
                              <span className="text-white text-xs">✓</span>
                            </div>
                            <div className="flex-1">
                              <div className="text-blue-800 font-medium">{exercise}</div>
                              <div className="text-sm text-blue-600 mt-1">
                                {getExercisePersonalizedTip(exercise, analysis)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 목표 및 성과 지표 */}
                    <div className="bg-green-50 rounded-lg p-5">
                      <h6 className="font-semibold text-green-800 mb-4 flex items-center">
                        🎯 성과 목표 & 측정 지표
                      </h6>
                      <div className="space-y-3">
                        {session.goals.map((goal, goalIndex) => (
                          <div key={goalIndex} className="bg-white/60 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-green-800 font-medium">{goal}</span>
                              <span className="text-xs bg-green-200 text-green-700 px-2 py-1 rounded-full">
                                목표
                              </span>
                            </div>
                            <div className="text-sm text-green-600">
                              {getGoalPersonalizedMetric(goal, safePlayerStats)}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* 예상 개선 효과 */}
                      <div className="mt-4 bg-white/80 rounded-lg p-3 border border-green-200">
                        <div className="text-sm font-medium text-green-800 mb-2">📈 예상 개선 효과</div>
                        <div className="text-sm text-green-700">
                          {getExpectedImprovement(session.title, analysis, safePlayerStats)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 진행률 추적 */}
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-gray-700">훈련 진행률</span>
                      <span className="text-sm text-gray-500">완료 시 체크하세요</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-violet-400 to-purple-500 h-2 rounded-full w-0 transition-all duration-500"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 개인화된 훈련 팁 및 주의사항 */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
              <div className="flex items-start space-x-4">
                <div className="bg-amber-500 rounded-full p-3">
                  <span className="text-white text-xl">💡</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-amber-800 mb-4">
                    {playerInfo.nickname}님을 위한 특별 훈련 가이드
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-semibold text-amber-700 mb-3">� 집중 포인트</h5>
                      <ul className="space-y-2 text-amber-700">
                        {getPersonalizedTrainingTips(analysis, playerStats).focus.map((tip, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-amber-500 mr-2 mt-1">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-semibold text-amber-700 mb-3">⚠️ 주의사항</h5>
                      <ul className="space-y-2 text-amber-700">
                        {getPersonalizedTrainingTips(analysis, playerStats).warnings.map((warning, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-amber-500 mr-2 mt-1">•</span>
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  {/* 진행 일정 추천 */}
                  <div className="mt-6 bg-white/70 rounded-lg p-4">
                    <h5 className="font-semibold text-amber-800 mb-2">📅 추천 훈련 일정</h5>
                    <div className="text-amber-700">
                      {getRecommendedSchedule(analysis.playStyle, playerStats)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tips' && (
          <div className="space-y-4">
            {personalizedTips.length > 0 ? (
              personalizedTips.map((tip, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-lg">{tip.title}</h4>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {tip.category}
                    </span>
                  </div>
                  <p className="text-gray-700">{tip.description}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                현재 플레이 스타일에 맞는 팁을 준비 중입니다.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
