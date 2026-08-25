// POST /api/route-planner/delete — 로그인 유저 본인의 저장된 동선 삭제
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../utils/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.googleId) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id 필요' });

  try {
    const authUser = await prisma.authUser.findUnique({ where: { googleId: session.user.googleId } });
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

    const saved = await prisma.savedRoute.findUnique({ where: { id: Number(id) } });
    if (!saved || saved.userId !== authUser.id) {
      return res.status(403).json({ error: '본인이 저장한 동선만 삭제할 수 있습니다.' });
    }

    await prisma.savedRoute.delete({ where: { id: Number(id) } });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
