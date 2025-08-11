// scripts/auto-discover-all-clans.js
// 모든 클랜의 새로운 멤버들을 자동으로 발견하고 DB에 저장하는 스크립트

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { analyzeClanRegion } from '../utils/clanRegionAnalyzer.js';

const prisma = new PrismaClient();

const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';
const shards = ['steam', 'kakao', 'psn', 'xbox'];

// 안전한 API 호출 함수
async function safeApiCall(url, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // API 요청 간격 (Rate limit 방지)
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const response = await axios.get(url, {
        headers: {
          Authorization: API_KEY,
          Accept: 'application/vnd.api+json',
        },
        timeout: 15000
      });
      
      return { success: true, data: response.data };
      
    } catch (error) {
      if (error.response?.status === 429) {
        const waitTime = Math.pow(2, attempt) * 2000;
        console.log(`    ⏳ Rate limit (시도 ${attempt + 1}/${maxRetries}), ${waitTime/1000}초 대기...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
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

// 클랜 멤버 목록 가져오기
async function getClanMembers(clanId, shard) {
  const url = `https://api.pubg.com/shards/${shard}/clans/${clanId}/members`;
  const result = await safeApiCall(url);
  
  if (result.success) {
    return result.data.data || [];
  }
  
  console.warn(`    ⚠️  클랜 멤버 목록 가져오기 실패: ${result.error}`);
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

// 클랜 정보 가져오기
async function getClanInfo(clanId, shard) {
  const url = `https://api.pubg.com/shards/${shard}/clans/${clanId}`;
  const result = await safeApiCall(url);
  
  if (result.success) {
    return result.data.data;
  }
  
  return null;
}

// 새 멤버를 DB에 저장
async function saveMemberToDatabase(player, clan, shard) {
  try {
    // 멤버가 이미 존재하는지 확인
    const existingMember = await prisma.clanMember.findFirst({
      where: {
        nickname: player.attributes.name,
        pubgPlayerId: player.id
      }
    });

    if (existingMember) {
      console.log(`    ↻ 기존 멤버 업데이트: ${player.attributes.name}`);
      await prisma.clanMember.update({
        where: { id: existingMember.id },
        data: {
          pubgClanId: player.attributes.clanId,
          pubgPlayerId: player.id,
          pubgShardId: shard,
          lastUpdated: new Date()
        }
      });
      return 'updated';
    } else {
      console.log(`    ✨ 새 멤버 추가: ${player.attributes.name}`);
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
          clanId: clan.dbId,
          pubgClanId: player.attributes.clanId,
          pubgPlayerId: player.id,
          pubgShardId: shard,
          lastUpdated: new Date()
        }
      });
      return 'created';
    }
  } catch (error) {
    console.error(`    ❌ DB 저장 실패 (${player.attributes.name}):`, error.message);
    return 'failed';
  }
}

// 모든 클랜 자동 동기화
async function autoDiscoverAllClans() {
  console.log('🚀 모든 클랜 자동 발견 시작...\n');
  
  try {
    // 1. DB에 저장된 모든 클랜 가져오기
    const dbClans = await prisma.clan.findMany({
      where: {
        pubgClanId: { not: null }
      },
      select: {
        id: true,
        name: true,
        pubgClanId: true,
        pubgClanTag: true
      }
    });

    console.log(`📋 DB에서 ${dbClans.length}개 클랜 발견\n`);

    let totalNewMembers = 0;
    let totalUpdatedMembers = 0;

    // 2. 각 클랜별로 멤버 동기화
    for (const [index, dbClan] of dbClans.entries()) {
      console.log(`🎯 [${index + 1}/${dbClans.length}] ${dbClan.name} (${dbClan.pubgClanTag}) 동기화 중...`);
      
      // 적절한 샤드 찾기 (일단 steam부터 시도)
      let clanShard = 'steam';
      
      // 클랜 멤버 목록 가져오기
      const pubgMembers = await getClanMembers(dbClan.pubgClanId, clanShard);
      
      if (pubgMembers.length === 0) {
        console.log(`    ⚠️  멤버 목록을 가져올 수 없음`);
        continue;
      }

      console.log(`    📊 PUBG API: ${pubgMembers.length}명 발견`);

      // 현재 DB의 해당 클랜 멤버들
      const currentMembers = await prisma.clanMember.findMany({
        where: { clanId: dbClan.id },
        select: { pubgPlayerId: true, nickname: true, pubgShardId: true }
      });

      const existingPlayerIds = new Set(currentMembers.map(m => m.pubgPlayerId).filter(Boolean));
      console.log(`    🗃️  DB: ${currentMembers.length}명 (PUBG ID 있음: ${existingPlayerIds.size}명)`);

      // 새로운 멤버들 처리
      const newMembers = pubgMembers.filter(member => !existingPlayerIds.has(member.id));
      
      if (newMembers.length > 0) {
        console.log(`    🆕 새 멤버 ${newMembers.length}명 발견:`);
        
        for (const member of newMembers) {
          // 플레이어 상세 정보 가져오기
          const playerDetails = await getPlayerDetails(member.id, clanShard);
          
          if (playerDetails) {
            const result = await saveMemberToDatabase(
              playerDetails, 
              { ...dbClan, dbId: dbClan.id }, 
              clanShard
            );
            
            if (result === 'created') totalNewMembers++;
            else if (result === 'updated') totalUpdatedMembers++;
          }
        }
      } else {
        console.log(`    ✅ 새 멤버 없음`);
      }

      // 지역 분석 및 업데이트
      const allMembers = await prisma.clanMember.findMany({
        where: { clanId: dbClan.id },
        select: { nickname: true, pubgShardId: true }
      });

      const regionAnalysis = analyzeClanRegion(dbClan, allMembers);
      
      console.log(`    🌍 지역 분석: ${regionAnalysis.region} (신뢰도: ${Math.round(regionAnalysis.confidence * 100)}%)`);
      if (regionAnalysis.reasons.length > 0) {
        console.log(`       └ 근거: ${regionAnalysis.reasons[0]}`);
      }

      // 클랜 지역 정보 업데이트
      await prisma.clan.update({
        where: { id: dbClan.id },
        data: {
          region: regionAnalysis.region,
          isKorean: regionAnalysis.isKorean,
          shardDistribution: JSON.stringify(regionAnalysis.shardDistribution),
          lastSynced: new Date()
        }
      });
      
      console.log(''); // 줄바꿈
    }

    console.log('🎉 자동 발견 완료!');
    console.log(`📊 총 결과:`);
    console.log(`   ✨ 새로 추가된 멤버: ${totalNewMembers}명`);
    console.log(`   ↻ 업데이트된 멤버: ${totalUpdatedMembers}명`);

  } catch (error) {
    console.error('❌ 자동 발견 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
autoDiscoverAllClans();
