// 특정 클랜 ID로 클랜 정보 가져오기 테스트
import axios from 'axios';

async function testSpecificClanEndpoint() {
  const clanId = 'clan.eb5c32a3cc484b59981f9c61e9ea2747'; // parksrk의 클랜 ID
  const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';
  
  // 가능한 클랜 엔드포인트 패턴들 테스트
  const testUrls = [
    `https://api.pubg.com/shards/steam/clans/${clanId}`,
    `https://api.pubg.com/clans/${clanId}`,
    `https://api.pubg.com/shards/steam/clans/${clanId}/members`,
    `https://api.pubg.com/clans/${clanId}/members`,
    `https://api.pubg.com/shards/steam/clans/${clanId}/info`,
    `https://api.pubg.com/clans/${clanId}/info`,
  ];
  
  console.log(`클랜 ID "${clanId}"를 사용한 엔드포인트 테스트\n`);
  
  for (const url of testUrls) {
    try {
      console.log(`테스트 URL: ${url}`);
      const response = await axios.get(url, {
        headers: {
          Authorization: API_KEY,
          Accept: 'application/vnd.api+json',
        },
      });
      
      console.log('✅ 클랜 엔드포인트 접근 성공!');
      console.log('응답 상태:', response.status);
      console.log('응답 데이터:');
      console.log(JSON.stringify(response.data, null, 2));
      console.log('\n' + '='.repeat(80) + '\n');
      
    } catch (error) {
      console.log(`❌ 실패:`);
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

// 추가로 다른 플레이어들의 ClanID도 확인
async function checkMorePlayersClanIds() {
  console.log('=== 다른 플레이어들의 ClanID 확인 ===\n');
  
  const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';
  const testPlayers = ['pororoyummy', 'Link_Of'];
  const shards = ['steam', 'kakao', 'psn', 'xbox'];
  
  for (const nickname of testPlayers) {
    console.log(`\n플레이어 "${nickname}" 확인 중...`);
    
    for (const shard of shards) {
      try {
        const response = await axios.get(`https://api.pubg.com/shards/${shard}/players?filter[playerNames]=${nickname}`, {
          headers: {
            Authorization: API_KEY,
            Accept: 'application/vnd.api+json',
          },
        });

        if (response.data.data.length > 0) {
          const player = response.data.data[0];
          console.log(`- ${shard} 샤드에서 발견`);
          console.log(`  닉네임: ${player.attributes.name}`);
          if (player.attributes.clanId) {
            console.log(`  ClanID: ${player.attributes.clanId}`);
          } else {
            console.log(`  ClanID: 없음`);
          }
          break; // 첫 번째 매치에서 중단
        }
      } catch (error) {
        // 에러는 무시하고 다음 샤드 시도
      }
    }
  }
}

// 실행
testSpecificClanEndpoint().then(() => {
  return checkMorePlayersClanIds();
});
