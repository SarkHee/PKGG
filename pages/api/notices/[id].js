import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { id } = req.query;
  const noticeId = parseInt(id);

  if (isNaN(noticeId)) {
    return res.status(400).json({ error: '유효하지 않은 공지사항 ID입니다.' });
  }

  try {
    if (req.method === 'GET') {
      // 개별 공지사항 조회 및 조회수 증가
      const notice = await prisma.notice.findFirst({
        where: {
          id: noticeId,
          isActive: true,
          OR: [
            { showUntil: null },
            { showUntil: { gte: new Date() } }
          ]
        }
      });

      if (!notice) {
        return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' });
      }

      // 조회수 증가
      await prisma.notice.update({
        where: { id: noticeId },
        data: { views: notice.views + 1 }
      });

      res.status(200).json({
        ...notice,
        views: notice.views + 1
      });

    } else if (req.method === 'PUT') {
      // 공지사항 수정 (관리자 권한 필요)
      const {
        title,
        content,
        summary,
        type,
        priority,
        isPinned,
        isActive,
        showUntil
      } = req.body;

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (summary !== undefined) updateData.summary = summary;
      if (type !== undefined) updateData.type = type;
      if (priority !== undefined) updateData.priority = priority;
      if (isPinned !== undefined) updateData.isPinned = isPinned;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (showUntil !== undefined) updateData.showUntil = showUntil ? new Date(showUntil) : null;

      const notice = await prisma.notice.update({
        where: { id: noticeId },
        data: updateData
      });

      res.status(200).json(notice);

    } else if (req.method === 'DELETE') {
      // 공지사항 삭제 (관리자 권한 필요)
      await prisma.notice.update({
        where: { id: noticeId },
        data: { isActive: false }
      });

      res.status(200).json({ message: '공지사항이 삭제되었습니다.' });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('공지사항 API 오류:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' });
    }
    res.status(500).json({
      error: '서버 오류가 발생했습니다.',
      details: error.message
    });
  } finally {
    await prisma.$disconnect();
  }
}
