// GET /api/clan-battle/search-clan?q=클랜명 — 타클랜 검색 (클랜 내전 참가자 추가용)
import prisma from '../../../utils/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const q = (req.query.q || '').trim();
  if (q.length === 0) return res.status(200).json({ clans: [] });

  try {
    const clans = await prisma.clan.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      select: { id: true, name: true, memberCount: true, avgScore: true, region: true },
      orderBy: { memberCount: 'desc' },
      take: 10,
    });
    return res.status(200).json({ clans });
  } catch (e) {
    console.error('[clan-battle/search-clan] GET 오류:', e.message);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
