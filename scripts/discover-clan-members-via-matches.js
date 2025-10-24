// scripts/discover-clan-members-via-matches.js
// 기존 클랜 멤버들의 매치 기록을 통해 새로운 클랜 멤버들을 발견하는 스크립트

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
        timeout: 15000,
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

// 플레이어의 최근 매치 목록 가져오기
async function getPlayerMatches(nickname, shard = 'steam') {
  console.log(`  🎮 ${nickname}의 매치 기록 조회 중...`);

  // 먼저 플레이어 정보 가져오기
  const playerUrl = `https://api.pubg.com/shards/${shard}/players?filter[playerNames]=${nickname}`;
  const playerResult = await safeApiCall(playerUrl);

  if (!playerResult.success || !playerResult.data.data.length) {
    console.log(`    ❌ 플레이어 ${nickname}을 찾을 수 없음`);
    return [];
  }

  const player = playerResult.data.data[0];
  const playerId = player.id;

  // 플레이어의 매치 목록 가져오기
  const matchesUrl = `https://api.pubg.com/shards/${shard}/players/${playerId}/matches`;
  const matchesResult = await safeApiCall(matchesUrl);

  if (!matchesResult.success) {
    console.log(`    ❌ ${nickname}의 매치 목록 조회 실패`);
    return [];
  }

  const matches = matchesResult.data.data || [];
  console.log(`    ✅ ${matches.length}개의 매치 발견`);

  return matches.slice(0, 3); // 최근 3개 매치만 분석
}

// 매치 상세 정보에서 팀원들 찾기
async function getTeammatesFromMatch(matchId, targetNickname, shard = 'steam') {
  console.log(`    🔍 매치 ${matchId} 분석 중...`);

  const matchUrl = `https://api.pubg.com/shards/${shard}/matches/${matchId}`;
  const matchResult = await safeApiCall(matchUrl);

  if (!matchResult.success) {
    console.log(`      ❌ 매치 데이터 조회 실패`);
    return [];
  }

  const matchData = matchResult.data;
  const participants =
    matchData.included?.filter((item) => item.type === 'participant') || [];

  // 타겟 플레이어 찾기
  const targetParticipant = participants.find(
    (p) => p.attributes.stats.name === targetNickname
  );

  if (!targetParticipant) {
    console.log(
      `      ⚠️  타겟 플레이어 ${targetNickname}을 매치에서 찾을 수 없음`
    );
    return [];
  }

  const targetTeamId = targetParticipant.attributes.stats.teamId;

  // 같은 팀의 다른 플레이어들 찾기
  const teammates = participants
    .filter(
      (p) =>
        p.attributes.stats.teamId === targetTeamId &&
        p.attributes.stats.name !== targetNickname
    )
    .map((p) => p.attributes.stats.name);

  console.log(
    `      👥 팀원 ${teammates.length}명 발견: ${teammates.join(', ')}`
  );

  return teammates;
}

// 플레이어가 UBD 클랜 멤버인지 확인
async function checkIfClanMember(nickname, targetClanId, shard = 'steam') {
  const playerUrl = `https://api.pubg.com/shards/${shard}/players?filter[playerNames]=${nickname}`;
  const result = await safeApiCall(playerUrl);

  if (!result.success || !result.data.data.length) {
    return false;
  }

  const player = result.data.data[0];
  return player.attributes.clanId === targetClanId;
}

// 클랜 멤버들을 매치를 통해 발견
async function discoverClanMembersViaMatches(clanId) {
  try {
    console.log(`🎯 클랜 ID ${clanId} 멤버 발견 시작...\n`);

    // 1. DB에서 클랜 정보와 기존 멤버들 조회
    const clan = await prisma.clan.findUnique({
      where: { id: clanId },
      include: {
        members: {
          select: {
            nickname: true,
            pubgPlayerId: true,
          },
          where: {
            pubgPlayerId: { not: null },
          },
          take: 5, // 처음 5명만 사용
        },
      },
    });

    if (!clan) {
      console.log(`❌ 클랜 ID ${clanId}를 찾을 수 없습니다.`);
      return;
    }

    console.log(`📋 클랜 정보: ${clan.name} (${clan.pubgClanTag})`);
    console.log(`🎮 분석할 기존 멤버: ${clan.members.length}명`);
    console.log(`🎯 타겟 PUBG 클랜 ID: ${clan.pubgClanId}\n`);

    const discoveredPlayers = new Set();
    const existingNicknames = new Set(clan.members.map((m) => m.nickname));

    // 2. 각 기존 멤버의 매치 분석
    for (let i = 0; i < clan.members.length; i++) {
      const member = clan.members[i];
      console.log(
        `[${i + 1}/${clan.members.length}] ${member.nickname} 분석 중...`
      );

      // 최근 매치들 가져오기
      const matches = await getPlayerMatches(member.nickname);

      // 각 매치에서 팀원들 찾기
      for (const match of matches) {
        const teammates = await getTeammatesFromMatch(
          match.id,
          member.nickname
        );

        // 팀원들이 UBD 클랜 멤버인지 확인
        for (const teammate of teammates) {
          if (
            existingNicknames.has(teammate) ||
            discoveredPlayers.has(teammate)
          ) {
            continue; // 이미 알고 있는 멤버
          }

          console.log(`      🔍 ${teammate} 클랜 소속 확인 중...`);
          const isClanMember = await checkIfClanMember(
            teammate,
            clan.pubgClanId
          );

          if (isClanMember) {
            console.log(`      ✨ 새 클랜 멤버 발견: ${teammate}`);
            discoveredPlayers.add(teammate);
          } else {
            console.log(`      ➖ 다른 클랜 소속: ${teammate}`);
          }

          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      console.log(''); // 줄바꿈
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // 3. 결과 요약
    console.log(`\n🎉 발견 완료!\n`);
    console.log(`📊 결과 요약:`);
    console.log(`   🔍 분석한 기존 멤버: ${clan.members.length}명`);
    console.log(`   ✨ 새로 발견된 멤버: ${discoveredPlayers.size}명`);

    if (discoveredPlayers.size > 0) {
      console.log(`\n👥 새로 발견된 멤버들:`);
      const newMembers = Array.from(discoveredPlayers);
      newMembers.forEach((nickname, i) => {
        console.log(`   ${i + 1}. ${nickname}`);
      });

      console.log(`\n💡 이 멤버들을 DB에 추가하시겠습니까?`);
      console.log(`   다음 명령어를 실행하세요:`);
      console.log(
        `   node scripts/add-discovered-members.js ${clanId} "${newMembers.join(',')}"`
      );
    } else {
      console.log(`\n💭 새로운 클랜 멤버를 발견하지 못했습니다.`);
      console.log(`   다른 기존 멤버들의 매치를 더 분석하거나,`);
      console.log(`   더 많은 매치 기록을 확인해보세요.`);
    }
  } catch (error) {
    console.error('❌ 발견 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 사용법
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`\n📖 사용법:`);
    console.log(
      `   node scripts/discover-clan-members-via-matches.js [클랜ID]`
    );
    console.log(`\n📝 예시:`);
    console.log(`   node scripts/discover-clan-members-via-matches.js 1`);

    await prisma.$disconnect();
    return;
  }

  const clanId = parseInt(args[0]);
  if (isNaN(clanId)) {
    console.log(`❌ 잘못된 클랜 ID: ${args[0]}`);
    return;
  }

  await discoverClanMembersViaMatches(clanId);
}

main();
