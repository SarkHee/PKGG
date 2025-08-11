// scripts/test-pubg-api.js
// PUBG API 연결 상태를 테스트하는 스크립트

import axios from 'axios';

const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';
const shards = ['steam', 'kakao', 'psn', 'xbox'];

async function testApiCall(url, description) {
  console.log(`🔍 ${description} 테스트...`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: API_KEY,
        Accept: 'application/vnd.api+json',
      },
      timeout: 10000
    });
    
    console.log(`   ✅ 성공! Status: ${response.status}`);
    if (response.data?.data) {
      console.log(`   📊 데이터 개수: ${Array.isArray(response.data.data) ? response.data.data.length : '1개 객체'}`);
    }
    return { success: true, data: response.data };
    
  } catch (error) {
    console.log(`   ❌ 실패! Error: ${error.response?.status || error.message}`);
    if (error.response?.data) {
      console.log(`   📝 응답: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return { success: false, error: error.response?.status || error.message };
  }
}

async function testPubgApi() {
  console.log('🚀 PUBG API 연결 테스트 시작...\n');
  
  // 1. 기본 API 상태 확인
  await testApiCall('https://api.pubg.com/status', 'API 상태');
  console.log('');
  
  // 2. 샤드별 테스트
  for (const shard of shards) {
    console.log(`🌐 Shard: ${shard}`);
    
    // 2-1. 샘플 플레이어 검색 (일반적인 닉네임으로)
    await testApiCall(
      `https://api.pubg.com/shards/${shard}/players?filter[playerNames]=test,player,sample`, 
      `${shard} - 샘플 플레이어 검색`
    );
    
    // 2-2. 기존 클랜 ID로 테스트 (UBD 클랜)
    if (shard === 'steam') {
      // UBD 클랜의 실제 PUBG ID로 테스트
      const ubdClanId = 'clan.eb5c32a3cc484b59981f9c61e9ea2747'; // 예시
      await testApiCall(
        `https://api.pubg.com/shards/${shard}/clans/${ubdClanId}`, 
        `${shard} - UBD 클랜 정보`
      );
      
      await testApiCall(
        `https://api.pubg.com/shards/${shard}/clans/${ubdClanId}/members`, 
        `${shard} - UBD 클랜 멤버`
      );
    }
    
    console.log('');
  }
  
  // 3. 토너먼트/리그 정보 확인
  console.log('🏆 토너먼트 정보 테스트...');
  await testApiCall('https://api.pubg.com/tournaments', '토너먼트 목록');
  
  console.log('\n🎉 API 테스트 완료!');
}

// 스크립트 실행
testPubgApi();
