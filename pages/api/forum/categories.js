// API 엔드포인트: 포럼 카테고리 조회
// pages/api/forum/categories.js

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // 카테고리별 게시글 수도 함께 조회
      const categories = await prisma.forumCategory.findMany({
        include: {
          _count: {
            select: { posts: true },
          },
        },
        orderBy: { order: 'asc' },
      });

      res.status(200).json(
        categories.map((category) => ({
          ...category,
          postCount: category._count.posts,
        }))
      );
    } else if (req.method === 'POST') {
      // 카테고리 생성 (관리자용)
      const { id, name, description, icon, color, order = 0 } = req.body;

      if (!id || !name) {
        return res.status(400).json({ error: 'ID와 이름은 필수입니다.' });
      }

      const category = await prisma.forumCategory.create({
        data: { id, name, description, icon, color, order },
      });

      res.status(201).json(category);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Forum categories API error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  } finally {
    await prisma.$disconnect();
  }
}
