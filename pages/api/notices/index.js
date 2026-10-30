import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth].js';
import prisma from '../../../utils/prisma.js';

const ADMIN_EMAIL = 'sssyck123@gmail.com';

async function checkAdmin(req, res) {
  const pw = req.headers['x-admin-token'] || req.query.pw;
  if (pw && pw === process.env.ADMIN_PASSWORD) return true;
  const session = await getServerSession(req, res, authOptions);
  return session?.user?.email === ADMIN_EMAIL;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // 공지사항 목록 조회
      const { page = 1, limit = 10, type, priority } = req.query;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      // 필터 조건 구성
      const where = {
        isActive: true,
        OR: [{ showUntil: null }, { showUntil: { gte: new Date() } }],
      };

      if (type) {
        where.type = type;
      }

      if (priority) {
        where.priority = priority;
      }

      // 전체 개수 조회
      const total = await prisma.notice.count({ where });

      // 공지사항 목록 조회 (고정글 우선, 생성일 역순)
      const notices = await prisma.notice.findMany({
        where,
        select: {
          id: true,
          title: true,
          summary: true,
          type: true,
          priority: true,
          isPinned: true,
          author: true,
          views: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [
          { isPinned: 'desc' },
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: offset,
        take: limitNum,
      });

      res.status(200).json({
        notices,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } else if (req.method === 'POST') {
      // 새 공지사항 생성 (관리자 권한 필요)
      if (!(await checkAdmin(req, res)))
        return res.status(401).json({ error: '인증 필요' });
      const {
        title,
        content,
        summary,
        type = 'GENERAL',
        priority = 'NORMAL',
        isPinned = false,
        showUntil,
        author = '관리자',
      } = req.body;

      if (!title || !content) {
        return res.status(400).json({
          error: '제목과 내용은 필수입니다.',
        });
      }

      const notice = await prisma.notice.create({
        data: {
          title,
          content,
          summary: summary || content.substring(0, 200),
          type,
          priority,
          isPinned,
          showUntil: showUntil ? new Date(showUntil) : null,
          author,
        },
      });

      res.status(201).json(notice);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('공지사항 API 오류:', error);
    res.status(500).json({
      error: '서버 오류가 발생했습니다.',
      ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
    });
  }
}
