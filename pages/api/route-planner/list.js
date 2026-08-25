// GET /api/route-planner/list — 로그인 유저가 저장한 동선 계획 전체 조회 (맵별 1개씩)
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../utils/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.googleId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    let authUser = await prisma.authUser.findUnique({ where: { googleId: session.user.googleId } });
    if (!authUser) {
      authUser = await prisma.authUser.upsert({
        where: { googleId: session.user.googleId },
        update: { email: session.user.email, name: session.user.name },
        create: { googleId: session.user.googleId, email: session.user.email, name: session.user.name },
      });
    }

    const saved = await prisma.savedRoute.findMany({
      where: { userId: authUser.id },
      select: { id: true, mapId: true, routes: true, markers: true, measurements: true, blueZones: true, updatedAt: true, createdAt: true },
      orderBy: { updatedAt: 'desc' },
    });

    return res.status(200).json({ routes: saved });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
