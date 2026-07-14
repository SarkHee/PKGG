// POST /api/forum/likes?postId=xxx — 게시글 좋아요 토글 (로그인 유저만)
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth].js';
import prisma from '../../../utils/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { postId } = req.query;
  if (!postId) return res.status(400).json({ error: 'postId가 필요합니다.' });

  const session = await getServerSession(req, res, authOptions);
  const googleId = session?.user?.googleId;
  if (!googleId) return res.status(401).json({ error: '로그인이 필요합니다.' });

  const postIdNum = parseInt(postId);

  try {
    const post = await prisma.forumPost.findUnique({ where: { id: postIdNum } });
    if (!post) return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });

    const existing = await prisma.forumLike.findUnique({
      where: { postId_author: { postId: postIdNum, author: googleId } },
    });

    let liked;
    if (existing) {
      await prisma.$transaction([
        prisma.forumLike.delete({ where: { id: existing.id } }),
        prisma.forumPost.update({ where: { id: postIdNum }, data: { likes: { decrement: 1 } } }),
      ]);
      liked = false;
    } else {
      await prisma.$transaction([
        prisma.forumLike.create({ data: { postId: postIdNum, author: googleId } }),
        prisma.forumPost.update({ where: { id: postIdNum }, data: { likes: { increment: 1 } } }),
      ]);
      liked = true;
    }

    const likeCount = await prisma.forumLike.count({ where: { postId: postIdNum } });
    return res.status(200).json({ liked, likeCount });
  } catch (error) {
    console.error('[forum/likes] 오류:', error.message);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
