// PUBG 시즌 정보 조회 API
// /Users/mac/Desktop/PKGG/pages/api/pubg/seasons/[shard].js

const PUBG_API_KEY = process.env.PUBG_API_KEY;
const PUBG_BASE_URL = "https://api.pubg.com/shards";

// 시즌 정보 캐시 (1시간 유지)
let seasonCache = new Map();
const CACHE_DURATION = 60 * 60 * 1000; // 1시간

/**
 * PUBG 시즌 정보 조회 API
 * 
 * 사용법:
 * GET /api/pubg/seasons/steam
 * GET /api/pubg/seasons/kakao
 * 
 * 쿼리 파라미터:
 * - current=true : 현재 시즌만 반환
 * - cache=false : 캐시 무시하고 새로 조회
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET 메소드만 지원됩니다.' });
  }

  const { shard } = req.query;
  const { current, cache } = req.query;

  if (!shard) {
    return res.status(400).json({ 
      error: '샤드(플랫폼)가 필요합니다. 예: /api/pubg/seasons/steam' 
    });
  }

  try {
    // 캐시 확인 (cache=false가 아닌 경우)
    if (cache !== 'false') {
      const cached = seasonCache.get(shard);
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        console.log(`시즌 정보 캐시 사용: ${shard}`);
        return res.status(200).json({
          ...cached.data,
          cached: true,
          cacheAge: Math.round((Date.now() - cached.timestamp) / 1000)
        });
      }
    }

    // PUBG API에서 시즌 정보 조회
    const url = `${PUBG_BASE_URL}/${shard}/seasons`;
    console.log(`시즌 정보 API 호출: ${url}`);

    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${PUBG_API_KEY}`,
        "Accept": "application/vnd.api+json"
      }
    });

    if (!response.ok) {
      throw new Error(`PUBG API 시즌 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    
    // 시즌 데이터 가공
    const seasons = data.data.map(season => ({
      id: season.id,
      type: season.type,
      isCurrentSeason: season.attributes.isCurrentSeason || false,
      isOffseason: season.attributes.isOffseason || false,
      attributes: season.attributes
    }));

    // 현재 시즌 찾기
    const currentSeason = seasons.find(season => season.isCurrentSeason);
    
    const processedData = {
      success: true,
      shard: shard,
      totalSeasons: seasons.length,
      currentSeason: currentSeason,
      seasons: current === 'true' ? [currentSeason].filter(Boolean) : seasons,
      lastUpdated: new Date().toISOString(),
      note: '시즌 목록은 약 2개월마다 업데이트됩니다.'
    };

    // 캐시 저장
    seasonCache.set(shard, {
      data: processedData,
      timestamp: Date.now()
    });

    res.status(200).json(processedData);

  } catch (error) {
    console.error('시즌 조회 실패:', error);
    res.status(500).json({
      error: '시즌 정보 조회에 실패했습니다.',
      details: error.message
    });
  }
}

// 캐시 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of seasonCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION * 2) {
      seasonCache.delete(key);
    }
  }
}, CACHE_DURATION);
