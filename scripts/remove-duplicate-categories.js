// 중복된 포럼 카테고리 삭제 스크립트
// scripts/remove-duplicate-categories.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeDuplicateCategories() {
  try {
    console.log('🗑️  중복 카테고리 삭제 시작...');

    // 1. 빈 'clan' 카테고리 삭제 (게시글이 0개)
    const clanCategory = await prisma.forumCategory.findUnique({
      where: { id: 'clan' },
    });

    if (clanCategory) {
      const postCount = await prisma.forumPost.count({
        where: { categoryId: 'clan' },
      });

      if (postCount === 0) {
        await prisma.forumCategory.delete({
          where: { id: 'clan' },
        });
        console.log('✅ 빈 "클랜 모집" 카테고리 (ID: clan) 삭제 완료');
      } else {
        console.log('⚠️  "clan" 카테고리에 게시글이 있어서 삭제하지 않습니다');
      }
    }

    // 2. 최종 카테고리 목록 확인
    const finalCategories = await prisma.forumCategory.findMany({
      orderBy: { order: 'asc' },
    });

    console.log('\n📋 최종 카테고리 목록:');
    for (const category of finalCategories) {
      const postCount = await prisma.forumPost.count({
        where: { categoryId: category.id },
      });
      console.log(
        `  ${category.icon} ${category.name} (${category.id}): ${postCount}개`
      );
    }

    console.log('\n🎉 카테고리 정리 완료!');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeDuplicateCategories();
