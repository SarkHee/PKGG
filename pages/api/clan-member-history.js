// pages/api/clan-member-history.js
// 클랜 멤버 이동 히스토리 및 추적 API

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, nickname, clanId } = req.query;

  try {
    if (type === 'member-movements') {
      // 멤버들의 클랜 이동 추적
      const recentUpdates = await prisma.clanMember.findMany({
        where: {
          lastUpdated: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 최근 7일
          },
        },
        include: {
          clan: {
            select: {
              name: true,
              pubgClanTag: true,
            },
          },
        },
        orderBy: {
          lastUpdated: 'desc',
        },
        take: 50,
      });

      return res.status(200).json({
        recentMovements: recentUpdates.map((member) => ({
          nickname: member.nickname,
          clan: member.clan.name,
          clanTag: member.clan.pubgClanTag,
          lastUpdated: member.lastUpdated,
          pubgPlayerId: member.pubgPlayerId,
        })),
      });
    } else if (type === 'player-history' && nickname) {
      // 특정 플레이어의 클랜 히스토리
      const playerHistory = await prisma.clanMember.findMany({
        where: {
          nickname: {
            equals: nickname,
            mode: 'insensitive',
          },
        },
        include: {
          clan: {
            select: {
              name: true,
              pubgClanTag: true,
              pubgClanId: true,
            },
          },
        },
        orderBy: {
          lastUpdated: 'desc',
        },
      });

      return res.status(200).json({
        nickname,
        history: playerHistory.map((record) => ({
          clan: record.clan.name,
          clanTag: record.clan.pubgClanTag,
          joinedAt: record.lastUpdated,
          currentClan: record.pubgClanId === record.clan.pubgClanId,
        })),
      });
    } else if (type === 'clan-activity' && clanId) {
      // 특정 클랜의 멤버 활동
      const clan = await prisma.clan.findUnique({
        where: { id: parseInt(clanId) },
        include: {
          members: {
            orderBy: {
              lastUpdated: 'desc',
            },
          },
        },
      });

      if (!clan) {
        return res.status(404).json({ error: 'Clan not found' });
      }

      const memberActivity = clan.members.map((member) => ({
        nickname: member.nickname,
        score: member.score,
        lastUpdated: member.lastUpdated,
        daysSinceUpdate: Math.floor(
          (Date.now() - new Date(member.lastUpdated)) / (1000 * 60 * 60 * 24)
        ),
        stats: {
          avgDamage: member.avgDamage,
          avgKills: member.avgKills,
          winRate: member.winRate,
        },
      }));

      return res.status(200).json({
        clan: {
          name: clan.name,
          tag: clan.pubgClanTag,
          level: clan.pubgClanLevel,
          memberCount: clan.pubgMemberCount,
        },
        members: memberActivity,
      });
    } else {
      // 전체 클랜 활동 요약
      const activeClans = await prisma.clan.findMany({
        where: {
          lastSynced: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 최근 30일
          },
        },
        include: {
          _count: {
            select: { members: true },
          },
        },
        orderBy: {
          lastSynced: 'desc',
        },
      });

      return res.status(200).json({
        activeClansSummary: activeClans.map((clan) => ({
          name: clan.name,
          tag: clan.pubgClanTag,
          level: clan.pubgClanLevel,
          apiMembers: clan.pubgMemberCount,
          dbMembers: clan._count.members,
          lastSynced: clan.lastSynced,
        })),
      });
    }
  } catch (error) {
    console.error('클랜 히스토리 조회 오류:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}
