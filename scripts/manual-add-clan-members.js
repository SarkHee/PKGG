// scripts/manual-add-clan-members.js
// 수동으로 클랜 멤버 닉네임을 입력하여 DB에 추가하는 스크립트

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';

// 안전한 API 호출
async function safeApiCall(url, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: API_KEY,
          Accept: 'application/vnd.api+json',
        },
        timeout: 10000
      });
      return { success: true, data: response.data };
    } catch (error) {
      if (attempt === maxRetries) {
        return { success: false, error: error.message };
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// 플레이어 정보 확인 및 클랜 소속 검증
async function verifyAndAddPlayer(nickname, targetClanId, clanDbId, shard = 'steam') {
  console.log(`🔍 ${nickname} 검증 중...`);

  // 1. 플레이어 정보 조회
  const playerUrl = `https://api.pubg.com/shards/${shard}/players?filter[playerNames]=${nickname}`;
  const result = await safeApiCall(playerUrl);

  if (!result.success) {
    console.log(`  ❌ API 호출 실패: ${result.error}`);
    return { success: false, reason: 'API 호출 실패' };
  }

  if (!result.data.data.length) {
    console.log(`  ❌ 플레이어를 찾을 수 없음`);
    return { success: false, reason: '플레이어 없음' };
  }

  const player = result.data.data[0];
  const actualNickname = player.attributes.name;
  const playerClanId = player.attributes.clanId;

  console.log(`  📝 실제 닉네임: ${actualNickname}`);
  console.log(`  🏛️  플레이어 클랜 ID: ${playerClanId || '없음'}`);

  // 2. 클랜 소속 확인
  if (playerClanId !== targetClanId) {
    console.log(`  ⚠️  다른 클랜 소속 또는 클랜 없음`);
    return { success: false, reason: '클랜 불일치', actualClan: playerClanId };
  }

  console.log(`  ✅ UBD 클랜 멤버 확인됨`);

  // 3. DB에 이미 존재하는지 확인
  const existing = await prisma.clanMember.findFirst({
    where: {
      OR: [
        { nickname: actualNickname, clanId: clanDbId },
        { pubgPlayerId: player.id }
      ]
    }
  });

  if (existing) {
    console.log(`  ↻ 이미 DB에 존재함 - 정보 업데이트`);
    
    await prisma.clanMember.update({
      where: { id: existing.id },
      data: {
        nickname: actualNickname,
        pubgPlayerId: player.id,
        pubgClanId: targetClanId,
        pubgShardId: shard,
        lastUpdated: new Date()
      }
    });

    return { success: true, action: '업데이트', nickname: actualNickname };
  }

  // 4. 새 멤버 추가
  try {
    await prisma.clanMember.create({
      data: {
        clanId: clanDbId,
        nickname: actualNickname,
        score: 0,
        style: 'Unknown',
        avgDamage: 0.0,
        avgKills: 0.0,
        avgAssists: 0.0,
        avgSurviveTime: 0.0,
        winRate: 0.0,
        top10Rate: 0.0,
        pubgClanId: targetClanId,
        pubgPlayerId: player.id,
        pubgShardId: shard,
        lastUpdated: new Date()
      }
    });

    console.log(`  ✨ 새 멤버로 추가 완료`);
    return { success: true, action: '추가', nickname: actualNickname };

  } catch (dbError) {
    console.log(`  ❌ DB 추가 실패: ${dbError.message}`);
    return { success: false, reason: 'DB 오류', error: dbError.message };
  }
}

// 수동으로 클랜 멤버들 추가
async function manualAddClanMembers(clanId, nicknames) {
  try {
    console.log(`🎯 클랜 ID ${clanId}에 멤버 추가 시작...\n`);

    // 1. 클랜 정보 확인
    const clan = await prisma.clan.findUnique({
      where: { id: clanId },
      select: {
        id: true,
        name: true,
        pubgClanId: true,
        pubgClanTag: true,
        memberCount: true
      }
    });

    if (!clan) {
      console.log(`❌ 클랜 ID ${clanId}를 찾을 수 없습니다.`);
      return;
    }

    console.log(`📋 클랜 정보:`);
    console.log(`   이름: ${clan.name} (${clan.pubgClanTag})`);
    console.log(`   현재 DB 멤버 수: ${clan.memberCount}명`);
    console.log(`   PUBG 클랜 ID: ${clan.pubgClanId}`);
    console.log(`   추가할 닉네임: ${nicknames.length}개\n`);

    // 2. 각 닉네임 처리
    const results = {
      added: [],
      updated: [],
      failed: [],
      wrongClan: []
    };

    for (let i = 0; i < nicknames.length; i++) {
      const nickname = nicknames[i].trim();
      if (!nickname) continue;

      console.log(`[${i + 1}/${nicknames.length}] ${nickname} 처리 중...`);

      const result = await verifyAndAddPlayer(
        nickname,
        clan.pubgClanId,
        clan.id
      );

      if (result.success) {
        if (result.action === '추가') {
          results.added.push(result.nickname);
        } else {
          results.updated.push(result.nickname);
        }
      } else {
        if (result.reason === '클랜 불일치') {
          results.wrongClan.push({ nickname, actualClan: result.actualClan });
        } else {
          results.failed.push({ nickname, reason: result.reason });
        }
      }

      console.log('');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 3. 클랜 멤버 수 업데이트
    const updatedMemberCount = await prisma.clanMember.count({
      where: { clanId: clan.id }
    });

    await prisma.clan.update({
      where: { id: clan.id },
      data: { 
        memberCount: updatedMemberCount,
        lastSynced: new Date()
      }
    });

    // 4. 결과 요약
    console.log(`🎉 처리 완료!\n`);
    console.log(`📈 결과 요약:`);
    console.log(`   ✅ 새로 추가: ${results.added.length}명`);
    console.log(`   ↻ 정보 업데이트: ${results.updated.length}명`);
    console.log(`   ⚠️  다른 클랜 소속: ${results.wrongClan.length}명`);
    console.log(`   ❌ 실패: ${results.failed.length}명`);
    console.log(`   📊 최종 DB 멤버 수: ${updatedMemberCount}명`);

    if (results.added.length > 0) {
      console.log(`\n✨ 새로 추가된 멤버들:`);
      results.added.forEach((name, i) => {
        console.log(`   ${i + 1}. ${name}`);
      });
    }

    if (results.wrongClan.length > 0) {
      console.log(`\n⚠️  다른 클랜 소속 멤버들:`);
      results.wrongClan.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.nickname} (클랜: ${item.actualClan || '없음'})`);
      });
    }

    if (results.failed.length > 0) {
      console.log(`\n❌ 처리 실패:`);
      results.failed.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.nickname} - ${item.reason}`);
      });
    }

  } catch (error) {
    console.error('❌ 처리 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 사용법
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`\n📖 사용법:`);
    console.log(`   node scripts/manual-add-clan-members.js [클랜ID] "닉네임1,닉네임2,닉네임3"`);
    console.log(`   또는`);
    console.log(`   node scripts/manual-add-clan-members.js [클랜ID] 닉네임1 닉네임2 닉네임3`);
    console.log(`\n📝 예시:`);
    console.log(`   node scripts/manual-add-clan-members.js 1 "새멤버1,새멤버2,새멤버3"`);
    console.log(`   node scripts/manual-add-clan-members.js 1 새멤버1 새멤버2 새멤버3`);
    
    // 현재 클랜 정보 표시
    const clans = await prisma.clan.findMany({
      select: {
        id: true,
        name: true,
        pubgClanTag: true,
        memberCount: true,
        pubgMemberCount: true
      },
      take: 5
    });

    if (clans.length > 0) {
      console.log(`\n📋 사용 가능한 클랜들:`);
      clans.forEach(clan => {
        const missing = (clan.pubgMemberCount || 0) - (clan.memberCount || 0);
        console.log(`   ID ${clan.id}: ${clan.name} (${clan.pubgClanTag}) - DB: ${clan.memberCount}명, PUBG: ${clan.pubgMemberCount}명, 누락: ${missing}명`);
      });
    }

    await prisma.$disconnect();
    return;
  }

  const clanId = parseInt(args[0]);
  if (isNaN(clanId)) {
    console.log(`❌ 잘못된 클랜 ID: ${args[0]}`);
    return;
  }

  // 닉네임 파싱
  let nicknames = [];
  if (args[1].includes(',')) {
    // 쉼표로 구분된 경우
    nicknames = args[1].split(',').map(n => n.trim()).filter(n => n);
  } else {
    // 공백으로 구분된 경우
    nicknames = args.slice(1);
  }

  if (nicknames.length === 0) {
    console.log(`❌ 추가할 닉네임이 없습니다.`);
    return;
  }

  console.log(`🎯 처리할 닉네임들: ${nicknames.join(', ')}\n`);

  await manualAddClanMembers(clanId, nicknames);
}

main();
