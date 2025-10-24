// scripts/remove-test-data.js
// 테스트용으로 추가한 클랜 데이터를 삭제하는 스크립트

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const testClanNames = [
  '김치전사',
  'Seoul Eagles',
  'Team Korea Pro',
  'Dragon Force',
];

async function removeTestData() {
  console.log('🗑️  테스트 데이터 삭제 시작...\n');

  try {
    for (const clanName of testClanNames) {
      console.log(`🎯 ${clanName} 삭제 중...`);

      // 클랜 찾기
      const clan = await prisma.clan.findFirst({
        where: { name: clanName },
      });

      if (!clan) {
        console.log(`    ⏭️  클랜을 찾을 수 없음, 스킵`);
        continue;
      }

      // 먼저 멤버들 삭제
      const deletedMembers = await prisma.clanMember.deleteMany({
        where: { clanId: clan.id },
      });

      console.log(`    👥 멤버 ${deletedMembers.count}명 삭제`);

      // 클랜 삭제
      await prisma.clan.delete({
        where: { id: clan.id },
      });

      console.log(`    ✅ 클랜 삭제 완료\n`);
    }

    console.log('🎉 테스트 데이터 삭제 완료!');

    // 남은 클랜 확인
    const remainingClans = await prisma.clan.findMany({
      select: { name: true, region: true, isKorean: true },
    });

    console.log(`\n📋 남은 클랜 목록 (${remainingClans.length}개):`);
    remainingClans.forEach((clan) => {
      const regionFlag =
        {
          KR: '🇰🇷',
          CN: '🇨🇳',
          JP: '🇯🇵',
          MIXED: '🌐',
          UNKNOWN: '❓',
        }[clan.region] || '❓';

      console.log(`   ${regionFlag} ${clan.name} (${clan.region})`);
    });
  } catch (error) {
    console.error('❌ 테스트 데이터 삭제 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
removeTestData();
