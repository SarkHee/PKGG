// pages/api/auth/link-pubg.js — PUBG 닉네임 연결 후 clan_id 저장
import { getSession, setSession } from '../../../utils/session';
import prisma from '../../../utils/prisma.js';
const PUBG_API_KEY = process.env.PUBG_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const session = getSession(req);
  if (!session?.userId) return res.status(401).json({ error: '로그인이 필요합니다' });

  const { nickname } = req.body;
  if (!nickname?.trim()) return res.status(400).json({ error: '닉네임을 입력하세요' });

  // 1. PUBG API로 accountId 조회
  let pubgAccountId = null;
  let pubgClanId = null;
  try {
    const response = await fetch(
      `https://api.pubg.com/shards/steam/players?filter[playerNames]=${encodeURIComponent(nickname.trim())}`,
      { headers: { Authorization: `Bearer ${PUBG_API_KEY}`, Accept: 'application/vnd.api+json' } },
    );
    if (response.ok) {
      const data = await response.json();
      const player = data?.data?.[0];
      pubgAccountId = player?.id;
      pubgClanId = player?.relationships?.clan?.data?.id || null;
    }
  } catch {
    // API 실패해도 닉네임만 저장
  }

  // 2. DB에서 클랜 찾기 (pubgClanId로)
  let clanId = null;
  if (pubgClanId) {
    try {
      const clan = await prisma.clan.findFirst({ where: { pubgClanId } });
      clanId = clan?.id || null;
    } catch { /* ignore */ }
  }

  // 3. ClanMember 테이블에서도 찾기 (accountId 기준)
  if (!clanId && pubgAccountId) {
    try {
      const member = await prisma.clanMember.findFirst({
        where: { pubgPlayerId: pubgAccountId },
        include: { clan: true },
      });
      clanId = member?.clanId || null;
    } catch { /* ignore */ }
  }

  // 4. User 업데이트
  try {
    const user = await prisma.user.update({
      where: { id: session.userId },
      data: {
        pubgNickname: nickname.trim(),
        pubgAccountId: pubgAccountId || null,
        clanId: clanId || null,
      },
    });

    // 세션 갱신 (clanId 포함)
    setSession(res, { userId: user.id, steamId: user.steamId, role: user.role });
    return res.status(200).json({ ok: true, pubgNickname: user.pubgNickname, clanId });
  } catch {
    return res.status(500).json({ error: 'DB 업데이트 실패' });
  }
}
