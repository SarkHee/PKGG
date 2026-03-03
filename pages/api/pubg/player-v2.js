// pages/api/pubg/player-v2.js - 개선된 플레이어/클랜 검색 API
import axios from 'axios';
import prisma from '../../../utils/prisma.js';

export default async function handler(req, res) {
  const { nickname, initUBD } = req.query;

  // 옵션: initUBD=1이면 UBD 데이터 초기화 후 진행
  if (initUBD === '1') {
    console.log('🔄 UBD 클랜 데이터 초기화 중...');
    try {
      const ubdClan = await prisma.clan.findFirst({
        where: {
          OR: [
            { name: { contains: 'UBD', mode: 'insensitive' } },
            { pubgClanTag: { contains: 'UBD', mode: 'insensitive' } },
          ],
        },
      });

      if (ubdClan) {
        // 멤버 삭제
        const deleteMembers = await prisma.clanMember.deleteMany({
          where: { clanId: ubdClan.id },
        });
        console.log(`✅ UBD 클랜 멤버 ${deleteMembers.count}명 삭제`);

        // 클랜 삭제
        await prisma.clan.delete({ where: { id: ubdClan.id } });
        console.log(`✅ UBD 클랜 삭제 완료`);
      }
    } catch (error) {
      console.error('UBD 초기화 실패:', error.message);
      return res.status(500).json({
        error: 'Failed to initialize UBD clan data',
        details: error.message,
      });
    }
  }

  if (!nickname) {
    return res.status(400).json({ error: 'nickname is required' });
  }

  const API_KEY = `Bearer ${process.env.PUBG_API_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o'}`;
  const shards = ['steam', 'kakao', 'psn', 'xbox'];

  console.log(`🔍 플레이어 검색: ${nickname}`);

  try {
    for (const shard of shards) {
      try {
        // 1. 플레이어 검색
        const playerResponse = await axios.get(
          `https://api.pubg.com/shards/${shard}/players?filter[playerNames]=${encodeURIComponent(nickname)}`,
          {
            headers: {
              Authorization: API_KEY,
              Accept: 'application/vnd.api+json',
            },
          }
        );

        if (playerResponse.data.data.length === 0) {
          console.log(`❌ ${shard} 샤드에서 플레이어 찾지 못함`);
          continue;
        }

        const player = playerResponse.data.data[0];
        let clanInfo = null;
        let saveResult = { newClan: false, newMember: false };

        console.log(`✅ 플레이어 발견: ${player.attributes.name} (${shard})`);
        console.log(`   - pubgPlayerId: ${player.id}`);
        console.log(`   - clanId: ${player.attributes.clanId || '(클랜 없음)'}`);

        // 2. 클랜 정보 조회 (있는 경우)
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
            console.log(`✅ 클랜 정보 조회 성공: ${clanInfo.attributes.clanName} (${clanInfo.attributes.clanTag})`);
            console.log(`   - pubgClanId: ${clanInfo.id}`);
            console.log(`   - 멤버 수: ${clanInfo.attributes.clanMemberCount}`);
            console.log(`   - 레벨: ${clanInfo.attributes.clanLevel}`);

            // 3. 클랜과 멤버 DB에 저장
            saveResult = await saveOrUpdateClanAndMember(player, clanInfo, shard);
          } catch (clanError) {
            console.error(
              `⚠️ 클랜 정보 조회 실패 (${player.attributes.clanId}):`,
              clanError.response?.status,
              clanError.message
            );
          }
        } else {
          // 클랜 없는 플레이어 저장
          saveResult = await saveOrUpdateIndependentPlayer(player, shard);
        }

        return res.status(200).json({
          success: true,
          player: {
            id: player.id,
            name: player.attributes.name,
            clanId: player.attributes.clanId,
            shardId: shard,
          },
          clan: clanInfo
            ? {
                id: clanInfo.id,
                name: clanInfo.attributes.clanName,
                tag: clanInfo.attributes.clanTag,
                level: clanInfo.attributes.clanLevel,
                memberCount: clanInfo.attributes.clanMemberCount,
              }
            : null,
          saved: saveResult,
        });
      } catch (shardError) {
        if (shardError.response?.status !== 404) {
          console.warn(`⚠️ ${shard} 샤드 오류: ${shardError.message}`);
        }
      }
    }

    console.log(`❌ 플레이어 '${nickname}'을 모든 샤드에서 찾을 수 없음`);
    return res.status(404).json({
      success: false,
      error: 'Player not found in any shard',
    });
  } catch (error) {
    console.error('🔥 Fatal API Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 클랜과 멤버 정보를 DB에 저장/업데이트
 */
async function saveOrUpdateClanAndMember(player, clanInfo, shard) {
  let newClan = false;
  let newMember = false;

  try {
    // 1️⃣ 클랜 저장/업데이트
    const existingClan = await prisma.clan.findFirst({
      where: { pubgClanId: player.attributes.clanId },
    });

    let targetClan;
    if (existingClan) {
      targetClan = await prisma.clan.update({
        where: { id: existingClan.id },
        data: {
          name: clanInfo.attributes.clanName,
          pubgClanTag: clanInfo.attributes.clanTag,
          pubgClanLevel: clanInfo.attributes.clanLevel,
          pubgMemberCount: clanInfo.attributes.clanMemberCount,
          lastSynced: new Date(),
        },
      });
      console.log(`   📝 기존 클랜 업데이트: ${targetClan.name}`);
    } else {
      targetClan = await prisma.clan.create({
        data: {
          name: clanInfo.attributes.clanName,
          leader: player.attributes.name,
          description: `PUBG Clan: ${clanInfo.attributes.clanName}`,
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
      console.log(`   ✨ 새 클랜 생성: ${targetClan.name}`);
    }

    // 2️⃣ 클랜 멤버 저장/업데이트
    const existingMember = await prisma.clanMember.findFirst({
      where: {
        pubgPlayerId: player.id,
      },
    });

    if (existingMember) {
      await prisma.clanMember.update({
        where: { id: existingMember.id },
        data: {
          clanId: targetClan.id,
          pubgClanId: player.attributes.clanId,
          pubgShardId: shard,
          lastUpdated: new Date(),
        },
      });
      console.log(`   📝 기존 멤버 업데이트: ${player.attributes.name}`);
    } else {
      await prisma.clanMember.create({
        data: {
          nickname: player.attributes.name,
          score: 0,
          style: 'Unknown',
          avgDamage: 0,
          avgKills: 0,
          avgAssists: 0,
          avgSurviveTime: 0,
          winRate: 0,
          top10Rate: 0,
          clanId: targetClan.id,
          pubgClanId: player.attributes.clanId,
          pubgPlayerId: player.id,
          pubgShardId: shard,
          lastUpdated: new Date(),
        },
      });
      newMember = true;
      console.log(`   ✨ 새 멤버 생성: ${player.attributes.name}`);
    }

    // 3️⃣ 클랜 멤버 수 업데이트
    const memberCount = await prisma.clanMember.count({
      where: { clanId: targetClan.id },
    });
    await prisma.clan.update({
      where: { id: targetClan.id },
      data: { memberCount },
    });

    const totalClans = await prisma.clan.count();
    const totalMembers = await prisma.clanMember.count();

    console.log(`   📊 DB 통계: ${totalClans}개 클랜, ${totalMembers}명 멤버`);

    return {
      newClan,
      newMember,
      clanId: targetClan.id,
      memberId: existingMember?.id,
    };
  } catch (dbError) {
    console.error('🔥 DB 저장 실패:', dbError.message);
    throw dbError;
  }
}

/**
 * 클랜이 없는 독립 플레이어 저장/업데이트
 */
async function saveOrUpdateIndependentPlayer(player, shard) {
  let newMember = false;

  try {
    const existingMember = await prisma.clanMember.findFirst({
      where: { pubgPlayerId: player.id },
    });

    if (existingMember) {
      await prisma.clanMember.update({
        where: { id: existingMember.id },
        data: {
          pubgShardId: shard,
          lastUpdated: new Date(),
        },
      });
      console.log(`   📝 독립 멤버 업데이트: ${player.attributes.name}`);
    } else {
      await prisma.clanMember.create({
        data: {
          nickname: player.attributes.name,
          score: 0,
          style: 'Unknown',
          avgDamage: 0,
          avgKills: 0,
          avgAssists: 0,
          avgSurviveTime: 0,
          winRate: 0,
          top10Rate: 0,
          clanId: null,
          pubgClanId: null,
          pubgPlayerId: player.id,
          pubgShardId: shard,
          lastUpdated: new Date(),
        },
      });
      newMember = true;
      console.log(`   ✨ 새 독립 멤버 생성: ${player.attributes.name}`);
    }

    const totalMembers = await prisma.clanMember.count();
    console.log(`   📊 DB 통계: ${totalMembers}명 멤버`);

    return {
      newClan: false,
      newMember,
      memberId: existingMember?.id,
    };
  } catch (dbError) {
    console.error('🔥 독립 멤버 저장 실패:', dbError.message);
    throw dbError;
  }
}
