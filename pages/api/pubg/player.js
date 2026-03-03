import axios from 'axios';
import { PrismaClient } from '@prisma/client';

// Prisma 클라이언트 싱글톤 패턴 (개발 중 HMR으로 인한 중복 인스턴스 생성 방지)
let prisma;
if (!globalThis.__prismaPlayer) {
  globalThis.__prismaPlayer = new PrismaClient();
}
prisma = globalThis.__prismaPlayer;

export default async function handler(req, res) {
  const { nickname } = req.query;
  const API_KEY =
    'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';
  const shards = ['steam', 'kakao', 'psn', 'xbox'];

  console.log(`🔍 플레이어 검색 시작: ${nickname}`);

  try {
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
          let clanInfo = null;

          // 플레이어에 clanId가 있으면 클랜 정보도 가져오기
          if (player.attributes.clanId) {
            try {
              const clanResponse = await axios.get(
                `https://api.pubg.com/shards/${shard}/clans/${player.attributes.clanId}`,
                {
                  headers: {
                    Authorization: API_KEY,
                    Accept: 'application/vnd.api+json',
                  },
                }
              );
              clanInfo = clanResponse.data.data;

              // 🆕 자동 저장 기능: 클랜과 멤버 정보를 DB에 저장/업데이트
              const discoveryResult = await saveOrUpdateClanAndMember(
                player,
                clanInfo,
                shard
              );

              // 발견 결과 로깅
              if (discoveryResult.newClan || discoveryResult.newMember) {
                console.log(
                  `🔍 자동 발견 완료 - 플레이어: ${player.attributes.name}`
                );
                if (discoveryResult.newClan)
                  console.log(
                    `   ✨ 새 클랜: ${clanInfo.attributes.clanName} (${clanInfo.attributes.clanTag})`
                  );
                if (discoveryResult.newMember)
                  console.log(
                    `   ✨ 새 멤버: ${player.attributes.name} → ${clanInfo.attributes.clanName}`
                  );
                console.log(
                  `   📊 현재 DB 상태: ${discoveryResult.totalClans}개 클랜, ${discoveryResult.totalMembers}명 멤버`
                );
              }
            } catch (clanError) {
              console.warn(
                `Failed to fetch clan info for ${player.attributes.clanId}`
              );
            }
          } else {
            // 클랜이 없는 플레이어도 독립 멤버로 저장
            console.log(
              `🔍 클랜 없는 플레이어 발견: ${player.attributes.name}`
            );
            const discoveryResult = await saveOrUpdateIndependentPlayer(
              player,
              shard
            );

            if (discoveryResult.newMember) {
              console.log(`   ✨ 새 독립 멤버: ${player.attributes.name}`);
              console.log(
                `   📊 현재 DB 상태: ${discoveryResult.totalClans}개 클랜, ${discoveryResult.totalMembers}명 멤버`
              );
            }
          }

          return res.status(200).json({
            player: player,
            shardId: shard,
            clan: clanInfo,
          });
        }
      } catch (error) {
        console.warn(`❌ ${shard} 샤드에서 실패: ${error.message}`);
      }
    }

    console.log(`❌ 플레이어 '${nickname}'을 모든 샤드에서 찾을 수 없음`);
    return res.status(404).json({ error: 'Player not found' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// 클랜과 멤버 정보를 DB에 저장/업데이트하는 함수
async function saveOrUpdateClanAndMember(player, clanInfo, shard) {
  let newClan = false;
  let newMember = false;

  try {
    // 1. 클랜 DB 처리
    const existingClan = await prisma.clan.findFirst({
      where: { pubgClanId: player.attributes.clanId },
    });

    let targetClan;
    if (existingClan) {
      // 기존 클랜 업데이트
      targetClan = await prisma.clan.update({
        where: { id: existingClan.id },
        data: {
          pubgClanTag: clanInfo.attributes.clanTag,
          pubgClanLevel: clanInfo.attributes.clanLevel,
          pubgMemberCount: clanInfo.attributes.clanMemberCount,
          lastSynced: new Date(),
        },
      });
    } else {
      // 새 클랜 생성
      targetClan = await prisma.clan.create({
        data: {
          name: clanInfo.attributes.clanName,
          leader: player.attributes.name,
          description: `Auto-discovered clan: ${clanInfo.attributes.clanName}`,
          announcement: null,
          memberCount: 1,
          avgScore: 0,
          mainStyle: 'Unknown',
          pubgClanId: player.attributes.clanId,
          pubgClanTag: clanInfo.attributes.clanTag,
          pubgClanLevel: clanInfo.attributes.clanLevel,
          pubgMemberCount: clanInfo.attributes.clanMemberCount,
          lastSynced: new Date(),
        },
      });
      newClan = true;
      console.log(
        `🎉 새 클랜 자동 생성: ${clanInfo.attributes.clanName} (${clanInfo.attributes.clanTag})`
      );
    }

    // 2. 클랜 멤버 DB 처리
    const existingMember = await prisma.clanMember.findFirst({
      where: {
        nickname: player.attributes.name,
        pubgPlayerId: player.id,
      },
    });

    if (existingMember) {
      // 기존 멤버 업데이트
      await prisma.clanMember.update({
        where: { id: existingMember.id },
        data: {
          pubgClanId: player.attributes.clanId,
          pubgPlayerId: player.id,
          pubgShardId: shard,
          lastUpdated: new Date(),
        },
      });
    } else {
      // 새 멤버 생성
      await prisma.clanMember.create({
        data: {
          nickname: player.attributes.name,
          score: 0,
          style: 'Unknown',
          avgDamage: 0.0,
          avgKills: 0.0,
          avgAssists: 0.0,
          avgSurviveTime: 0.0,
          winRate: 0.0,
          top10Rate: 0.0,
          clanId: targetClan.id,
          pubgClanId: player.attributes.clanId,
          pubgPlayerId: player.id,
          pubgShardId: shard,
          lastUpdated: new Date(),
        },
      });
      newMember = true;
      console.log(
        `🎉 새 멤버 자동 생성: ${player.attributes.name} → ${clanInfo.attributes.clanName}`
      );

      // 클랜 멤버 수 업데이트
      await updateClanMemberCount(targetClan.id);
    }

    // 클랜 멤버 수 업데이트 (기존 멤버 업데이트 시에도)
    await updateClanMemberCount(targetClan.id);

    // 전체 통계 조회
    const totalClans = await prisma.clan.count();
    const totalMembers = await prisma.clanMember.count();

    return {
      newClan,
      newMember,
      totalClans,
      totalMembers,
      clanName: clanInfo.attributes.clanName,
    };
  } catch (dbError) {
    console.error('🔥 DB 저장 오류:', dbError.message);
    // DB 오류가 있어도 API 응답은 정상적으로 반환
    return { newClan: false, newMember: false, totalClans: 0, totalMembers: 0 };
  }
}

// 클랜이 없는 독립 플레이어를 저장하는 함수
async function saveOrUpdateIndependentPlayer(player, shard) {
  let newMember = false;

  try {
    // 기존 멤버 확인
    const existingMember = await prisma.clanMember.findFirst({
      where: {
        nickname: player.attributes.name,
        pubgPlayerId: player.id,
      },
    });

    if (existingMember) {
      // 기존 멤버 업데이트
      await prisma.clanMember.update({
        where: { id: existingMember.id },
        data: {
          pubgPlayerId: player.id,
          pubgShardId: shard,
          lastUpdated: new Date(),
        },
      });
    } else {
      // 새 독립 멤버 생성
      await prisma.clanMember.create({
        data: {
          nickname: player.attributes.name,
          score: 0,
          style: 'Unknown',
          avgDamage: 0.0,
          avgKills: 0.0,
          avgAssists: 0.0,
          avgSurviveTime: 0.0,
          winRate: 0.0,
          top10Rate: 0.0,
          clanId: null, // 클랜 없음
          pubgClanId: null,
          pubgPlayerId: player.id,
          pubgShardId: shard,
          lastUpdated: new Date(),
        },
      });
      newMember = true;
      console.log(`🎉 새 독립 멤버 자동 생성: ${player.attributes.name}`);
    }

    // 전체 통계 조회
    const totalClans = await prisma.clan.count();
    const totalMembers = await prisma.clanMember.count();

    return {
      newClan: false,
      newMember,
      totalClans,
      totalMembers,
      clanName: null,
    };
  } catch (dbError) {
    console.error('🔥 독립 플레이어 저장 오류:', dbError.message);
    return { newClan: false, newMember: false, totalClans: 0, totalMembers: 0 };
  }
}

// 클랜의 실제 멤버 수로 업데이트하는 함수
async function updateClanMemberCount(clanId) {
  try {
    const memberCount = await prisma.clanMember.count({
      where: { clanId: clanId },
    });

    await prisma.clan.update({
      where: { id: clanId },
      data: { memberCount: memberCount },
    });

    console.log(`📊 클랜 멤버 수 업데이트: ${memberCount}명`);
  } catch (error) {
    console.error('클랜 멤버 수 업데이트 실패:', error.message);
  }
}
