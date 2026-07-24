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

    // 연동 계정별 검색 비활성화 상태 표시 (마이페이지 토글 UI용)
    if (authUser.pubgAccounts.length > 0) {
      const caches = await prisma.playerCache.findMany({
        where: {
          OR: authUser.pubgAccounts.map((a) => ({ nickname: { equals: a.nickname, mode: 'insensitive' }, pubgShardId: a.platform })),
        },
        select: { nickname: true, pubgShardId: true, isSearchHidden: true },
      });
      authUser.pubgAccounts = authUser.pubgAccounts.map((a) => {
        const cache = caches.find((c) => c.nickname.toLowerCase() === a.nickname.toLowerCase() && c.pubgShardId === a.platform);
        return { ...a, isSearchHidden: cache?.isSearchHidden ?? false };
      });
    }

    // 대표 계정의 클랜 정보 조회
    let clanData = null;
    if (authUser.mainAccountId) {
      const mainAcc = authUser.pubgAccounts.find((a) => a.id === authUser.mainAccountId);
      if (mainAcc?.pubgAccountId) {
        const member = await prisma.clanMember.findFirst({
          where: { pubgPlayerId: mainAcc.pubgAccountId },
          include: {
            clan: {
              select: {
                id: true, name: true, leader: true, description: true,
                pubgClanTag: true, pubgClanLevel: true,
                memberCount: true, avgScore: true, region: true,
              },
            },
          },
        });
        if (member?.clan) clanData = member.clan;
      }
    }

    return res.status(200).json({
      user: {
        ...authUser,
        clanId:   clanData?.id   ?? null,
        clanName: clanData?.name ?? null,
        clan:     clanData,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
