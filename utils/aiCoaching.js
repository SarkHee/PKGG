// AI 코칭 시스템 유틸리티 (순수 계산 함수 — 클라이언트/서버 공용)
import { classifyPlaystyle } from './playstyleClassifier.js';

/**
 * 플레이어의 플레이 스타일을 분석하는 함수 (전체 시즌 기준)
 */
export function analyzePlayStyle(playerStats, seasonStats = null) {
  const {
    avgKills = 0,
    avgDamage = 0,
    avgSurvivalTime = 0,
    avgSurviveTime = 0,
    winRate = 0,
    top10Rate = 0,
    avgAssists = 0,
    totalMatches = 0,
    kd = 0,
    headshotRate = 0,
  } = playerStats || {};

  const survTime = avgSurvivalTime || avgSurviveTime || 0;

  // 공격성 지수 (0-100)
  const aggressionIndex = Math.min(
    100,
    avgKills * 15 + avgDamage / 10 + kd * 10 - survTime / 100
  );

  // 생존성 지수 (0-100)
  const survivalIndex = Math.min(
    100,
    survTime / 20 + top10Rate * 2 + winRate * 3
  );

  // 일관성 지수 (0-100)
  const consistencyIndex = Math.min(
    100,
    headshotRate * 2 + kd * 15 + (totalMatches >= 10 ? 20 : totalMatches * 2)
  );

  // 통합 분류기로 플레이스타일 결정
  const result = classifyPlaystyle({
    avgDamage,
    avgKills,
    avgAssists,
    avgSurviveTime: survTime,
    winRate,
    top10Rate,
  });

  const playStyle      = result.code;           // aiCoaching 하위호환 영문 코드
  const playstyleScore = Math.min(100, aggressionIndex * 0.5 + survivalIndex * 0.5);

  return {
    playStyle,
    playstyleLabel:  result.label,              // 한국어 이름 (이모지 포함)
    playstyleDesc:   result.desc,
    playstyleScore,
    aggressionIndex,
    survivalIndex,
    consistencyIndex,
    strengths: identifyStrengths(playerStats),
    weaknesses: identifyWeaknesses(playerStats),
    analysisData: {
      totalMatches,
      avgKills,
      avgDamage,
      winRate,
      top10Rate,
      kd,
    },
  };
}

/**
 * 플레이어의 강점을 식별 (시즌 전체 기준)
 */
function identifyStrengths(stats) {
  const strengths = [];
  const {
    avgKills = 0,
    avgDamage = 0,
    top10Rate = 0,
    winRate = 0,
    avgAssists = 0,
    avgSurvivalTime = 0,
    headshotRate = 0,
    kd = 0,
  } = stats || {};

  // 전문적인 분석 기준으로 강점 식별
  if (avgKills >= 3.0) {
    strengths.push({
      category: '킬 능력',
      description: `뛰어난 교전 능력 (평균 ${avgKills.toFixed(1)}킬)`,
      impact: '공격적인 플레이를 통한 팀 기여도 우수',
      recommendation: '리더십을 발휘하여 팀의 공격을 이끌어가세요'
    });
  } else if (avgKills >= 2.0) {
    strengths.push({
      category: '킬 능력',
      description: `안정적인 킬 성과 (평균 ${avgKills.toFixed(1)}킬)`,
      impact: '꾸준한 전투 기여도',
      recommendation: '현재 수준을 유지하며 포지셔닝을 개선하세요'
    });
  }

  if (avgDamage >= 400) {
    strengths.push({
      category: '딜량 기여',
      description: `탁월한 화력 지원 (평균 ${Math.round(avgDamage)}딜)`,
      impact: '팀 전체 딜량의 핵심 역할',
      recommendation: '원거리 교전에서 팀을 지원하는 역할을 강화하세요'
    });
  } else if (avgDamage >= 250) {
    strengths.push({
      category: '딜량 기여',
      description: `적절한 화력 기여 (평균 ${Math.round(avgDamage)}딜)`,
      impact: '팀 딜량에 안정적 기여',
      recommendation: '적극적인 견제 플레이로 딜량을 늘려보세요'
    });
  }

  if (top10Rate >= 60) {
    strengths.push({
      category: '생존 능력',
      description: `뛰어난 생존력 (${top10Rate.toFixed(1)}% TOP10 진입)`,
      impact: '안정적인 랭킹 포인트 확보',
      recommendation: '생존력을 바탕으로 후반 상황판단력을 기르세요'
    });
  }

  if (winRate >= 15) {
    strengths.push({
      category: '승률',
      description: `우수한 승률 (${winRate.toFixed(1)}%)`,
      impact: '팀워크와 상황판단력 우수',
      recommendation: '리더십을 발휘하여 팀의 승리를 이끄세요'
    });
  }

  if (avgAssists >= 1.5) {
    strengths.push({
      category: '팀워크',
      description: `뛰어난 어시스트 능력 (평균 ${avgAssists.toFixed(1)}어시)`,
      impact: '팀 플레이의 핵심 역할',
      recommendation: '팀원들과의 조합 플레이를 더욱 강화하세요'
    });
  }

  if (headshotRate >= 30) {
    strengths.push({
      category: '정확도',
      description: `높은 헤드샷 비율 (${headshotRate.toFixed(1)}%)`,
      impact: '효율적인 적 제거 능력',
      recommendation: '정확한 조준실력을 바탕으로 원거리 교전을 주도하세요'
    });
  }

  if (avgSurvivalTime >= 1500) {
    strengths.push({
      category: '포지셔닝',
      description: `뛰어난 포지셔닝 센스 (평균 ${Math.round(avgSurvivalTime/60)}분 생존)`,
      impact: '안정적인 게임 운영',
      recommendation: '포지셔닝 실력을 바탕으로 팀의 로테이션을 이끄세요'
    });
  }

  return strengths;
}

/**
 * 플레이어의 약점을 식별 (시즌 전체 기준)
 */
function identifyWeaknesses(stats) {
  const weaknesses = [];
  const {
    avgKills = 0,
    avgDamage = 0,
    top10Rate = 0,
    winRate = 0,
    avgAssists = 0,
    avgSurvivalTime = 0,
    kd = 0,
    headshotRate = 0,
    totalMatches = 0,
  } = stats;

  // 시즌 전체 통계 기준으로 약점 판단
  if (avgKills < 1.0) weaknesses.push('킬 능력 향상 필요 (시즌 평균 낮음)');
  if (avgDamage < 200)
    weaknesses.push('데미지 딜링 개선 필요 (시즌 평균 낮음)');
  if (top10Rate < 20)
    weaknesses.push('상위권 진입률 향상 필요 (시즌 평균 낮음)');
  if (winRate < 5) weaknesses.push('승률 개선 필요 (시즌 평균 낮음)');
  if (avgSurvivalTime < 800)
    weaknesses.push('생존 시간 연장 필요 (시즌 평균 낮음)');
  if (kd < 1.0) weaknesses.push('K/D 비율 개선 필요 (시즌 평균 낮음)');
  if (headshotRate < 20)
    weaknesses.push('조준 정확도 향상 필요 (시즌 평균 낮음)');
  if (totalMatches < 20) weaknesses.push('더 많은 게임 경험 필요');

  return weaknesses.length > 0
    ? weaknesses
    : ['전반적인 실력 향상 및 경험 축적'];
}

/**
 * 플레이 스타일별 맞춤형 훈련 계획 생성 (시즌 통계 기반)
 */
export function generateTrainingPlan(
  playStyle,
  strengths,
  weaknesses,
  playerStats
) {
  // 시즌 통계를 기반으로 플레이어 레벨 판단
  const playerLevel = determinePlayerLevel(playerStats);

  console.log('🎯 훈련 계획 생성:', {
    playStyle,
    playerLevel,
    strengths: strengths.length,
    weaknesses: weaknesses.length,
    playerStats,
  });
  const plans = {
    AGGRESSIVE: {
      focus: '공격적인 플레이의 효율성 극대화',
      sessions: [
        {
          type: 'AIM_TRAINING',
          title: '조준 정확도 향상',
          duration: 30,
          exercises: [
            '에임 트레이너에서 일일 300회 사격 연습',
            '다양한 거리에서 무반동 사격 연습',
            '움직이는 타겟 조준 연습',
          ],
          goals: ['헤드샷 비율 40% 이상', '조준 정확도 80% 이상'],
        },
        {
          type: 'POSITIONING',
          title: '공격적 포지셔닝',
          duration: 45,
          exercises: [
            '건물 클리어링 패턴 연습',
            '교전 시 엄폐물 활용법',
            '다수 vs 1 상황 대처법',
          ],
          goals: ['교전 승률 70% 이상', '평균 생존 시간 15분 이상'],
        },
        {
          type: 'STRATEGY',
          title: '전략적 공격',
          duration: 60,
          exercises: [
            '핫드랍 구역별 루팅 최적화',
            '교전 타이밍 판단 연습',
            '써드파티 방지 기법',
          ],
          goals: ['초반 킬 2개 이상 안정화', 'top10 진입률 30% 이상'],
        },
      ],
    },
    PASSIVE: {
      focus: '안전한 플레이에서 더 많은 기회 창출',
      sessions: [
        {
          type: 'POSITIONING',
          title: '최적 포지션 선점',
          duration: 45,
          exercises: [
            '안전지대 이동 경로 최적화',
            '고지대 확보 연습',
            '엄폐물 간 이동 기법',
          ],
          goals: ['top10 진입률 50% 이상', '평균 생존 시간 20분 이상'],
        },
        {
          type: 'AIM_TRAINING',
          title: '중거리 정밀 사격',
          duration: 30,
          exercises: [
            '스코프 사격 연습',
            '리딩샷 정확도 향상',
            '반동 제어 마스터',
          ],
          goals: ['중거리 명중률 60% 이상', '스나이퍼 킬 비율 증가'],
        },
        {
          type: 'STRATEGY',
          title: '기회 포착 능력',
          duration: 40,
          exercises: [
            '교전 개입 타이밍 연습',
            '정보 수집 및 활용',
            '안전한 킬 스틸 기법',
          ],
          goals: ['평균 킬 수 1.5개 이상', '데미지/킬 비율 개선'],
        },
      ],
    },
    SNIPER: {
      focus: '원거리 제압 능력 완성 및 근접전 보완',
      sessions: [
        {
          type: 'AIM_TRAINING',
          title: '스나이퍼 마스터리',
          duration: 40,
          exercises: [
            '원거리 조준 정밀도 훈련',
            '빠른 스코프인 연습',
            '멀티킬 연계 기법',
          ],
          goals: ['300m+ 명중률 70% 이상', '헤드샷 비율 60% 이상'],
        },
        {
          type: 'CQC_TRAINING',
          title: '근접 전투 보완',
          duration: 35,
          exercises: [
            'SMG/AR 근접 사격 연습',
            '빠른 무기 교체 연습',
            '실내 클리어링 기법',
          ],
          goals: ['근접전 승률 50% 이상', '무기 교체 시간 1초 이하'],
        },
      ],
    },
    SUPPORT: {
      focus: '팀 기여도 극대화 및 개인 스킬 향상',
      sessions: [
        {
          type: 'TEAMWORK',
          title: '팀플레이 최적화',
          duration: 50,
          exercises: [
            '효과적인 정보 공유 연습',
            '아군 지원 포지셔닝',
            '부활 및 치료 최적화',
          ],
          goals: ['어시스트 수 2개 이상', '팀 생존률 80% 이상'],
        },
        {
          type: 'STRATEGY',
          title: '게임 리딩 능력',
          duration: 45,
          exercises: [
            '맵 읽기 및 예측',
            '팀 이동 경로 계획',
            '상황별 콜링 연습',
          ],
          goals: ['팀 승률 20% 이상', '전략적 판단 정확도 향상'],
        },
      ],
    },
    BALANCED: {
      focus: '모든 영역의 균형잡힌 발전',
      sessions: [
        {
          type: 'COMPREHENSIVE',
          title: '종합 실력 향상',
          duration: 60,
          exercises: [
            '상황별 플레이 스타일 전환 연습',
            '다양한 무기군 숙련도 향상',
            '맵별 최적 전략 학습',
          ],
          goals: ['모든 지표 상위 30% 달성', '안정적 성장 곡선 유지'],
        },
      ],
    },
  };

  let plan = plans[playStyle] || plans.BALANCED;

  // 약점에 따른 추가 세션
  if (weaknesses.includes('킬 능력 부족')) {
    plan.sessions.unshift({
      type: 'AIM_TRAINING',
      title: '기초 사격 실력 향상 (우선)',
      duration: 25,
      exercises: [
        '기본 조준 연습 (일일 30분)',
        '반동 패턴 숙지',
        '타겟 추적 연습',
      ],
      goals: ['기본 명중률 50% 달성', '평균 킬 1개 이상'],
    });
  }

  return plan;
}

/**
 * 분산 계산 유틸리티
 */
function calculateVariance(numbers) {
  if (numbers.length === 0) return 0;

  const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  const squaredDiffs = numbers.map((num) => Math.pow(num - mean, 2));
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
}

/**
 * 플레이어별 맞춤형 팁 추천
 */
export function getPersonalizedTips(playStyle, weaknesses, playerStats) {
  const playerLevel = determinePlayerLevel(playerStats);

  console.log('🎯 개인화된 팁 생성:', {
    playStyle,
    playerLevel,
    weaknesses,
    playerStats,
  });
  const tipDatabase = {
    AGGRESSIVE: [
      {
        category: 'POSITIONING',
        title: '공격적 포지셔닝의 핵심',
        description:
          '공격할 때는 항상 퇴로를 확보하세요. 적을 공격하기 전 뒤로 빠질 수 있는 엄폐물이나 경로를 미리 파악해두는 것이 중요합니다.',
        priority: 5,
      },
      {
        category: 'AIM',
        title: '프리파이어 활용법',
        description:
          '적이 나올 것으로 예상되는 지점을 미리 조준하고 대기하세요. 반응속도보다는 예측력이 더 중요합니다.',
        priority: 4,
      },
    ],
    PASSIVE: [
      {
        category: 'STRATEGY',
        title: '안전한 킬 타이밍',
        description:
          '다른 팀들이 교전 중일 때가 킬을 얻기 가장 좋은 기회입니다. 써드파티를 적극 활용하되, 자신도 당하지 않도록 주의하세요.',
        priority: 5,
      },
      {
        category: 'POSITIONING',
        title: '정보 수집의 중요성',
        description:
          '높은 곳에서 주변을 관찰하며 적팀의 위치와 이동 패턴을 파악하세요. 정보는 최고의 무기입니다.',
        priority: 4,
      },
    ],
    SNIPER: [
      {
        category: 'AIM',
        title: '거리별 조준점 조정',
        description:
          '각 스나이퍼 라이플의 탄도를 숙지하고, 거리에 따른 조준점 보정을 연습하세요. 100m당 대략 어느 정도 올려야 하는지 체화시키는 것이 중요합니다.',
        priority: 5,
      },
    ],
    SUPPORT: [
      {
        category: 'TEAMWORK',
        title: '효과적인 정보 공유',
        description:
          '적의 위치를 알릴 때는 방향, 거리, 적의 수를 명확히 전달하세요. "저기 적이 있어"보다는 "동쪽 200미터 건물 2층에 2명"이 훨씬 유용합니다.',
        priority: 5,
      },
    ],
  };

  return tipDatabase[playStyle] || [];
}

/**
 * 시즌 통계를 기반으로 플레이어 레벨 판단
 */
function determinePlayerLevel(playerStats) {
  const {
    avgKills = 0,
    avgDamage = 0,
    winRate = 0,
    top10Rate = 0,
    kd = 0,
    totalMatches = 0,
  } = playerStats || {};

  // 경험 점수 계산 (경쟁전 포함 시즌 전체 경기 기준)
  let experienceScore = 0;
  if (totalMatches >= 500)
    experienceScore = 25; // 매우 풍부한 경험
  else if (totalMatches >= 200)
    experienceScore = 20; // 풍부한 경험
  else if (totalMatches >= 100)
    experienceScore = 15; // 충분한 경험
  else if (totalMatches >= 50)
    experienceScore = 10; // 보통 경험
  else if (totalMatches >= 20)
    experienceScore = 5; // 적은 경험
  else experienceScore = 2; // 매우 적은 경험

  // 전체적인 실력 점수 계산 (0-100)
  const skillScore = Math.min(
    100,
    avgKills * 10 + // 킬 능력 (최대 40점)
      avgDamage / 10 + // 데미지 능력 (최대 30점)
      winRate * 2 + // 승률 (최대 20점)
      top10Rate / 2 + // 상위권 진입 (최대 50점)
      kd * 5 + // K/D 비율 (최대 15점)
      experienceScore // 경험 점수 (최대 25점)
  );

  console.log('🎯 플레이어 레벨 판정:', {
    totalMatches,
    experienceScore,
    skillScore,
    avgKills,
    avgDamage,
    top10Rate,
  });

  // 레벨 구간 판정 (경쟁전 포함 시즌 전체 기준)
  if (skillScore >= 80) return 'EXPERT'; // 전문가 (상위 5%)
  if (skillScore >= 65) return 'ADVANCED'; // 고급자 (상위 15%)
  if (skillScore >= 45) return 'INTERMEDIATE'; // 중급자 (상위 40%)
  if (skillScore >= 25) return 'BEGINNER'; // 초급자 (상위 70%)
  return 'NOVICE'; // 입문자 (하위 30%)
}
