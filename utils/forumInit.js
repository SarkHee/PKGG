// 포럼 초기화 유틸리티 - 서버 시작시 자동 실행
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  {
    id: 'strategy',
    name: '전략 & 팁',
    description: '게임 전략, 팁, 가이드를 공유하세요',
    icon: '🧠',
    color: 'blue',
    order: 1,
  },
  {
    id: 'general',
    name: '자유 게시판',
    description: '자유롭게 이야기를 나누세요',
    icon: '💬',
    color: 'green',
    order: 2,
  },
  {
    id: 'questions',
    name: '질문 & 답변',
    description: '궁금한 점을 물어보고 답변해주세요',
    icon: '❓',
    color: 'orange',
    order: 3,
  },
  {
    id: 'clan',
    name: '클랜 모집',
    description: '클랜원을 모집하거나 클랜을 찾아보세요',
    icon: '👥',
    color: 'purple',
    order: 4,
  },
  {
    id: 'showcase',
    name: '플레이 영상',
    description: '멋진 플레이 영상을 공유하세요',
    icon: '🎬',
    color: 'red',
    order: 5,
  },
];

export async function initializeForumCategories() {
  try {
    console.log('🔧 포럼 카테고리 초기화 확인 중...');

    // 현재 카테고리 수 확인
    const existingCount = await prisma.forumCategory.count();

    if (existingCount === 0) {
      console.log('❌ 카테고리가 없습니다. 기본 카테고리를 생성합니다...');

      for (const category of DEFAULT_CATEGORIES) {
        await prisma.forumCategory.upsert({
          where: { id: category.id },
          update: category,
          create: category,
        });
        console.log(`✅ ${category.icon} ${category.name} 생성 완료`);
      }

      console.log('🎉 기본 포럼 카테고리 5개 생성 완료!');
    } else {
      console.log(`✅ 포럼 카테고리 ${existingCount}개 확인됨`);

      // 누락된 기본 카테고리가 있는지 확인하고 보충
      for (const category of DEFAULT_CATEGORIES) {
        const exists = await prisma.forumCategory.findUnique({
          where: { id: category.id },
        });

        if (!exists) {
          await prisma.forumCategory.create({ data: category });
          console.log(
            `➕ 누락된 카테고리 추가: ${category.icon} ${category.name}`
          );
        }
      }
    }

    return true;
  } catch (error) {
    console.error('❌ 포럼 카테고리 초기화 실패:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// 기본 카테고리 목록 내보내기
export { DEFAULT_CATEGORIES };
