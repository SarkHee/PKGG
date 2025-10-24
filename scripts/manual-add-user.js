// 수동으로 특정 유저를 DB에 추가하는 스크립트
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

async function addUserManually(nickname) {
  try {
    console.log(`🔍 "${nickname}" 유저 수동 추가 시작...`);

    // 1. PUBG API에서 플레이어 정보 검색
    const API_KEY =
      'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';
    const shards = ['steam', 'kakao', 'psn', 'xbox'];

    let playerData = null;
    let clanData = null;
    let foundShard = null;

    for (const shard of shards) {
      try {
        console.log(`   ${shard} 샤드에서 검색 중...`);

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
          playerData = response.data.data[0];
          foundShard = shard;
          console.log(`✅ ${shard}에서 플레이어 발견!`);

          // 클랜 정보도 가져오기
          if (playerData.attributes.clanId) {
            try {
              const clanResponse = await axios.get(
                `https://api.pubg.com/shards/${shard}/clans/${playerData.attributes.clanId}`,
                {
                  headers: {
                    Authorization: API_KEY,
                    Accept: 'application/vnd.api+json',
                  },
                }
              );
              clanData = clanResponse.data.data;
              console.log(
                `🏢 클랜 정보: ${clanData.attributes.clanName} (${clanData.attributes.clanTag})`
              );
            } catch (clanError) {
              console.warn(`⚠️  클랜 정보 가져오기 실패: ${clanError.message}`);
            }
          } else {
            console.log(`🔹 클랜 없는 독립 플레이어`);
          }
          break;
        }
      } catch (error) {
        console.log(`   ❌ ${shard} 실패: ${error.message}`);
      }
    }

    if (!playerData) {
      console.log(`❌ "${nickname}" 플레이어를 찾을 수 없습니다.`);
      return;
    }

    // 2. DB에 저장
    console.log(`💾 DB에 저장 중...`);

    let targetClan = null;

    // 클랜이 있는 경우 클랜 먼저 처리
    if (clanData) {
      const existingClan = await prisma.clan.findFirst({
        where: { pubgClanId: playerData.attributes.clanId },
      });

      if (existingClan) {
        console.log(`   기존 클랜 사용: ${existingClan.name}`);
        targetClan = existingClan;
      } else {
        console.log(`   새 클랜 생성: ${clanData.attributes.clanName}`);
        targetClan = await prisma.clan.create({
          data: {
            name: clanData.attributes.clanName,
            leader: playerData.attributes.name,
            description: `Auto-discovered clan: ${clanData.attributes.clanName}`,
            announcement: null,
            memberCount: 1,
            avgScore: 0,
            mainStyle: 'Unknown',
            pubgClanId: playerData.attributes.clanId,
            pubgClanTag: clanData.attributes.clanTag,
            pubgClanLevel: clanData.attributes.clanLevel,
            pubgMemberCount: clanData.attributes.clanMemberCount,
            lastSynced: new Date(),
          },
        });
      }
    }

    // 플레이어 추가
    const existingMember = await prisma.clanMember.findFirst({
      where: {
        nickname: playerData.attributes.name,
        pubgPlayerId: playerData.id,
      },
    });

    if (existingMember) {
      console.log(`⚠️  플레이어 "${nickname}"은 이미 DB에 있습니다.`);
    } else {
      await prisma.clanMember.create({
        data: {
          nickname: playerData.attributes.name,
          score: 0,
          style: 'Unknown',
          avgDamage: 0.0,
          avgKills: 0.0,
          avgAssists: 0.0,
          avgSurviveTime: 0.0,
          winRate: 0.0,
          top10Rate: 0.0,
          clanId: targetClan?.id || null,
          pubgClanId: playerData.attributes.clanId || null,
          pubgPlayerId: playerData.id,
          pubgShardId: foundShard,
          lastUpdated: new Date(),
        },
      });

      console.log(`🎉 플레이어 "${nickname}" 성공적으로 추가됨!`);

      // 클랜 멤버 수 업데이트
      if (targetClan) {
        const memberCount = await prisma.clanMember.count({
          where: { clanId: targetClan.id },
        });

        await prisma.clan.update({
          where: { id: targetClan.id },
          data: { memberCount },
        });

        console.log(`📊 클랜 멤버 수 업데이트: ${memberCount}명`);
      }
    }
  } catch (error) {
    console.error('수동 추가 오류:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// 실행
const nickname = process.argv[2] || 'brz_rixsa';
addUserManually(nickname);
