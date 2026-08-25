// POST /api/route-planner/save — 로그인 유저의 동선 계획 저장 (맵당 1개, upsert)
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../utils/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.googleId) return res.status(401).json({ error: 'Unauthorized' });

  const { mapId, routes, markers, measurements, blueZones } = req.body;
  if (!mapId) return res.status(400).json({ error: 'mapId 필요' });

  try {
    let authUser = await prisma.authUser.findUnique({ where: { googleId: session.user.googleId } });
    if (!authUser) {
      // signIn 콜백의 upsert가 일시적 DB 오류 등으로 실패해 AuthUser가 없는 상태일 수 있음 — 세션 정보로 자가 치유
      authUser = await prisma.authUser.upsert({
        where: { googleId: session.user.googleId },
        update: { email: session.user.email, name: session.user.name },
        create: { googleId: session.user.googleId, email: session.user.email, name: session.user.name },
      });
    }

    const saved = await prisma.savedRoute.upsert({
      where: { userId_mapId: { userId: authUser.id, mapId } },
      update: {
        routes: routes ?? [],
        markers: markers ?? [],
        measurements: measurements ?? [],
        blueZones: blueZones ?? [],
      },
      create: {
        userId: authUser.id,
        mapId,
        routes: routes ?? [],
        markers: markers ?? [],
        measurements: measurements ?? [],
        blueZones: blueZones ?? [],
      },
    });

    return res.status(200).json({ ok: true, updatedAt: saved.updatedAt });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
