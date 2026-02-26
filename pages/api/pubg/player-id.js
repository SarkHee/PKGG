// pages/api/pubg/player-id.js
// 닉네임으로 PUBG 플레이어 ID 조회 (DB 우선 → PUBG API 폴백)
// WeaponMasteryCard에서 playerId가 없을 때 사용

const PUBG_API_KEY = process.env.PUBG_API_KEY;
const PUBG_BASE_URL = 'https://api.pubg.com/shards';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  const { nickname, shard = 'steam' } = req.query;
  if (!nickname) {
    return res.status(400).json({ error: 'nickname is required' });
  }

  // 1·2순위: DB에서 조회 (실패해도 PUBG API로 폴백)
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    try {
      const cached = await prisma.playerCache.findFirst({
        where: { nickname: { equals: nickname, mode: 'insensitive' }, pubgShardId: shard },
        select: { pubgPlayerId: true },
      });
      if (cached?.pubgPlayerId) {
        return res.status(200).json({ playerId: cached.pubgPlayerId });
      }

      const member = await prisma.clanMember.findFirst({
        where: { nickname: { equals: nickname, mode: 'insensitive' } },
        select: { pubgPlayerId: true },
      });
      if (member?.pubgPlayerId) {
        return res.status(200).json({ playerId: member.pubgPlayerId });
      }
    } finally {
      await prisma.$disconnect();
    }
  } catch (dbErr) {
    console.warn('[player-id] DB 조회 실패, PUBG API 폴백:', dbErr.message);
  }

  // 3순위: PUBG API에서 조회
  try {
    const url = `${PUBG_BASE_URL}/${shard}/players?filter[playerNames]=${encodeURIComponent(nickname)}`;
    const apiRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${PUBG_API_KEY}`,
        Accept: 'application/vnd.api+json',
      },
    });

    if (!apiRes.ok) {
      return res.status(404).json({ error: '플레이어를 찾을 수 없습니다.' });
    }

    const json = await apiRes.json();
    const playerId = json.data?.[0]?.id;
    if (!playerId) {
      return res.status(404).json({ error: '플레이어 ID를 찾을 수 없습니다.' });
    }

    // DB에 캐시 저장 (다음 요청부터 PUBG API 불필요)
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      try {
        await prisma.playerCache.upsert({
          where: { nickname_pubgShardId: { nickname, pubgShardId: shard } },
          update: { pubgPlayerId: playerId },
          create: { nickname, pubgShardId: shard, pubgPlayerId: playerId },
        });
        // ClanMember에도 채워넣기
        await prisma.clanMember.updateMany({
          where: {
            nickname: { equals: nickname, mode: 'insensitive' },
            pubgPlayerId: null,
          },
          data: { pubgPlayerId: playerId, pubgShardId: shard },
        });
      } finally {
        await prisma.$disconnect();
      }
    } catch (saveErr) {
      console.warn('[player-id] DB 저장 실패 (무시):', saveErr.message);
    }

    return res.status(200).json({ playerId });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
