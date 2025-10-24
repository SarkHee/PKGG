// utils/clanRegionAnalyzer.js
// 클랜의 지역/국가를 분석하는 유틸리티

// 한글 문자 패턴 검사
function hasKoreanCharacters(text) {
  const koreanRegex = /[ㄱ-ㅎㅏ-ㅣ가-힣]/;
  return koreanRegex.test(text);
}

// 중국어 문자 패턴 검사
function hasChineseCharacters(text) {
  const chineseRegex = /[\u4e00-\u9fff]/;
  return chineseRegex.test(text);
}

// 일본어 문자 패턴 검사
function hasJapaneseCharacters(text) {
  const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff]/;
  return japaneseRegex.test(text);
}

// 러시아어 문자 패턴 검사
function hasRussianCharacters(text) {
  const russianRegex = /[\u0400-\u04ff]/;
  return russianRegex.test(text);
}

// 아랍어 문자 패턴 검사
function hasArabicCharacters(text) {
  const arabicRegex = /[\u0600-\u06ff]/;
  return arabicRegex.test(text);
}

// Shard 기반 지역 추정
function getRegionFromShard(shard) {
  const shardRegionMap = {
    kakao: 'KR', // 주로 한국
    steam: 'GLOBAL', // 전 세계
    psn: 'GLOBAL', // 전 세계
    xbox: 'GLOBAL', // 전 세계
  };

  return shardRegionMap[shard] || 'UNKNOWN';
}

// 클랜명/태그 기반 지역 추정
function analyzeTextRegion(clanName, clanTag) {
  const combinedText = `${clanName || ''} ${clanTag || ''}`.toLowerCase();

  // 한국어 검사
  if (hasKoreanCharacters(combinedText)) {
    return {
      region: 'KR',
      confidence: 0.9,
      reason: 'Korean characters in name/tag',
    };
  }

  // 중국어 검사
  if (hasChineseCharacters(combinedText)) {
    return {
      region: 'CN',
      confidence: 0.8,
      reason: 'Chinese characters in name/tag',
    };
  }

  // 일본어 검사
  if (hasJapaneseCharacters(combinedText)) {
    return {
      region: 'JP',
      confidence: 0.8,
      reason: 'Japanese characters in name/tag',
    };
  }

  // 러시아어 검사
  if (hasRussianCharacters(combinedText)) {
    return {
      region: 'RU',
      confidence: 0.8,
      reason: 'Russian characters in name/tag',
    };
  }

  // 아랍어 검사
  if (hasArabicCharacters(combinedText)) {
    return {
      region: 'ME',
      confidence: 0.7,
      reason: 'Arabic characters in name/tag',
    };
  }

  // 한국 관련 키워드 검사 (더 포괄적)
  const koreanKeywords = [
    'korea',
    'korean',
    'kor',
    'kr',
    'seoul',
    'busan',
    'corea',
    'team korea',
    'team kr',
    'south korea',
    'sk',
    'ubd',
    'kim',
    'park',
    'lee',
    'choi',
    'jung', // 한국 성씨
    'han',
    'kang',
    'moon',
    'shin',
    'yoon',
    'lim',
  ];

  if (koreanKeywords.some((keyword) => combinedText.includes(keyword))) {
    return { region: 'KR', confidence: 0.7, reason: 'Korean-related keywords' };
  }

  // 클랜명 패턴 분석 추가
  if (clanName) {
    // UBD 같은 3글자 대문자 조합 (한국 클랜에서 흔함)
    if (/^[A-Z]{2,4}$/.test(clanName)) {
      return {
        region: 'KR',
        confidence: 0.5,
        reason: 'Korean-style short acronym',
      };
    }

    // TSUNAMI100 같은 패턴 (일본 관련)
    if (/tsunami|ninja|samurai|tokyo|osaka|japan/i.test(clanName)) {
      return { region: 'JP', confidence: 0.6, reason: 'Japanese-related name' };
    }
  }

  // 기타 지역 키워드
  const regionKeywords = {
    CN: ['china', 'chinese', 'cn', 'beijing', 'shanghai', 'dragon', 'panda'],
    JP: ['japan', 'japanese', 'jp', 'tokyo', 'osaka', 'ninja', 'samurai'],
    RU: ['russia', 'russian', 'ru', 'moscow', 'siberia', 'bear'],
    EU: ['europe', 'european', 'eu', 'germany', 'france', 'uk', 'england'],
    NA: ['america', 'american', 'usa', 'us', 'canada', 'na', 'eagle'],
    SEA: ['thailand', 'vietnam', 'singapore', 'malaysia', 'sea', 'tiger'],
    BR: ['brazil', 'brazilian', 'br', 'sao paulo', 'rio'],
    ME: ['middle east', 'turkey', 'tr', 'arab', 'persian'],
  };

  for (const [region, keywords] of Object.entries(regionKeywords)) {
    if (keywords.some((keyword) => combinedText.includes(keyword))) {
      return { region, confidence: 0.6, reason: `${region} keywords detected` };
    }
  }

  return {
    region: 'UNKNOWN',
    confidence: 0.1,
    reason: 'No regional indicators found',
  };
}

// 멤버 닉네임 기반 지역 분석
function analyzeMemberNicknames(members) {
  if (!members || members.length === 0) {
    return {
      region: 'UNKNOWN',
      confidence: 0,
      reason: 'No members to analyze',
    };
  }

  const totalMembers = members.length;
  let koreanCount = 0;
  let chineseCount = 0;
  let japaneseCount = 0;
  let russianCount = 0;
  let arabicCount = 0;
  let englishLikeCount = 0; // 영어 스타일 닉네임

  // 한국식 닉네임 패턴 추가 검사
  const koreanPatterns = [
    /[ㄱ-ㅎㅏ-ㅣ가-힣]/, // 한글 문자
    /_[0-9]+$/, // 언더스코어 + 숫자 끝 (한국 스타일)
    /^[A-Za-z]+_[A-Za-z0-9_-]+/, // 영어_영어/숫자 조합 (한국에서 흔함)
    /KR|Kr|kr|korea|seoul|busan/i, // 한국 관련 키워드
    /^[A-Z]{2,4}_/, // 2-4글자 대문자 + 언더스코어 (한국 클랜 스타일)
    /[0-9]{2,}$/, // 숫자로 끝나는 패턴 (한국에서 흔함)
    /^[a-z]+[0-9]{2,6}$/, // 소문자+숫자 조합
    /-{1,2}/, // 하이픈 사용 (한국 스타일)
    /^[A-Z][a-z]+[A-Z]/, // CamelCase (한국에서 선호)
  ];

  members.forEach((member) => {
    const nickname = member.nickname || '';

    // 기본 문자 검사
    if (hasKoreanCharacters(nickname)) {
      koreanCount++;
    } else if (hasChineseCharacters(nickname)) {
      chineseCount++;
    } else if (hasJapaneseCharacters(nickname)) {
      japaneseCount++;
    } else if (hasRussianCharacters(nickname)) {
      russianCount++;
    } else if (hasArabicCharacters(nickname)) {
      arabicCount++;
    } else {
      // 한국식 패턴 추가 검사
      const isKoreanStyle = koreanPatterns.some((pattern) =>
        pattern.test(nickname)
      );
      if (isKoreanStyle) {
        koreanCount++;
      } else {
        englishLikeCount++;
      }
    }
  });

  const koreanRatio = koreanCount / totalMembers;
  const chineseRatio = chineseCount / totalMembers;
  const japaneseRatio = japaneseCount / totalMembers;
  const russianRatio = russianCount / totalMembers;
  const arabicRatio = arabicCount / totalMembers;
  const englishRatio = englishLikeCount / totalMembers;

  console.log(
    `       닉네임 분석: 한국=${koreanCount}(${Math.round(koreanRatio * 100)}%), 영어=${englishLikeCount}(${Math.round(englishRatio * 100)}%), 기타=${totalMembers - koreanCount - englishLikeCount}`
  );

  // 30% 이상이면 해당 지역으로 분류 (임계값 낮춤)
  if (koreanRatio >= 0.3) {
    return {
      region: 'KR',
      confidence: Math.min(0.9, koreanRatio + 0.2), // 신뢰도 보정
      reason: `${Math.round(koreanRatio * 100)}% Korean-style nicknames`,
      stats: {
        koreanCount,
        totalMembers,
        patterns: 'Korean patterns detected',
      },
    };
  }

  if (chineseRatio >= 0.5) {
    return {
      region: 'CN',
      confidence: Math.min(0.8, chineseRatio),
      reason: `${Math.round(chineseRatio * 100)}% Chinese nicknames`,
      stats: { chineseCount, totalMembers },
    };
  }

  if (japaneseRatio >= 0.5) {
    return {
      region: 'JP',
      confidence: Math.min(0.8, japaneseRatio),
      reason: `${Math.round(japaneseRatio * 100)}% Japanese nicknames`,
      stats: { japaneseCount, totalMembers },
    };
  }

  if (russianRatio >= 0.5) {
    return {
      region: 'RU',
      confidence: Math.min(0.8, russianRatio),
      reason: `${Math.round(russianRatio * 100)}% Russian nicknames`,
      stats: { russianCount, totalMembers },
    };
  }

  if (arabicRatio >= 0.5) {
    return {
      region: 'ME',
      confidence: Math.min(0.7, arabicRatio),
      reason: `${Math.round(arabicRatio * 100)}% Arabic nicknames`,
      stats: { arabicCount, totalMembers },
    };
  }

  // 영어권 추정 (70% 이상이 영어 스타일)
  if (englishRatio >= 0.7) {
    return {
      region: 'NA',
      confidence: 0.6,
      reason: `${Math.round(englishRatio * 100)}% English-style nicknames`,
      stats: { englishLikeCount, totalMembers },
    };
  }

  return {
    region: 'MIXED',
    confidence: 0.3,
    reason: 'Mixed international members',
    stats: {
      koreanCount,
      chineseCount,
      japaneseCount,
      englishLikeCount,
      totalMembers,
    },
  };
}

// Shard 분포 분석
function analyzeShardDistribution(members) {
  if (!members || members.length === 0) {
    return { distribution: {}, primaryShard: null, confidence: 0 };
  }

  const shardCounts = {};
  let totalWithShard = 0;

  members.forEach((member) => {
    if (member.pubgShardId) {
      shardCounts[member.pubgShardId] =
        (shardCounts[member.pubgShardId] || 0) + 1;
      totalWithShard++;
    }
  });

  if (totalWithShard === 0) {
    return { distribution: {}, primaryShard: null, confidence: 0 };
  }

  // 가장 많은 shard 찾기
  const primaryShard = Object.entries(shardCounts).sort(
    ([, a], [, b]) => b - a
  )[0]?.[0];

  // 분포 계산
  const distribution = {};
  Object.entries(shardCounts).forEach(([shard, count]) => {
    distribution[shard] = {
      count,
      percentage: Math.round((count / totalWithShard) * 100),
    };
  });

  const primaryShardRatio = shardCounts[primaryShard] / totalWithShard;

  return {
    distribution,
    primaryShard,
    confidence: primaryShardRatio,
    totalAnalyzed: totalWithShard,
    totalMembers: members.length,
  };
}

// 종합 지역 분석
function analyzeClanRegion(clanData, members = []) {
  const analyses = [];

  // 1. 클랜명/태그 분석
  const textAnalysis = analyzeTextRegion(clanData.name, clanData.pubgClanTag);
  analyses.push({
    type: 'text',
    weight: 0.4,
    ...textAnalysis,
  });

  // 2. 멤버 닉네임 분석
  const nicknameAnalysis = analyzeMemberNicknames(members);
  analyses.push({
    type: 'nicknames',
    weight: 0.4,
    ...nicknameAnalysis,
  });

  // 3. Shard 분포 분석
  const shardAnalysis = analyzeShardDistribution(members);
  let shardRegionAnalysis = {
    region: 'UNKNOWN',
    confidence: 0,
    reason: 'No shard data',
  };

  if (shardAnalysis.primaryShard) {
    const shardRegion = getRegionFromShard(shardAnalysis.primaryShard);
    shardRegionAnalysis = {
      region: shardRegion === 'GLOBAL' ? 'MIXED' : shardRegion,
      confidence: shardAnalysis.confidence,
      reason: `Primary shard: ${shardAnalysis.primaryShard} (${Math.round(shardAnalysis.confidence * 100)}%)`,
    };
  }

  analyses.push({
    type: 'shard',
    weight: 0.2,
    ...shardRegionAnalysis,
  });

  // 가중 평균으로 최종 결정
  const regionScores = {};
  let totalWeight = 0;

  analyses.forEach((analysis) => {
    if (analysis.region && analysis.region !== 'UNKNOWN') {
      if (!regionScores[analysis.region]) {
        regionScores[analysis.region] = 0;
      }
      regionScores[analysis.region] += analysis.confidence * analysis.weight;
      totalWeight += analysis.weight;
    }
  });

  // 최고 점수 지역 선택
  let finalRegion = 'UNKNOWN';
  let finalConfidence = 0;
  let finalReasons = [];

  if (Object.keys(regionScores).length > 0) {
    const bestRegion = Object.entries(regionScores).sort(
      ([, a], [, b]) => b - a
    )[0];

    finalRegion = bestRegion[0];
    finalConfidence = totalWeight > 0 ? bestRegion[1] / totalWeight : 0;
    finalReasons = analyses
      .filter((a) => a.region === finalRegion)
      .map((a) => a.reason);
  }

  return {
    region: finalRegion,
    isKorean: finalRegion === 'KR',
    confidence: finalConfidence,
    reasons: finalReasons,
    analyses,
    shardDistribution: shardAnalysis.distribution,
    details: {
      textAnalysis,
      nicknameAnalysis,
      shardAnalysis,
    },
  };
}

export {
  analyzeClanRegion,
  analyzeTextRegion,
  analyzeMemberNicknames,
  analyzeShardDistribution,
  hasKoreanCharacters,
  hasChineseCharacters,
  hasJapaneseCharacters,
  hasRussianCharacters,
  hasArabicCharacters,
  getRegionFromShard,
};
