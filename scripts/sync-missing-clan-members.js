// scripts/sync-missing-clan-members.js
// 클랜의 누락된 멤버들을 PUBG API에서 찾아서 DB에 추가하는 스크립트

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const API_KEY =
  'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';

// 안전한 API 호출
async function safeApiCall(url, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: API_KEY,
          Accept: 'application/vnd.api+json',
        },
        timeout: 10000,
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.log(
        `    ⚠️  API 호출 실패 (시도 ${attempt}/${maxRetries}): ${error.message}`
      );
      if (attempt === maxRetries) {
        return { success: false, error: error.message };
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// PUBG API에서 클랜 멤버 목록 가져오기
async function getClanMembersFromPubg(pubgClanId, shard = 'steam') {
  console.log(`🔍 PUBG API에서 클랜 멤버 목록 조회 중...`);
  console.log(`   클랜 ID: ${pubgClanId}`);
  console.log(`   샤드: ${shard}`);

  const url = `https://api.pubg.com/shards/${shard}/clans/${pubgClanId}/members`;
  const result = await safeApiCall(url);

  if (result.success) {
    console.log(`✅ PUBG API 응답 성공: ${result.data.data.length}명 발견`);
    return result.data.data || [];
  } else {
    console.error(`❌ PUBG API 호출 실패: ${result.error}`);
    return [];
  }
}

// 플레이어 상세 정보 가져오기
async function getPlayerDetails(playerId, shard = 'steam') {
  const url = `https://api.pubg.com/shards/${shard}/players/${playerId}`;
  const result = await safeApiCall(url);

  if (result.success) {
    return result.data.data;
  }
  return null;
}

// 누락된 멤버들을 찾아서 DB에 추가
async function syncMissingClanMembers(clanId, pubgClanId) {
  try {
    console.log(`🎯 클랜 ID ${clanId} (PUBG: ${pubgClanId}) 동기화 시작...\n`);

    // 1. DB에서 클랜 정보 조회
    const clan = await prisma.clan.findUnique({
      where: { id: clanId },
      include: {
        members: {
          select: {
            id: true,
            nickname: true,
            pubgPlayerId: true,
          },
        },
      },
    });

    if (!clan) {
      console.log(`❌ 클랜 ID ${clanId}를 찾을 수 없습니다.`);
      return;
    }

    console.log(`📋 DB 클랜 정보:`);
    console.log(`   이름: ${clan.name}`);
    console.log(`   현재 DB 멤버 수: ${clan.members.length}명`);
    console.log(`   PUBG 멤버 수: ${clan.pubgMemberCount}명`);
    console.log(
      `   누락 예상: ${clan.pubgMemberCount - clan.members.length}명\n`
    );

    // 2. PUBG API에서 전체 멤버 목록 가져오기
    const pubgMembers = await getClanMembersFromPubg(pubgClanId);

    if (pubgMembers.length === 0) {
      console.log(`❌ PUBG API에서 멤버를 가져올 수 없습니다.`);
      return;
    }

    console.log(`\n📊 비교 분석:`);
    console.log(`   PUBG API 멤버: ${pubgMembers.length}명`);
    console.log(`   DB 멤버: ${clan.members.length}명`);

    // 3. DB에 이미 있는 플레이어 ID들 수집
    const existingPlayerIds = new Set(
      clan.members.map((m) => m.pubgPlayerId).filter(Boolean)
    );

    console.log(`   PUBG ID가 있는 DB 멤버: ${existingPlayerIds.size}명\n`);

    // 4. 누락된 멤버들 찾기
    const missingMembers = pubgMembers.filter(
      (member) => !existingPlayerIds.has(member.id)
    );

    console.log(`🔍 누락된 멤버 분석:`);
    console.log(`   누락된 멤버: ${missingMembers.length}명\n`);

    if (missingMembers.length === 0) {
      console.log(`✅ 모든 멤버가 이미 DB에 존재합니다!`);
      return;
    }

    // 5. 누락된 멤버들을 하나씩 처리
    const results = {
      added: [],
      failed: [],
      skipped: [],
    };

    console.log(`🚀 누락된 멤버들을 DB에 추가 중...\n`);

    for (let i = 0; i < missingMembers.length; i++) {
      const member = missingMembers[i];
      console.log(
        `[${i + 1}/${missingMembers.length}] 플레이어 ID: ${member.id} 처리 중...`
      );

      // 플레이어 상세 정보 가져오기
      const playerDetails = await getPlayerDetails(member.id);

      if (!playerDetails) {
        console.log(`  ❌ 플레이어 상세 정보 가져오기 실패`);
        results.failed.push({ playerId: member.id, reason: 'API 호출 실패' });
        continue;
      }

      const nickname = playerDetails.attributes.name;
      console.log(`  📝 닉네임: ${nickname}`);

      // 이미 같은 닉네임이 DB에 있는지 확인
      const existingByNickname = await prisma.clanMember.findFirst({
        where: {
          nickname: nickname,
          clanId: clanId,
        },
      });

      if (existingByNickname) {
        console.log(`  ⚠️  같은 닉네임이 이미 존재함 - PUBG ID 업데이트`);

        // PUBG ID만 업데이트
        await prisma.clanMember.update({
          where: { id: existingByNickname.id },
          data: {
            pubgPlayerId: playerDetails.id,
            pubgClanId: pubgClanId,
            pubgShardId: 'steam',
            lastUpdated: new Date(),
          },
        });

        results.skipped.push({ nickname, reason: '기존 멤버 업데이트' });
        continue;
      }

      // 새 멤버 추가
      try {
        await prisma.clanMember.create({
          data: {
            clanId: clanId,
            nickname: nickname,
            score: 0,
            style: 'Unknown',
            avgDamage: 0.0,
            avgKills: 0.0,
            avgAssists: 0.0,
            avgSurviveTime: 0.0,
            winRate: 0.0,
            top10Rate: 0.0,
            pubgClanId: pubgClanId,
            pubgPlayerId: playerDetails.id,
            pubgShardId: 'steam',
            lastUpdated: new Date(),
          },
        });

        console.log(`  ✅ 새 멤버 추가 완료`);
        results.added.push({ nickname, playerId: playerDetails.id });
      } catch (dbError) {
        console.log(`  ❌ DB 추가 실패: ${dbError.message}`);
        results.failed.push({
          nickname,
          playerId: playerDetails.id,
          reason: dbError.message,
        });
      }

      // API 요청 제한 방지
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // 6. 클랜 멤버 수 업데이트
    const updatedMemberCount = await prisma.clanMember.count({
      where: { clanId: clanId },
    });

    await prisma.clan.update({
      where: { id: clanId },
      data: {
        memberCount: updatedMemberCount,
        lastSynced: new Date(),
      },
    });

    // 7. 결과 요약
    console.log(`\n🎉 동기화 완료!\n`);
    console.log(`📈 결과 요약:`);
    console.log(`   ✅ 새로 추가된 멤버: ${results.added.length}명`);
    console.log(`   ↻ 업데이트된 기존 멤버: ${results.skipped.length}명`);
    console.log(`   ❌ 실패: ${results.failed.length}명`);
    console.log(`   📊 최종 DB 멤버 수: ${updatedMemberCount}명`);

    if (results.added.length > 0) {
      console.log(`\n✨ 새로 추가된 멤버들:`);
      results.added.forEach((member, i) => {
        console.log(`   ${i + 1}. ${member.nickname}`);
      });
    }

    if (results.failed.length > 0) {
      console.log(`\n⚠️  실패한 멤버들:`);
      results.failed.forEach((member, i) => {
        console.log(
          `   ${i + 1}. ${member.nickname || member.playerId} - ${member.reason}`
        );
      });
    }
  } catch (error) {
    console.error('❌ 동기화 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 사용법 및 실행
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`\n📖 사용법:`);
    console.log(
      `   node scripts/sync-missing-clan-members.js [클랜DB_ID] [PUBG_클랜_ID]`
    );
    console.log(`\n📝 예시:`);
    console.log(
      `   node scripts/sync-missing-clan-members.js 1 clan.eb5c32a3cc484b59981f9c61e9ea2747`
    );

    // 사용 가능한 클랜 목록 보여주기
    const clans = await prisma.clan.findMany({
      select: {
        id: true,
        name: true,
        pubgClanId: true,
        pubgMemberCount: true,
        memberCount: true,
      },
      take: 5,
    });

    if (clans.length > 0) {
      console.log(`\n📋 사용 가능한 클랜들:`);
      clans.forEach((clan) => {
        const missing = (clan.pubgMemberCount || 0) - (clan.memberCount || 0);
        console.log(`   ID ${clan.id}: ${clan.name}`);
        console.log(`     └ PUBG ID: ${clan.pubgClanId}`);
        console.log(
          `     └ PUBG 멤버: ${clan.pubgMemberCount}명, DB 멤버: ${clan.memberCount}명 (누락: ${missing}명)`
        );
      });
    }

    await prisma.$disconnect();
    return;
  }

  const clanId = parseInt(args[0]);
  const pubgClanId = args[1];

  if (isNaN(clanId)) {
    console.log(`❌ 잘못된 클랜 ID: ${args[0]}`);
    return;
  }

  console.log(`🎯 동기화 시작:`);
  console.log(`   클랜 DB ID: ${clanId}`);
  console.log(`   PUBG 클랜 ID: ${pubgClanId}\n`);

  await syncMissingClanMembers(clanId, pubgClanId);
}

main();
