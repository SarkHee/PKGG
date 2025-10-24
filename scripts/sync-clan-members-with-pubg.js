// scripts/sync-clan-members-with-pubg.js
// 기존 데이터베이스의 멤버들을 PUBG API와 동기화하는 스크립트

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const API_KEY =
  'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';
const shards = ['steam', 'kakao', 'psn', 'xbox'];

async function findPlayerInPubgApi(nickname) {
  for (const shard of shards) {
    try {
      const response = await axios.get(
        `https://api.pubg.com/shards/${shard}/players?filter[playerNames]=${nickname}`,
        {
          headers: {
            Authorization: API_KEY,
            Accept: 'application/vnd.api+json',
          },
        }
      );

      if (response.data.data.length > 0) {
        const player = response.data.data[0];
        return {
          player,
          shard,
          found: true,
        };
      }
    } catch (error) {
      console.warn(`${nickname}: ${shard} 샤드 확인 실패`);
    }
  }

  return { found: false };
}

async function getClanInfo(clanId, shard) {
  try {
    const response = await axios.get(
      `https://api.pubg.com/shards/${shard}/clans/${clanId}`,
      {
        headers: {
          Authorization: API_KEY,
          Accept: 'application/vnd.api+json',
        },
      }
    );
    return response.data.data;
  } catch (error) {
    console.warn(`클랜 정보 가져오기 실패: ${clanId}`);
    return null;
  }
}

async function syncClanMembers() {
  console.log('🚀 PUBG API와 클랜 멤버 동기화 시작...\n');

  try {
    // 1. pubgClanId가 없는 모든 멤버들 가져오기
    const membersToUpdate = await prisma.clanMember.findMany({
      where: {
        OR: [{ pubgClanId: null }, { pubgPlayerId: null }],
      },
      include: {
        clan: true,
      },
    });

    console.log(`📋 업데이트할 멤버 수: ${membersToUpdate.length}\n`);

    const clanUpdates = new Map(); // 클랜별 업데이트 정보 저장
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < membersToUpdate.length; i++) {
      const member = membersToUpdate[i];
      console.log(
        `[${i + 1}/${membersToUpdate.length}] ${member.nickname} 확인 중...`
      );

      try {
        const result = await findPlayerInPubgApi(member.nickname);

        if (result.found) {
          const { player, shard } = result;

          // ClanMember 업데이트
          await prisma.clanMember.update({
            where: { id: member.id },
            data: {
              pubgClanId: player.attributes.clanId,
              pubgPlayerId: player.id,
              pubgShardId: shard,
              lastUpdated: new Date(),
            },
          });

          console.log(`  ✅ 업데이트 완료: ${member.nickname}`);
          console.log(`     - PUBG Player ID: ${player.id}`);
          console.log(`     - Shard: ${shard}`);
          console.log(`     - Clan ID: ${player.attributes.clanId || '없음'}`);

          // 클랜 정보 수집
          if (
            player.attributes.clanId &&
            !clanUpdates.has(player.attributes.clanId)
          ) {
            const clanInfo = await getClanInfo(player.attributes.clanId, shard);
            if (clanInfo) {
              clanUpdates.set(player.attributes.clanId, {
                clanInfo,
                shard,
                members: [],
              });
            }
          }

          // 멤버를 클랜에 추가
          if (
            player.attributes.clanId &&
            clanUpdates.has(player.attributes.clanId)
          ) {
            clanUpdates
              .get(player.attributes.clanId)
              .members.push(member.nickname);
          }

          successCount++;
        } else {
          console.log(`  ❌ PUBG API에서 찾을 수 없음: ${member.nickname}`);
          failCount++;
        }

        // API 요청 제한을 피하기 위해 잠시 대기
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`  💥 ${member.nickname} 처리 중 오류:`, error.message);
        failCount++;
      }

      console.log(''); // 빈 줄 추가
    }

    // 2. 클랜 정보 업데이트
    console.log('📊 클랜 정보 업데이트 중...\n');

    for (const [clanId, clanData] of clanUpdates) {
      try {
        // 기존 클랜에 PUBG 정보 추가하거나 새 클랜 생성
        const existingClan = await prisma.clan.findFirst({
          where: { pubgClanId: clanId },
        });

        if (existingClan) {
          await prisma.clan.update({
            where: { id: existingClan.id },
            data: {
              pubgClanTag: clanData.clanInfo.attributes.clanTag,
              pubgClanLevel: clanData.clanInfo.attributes.clanLevel,
              pubgMemberCount: clanData.clanInfo.attributes.clanMemberCount,
              lastSynced: new Date(),
            },
          });
          console.log(
            `  ✅ 기존 클랜 업데이트: ${clanData.clanInfo.attributes.clanName}`
          );
        } else {
          // 새 클랜 생성은 여기서는 하지 않고 수동으로 처리
          console.log(
            `  ℹ️  새 클랜 발견 (수동 처리 필요): ${clanData.clanInfo.attributes.clanName} (${clanId})`
          );
        }

        console.log(`     - 멤버들: ${clanData.members.join(', ')}`);
      } catch (error) {
        console.error(`클랜 업데이트 실패 ${clanId}:`, error.message);
      }
    }

    // 3. 결과 요약
    console.log('\n🎉 동기화 완료!\n');
    console.log('📈 결과 요약:');
    console.log(`  - 성공: ${successCount}명`);
    console.log(`  - 실패: ${failCount}명`);
    console.log(`  - 발견된 클랜: ${clanUpdates.size}개`);

    if (clanUpdates.size > 0) {
      console.log('\n🏆 클랜별 멤버 현황:');
      for (const [clanId, clanData] of clanUpdates) {
        console.log(
          `  - ${clanData.clanInfo.attributes.clanName} (${clanData.clanInfo.attributes.clanTag}): ${clanData.members.length}명`
        );
        console.log(`    멤버: ${clanData.members.join(', ')}`);
      }
    }
  } catch (error) {
    console.error('💥 동기화 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  syncClanMembers();
}

export { syncClanMembers };
