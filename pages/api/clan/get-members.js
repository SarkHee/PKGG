// pages/api/clan/get-members.js
// 클랜 ID로 해당 클랜의 모든 멤버 닉네임을 가져오는 API

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clanId, pubgClanId, format } = req.query;

    // 1. DB 내부 ID로 검색하는 경우
    if (clanId) {
      const members = await prisma.clanMember.findMany({
        where: { clanId: parseInt(clanId) },
        select: {
          nickname: true,
          score: true,
          pubgPlayerId: true,
          pubgShardId: true,
          lastUpdated: true,
        },
        orderBy: { score: 'desc' },
      });

      const clan = await prisma.clan.findUnique({
        where: { id: parseInt(clanId) },
        select: {
          name: true,
          pubgClanTag: true,
          memberCount: true,
        },
      });

      if (!clan) {
        return res.status(404).json({ error: 'Clan not found' });
      }

      // format 파라미터에 따라 응답 형태 결정
      if (format === 'nicknames') {
        // 닉네임만 배열로 반환
        return res.status(200).json({
          nicknames: members.map((member) => member.nickname),
          totalCount: members.length,
        });
      }

      // 기본: 전체 정보 반환
      return res.status(200).json({
        clan,
        members,
        totalCount: members.length,
      });
    }

    // 2. PUBG 클랜 ID로 검색하는 경우
    if (pubgClanId) {
      const clan = await prisma.clan.findFirst({
        where: { pubgClanId },
        include: {
          members: {
            select: {
              nickname: true,
              score: true,
              pubgPlayerId: true,
              pubgShardId: true,
              lastUpdated: true,
            },
            orderBy: { score: 'desc' },
          },
        },
      });

      if (!clan) {
        return res.status(404).json({ error: 'Clan not found' });
      }

      // format 파라미터에 따라 응답 형태 결정
      if (format === 'nicknames') {
        // 닉네임만 배열로 반환
        return res.status(200).json({
          nicknames: clan.members.map((member) => member.nickname),
          totalCount: clan.members.length,
        });
      }

      // 기본: 전체 정보 반환
      return res.status(200).json({
        clan: {
          name: clan.name,
          pubgClanTag: clan.pubgClanTag,
          memberCount: clan.memberCount,
        },
        members: clan.members,
        totalCount: clan.members.length,
      });
    }

    return res.status(400).json({
      error: 'clanId or pubgClanId parameter is required',
      usage: {
        example1: '/api/clan/get-members?clanId=1',
        example2:
          '/api/clan/get-members?pubgClanId=clan.eb5c32a3cc484b59981f9c61e9ea2747',
        example3: '/api/clan/get-members?clanId=1&format=nicknames',
        description:
          'Use clanId for internal DB ID or pubgClanId for PUBG API clan ID. Add format=nicknames to get only nickname array.',
      },
    });
  } catch (error) {
    console.error('클랜 멤버 조회 오류:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  } finally {
    await prisma.$disconnect();
  }
}
