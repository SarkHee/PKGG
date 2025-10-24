// 향상된 PUBG 통계 API - 시즌/랭크/라이프타임 통계 지원
// /Users/mac/Desktop/PKGG/pages/api/pubg/stats/[...params].js

const PUBG_API_KEY = process.env.PUBG_API_KEY;
const PUBG_BASE_URL = 'https://api.pubg.com/shards';

/**
 * 통계 API 엔드포인트
 *
 * 사용법:
 * GET /api/pubg/stats/season/steam/playerId/seasonId - 시즌 통계
 * GET /api/pubg/stats/ranked/steam/playerId/seasonId - 랭크 통계
 * GET /api/pubg/stats/lifetime/steam/playerId - 라이프타임 통계
 * GET /api/pubg/stats/mastery/steam/playerId/weapon - 무기 숙련도
 * GET /api/pubg/stats/mastery/steam/playerId/survival - 생존 숙련도
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET 메소드만 지원됩니다.' });
  }

  const { params } = req.query;

  if (!Array.isArray(params) || params.length < 3) {
    return res.status(400).json({
      error:
        '잘못된 경로입니다. /api/pubg/stats/{type}/{shard}/{playerId}/... 형식을 사용하세요.',
    });
  }

  const [type, shard, playerId, ...rest] = params;

  try {
    switch (type) {
      case 'season':
        if (rest.length < 1) {
          return res.status(400).json({
            error:
              'seasonId가 필요합니다. /api/pubg/stats/season/{shard}/{playerId}/{seasonId}',
          });
        }
        return await handleSeasonStats(req, res, shard, playerId, rest[0]);

      case 'ranked':
        if (rest.length < 1) {
          return res.status(400).json({
            error:
              'seasonId가 필요합니다. /api/pubg/stats/ranked/{shard}/{playerId}/{seasonId}',
          });
        }
        return await handleRankedStats(req, res, shard, playerId, rest[0]);

      case 'lifetime':
        return await handleLifetimeStats(req, res, shard, playerId);

      case 'mastery':
        if (rest.length < 1) {
          return res.status(400).json({
            error:
              '숙련도 타입이 필요합니다. /api/pubg/stats/mastery/{shard}/{playerId}/{weapon|survival}',
          });
        }
        return await handleMasteryStats(req, res, shard, playerId, rest[0]);

      default:
        return res.status(400).json({
          error:
            '지원하지 않는 통계 타입입니다. season, ranked, lifetime, mastery 중 하나를 사용하세요.',
        });
    }
  } catch (error) {
    console.error('통계 API 오류:', error);
    res.status(500).json({
      error: '통계 조회 중 오류가 발생했습니다.',
      details: error.message,
    });
  }
}

/**
 * 시즌 통계 조회
 */
async function handleSeasonStats(req, res, shard, playerId, seasonId) {
  const url = `${PUBG_BASE_URL}/${shard}/players/${playerId}/seasons/${seasonId}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${PUBG_API_KEY}`,
        Accept: 'application/vnd.api+json',
      },
    });

    if (!response.ok) {
      throw new Error(`PUBG API 시즌 통계 조회 실패: ${response.status}`);
    }

    const data = await response.json();

    // 응답 데이터 가공
    const processedData = {
      success: true,
      type: 'season',
      playerId: playerId,
      seasonId: seasonId,
      data: {
        player: {
          id: data.data.relationships.player.data.id,
          name: data.data.attributes.gameModeStats
            ? Object.keys(data.data.attributes.gameModeStats)[0]
            : 'Unknown',
        },
        season: {
          id: data.data.relationships.season.data.id,
          isCurrentSeason: data.data.attributes.isCurrentSeason || false,
        },
        gameModeStats: data.data.attributes.gameModeStats || {},
        matchIds:
          data.data.relationships.matchesSeason?.data?.map((m) => m.id) || [],
        matchCount: data.data.relationships.matchesSeason?.data?.length || 0,
      },
    };

    res.status(200).json(processedData);
  } catch (error) {
    console.error('시즌 통계 조회 실패:', error);
    res.status(500).json({
      error: '시즌 통계 조회에 실패했습니다.',
      details: error.message,
    });
  }
}

/**
 * 랭크 통계 조회
 */
async function handleRankedStats(req, res, shard, playerId, seasonId) {
  const url = `${PUBG_BASE_URL}/${shard}/players/${playerId}/seasons/${seasonId}/ranked`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${PUBG_API_KEY}`,
        Accept: 'application/vnd.api+json',
      },
    });

    if (!response.ok) {
      throw new Error(`PUBG API 랭크 통계 조회 실패: ${response.status}`);
    }

    const data = await response.json();

    // 응답 데이터 가공
    const processedData = {
      success: true,
      type: 'ranked',
      playerId: playerId,
      seasonId: seasonId,
      data: {
        player: {
          id: data.data.relationships.player.data.id,
        },
        season: {
          id: data.data.relationships.season.data.id,
        },
        rankedGameModeStats: data.data.attributes.rankedGameModeStats || {},
        // 랭크 통계에는 매치 ID가 포함되지 않음
        note: 'Ranked stats do not include match IDs',
      },
    };

    res.status(200).json(processedData);
  } catch (error) {
    console.error('랭크 통계 조회 실패:', error);
    res.status(500).json({
      error: '랭크 통계 조회에 실패했습니다.',
      details: error.message,
    });
  }
}

/**
 * 라이프타임 통계 조회
 */
async function handleLifetimeStats(req, res, shard, playerId) {
  const url = `${PUBG_BASE_URL}/${shard}/players/${playerId}/seasons/lifetime`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${PUBG_API_KEY}`,
        Accept: 'application/vnd.api+json',
      },
    });

    if (!response.ok) {
      throw new Error(`PUBG API 라이프타임 통계 조회 실패: ${response.status}`);
    }

    const data = await response.json();

    // 응답 데이터 가공
    const processedData = {
      success: true,
      type: 'lifetime',
      playerId: playerId,
      data: {
        player: {
          id: data.data.relationships.player.data.id,
        },
        gameModeStats: data.data.attributes.gameModeStats || {},
        startingSeason: getLifetimeStartingSeason(shard),
        note: 'Lifetime stats include data from Survival Title system launch',
      },
    };

    res.status(200).json(processedData);
  } catch (error) {
    console.error('라이프타임 통계 조회 실패:', error);
    res.status(500).json({
      error: '라이프타임 통계 조회에 실패했습니다.',
      details: error.message,
    });
  }
}

/**
 * 숙련도 통계 조회 (무기/생존)
 */
async function handleMasteryStats(req, res, shard, playerId, masteryType) {
  if (!['weapon', 'survival'].includes(masteryType)) {
    return res.status(400).json({
      error: '숙련도 타입은 weapon 또는 survival이어야 합니다.',
    });
  }

  const endpoint =
    masteryType === 'weapon' ? 'weapon_mastery' : 'survival_mastery';
  const url = `${PUBG_BASE_URL}/${shard}/players/${playerId}/${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${PUBG_API_KEY}`,
        Accept: 'application/vnd.api+json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `PUBG API ${masteryType} 숙련도 조회 실패: ${response.status}`
      );
    }

    const data = await response.json();

    // 응답 데이터 가공
    const processedData = {
      success: true,
      type: `${masteryType}_mastery`,
      playerId: playerId,
      data: {
        player: {
          id: data.data.relationships.player.data.id,
        },
        attributes: data.data.attributes || {},
        note:
          masteryType === 'weapon'
            ? 'Weapon Mastery stats were reset in update 18.2'
            : 'Survival Mastery stats',
      },
    };

    res.status(200).json(processedData);
  } catch (error) {
    console.error(`${masteryType} 숙련도 조회 실패:`, error);
    res.status(500).json({
      error: `${masteryType} 숙련도 조회에 실패했습니다.`,
      details: error.message,
    });
  }
}

/**
 * 플랫폼별 라이프타임 시작 시즌 반환
 */
function getLifetimeStartingSeason(shard) {
  const startingSeasons = {
    steam: 'division.bro.official.pc-2018-01',
    kakao: 'division.bro.official.pc-2018-01',
    psn: 'division.bro.official.playstation-01',
    xbox: 'division.bro.official.xbox-01',
    stadia: 'division.bro.official.console-07',
  };

  return startingSeasons[shard] || 'division.bro.official.pc-2018-01';
}
