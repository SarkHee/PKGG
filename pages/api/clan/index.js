// pages/api/clans/index.js (모든 클랜 목록을 반환하는 API)

import { PrismaClient } from '@prisma/client';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const prisma = new PrismaClient();
    try {
      const clans = await prisma.clan.findMany({
        include: { members: true },
      });
      return res.status(200).json({
        clans: clans.map((clan) => ({
          name: clan.name,
          leader: clan.leader,
          description: clan.description,
          announcement: clan.announcement,
          memberCount: clan.memberCount,
          avgScore: clan.avgScore,
          mainStyle: clan.mainStyle,
          members: clan.members.map((m) => ({
            nickname: m.nickname,
            score: m.score,
            style: m.style,
            avgDamage: m.avgDamage,
          })),
        })),
      });
    } catch (error) {
      console.error('[API Handler] DB 읽기 실패:', error);
      return res
        .status(500)
        .json({ error: 'DB에서 클랜 목록을 불러올 수 없습니다.' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
