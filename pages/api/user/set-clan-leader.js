// POST /api/user/set-clan-leader — 로그인 유저의 대표 계정으로 클랜 리더 등록
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../utils/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.googleId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const authUser = await prisma.authUser.findUnique({
      where: { googleId: session.user.googleId },
      include: { pubgAccounts: true },
    });
    if (!authUser?.mainAccountId) {
      return res.status(400).json({ error: '대표 PUBG 계정을 먼저 설정해주세요.' });
    }

    const mainAcc = authUser.pubgAccounts.find((a) => a.id === authUser.mainAccountId);
    if (!mainAcc) return res.status(400).json({ error: '대표 계정을 찾을 수 없습니다.' });

    // 해당 닉네임이 속한 클랜 찾기
    const member = await prisma.clanMember.findFirst({
      where: { pubgPlayerId: mainAcc.pubgAccountId },
      include: { clan: { select: { id: true, name: true } } },
    });
    if (!member?.clan) {
      return res.status(404).json({ error: '소속 클랜을 찾을 수 없습니다.' });
    }

    // 클랜 리더 업데이트
    await prisma.clan.update({
      where: { id: member.clan.id },
      data:  { leader: mainAcc.nickname },
    });

    return res.status(200).json({ ok: true, clanName: member.clan.name, leader: mainAcc.nickname });
  } catch (e) {
    console.error('[set-clan-leader]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
