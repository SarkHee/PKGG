// 테스트용 플레이어 데이터 추가
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTestPlayer() {
  try {
    // 기존 테스트 클랜이 있는지 확인
    let testClan = await prisma.clan.findFirst({
      where: { name: 'TestClan' }
    });

    // 없으면 생성
    if (!testClan) {
      testClan = await prisma.clan.create({
        data: {
          name: 'TestClan',
          leader: 'TestLeader',
          description: '테스트용 클랜',
          memberCount: 1,
          avgScore: 1500,
          mainStyle: 'BALANCED'
        }
      });
      console.log('✅ 테스트 클랜 생성:', testClan.name);
    }

    // 테스트 플레이어 데이터 추가/업데이트
    const testPlayer = await prisma.clanMember.upsert({
      where: {
        id: 999999 
      },
      update: {
        avgKills: 2.5,
        avgDamage: 350.5,
        winRate: 15.2,
        top10Rate: 45.8,
        avgSurviveTime: 1250.0,
        avgAssists: 1.2,
        score: 2100
      },
      create: {
        id: 999999,
        nickname: 'TestPlayer',
        score: 2100,
        style: 'BALANCED',
        avgDamage: 350.5,
        avgKills: 2.5,
        avgAssists: 1.2,
        avgSurviveTime: 1250.0,
        winRate: 15.2,
        top10Rate: 45.8,
        clanId: testClan.id
      }
    });

    console.log('✅ 테스트 플레이어 생성/업데이트:', testPlayer.nickname);
    console.log('📊 데이터:', {
      avgKills: testPlayer.avgKills,
      avgDamage: testPlayer.avgDamage,
      winRate: testPlayer.winRate,
      top10Rate: testPlayer.top10Rate,
      avgSurviveTime: testPlayer.avgSurviveTime
    });

  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestPlayer();