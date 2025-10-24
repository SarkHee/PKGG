// pages/api/clan/ranking-status.js
// 클랜 랭킹 업데이트 상태 조회 API

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: '허용되지 않는 메서드입니다. GET 요청만 허용됩니다.',
    });
  }

  try {
    // 가장 최근 클랜 랭킹 업데이트 로그 조회
    let lastUpdate = null;
    let nextUpdateTime = null;

    try {
      lastUpdate = await prisma.rankingUpdateLog.findFirst({
        where: {
          updateType: 'clan_ranking',
        },
        orderBy: {
          updateTime: 'desc',
        },
      });
    } catch (error) {
      // 테이블이 없으면 기본값 사용
      console.log('랭킹 업데이트 로그 테이블이 없음, 기본값 사용');
    }

    // 다음 업데이트 시간 계산 (12:00, 18:00)
    const now = new Date();
    const koreaTime = new Date(
      now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' })
    );
    const nextUpdate12 = new Date(koreaTime);
    const nextUpdate18 = new Date(koreaTime);

    nextUpdate12.setHours(12, 0, 0, 0);
    nextUpdate18.setHours(18, 0, 0, 0);

    // 현재 시간이 12시 이전이면 12시, 12시-18시 사이면 18시, 18시 이후면 다음날 12시
    if (koreaTime.getHours() < 12) {
      nextUpdateTime = nextUpdate12;
    } else if (koreaTime.getHours() < 18) {
      nextUpdateTime = nextUpdate18;
    } else {
      nextUpdate12.setDate(nextUpdate12.getDate() + 1);
      nextUpdateTime = nextUpdate12;
    }

    // 응답 데이터 구성
    const response = {
      success: true,
      data: {
        lastUpdate: lastUpdate
          ? {
              time: lastUpdate.updateTime,
              timeKorean: lastUpdate.updateTime.toLocaleString('ko-KR', {
                timeZone: 'Asia/Seoul',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              }),
              status: lastUpdate.status,
              updatedCount: lastUpdate.updatedCount,
            }
          : {
              timeKorean: '아직 업데이트되지 않음',
              status: 'never',
              updatedCount: 0,
            },
        nextUpdate: {
          time: nextUpdateTime,
          timeKorean: nextUpdateTime.toLocaleString('ko-KR', {
            timeZone: 'Asia/Seoul',
            hour: '2-digit',
            minute: '2-digit',
          }),
          schedules: ['12:00', '18:00'],
        },
        currentTime: koreaTime.toLocaleString('ko-KR', {
          timeZone: 'Asia/Seoul',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ 클랜 랭킹 상태 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message,
    });
  } finally {
    await prisma.$disconnect();
  }
}
