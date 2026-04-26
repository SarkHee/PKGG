// pages/api/cron/full-batch-update.js
// 매일 12:00 KST (03:00 UTC) — 전체 클랜 멤버 스탯 PUBG API 갱신 + 스냅샷 저장
//
// 타임아웃 안전 장치: Vercel Pro 300s 기준, 250s 이내에 처리 중단
// 미완료 클랜은 다음 실행 때 이어서 처리됨 (lastUpdated 기준 정렬)

import prisma from '../../../utils/prisma.js';
import { calculateMMR } from '../../../utils/mmrCalculator.js';
import { cachedPubgFetch, TTL } from '../../../utils/pubgApiCache.js';
import { fetchClanMembersBatch } from '../../../utils/pubgBatchApi.js';

const MAX_MS    = 250_000; // 250초 (Vercel Pro 300s 기준 안전 마진)
const DEFAULT_SHARD = 'steam';

export default async function handler(req, res) {
  // Vercel Cron 인증
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();
  const log = { total: 0, updatedClans: 0, updatedMembers: 0, errors: 0, timedOut: false };

  console.log('⏰ [FullBatch] 시작:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

  try {
    // 샤드별 현재 시즌 캐시
    const seasonCache = {};
    async function getSeasonForShard(shard) {
      if (seasonCache[shard]) return seasonCache[shard];
      const data = await cachedPubgFetch(
        `https://api.pubg.com/shards/${shard}/seasons`,
        { ttl: TTL.SEASON }
      );
      const season = data?.data?.find(s => s.attributes?.isCurrentSeason);
      seasonCache[shard] = season;
      return season;
    }

    // 클랜 목록 — lastSynced 오래된 순으로 처리 (공평하게 순환)
    const clans = await prisma.clan.findMany({
      where: { NOT: { name: '무소속' } },
      include: { members: true },
      orderBy: { lastSynced: { sort: 'asc', nulls: 'first' } },
    });

    log.total = clans.length;

    for (const clan of clans) {
      // 타임아웃 체크
      if (Date.now() - startTime > MAX_MS) {
        log.timedOut = true;
        console.warn(`⚠️ [FullBatch] 타임아웃 도달, ${log.updatedClans}/${clans.length} 클랜 완료`);
        break;
      }

      const members = clan.pubgClanId
        ? clan.members.filter(m => m.pubgClanId === clan.pubgClanId)
        : clan.members;

      if (members.length === 0) continue;

      // 멤버별 shard 그룹핑 (kakao/steam 혼재 가능)
      const shardGroups = {};
      for (const m of members) {
        const shard = m.pubgShardId || DEFAULT_SHARD;
        if (!shardGroups[shard]) shardGroups[shard] = [];
        shardGroups[shard].push(m);
      }

      try {
        const allMemberData = {};
        for (const [shard, shardMembers] of Object.entries(shardGroups)) {
          const currentSeason = await getSeasonForShard(shard);
          if (!currentSeason) { console.warn(`[FullBatch] ${shard} 시즌 없음`); continue; }
          const memberNames = shardMembers.map(m => m.nickname);
          // PUBG API 배치 조회
          const memberData = await fetchClanMembersBatch(shard, memberNames, currentSeason.id);
          Object.assign(allMemberData, memberData);
        }
        const memberData = allMemberData;
        const memberNames = members.map(m => m.nickname);

        for (const [nickname, data] of Object.entries(memberData)) {
          if (data.error) { log.errors++; continue; }

          const member = members.find(m => m.nickname.toLowerCase() === nickname.toLowerCase());
          if (!member) continue;

          // 시즌 스탯 추출 (우선순위: squad-fpp > squad > duo-fpp > solo-fpp)
          let avgDamage = 0, avgKills = 0, avgAssists = 0;
          let avgSurviveTime = 0, winRate = 0, top10Rate = 0;

          const priorityModes = ['squad-fpp', 'squad', 'duo-fpp', 'solo-fpp'];
          for (const mode of priorityModes) {
            const stats = data.seasonStats?.[mode]?.attributes?.gameModeStats?.[mode];
            if (stats && stats.roundsPlayed > 0) {
              const r = stats.roundsPlayed;
              avgDamage      = (stats.damageDealt  || 0) / r;
              avgKills       = (stats.kills        || 0) / r;
              avgAssists     = (stats.assists      || 0) / r;
              avgSurviveTime = (stats.timeSurvived || 0) / r;
              winRate        = ((stats.wins  || 0) / r) * 100;
              top10Rate      = ((stats.top10s|| 0) / r) * 100;
              break;
            }
          }

          const hasData = avgDamage > 0 || avgKills > 0 || winRate > 0;
          const score   = calculateMMR({ avgDamage, avgKills, avgAssists, avgSurviveTime, winRate, top10Rate });

          // ClanMember 업데이트
          await prisma.clanMember.update({
            where: { id: member.id },
            data: {
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

          // 성장 추적 스냅샷 저장
          if (hasData) {
            await prisma.playerStatSnapshot.create({
              data: {
                nickname,
                pubgShardId: member.pubgShardId || DEFAULT_SHARD,
                score,
                avgDamage:      Math.round(avgDamage),
                avgKills:       parseFloat(avgKills.toFixed(2)),
                avgAssists:     parseFloat(avgAssists.toFixed(2)),
                avgSurviveTime: Math.round(avgSurviveTime),
                winRate:        parseFloat(winRate.toFixed(1)),
                top10Rate:      parseFloat(top10Rate.toFixed(1)),
              },
            }).catch(e => console.warn(`${nickname} 스냅샷 저장 실패:`, e.message));

            log.updatedMembers++;
          }
        }

        // 클랜 동기화 시각 갱신
        await prisma.clan.update({
          where: { id: clan.id },
          data: { lastSynced: new Date(), memberCount: members.length },
        });

        log.updatedClans++;
        console.log(`✅ [FullBatch] ${clan.name} 완료 (${memberNames.length}명)`);

      } catch (clanErr) {
        console.error(`❌ [FullBatch] ${clan.name} 실패:`, clanErr.message);
        log.errors++;
      }
    }

    // 실행 로그 저장
    await prisma.rankingUpdateLog.create({
      data: {
        updateType:   'cron_full_batch',
        updatedCount: log.updatedMembers,
        updateTime:   new Date(),
        status:       log.timedOut ? 'partial' : 'success',
        details: JSON.stringify({
          durationMs:     Date.now() - startTime,
          totalClans:     log.total,
          updatedClans:   log.updatedClans,
          updatedMembers: log.updatedMembers,
          errors:         log.errors,
          timedOut:       log.timedOut,
        }),
      },
    }).catch(() => {});

    console.log(`🏁 [FullBatch] 완료: ${log.updatedClans}클랜 / ${log.updatedMembers}명 / ${Date.now() - startTime}ms`);

    return res.status(200).json({ success: true, ...log, durationMs: Date.now() - startTime });

  } catch (error) {
    console.error('❌ [FullBatch] 전체 실패:', error.message);
    await prisma.rankingUpdateLog.create({
      data: {
        updateType: 'cron_full_batch', updatedCount: 0,
        updateTime: new Date(), status: 'error',
        errorMessage: error.message,
      },
    }).catch(() => {});
    return res.status(500).json({ success: false, error: error.message });
  }
}
