// scripts/fix-clan-member-counts.js
// 모든 클랜의 memberCount를 PUBG API 값(pubgMemberCount)에 맞게 수정

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixClanMemberCounts() {
  console.log('🔧 클랜 멤버 수 수정 시작 (API 기준)...\n');
  
  try {
    // PUBG API 정보가 있는 모든 클랜 가져오기
    const clans = await prisma.clan.findMany({
      where: {
        pubgMemberCount: { not: null }
      },
      select: {
        id: true,
        name: true,
        pubgClanTag: true,
        memberCount: true,
        pubgMemberCount: true,
        _count: {
          select: {
            members: true
          }
        }
      }
    });

    console.log(`📋 총 ${clans.length}개 클랜 확인 중...\n`);

    let updated = 0;

    for (const clan of clans) {
      const currentCount = clan.memberCount;        // 현재 DB의 memberCount
      const apiCount = clan.pubgMemberCount;        // PUBG API에서 가져온 실제 멤버 수
      const dbActualCount = clan._count.members;    // DB에 실제 저장된 멤버 수

      console.log(`🎯 ${clan.name} (${clan.pubgClanTag}):`);
      console.log(`   현재 memberCount: ${currentCount}명`);
      console.log(`   PUBG API 멤버 수: ${apiCount}명`);
      console.log(`   DB 저장 멤버 수: ${dbActualCount}명`);

      if (currentCount !== apiCount) {
        await prisma.clan.update({
          where: { id: clan.id },
          data: { memberCount: apiCount }
        });
        
        console.log(`   ✅ 수정됨: ${currentCount} → ${apiCount}명 (API 기준)`);
        updated++;
      } else {
        console.log(`   ✅ 이미 정확함`);
      }
      
      console.log(''); // 줄바꿈
    }

    console.log('🎉 클랜 멤버 수 수정 완료!');
    console.log(`📊 수정된 클랜: ${updated}개`);
    console.log(`\n💡 참고:`);
    console.log(`   - memberCount: 클랜 실제 멤버 수 (PUBG API 기준)`);
    console.log(`   - DB 저장 멤버: API 장애 시 백업/검색용`);

  } catch (error) {
    console.error('❌ 수정 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixClanMemberCounts();
