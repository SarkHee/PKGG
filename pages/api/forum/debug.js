// 포럼 디버그 API
import prisma from '../../../utils/prisma.js';

// 프로덕션에서는 접근 차단
function isAllowed(req) {
  if (process.env.NODE_ENV !== 'production') return true
  // 프로덕션에서는 관리자 토큰 필요
  return req.headers['x-admin-token'] === process.env.ADMIN_PASSWORD
}

const CATEGORIES_TO_CREATE = [
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

export default async function handler(req, res) {
  if (!isAllowed(req)) {
    return res.status(404).json({ error: 'Not found' })
  }

  if (req.method === 'GET') {
    try {
      // 현재 카테고리 조회
      const categories = await prisma.forumCategory.findMany({
        orderBy: { order: 'asc' },
      });

      // 게시글 수 조회
      const postCount = await prisma.forumPost.count();

      return res.status(200).json({
        categories: categories,
        categoryCount: categories.length,
        postCount: postCount,
        status: 'success',
      });
    } catch (error) {
      return res.status(500).json({
        error: error.message,
        status: 'error',
      });
    }
  } else if (req.method === 'POST') {
    try {
      console.log('포럼 카테고리 생성 시작...');

      // 모든 카테고리 삭제 후 재생성
      await prisma.forumCategory.deleteMany({});

      const createdCategories = [];

      for (const category of CATEGORIES_TO_CREATE) {
        const created = await prisma.forumCategory.create({
          data: category,
        });
        createdCategories.push(created);
        console.log(`✅ 카테고리 생성: ${created.name} (${created.id})`);
      }

      return res.status(200).json({
        message: '카테고리가 성공적으로 생성되었습니다',
        categories: createdCategories,
        count: createdCategories.length,
      });
    } catch (error) {
      console.error('카테고리 생성 오류:', error);
      return res.status(500).json({
        error: error.message,
        details: error,
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
