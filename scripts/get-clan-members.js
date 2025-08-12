// scripts/get-clan-members.js
// 클랜 ID로 멤버 닉네임들을 콘솔에 출력하는 스크립트

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getClanMembers(clanId, pubgClanId) {
  try {
    let clan, members;

    if (clanId) {
      // DB 내부 ID로 검색
      clan = await prisma.clan.findUnique({
        where: { id: parseInt(clanId) },
        select: {
          id: true,
          name: true,
          pubgClanTag: true,
          memberCount: true,
          pubgClanId: true
        }
      });

      if (!clan) {
        console.log(`❌ 클랜 ID ${clanId}를 찾을 수 없습니다.`);
        return;
      }

      members = await prisma.clanMember.findMany({
        where: { clanId: parseInt(clanId) },
        select: {
          nickname: true,
          score: true,
          pubgShardId: true,
          lastUpdated: true
        },
        orderBy: { score: 'desc' }
      });

    } else if (pubgClanId) {
      // PUBG 클랜 ID로 검색
      clan = await prisma.clan.findFirst({
        where: { pubgClanId },
        include: {
          members: {
            select: {
              nickname: true,
              score: true,
              pubgShardId: true,
              lastUpdated: true
            },
            orderBy: { score: 'desc' }
          }
        }
      });

      if (!clan) {
        console.log(`❌ PUBG 클랜 ID ${pubgClanId}를 찾을 수 없습니다.`);
        return;
      }

      members = clan.members;
    }

    // 결과 출력
    console.log(`\n🏛️  클랜 정보:`);
    console.log(`   이름: ${clan.name}`);
    console.log(`   태그: ${clan.pubgClanTag || 'N/A'}`);
    console.log(`   DB ID: ${clan.id}`);
    console.log(`   PUBG ID: ${clan.pubgClanId || 'N/A'}`);
    console.log(`   멤버 수: ${members.length}명\n`);

    console.log(`👥 멤버 목록:`);
    members.forEach((member, index) => {
      console.log(`   ${index + 1}. ${member.nickname} (점수: ${member.score}, 샤드: ${member.pubgShardId || 'N/A'})`);
    });

    console.log(`\n📋 닉네임만 배열로:`);
    const nicknames = members.map(m => m.nickname);
    console.log(JSON.stringify(nicknames, null, 2));

    return {
      clan,
      members,
      nicknames
    };

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// 사용법 및 실행
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`\n📖 사용법:`);
    console.log(`   node scripts/get-clan-members.js [클랜ID]`);
    console.log(`   node scripts/get-clan-members.js pubg:[PUBG클랜ID]`);
    console.log(`\n📝 예시:`);
    console.log(`   node scripts/get-clan-members.js 1`);
    console.log(`   node scripts/get-clan-members.js pubg:clan.eb5c32a3cc484b59981f9c61e9ea2747`);
    
    // 사용 가능한 클랜 목록 보여주기
    const allClans = await prisma.clan.findMany({
      select: {
        id: true,
        name: true,
        pubgClanTag: true,
        memberCount: true,
        pubgClanId: true
      },
      take: 10
    });
    
    if (allClans.length > 0) {
      console.log(`\n📋 사용 가능한 클랜들 (최근 10개):`);
      allClans.forEach(clan => {
        console.log(`   ID ${clan.id}: ${clan.name} (${clan.pubgClanTag || 'No Tag'}) - ${clan.memberCount}명`);
        if (clan.pubgClanId) {
          console.log(`     └ PUBG ID: ${clan.pubgClanId}`);
        }
      });
    }
    
    await prisma.$disconnect();
    return;
  }

  const input = args[0];
  
  if (input.startsWith('pubg:')) {
    // PUBG 클랜 ID로 검색
    const pubgClanId = input.replace('pubg:', '');
    console.log(`🔍 PUBG 클랜 ID로 검색: ${pubgClanId}`);
    await getClanMembers(null, pubgClanId);
  } else {
    // DB 내부 ID로 검색
    const clanId = parseInt(input);
    if (isNaN(clanId)) {
      console.log(`❌ 잘못된 클랜 ID: ${input}`);
      return;
    }
    console.log(`🔍 클랜 ID로 검색: ${clanId}`);
    await getClanMembers(clanId, null);
  }
}

main();
