// GET /api/banners/active?position=main_header — 현재 노출 대상인 배너 1개 조회 (공개 API)
import prisma from '../../../utils/prisma.js';

const VALID_POSITIONS = ['main_header', 'player_card_top'];

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { position } = req.query;
  if (!position || !VALID_POSITIONS.includes(position)) {
    return res.status(400).json({ error: `position은 ${VALID_POSITIONS.join(' 또는 ')} 이어야 합니다.` });
  }

  try {
    const now = new Date();
    const banner = await prisma.adBanner.findFirst({
      where: {
        position,
        isActive: true,
        OR: [{ startDate: null }, { startDate: { lte: now } }],
        AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, imageUrl: true, imageUrlMobile: true, linkUrl: true },
    });
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ banner: banner || null });
  } catch (e) {
    console.error('[banners/active] 오류:', e.message);
    return res.status(200).json({ banner: null });
  }
}
