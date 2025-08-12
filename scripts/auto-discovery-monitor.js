// 자동 발견 모니터링 스크립트
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

// 일반적인 한국 플레이어 닉네임 패턴들 (실제 검색용)
const commonKoreanNicknames = [
  'Player', 'Gamer', 'Pro', 'King', 'Master', 'Legend', 'Hero', 'Shadow',
  'Dragon', 'Tiger', 'Wolf', 'Eagle', 'Lion', 'Phoenix', 'Warrior', 'Hunter',
  'Sniper', 'Ace', 'Nova', 'Storm', 'Blade', 'Fire', 'Ice', 'Dark', 'Light'
];

// 랜덤 숫자 조합
const getRandomNickname = () => {
  const base = commonKoreanNicknames[Math.floor(Math.random() * commonKoreanNicknames.length)];
  const number = Math.floor(Math.random() * 9999) + 1;
  return `${base}${number}`;
};

// 자동 발견 실행
async function runAutoDiscovery() {
  console.log('🔍 자동 발견 시스템 시작...');
  
  let discovered = 0;
  const attempts = 20; // 20번 시도
  
  for (let i = 0; i < attempts; i++) {
    const nickname = getRandomNickname();
    
    try {
      // 로컬 API 호출
      const response = await axios.get(`http://localhost:3000/api/pubg/player?nickname=${nickname}`, {
        timeout: 10000
      });
      
      if (response.status === 200 && response.data.player) {
        discovered++;
        console.log(`✅ [${i+1}/${attempts}] 발견: ${nickname} → ${response.data.clan?.attributes?.clanName || '클랜 없음'}`);
      } else {
        console.log(`❌ [${i+1}/${attempts}] 없음: ${nickname}`);
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`❌ [${i+1}/${attempts}] 없음: ${nickname}`);
      } else {
        console.error(`🔥 [${i+1}/${attempts}] 오류: ${nickname} - ${error.message}`);
      }
    }
    
    // 1초 대기 (API 제한 고려)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 최종 통계
  const totalClans = await prisma.clan.count();
  const totalMembers = await prisma.clanMember.count();
  
  console.log('\n📊 자동 발견 완료!');
  console.log(`   새로 발견된 플레이어: ${discovered}명`);
  console.log(`   현재 DB 상태: ${totalClans}개 클랜, ${totalMembers}명 멤버`);
  
  await prisma.$disconnect();
}

// 메인 실행
if (require.main === module) {
  runAutoDiscovery().catch(console.error);
}

module.exports = { runAutoDiscovery };
