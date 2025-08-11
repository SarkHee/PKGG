// 클랜 멤버 관련 엔드포인트 추가 테스트
import axios from 'axios';

async function testClanMemberEndpoints() {
  const clanId = 'clan.eb5c32a3cc484b59981f9c61e9ea2747';
  const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';
  
  console.log('=== 클랜 멤버 관련 엔드포인트 테스트 ===\n');
  
  // 다양한 클랜 관련 엔드포인트 시도
  const testEndpoints = [
    // 기본 클랜 정보 (이미 성공했지만 다시 확인)
    {
      url: `https://api.pubg.com/shards/steam/clans/${clanId}`,
      description: '클랜 기본 정보'
    },
    // 클랜 멤버 관련
    {
      url: `https://api.pubg.com/shards/steam/clans/${clanId}/roster`,
      description: '클랜 로스터'
    },
    {
      url: `https://api.pubg.com/shards/steam/clans/${clanId}/players`,
      description: '클랜 플레이어 목록'
    },
    // 클랜 통계 관련
    {
      url: `https://api.pubg.com/shards/steam/clans/${clanId}/stats`,
      description: '클랜 통계'
    },
    {
      url: `https://api.pubg.com/shards/steam/clans/${clanId}/seasons`,
      description: '클랜 시즌 정보'
    },
    // include 파라미터 사용
    {
      url: `https://api.pubg.com/shards/steam/clans/${clanId}?include=members`,
      description: '클랜 정보 + 멤버 포함'
    },
    {
      url: `https://api.pubg.com/shards/steam/clans/${clanId}?include=players`,
      description: '클랜 정보 + 플레이어 포함'
    },
    {
      url: `https://api.pubg.com/shards/steam/clans/${clanId}?include=roster`,
      description: '클랜 정보 + 로스터 포함'
    }
  ];
  
  for (const endpoint of testEndpoints) {
    try {
      console.log(`테스트: ${endpoint.description}`);
      console.log(`URL: ${endpoint.url}`);
      
      const response = await axios.get(endpoint.url, {
        headers: {
          Authorization: API_KEY,
          Accept: 'application/vnd.api+json',
        },
      });
      
      console.log('✅ 성공!');
      console.log('응답 상태:', response.status);
      
      // 응답 데이터 구조 분석
      if (response.data.data) {
        console.log('데이터 타입:', response.data.data.type);
        console.log('데이터 ID:', response.data.data.id);
        if (response.data.data.attributes) {
          console.log('어트리뷰트 키들:', Object.keys(response.data.data.attributes));
        }
      }
      
      // included 데이터 확인
      if (response.data.included && response.data.included.length > 0) {
        console.log('🎉 Included 데이터 발견!');
        console.log('포함된 항목 수:', response.data.included.length);
        console.log('포함된 데이터 타입들:', [...new Set(response.data.included.map(item => item.type))]);
        
        // 첫 번째 포함된 항목의 구조 출력
        if (response.data.included[0]) {
          console.log('첫 번째 포함 항목 샘플:');
          console.log(JSON.stringify(response.data.included[0], null, 2));
        }
      }
      
      console.log('\n' + '='.repeat(80) + '\n');
      
    } catch (error) {
      console.log('❌ 실패:');
      if (error.response) {
        console.log('상태 코드:', error.response.status);
        console.log('에러 메시지:', error.response.data?.errors?.[0]?.detail || error.response.statusText);
      } else {
        console.log('네트워크 오류:', error.message);
      }
      console.log('\n');
    }
  }
}

// 클랜 검색 관련 테스트
async function testClanSearch() {
  console.log('=== 클랜 검색 엔드포인트 테스트 ===\n');
  
  const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';
  
  const searchEndpoints = [
    {
      url: 'https://api.pubg.com/shards/steam/clans?filter[clanName]=UMVOK',
      description: '클랜 이름으로 검색'
    },
    {
      url: 'https://api.pubg.com/shards/steam/clans?filter[clanTag]=UBD',
      description: '클랜 태그로 검색'
    },
    {
      url: 'https://api.pubg.com/shards/steam/clans?search=UMVOK',
      description: '클랜 검색 (search 파라미터)'
    }
  ];
  
  for (const endpoint of searchEndpoints) {
    try {
      console.log(`테스트: ${endpoint.description}`);
      console.log(`URL: ${endpoint.url}`);
      
      const response = await axios.get(endpoint.url, {
        headers: {
          Authorization: API_KEY,
          Accept: 'application/vnd.api+json',
        },
      });
      
      console.log('✅ 성공!');
      console.log('응답:', JSON.stringify(response.data, null, 2));
      console.log('\n' + '='.repeat(80) + '\n');
      
    } catch (error) {
      console.log('❌ 실패:');
      if (error.response) {
        console.log('상태 코드:', error.response.status);
        console.log('에러 메시지:', error.response.data?.errors?.[0]?.detail || error.response.statusText);
      } else {
        console.log('네트워크 오류:', error.message);
      }
      console.log('\n');
    }
  }
}

// 실행
testClanMemberEndpoints().then(() => {
  return testClanSearch();
});
