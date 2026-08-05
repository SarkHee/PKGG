// POST /api/user/link-pubg — PUBG 계정 연동
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../utils/prisma.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.googleId) return res.status(401).json({ error: 'Unauthorized' });

  const { nickname, platform = 'steam' } = req.body;
  if (!nickname?.trim()) return res.status(400).json({ error: '닉네임을 입력하세요.' });

  // PUBG API로 accountId 조회
  try {
    const apiUrl = `https://api.pubg.com/shards/${platform}/players?filter[playerNames]=${encodeURIComponent(nickname.trim())}`;
    const apiRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${process.env.PUBG_API_KEY}`,
        Accept: 'application/vnd.api+json',
      },
    });

    if (!apiRes.ok) {
      if (apiRes.status === 404) return res.status(404).json({ error: '해당 닉네임의 플레이어를 찾을 수 없습니다.' });
      return res.status(apiRes.status).json({ error: 'PUBG API 오류가 발생했습니다.' });
    }

    const apiData = await apiRes.json();
    const player = apiData?.data?.[0];
    if (!player) return res.status(404).json({ error: '플레이어를 찾을 수 없습니다.' });

    const pubgAccountId = player.id;
    const resolvedNickname = player.attributes?.name || nickname.trim();

    let authUser = await prisma.authUser.findUnique({ where: { googleId: session.user.googleId } });
    if (!authUser) {
      // signIn 콜백의 upsert가 일시적 DB 오류 등으로 실패해 AuthUser가 없는 상태일 수 있음 — 세션 정보로 자가 치유
      authUser = await prisma.authUser.upsert({
        where: { googleId: session.user.googleId },
        update: { email: session.user.email, name: session.user.name },
        create: { googleId: session.user.googleId, email: session.user.email, name: session.user.name },
      });
    }

    // 이미 연동된 계정인지 확인
    const existing = await prisma.pubgAccount.findFirst({
      where: { userId: authUser.id, pubgAccountId },
    });
    if (existing) return res.status(409).json({ error: '이미 연동된 PUBG 계정입니다.' });

    const account = await prisma.pubgAccount.create({
      data: {
        userId: authUser.id,
        nickname: resolvedNickname,
        pubgAccountId,
        platform,
      },
    });

    // 첫 번째 연동 계정이면 대표 계정으로 설정
    if (!authUser.mainAccountId) {
      await prisma.authUser.update({
        where: { id: authUser.id },
        data: { mainAccountId: account.id },
      });
    }

    return res.status(200).json({ account });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
