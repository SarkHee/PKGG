import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth].js';
import prisma from '../../../utils/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.googleId) return res.status(401).json({ error: '로그인이 필요합니다.' });

  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [posts, total] = await Promise.all([
    prisma.forumPost.findMany({
      where: { googleId: session.user.googleId },
      select: {
        id: true, title: true, author: true, categoryId: true,
        category: { select: { name: true, icon: true } },
        views: true, likes: true, isPinned: true, createdAt: true,
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.forumPost.count({ where: { googleId: session.user.googleId } }),
  ]);

  return res.json({
    posts: posts.map((p) => ({ ...p, replyCount: p._count.replies })),
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  });
}
