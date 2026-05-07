import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth].js';
import prisma from '../../../utils/prisma.js';

const ADMIN_EMAIL = 'sssyck123@gmail.com';

async function checkAdmin(req, res) {
  const pw = req.headers['x-admin-token'] || req.query.pw;
  if (pw && pw === process.env.ADMIN_PASSWORD) return true;
  const session = await getServerSession(req, res, authOptions);
  return session?.user?.email === ADMIN_EMAIL;
}

export default async function handler(req, res) {
  if (!(await checkAdmin(req, res))) return res.status(401).json({ error: '인증 필요' });

  // GET — 요청 목록
  if (req.method === 'GET') {
    const requests = await prisma.clanLeaderRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return res.json({ requests });
  }

  // POST — 승인/거절
  if (req.method === 'POST') {
    const { id, action } = req.body; // action: 'approve' | 'reject'
    if (!id || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: '잘못된 요청' });
    }

    const request = await prisma.clanLeaderRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: '요청을 찾을 수 없습니다.' });
    if (request.status !== 'pending') {
      return res.status(400).json({ error: '이미 처리된 요청입니다.' });
    }

    if (action === 'approve') {
      // 트랜잭션: 요청 승인 + 클랜 리더 업데이트
      await prisma.$transaction([
        prisma.clanLeaderRequest.update({
          where: { id },
          data:  { status: 'approved' },
        }),
        prisma.clan.update({
          where: { id: request.clanId },
          data:  { leader: request.requestNickname },
        }),
      ]);
      return res.json({ ok: true, message: `${request.requestNickname}이(가) ${request.clanName} 리더로 변경됐습니다.` });
    } else {
      await prisma.clanLeaderRequest.update({
        where: { id },
        data:  { status: 'rejected' },
      });
      return res.json({ ok: true, message: '요청이 거절됐습니다.' });
    }
  }

  return res.status(405).end();
}
