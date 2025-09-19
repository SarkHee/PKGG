import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const { playerNickname, playerServer, analysis, trainingPlan } = req.body;

      if (!playerNickname || !playerServer || !analysis) {
        return res.status(400).json({ error: '필수 정보가 누락되었습니다.' });
      }

      // 플레이어 분석 결과 저장
      const savedAnalysis = await prisma.playerAnalysis.upsert({
        where: {
          playerNickname_playerServer: {
            playerNickname,
            playerServer
          }
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
          trainingPlan: JSON.stringify(trainingPlan)
        },
        update: {
          playStyle: analysis.playStyle,
          playstyleScore: analysis.playstyleScore,
          strengths: JSON.stringify(analysis.strengths),
          weaknesses: JSON.stringify(analysis.weaknesses),
          aggressionIndex: analysis.aggressionIndex,
          consistencyIndex: analysis.consistencyIndex,
          trainingPlan: JSON.stringify(trainingPlan),
          lastAnalyzed: new Date()
        }
      });

      res.status(200).json({
        message: 'AI 분석 결과가 저장되었습니다.',
        analysis: savedAnalysis
      });

    } else if (req.method === 'GET') {
      const { nickname, server } = req.query;

      if (!nickname || !server) {
        return res.status(400).json({ error: '플레이어 정보가 필요합니다.' });
      }

      // 기존 분석 결과 조회
      const existingAnalysis = await prisma.playerAnalysis.findUnique({
        where: {
          playerNickname_playerServer: {
            playerNickname: nickname,
            playerServer: server
          }
        }
      });

      if (existingAnalysis) {
        res.status(200).json({
          analysis: {
            ...existingAnalysis,
            strengths: JSON.parse(existingAnalysis.strengths),
            weaknesses: JSON.parse(existingAnalysis.weaknesses),
            trainingPlan: JSON.parse(existingAnalysis.trainingPlan)
          }
        });
      } else {
        res.status(404).json({ error: '분석 결과를 찾을 수 없습니다.' });
      }

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('AI 분석 API 오류:', error);
    res.status(500).json({
      error: '서버 오류가 발생했습니다.',
      details: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
