// GET /api/user/me — 로그인 유저 + 연동 PUBG 계정 + 클랜 정보 반환
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../utils/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.googleId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const authUser = await prisma.authUser.findUnique({
      where: { googleId: session.user.googleId },
      include: { pubgAccounts: { orderBy: { createdAt: 'asc' } } },
    });
    if (!authUser) return res.status(404).json({ error: 'User not found' });

    // 대표 계정의 클랜 ID 조회
    let clanId = null;
    let clanName = null;
    if (authUser.mainAccountId) {
      const mainAcc = authUser.pubgAccounts.find((a) => a.id === authUser.mainAccountId);
      if (mainAcc?.pubgAccountId) {
        const member = await prisma.clanMember.findFirst({
          where: { pubgPlayerId: mainAcc.pubgAccountId },
          include: { clan: { select: { id: true, name: true } } },
        });
        if (member?.clan) {
          clanId   = member.clan.id;
          clanName = member.clan.name;
        }
      }
    }

    return res.status(200).json({ user: { ...authUser, clanId, clanName } });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
