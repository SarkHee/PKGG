// DB에서 실제 플레이어 데이터 확인
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPlayerData() {
  try {
    // 모든 클랜 멤버 확인
    const members = await prisma.clanMember.findMany({
      take: 5, // 처음 5명만
      include: {
        clan: true
      }
    });

    console.log('📊 DB에서 가져온 플레이어 데이터:');
    members.forEach((member, index) => {
      console.log(`\n${index + 1}. ${member.nickname}:`);
      console.log(`  avgKills: ${member.avgKills}`);
      console.log(`  avgDamage: ${member.avgDamage}`);
      console.log(`  winRate: ${member.winRate}`);
      console.log(`  top10Rate: ${member.top10Rate}`);
      console.log(`  avgSurviveTime: ${member.avgSurviveTime}`);
      console.log(`  클랜: ${member.clan?.name || '없음'}`);
    });

    // 평균값이 0이 아닌 멤버 찾기
    const validMembers = await prisma.clanMember.findMany({
      where: {
        OR: [
          { avgKills: { gt: 0 } },
          { winRate: { gt: 0 } },
          { top10Rate: { gt: 0 } }
        ]
      },
      take: 3
    });

    console.log('\n🎯 유효한 데이터를 가진 멤버들:');
    validMembers.forEach((member, index) => {
      console.log(`\n${index + 1}. ${member.nickname}:`);
      console.log(`  avgKills: ${member.avgKills}`);
      console.log(`  winRate: ${member.winRate}`);
      console.log(`  top10Rate: ${member.top10Rate}`);
    });

  } catch (error) {
    console.error('데이터 조회 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPlayerData();