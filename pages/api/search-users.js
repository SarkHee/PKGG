// pages/api/search-users.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Query too short' });
  }

  try {
    // DB에서 닉네임으로 검색 (대소문자 구분 없이)
    const users = await prisma.clanMember.findMany({
      where: {
        nickname: {
          contains: q,
          mode: 'insensitive',
        },
      },
      select: {
        nickname: true,
      },
      take: 10, // 최대 10개 결과
      orderBy: {
        nickname: 'asc',
      },
    });

    const usernames = users.map((user) => user.nickname);

    return res.status(200).json({ users: usernames });
  } catch (error) {
    console.error('사용자 검색 오류:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}
