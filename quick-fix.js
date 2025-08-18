// 즉시 실행되는 카테고리 복구
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const cats = [
    { id: 'strategy', name: '전략 & 팁', description: '게임 전략, 팁, 가이드를 공유하세요', icon: '🧠', color: 'blue', order: 1 },
    { id: 'general', name: '자유 게시판', description: '자유롭게 이야기를 나누세요', icon: '💬', color: 'green', order: 2 },
    { id: 'questions', name: '질문 & 답변', description: '궁금한 점을 물어보고 답변해주세요', icon: '❓', color: 'orange', order: 3 },
    { id: 'clan', name: '클랜 모집', description: '클랜원을 모집하거나 클랜을 찾아보세요', icon: '👥', color: 'purple', order: 4 },
    { id: 'showcase', name: '플레이 영상', description: '멋진 플레이 영상을 공유하세요', icon: '🎬', color: 'red', order: 5 }
  ];

  console.log('🔥 카테고리 즉시 복구 시작...');
  
  for (const cat of cats) {
    await prisma.forumCategory.upsert({
      where: { id: cat.id },
      update: cat,
      create: cat
    });
    console.log(`✅ ${cat.icon} ${cat.name}`);
  }
  
  const final = await prisma.forumCategory.count();
  console.log(`🎉 완료! 총 ${final}개 카테고리 복구됨`);
  
  await prisma.$disconnect();
})();
