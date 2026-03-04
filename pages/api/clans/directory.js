// pages/api/clans/directory.js
// 공개 클랜 디렉토리 — 모든 클랜을 MMR 순으로 반환

import prisma from '../../../utils/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { region, q, sort = 'score', page = '1', limit = '20' } = req.query;
  const take = Math.min(parseInt(limit, 10) || 20, 50);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

  const where = { NOT: { name: '무소속' } };
  if (region && region !== 'all') where.region = region;
  if (q) where.name = { contains: q, mode: 'insensitive' };

  const orderBy =
    sort === 'members' ? { memberCount: 'desc' }
    : sort === 'damage' ? { members: { _avg: { avgDamage: 'desc' } } }
    : { avgScore: 'desc' };

  try {
    const [clans, total] = await Promise.all([
      prisma.clan.findMany({
        where,
        orderBy: { avgScore: 'desc' },
        skip,
        take,
        select: {
          name:        true,
          leader:      true,
          description: true,
          memberCount: true,
          mainStyle:   true,
          region:      true,
          pubgClanTag: true,
          pubgClanLevel: true,
          members: {
            select: { score: true },
          },
        },
      }),
      prisma.clan.count({ where }),
    ]);

    const result = clans.map(({ members, ...clan }) => {
      const scores = members.map(m => m.score).filter(s => s != null && s > 0);
      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;
      return { ...clan, avgScore };
    });

    res.status(200).json({ clans: result, total, page: parseInt(page, 10), take });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
