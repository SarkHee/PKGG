// scripts/discover-clans-via-players.js
// 플레이어를 통해 클랜을 발견하는 스크립트

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { analyzeClanRegion } from '../utils/clanRegionAnalyzer.js';

const prisma = new PrismaClient();

const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';

// 안전한 API 호출
async function safeApiCall(url, maxRetries = 2) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit 방지
      
      const response = await axios.get(url, {
        headers: {
          Authorization: API_KEY,
          Accept: 'application/vnd.api+json',
        },
        timeout: 10000
      });
      
      return { success: true, data: response.data };
      
    } catch (error) {
      if (error.response?.status === 429) {
        console.log(`    ⏳ Rate limit, 대기 중...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      } else if (error.response?.status === 404) {
        return { success: false, error: 'NOT_FOUND' };
      }
    }
  }
  
  return { success: false, error: 'FAILED' };
}

// 플레이어로 클랜 정보 찾기
async function findClanViaPlayer(playerName, shard = 'steam') {
  console.log(`🔍 플레이어 "${playerName}" 검색 중 (${shard})...`);
  
  // 1. 플레이어 정보 가져오기
  const playerUrl = `https://api.pubg.com/shards/${shard}/players?filter[playerNames]=${playerName}`;
  const playerResult = await safeApiCall(playerUrl);
  
  if (!playerResult.success || !playerResult.data?.data?.length) {
    console.log(`    ❌ 플레이어를 찾을 수 없음`);
    return null;
  }
  
  const player = playerResult.data.data[0];
  console.log(`    ✅ 플레이어 발견: ${player.attributes.name}`);
  
  // 2. 클랜 정보 확인
  if (!player.relationships?.clan?.data?.id) {
    console.log(`    ⚠️  클랜에 소속되지 않음`);
    return null;
  }
  
  const clanId = player.relationships.clan.data.id;
  console.log(`    🏛️  클랜 ID: ${clanId}`);
  
  // 3. 클랜 상세 정보 가져오기
  const clanUrl = `https://api.pubg.com/shards/${shard}/clans/${clanId}`;
  const clanResult = await safeApiCall(clanUrl);
  
  if (!clanResult.success) {
    console.log(`    ❌ 클랜 정보를 가져올 수 없음`);
    return null;
  }
  
  const clan = clanResult.data.data;
  console.log(`    🏆 클랜 발견: ${clan.attributes.name} (${clan.attributes.tag})`);
  console.log(`       레벨: ${clan.attributes.level}, 멤버: ${clan.attributes.memberCount}명`);
  
  return {
    player,
    clan,
    shard
  };
}

// 한국 스타일 닉네임 목록 (실제 존재할 가능성이 높은)
const koreanStyleNames = [
  'kimchi123', 'seoul_gamer', 'korean_pro', 'taeguk_warrior',
  'hangang_sniper', 'kimchi_master', 'seoul_eagle', 'korea_fighter',
  'busan_tiger', 'gangnam_style', 'korean_king', 'seoul_dragon',
  'korea_legend', 'taeguk_hero', 'seoul_phantom', 'korean_ghost'
];

// 일반적인 영어 닉네임 목록
const commonNames = [
  'sniper123', 'gaming_pro', 'master_chief', 'shadow_hunter',
  'fire_dragon', 'ice_wolf', 'thunder_bolt', 'steel_warrior',
  'phantom_blade', 'golden_eagle', 'crimson_tide', 'silver_bullet'
];

async function discoverClansViaPlayers() {
  console.log('🚀 플레이어를 통한 클랜 발견 시작...\n');
  
  const discoveredClans = new Set();
  const shards = ['steam', 'kakao'];
  
  try {
    // 한국 스타일 닉네임으로 검색
    console.log('🇰🇷 한국 스타일 닉네임으로 검색...');
    for (const playerName of koreanStyleNames.slice(0, 5)) { // 처음 5개만
      for (const shard of shards) {
        const result = await findClanViaPlayer(playerName, shard);
        if (result) {
          const key = `${result.clan.id}_${shard}`;
          if (!discoveredClans.has(key)) {
            discoveredClans.add(key);
            
            // DB에 저장할지 확인
            const existingClan = await prisma.clan.findFirst({
              where: { pubgClanId: result.clan.id }
            });
            
            if (!existingClan) {
              console.log(`    🆕 새 클랜 발견! DB에 저장 고려 대상`);
              
              // 지역 분석 (기본 정보로)
              const tempMembers = [{ nickname: result.player.attributes.name }];
              const regionAnalysis = analyzeClanRegion(result.clan.attributes, tempMembers);
              
              console.log(`       지역 추정: ${regionAnalysis.region} (${Math.round(regionAnalysis.confidence * 100)}%)`);
            } else {
              console.log(`    ↻ 이미 알고 있는 클랜`);
            }
          }
        }
        console.log(''); // 줄바꿈
      }
    }
    
    console.log(`\n🎉 클랜 발견 완료! 총 ${discoveredClans.size}개 클랜 발견`);
    
    if (discoveredClans.size > 0) {
      console.log('\n💡 발견된 클랜들을 DB에 추가하시겠습니까?');
      console.log('   (수동으로 scripts/add-discovered-clans.js 실행 필요)');
    }

  } catch (error) {
    console.error('❌ 클랜 발견 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
discoverClansViaPlayers();
