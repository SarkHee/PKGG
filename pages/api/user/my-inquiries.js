// GET /api/user/my-inquiries — 로그인 유저 본인이 제출한 문의 목록(답변 포함) 조회
import prisma from '../../../utils/prisma.js';
import { getSessionAuthUser } from '../../../utils/clanBattleAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const authUser = await getSessionAuthUser(req, res);
  if (!authUser) return res.status(401).json({ error: '로그인이 필요합니다.' });

  try {
    const inquiries = await prisma.inquiry.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ inquiries });
  } catch (e) {
    console.error('[user/my-inquiries] 오류:', e.message);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
