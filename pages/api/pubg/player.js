import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { nickname } = req.query;
  const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';
  const shards = ['steam', 'kakao', 'psn', 'xbox'];

  try {
    for (const shard of shards) {
      try {
        const response = await axios.get(`https://api.pubg.com/shards/${shard}/players?filter[playerNames]=${nickname}`, {
          headers: {
            Authorization: API_KEY,
            Accept: 'application/vnd.api+json',
          },
        });

        if (response.data.data.length > 0) {
          const player = response.data.data[0];
          let clanInfo = null;

          // 플레이어에 clanId가 있으면 클랜 정보도 가져오기
          if (player.attributes.clanId) {
            try {
              const clanResponse = await axios.get(`https://api.pubg.com/shards/${shard}/clans/${player.attributes.clanId}`, {
                headers: {
                  Authorization: API_KEY,
                  Accept: 'application/vnd.api+json',
                },
              });
              clanInfo = clanResponse.data.data;

              // 🆕 자동 저장 기능: 클랜과 멤버 정보를 DB에 저장/업데이트
              await saveOrUpdateClanAndMember(player, clanInfo, shard);

            } catch (clanError) {
              console.warn(`Failed to fetch clan info for ${player.attributes.clanId}`);
            }
          }

          return res.status(200).json({
            player: player,
            shardId: shard,
            clan: clanInfo,
          });
        }
      } catch (error) {
        console.warn(`Failed for shard ${shard}`);
      }
    }

    return res.status(404).json({ error: 'Player not found' });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}

// 클랜과 멤버 정보를 DB에 저장/업데이트하는 함수
async function saveOrUpdateClanAndMember(player, clanInfo, shard) {
  try {
    // 1. 클랜 DB 처리
    const existingClan = await prisma.clan.findFirst({
      where: { pubgClanId: player.attributes.clanId }
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
          lastSynced: new Date()
        }
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
          lastSynced: new Date()
        }
      });
      console.log(`🎉 새 클랜 생성: ${clanInfo.attributes.clanName}`);
    }

    // 2. 클랜 멤버 DB 처리
    const existingMember = await prisma.clanMember.findFirst({
      where: {
        nickname: player.attributes.name,
        pubgPlayerId: player.id
      }
    });

    if (existingMember) {
      // 기존 멤버 업데이트
      await prisma.clanMember.update({
        where: { id: existingMember.id },
        data: {
          pubgClanId: player.attributes.clanId,
          pubgPlayerId: player.id,
          pubgShardId: shard,
          lastUpdated: new Date()
        }
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
          lastUpdated: new Date()
        }
      });
      console.log(`🎉 새 멤버 생성: ${player.attributes.name}`);
    }

  } catch (dbError) {
    console.error('DB 저장 오류:', dbError.message);
    // DB 오류가 있어도 API 응답은 정상적으로 반환
  }
}
