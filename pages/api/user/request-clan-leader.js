import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth].js';
import prisma from '../../../utils/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.googleId) return res.status(401).json({ error: 'Unauthorized' });

  const { reason } = req.body;
  if (!reason || reason.trim().length < 5) {
    return res.status(400).json({ error: '변경 사유를 5자 이상 입력해주세요.' });
  }

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

    const member = await prisma.clanMember.findFirst({
      where: { pubgPlayerId: mainAcc.pubgAccountId },
      include: { clan: { select: { id: true, name: true, leader: true } } },
    });
    if (!member?.clan) {
      return res.status(404).json({ error: '소속 클랜을 찾을 수 없습니다.' });
    }

    const clan = member.clan;

    // 이미 본인이 리더인 경우
    if (clan.leader === mainAcc.nickname) {
      return res.status(400).json({ error: '이미 이 클랜의 리더입니다.' });
    }

    // 동일 요청이 pending 상태로 이미 있는지 확인
    const existing = await prisma.clanLeaderRequest.findFirst({
      where: {
        clanId: clan.id,
        requestNickname: mainAcc.nickname,
        status: 'pending',
      },
    });
    if (existing) {
      return res.status(409).json({ error: '이미 처리 대기 중인 요청이 있습니다.' });
    }

    await prisma.clanLeaderRequest.create({
      data: {
        clanId:          clan.id,
        clanName:        clan.name,
        currentLeader:   clan.leader || '(미등록)',
        requestNickname: mainAcc.nickname,
        reason:          reason.trim(),
        status:          'pending',
      },
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[request-clan-leader]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
