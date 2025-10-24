// pages/api/clan/[clanName].js
// 클랜 상세 정보 API

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { clanName } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 클랜 기본 정보 조회 (이름으로 검색)
    const decodedClanName = decodeURIComponent(clanName);
    const clan = await prisma.clan.findFirst({
      where: {
        name: decodedClanName,
      },
      include: {
        members: true,
      },
    });

    if (!clan) {
      return res.status(404).json({ error: '클랜을 찾을 수 없습니다' });
    }

    // 클랜 순위 계산 (모든 클랜 중에서)
    const allClans = await prisma.clan.findMany({
      include: {
        members: true,
      },
    });

    // 각 클랜의 평균 점수 계산 및 순위 매기기
    const clansWithStats = allClans
      .map((c) => {
        const activeMembers = c.members.filter((m) => m.score > 0);

        if (activeMembers.length === 0) {
          return { ...c, avgScore: 0 };
        }

        const totalScore = activeMembers.reduce((sum, member) => {
          return sum + (member.score || 0);
        }, 0);

        return {
          ...c,
          avgScore: Math.round(totalScore / activeMembers.length),
        };
      })
      .sort((a, b) => b.avgScore - a.avgScore);

    const clanRanking = clansWithStats.findIndex((c) => c.id === clan.id) + 1;

    // 클랜 통계 계산
    const activeMembers = clan.members.filter((m) => m.score > 0);

    let stats = null;
    if (activeMembers.length > 0) {
      stats = {
        avgScore: Math.round(
          activeMembers.reduce((sum, m) => sum + (m.score || 0), 0) /
            activeMembers.length
        ),
        avgDamage: Math.round(
          activeMembers.reduce((sum, m) => sum + (m.avgDamage || 0), 0) /
            activeMembers.length
        ),
        avgKills: (
          activeMembers.reduce((sum, m) => sum + (m.avgKills || 0), 0) /
          activeMembers.length
        ).toFixed(1),
        winRate: Math.round(
          activeMembers.reduce((sum, m) => sum + (m.winRate || 0), 0) /
            activeMembers.length
        ),
        kdRatio: (
          activeMembers.reduce((sum, m) => sum + (m.avgKills || 0), 0) /
          activeMembers.length
        ).toFixed(1),
      };
    }

    // 멤버 정보 정리
    const members = clan.members.map((member) => ({
      id: member.id,
      playerName: member.nickname,
      server: member.pubgShardId || 'steam', // 서버 정보 추가, 기본값은 steam
      joinedAt: member.lastUpdated,
      lastActiveAt: member.lastUpdated,
      stats:
        member.score > 0
          ? {
              score: member.score,
              damage: member.avgDamage,
              kills: member.avgKills,
              winRate: member.winRate,
              kdRatio: member.avgKills,
            }
          : null,
    }));

    // 플레이 스타일 분석 (간단한 버전)
    let playStyle = null;
    if (stats && clan.mainStyle) {
      playStyle = {
        primary: clan.mainStyle || '혼합',
        secondary: '균형잡힌',
        dominance: Math.min(100, Math.round(stats.avgScore / 20)),
        variety: '보통',
        special: stats.avgScore > 1500 ? '고수 클랜' : null,
      };
    }

    const response = {
      clan: {
        id: clan.id,
        name: clan.name,
        tag: clan.pubgClanTag || 'N/A',
        level: clan.pubgClanLevel || 1,
        apiMemberCount: clan.pubgMemberCount || clan.memberCount,
        region: clan.region,
        createdAt: null,
        updatedAt: clan.lastSynced,
        playStyle,
      },
      ranking: {
        overall: clanRanking,
        regional: null, // 향후 구현
        byLevel: null, // 향후 구현
      },
      members,
      stats,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Clan detail API error:', error);
    res
      .status(500)
      .json({ error: '서버 오류가 발생했습니다', details: error.message });
  } finally {
    await prisma.$disconnect();
  }
}
