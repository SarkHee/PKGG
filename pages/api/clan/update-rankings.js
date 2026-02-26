// pages/api/clan/update-rankings.js
// 클랜 랭킹 수동 업데이트 API

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 클랜 랭킹 업데이트 함수 (API 버전)
async function updateClanRankings() {
  console.log(
    '🔄 클랜 랭킹 업데이트 시작...',
    new Date().toLocaleString('ko-KR')
  );

  try {
    // 모든 클랜과 멤버 데이터를 가져와서 점수 계산
    const clans = await prisma.clan.findMany({
      include: {
        members: true,
      },
    });

    const updatedClans = [];

    for (const clan of clans) {
      if (clan.members.length === 0) continue;

      // 클랜 평균 점수 계산
      const totalScore = clan.members.reduce(
        (sum, member) => sum + (member.score || 0),
        0
      );
      const avgScore = Math.round(totalScore / clan.members.length);

      // 평균 데미지 계산
      const totalDamage = clan.members.reduce(
        (sum, member) => sum + (member.avgDamage || 0),
        0
      );
      const avgDamage = Math.round(totalDamage / clan.members.length);

      // 승률 계산
      const totalWinRate = clan.members.reduce(
        (sum, member) => sum + (member.winRate || 0),
        0
      );
      const avgWinRate = totalWinRate / clan.members.length;

      // 클랜 데이터 업데이트
      await prisma.clan.update({
        where: { id: clan.id },
        data: {
          avgScore: avgScore,
          memberCount: clan.members.length,
        },
      });

      updatedClans.push({
        name: clan.name,
        avgScore: avgScore,
        avgDamage: avgDamage,
        avgWinRate: avgWinRate,
        memberCount: clan.members.length,
      });

      console.log(
        `✅ ${clan.name}: 평균점수 ${avgScore}, 멤버수 ${clan.members.length}`
      );
    }

    // 랭킹 업데이트 완료 로그 저장
    try {
      await prisma.rankingUpdateLog.create({
        data: {
          updateType: 'clan_ranking',
          updatedCount: updatedClans.length,
          updateTime: new Date(),
          status: 'success',
          details: JSON.stringify({
            updatedClans: updatedClans.slice(0, 10), // 상위 10개만 저장
            totalProcessed: clans.length,
          }),
        },
      });
    } catch (logError) {
      console.warn('로그 저장 실패:', logError.message);
    }

    console.log(
      `🎉 클랜 랭킹 업데이트 완료! 총 ${updatedClans.length}개 클랜 처리됨`
    );

    return {
      success: true,
      updatedCount: updatedClans.length,
      topClans: updatedClans
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 10),
    };
  } catch (error) {
    console.error('❌ 클랜 랭킹 업데이트 실패:', error);

    // 에러 로그 저장
    try {
      await prisma.rankingUpdateLog.create({
        data: {
          updateType: 'clan_ranking',
          updatedCount: 0,
          updateTime: new Date(),
          status: 'error',
          errorMessage: error.message,
          details: JSON.stringify({ error: error.stack }),
        },
      });
    } catch (logError) {
      console.warn('에러 로그 저장 실패:', logError.message);
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

export default async function handler(req, res) {
  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: '허용되지 않는 메서드입니다. POST 요청만 허용됩니다.',
    });
  }

  // 관리자 인증 또는 크론 인증 확인
  const adminToken = req.headers['x-admin-token'];
  const cronAuth = req.headers.authorization;
  const isAdmin = adminToken && adminToken === process.env.ADMIN_PASSWORD;
  const isCron = cronAuth === `Bearer ${process.env.CRON_SECRET}`;

  if (!isAdmin && !isCron) {
    return res.status(401).json({ success: false, message: '관리자 인증이 필요합니다.' });
  }

  try {
    console.log('🔄 클랜 랭킹 수동 업데이트 API 호출');

    // 클랜 랭킹 업데이트 실행
    const result = await updateClanRankings();

    if (result.success) {
      res.status(200).json({
        success: true,
        message: `클랜 랭킹이 성공적으로 업데이트되었습니다.`,
        data: {
          updatedCount: result.updatedCount,
          topClans: result.topClans,
          updateTime: new Date().toLocaleString('ko-KR', {
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: '클랜 랭킹 업데이트 중 오류가 발생했습니다.',
        error: result.error,
      });
    }
  } catch (error) {
    console.error('❌ 클랜 랭킹 업데이트 API 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message,
    });
  } finally {
    await prisma.$disconnect();
  }
}
