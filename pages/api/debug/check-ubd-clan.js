// pages/api/debug/check-ubd-clan.js - UBD 클랜 데이터 확인 및 초기화
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { action } = req.query; // 'check' 또는 'clear'

  try {
    if (action === 'clear') {
      // 모든 UBD 관련 데이터 삭제
      console.log('🗑️ UBD 클랜 데이터 초기화 시작...');

      // 1. UBD 클랜에 속한 멤버 삭제
      const ubdClan = await prisma.clan.findFirst({
        where: {
          name: { contains: 'UBD', mode: 'insensitive' },
        },
      });

      if (ubdClan) {
        const deletedMembers = await prisma.clanMember.deleteMany({
          where: { clanId: ubdClan.id },
        });
        console.log(`🗑️ UBD 클랜 멤버 ${deletedMembers.count}명 삭제`);

        // 2. UBD 클랜 자체 삭제
        const deletedClan = await prisma.clan.delete({
          where: { id: ubdClan.id },
        });
        console.log(`🗑️ UBD 클랜 삭제: ${deletedClan.name}`);
      }

      return res.status(200).json({
        message: 'UBD 클랜 데이터 초기화 완료',
        status: 'cleared',
      });
    }

    // 'check' 또는 기본: UBD 데이터 조회
    console.log('🔍 UBD 클랜 데이터 확인...');

    // 1. UBD 클랜 검색
    const ubdClan = await prisma.clan.findFirst({
      where: {
        name: { contains: 'UBD', mode: 'insensitive' },
      },
    });

    let ubdMembers = [];
    let clanStats = null;

    if (ubdClan) {
      // 2. UBD 클랜 멤버 조회
      ubdMembers = await prisma.clanMember.findMany({
        where: { clanId: ubdClan.id },
        select: {
          id: true,
          nickname: true,
          pubgPlayerId: true,
          pubgClanId: true,
          pubgShardId: true,
          lastUpdated: true,
        },
      });

      clanStats = {
        id: ubdClan.id,
        name: ubdClan.name,
        pubgClanId: ubdClan.pubgClanId,
        pubgClanTag: ubdClan.pubgClanTag,
        pubgClanLevel: ubdClan.pubgClanLevel,
        pubgMemberCount: ubdClan.pubgMemberCount,
        memberCount: ubdClan.memberCount,
        lastSynced: ubdClan.lastSynced,
      };
    }

    // 3. 전체 클랜/멤버 통계
    const totalClans = await prisma.clan.count();
    const totalMembers = await prisma.clanMember.count();

    return res.status(200).json({
      status: 'checked',
      ubdClanFound: !!ubdClan,
      clanStats,
      memberCount: ubdMembers.length,
      members: ubdMembers,
      totalStats: {
        totalClans,
        totalMembers,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  } finally {
    await prisma.$disconnect();
  }
}
