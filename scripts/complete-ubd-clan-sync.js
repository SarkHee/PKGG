// scripts/complete-ubd-clan-sync.js
// UBD 클랜 완전 동기화 - 클랜 고유 ID 활용

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';
const UBD_CLAN_ID = 'clan.eb5c32a3cc484b59981f9c61e9ea2747';
const SHARD = 'steam';

// 안전한 API 호출
async function safeApiCall(url, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1200)); // 1.2초 대기
      
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
        const waitTime = Math.pow(2, attempt + 1) * 2000; // 4초, 8초, 16초
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

// 클랜 정보 가져오기
async function getClanInfo(clanId, shard) {
  const url = `https://api.pubg.com/shards/${shard}/clans/${clanId}`;
  const result = await safeApiCall(url);
  
  if (result.success) {
    return result.data.data;
  }
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

async function completeUbdClanSync() {
  console.log('🎯 UBD 클랜 완전 동기화 시작...\n');
  console.log(`📋 클랜 ID: ${UBD_CLAN_ID}`);
  console.log(`🌍 샤드: ${SHARD}\n`);
  
  try {
    // 1. 클랜 정보 확인 및 업데이트
    console.log('📊 클랜 정보 확인 중...');
    const clanInfo = await getClanInfo(UBD_CLAN_ID, SHARD);
    
    if (!clanInfo) {
      console.error('❌ 클랜 정보를 가져올 수 없습니다.');
      return;
    }
    
    console.log(`✅ 클랜 정보:`);
    console.log(`   이름: ${clanInfo.attributes.clanName}`);
    console.log(`   태그: ${clanInfo.attributes.clanTag}`);
    console.log(`   레벨: ${clanInfo.attributes.clanLevel}`);
    console.log(`   총 멤버수: ${clanInfo.attributes.clanMemberCount}명\n`);
    
    // 2. DB의 UBD 클랜 정보 업데이트
    let ubdClan = await prisma.clan.findFirst({
      where: { pubgClanId: UBD_CLAN_ID }
    });
    
    if (ubdClan) {
      await prisma.clan.update({
        where: { id: ubdClan.id },
        data: {
          pubgClanTag: clanInfo.attributes.clanTag,
          pubgClanLevel: clanInfo.attributes.clanLevel,
          pubgMemberCount: clanInfo.attributes.clanMemberCount,
          lastSynced: new Date()
        }
      });
      console.log('✅ DB의 클랜 정보 업데이트 완료\n');
    } else {
      // UBD 클랜이 DB에 없으면 생성
      ubdClan = await prisma.clan.create({
        data: {
          name: clanInfo.attributes.clanName,
          tag: clanInfo.attributes.clanTag,
          description: `PUBG 클랜 (${clanInfo.attributes.clanName})`,
          pubgClanId: UBD_CLAN_ID,
          pubgClanTag: clanInfo.attributes.clanTag,
          pubgClanLevel: clanInfo.attributes.clanLevel,
          pubgMemberCount: clanInfo.attributes.clanMemberCount,
          lastSynced: new Date()
        }
      });
      console.log('✅ UBD 클랜 정보 DB에 생성 완료\n');
    }
    
    // 3. 현재 DB의 모든 UBD 클랜 멤버 가져오기
    const allDbMembers = await prisma.clanMember.findMany({
      where: { clanId: ubdClan.id },
      orderBy: { nickname: 'asc' }
    });
    
    console.log(`🗃️  DB에 등록된 UBD 멤버 총 ${allDbMembers.length}명\n`);
    
    const results = {
      valid: [],
      updated: [],
      clanChanged: [],
      notFound: [],
      errors: []
    };
    
    // 4. 모든 멤버의 상태 확인 및 업데이트
    console.log('🔄 모든 멤버 상태 확인 중...\n');
    
    for (let i = 0; i < allDbMembers.length; i++) {
      const member = allDbMembers[i];
      const progress = `[${i + 1}/${allDbMembers.length}]`;
      
      console.log(`${progress} ${member.nickname} 검증 중...`);
      
      const playerInfo = await getPlayerInfo(member.nickname, SHARD);
      
      if (playerInfo) {
        const currentClanId = playerInfo.attributes.clanId;
        
        if (currentClanId === UBD_CLAN_ID) {
          // 여전히 UBD 클랜 멤버
          console.log(`  ✅ 유효: UBD 클랜 멤버`);
          results.valid.push(member.nickname);
          
          // 멤버 정보 업데이트
          await prisma.clanMember.update({
            where: { id: member.id },
            data: {
              pubgPlayerId: playerInfo.id,
              pubgClanId: UBD_CLAN_ID,
              pubgShardId: SHARD,
              lastUpdated: new Date()
            }
          });
          results.updated.push(member.nickname);
          
        } else {
          // 다른 클랜으로 이동 또는 클랜 탈퇴
          console.log(`  ⚠️  클랜 변경: ${currentClanId || '없음'}`);
          results.clanChanged.push({
            nickname: member.nickname,
            oldClan: UBD_CLAN_ID,
            newClan: currentClanId
          });
          
          // 새 클랜 정보로 업데이트
          await prisma.clanMember.update({
            where: { id: member.id },
            data: {
              pubgPlayerId: playerInfo.id,
              pubgClanId: currentClanId,
              pubgShardId: SHARD,
              lastUpdated: new Date()
            }
          });
          
          // 클랜 변경 기록만 남기고 DB에서는 유지 (추후 삭제 고려 가능)
        }
        
      } else {
        // 플레이어를 찾을 수 없음
        console.log(`  ❌ 플레이어 없음`);
        results.notFound.push(member.nickname);
      }
      
      // 진행상황 표시
      if ((i + 1) % 5 === 0) {
        const percentage = ((i + 1) / allDbMembers.length * 100).toFixed(1);
        console.log(`\n📈 진행률: ${i + 1}/${allDbMembers.length} (${percentage}%)\n`);
      }
    }
    
    // 5. 결과 요약
    console.log('\n🎉 UBD 클랜 완전 동기화 완료!\n');
    console.log('📈 최종 결과:');
    console.log(`  - PUBG 클랜 총 멤버수: ${clanInfo.attributes.clanMemberCount}명`);
    console.log(`  - DB에서 검증한 멤버: ${allDbMembers.length}명`);
    console.log(`  - 유효한 UBD 멤버: ${results.valid.length}명`);
    console.log(`  - 정보 업데이트: ${results.updated.length}명`);
    console.log(`  - 클랜 변경/탈퇴: ${results.clanChanged.length}명`);
    console.log(`  - 플레이어 없음: ${results.notFound.length}명`);
    
    if (results.valid.length > 0) {
      console.log('\n✅ 현재 UBD 클랜 멤버들:');
      results.valid.forEach((nickname, index) => {
        console.log(`  ${index + 1}. ${nickname}`);
      });
    }
    
    if (results.clanChanged.length > 0) {
      console.log('\n⚠️  클랜 변경/탈퇴한 멤버들:');
      results.clanChanged.forEach((member, index) => {
        const newClanText = member.newClan || '클랜 없음';
        console.log(`  ${index + 1}. ${member.nickname} → ${newClanText}`);
      });
    }
    
    if (results.notFound.length > 0) {
      console.log('\n❌ 찾을 수 없는 플레이어들:');
      results.notFound.forEach((nickname, index) => {
        console.log(`  ${index + 1}. ${nickname}`);
      });
    }
    
    // 6. 커버리지 분석
    const knownMembers = results.valid.length;
    const totalPubgMembers = clanInfo.attributes.clanMemberCount;
    const coverage = ((knownMembers / totalPubgMembers) * 100).toFixed(1);
    
    console.log(`\n📊 클랜 커버리지: ${knownMembers}/${totalPubgMembers} (${coverage}%)`);
    
    const unknownMembers = totalPubgMembers - knownMembers;
    if (unknownMembers > 0) {
      console.log(`\n💡 아직 발견되지 않은 멤버: ${unknownMembers}명`);
      console.log(`   이들은 DB에 등록되지 않은 새로운 UBD 클랜 멤버들일 수 있습니다.`);
      console.log(`   클랜 멤버 발견을 위해서는 추가적인 방법이 필요합니다.`);
    }
    
    console.log('\n🎯 클랜 고유 ID를 활용한 동기화가 완료되었습니다!');
    
  } catch (error) {
    console.error('💥 동기화 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 실행
completeUbdClanSync();
