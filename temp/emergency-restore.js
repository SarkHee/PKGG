// 긴급 카테고리 복구 스크립트
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function emergencyRestore() {
  try {
    console.log('🚨 긴급 카테고리 복구 시작...\n');

    // 현재 상태 확인
    const current = await prisma.forumCategory.findMany();
    console.log(`현재 카테고리 수: ${current.length}개`);
    
    if (current.length === 0) {
      console.log('❌ 카테고리가 모두 사라졌습니다! 즉시 복구합니다.\n');
    }

    // 5개 기본 카테고리 강제 생성
    const categories = [
      { id: 'strategy', name: '전략 & 팁', description: '게임 전략, 팁, 가이드를 공유하세요', icon: '🧠', color: 'blue', order: 1 },
      { id: 'general', name: '자유 게시판', description: '자유롭게 이야기를 나누세요', icon: '💬', color: 'green', order: 2 },
      { id: 'questions', name: '질문 & 답변', description: '궁금한 점을 물어보고 답변해주세요', icon: '❓', color: 'orange', order: 3 },
      { id: 'clan', name: '클랜 모집', description: '클랜원을 모집하거나 클랜을 찾아보세요', icon: '👥', color: 'purple', order: 4 },
      { id: 'showcase', name: '플레이 영상', description: '멋진 플레이 영상을 공유하세요', icon: '🎬', color: 'red', order: 5 }
    ];

    console.log('⚡ 카테고리 생성 중...');
    for (const cat of categories) {
      try {
        const created = await prisma.forumCategory.upsert({
          where: { id: cat.id },
          update: cat,
          create: cat
        });
        console.log(`✅ ${created.icon} ${created.name} (${created.id})`);
      } catch (error) {
        console.log(`❌ ${cat.name} 생성 실패: ${error.message}`);
      }
    }

    // 최종 확인
    const final = await prisma.forumCategory.findMany({ orderBy: { order: 'asc' } });
    console.log(`\n🎉 복구 완료! 총 ${final.length}개 카테고리:`);
    final.forEach((cat, i) => console.log(`${i+1}. ${cat.icon} ${cat.name}`));

    console.log('\n✅ 이제 포럼에서 게시글 작성이 가능합니다!');

  } catch (error) {
    console.error('💥 복구 중 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

emergencyRestore();
