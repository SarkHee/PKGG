// 플레이어 ClanID 확인 테스트
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function testClanIdInPubgApi() {
  try {
    // 데이터베이스에서 플레이어 닉네임 가져오기
    const clanMembers = await prisma.clanMember.findMany({
      take: 3,
      select: { nickname: true }
    });
    
    console.log('DB에서 가져온 플레이어들:', clanMembers.map(m => m.nickname));
    
    if (clanMembers.length === 0) {
      console.log('데이터베이스에 플레이어가 없습니다.');
      return;
    }
    
    const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';
    const shards = ['steam', 'kakao', 'psn', 'xbox'];
    
    // 첫 번째 플레이어로 테스트
    const testNickname = clanMembers[0].nickname;
    console.log(`\n플레이어 "${testNickname}"의 PUBG API 응답 확인 중...`);
    
    for (const shard of shards) {
      try {
        const response = await axios.get(`https://api.pubg.com/shards/${shard}/players?filter[playerNames]=${testNickname}`, {
          headers: {
            Authorization: API_KEY,
            Accept: 'application/vnd.api+json',
          },
        });

        if (response.data.data.length > 0) {
          const player = response.data.data[0];
          console.log(`\n=== ${shard} 샤드에서 플레이어 발견 ===`);
          console.log('플레이어 ID:', player.id);
          console.log('닉네임:', player.attributes.name);
          console.log('전체 attributes 구조:');
          console.log(JSON.stringify(player.attributes, null, 2));
          
          // ClanId 확인
          if (player.attributes.clanId) {
            console.log('🎉 ClanID 발견!:', player.attributes.clanId);
          } else {
            console.log('❌ ClanID가 없습니다.');
          }
          
          // 클랜 관련 다른 필드들 확인
          console.log('\n클랜 관련 필드들:');
          Object.keys(player.attributes).forEach(key => {
            if (key.toLowerCase().includes('clan')) {
              console.log(`- ${key}:`, player.attributes[key]);
            }
          });
          
          return; // 첫 번째 매치에서 중단
        }
      } catch (error) {
        console.log(`${shard} 샤드 실패:`, error.response?.data?.errors?.[0]?.detail || error.message);
      }
    }
    
    console.log('모든 샤드에서 플레이어를 찾을 수 없습니다.');
    
  } catch (error) {
    console.error('테스트 실행 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 클랜 엔드포인트 테스트
async function testClanEndpoint() {
  console.log('\n\n=== 클랜 엔드포인트 테스트 ===');
  
  const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';
  
  // 가능한 클랜 엔드포인트들 테스트
  const testUrls = [
    'https://api.pubg.com/shards/steam/clans',
    'https://api.pubg.com/clans',
    'https://api.pubg.com/shards/kakao/clans',
  ];
  
  for (const url of testUrls) {
    try {
      console.log(`\n테스트 URL: ${url}`);
      const response = await axios.get(url, {
        headers: {
          Authorization: API_KEY,
          Accept: 'application/vnd.api+json',
        },
      });
      
      console.log('✅ 클랜 엔드포인트 접근 성공!');
      console.log('응답 상태:', response.status);
      console.log('응답 데이터 구조:');
      console.log(JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.log(`❌ ${url} 실패:`);
      if (error.response) {
        console.log('상태 코드:', error.response.status);
        console.log('에러 메시지:', error.response.data?.errors?.[0]?.detail || error.response.statusText);
      } else {
        console.log('네트워크 오류:', error.message);
      }
    }
  }
}

// 실행
testClanIdInPubgApi().then(() => {
  return testClanEndpoint();
});
