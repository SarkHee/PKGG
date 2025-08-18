// 포럼 카테고리 직접 생성
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

async function createCategories() {
  try {
    console.log('🔍 기존 카테고리 확인...');
    
    // 기존 카테고리 확인
    const existing = await prisma.forumCategory.findMany();
    console.log(`현재 카테고리: ${existing.length}개`);
    existing.forEach(cat => console.log(`  - ${cat.icon} ${cat.name} (${cat.id})`));
    
    console.log('\n📂 카테고리 생성 중...');
    
    for (const category of CATEGORIES) {
      const result = await prisma.forumCategory.upsert({
        where: { id: category.id },
        update: category,
        create: category
      });
      console.log(`✅ ${result.icon} ${result.name} 생성/업데이트됨`);
    }
    
    // 최종 확인
    const final = await prisma.forumCategory.findMany({ orderBy: { order: 'asc' } });
    console.log(`\n🎉 총 ${final.length}개 카테고리가 준비되었습니다:`);
    final.forEach(cat => console.log(`  ${cat.order}. ${cat.icon} ${cat.name} (${cat.id})`));
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createCategories();
