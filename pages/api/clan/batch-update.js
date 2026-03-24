// 클랜 멤버 일괄 업데이트 API
// /Users/mac/Desktop/PKGG/pages/api/clan/batch-update.js

import {
  fetchClanMembersBatch,
  RateLimitManager,
} from '../../../utils/pubgBatchApi.js';
import prisma from '../../../utils/prisma.js';
import { calculateMMR } from '../../../utils/mmrCalculator';
import { cachedPubgFetch, TTL } from '../../../utils/pubgApiCache.js';

const rateLimitManager = new RateLimitManager(10); // 분당 10회 제한

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 메소드만 지원됩니다.' });
  }

  // 관리자 인증 확인
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: '관리자 인증이 필요합니다.' });
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

    // 현재 시즌 ID 조회 (60분 캐시)
    const seasonData = await cachedPubgFetch(
      `https://api.pubg.com/shards/${shard}/seasons`,
      { ttl: TTL.SEASON }
    );
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

    // 클랜 정보 조회
    const clan = await prisma.clan.findUnique({
      where: { name: clanName },
    });

    if (!clan) {
      throw new Error(`클랜 '${clanName}'을 찾을 수 없습니다.`);
    }

    // 모든 멤버 DB 일괄 조회 (N+1 방지)
    const allExistingMembers = await prisma.clanMember.findMany({
      where: { nickname: { in: memberNames, mode: 'insensitive' } },
    });
    const membersByNickname = new Map();
    for (const m of allExistingMembers) {
      const key = m.nickname.toLowerCase();
      if (!membersByNickname.has(key)) membersByNickname.set(key, []);
      membersByNickname.get(key).push(m);
    }

    let updatedCount = 0;
    let errorCount = 0;

    for (const [nickname, data] of Object.entries(memberData)) {
      try {
        if (data.error) {
          console.error(`${nickname} 데이터 조회 실패:`, data.error);
          errorCount++;
          continue;
        }

        const existingMembers = membersByNickname.get(nickname.toLowerCase()) || [];

        let member;
        if (existingMembers.length > 1) {
          // 중복 레코드 정리 — pubgPlayerId 있는 레코드를 우선 유지, 없으면 첫 번째 유지
          const withId = existingMembers.find((m) => m.pubgPlayerId);
          const keepRecord = withId || existingMembers[0];
          const deleteIds = existingMembers.filter((m) => m.id !== keepRecord.id).map((m) => m.id);
          await Promise.all([
            prisma.playerMatch.deleteMany({ where: { clanMemberId: { in: deleteIds } } }),
            prisma.playerModeStats.deleteMany({ where: { clanMemberId: { in: deleteIds } } }),
            prisma.clanMember.deleteMany({ where: { id: { in: deleteIds } } }),
          ]);
          if (keepRecord.clanId !== clan.id) {
            await prisma.clanMember.update({ where: { id: keepRecord.id }, data: { clanId: clan.id } });
          }
          member = { ...keepRecord, clanId: clan.id };
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
              pubgPlayerId: data.basicInfo?.id || null,
              pubgShardId: shard,
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
        let avgAssists = 0;
        let avgSurviveTime = 0;
        let winRate = 0;
        let top10Rate = 0;

        if (data.seasonStats) {
          const priorityModes = ['squad-fpp', 'squad', 'duo-fpp', 'solo-fpp'];
          for (const mode of priorityModes) {
            if (data.seasonStats[mode]) {
              const gameModeStats = data.seasonStats[mode].attributes?.gameModeStats;
              const stats = gameModeStats?.[mode];
              if (stats && stats.roundsPlayed > 0) {
                avgDamage      = (stats.damageDealt  || 0) / stats.roundsPlayed;
                avgKills       = (stats.kills        || 0) / stats.roundsPlayed;
                avgAssists     = (stats.assists      || 0) / stats.roundsPlayed;
                avgSurviveTime = (stats.timeSurvived || 0) / stats.roundsPlayed;
                winRate        = ((stats.wins  || 0) / stats.roundsPlayed) * 100;
                top10Rate      = ((stats.top10s|| 0) / stats.roundsPlayed) * 100;
                break;
              }
            }
          }
        }

        // score 계산 (MMR 기반)
        const score = calculateMMR({ avgDamage, avgKills, winRate, top10Rate, avgSurviveTime, avgAssists });

        // 멤버 정보 업데이트
        const hasData = avgDamage > 0 || avgKills > 0 || winRate > 0;
        await prisma.clanMember.update({
          where: { id: member.id },
          data: {
            ...(data.basicInfo?.id && !member.pubgPlayerId
              ? { pubgPlayerId: data.basicInfo.id, pubgShardId: shard }
              : {}),
            ...(hasData ? {
              avgDamage:      Math.round(avgDamage),
              avgKills:       parseFloat(avgKills.toFixed(2)),
              avgAssists:     parseFloat(avgAssists.toFixed(2)),
              avgSurviveTime: Math.round(avgSurviveTime),
              winRate:        parseFloat(winRate.toFixed(1)),
              top10Rate:      parseFloat(top10Rate.toFixed(1)),
              score,
            } : {}),
            lastUpdated: new Date(),
          },
        });

        // 성장 추적 스냅샷 저장 (hasData일 때만)
        if (hasData) {
          await prisma.playerStatSnapshot.create({
            data: {
              nickname,
              pubgShardId: shard,
              score,
              avgDamage:      Math.round(avgDamage),
              avgKills:       parseFloat(avgKills.toFixed(2)),
              avgAssists:     parseFloat(avgAssists.toFixed(2)),
              avgSurviveTime: Math.round(avgSurviveTime),
              winRate:        parseFloat(winRate.toFixed(1)),
              top10Rate:      parseFloat(top10Rate.toFixed(1)),
            },
          }).catch((e) => console.warn(`${nickname} 스냅샷 저장 실패(무시):`, e.message));
        }

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
  } catch (error) {
    console.error('배치 업데이트 실패:', error);
    res.status(500).json({
      error: '배치 업데이트 중 오류가 발생했습니다.',
      ...(process.env.NODE_ENV !== 'production' && { details: error.message }),
    });
  }
}
