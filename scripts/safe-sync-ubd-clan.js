// scripts/safe-sync-ubd-clan.js
// API 요청 제한을 고려한 안전한 UBD 클랜 동기화

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';
const UBD_CLAN_ID = 'clan.eb5c32a3cc484b59981f9c61e9ea2747';
const SHARD = 'steam';

// 재시도 로직이 있는 안전한 API 호출
async function safeApiCall(url, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // 긴 대기 시간 (1초)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await axios.get(url, {
        headers: {
          Authorization: API_KEY,
          Accept: 'application/vnd.api+json',
        },
        timeout: 15000 // 15초 타임아웃
      });
      
      return { success: true, data: response.data };
      
    } catch (error) {
      if (error.response?.status === 429) {
        const waitTime = Math.pow(2, attempt) * 2000; // 지수 백오프: 2초, 4초, 8초
        console.log(`    ⏳ Rate limit (시도 ${attempt + 1}/${maxRetries}), ${waitTime/1000}초 대기...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      } else if (error.response?.status === 404) {
        return { success: false, error: 'NOT_FOUND' };
      } else {
        console.log(`    ❌ API 오류: ${error.response?.status || error.message}`);
        return { success: false, error: error.response?.status || 'UNKNOWN' };
      }
    }
  }
  
  return { success: false, error: 'MAX_RETRIES_EXCEEDED' };
}

// 클랜 정보 가져오기
async function getClanInfo(clanId, shard) {
  const url = `https://api.pubg.com/shards/${shard}/clans/${clanId}`;
  const result = await safeApiCall(url);
  
  if (result.success) {
    return result.data.data;
  }
  
  console.error(`클랜 정보 가져오기 실패: ${result.error}`);
  return null;
}

// 플레이어 정보 가져오기
async function getPlayerInfo(nickname, shard) {
  const url = `https://api.pubg.com/shards/${shard}/players?filter[playerNames]=${nickname}`;
  const result = await safeApiCall(url);
  
  if (result.success && result.data.data.length > 0) {
    return result.data.data[0];
  }
  
  return null;
}

async function safeSyncUbdClan() {
  console.log('🛡️  안전한 UBD 클랜 동기화 시작...\n');
  console.log(`🎯 타겟 클랜 ID: ${UBD_CLAN_ID}`);
  console.log(`🌍 샤드: ${SHARD}`);
  console.log(`⏱️  API 요청 간격: 1초 (안전 모드)\n`);
  
  try {
    // 1. 클랜 정보 확인
    console.log('📊 클랜 정보 확인 중...');
    const clanInfo = await getClanInfo(UBD_CLAN_ID, SHARD);
    
    if (!clanInfo) {
      console.error('❌ 클랜 정보를 가져올 수 없습니다.');
      return;
    }
    
    console.log(`✅ 클랜 정보:`);
    console.log(`   클랜명: ${clanInfo.attributes.clanName}`);
    console.log(`   클랜태그: ${clanInfo.attributes.clanTag}`);
    console.log(`   클랜레벨: ${clanInfo.attributes.clanLevel}`);
    console.log(`   총 멤버수: ${clanInfo.attributes.clanMemberCount}명\n`);
    
    // 2. DB의 클랜 정보 업데이트
    await prisma.clan.updateMany({
      where: { pubgClanId: UBD_CLAN_ID },
      data: {
        pubgClanTag: clanInfo.attributes.clanTag,
        pubgClanLevel: clanInfo.attributes.clanLevel,
        pubgMemberCount: clanInfo.attributes.clanMemberCount,
        lastSynced: new Date()
      }
    });
    
    // 3. 현재 DB의 UBD 클랜 멤버들 가져오기
    const dbMembers = await prisma.clanMember.findMany({
      where: { pubgClanId: UBD_CLAN_ID }
    });
    
    console.log(`🔍 DB에 등록된 UBD 멤버 ${dbMembers.length}명 검증 중...\n`);
    
    const results = {
      valid: [],
      invalid: [],
      updated: [],
      errors: []
    };
    
    // 4. 각 멤버 검증 (천천히)
    for (let i = 0; i < Math.min(dbMembers.length, 10); i++) { // 처음 10명만 테스트
      const member = dbMembers[i];
      console.log(`[${i + 1}/10] ${member.nickname} 검증 중...`);
      
      const playerInfo = await getPlayerInfo(member.nickname, SHARD);
      
      if (playerInfo) {
        if (playerInfo.attributes.clanId === UBD_CLAN_ID) {
          console.log(`  ✅ 유효: ${member.nickname} (UBD 클랜 멤버)`);
          results.valid.push(member.nickname);
          
          // 멤버 정보 업데이트
          await prisma.clanMember.update({
            where: { id: member.id },
            data: {
              pubgPlayerId: playerInfo.id,
              pubgShardId: SHARD,
              lastUpdated: new Date()
            }
          });
          results.updated.push(member.nickname);
          
        } else {
          console.log(`  ⚠️  클랜 변경: ${member.nickname} → 클랜 ID: ${playerInfo.attributes.clanId || '없음'}`);
          results.invalid.push({
            nickname: member.nickname,
            reason: '클랜 변경',
            newClan: playerInfo.attributes.clanId
          });
          
          // 새 클랜 ID로 업데이트
          await prisma.clanMember.update({
            where: { id: member.id },
            data: {
              pubgClanId: playerInfo.attributes.clanId,
              pubgPlayerId: playerInfo.id,
              pubgShardId: SHARD,
              lastUpdated: new Date()
            }
          });
        }
      } else {
        console.log(`  ❌ 플레이어 찾을 수 없음: ${member.nickname}`);
        results.invalid.push({
          nickname: member.nickname,
          reason: '플레이어 없음',
          newClan: null
        });
      }
    }
    
    // 5. 결과 요약
    console.log('\n🎉 안전한 동기화 완료!\n');
    console.log('📈 결과 요약 (처음 10명만):');
    console.log(`  - PUBG 클랜 총 멤버수: ${clanInfo.attributes.clanMemberCount}명`);
    console.log(`  - 검증한 멤버: 10명`);
    console.log(`  - 유효한 UBD 멤버: ${results.valid.length}명`);
    console.log(`  - 정보 업데이트: ${results.updated.length}명`);
    console.log(`  - 클랜 변경/탈퇴: ${results.invalid.length}명`);
    
    if (results.valid.length > 0) {
      console.log('\n✅ 유효한 UBD 멤버들:');
      results.valid.forEach((nickname, index) => {
        console.log(`  ${index + 1}. ${nickname}`);
      });
    }
    
    if (results.invalid.length > 0) {
      console.log('\n⚠️  클랜 변경/탈퇴한 멤버들:');
      results.invalid.forEach((member, index) => {
        console.log(`  ${index + 1}. ${member.nickname} - ${member.reason}`);
        if (member.newClan) {
          console.log(`     새 클랜: ${member.newClan}`);
        }
      });
    }
    
    const coverage = ((results.valid.length / 10) * 100).toFixed(1);
    console.log(`\n📊 샘플 커버리지: ${results.valid.length}/10 (${coverage}%)`);
    
    console.log(`\n💡 전체 ${dbMembers.length}명의 멤버 중 ${dbMembers.length - 10}명이 남아있습니다.`);
    console.log(`   전체 동기화를 원하면 스크립트의 제한을 제거하세요.`);
    
  } catch (error) {
    console.error('💥 동기화 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 실행
safeSyncUbdClan();
