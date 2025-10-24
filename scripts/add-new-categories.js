// 새로운 포럼 카테고리 추가 스크립트
// scripts/add-new-categories.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addNewCategories() {
  try {
    console.log('🆕 새로운 카테고리 추가 시작...');

    // 1. 클랜 분석 카테고리 추가
    const clanAnalysisCategory = {
      id: 'clan-analysis',
      name: '클랜 분석',
      description: '클랜 통계, 분석, 순위 등에 관한 정보',
      icon: '📊', // 차트/분석 아이콘
      color: '#06B6D4', // cyan 색상
      order: 7,
    };

    await prisma.forumCategory.upsert({
      where: { id: clanAnalysisCategory.id },
      update: clanAnalysisCategory,
      create: clanAnalysisCategory,
    });

    console.log('✅ 클랜 분석 카테고리 추가 완료');

    // 2. 문의하기 카테고리 추가
    const inquiryCategory = {
      id: 'inquiry',
      name: '문의하기',
      description: '사이트 관련 문의 및 건의사항 (sssyck123@naver.com)',
      icon: '📧', // 메일 아이콘
      color: '#F59E0B', // amber 색상
      order: 8,
    };

    await prisma.forumCategory.upsert({
      where: { id: inquiryCategory.id },
      update: inquiryCategory,
      create: inquiryCategory,
    });

    console.log('✅ 문의하기 카테고리 추가 완료');

    // 3. 최종 카테고리 목록 확인
    const allCategories = await prisma.forumCategory.findMany({
      orderBy: { order: 'asc' },
    });

    console.log('\n📋 전체 카테고리 목록:');
    for (const category of allCategories) {
      const postCount = await prisma.forumPost.count({
        where: { categoryId: category.id },
      });
      console.log(
        `  ${category.icon} ${category.name} (${category.id}): ${postCount}개`
      );
    }

    console.log('\n🎉 새로운 카테고리 추가 완료!');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addNewCategories();
