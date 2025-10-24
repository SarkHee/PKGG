import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    nickname,
    seasonStats,
    rankedStats,
    lifetimeStats,
    weaponMastery,
    survivalMastery,
  } = req.body;

  if (!nickname) {
    return res.status(400).json({ error: 'Nickname is required' });
  }

  try {
    // 해당 플레이어가 DB에 존재하는지 확인
    const existingMember = await prisma.clanMember.findFirst({
      where: { nickname },
      include: { clan: true },
    });

    if (!existingMember) {
      return res.status(404).json({ error: 'Player not found in database' });
    }

    // 최신 시즌 통계 데이터 업데이트
    const updateData = {};

    // 시즌 통계에서 주요 지표 추출
    if (seasonStats && Object.keys(seasonStats).length > 0) {
      // squad-fpp 모드 우선, 없으면 첫 번째 모드 사용
      const primaryMode =
        seasonStats['squad-fpp'] || Object.values(seasonStats)[0];

      if (primaryMode) {
        // 평균 데미지
        if (primaryMode.damageDealt && primaryMode.roundsPlayed) {
          updateData.avgDamage = Math.round(
            primaryMode.damageDealt / primaryMode.roundsPlayed
          );
        }

        // 평균 킬
        if (primaryMode.kills && primaryMode.roundsPlayed) {
          updateData.avgKills =
            Math.round((primaryMode.kills / primaryMode.roundsPlayed) * 10) /
            10;
        }

        // 평균 어시스트
        if (primaryMode.assists && primaryMode.roundsPlayed) {
          updateData.avgAssists =
            Math.round((primaryMode.assists / primaryMode.roundsPlayed) * 10) /
            10;
        }

        // 평균 생존시간
        if (primaryMode.timeSurvived && primaryMode.roundsPlayed) {
          updateData.avgSurviveTime = Math.round(
            primaryMode.timeSurvived / primaryMode.roundsPlayed
          );
        }

        // 승률
        if (primaryMode.winRatio !== undefined) {
          updateData.winRate = Math.round(primaryMode.winRatio * 100 * 10) / 10;
        }

        // Top10 비율
        if (primaryMode.top10Ratio !== undefined) {
          updateData.top10Rate =
            Math.round(primaryMode.top10Ratio * 100 * 10) / 10;
        }

        // 점수 계산 (킬 * 100 + 딜량 * 0.5 + 생존시간 * 0.1)
        const kills = primaryMode.kills || 0;
        const damage = primaryMode.damageDealt || 0;
        const surviveTime = primaryMode.timeSurvived || 0;
        updateData.score = Math.round(
          kills * 100 + damage * 0.5 + surviveTime * 0.1
        );

        // 플레이 스타일 결정
        const avgKills = updateData.avgKills || 0;
        const avgDamage = updateData.avgDamage || 0;
        const avgSurviveTime = updateData.avgSurviveTime || 0;

        if (avgKills >= 3 && avgDamage >= 300) {
          updateData.style = '어그로';
        } else if (avgDamage >= 250 && avgSurviveTime >= 1200) {
          updateData.style = '서포터';
        } else if (avgSurviveTime >= 1500) {
          updateData.style = '생존형';
        } else if (avgKills >= 2) {
          updateData.style = '킬러';
        } else {
          updateData.style = '밸런스';
        }
      }
    }

    // 업데이트할 데이터가 있는 경우에만 DB 업데이트 실행
    if (Object.keys(updateData).length > 0) {
      await prisma.clanMember.update({
        where: { id: existingMember.id },
        data: {
          ...updateData,
          lastUpdated: new Date(),
        },
      });

      console.log(
        `플레이어 ${nickname}의 최신 시즌 통계가 DB에 업데이트됨:`,
        updateData
      );
    }

    // 모드별 통계 업데이트
    if (seasonStats && Object.keys(seasonStats).length > 0) {
      // 기존 모드 통계 삭제
      await prisma.playerModeStats.deleteMany({
        where: { clanMemberId: existingMember.id },
      });

      // 새로운 모드 통계 추가
      const modeStatsData = Object.entries(seasonStats).map(
        ([mode, stats]) => ({
          clanMemberId: existingMember.id,
          mode: mode,
          matches: stats.roundsPlayed || 0,
          wins: stats.wins || 0,
          top10s: stats.top10s || 0,
          avgDamage: stats.damageDealt
            ? Math.round(
                stats.damageDealt / Math.max(stats.roundsPlayed || 1, 1)
              )
            : 0,
          avgKills: stats.kills
            ? Math.round(
                (stats.kills / Math.max(stats.roundsPlayed || 1, 1)) * 10
              ) / 10
            : 0,
          avgAssists: stats.assists
            ? Math.round(
                (stats.assists / Math.max(stats.roundsPlayed || 1, 1)) * 10
              ) / 10
            : 0,
          winRate: stats.winRatio
            ? Math.round(stats.winRatio * 100 * 10) / 10
            : 0,
          top10Rate: stats.top10Ratio
            ? Math.round(stats.top10Ratio * 100 * 10) / 10
            : 0,
        })
      );

      if (modeStatsData.length > 0) {
        await prisma.playerModeStats.createMany({
          data: modeStatsData,
        });
        console.log(
          `플레이어 ${nickname}의 모드별 통계 ${modeStatsData.length}개 업데이트됨`
        );
      }
    }

    // 클랜 통계 재계산 (백그라운드)
    if (existingMember.clanId) {
      updateClanStatsInBackground(existingMember.clanId).catch((err) => {
        console.error('클랜 통계 업데이트 실패:', err);
      });
    }

    res.status(200).json({
      success: true,
      message: 'Season stats updated successfully',
      updatedFields: Object.keys(updateData),
    });
  } catch (error) {
    console.error('DB 업데이트 오류:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}

// 클랜 통계 재계산 (백그라운드)
async function updateClanStatsInBackground(clanId) {
  const backgroundPrisma = new PrismaClient();

  try {
    // 클랜 멤버들의 평균 통계 계산
    const members = await backgroundPrisma.clanMember.findMany({
      where: { clanId },
    });

    if (members.length === 0) return;

    const avgStats = {
      avgDamage: Math.round(
        members.reduce((sum, m) => sum + (m.avgDamage || 0), 0) / members.length
      ),
      avgKills:
        Math.round(
          (members.reduce((sum, m) => sum + (m.avgKills || 0), 0) /
            members.length) *
            10
        ) / 10,
      avgAssists:
        Math.round(
          (members.reduce((sum, m) => sum + (m.avgAssists || 0), 0) /
            members.length) *
            10
        ) / 10,
      avgSurviveTime: Math.round(
        members.reduce((sum, m) => sum + (m.avgSurviveTime || 0), 0) /
          members.length
      ),
      avgWinRate:
        Math.round(
          (members.reduce((sum, m) => sum + (m.winRate || 0), 0) /
            members.length) *
            10
        ) / 10,
      avgTop10Rate:
        Math.round(
          (members.reduce((sum, m) => sum + (m.top10Rate || 0), 0) /
            members.length) *
            10
        ) / 10,
      avgScore: Math.round(
        members.reduce((sum, m) => sum + (m.score || 0), 0) / members.length
      ),
    };

    // 클랜 통계 업데이트
    await backgroundPrisma.clan.update({
      where: { id: clanId },
      data: {
        ...avgStats,
        memberCount: members.length,
        lastUpdated: new Date(),
      },
    });

    console.log(`클랜 ID ${clanId} 통계 재계산 완료`);
  } catch (error) {
    console.error('클랜 통계 재계산 실패:', error);
  } finally {
    await backgroundPrisma.$disconnect();
  }
}
