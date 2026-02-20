// 클랜 멤버 일괄 업데이트 API
// /Users/mac/Desktop/PKGG/pages/api/clan/batch-update.js

import {
  fetchClanMembersBatch,
  RateLimitManager,
} from '../../../utils/pubgBatchApi.js';

const rateLimitManager = new RateLimitManager(10); // 분당 10회 제한

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 메소드만 지원됩니다.' });
  }

  const { clanName, memberNames, shard = 'steam' } = req.body;

  if (!clanName || !memberNames || !Array.isArray(memberNames)) {
    return res.status(400).json({
      error: '클랜명과 멤버 닉네임 배열이 필요합니다.',
    });
  }

  try {
    // Rate limit 확인
    await rateLimitManager.waitIfNeeded();

    // 현재 시즌 ID 조회
    const seasonResponse = await fetch(
      `https://api.pubg.com/shards/${shard}/seasons`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PUBG_API_KEY}`,
          Accept: 'application/vnd.api+json',
        },
      }
    );

    if (!seasonResponse.ok) {
      throw new Error('시즌 정보 조회 실패');
    }

    const seasonData = await seasonResponse.json();
    const currentSeason = seasonData.data.find(
      (season) => season.attributes.isCurrentSeason
    );

    if (!currentSeason) {
      throw new Error('현재 시즌을 찾을 수 없습니다.');
    }

    console.log(
      `배치 업데이트 시작: ${clanName} 클랜의 ${memberNames.length}명`
    );

    // 배치로 클랜 멤버 데이터 조회
    const memberData = await fetchClanMembersBatch(
      shard,
      memberNames,
      currentSeason.id
    );

    // DB 업데이트
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    let updatedCount = 0;
    let errorCount = 0;

    try {
      // 클랜 정보 조회
      const clan = await prisma.clan.findUnique({
        where: { name: clanName },
      });

      if (!clan) {
        throw new Error(`클랜 '${clanName}'을 찾을 수 없습니다.`);
      }

      for (const [nickname, data] of Object.entries(memberData)) {
        try {
          if (data.error) {
            console.error(`${nickname} 데이터 조회 실패:`, data.error);
            errorCount++;
            continue;
          }

          // 닉네임으로 전역 검색 (clanId 무관) — 중복 레코드 방지
          const existingMembers = await prisma.clanMember.findMany({
            where: { nickname: { equals: nickname, mode: 'insensitive' } },
            orderBy: { score: 'desc' },
          });

          let member;
          if (existingMembers.length > 1) {
            // 중복 레코드 정리 — 첫 번째 유지, 나머지 삭제
            const keepId = existingMembers[0].id;
            const deleteIds = existingMembers.slice(1).map((m) => m.id);
            await prisma.playerMatch.deleteMany({ where: { clanMemberId: { in: deleteIds } } });
            await prisma.playerModeStats.deleteMany({ where: { clanMemberId: { in: deleteIds } } });
            await prisma.clanMember.deleteMany({ where: { id: { in: deleteIds } } });
            // clanId도 최신으로 갱신
            await prisma.clanMember.update({ where: { id: keepId }, data: { clanId: clan.id } });
            member = { ...existingMembers[0], clanId: clan.id };
          } else if (existingMembers.length === 1) {
            // clanId가 다르면 현재 클랜으로 갱신
            if (existingMembers[0].clanId !== clan.id) {
              await prisma.clanMember.update({
                where: { id: existingMembers[0].id },
                data: { clanId: clan.id },
              });
            }
            member = existingMembers[0];
          } else {
            // 신규 생성
            member = await prisma.clanMember.create({
              data: {
                nickname: nickname,
                clanId: clan.id,
                score: 0,
                style: '-',
                avgDamage: 0,
                avgKills: 0,
                avgAssists: 0,
                avgSurviveTime: 0,
                winRate: 0,
                top10Rate: 0,
              },
            });
          }

          // 시즌 통계에서 주요 데이터 추출
          let avgDamage = 0;
          let avgKills = 0;
          let winRate = 0;
          let top10Rate = 0;

          if (data.seasonStats) {
            // squad-fpp를 우선으로 통계 계산
            const priorityModes = ['squad-fpp', 'squad', 'duo-fpp', 'solo-fpp'];

            for (const mode of priorityModes) {
              if (data.seasonStats[mode]) {
                const stats = data.seasonStats[mode].attributes.gameModeStats;
                if (stats && stats.roundsPlayed > 0) {
                  avgDamage = stats.damageDealt / stats.roundsPlayed;
                  avgKills = stats.kills / stats.roundsPlayed;
                  winRate = (stats.wins / stats.roundsPlayed) * 100;
                  top10Rate = (stats.top10s / stats.roundsPlayed) * 100;
                  break;
                }
              }
            }
          }

          // 멤버 정보 업데이트
          await prisma.clanMember.update({
            where: { id: member.id },
            data: {
              avgDamage: Math.round(avgDamage),
              avgKills: parseFloat(avgKills.toFixed(1)),
              winRate: parseFloat(winRate.toFixed(1)),
              top10Rate: parseFloat(top10Rate.toFixed(1)),
            },
          });

          updatedCount++;
          console.log(
            `${nickname} 업데이트 완료 (딜량: ${Math.round(avgDamage)}, 승률: ${winRate.toFixed(1)}%)`
          );
        } catch (memberError) {
          console.error(`${nickname} 업데이트 실패:`, memberError);
          errorCount++;
        }
      }

      res.status(200).json({
        success: true,
        message: `배치 업데이트 완료`,
        results: {
          total: memberNames.length,
          updated: updatedCount,
          errors: errorCount,
        },
      });
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('배치 업데이트 실패:', error);
    res.status(500).json({
      error: '배치 업데이트 중 오류가 발생했습니다.',
      details: error.message,
    });
  }
}
