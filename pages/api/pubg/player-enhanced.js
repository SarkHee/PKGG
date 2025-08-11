// pages/api/pubg/player-enhanced.js
// 캐싱과 폴백을 활용한 개선된 플레이어 API

import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { cache } from '../../../utils/cacheManager.js';

const prisma = new PrismaClient();
const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';
const shards = ['steam', 'kakao', 'psn', 'xbox'];

export default async function handler(req, res) {
  const { nickname } = req.query;

  try {
    // 1. 캐시에서 먼저 확인
    const cachedData = cache.getPlayer(nickname);
    if (cachedData) {
      console.log(`🚀 캐시에서 반환: ${nickname}`);
      return res.status(200).json({
        ...cachedData,
        cached: true,
        cacheTime: new Date().toISOString()
      });
    }

    // 2. PUBG API 호출
    const apiResult = await getPlayerFromAPI(nickname);
    
    if (apiResult.success) {
      // API 성공 시
      const { player, clan, shard } = apiResult.data;
      
      // 3. DB에 백업 저장 (비동기)
      saveToDBBackground(player, clan, shard);
      
      // 4. 캐시에 저장
      const responseData = {
        player,
        clan,
        shardId: shard,
        source: 'api',
        timestamp: new Date().toISOString()
      };
      
      cache.setPlayer(nickname, responseData);
      
      return res.status(200).json(responseData);
      
    } else {
      // 5. API 실패 시 DB에서 폴백
      console.log(`⚠️  API 실패, DB에서 폴백 시도: ${nickname}`);
      const dbData = await getPlayerFromDB(nickname);
      
      if (dbData) {
        console.log(`🗃️  DB에서 반환: ${nickname}`);
        return res.status(200).json({
          ...dbData,
          source: 'database_fallback',
          warning: 'API 장애로 인한 DB 데이터'
        });
      }
      
      return res.status(404).json({ error: 'Player not found' });
    }

  } catch (error) {
    console.error('Enhanced API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}

// PUBG API에서 플레이어 정보 가져오기
async function getPlayerFromAPI(nickname) {
  for (const shard of shards) {
    try {
      const response = await axios.get(`https://api.pubg.com/shards/${shard}/players?filter[playerNames]=${nickname}`, {
        headers: {
          Authorization: API_KEY,
          Accept: 'application/vnd.api+json',
        },
        timeout: 10000
      });

      if (response.data.data.length > 0) {
        const player = response.data.data[0];
        let clanInfo = null;

        if (player.attributes.clanId) {
          // 캐시에서 클랜 정보 확인
          clanInfo = cache.getClan(player.attributes.clanId);
          
          if (!clanInfo) {
            try {
              const clanResponse = await axios.get(`https://api.pubg.com/shards/${shard}/clans/${player.attributes.clanId}`, {
                headers: {
                  Authorization: API_KEY,
                  Accept: 'application/vnd.api+json',
                },
                timeout: 10000
              });
              clanInfo = clanResponse.data.data;
              
              // 클랜 정보 캐시에 저장
              cache.setClan(player.attributes.clanId, clanInfo);
              
            } catch (clanError) {
              console.warn(`클랜 정보 가져오기 실패: ${player.attributes.clanId}`);
            }
          }
        }

        return {
          success: true,
          data: { player, clan: clanInfo, shard }
        };
      }
    } catch (error) {
      console.warn(`API 실패 (${shard}):`, error.message);
    }
  }
  
  return { success: false };
}

// DB에서 플레이어 정보 가져오기 (폴백용)
async function getPlayerFromDB(nickname) {
  try {
    const member = await prisma.clanMember.findFirst({
      where: {
        nickname: {
          equals: nickname,
          mode: 'insensitive'
        }
      },
      include: {
        clan: true
      }
    });

    if (member) {
      return {
        player: {
          type: 'player',
          id: member.pubgPlayerId,
          attributes: {
            name: member.nickname,
            clanId: member.pubgClanId,
            shardId: member.pubgShardId
          }
        },
        clan: member.clan ? {
          type: 'clan',
          id: member.clan.pubgClanId,
          attributes: {
            clanName: member.clan.name,
            clanTag: member.clan.pubgClanTag,
            clanLevel: member.clan.pubgClanLevel,
            clanMemberCount: member.clan.pubgMemberCount // API에서 가져온 값 사용
          }
        } : null,
        shardId: member.pubgShardId
      };
    }
  } catch (error) {
    console.error('DB 조회 실패:', error);
  }
  
  return null;
}

// 백그라운드에서 DB에 저장 (비동기)
async function saveToDBBackground(player, clan, shard) {
  try {
    // 논블로킹으로 실행
    setTimeout(async () => {
      try {
        if (clan) {
          // 클랜 저장/업데이트
          await prisma.clan.upsert({
            where: { pubgClanId: player.attributes.clanId },
            update: {
              name: clan.attributes.clanName,
              pubgClanTag: clan.attributes.clanTag,
              pubgClanLevel: clan.attributes.clanLevel,
              pubgMemberCount: clan.attributes.clanMemberCount, // API 값 사용
              lastSynced: new Date()
            },
            create: {
              name: clan.attributes.clanName,
              leader: player.attributes.name,
              description: `Auto-discovered: ${clan.attributes.clanName}`,
              announcement: null,
              memberCount: 1, // DB 실제 멤버 수
              avgScore: 0,
              mainStyle: 'Unknown',
              pubgClanId: player.attributes.clanId,
              pubgClanTag: clan.attributes.clanTag,
              pubgClanLevel: clan.attributes.clanLevel,
              pubgMemberCount: clan.attributes.clanMemberCount, // API 값 사용
              lastSynced: new Date()
            }
          });

          // 멤버 저장/업데이트
          const targetClan = await prisma.clan.findUnique({
            where: { pubgClanId: player.attributes.clanId }
          });

          if (targetClan) {
            await prisma.clanMember.upsert({
              where: {
                nickname_pubgPlayerId: {
                  nickname: player.attributes.name,
                  pubgPlayerId: player.id
                }
              },
              update: {
                pubgClanId: player.attributes.clanId,
                pubgShardId: shard,
                lastUpdated: new Date()
              },
              create: {
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
          }
        }
        
        console.log(`💾 백그라운드 DB 저장 완료: ${player.attributes.name}`);
      } catch (dbError) {
        console.error('백그라운드 DB 저장 실패:', dbError.message);
      }
    }, 100); // 100ms 후 실행
  } catch (error) {
    console.error('백그라운드 저장 스케줄링 실패:', error);
  }
}
