// PUBG API 배치 요청 유틸리티
// /Users/mac/Desktop/PKGG/utils/pubgBatchApi.js

const PUBG_API_KEY = process.env.PUBG_API_KEY;
const PUBG_BASE_URL = 'https://api.pubg.com/shards';

/**
 * 여러 플레이어의 기본 정보를 배치로 조회
 * @param {string} shard - 플랫폼 샤드 (예: 'steam', 'kakao')
 * @param {string[]} playerNames - 플레이어 닉네임 배열 (최대 10개)
 * @returns {Promise<Object>} PUBG API 응답
 */
export async function fetchPlayersBatch(shard, playerNames) {
  if (!playerNames || playerNames.length === 0 || playerNames.length > 10) {
    throw new Error('플레이어 이름은 1-10개까지 지원됩니다.');
  }

  const namesParam = playerNames
    .map((name) => encodeURIComponent(name))
    .join(',');
  const url = `${PUBG_BASE_URL}/${shard}/players?filter[playerNames]=${namesParam}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${PUBG_API_KEY}`,
      Accept: 'application/vnd.api+json',
    },
  });

  if (!response.ok) {
    throw new Error(`PUBG API 플레이어 배치 조회 실패: ${response.status}`);
  }

  return await response.json();
}

/**
 * 여러 플레이어의 시즌 통계를 특정 게임모드로 배치 조회
 * @param {string} shard - 플랫폼 샤드
 * @param {string} seasonId - 시즌 ID (또는 'lifetime')
 * @param {string} gameMode - 게임모드 (예: 'squad-fpp', 'solo')
 * @param {string[]} playerIds - 플레이어 ID 배열 (최대 10개)
 * @returns {Promise<Object>} PUBG API 응답
 */
export async function fetchSeasonStatsBatch(
  shard,
  seasonId,
  gameMode,
  playerIds
) {
  if (!playerIds || playerIds.length === 0 || playerIds.length > 10) {
    throw new Error('플레이어 ID는 1-10개까지 지원됩니다.');
  }

  const idsParam = playerIds.join(',');
  const url = `${PUBG_BASE_URL}/${shard}/seasons/${seasonId}/gameMode/${gameMode}/players?filter[playerIds]=${idsParam}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${PUBG_API_KEY}`,
      Accept: 'application/vnd.api+json',
    },
  });

  if (!response.ok) {
    throw new Error(`PUBG API 시즌 통계 배치 조회 실패: ${response.status}`);
  }

  return await response.json();
}

/**
 * 여러 플레이어의 라이프타임 통계를 특정 게임모드로 배치 조회
 * @param {string} shard - 플랫폼 샤드
 * @param {string} gameMode - 게임모드
 * @param {string[]} playerIds - 플레이어 ID 배열 (최대 10개)
 * @returns {Promise<Object>} PUBG API 응답
 */
export async function fetchLifetimeStatsBatch(shard, gameMode, playerIds) {
  return await fetchSeasonStatsBatch(shard, 'lifetime', gameMode, playerIds);
}

/**
 * 클랜 멤버들의 데이터를 효율적으로 배치 조회
 * @param {string} shard - 플랫폼 샤드
 * @param {string[]} memberNames - 클랜 멤버 닉네임 배열
 * @param {string} seasonId - 시즌 ID
 * @returns {Promise<Object>} 정리된 클랜 멤버 데이터
 */
export async function fetchClanMembersBatch(shard, memberNames, seasonId) {
  const results = {};

  // 최대 10명씩 나누어서 처리
  const chunks = [];
  for (let i = 0; i < memberNames.length; i += 10) {
    chunks.push(memberNames.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    try {
      // 1. 플레이어 기본 정보 배치 조회
      const playersData = await fetchPlayersBatch(shard, chunk);

      // 2. 각 플레이어의 ID 수집
      const playerIds = playersData.data.map((player) => player.id);

      // 3. 주요 게임모드별 시즌 통계 배치 조회
      const gameModes = ['squad-fpp', 'squad', 'duo-fpp', 'solo-fpp'];
      const seasonStatsPromises = gameModes.map((mode) =>
        fetchSeasonStatsBatch(shard, seasonId, mode, playerIds).catch((err) => {
          console.warn(`${mode} 모드 통계 조회 실패:`, err.message);
          return null;
        })
      );

      const seasonStatsResults = await Promise.all(seasonStatsPromises);

      // 4. 데이터 정리
      playersData.data.forEach((player, index) => {
        results[player.attributes.name] = {
          basicInfo: player,
          seasonStats: {},
        };

        // 각 게임모드별 통계 추가
        seasonStatsResults.forEach((statsData, modeIndex) => {
          if (statsData && statsData.data) {
            const playerStats = statsData.data.find(
              (stats) => stats.relationships.player.data.id === player.id
            );
            if (playerStats) {
              results[player.attributes.name].seasonStats[
                gameModes[modeIndex]
              ] = playerStats;
            }
          }
        });
      });
    } catch (error) {
      console.error(`청크 처리 실패:`, error);
      // 실패한 청크의 플레이어들을 개별적으로 처리
      for (const name of chunk) {
        try {
          const singlePlayerData = await fetchPlayersBatch(shard, [name]);
          results[name] = {
            basicInfo: singlePlayerData.data[0],
            seasonStats: {},
            fallback: true,
          };
        } catch (singleError) {
          console.error(`개별 플레이어 ${name} 조회 실패:`, singleError);
          results[name] = {
            error: singleError.message,
          };
        }
      }
    }
  }

  return results;
}

/**
 * Rate Limit을 고려한 지연 함수
 * @param {number} ms - 지연 시간 (밀리초)
 */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Rate Limit 관리 클래스
 */
export class RateLimitManager {
  constructor(requestsPerMinute = 10) {
    this.requestsPerMinute = requestsPerMinute;
    this.requests = [];
  }

  async waitIfNeeded() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // 1분 이내의 요청만 유지
    this.requests = this.requests.filter((time) => time > oneMinuteAgo);

    if (this.requests.length >= this.requestsPerMinute) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = oldestRequest + 60000 - now;
      if (waitTime > 0) {
        console.log(`Rate limit 대기 중: ${waitTime}ms`);
        await delay(waitTime);
      }
    }

    this.requests.push(now);
  }
}
