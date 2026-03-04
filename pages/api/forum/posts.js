import prisma from '../../../utils/prisma.js';
import crypto from 'crypto';


function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// 비속어 필터
const PROFANITY_WORDS = [
  '시발', '씨발', '개새끼', '병신', '죽어', '꺼져', '미친', '또라이', '씨팔', '시팔',
  '개놈', '창녀', '걸레', '등신', '개지랄', '지랄', '좆', '엿먹어', '닥쳐', '빙신',
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'retard', 'nigger', 'whore', 'cunt', 'motherfucker',
];

function checkProfanity(text) {
  const lowerText = text.toLowerCase();
  return PROFANITY_WORDS.some((word) => lowerText.includes(word.toLowerCase()));
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { category, page = 1, limit = 20, search, postId } = req.query;

      // 개별 게시물 조회
      if (postId) {
        const post = await prisma.forumPost.findUnique({
          where: { id: parseInt(postId) },
          include: {
            category: true,
            _count: { select: { replies: true, likedBy: true } },
          },
        });

        if (!post) {
          return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
        }

        await prisma.forumPost.update({
          where: { id: parseInt(postId) },
          data: { views: { increment: 1 } },
        });

        const { password: _pw, ...postWithoutPassword } = post;
        return res.status(200).json({
          post: {
            ...postWithoutPassword,
            views: post.views + 1,
            likes: post._count.likedBy,
            replyCount: post._count.replies,
            hasPassword: !!post.password,
          },
        });
      }

      // 목록 조회
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where = {};
      if (category && category !== 'all') where.categoryId = category;
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [posts, total] = await Promise.all([
        prisma.forumPost.findMany({
          where,
          select: {
            id: true, title: true, preview: true, author: true,
            categoryId: true, category: true, views: true, likes: true,
            isPinned: true, isLocked: true, createdAt: true, updatedAt: true,
            _count: { select: { replies: true, likedBy: true } },
          },
          orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
          skip,
          take: parseInt(limit),
        }),
        prisma.forumPost.count({ where }),
      ]);

      return res.status(200).json({
        posts: posts.map((p) => ({
          ...p,
          replyCount: p._count.replies,
          likeCount: p._count.likedBy,
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });

    } else if (req.method === 'POST') {
      const { title, content, preview, author, categoryId, password } = req.body;

      if (!title || !content || !author || !categoryId) {
        return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
      }

      if (checkProfanity(title) || checkProfanity(content)) {
        return res.status(400).json({ error: '부적절한 언어가 포함되어 있습니다.' });
      }

      // 카테고리 확인
      const categoryExists = await prisma.forumCategory.findUnique({ where: { id: categoryId } });
      if (!categoryExists) {
        return res.status(400).json({ error: '유효하지 않은 카테고리입니다.' });
      }

      const post = await prisma.forumPost.create({
        data: {
          title,
          content,
          preview: preview || content.replace(/\n/g, ' ').substring(0, 200),
          author,
          categoryId,
          password: password ? hashPassword(password) : null,
        },
        select: {
          id: true, title: true, author: true, categoryId: true,
          createdAt: true, views: true, likes: true,
        },
      });

      return res.status(201).json(post);

    } else if (req.method === 'DELETE') {
      const { postId, password } = req.body;

      if (!postId || !password) {
        return res.status(400).json({ error: '게시글 ID와 비밀번호가 필요합니다.' });
      }

      const post = await prisma.forumPost.findUnique({ where: { id: parseInt(postId) } });
      if (!post) {
        return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      }

      if (!post.password || post.password !== hashPassword(password)) {
        return res.status(403).json({ error: '비밀번호가 올바르지 않습니다.' });
      }

      // 관련 데이터 삭제 (cascade 미설정 항목)
      await prisma.forumLike.deleteMany({ where: { postId: parseInt(postId) } });
      await prisma.forumReply.deleteMany({ where: { postId: parseInt(postId) } });
      await prisma.forumPost.delete({ where: { id: parseInt(postId) } });

      return res.status(200).json({ message: '게시글이 삭제되었습니다.' });

    } else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Forum posts API error:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.', details: error.message });
  }
}
