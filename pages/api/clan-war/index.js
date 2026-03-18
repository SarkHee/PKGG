// pages/api/clan-war/index.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { clan, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = clan
      ? { OR: [{ clanA: { contains: clan, mode: 'insensitive' } }, { clanB: { contains: clan, mode: 'insensitive' } }] }
      : {};
    const [wars, total] = await Promise.all([
      prisma.clanWar.findMany({
        where,
        include: { players: true },
        orderBy: { playedAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.clanWar.count({ where }),
    ]);
    return res.json({ wars, total, page: parseInt(page), limit: parseInt(limit) });
  }

  if (req.method === 'POST') {
    const { clanA, clanB, scoreA, scoreB, map, mode, note, password, playedAt, players } = req.body;
    if (!clanA || !clanB) return res.status(400).json({ error: '클랜 이름 필수' });
    const war = await prisma.clanWar.create({
      data: {
        clanA: String(clanA).trim(),
        clanB: String(clanB).trim(),
        scoreA: parseInt(scoreA) || 0,
        scoreB: parseInt(scoreB) || 0,
        map: map || '',
        mode: mode || 'squad-fpp',
        note: note || '',
        password: password || '',
        playedAt: playedAt ? new Date(playedAt) : new Date(),
        players: {
          create: (players || []).map(p => ({
            nickname: String(p.nickname || '').trim(),
            team: p.team === 'B' ? 'B' : 'A',
            kills: parseInt(p.kills) || 0,
            damage: parseInt(p.damage) || 0,
            survived: Boolean(p.survived),
          })),
        },
      },
      include: { players: true },
    });
    return res.status(201).json({ war });
  }

  return res.status(405).end();
}
