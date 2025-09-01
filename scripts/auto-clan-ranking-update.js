// scripts/auto-clan-ranking-update.js
// 클랜 랭킹 자동 업데이트 스케줄러

const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 클랜 랭킹 업데이트 함수
async function updateClanRankings() {
  console.log('🔄 클랜 랭킹 업데이트 시작...', new Date().toLocaleString('ko-KR'));
  
  try {
    // 모든 클랜과 멤버 데이터를 가져와서 점수 계산
    const clans = await prisma.clan.findMany({
      include: {
        members: true
      }
    });

    const updatedClans = [];

    for (const clan of clans) {
      if (clan.members.length === 0) continue;

      // 클랜 평균 점수 계산
      const totalScore = clan.members.reduce((sum, member) => sum + (member.score || 0), 0);
      const avgScore = Math.round(totalScore / clan.members.length);

      // 평균 데미지 계산
      const totalDamage = clan.members.reduce((sum, member) => sum + (member.avgDamage || 0), 0);
      const avgDamage = Math.round(totalDamage / clan.members.length);

      // 승률 계산
      const totalWinRate = clan.members.reduce((sum, member) => sum + (member.winRate || 0), 0);
      const avgWinRate = totalWinRate / clan.members.length;

      // 클랜 데이터 업데이트
      const updatedClan = await prisma.clan.update({
        where: { id: clan.id },
        data: {
          avgScore: avgScore,
          memberCount: clan.members.length
        }
      });

      updatedClans.push({
        name: clan.name,
        avgScore: avgScore,
        avgDamage: avgDamage,
        avgWinRate: avgWinRate,
        memberCount: clan.members.length
      });

      console.log(`✅ ${clan.name}: 평균점수 ${avgScore}, 멤버수 ${clan.members.length}`);
    }

    // 랭킹 업데이트 완료 로그 저장
    await prisma.rankingUpdateLog.create({
      data: {
        updateType: 'clan_ranking',
        updatedCount: updatedClans.length,
        updateTime: new Date(),
        status: 'success',
        details: JSON.stringify({
          updatedClans: updatedClans.slice(0, 10), // 상위 10개만 저장
          totalProcessed: clans.length
        })
      }
    }).catch(err => {
      // 테이블이 없으면 무시 (옵션)
      console.log('로그 저장 실패 (테이블이 없을 수 있음):', err.message);
    });

    console.log(`🎉 클랜 랭킹 업데이트 완료! 총 ${updatedClans.length}개 클랜 처리됨`);
    console.log('📊 상위 5개 클랜:');
    updatedClans
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 5)
      .forEach((clan, index) => {
        console.log(`  ${index + 1}. ${clan.name}: ${clan.avgScore}점 (멤버 ${clan.memberCount}명)`);
      });

    return {
      success: true,
      updatedCount: updatedClans.length,
      topClans: updatedClans.sort((a, b) => b.avgScore - a.avgScore).slice(0, 10)
    };

  } catch (error) {
    console.error('❌ 클랜 랭킹 업데이트 실패:', error);

    // 에러 로그 저장
    await prisma.rankingUpdateLog.create({
      data: {
        updateType: 'clan_ranking',
        updatedCount: 0,
        updateTime: new Date(),
        status: 'error',
        errorMessage: error.message,
        details: JSON.stringify({ error: error.stack })
      }
    }).catch(() => {
      console.log('에러 로그 저장 실패');
    });

    return {
      success: false,
      error: error.message
    };
  } finally {
    await prisma.$disconnect();
  }
}

// 스케줄러 설정
function startClanRankingScheduler() {
  console.log('🚀 클랜 랭킹 자동 업데이트 스케줄러 시작');
  console.log('📅 업데이트 시간: 매일 12:00, 18:00');

  // 매일 오후 12시에 실행
  cron.schedule('0 12 * * *', () => {
    console.log('⏰ 정오 12:00 - 클랜 랭킹 자동 업데이트 실행');
    updateClanRankings();
  }, {
    timezone: "Asia/Seoul"
  });

  // 매일 오후 6시에 실행  
  cron.schedule('0 18 * * *', () => {
    console.log('⏰ 저녁 18:00 - 클랜 랭킹 자동 업데이트 실행');
    updateClanRankings();
  }, {
    timezone: "Asia/Seoul"
  });

  // 서버 시작시 한 번 실행 (5초 후)
  setTimeout(() => {
    console.log('🔄 서버 시작 - 초기 클랜 랭킹 업데이트 실행');
    updateClanRankings();
  }, 5000);
}

// 수동 업데이트 함수 (API에서 호출 가능)
async function manualClanRankingUpdate() {
  console.log('🔧 수동 클랜 랭킹 업데이트 요청');
  return await updateClanRankings();
}

module.exports = {
  startClanRankingScheduler,
  manualClanRankingUpdate,
  updateClanRankings
};

// 직접 실행시
if (require.main === module) {
  console.log('🎯 클랜 랭킹 업데이트 스크립트 직접 실행');
  updateClanRankings().then(result => {
    console.log('실행 결과:', result);
    process.exit(0);
  });
}
