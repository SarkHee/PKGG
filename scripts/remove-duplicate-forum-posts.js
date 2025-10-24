// 중복된 포럼 게시글 삭제 스크립트
// scripts/remove-duplicate-forum-posts.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeDuplicatePosts() {
  try {
    console.log('🔍 중복 게시글 검사 시작...');

    // 1. 모든 게시글 조회
    const allPosts = await prisma.forumPost.findMany({
      orderBy: {
        id: 'asc',
      },
    });

    console.log(`📊 총 ${allPosts.length}개의 게시글 발견`);

    // 2. 제목으로 중복 게시글 찾기
    const titleGroups = {};
    allPosts.forEach((post) => {
      if (!titleGroups[post.title]) {
        titleGroups[post.title] = [];
      }
      titleGroups[post.title].push(post);
    });

    let duplicateCount = 0;
    let postsToDelete = [];

    // 3. 중복된 제목을 가진 게시글 그룹 처리
    for (const [title, posts] of Object.entries(titleGroups)) {
      if (posts.length > 1) {
        console.log(`\n🔄 중복 발견: "${title}" (${posts.length}개)`);

        // 가장 오래된 게시글 하나만 남기고 나머지 삭제 대상으로 마킹
        const sortedPosts = posts.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
        const keepPost = sortedPosts[0]; // 가장 먼저 생성된 게시글 유지
        const duplicatePosts = sortedPosts.slice(1);

        console.log(`  ✅ 유지: ID ${keepPost.id} (${keepPost.createdAt})`);

        duplicatePosts.forEach((post) => {
          console.log(`  🗑️  삭제 예정: ID ${post.id} (${post.createdAt})`);
          postsToDelete.push(post.id);
          duplicateCount++;
        });
      }
    }

    // 4. 중복 게시글이 있는 경우 삭제 진행
    if (postsToDelete.length > 0) {
      console.log(
        `\n⚠️  총 ${postsToDelete.length}개의 중복 게시글을 삭제합니다.`
      );

      // 관련된 댓글과 좋아요도 함께 삭제 (ON DELETE CASCADE 설정으로 자동 처리됨)
      for (const postId of postsToDelete) {
        await prisma.forumPost.delete({
          where: { id: postId },
        });
        console.log(`✅ 게시글 ID ${postId} 삭제 완료`);
      }

      console.log(`\n🎉 중복 게시글 ${duplicateCount}개 삭제 완료!`);
    } else {
      console.log('\n✨ 중복된 게시글이 없습니다!');
    }

    // 5. 최종 상태 확인
    const finalCount = await prisma.forumPost.count();
    console.log(`📊 최종 게시글 수: ${finalCount}개`);

    // 6. 각 카테고리별 게시글 수 표시
    const categories = await prisma.forumCategory.findMany();
    console.log('\n📋 카테고리별 게시글 현황:');

    for (const category of categories) {
      const postCount = await prisma.forumPost.count({
        where: { categoryId: category.id },
      });
      console.log(`  ${category.icon} ${category.name}: ${postCount}개`);
    }
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 추가적으로 내용이 동일한 게시글도 체크하는 함수
async function checkContentDuplicates() {
  try {
    console.log('\n🔍 내용 중복 검사 시작...');

    const allPosts = await prisma.forumPost.findMany({
      orderBy: { id: 'asc' },
    });

    const contentGroups = {};
    allPosts.forEach((post) => {
      // 내용의 첫 100자로 중복 체크 (완전 동일한 내용 체크)
      const contentKey = post.content.substring(0, 100);
      if (!contentGroups[contentKey]) {
        contentGroups[contentKey] = [];
      }
      contentGroups[contentKey].push(post);
    });

    let contentDuplicateCount = 0;
    for (const [contentKey, posts] of Object.entries(contentGroups)) {
      if (posts.length > 1) {
        console.log(`\n📝 내용 중복 발견 (${posts.length}개):`);
        posts.forEach((post) => {
          console.log(`  - ID ${post.id}: "${post.title.substring(0, 30)}..."`);
        });
        contentDuplicateCount += posts.length - 1;
      }
    }

    if (contentDuplicateCount === 0) {
      console.log('✨ 내용이 중복된 게시글은 없습니다!');
    } else {
      console.log(`⚠️  내용이 유사한 게시글 ${contentDuplicateCount}개 발견`);
      console.log('필요시 수동으로 확인하여 삭제하세요.');
    }
  } catch (error) {
    console.error('❌ 내용 중복 검사 오류:', error);
  }
}

// 실행
async function main() {
  await removeDuplicatePosts();
  await checkContentDuplicates();
}

main();
