// scripts/remove-former-members.js
// UBD 클랜에서 탈퇴한 멤버들을 DB에서 제거

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 탈퇴한 멤버들 (클랜 변경/탈퇴로 확인된 멤버들)
const formerMembers = ['BackUp_KYS', 'JAEHYUN-s', 'sa_ngsang'];

async function removeFormerMembers() {
  console.log('🗑️  UBD 클랜 탈퇴자 제거 시작...\n');

  try {
    // 1. 먼저 해당 멤버들이 실제로 존재하는지 확인
    console.log('🔍 탈퇴자 정보 확인 중...\n');

    for (const nickname of formerMembers) {
      const member = await prisma.clanMember.findFirst({
        where: { nickname: nickname },
        include: {
          clan: true,
          matches: true,
          modeStats: true,
        },
      });

      if (member) {
        console.log(`📋 ${nickname}:`);
        console.log(`   - 클랜: ${member.clan?.name || '없음'}`);
        console.log(`   - 연관된 매치: ${member.matches.length}개`);
        console.log(`   - 모드 통계: ${member.modeStats.length}개`);
        console.log(`   - PUBG 클랜 ID: ${member.pubgClanId || '없음'}`);
      } else {
        console.log(`❌ ${nickname}: DB에서 찾을 수 없음`);
      }
    }

    console.log('\n⚠️  정말로 이 멤버들을 삭제하시겠습니까?');
    console.log('   (관련된 매치 기록과 통계도 함께 삭제됩니다)\n');

    // 2. 삭제 진행
    console.log('🗑️  삭제 진행 중...\n');

    const results = {
      deleted: [],
      notFound: [],
      errors: [],
    };

    for (const nickname of formerMembers) {
      try {
        console.log(`🔄 ${nickname} 삭제 중...`);

        // 관련된 데이터들을 순차적으로 삭제
        const member = await prisma.clanMember.findFirst({
          where: { nickname: nickname },
        });

        if (member) {
          // 1. PlayerModeStats 삭제
          const deletedModeStats = await prisma.playerModeStats.deleteMany({
            where: { clanMemberId: member.id },
          });
          console.log(`   - 모드 통계 ${deletedModeStats.count}개 삭제`);

          // 2. PlayerMatch 삭제
          const deletedMatches = await prisma.playerMatch.deleteMany({
            where: { clanMemberId: member.id },
          });
          console.log(`   - 매치 기록 ${deletedMatches.count}개 삭제`);

          // 3. ClanMember 삭제
          await prisma.clanMember.delete({
            where: { id: member.id },
          });
          console.log(`   ✅ ${nickname} 완전 삭제 완료`);

          results.deleted.push(nickname);
        } else {
          console.log(`   ❌ ${nickname}: DB에서 찾을 수 없음`);
          results.notFound.push(nickname);
        }
      } catch (error) {
        console.log(`   💥 ${nickname} 삭제 실패: ${error.message}`);
        results.errors.push({ nickname, error: error.message });
      }

      console.log(''); // 빈 줄
    }

    // 3. 결과 요약
    console.log('🎉 탈퇴자 제거 완료!\n');
    console.log('📈 결과 요약:');
    console.log(`  - 성공적으로 삭제: ${results.deleted.length}명`);
    console.log(`  - 찾을 수 없음: ${results.notFound.length}명`);
    console.log(`  - 삭제 실패: ${results.errors.length}명`);

    if (results.deleted.length > 0) {
      console.log('\n✅ 삭제된 멤버들:');
      results.deleted.forEach((nickname, index) => {
        console.log(`  ${index + 1}. ${nickname}`);
      });
    }

    if (results.notFound.length > 0) {
      console.log('\n❓ DB에서 찾을 수 없었던 멤버들:');
      results.notFound.forEach((nickname, index) => {
        console.log(`  ${index + 1}. ${nickname}`);
      });
    }

    if (results.errors.length > 0) {
      console.log('\n❌ 삭제 실패한 멤버들:');
      results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.nickname}: ${error.error}`);
      });
    }

    // 4. 현재 UBD 클랜 멤버 수 확인
    const ubdClan = await prisma.clan.findFirst({
      where: { pubgClanId: 'clan.eb5c32a3cc484b59981f9c61e9ea2747' },
      include: {
        members: true,
      },
    });

    if (ubdClan) {
      console.log(`\n📊 현재 UBD 클랜 DB 멤버 수: ${ubdClan.members.length}명`);
      console.log(
        `   (PUBG API 총 멤버 수: ${ubdClan.pubgMemberCount || '알 수 없음'}명)`
      );

      const coverage = ubdClan.pubgMemberCount
        ? ((ubdClan.members.length / ubdClan.pubgMemberCount) * 100).toFixed(1)
        : '계산 불가';
      console.log(`   커버리지: ${coverage}%`);
    }
  } catch (error) {
    console.error('💥 탈퇴자 제거 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 실행
removeFormerMembers();
