// API 엔드포인트: 포럼 사용자 제재 관리
// pages/api/forum/moderation.js

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { action, username } = req.query;

      if (action === 'check-ban' && username) {
        // 특정 사용자의 밴 상태 확인
        const user = await prisma.forumUser.findFirst({
          where: {
            username: username,
            isBanned: true,
            banUntil: {
              gt: new Date(),
            },
          },
        });

        return res.status(200).json({
          banned: !!user,
          banInfo: user
            ? {
                reason: user.banReason,
                banUntil: user.banUntil,
                violationCount: user.violationCount,
                violationType: user.violationType,
              }
            : null,
        });
      }

      if (action === 'banned-users') {
        // 현재 제재된 사용자 목록 조회 (관리자용)
        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [users, total] = await Promise.all([
          prisma.forumUser.findMany({
            where: {
              isBanned: true,
              banUntil: {
                gt: new Date(),
              },
            },
            orderBy: { lastViolation: 'desc' },
            skip,
            take: parseInt(limit),
          }),
          prisma.forumUser.count({
            where: {
              isBanned: true,
              banUntil: {
                gt: new Date(),
              },
            },
          }),
        ]);

        return res.status(200).json({
          users,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit)),
          },
        });
      }

      if (action === 'violation-history' && username) {
        // 특정 사용자의 제재 이력 조회
        const violations = await prisma.forumUser.findMany({
          where: { username: username },
          orderBy: { createdAt: 'desc' },
        });

        return res.status(200).json({ violations });
      }
    } else if (req.method === 'POST') {
      const { action, username, banDuration, reason } = req.body;

      if (action === 'manual-ban') {
        // 관리자가 수동으로 사용자 제재
        if (!username || !banDuration || !reason) {
          return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
        }

        const banUntil = new Date(Date.now() + banDuration * 60 * 60 * 1000); // 시간 단위

        const user = await prisma.forumUser.upsert({
          where: { username: username },
          update: {
            isBanned: true,
            banReason: reason,
            banUntil: banUntil,
            violationCount: { increment: 1 },
            lastViolation: new Date(),
            violationType: 'MANUAL_BAN',
          },
          create: {
            username: username,
            email: `${username}@temp.com`,
            isBanned: true,
            banReason: reason,
            banUntil: banUntil,
            violationCount: 1,
            lastViolation: new Date(),
            violationType: 'MANUAL_BAN',
            createdAt: new Date(),
          },
        });

        return res.status(200).json({
          message: '사용자가 제재되었습니다.',
          user: {
            username: user.username,
            banReason: user.banReason,
            banUntil: user.banUntil,
            violationCount: user.violationCount,
          },
        });
      }

      if (action === 'unban') {
        // 사용자 제재 해제
        if (!username) {
          return res.status(400).json({ error: '사용자명이 필요합니다.' });
        }

        const user = await prisma.forumUser.updateMany({
          where: {
            username: username,
            isBanned: true,
          },
          data: {
            isBanned: false,
            banReason: null,
            banUntil: null,
          },
        });

        if (user.count === 0) {
          return res
            .status(404)
            .json({ error: '제재된 사용자를 찾을 수 없습니다.' });
        }

        return res.status(200).json({
          message: '사용자 제재가 해제되었습니다.',
          username: username,
        });
      }
    } else if (req.method === 'DELETE') {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({ error: '사용자명이 필요합니다.' });
      }

      // 사용자의 모든 제재 기록 삭제
      const deleted = await prisma.forumUser.deleteMany({
        where: { username: username },
      });

      return res.status(200).json({
        message: '사용자 제재 기록이 삭제되었습니다.',
        deletedCount: deleted.count,
      });
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Moderation API error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  } finally {
    await prisma.$disconnect();
  }
}
