// scripts/periodic-sync.js
// 정기적으로 DB의 모든 멤버들을 PUBG API와 동기화

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const API_KEY = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o';

async function periodicSync() {
  console.log('🔄 정기 동기화 시작...\n');
  
  try {
    // 모든 멤버 가져오기
    const members = await prisma.clanMember.findMany({
      include: { clan: true },
      orderBy: { lastUpdated: 'asc' }  // 가장 오래된 것부터
    });

    console.log(`📊 총 ${members.length}명의 멤버 동기화 예정\n`);

    let updated = 0;
    let errors = 0;

    for (const [index, member] of members.entries()) {
      if (index > 0 && index % 10 === 0) {
        console.log(`⏱️  진행률: ${index}/${members.length} (${Math.round(index/members.length*100)}%)`);
      }

      try {
        // API 호출 제한 (1초당 1회)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 플레이어 정보 다시 가져오기
        const response = await axios.get(`http://localhost:3000/api/pubg/player?nickname=${member.nickname}`);
        
        if (response.data.player) {
          updated++;
          console.log(`✅ ${member.nickname} (${member.clan.name}) - 업데이트됨`);
        }
        
      } catch (error) {
        errors++;
        console.log(`❌ ${member.nickname} - 실패: ${error.message}`);
      }
    }

    console.log(`\n🎉 정기 동기화 완료!`);
    console.log(`   ✅ 성공: ${updated}명`);
    console.log(`   ❌ 실패: ${errors}명`);

  } catch (error) {
    console.error('❌ 동기화 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

periodicSync();
