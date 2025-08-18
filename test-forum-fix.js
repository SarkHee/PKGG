// 포럼 문제 진단 및 수정 테스트
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testForumFix() {
  try {
    console.log('🔍 포럼 데이터베이스 상태 확인...');

    // 1. 카테고리 확인
    const categories = await prisma.forumCategory.findMany();
    console.log('📂 현재 카테고리:', categories.length, '개');
    
    if (categories.length === 0) {
      console.log('❌ 카테고리가 없습니다. 기본 카테고리를 생성합니다...');
      
      const INITIAL_CATEGORIES = [
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

      for (const category of INITIAL_CATEGORIES) {
        await prisma.forumCategory.upsert({
          where: { id: category.id },
          update: category,
          create: category
        });
      }
      
      console.log('✅ 기본 카테고리가 생성되었습니다.');
    } else {
      console.log('✅ 카테고리가 존재합니다:');
      categories.forEach(cat => console.log(`  - ${cat.icon} ${cat.name} (${cat.id})`));
    }

    // 2. 테스트 게시글 생성
    console.log('\n📝 테스트 게시글을 생성합니다...');
    
    const testPost = await prisma.forumPost.create({
      data: {
        title: '포럼 테스트 게시글',
        content: '이것은 포럼 기능이 정상 작동하는지 확인하는 테스트 게시글입니다.',
        preview: '이것은 포럼 기능이 정상 작동하는지 확인하는 테스트 게시글입니다.',
        author: '시스템',
        categoryId: 'general'
      }
    });

    console.log('✅ 테스트 게시글이 생성되었습니다:', testPost.id);

    // 3. 게시글 목록 확인
    const posts = await prisma.forumPost.findMany({
      include: {
        category: true
      }
    });

    console.log(`\n📋 전체 게시글: ${posts.length}개`);
    posts.forEach(post => {
      console.log(`  - [${post.category.name}] ${post.title} (by ${post.author})`);
    });

    console.log('\n🎉 포럼 시스템이 정상적으로 작동합니다!');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error('상세 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testForumFix();
