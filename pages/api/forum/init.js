import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const VALID_CATEGORIES = [
  { id: 'strategy', name: '전략 & 팁', description: '게임 전략, 팁, 가이드를 공유하세요', icon: '🧠', color: '#3B82F6', order: 1 },
  { id: 'general', name: '자유 게시판', description: '자유롭게 이야기를 나누세요', icon: '💬', color: '#10B981', order: 2 },
  { id: 'questions', name: '질문 & 답변', description: '궁금한 점을 물어보고 답변해주세요', icon: '❓', color: '#F59E0B', order: 3 },
  { id: 'recruitment', name: '클랜 모집', description: '클랜원을 모집하거나 클랜을 찾아보세요', icon: '👥', color: '#8B5CF6', order: 4 },
];

// 제거할 카테고리 ID 목록
const REMOVE_CATEGORY_IDS = ['showcase', 'updates', 'clan-analysis', 'inquiry', 'clan'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. 불필요한 카테고리 게시글을 general로 이전 후 카테고리 삭제
    for (const catId of REMOVE_CATEGORY_IDS) {
      const exists = await prisma.forumCategory.findUnique({ where: { id: catId } });
      if (exists) {
        // 해당 카테고리 게시글을 general로 이전
        await prisma.forumPost.updateMany({
          where: { categoryId: catId },
          data: { categoryId: 'general' },
        });
        await prisma.forumCategory.delete({ where: { id: catId } });
        console.log(`삭제: ${catId}`);
      }
    }

    // 2. 유효한 카테고리 upsert
    for (const category of VALID_CATEGORIES) {
      await prisma.forumCategory.upsert({
        where: { id: category.id },
        update: category,
        create: category,
      });
    }

    const categories = await prisma.forumCategory.findMany({ orderBy: { order: 'asc' } });
    return res.status(200).json({ message: '초기화 완료', categories });
  } catch (error) {
    console.error('포럼 초기화 실패:', error);
    return res.status(500).json({ error: '초기화 실패', details: error.message });
  } finally {
    await prisma.$disconnect();
  }
}
