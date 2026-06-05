// utils/redis.js — Upstash Redis 클라이언트 싱글톤
// 환경변수 미설정 시 null 반환 → 호출부에서 graceful fallback 처리
import { Redis } from '@upstash/redis';

let redis = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export default redis;

export const REDIS_TTL = {
  PLAYER:      60 * 30,   // 30분
  AI_ANALYSIS: 60 * 60,   // 1시간
};

/** Redis GET — 미설정 또는 오류 시 null 반환 */
export async function redisGet(key) {
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch (e) {
    console.warn('[Redis] GET 실패:', e.message);
    return null;
  }
}

/** Redis SET — 미설정 또는 오류 시 조용히 무시 */
export async function redisSet(key, value, ttlSeconds = REDIS_TTL.PLAYER) {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (e) {
    console.warn('[Redis] SET 실패:', e.message);
  }
}

/** 플레이어 캐시 키 규칙: player:{shard}:{nickname_lowercase} */
export function playerCacheKey(shard, nickname) {
  return `player:${shard}:${nickname.toLowerCase()}`;
}

/** 플레이어 관련 Redis 캐시 전체 무효화 (새로고침 버튼 클릭 시 사용) */
export async function invalidatePlayerCache(shard, nickname) {
  if (!redis) return;
  const nick = nickname.toLowerCase();
  const keys = [
    `player:${shard}:${nick}`,
    `search:${shard}:${nick}`,
    `ai-analysis:nick:${nick}:${shard}`,
  ];
  try {
    await Promise.allSettled(keys.map(k => redis.del(k)));
    console.log(`[Redis] 캐시 무효화: ${shard}:${nick}`);
  } catch (e) {
    console.warn('[Redis] 캐시 무효화 실패:', e.message);
  }
}
