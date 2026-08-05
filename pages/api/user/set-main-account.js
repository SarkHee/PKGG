// POST /api/user/set-main-account — 대표 PUBG 계정 변경
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../utils/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.googleId) return res.status(401).json({ error: 'Unauthorized' });

  const { accountId } = req.body;
  if (!accountId) return res.status(400).json({ error: 'accountId 필요' });

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

    // 본인 계정인지 확인
    const account = await prisma.pubgAccount.findFirst({
      where: { id: accountId, userId: authUser.id },
    });
    if (!account) return res.status(403).json({ error: '본인 계정이 아닙니다.' });

    await prisma.authUser.update({
      where: { id: authUser.id },
      data: { mainAccountId: accountId },
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
