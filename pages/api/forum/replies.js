import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

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
      const { postId } = req.query;
      if (!postId) {
        return res.status(400).json({ error: 'postId가 필요합니다.' });
      }

      const replies = await prisma.forumReply.findMany({
        where: { postId: parseInt(postId), parentId: null },
        select: {
          id: true, content: true, author: true, createdAt: true, likes: true,
          children: {
            select: { id: true, content: true, author: true, createdAt: true, likes: true },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return res.status(200).json({ replies });

    } else if (req.method === 'POST') {
      const { postId, content, author, password, parentId } = req.body;

      if (!postId || !content || !author || !password) {
        return res.status(400).json({ error: '닉네임, 내용, 삭제 비밀번호는 필수입니다.' });
      }
      if (password.length < 4) {
        return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다.' });
      }

      if (checkProfanity(content)) {
        return res.status(400).json({ error: '부적절한 언어가 포함되어 있습니다.' });
      }

      const postExists = await prisma.forumPost.findUnique({ where: { id: parseInt(postId) } });
      if (!postExists) {
        return res.status(404).json({ error: '게시글을 찾을 수 없습니다.' });
      }

      const reply = await prisma.forumReply.create({
        data: {
          postId: parseInt(postId),
          content,
          author,
          password: password ? hashPassword(password) : null,
          parentId: parentId ? parseInt(parentId) : null,
        },
        select: { id: true, content: true, author: true, createdAt: true, likes: true, parentId: true },
      });

      return res.status(201).json({ reply });

    } else if (req.method === 'DELETE') {
      const { replyId, password } = req.body;

      if (!replyId || !password) {
        return res.status(400).json({ error: 'replyId와 비밀번호가 필요합니다.' });
      }

      const reply = await prisma.forumReply.findUnique({ where: { id: parseInt(replyId) } });
      if (!reply) {
        return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
      }

      if (!reply.password || reply.password !== hashPassword(password)) {
        return res.status(403).json({ error: '비밀번호가 올바르지 않습니다.' });
      }

      // 대댓글 먼저 삭제
      await prisma.forumReply.deleteMany({ where: { parentId: parseInt(replyId) } });
      await prisma.forumReply.delete({ where: { id: parseInt(replyId) } });

      return res.status(200).json({ message: '댓글이 삭제되었습니다.' });

    } else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Forum replies API error:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  } finally {
    await prisma.$disconnect();
  }
}
