// 유저 검색 및 DB 저장 테스트 스크립트
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testUserSearch(nickname) {
  try {
    console.log(`🔍 "${nickname}" 유저 검색 테스트 시작...`);
    
    // 1. API 호출 전 DB 상태 확인
    const beforeCount = await prisma.clanMember.count({
      where: {
        nickname: {
          contains: nickname,
          mode: 'insensitive'
        }
      }
    });
    
    console.log(`📊 검색 전 DB 상태: "${nickname}" 관련 유저 ${beforeCount}명`);
    
    // 2. 로컬 API 호출
    const response = await fetch(`http://localhost:3000/api/pubg/player?nickname=${nickname}`);
    
    console.log(`📡 API 응답: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ 플레이어 발견: ${data.player?.attributes?.name || '정보 없음'}`);
      console.log(`🏢 클랜 정보: ${data.clan?.attributes?.clanName || '클랜 없음'}`);
    } else {
      console.log(`❌ API 오류: ${response.status}`);
    }
    
    // 3. 몇 초 후 DB 상태 재확인
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const afterCount = await prisma.clanMember.count({
      where: {
        nickname: {
          contains: nickname,
          mode: 'insensitive'
        }
      }
    });
    
    console.log(`📊 검색 후 DB 상태: "${nickname}" 관련 유저 ${afterCount}명`);
    
    if (afterCount > beforeCount) {
      console.log(`🎉 성공! ${afterCount - beforeCount}명의 새 유저가 DB에 저장됨`);
      
      // 새로 추가된 유저 정보 출력
      const newUsers = await prisma.clanMember.findMany({
        where: {
          nickname: {
            contains: nickname,
            mode: 'insensitive'
          }
        },
        include: {
          clan: {
            select: {
              name: true,
              pubgClanTag: true
            }
          }
        },
        orderBy: {
          lastUpdated: 'desc'
        }
      });
      
      newUsers.forEach(user => {
        console.log(`   📋 ${user.nickname} → ${user.clan?.name || '독립 멤버'} (${user.clan?.pubgClanTag || 'N/A'})`);
      });
    } else {
      console.log(`⚠️  DB 저장 실패 또는 이미 존재하는 유저`);
    }
    
  } catch (error) {
    console.error('테스트 오류:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// 명령행 인수로 전달된 닉네임 사용
const nickname = process.argv[2] || 'brz_rixsa';
testUserSearch(nickname);
