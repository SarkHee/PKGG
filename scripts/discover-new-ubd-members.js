// scripts/discover-new-ubd-members.js
// UBD 클랜의 새로운 멤버 발견 및 추가

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const API_KEY =
  'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';
const UBD_CLAN_ID = 'clan.eb5c32a3cc484b59981f9c61e9ea2747';
const SHARD = 'steam';

// 안전한 API 호출
async function safeApiCall(url, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // API 요청 간격
      await new Promise((resolve) => setTimeout(resolve, 800));

      const response = await axios.get(url, {
        headers: {
          Authorization: API_KEY,
          Accept: 'application/vnd.api+json',
        },
        timeout: 15000,
      });

      return { success: true, data: response.data };
    } catch (error) {
      if (error.response?.status === 429) {
        const waitTime = Math.pow(2, attempt) * 2000;
        console.log(
          `    ⏳ Rate limit (시도 ${attempt + 1}/${maxRetries}), ${waitTime / 1000}초 대기...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      } else if (error.response?.status === 404) {
        return { success: false, error: 'NOT_FOUND' };
      } else {
        return { success: false, error: error.response?.status || 'UNKNOWN' };
      }
    }
  }

  return { success: false, error: 'MAX_RETRIES_EXCEEDED' };
}

// 클랜 멤버 목록 가져오기 (새로운 API 엔드포인트 사용)
async function getClanMembers(clanId, shard) {
  const url = `https://api.pubg.com/shards/${shard}/clans/${clanId}/members`;
  const result = await safeApiCall(url);

  if (result.success) {
    return result.data.data || [];
  }

  console.error(`클랜 멤버 목록 가져오기 실패: ${result.error}`);
  return [];
}

// 플레이어 상세 정보 가져오기
async function getPlayerDetails(playerId, shard) {
  const url = `https://api.pubg.com/shards/${shard}/players/${playerId}`;
  const result = await safeApiCall(url);

  if (result.success) {
    return result.data.data;
  }

  return null;
}

async function discoverNewUbdMembers() {
  console.log('🔍 UBD 클랜 새 멤버 발견 시작...\n');
  console.log(`🎯 타겟 클랜 ID: ${UBD_CLAN_ID}`);
  console.log(`🌍 샤드: ${SHARD}\n`);

  try {
    // 1. PUBG API에서 클랜 멤버 목록 가져오기
    console.log('📋 PUBG API에서 클랜 멤버 목록 가져오는 중...');
    const pubgMembers = await getClanMembers(UBD_CLAN_ID, SHARD);

    if (pubgMembers.length === 0) {
      console.error('❌ 클랜 멤버 목록을 가져올 수 없습니다.');
      return;
    }

    console.log(`✅ PUBG API에서 ${pubgMembers.length}명의 클랜 멤버 발견\n`);

    // 2. 현재 DB에 저장된 UBD 클랜 멤버들
    const dbMembers = await prisma.clanMember.findMany({
      where: { pubgClanId: UBD_CLAN_ID },
      select: { pubgPlayerId: true, nickname: true },
    });

    const dbPlayerIds = new Set(
      dbMembers.map((m) => m.pubgPlayerId).filter(Boolean)
    );
    console.log(`🗃️  DB에 저장된 UBD 멤버: ${dbMembers.length}명`);
    console.log(`📊 PUBG 플레이어 ID가 있는 멤버: ${dbPlayerIds.size}명\n`);

    // 3. 새로운 멤버 찾기
    const newMembers = pubgMembers.filter(
      (member) => !dbPlayerIds.has(member.id)
    );

    console.log(`🆕 새로 발견된 멤버: ${newMembers.length}명`);

    if (newMembers.length === 0) {
      console.log('✅ 모든 클랜 멤버가 이미 DB에 등록되어 있습니다.');
      return;
    }

    const results = {
      added: [],
      failed: [],
      errors: [],
    };

    // 4. 새 멤버들의 상세 정보 가져오기 및 DB 추가
    console.log(
      `\n👥 새 멤버 ${Math.min(newMembers.length, 15)}명 처리 중...\n`
    ); // 처음 15명만

    for (let i = 0; i < Math.min(newMembers.length, 15); i++) {
      const member = newMembers[i];
      console.log(`[${i + 1}/15] 플레이어 ID: ${member.id} 처리 중...`);

      const playerDetails = await getPlayerDetails(member.id, SHARD);

      if (playerDetails) {
        const nickname = playerDetails.attributes.name;
        console.log(`  📝 닉네임: ${nickname}`);

        try {
          // UBD 클랜 정보 가져오기
          const ubdClan = await prisma.clan.findFirst({
            where: { pubgClanId: UBD_CLAN_ID },
          });

          if (!ubdClan) {
            console.log(`  ❌ UBD 클랜을 DB에서 찾을 수 없습니다.`);
            continue;
          }

          // 새 클랜 멤버 추가
          await prisma.clanMember.create({
            data: {
              clanId: ubdClan.id,
              nickname: nickname,
              pubgPlayerId: member.id,
              pubgClanId: UBD_CLAN_ID,
              pubgShardId: SHARD,
              kills: 0,
              deaths: 0,
              assists: 0,
              damage: 0,
              wins: 0,
              top10s: 0,
              matches: 0,
              lastUpdated: new Date(),
            },
          });

          console.log(`  ✅ DB에 추가됨: ${nickname}`);
          results.added.push({ nickname, playerId: member.id });
        } catch (dbError) {
          console.log(`  ❌ DB 추가 실패: ${dbError.message}`);
          results.failed.push({ playerId: member.id, reason: dbError.message });
        }
      } else {
        console.log(`  ❌ 플레이어 상세 정보 가져오기 실패`);
        results.failed.push({
          playerId: member.id,
          reason: '플레이어 정보 없음',
        });
      }
    }

    // 5. 결과 요약
    console.log('\n🎉 새 멤버 발견 완료!\n');
    console.log('📈 결과 요약:');
    console.log(`  - PUBG 클랜 총 멤버수: ${pubgMembers.length}명`);
    console.log(`  - 기존 DB 멤버: ${dbMembers.length}명`);
    console.log(`  - 새로 발견된 멤버: ${newMembers.length}명`);
    console.log(`  - 처리한 새 멤버: ${Math.min(newMembers.length, 15)}명`);
    console.log(`  - 성공적으로 추가: ${results.added.length}명`);
    console.log(`  - 추가 실패: ${results.failed.length}명`);

    if (results.added.length > 0) {
      console.log('\n✅ 새로 추가된 멤버들:');
      results.added.forEach((member, index) => {
        console.log(`  ${index + 1}. ${member.nickname} (${member.playerId})`);
      });
    }

    if (results.failed.length > 0) {
      console.log('\n❌ 추가 실패한 멤버들:');
      results.failed.forEach((member, index) => {
        console.log(`  ${index + 1}. ${member.playerId} - ${member.reason}`);
      });
    }

    const totalDbMembers = dbMembers.length + results.added.length;
    const coverage = ((totalDbMembers / pubgMembers.length) * 100).toFixed(1);
    console.log(
      `\n📊 총 커버리지: ${totalDbMembers}/${pubgMembers.length} (${coverage}%)`
    );

    if (newMembers.length > 15) {
      console.log(`\n💡 ${newMembers.length - 15}명의 새 멤버가 더 있습니다.`);
      console.log(`   전체 처리를 원하면 스크립트의 제한을 제거하세요.`);
    }
  } catch (error) {
    console.error('💥 새 멤버 발견 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 실행
discoverNewUbdMembers();
