// 즉시 카테고리 생성 및 확인 스크립트
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CATEGORIES = [
  {
    id: 'strategy',
    name: '전략 & 팁',
    description: '게임 전략, 팁, 가이드를 공유하세요',
    icon: '🧠',
    color: 'blue',
    order: 1
  },
  {
    id: 'general',
    name: '자유 게시판',
    description: '자유롭게 이야기를 나누세요',
    icon: '💬',
    color: 'green',
    order: 2
  },
  {
    id: 'questions',
    name: '질문 & 답변',
    description: '궁금한 점을 물어보고 답변해주세요',
    icon: '❓',
    color: 'orange',
    order: 3
  },
  {
    id: 'clan',
    name: '클랜 모집',
    description: '클랜원을 모집하거나 클랜을 찾아보세요',
    icon: '👥',
    color: 'purple',
    order: 4
  },
  {
    id: 'showcase',
    name: '플레이 영상',
    description: '멋진 플레이 영상을 공유하세요',
    icon: '🎬',
    color: 'red',
    order: 5
  }
];

async function fixCategories() {
  try {
    console.log('🚀 카테고리 문제 해결 시작...\n');

    // 1. 기존 카테고리 확인
    console.log('1️⃣ 기존 카테고리 확인 중...');
    const existing = await prisma.forumCategory.findMany();
    console.log(`   현재 ${existing.length}개 카테고리 존재`);
    
    if (existing.length > 0) {
      existing.forEach(cat => {
        console.log(`   - ${cat.id}: ${cat.name} ${cat.icon}`);
      });
    }

    // 2. "clan" 카테고리 특별 확인
    console.log('\n2️⃣ "클랜 모집" 카테고리 확인 중...');
    const clanCategory = await prisma.forumCategory.findUnique({
      where: { id: 'clan' }
    });
    
    if (clanCategory) {
      console.log('   ✅ "clan" 카테고리 존재함');
      console.log(`   - ID: "${clanCategory.id}"`);
      console.log(`   - 이름: "${clanCategory.name}"`);
    } else {
      console.log('   ❌ "clan" 카테고리 없음 - 생성 필요!');
    }

    // 3. 모든 카테고리 재생성
    console.log('\n3️⃣ 모든 카테고리 재생성 중...');
    
    // 기존 카테고리 삭제 (게시글이 있으면 실패할 수 있음)
    try {
      await prisma.forumCategory.deleteMany({});
      console.log('   기존 카테고리 삭제 완료');
    } catch (error) {
      console.log('   기존 카테고리 삭제 실패 (게시글 때문일 수 있음)');
    }

    // 새 카테고리 생성
    for (const category of CATEGORIES) {
      try {
        const created = await prisma.forumCategory.upsert({
          where: { id: category.id },
          update: category,
          create: category
        });
        console.log(`   ✅ ${created.icon} ${created.name} (${created.id}) 생성/업데이트 완료`);
      } catch (error) {
        console.log(`   ❌ ${category.name} 생성 실패: ${error.message}`);
      }
    }

    // 4. 최종 확인
    console.log('\n4️⃣ 최종 결과 확인...');
    const finalCategories = await prisma.forumCategory.findMany({
      orderBy: { order: 'asc' }
    });
    
    console.log(`\n🎉 총 ${finalCategories.length}개 카테고리 준비 완료:`);
    finalCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.icon} ${cat.name} (ID: ${cat.id})`);
    });

    // 5. "clan" 카테고리 최종 확인
    const finalClan = await prisma.forumCategory.findUnique({
      where: { id: 'clan' }
    });

    if (finalClan) {
      console.log('\n✅ "클랜 모집" 카테고리 최종 확인 성공!');
      console.log(`   ID: "${finalClan.id}" ✓`);
      console.log(`   이름: "${finalClan.name}" ✓`);
      console.log(`   아이콘: ${finalClan.icon} ✓`);
    } else {
      console.log('\n❌ "클랜 모집" 카테고리가 여전히 없습니다!');
    }

    console.log('\n🔥 이제 포럼에서 "클랜 모집" 게시글 작성이 가능해야 합니다!');

  } catch (error) {
    console.error('\n💥 오류 발생:', error.message);
    console.error('상세 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCategories();
