// scripts/sync-ubd-clan-members-by-id.js
// UBD 클랜 고유 ID를 사용하여 해당 클랜 멤버들을 최신화하는 스크립트

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';
const UBD_CLAN_ID = 'clan.eb5c32a3cc484b59981f9c61e9ea2747';
const SHARD = 'steam'; // UBD 클랜이 있는 샤드

// 클랜 정보 가져오기
async function getClanInfo(clanId, shard) {
  try {
    const response = await axios.get(`https://api.pubg.com/shards/${shard}/clans/${clanId}`, {
      headers: {
        Authorization: API_KEY,
        Accept: 'application/vnd.api+json',
      },
    });
    return response.data.data;
  } catch (error) {
    console.error(`클랜 정보 가져오기 실패: ${error.response?.status} ${error.response?.statusText}`);
    return null;
  }
}

// 플레이어 정보 가져오기 (특정 샤드에서)
async function getPlayerInfo(nickname, shard) {
  try {
    const response = await axios.get(`https://api.pubg.com/shards/${shard}/players?filter[playerNames]=${nickname}`, {
      headers: {
        Authorization: API_KEY,
        Accept: 'application/vnd.api+json',
      },
    });

    if (response.data.data.length > 0) {
      return response.data.data[0];
    }
    return null;
  } catch (error) {
    console.warn(`${nickname} 플레이어 정보 가져오기 실패: ${error.response?.status}`);
    return null;
  }
}

// 클랜에 속한 모든 플레이어들을 찾는 방법 (DB에서 현재 알고 있는 멤버들 기반)
async function findClanMembersInPubgApi(clanId, shard) {
  console.log(`🔍 클랜 ${clanId}의 멤버들을 PUBG API에서 찾는 중...\n`);
  
  // 1. 현재 DB에서 해당 클랜 ID를 가진 멤버들 가져오기
  const knownMembers = await prisma.clanMember.findMany({
    where: { pubgClanId: clanId }
  });
  
  console.log(`📋 현재 DB에 등록된 ${clanId} 멤버: ${knownMembers.length}명`);
  
  const validMembers = [];
  const invalidMembers = [];
  const updatedMembers = [];
  
  for (let i = 0; i < knownMembers.length; i++) {
    const member = knownMembers[i];
    console.log(`[${i + 1}/${knownMembers.length}] ${member.nickname} 검증 중...`);
    
    try {
      const playerInfo = await getPlayerInfo(member.nickname, shard);
      
      if (playerInfo && playerInfo.attributes.clanId === clanId) {
        console.log(`  ✅ 유효한 멤버: ${member.nickname}`);
        validMembers.push({
          dbMember: member,
          pubgPlayer: playerInfo
        });
        
        // 멤버 정보 업데이트
        await prisma.clanMember.update({
          where: { id: member.id },
          data: {
            pubgPlayerId: playerInfo.id,
            pubgShardId: shard,
            lastUpdated: new Date()
          }
        });
        updatedMembers.push(member.nickname);
        
      } else if (playerInfo && playerInfo.attributes.clanId !== clanId) {
        console.log(`  ⚠️  클랜 변경: ${member.nickname} (현재 클랜: ${playerInfo.attributes.clanId || '없음'})`);
        invalidMembers.push({
          nickname: member.nickname,
          reason: '클랜 변경',
          currentClan: playerInfo.attributes.clanId
        });
        
        // 클랜 ID 업데이트 (다른 클랜으로 이동한 경우)
        await prisma.clanMember.update({
          where: { id: member.id },
          data: {
            pubgClanId: playerInfo.attributes.clanId,
            pubgPlayerId: playerInfo.id,
            pubgShardId: shard,
            lastUpdated: new Date()
          }
        });
        
      } else {
        console.log(`  ❌ 플레이어 없음: ${member.nickname}`);
        invalidMembers.push({
          nickname: member.nickname,
          reason: '플레이어 존재하지 않음',
          currentClan: null
        });
      }
      
      // API 요청 제한 방지
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error(`  💥 ${member.nickname} 처리 중 오류:`, error.message);
      invalidMembers.push({
        nickname: member.nickname,
        reason: 'API 오류',
        currentClan: null
      });
    }
  }
  
  return {
    validMembers,
    invalidMembers,
    updatedMembers
  };
}

// 다른 방법: 모든 플레이어를 샘플링해서 해당 클랜 멤버 찾기 (실험적)
async function discoverNewClanMembers(clanId, shard, sampleSize = 20) {
  console.log(`\n🎲 새로운 클랜 멤버 발견 시도 (샘플링)...\n`);
  
  // 일반적인 닉네임 패턴들로 시도
  const commonPatterns = [
    // 숫자 조합
    ...Array.from({length: 10}, (_, i) => `player${i}`),
    ...Array.from({length: 10}, (_, i) => `user${i}`),
    ...Array.from({length: 10}, (_, i) => `gamer${i}`),
    // 알파벳 조합
    'test', 'demo', 'sample', 'good', 'best', 'pro', 'new', 'old',
    // 한국어 일반 패턴
    'korean', 'pubg', 'game', 'play', 'win', 'kill', 'chicken'
  ];
  
  const discoveredMembers = [];
  let attempts = 0;
  
  for (const pattern of commonPatterns.slice(0, sampleSize)) {
    attempts++;
    try {
      console.log(`[${attempts}/${sampleSize}] "${pattern}" 시도 중...`);
      
      const playerInfo = await getPlayerInfo(pattern, shard);
      
      if (playerInfo && playerInfo.attributes.clanId === clanId) {
        console.log(`  🎉 새 멤버 발견: ${playerInfo.attributes.name}`);
        
        // DB에 이미 존재하는지 확인
        const existingMember = await prisma.clanMember.findFirst({
          where: {
            nickname: playerInfo.attributes.name,
            pubgClanId: clanId
          }
        });
        
        if (!existingMember) {
          discoveredMembers.push(playerInfo);
          console.log(`    ✨ 완전히 새로운 멤버!`);
        } else {
          console.log(`    ℹ️  이미 DB에 존재함`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      // 에러는 무시하고 계속
    }
  }
  
  return discoveredMembers;
}

async function syncUbdClanById() {
  console.log('🏆 UBD 클랜 고유 ID로 멤버 최신화 시작...\n');
  console.log(`🎯 타겟 클랜 ID: ${UBD_CLAN_ID}`);
  console.log(`🌍 샤드: ${SHARD}\n`);
  
  try {
    // 1. 클랜 정보 확인
    console.log('📊 클랜 정보 확인 중...');
    const clanInfo = await getClanInfo(UBD_CLAN_ID, SHARD);
    
    if (!clanInfo) {
      console.error('❌ 클랜 정보를 가져올 수 없습니다.');
      return;
    }
    
    console.log(`✅ 클랜 정보 확인:`);
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
    
    // 3. 현재 알고 있는 멤버들 검증 및 업데이트
    const memberResults = await findClanMembersInPubgApi(UBD_CLAN_ID, SHARD);
    
    // 4. 새로운 멤버 발견 시도 (실험적)
    const newMembers = await discoverNewClanMembers(UBD_CLAN_ID, SHARD, 15);
    
    // 5. 결과 요약
    console.log('\n🎉 UBD 클랜 최신화 완료!\n');
    console.log('📈 결과 요약:');
    console.log(`  - PUBG 클랜 총 멤버수: ${clanInfo.attributes.clanMemberCount}명`);
    console.log(`  - DB에서 유효 확인: ${memberResults.validMembers.length}명`);
    console.log(`  - 정보 업데이트: ${memberResults.updatedMembers.length}명`);
    console.log(`  - 클랜 변경/탈퇴: ${memberResults.invalidMembers.length}명`);
    console.log(`  - 새로 발견: ${newMembers.length}명`);
    
    if (memberResults.invalidMembers.length > 0) {
      console.log('\n⚠️  클랜 변경/탈퇴한 멤버들:');
      memberResults.invalidMembers.forEach((member, index) => {
        console.log(`  ${index + 1}. ${member.nickname} - ${member.reason}`);
        if (member.currentClan) {
          console.log(`     현재 클랜: ${member.currentClan}`);
        }
      });
    }
    
    if (newMembers.length > 0) {
      console.log('\n🎉 새로 발견된 멤버들:');
      newMembers.forEach((player, index) => {
        console.log(`  ${index + 1}. ${player.attributes.name}`);
      });
    }
    
    const totalKnownMembers = memberResults.validMembers.length;
    const pubgTotalMembers = clanInfo.attributes.clanMemberCount;
    const coverage = ((totalKnownMembers / pubgTotalMembers) * 100).toFixed(1);
    
    console.log(`\n📊 클랜 멤버 커버리지: ${totalKnownMembers}/${pubgTotalMembers} (${coverage}%)`);
    
    if (coverage < 100) {
      console.log(`\n💡 권장사항:`);
      console.log(`  - ${pubgTotalMembers - totalKnownMembers}명의 멤버가 아직 발견되지 않았습니다`);
      console.log(`  - 수동으로 알려진 멤버 닉네임을 추가하거나`);
      console.log(`  - 게임 내에서 클랜 멤버 목록을 확인해보세요`);
    }
    
  } catch (error) {
    console.error('💥 동기화 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 실행
syncUbdClanById();
