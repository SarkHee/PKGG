// 포럼 초기화 API 엔드포인트
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  {
    id: 'strategy',
    name: '전략 & 팁',
    description: '게임 전략, 팁, 가이드를 공유하세요',
    icon: '🧠',
    color: '#3B82F6',
    order: 1,
  },
  {
    id: 'general',
    name: '자유 게시판',
    description: '자유롭게 이야기를 나누세요',
    icon: '💬',
    color: '#10B981',
    order: 2,
  },
  {
    id: 'questions',
    name: '질문 & 답변',
    description: '궁금한 점을 물어보고 답변해주세요',
    icon: '❓',
    color: '#F59E0B',
    order: 3,
  },
  {
    id: 'recruitment',
    name: '클랜 모집',
    description: '클랜원을 모집하거나 클랜을 찾아보세요',
    icon: '👥',
    color: '#8B5CF6',
    order: 4,
  },
  {
    id: 'showcase',
    name: '플레이 영상',
    description: '멋진 플레이 영상을 공유하세요',
    icon: '🎬',
    color: '#EF4444',
    order: 5,
  },
  {
    id: 'updates',
    name: '업데이트 & 뉴스',
    description: 'PUBG 업데이트 및 게임 뉴스',
    icon: '📢',
    color: '#F59E0B',
    order: 6,
  },
  {
    id: 'clan-analysis',
    name: '클랜 분석',
    description: '클랜 통계, 분석, 순위 등에 관한 정보',
    icon: '📊',
    color: '#06B6D4',
    order: 7,
  },
  {
    id: 'inquiry',
    name: '문의하기',
    description: '사이트 관련 문의 및 건의사항 (sssyck123@naver.com)',
    icon: '📧',
    color: '#F59E0B',
    order: 8,
  },
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔧 포럼 카테고리 자동 초기화 시작...');

    // 현재 카테고리 수 확인
    const existingCount = await prisma.forumCategory.count();

    if (existingCount === 0) {
      console.log('❌ 카테고리가 없습니다. 기본 카테고리를 생성합니다...');

      const createdCategories = [];
      for (const category of DEFAULT_CATEGORIES) {
        const created = await prisma.forumCategory.upsert({
          where: { id: category.id },
          update: category,
          create: category,
        });
        createdCategories.push(created);
        console.log(`✅ ${category.icon} ${category.name} 생성 완료`);
      }

      console.log('🎉 기본 포럼 카테고리 5개 생성 완료!');

      return res.status(200).json({
        message: '기본 카테고리가 생성되었습니다',
        categories: createdCategories,
        count: createdCategories.length,
      });
    } else {
      // 기존 카테고리가 있어도 누락된 기본 카테고리 보충
      const missingCategories = [];

      for (const category of DEFAULT_CATEGORIES) {
        const exists = await prisma.forumCategory.findUnique({
          where: { id: category.id },
        });

        if (!exists) {
          const created = await prisma.forumCategory.create({ data: category });
          missingCategories.push(created);
          console.log(
            `➕ 누락된 카테고리 추가: ${category.icon} ${category.name}`
          );
        }
      }

      if (missingCategories.length > 0) {
        return res.status(200).json({
          message: `누락된 ${missingCategories.length}개 카테고리가 추가되었습니다`,
          categories: missingCategories,
          existingCount: existingCount,
        });
      } else {
        return res.status(200).json({
          message: '모든 기본 카테고리가 이미 존재합니다',
          existingCount: existingCount,
        });
      }
    }
  } catch (error) {
    console.error('❌ 포럼 카테고리 초기화 실패:', error);
    return res.status(500).json({
      error: '카테고리 초기화에 실패했습니다',
      details: error.message,
    });
  } finally {
    await prisma.$disconnect();
  }
}
