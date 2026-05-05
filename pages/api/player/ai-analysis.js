import prisma from '../../../utils/prisma.js';
import { redisGet, redisSet, REDIS_TTL } from '../../../utils/redis.js';

function aiCacheKey(playerId, shard, nickname) {
  if (playerId) return `ai-analysis:${playerId}:${shard}`;
  return `ai-analysis:nick:${(nickname || '').toLowerCase()}:${shard}`;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const { playerNickname, playerServer, playerId, analysis, trainingPlan } = req.body;

      if (!playerNickname || !playerServer || !analysis) {
        return res.status(400).json({ error: '필수 정보가 누락되었습니다.' });
      }

      // Redis 캐시 HIT → DB write 스킵
      const cacheKey = aiCacheKey(playerId, playerServer, playerNickname);
      const cached = await redisGet(cacheKey);
      if (cached) {
        return res.status(200).json({ message: 'AI 분석 결과가 저장되었습니다.', analysis: cached, fromCache: true });
      }

      // 플레이어 분석 결과 저장
      const savedAnalysis = await prisma.playerAnalysis.upsert({
        where: {
          playerNickname_playerServer: {
            playerNickname,
            playerServer,
          },
        },
        create: {
          playerNickname,
          playerServer,
          playStyle: analysis.playStyle,
          playstyleScore: analysis.playstyleScore,
          strengths: JSON.stringify(analysis.strengths),
          weaknesses: JSON.stringify(analysis.weaknesses),
          killDeathRatio: analysis.aggressionIndex / 20, // 임시 계산
          damagePerGame: analysis.survivalIndex * 3, // 임시 계산
          survivalRate: analysis.survivalIndex,
          aggressionIndex: analysis.aggressionIndex,
          consistencyIndex: analysis.consistencyIndex,
          recommendations: JSON.stringify([]),
          trainingPlan: JSON.stringify(trainingPlan ?? []),
        },
        update: {
          playStyle: analysis.playStyle,
          playstyleScore: analysis.playstyleScore,
          strengths: JSON.stringify(analysis.strengths),
          weaknesses: JSON.stringify(analysis.weaknesses),
          aggressionIndex: analysis.aggressionIndex,
          consistencyIndex: analysis.consistencyIndex,
          trainingPlan: JSON.stringify(trainingPlan ?? []),
          lastAnalyzed: new Date(),
        },
      });

      // Redis 캐시 저장 (1시간)
      redisSet(cacheKey, savedAnalysis, REDIS_TTL.AI_ANALYSIS).catch(() => {});

      return res.status(200).json({
        message: 'AI 분석 결과가 저장되었습니다.',
        analysis: savedAnalysis,
      });
    } else if (req.method === 'GET') {
      const { nickname, server, playerId: qPlayerId } = req.query;

      if (!nickname || !server) {
        return res.status(400).json({ error: '플레이어 정보가 필요합니다.' });
      }

      // Redis 캐시 확인
      const getCacheKey = aiCacheKey(qPlayerId, server, nickname);
      const cachedGet = await redisGet(getCacheKey);
      if (cachedGet) {
        return res.status(200).json({ analysis: cachedGet, fromCache: true });
      }

      // 기존 분석 결과 조회
      const existingAnalysis = await prisma.playerAnalysis.findUnique({
        where: {
          playerNickname_playerServer: {
            playerNickname: nickname,
            playerServer: server,
          },
        },
      });

      if (existingAnalysis) {
        const parsed = {
          ...existingAnalysis,
          strengths: JSON.parse(existingAnalysis.strengths),
          weaknesses: JSON.parse(existingAnalysis.weaknesses),
          trainingPlan: JSON.parse(existingAnalysis.trainingPlan),
        };
        redisSet(getCacheKey, parsed, REDIS_TTL.AI_ANALYSIS).catch(() => {});
        return res.status(200).json({ analysis: parsed });
      } else {
        return res.status(404).json({ error: '분석 결과를 찾을 수 없습니다.' });
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('AI 분석 API 오류:', error);
    res.status(500).json({
      error: '서버 오류가 발생했습니다.',
      ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
    });
  }
}
