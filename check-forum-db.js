// 데이터베이스 카테고리 확인 스크립트
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCategories() {
  try {
    console.log('📂 데이터베이스 카테고리 확인 중...');
    
    const categories = await prisma.forumCategory.findMany({
      orderBy: { order: 'asc' }
    });
    
    console.log(`\n✅ 총 ${categories.length}개 카테고리 발견:`);
    categories.forEach((cat, index) => {
      console.log(`${index + 1}. ID: "${cat.id}" | 이름: "${cat.name}" | 아이콘: ${cat.icon}`);
    });
    
    // 클랜 카테고리 특별 확인
    const clanCategory = await prisma.forumCategory.findUnique({
      where: { id: 'clan' }
    });
    
    if (clanCategory) {
      console.log('\n🎯 클랜 카테고리 상세 정보:');
      console.log(`   ID: "${clanCategory.id}"`);
      console.log(`   이름: "${clanCategory.name}"`);
      console.log(`   설명: "${clanCategory.description}"`);
      console.log(`   아이콘: ${clanCategory.icon}`);
    } else {
      console.log('\n❌ "clan" ID를 가진 카테고리를 찾을 수 없습니다!');
    }
    
    // 게시글 수도 확인
    const postCount = await prisma.forumPost.count();
    console.log(`\n📝 총 게시글 수: ${postCount}개`);
    
    if (postCount > 0) {
      const posts = await prisma.forumPost.findMany({
        select: { id: true, title: true, categoryId: true },
        take: 5
      });
      console.log('\n최근 게시글:');
      posts.forEach(post => {
        console.log(`   - [${post.categoryId}] ${post.title}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error('상세:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCategories();
