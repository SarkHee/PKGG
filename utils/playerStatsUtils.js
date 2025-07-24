// 향상된 플레이어 통계 조회 유틸리티
// /Users/mac/Desktop/PKGG/utils/playerStatsUtils.js

/**
 * 플레이어의 종합 통계 정보를 조회하는 유틸리티
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * 플레이어의 기본 정보와 ID를 조회
 */
export async function getPlayerBasicInfo(nickname, shard = 'steam') {
  try {
    const response = await fetch(`${BASE_URL}/api/pubg/batch/players/${shard}?names=${encodeURIComponent(nickname)}`);
    
    if (!response.ok) {
      throw new Error(`플레이어 기본 정보 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.players && data.players.length > 0) {
      return {
        success: true,
        player: data.players[0]
      };
    } else {
      return {
        success: false,
        error: '플레이어를 찾을 수 없습니다.'
      };
    }
  } catch (error) {
    console.error('플레이어 기본 정보 조회 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 현재 시즌 정보 조회
 */
export async function getCurrentSeason(shard = 'steam') {
  try {
    const response = await fetch(`${BASE_URL}/api/pubg/seasons/${shard}?current=true`);
    
    if (!response.ok) {
      throw new Error(`시즌 정보 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      currentSeason: data.currentSeason
    };
  } catch (error) {
    console.error('시즌 정보 조회 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 플레이어의 시즌 통계 조회
 */
export async function getPlayerSeasonStats(playerId, seasonId, shard = 'steam') {
  try {
    const response = await fetch(`${BASE_URL}/api/pubg/stats/season/${shard}/${playerId}/${seasonId}`);
    
    if (!response.ok) {
      throw new Error(`시즌 통계 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      seasonStats: data.data
    };
  } catch (error) {
    console.error('시즌 통계 조회 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 플레이어의 랭크 통계 조회
 */
export async function getPlayerRankedStats(playerId, seasonId, shard = 'steam') {
  try {
    const response = await fetch(`${BASE_URL}/api/pubg/stats/ranked/${shard}/${playerId}/${seasonId}`);
    
    if (!response.ok) {
      throw new Error(`랭크 통계 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      rankedStats: data.data
    };
  } catch (error) {
    console.error('랭크 통계 조회 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 플레이어의 라이프타임 통계 조회
 */
export async function getPlayerLifetimeStats(playerId, shard = 'steam') {
  try {
    const response = await fetch(`${BASE_URL}/api/pubg/stats/lifetime/${shard}/${playerId}`);
    
    if (!response.ok) {
      throw new Error(`라이프타임 통계 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      lifetimeStats: data.data
    };
  } catch (error) {
    console.error('라이프타임 통계 조회 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 플레이어의 무기 숙련도 조회
 */
export async function getPlayerWeaponMastery(playerId, shard = 'steam') {
  try {
    const response = await fetch(`${BASE_URL}/api/pubg/stats/mastery/${shard}/${playerId}/weapon`);
    
    if (!response.ok) {
      throw new Error(`무기 숙련도 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      weaponMastery: data.data
    };
  } catch (error) {
    console.error('무기 숙련도 조회 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 플레이어의 생존 숙련도 조회
 */
export async function getPlayerSurvivalMastery(playerId, shard = 'steam') {
  try {
    const response = await fetch(`${BASE_URL}/api/pubg/stats/mastery/${shard}/${playerId}/survival`);
    
    if (!response.ok) {
      throw new Error(`생존 숙련도 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      survivalMastery: data.data
    };
  } catch (error) {
    console.error('생존 숙련도 조회 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 플레이어의 종합 통계 정보를 한 번에 조회
 */
export async function getPlayerComprehensiveStats(nickname, shard = 'steam') {
  try {
    console.log(`${nickname}의 종합 통계 조회 시작...`);

    // 1. 플레이어 기본 정보 조회
    const playerInfo = await getPlayerBasicInfo(nickname, shard);
    if (!playerInfo.success) {
      return { success: false, error: playerInfo.error };
    }

    const playerId = playerInfo.player.id;
    console.log(`플레이어 ID: ${playerId}`);

    // 2. 현재 시즌 정보 조회
    const seasonInfo = await getCurrentSeason(shard);
    if (!seasonInfo.success) {
      return { success: false, error: seasonInfo.error };
    }

    const currentSeasonId = seasonInfo.currentSeason.id;
    console.log(`현재 시즌 ID: ${currentSeasonId}`);

    // 3. 병렬로 모든 통계 조회
    const [
      seasonStats,
      rankedStats,
      lifetimeStats,
      weaponMastery,
      survivalMastery
    ] = await Promise.allSettled([
      getPlayerSeasonStats(playerId, currentSeasonId, shard),
      getPlayerRankedStats(playerId, currentSeasonId, shard),
      getPlayerLifetimeStats(playerId, shard),
      getPlayerWeaponMastery(playerId, shard),
      getPlayerSurvivalMastery(playerId, shard)
    ]);

    // 결과 정리
    const result = {
      success: true,
      player: playerInfo.player,
      currentSeason: seasonInfo.currentSeason,
      seasonStats: seasonStats.status === 'fulfilled' && seasonStats.value.success ? 
        seasonStats.value.seasonStats : null,
      rankedStats: rankedStats.status === 'fulfilled' && rankedStats.value.success ? 
        rankedStats.value.rankedStats : null,
      lifetimeStats: lifetimeStats.status === 'fulfilled' && lifetimeStats.value.success ? 
        lifetimeStats.value.lifetimeStats : null,
      weaponMastery: weaponMastery.status === 'fulfilled' && weaponMastery.value.success ? 
        weaponMastery.value.weaponMastery : null,
      survivalMastery: survivalMastery.status === 'fulfilled' && survivalMastery.value.success ? 
        survivalMastery.value.survivalMastery : null,
      errors: []
    };

    // 실패한 요청들 기록
    if (seasonStats.status === 'rejected' || !seasonStats.value.success) {
      result.errors.push('시즌 통계 조회 실패');
    }
    if (rankedStats.status === 'rejected' || !rankedStats.value.success) {
      result.errors.push('랭크 통계 조회 실패');
    }
    if (lifetimeStats.status === 'rejected' || !lifetimeStats.value.success) {
      result.errors.push('라이프타임 통계 조회 실패');
    }
    if (weaponMastery.status === 'rejected' || !weaponMastery.value.success) {
      result.errors.push('무기 숙련도 조회 실패');
    }
    if (survivalMastery.status === 'rejected' || !survivalMastery.value.success) {
      result.errors.push('생존 숙련도 조회 실패');
    }

    console.log(`${nickname} 종합 통계 조회 완료. 오류: ${result.errors.length}개`);
    return result;

  } catch (error) {
    console.error('종합 통계 조회 중 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 통계 데이터를 기존 형식으로 변환
 */
export function convertStatsToLegacyFormat(comprehensiveStats) {
  if (!comprehensiveStats.success) {
    return null;
  }

  const { player, currentSeason, seasonStats, rankedStats, lifetimeStats } = comprehensiveStats;

  // 기존 형식으로 변환
  const legacyFormat = {
    profile: {
      nickname: player.name,
      playerId: player.id,
      lastUpdated: new Date().toISOString(),
      currentSeason: currentSeason
    },
    enhancedStats: {
      season: seasonStats,
      ranked: rankedStats,
      lifetime: lifetimeStats
    },
    // 기존 필드들도 유지 (호환성)
    summary: {},
    recentMatches: player.matches || [],
    // 새로운 향상된 통계 표시
    hasEnhancedStats: true
  };

  return legacyFormat;
}
