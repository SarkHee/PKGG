// scripts/discover-via-existing-players.js
// 기존 DB의 플레이어들을 통해 새로운 클랜을 발견하는 스크립트

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { analyzeClanRegion } from '../utils/clanRegionAnalyzer.js';

const prisma = new PrismaClient();

const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';

// 안전한 API 호출
async function safeApiCall(url) {
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await axios.get(url, {
      headers: {
        Authorization: API_KEY,
        Accept: 'application/vnd.api+json',
      },
      timeout: 10000
    });
    
    return { success: true, data: response.data };
    
  } catch (error) {
    return { success: false, error: error.response?.status || error.message };
  }
}

// 플레이어의 최근 매치에서 다른 플레이어들 찾기
async function findPlayersFromMatches(playerName, shard = 'steam') {
  console.log(`🎮 ${playerName}의 최근 매치 분석 중...`);
  
  // 1. 플레이어 정보 가져오기
  const playerUrl = `https://api.pubg.com/shards/${shard}/players?filter[playerNames]=${playerName}`;
  const playerResult = await safeApiCall(playerUrl);
  
  if (!playerResult.success || !playerResult.data?.data?.length) {
    console.log(`    ❌ 플레이어를 찾을 수 없음`);
    return [];
  }
  
  const player = playerResult.data.data[0];
  
  // 2. 최근 매치 목록 가져오기
  const matchIds = player.relationships?.matches?.data?.slice(0, 3) || []; // 최근 3경기만
  console.log(`    📊 분석할 매치: ${matchIds.length}개`);
  
  const foundPlayers = new Set();
  
  for (const matchRef of matchIds) {
    console.log(`    🔍 매치 ${matchRef.id.slice(-8)}... 분석 중`);
    
    // 매치 상세 정보 가져오기
    const matchUrl = `https://api.pubg.com/shards/${shard}/matches/${matchRef.id}`;
    const matchResult = await safeApiCall(matchUrl);
    
    if (matchResult.success && matchResult.data?.included) {
      // 매치에 참여한 모든 플레이어 찾기
      const participants = matchResult.data.included.filter(item => item.type === 'participant');
      console.log(`       👥 참여자: ${participants.length}명`);
      
      participants.forEach(participant => {
        const name = participant.attributes?.stats?.name;
        if (name && name !== playerName) {
          foundPlayers.add(name);
        }
      });
    }
  }
  
  console.log(`    ✅ 총 ${foundPlayers.size}명의 플레이어 발견`);
  return Array.from(foundPlayers);
}

// 플레이어로 클랜 정보 찾기
async function findClanViaPlayer(playerName, shard = 'steam') {
  const playerUrl = `https://api.pubg.com/shards/${shard}/players?filter[playerNames]=${playerName}`;
  const playerResult = await safeApiCall(playerUrl);
  
  if (!playerResult.success || !playerResult.data?.data?.length) {
    return null;
  }
  
  const player = playerResult.data.data[0];
  
  // 클랜 정보 확인
  if (!player.relationships?.clan?.data?.id) {
    return null;
  }
  
  const clanId = player.relationships.clan.data.id;
  
  // 클랜 상세 정보 가져오기
  const clanUrl = `https://api.pubg.com/shards/${shard}/clans/${clanId}`;
  const clanResult = await safeApiCall(clanUrl);
  
  if (!clanResult.success) {
    return null;
  }
  
  return {
    player,
    clan: clanResult.data.data,
    shard
  };
}

async function discoverViaExistingPlayers() {
  console.log('🚀 기존 플레이어를 통한 클랜 발견 시작...\n');
  
  try {
    // DB에서 기존 플레이어들 가져오기
    const existingMembers = await prisma.clanMember.findMany({
      select: { nickname: true },
      take: 10 // 처음 10명만
    });
    
    console.log(`📋 분석할 기존 멤버: ${existingMembers.length}명\n`);
    
    const discoveredClans = new Map();
    const shards = ['steam', 'kakao'];
    
    // 각 기존 멤버에 대해
    for (const member of existingMembers.slice(0, 3)) { // 처음 3명만 테스트
      console.log(`🎯 ${member.nickname} 분석 중...`);
      
      for (const shard of shards) {
        // 1. 해당 플레이어의 매치에서 다른 플레이어들 찾기
        const foundPlayers = await findPlayersFromMatches(member.nickname, shard);
        
        // 2. 찾은 플레이어들 중 일부의 클랜 확인
        for (const playerName of foundPlayers.slice(0, 5)) { // 처음 5명만
          const result = await findClanViaPlayer(playerName, shard);
          
          if (result) {
            const clanKey = `${result.clan.id}_${shard}`;
            
            if (!discoveredClans.has(clanKey)) {
              discoveredClans.set(clanKey, result);
              
              console.log(`    🆕 새 클랜 발견!`);
              console.log(`       클랜명: ${result.clan.attributes.name} (${result.clan.attributes.tag})`);
              console.log(`       레벨: ${result.clan.attributes.level}, 멤버: ${result.clan.attributes.memberCount}명`);
              
              // 기존 DB에 있는지 확인
              const existingClan = await prisma.clan.findFirst({
                where: { pubgClanId: result.clan.id }
              });
              
              if (existingClan) {
                console.log(`       ↻ 이미 DB에 존재함`);
              } else {
                console.log(`       ✨ 완전히 새로운 클랜!`);
                
                // 간단한 지역 분석
                const tempMembers = [{ nickname: result.player.attributes.name }];
                const regionAnalysis = analyzeClanRegion(result.clan.attributes, tempMembers);
                console.log(`       🌍 추정 지역: ${regionAnalysis.region}`);
              }
            }
          }
        }
      }
      
      console.log(''); // 줄바꿈
    }
    
    console.log(`\n🎉 발견 완료! 총 ${discoveredClans.size}개의 새로운 클랜 발견`);
    
    if (discoveredClans.size > 0) {
      console.log('\n📋 발견된 클랜 목록:');
      for (const [key, result] of discoveredClans) {
        console.log(`   - ${result.clan.attributes.name} (${result.clan.attributes.tag}) - ${result.shard}`);
      }
    }

  } catch (error) {
    console.error('❌ 발견 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
discoverViaExistingPlayers();
