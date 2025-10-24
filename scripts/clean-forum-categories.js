// 중복된 포럼 카테고리 확인 및 정리 스크립트
// scripts/clean-forum-categories.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanForumCategories() {
  try {
    console.log('🔍 포럼 카테고리 중복 검사 시작...');

    // 1. 모든 카테고리 조회
    const allCategories = await prisma.forumCategory.findMany({
      orderBy: { id: 'asc' },
    });

    console.log(`📊 총 ${allCategories.length}개의 카테고리 발견`);

    // 2. 카테고리 목록 출력
    console.log('\n📋 현재 카테고리 목록:');
    allCategories.forEach((category) => {
      console.log(`  ${category.icon} ${category.name} (ID: ${category.id})`);
    });

    // 3. 이름으로 중복 카테고리 찾기
    const nameGroups = {};
    allCategories.forEach((category) => {
      if (!nameGroups[category.name]) {
        nameGroups[category.name] = [];
      }
      nameGroups[category.name].push(category);
    });

    let duplicateFound = false;
    for (const [name, categories] of Object.entries(nameGroups)) {
      if (categories.length > 1) {
        console.log(`\n🔄 중복 발견: "${name}" (${categories.length}개)`);
        categories.forEach((cat) => {
          console.log(`  - ID: ${cat.id}, 생성일: ${cat.createdAt}`);
        });
        duplicateFound = true;
      }
    }

    if (!duplicateFound) {
      console.log('\n✨ 중복된 카테고리가 없습니다!');
    }

    // 4. 각 카테고리별 게시글 수 확인
    console.log('\n📊 카테고리별 게시글 수:');
    for (const category of allCategories) {
      const postCount = await prisma.forumPost.count({
        where: { categoryId: category.id },
      });
      console.log(
        `  ${category.icon} ${category.name} (${category.id}): ${postCount}개`
      );
    }
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanForumCategories();
