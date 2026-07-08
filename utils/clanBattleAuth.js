// utils/clanBattleAuth.js — 클랜 내전 API 공통 인증/클랜 조회 헬퍼
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../pages/api/auth/[...nextauth]';
import prisma from './prisma.js';

// 로그인한 AuthUser 조회 (pubgAccounts 포함). 미로그인이면 null
export async function getSessionAuthUser(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.googleId) return null;
  return prisma.authUser.findUnique({
    where: { googleId: session.user.googleId },
    include: { pubgAccounts: true },
  });
}

// clan-analytics.js / api/user/me.js와 동일한 패턴: 대표 PUBG 계정 → ClanMember → Clan
export async function getUserClan(authUser) {
  if (!authUser?.mainAccountId) return null;
  const mainAcc = authUser.pubgAccounts?.find((a) => a.id === authUser.mainAccountId);
  if (!mainAcc?.pubgAccountId) return null;
  const member = await prisma.clanMember.findFirst({
    where: { pubgPlayerId: mainAcc.pubgAccountId },
    include: { clan: true },
  });
  return member?.clan ?? null;
}
