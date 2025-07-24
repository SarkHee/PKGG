// 개선된 PUBG API - 배치 처리 지원
// /Users/mac/Desktop/PKGG/pages/api/pubg/batch/[...params].js

import { fetchPlayersBatch, fetchSeasonStatsBatch, RateLimitManager } from '../../../../utils/pubgBatchApi.js';

const rateLimitManager = new RateLimitManager(10);

/**
 * 배치 처리 API 엔드포인트
 * 
 * 사용법:
 * GET /api/pubg/batch/players/steam?names=player1,player2,player3
 * GET /api/pubg/batch/stats/steam/season123/squad-fpp?ids=id1,id2,id3
 * GET /api/pubg/batch/lifetime/steam/squad-fpp?ids=id1,id2,id3
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET 메소드만 지원됩니다.' });
  }

  const { params } = req.query;
  
  if (!Array.isArray(params) || params.length < 2) {
    return res.status(400).json({ 
      error: '잘못된 경로입니다. /api/pubg/batch/{type}/{shard}/... 형식을 사용하세요.' 
    });
  }

  const [type, shard, ...rest] = params;

  try {
    await rateLimitManager.waitIfNeeded();

    switch (type) {
      case 'players':
        return await handlePlayersBatch(req, res, shard);
      
      case 'stats':
        if (rest.length < 2) {
          return res.status(400).json({ 
            error: '/api/pubg/batch/stats/{shard}/{seasonId}/{gameMode} 형식이 필요합니다.' 
          });
        }
        return await handleStatsBatch(req, res, shard, rest[0], rest[1]);
      
      case 'lifetime':
        if (rest.length < 1) {
          return res.status(400).json({ 
            error: '/api/pubg/batch/lifetime/{shard}/{gameMode} 형식이 필요합니다.' 
          });
        }
        return await handleLifetimeBatch(req, res, shard, rest[0]);
      
      default:
        return res.status(400).json({ 
          error: '지원하지 않는 타입입니다. players, stats, lifetime 중 하나를 사용하세요.' 
        });
    }

  } catch (error) {
    console.error('배치 API 오류:', error);
    res.status(500).json({
      error: '배치 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
}

/**
 * 플레이어들의 기본 정보 배치 조회
 */
async function handlePlayersBatch(req, res, shard) {
  const { names } = req.query;
  
  if (!names) {
    return res.status(400).json({ 
      error: 'names 쿼리 파라미터가 필요합니다. (예: ?names=player1,player2)' 
    });
  }

  const playerNames = names.split(',').map(name => name.trim()).filter(name => name);
  
  if (playerNames.length === 0 || playerNames.length > 10) {
    return res.status(400).json({ 
      error: '플레이어 이름은 1-10개까지 지원됩니다.' 
    });
  }

  try {
    const data = await fetchPlayersBatch(shard, playerNames);
    
    // 응답 데이터 가공
    const processedData = {
      success: true,
      count: data.data.length,
      players: data.data.map(player => ({
        id: player.id,
        name: player.attributes.name,
        matches: player.relationships.matches.data.slice(0, 20).map(m => m.id),
        shardId: player.attributes.shardId,
        stats: player.attributes.stats,
        createdAt: player.attributes.createdAt,
        updatedAt: player.attributes.updatedAt
      }))
    };

    res.status(200).json(processedData);

  } catch (error) {
    console.error('플레이어 배치 조회 실패:', error);
    res.status(500).json({
      error: '플레이어 정보 조회에 실패했습니다.',
      details: error.message
    });
  }
}

/**
 * 플레이어들의 시즌 통계 배치 조회
 */
async function handleStatsBatch(req, res, shard, seasonId, gameMode) {
  const { ids } = req.query;
  
  if (!ids) {
    return res.status(400).json({ 
      error: 'ids 쿼리 파라미터가 필요합니다. (예: ?ids=id1,id2)' 
    });
  }

  const playerIds = ids.split(',').map(id => id.trim()).filter(id => id);
  
  if (playerIds.length === 0 || playerIds.length > 10) {
    return res.status(400).json({ 
      error: '플레이어 ID는 1-10개까지 지원됩니다.' 
    });
  }

  try {
    const data = await fetchSeasonStatsBatch(shard, seasonId, gameMode, playerIds);
    
    // 응답 데이터 가공
    const processedData = {
      success: true,
      seasonId: seasonId,
      gameMode: gameMode,
      count: data.data.length,
      stats: data.data.map(stats => ({
        playerId: stats.relationships.player.data.id,
        seasonId: stats.relationships.season.data.id,
        gameMode: gameMode,
        attributes: stats.attributes.gameModeStats
      }))
    };

    res.status(200).json(processedData);

  } catch (error) {
    console.error('시즌 통계 배치 조회 실패:', error);
    res.status(500).json({
      error: '시즌 통계 조회에 실패했습니다.',
      details: error.message
    });
  }
}

/**
 * 플레이어들의 라이프타임 통계 배치 조회
 */
async function handleLifetimeBatch(req, res, shard, gameMode) {
  const { ids } = req.query;
  
  if (!ids) {
    return res.status(400).json({ 
      error: 'ids 쿼리 파라미터가 필요합니다. (예: ?ids=id1,id2)' 
    });
  }

  const playerIds = ids.split(',').map(id => id.trim()).filter(id => id);
  
  if (playerIds.length === 0 || playerIds.length > 10) {
    return res.status(400).json({ 
      error: '플레이어 ID는 1-10개까지 지원됩니다.' 
    });
  }

  try {
    const data = await fetchSeasonStatsBatch(shard, 'lifetime', gameMode, playerIds);
    
    // 응답 데이터 가공
    const processedData = {
      success: true,
      seasonId: 'lifetime',
      gameMode: gameMode,
      count: data.data.length,
      stats: data.data.map(stats => ({
        playerId: stats.relationships.player.data.id,
        seasonId: 'lifetime',
        gameMode: gameMode,
        attributes: stats.attributes.gameModeStats
      }))
    };

    res.status(200).json(processedData);

  } catch (error) {
    console.error('라이프타임 통계 배치 조회 실패:', error);
    res.status(500).json({
      error: '라이프타임 통계 조회에 실패했습니다.',
      details: error.message
    });
  }
}
