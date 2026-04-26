// pages/api/auth/me.js — 현재 로그인 유저 정보 반환
import { getSession } from '../../../utils/session';
import prisma from '../../../utils/prisma.js';

export default async function handler(req, res) {
  const session = getSession(req);
  if (!session?.userId) return res.status(200).json({ user: null });

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, steamId: true, kakaoId: true, platform: true, pubgNickname: true, pubgAccountId: true, clanId: true, role: true },
    });
    return res.status(200).json({ user });
  } catch {
    return res.status(200).json({ user: null });
  }
}
