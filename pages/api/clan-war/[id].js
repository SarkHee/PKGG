// pages/api/clan-war/[id].js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { id } = req.query;
  const warId = parseInt(id);
  if (isNaN(warId)) return res.status(400).json({ error: 'invalid id' });

  if (req.method === 'GET') {
    const war = await prisma.clanWar.findUnique({ where: { id: warId }, include: { players: true } });
    if (!war) return res.status(404).json({ error: 'not found' });
    return res.json(war);
  }

  if (req.method === 'DELETE') {
    const { password } = req.body;
    const war = await prisma.clanWar.findUnique({ where: { id: warId } });
    if (!war) return res.status(404).json({ error: 'not found' });
    if (war.password && war.password !== password) return res.status(403).json({ error: '비밀번호 오류' });
    await prisma.clanWar.delete({ where: { id: warId } });
    return res.json({ ok: true });
  }

  return res.status(405).end();
}
