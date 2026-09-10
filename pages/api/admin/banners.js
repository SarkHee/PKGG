// pages/api/admin/banners.js — 배너 광고 관리 API (관리자 전용)
import prisma from '../../../utils/prisma.js';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth].js';

const ADMIN_EMAIL = 'sssyck123@gmail.com';

async function checkAdmin(req, res) {
  const pw = req.headers['x-admin-token'] || req.query.pw;
  if (pw && pw === process.env.ADMIN_PASSWORD) return true;
  const session = await getServerSession(req, res, authOptions);
  return session?.user?.email === ADMIN_EMAIL;
}

const VALID_POSITIONS = ['main_header', 'player_card_top'];

export default async function handler(req, res) {
  const isAdmin = await checkAdmin(req, res);
  if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' });

  // GET — 전체 목록
  if (req.method === 'GET') {
    const banners = await prisma.adBanner.findMany({ orderBy: { createdAt: 'desc' } });
    return res.status(200).json({ banners });
  }

  // POST — 배너 추가
  if (req.method === 'POST') {
    const { position, imageUrl, imageUrlMobile, linkUrl, startDate, endDate } = req.body;
    if (!position || !VALID_POSITIONS.includes(position)) {
      return res.status(400).json({ error: `position은 ${VALID_POSITIONS.join(' 또는 ')} 이어야 합니다.` });
    }
    if (!imageUrl || !linkUrl) return res.status(400).json({ error: '이미지와 링크 URL은 필수입니다.' });

    const banner = await prisma.adBanner.create({
      data: {
        position,
        imageUrl,
        imageUrlMobile: imageUrlMobile || null,
        linkUrl,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });
    return res.status(201).json({ banner });
  }

  // PATCH — 활성화 토글 등 수정
  if (req.method === 'PATCH') {
    const { id, ...fields } = req.body;
    if (!id) return res.status(400).json({ error: 'id 필수' });

    const data = {};
    if (typeof fields.isActive === 'boolean') data.isActive = fields.isActive;
    if (fields.imageUrl !== undefined) data.imageUrl = fields.imageUrl;
    if (fields.imageUrlMobile !== undefined) data.imageUrlMobile = fields.imageUrlMobile || null;
    if (fields.linkUrl !== undefined) data.linkUrl = fields.linkUrl;
    if (fields.startDate !== undefined) data.startDate = fields.startDate ? new Date(fields.startDate) : null;
    if (fields.endDate !== undefined) data.endDate = fields.endDate ? new Date(fields.endDate) : null;

    const banner = await prisma.adBanner.update({ where: { id: parseInt(id) }, data });
    return res.status(200).json({ banner });
  }

  // DELETE — 배너 제거
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id 필수' });
    await prisma.adBanner.delete({ where: { id: parseInt(id) } });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
