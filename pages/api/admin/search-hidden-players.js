// GET  /api/admin/search-hidden-players — 검색 비활성화된 유저 목록 (닉네임/설정일/연동 구글 이메일)
// POST /api/admin/search-hidden-players { nickname, shard } — 관리자 강제 해제
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

  if (req.method === 'GET') {
    try {
      const rows = await prisma.playerCache.findMany({
        where: { isSearchHidden: true },
        orderBy: { searchHiddenAt: 'desc' },
        select: { id: true, nickname: true, pubgShardId: true, searchHiddenAt: true },
      });

      // 닉네임+플랫폼으로 연동 구글 계정 이메일 조회 (PlayerCache는 AuthUser와 직접 FK가 없어 조인 대신 별도 조회)
      const list = await Promise.all(rows.map(async (r) => {
        const account = await prisma.pubgAccount.findFirst({
          where: { nickname: { equals: r.nickname, mode: 'insensitive' }, platform: r.pubgShardId },
          include: { user: { select: { email: true } } },
        });
        return {
          id: r.id,
          nickname: r.nickname,
          shard: r.pubgShardId,
          searchHiddenAt: r.searchHiddenAt,
          email: account?.user?.email || null,
        };
      }));

      return res.json({ list });
    } catch (e) {
      console.error('[admin/search-hidden-players] GET 오류:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    const { nickname, shard } = req.body || {};
    if (!nickname || !shard) return res.status(400).json({ error: 'nickname, shard가 필요합니다.' });
    try {
      await prisma.playerCache.updateMany({
        where: { nickname: { equals: nickname, mode: 'insensitive' }, pubgShardId: shard },
        data: { isSearchHidden: false, searchHiddenAt: null },
      });
      return res.json({ ok: true });
    } catch (e) {
      console.error('[admin/search-hidden-players] POST 오류:', e.message);
      return res.status(500).json({ error: e.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
