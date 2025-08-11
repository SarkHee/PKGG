// include 파라미터로 실제 멤버 데이터 확인
import axios from 'axios';

async function testIncludeParameters() {
  const clanId = 'clan.eb5c32a3cc484b59981f9c61e9ea2747';
  const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';
  
  console.log('=== Include 파라미터 상세 테스트 ===\n');
  
  const includeOptions = [
    'members',
    'players', 
    'roster',
    'relationships',
    'members,players',
    'roster,players',
    'all'
  ];
  
  for (const include of includeOptions) {
    try {
      console.log(`테스트: include=${include}`);
      const url = `https://api.pubg.com/shards/steam/clans/${clanId}?include=${include}`;
      console.log(`URL: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          Authorization: API_KEY,
          Accept: 'application/vnd.api+json',
        },
      });
      
      console.log('✅ 성공!');
      console.log('응답 상태:', response.status);
      
      // 메인 데이터 확인
      if (response.data.data) {
        console.log('메인 데이터:');
        console.log('- 타입:', response.data.data.type);
        console.log('- ID:', response.data.data.id);
        console.log('- 어트리뷰트:', response.data.data.attributes);
        
        // relationships 확인
        if (response.data.data.relationships) {
          console.log('- Relationships 키들:', Object.keys(response.data.data.relationships));
          
          // 각 relationship의 데이터 확인
          Object.entries(response.data.data.relationships).forEach(([key, value]) => {
            console.log(`  - ${key}:`, value);
          });
        }
      }
      
      // included 데이터 확인
      if (response.data.included) {
        console.log(`🎉 Included 데이터 ${response.data.included.length}개 발견!`);
        
        const typeCount = {};
        response.data.included.forEach(item => {
          typeCount[item.type] = (typeCount[item.type] || 0) + 1;
        });
        
        console.log('포함된 데이터 타입별 개수:', typeCount);
        
        // 각 타입별로 첫 번째 항목 샘플 출력
        const uniqueTypes = [...new Set(response.data.included.map(item => item.type))];
        uniqueTypes.forEach(type => {
          const sample = response.data.included.find(item => item.type === type);
          console.log(`\n${type} 타입 샘플:`);
          console.log(JSON.stringify(sample, null, 2));
        });
        
        return; // 첫 번째 성공에서 중단하여 전체 응답 확인
      } else {
        console.log('❌ Included 데이터 없음');
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

// 다른 가능한 관련 엔드포인트들 테스트
async function testRelatedEndpoints() {
  console.log('=== 관련 엔드포인트 추가 테스트 ===\n');
  
  const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';
  
  // 클랜으로 플레이어 검색해보기 (역방향)
  const testUrls = [
    'https://api.pubg.com/shards/steam/players?filter[clanId]=clan.eb5c32a3cc484b59981f9c61e9ea2747',
    'https://api.pubg.com/shards/steam/players?filter[clan]=clan.eb5c32a3cc484b59981f9c61e9ea2747',
    'https://api.pubg.com/shards/steam/players?include=clan',
    'https://api.pubg.com/shards/steam/players?filter[playerNames]=parksrk&include=clan'
  ];
  
  for (const url of testUrls) {
    try {
      console.log(`테스트 URL: ${url}`);
      
      const response = await axios.get(url, {
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
        console.log('에러:', error.response.data?.errors?.[0]?.detail || error.response.statusText);
      } else {
        console.log('네트워크 오류:', error.message);
      }
      console.log('\n');
    }
  }
}

// 실행
testIncludeParameters().then(() => {
  return testRelatedEndpoints();
});
