// pages/api/debug/check-player.js - 특정 플레이어 데이터 확인
import prisma from '../../../utils/prisma.js';

export default async function handler(req, res) {
  const { nickname } = req.query;

  if (!nickname) {
    return res.status(400).json({
      error: 'nickname parameter required',
      example: '/api/debug/check-player?nickname=DN_Tosi',
    });
  }

  try {
    console.log(`🔍 플레이어 검색: ${nickname}`);

    // 1. DB에서 플레이어 검색
    const member = await prisma.clanMember.findFirst({
      where: {
        nickname: {
          contains: nickname,
          mode: 'insensitive',
        },
      },
      include: {
        clan: true,
      },
    });

    if (!member) {
      return res.status(404).json({
        found: false,
        message: `플레이어 '${nickname}'을 DB에서 찾을 수 없습니다.`,
      });
    }

    return res.status(200).json({
      found: true,
      player: {
        id: member.id,
        nickname: member.nickname,
        pubgPlayerId: member.pubgPlayerId,
        pubgShardId: member.pubgShardId,
        score: member.score,
        style: member.style,
        avgDamage: member.avgDamage,
        avgKills: member.avgKills,
        avgAssists: member.avgAssists,
        avgSurviveTime: member.avgSurviveTime,
        winRate: member.winRate,
        top10Rate: member.top10Rate,
        lastUpdated: member.lastUpdated,
      },
      clan: member.clan
        ? {
            id: member.clan.id,
            name: member.clan.name,
            pubgClanId: member.clan.pubgClanId,
            pubgClanTag: member.clan.pubgClanTag,
            pubgClanLevel: member.clan.pubgClanLevel,
            pubgMemberCount: member.clan.pubgMemberCount,
            memberCount: member.clan.memberCount,
            leader: member.clan.leader,
            description: member.clan.description,
            lastSynced: member.clan.lastSynced,
          }
        : null,
      clanId: member.clanId,
      pubgClanId: member.pubgClanId,
      message: member.clan
        ? `✅ 플레이어 ${member.nickname}은 클랜 ${member.clan.name}에 소속되어 있습니다.`
        : `⚠️ 플레이어 ${member.nickname}은 클랜에 소속되지 않았습니다.`,
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
