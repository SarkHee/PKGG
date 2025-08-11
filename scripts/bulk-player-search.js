// scripts/bulk-player-search.js
// 여러 닉네임을 한 번에 검색하고 자동 저장

import axios from 'axios';

const nicknames = [
  // 여기에 검색하고 싶은 닉네임들을 추가
  'player1',
  'player2', 
  'player3'
  // ... 더 많은 닉네임들
];

async function bulkSearch() {
  console.log('🔍 대량 플레이어 검색 시작...\n');
  console.log(`📋 검색할 플레이어: ${nicknames.length}명\n`);

  let found = 0;
  let notFound = 0;
  let errors = 0;

  for (const [index, nickname] of nicknames.entries()) {
    try {
      console.log(`[${index + 1}/${nicknames.length}] ${nickname} 검색 중...`);
      
      // API 호출 제한
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const response = await axios.get(`http://localhost:3000/api/pubg/player?nickname=${nickname}`);
      
      if (response.data.player) {
        const clan = response.data.clan;
        if (clan) {
          console.log(`  ✅ 발견! 클랜: ${clan.attributes.clanName} (${clan.attributes.clanTag})`);
        } else {
          console.log(`  ✅ 발견! (클랜 없음)`);
        }
        found++;
      }
      
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`  ❌ 플레이어를 찾을 수 없음`);
        notFound++;
      } else {
        console.log(`  ⚠️  오류: ${error.message}`);
        errors++;
      }
    }
  }

  console.log(`\n🎉 대량 검색 완료!`);
  console.log(`   ✅ 발견: ${found}명`);
  console.log(`   ❌ 미발견: ${notFound}명`);
  console.log(`   ⚠️  오류: ${errors}명`);
}

// 사용법: 위의 nicknames 배열에 검색하고 싶은 닉네임들을 추가하고 실행
// node scripts/bulk-player-search.js

bulkSearch();
