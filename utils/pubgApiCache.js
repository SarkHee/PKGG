/**
 * utils/pubgApiCache.js
 *
 * 서버 사이드 PUBG API 캐시 유틸리티
 *
 * 특징:
 *  - 인메모리 캐시 (Vercel 서버리스 warm 인스턴스 내 유지)
 *  - 요청 중복 제거 (같은 URL 동시 요청 → 하나만 실제 호출)
 *  - 429 / 5xx 에러 시 최대 2회 재시도 (2초 간격)
 *  - force=true 시 캐시 bypass
 *  - TTL: 플레이어 통계 10분, 매치 데이터 30분
 *  - API 키는 서버에서만 사용 (클라이언트 노출 없음)
 */

// ── TTL 상수 ────────────────────────────────────────────────────────────────
export const TTL = {
  PLAYER:  10 * 60 * 1000, // 10분 — 플레이어 조회 / 시즌 통계 / weapon mastery
  MATCH:   30 * 60 * 1000, // 30분 — 개별 매치 상세
  CLAN:    15 * 60 * 1000, // 15분 — 클랜 정보
  SEASON:  60 * 60 * 1000, // 60분 — 시즌 목록 (거의 안 바뀜)
};

// ── 내부 저장소 (모듈 싱글턴) ───────────────────────────────────────────────
/** @type {Map<string, { data: any, expiresAt: number }>} */
const _cache = new Map();

/** @type {Map<string, Promise<any>>} 진행 중인 요청 Promise (중복 제거용) */
const _inFlight = new Map();

// ── 캐시 유틸 ───────────────────────────────────────────────────────────────
function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    _cache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key, data, ttl) {
  _cache.set(key, { data, expiresAt: Date.now() + ttl });
}

/** 만료된 엔트리 정리 (메모리 누수 방지) */
function pruneExpired() {
  const now = Date.now();
  for (const [key, entry] of _cache) {
    if (entry.expiresAt < now) _cache.delete(key);
  }
}
// 주기적 정리 (서버리스 환경에서는 보조적인 역할)
if (typeof setInterval !== 'undefined') {
  setInterval(pruneExpired, 5 * 60 * 1000);
}

// ── 429 / 5xx 재시도 fetch ──────────────────────────────────────────────────
/**
 * PUBG API 전용 fetch — 429/5xx 에러 시 최대 2회 재시도
 * @param {string} url
 * @param {object} headers
 * @returns {Promise<any>} 파싱된 JSON
 */
async function pubgApiFetch(url, headers) {
  const MAX_ATTEMPTS = 3; // 초기 1 + 재시도 2
  const RETRY_DELAY  = 2000; // 2초

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response;
    try {
      response = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
    } catch (err) {
      // 네트워크 / 타임아웃
      if (attempt < MAX_ATTEMPTS) {
        console.warn(`[pubgApiCache] 네트워크 오류 (시도 ${attempt}/${MAX_ATTEMPTS}): ${err.message}`);
        await sleep(RETRY_DELAY);
        continue;
      }
      throw new PubgApiError('NETWORK_ERROR', `네트워크 오류: ${err.message}`, 0);
    }

    // 성공
    if (response.ok) {
      return response.json();
    }

    const status = response.status;

    // 4xx — 재시도 의미 없음
    if (status === 401) throw new PubgApiError('UNAUTHORIZED', 'API 키 인증 실패', 401);
    if (status === 404) throw new PubgApiError('NOT_FOUND',    '리소스를 찾을 수 없습니다', 404);
    if (status === 415) throw new PubgApiError('MEDIA_TYPE',   'Content-Type 오류', 415);

    // 429 — Rate Limit (재시도)
    if (status === 429) {
      if (attempt < MAX_ATTEMPTS) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '2', 10);
        console.warn(`[pubgApiCache] 429 Rate Limit, ${retryAfter}s 후 재시도 (${attempt}/${MAX_ATTEMPTS})`);
        await sleep(Math.max(retryAfter * 1000, RETRY_DELAY));
        continue;
      }
      throw new PubgApiError('RATE_LIMIT', 'PUBG API 요청 한도 초과. 잠시 후 다시 시도하세요.', 429);
    }

    // 5xx — 서버 에러 (재시도)
    if (status >= 500) {
      if (attempt < MAX_ATTEMPTS) {
        console.warn(`[pubgApiCache] ${status} 서버 에러, 재시도 (${attempt}/${MAX_ATTEMPTS})`);
        await sleep(RETRY_DELAY * attempt);
        continue;
      }
      throw new PubgApiError('SERVER_ERROR', `PUBG API 서버 오류 (${status})`, status);
    }

    // 기타 에러
    throw new PubgApiError('API_ERROR', `PUBG API 오류 (${status})`, status);
  }
}

// ── 퍼블릭 API ──────────────────────────────────────────────────────────────

/**
 * PUBG API를 캐시 + 중복제거 + 재시도와 함께 호출합니다.
 *
 * @param {string}  url         - 완전한 PUBG API URL
 * @param {object}  options
 * @param {number}  options.ttl   - 캐시 유효 시간 (ms), 기본 TTL.PLAYER
 * @param {boolean} options.force - true 이면 캐시 무시 (force=1 쿼리 파라미터 전달)
 * @returns {Promise<any>} 파싱된 JSON 데이터
 */
export async function cachedPubgFetch(url, { ttl = TTL.PLAYER, force = false } = {}) {
  const apiKey = process.env.PUBG_API_KEY;
  if (!apiKey) throw new PubgApiError('NO_API_KEY', 'PUBG_API_KEY 환경변수가 설정되지 않았습니다.', 500);

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/vnd.api+json',
  };

  const cacheKey = url;

  // 1. 캐시 적중
  if (!force) {
    const hit = cacheGet(cacheKey);
    if (hit !== null) {
      console.log(`[pubgApiCache] HIT: ${url.replace('https://api.pubg.com', '')}`);
      return hit;
    }
  }

  // 2. 중복 요청 제거 — 같은 URL이 동시에 여러 번 들어오면 하나의 Promise 공유
  if (_inFlight.has(cacheKey)) {
    console.log(`[pubgApiCache] DEDUP: ${url.replace('https://api.pubg.com', '')}`);
    return _inFlight.get(cacheKey);
  }

  // 3. 실제 API 호출
  const promise = pubgApiFetch(url, headers)
    .then((data) => {
      cacheSet(cacheKey, data, ttl);
      return data;
    })
    .finally(() => {
      _inFlight.delete(cacheKey);
    });

  _inFlight.set(cacheKey, promise);
  console.log(`[pubgApiCache] FETCH: ${url.replace('https://api.pubg.com', '')}`);
  return promise;
}

/**
 * 특정 키의 캐시를 수동으로 무효화합니다.
 * @param {string} urlOrPrefix - 완전한 URL 또는 URL 접두사
 */
export function invalidateCache(urlOrPrefix) {
  for (const key of _cache.keys()) {
    if (key.startsWith(urlOrPrefix)) {
      _cache.delete(key);
    }
  }
}

/** 캐시 통계 (디버그용) */
export function getCacheStats() {
  pruneExpired();
  return {
    entries: _cache.size,
    inFlight: _inFlight.size,
    keys: [..._cache.keys()].map((k) => k.replace('https://api.pubg.com', '')),
  };
}

// ── 에러 클래스 ─────────────────────────────────────────────────────────────
export class PubgApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'PubgApiError';
    this.code   = code;
    this.status = status;
  }
}

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
