// pages/api/cron/full-batch-update.js
// 매일 12:00 KST (03:00 UTC) — 전체 클랜 멤버 스탯 PUBG API 갱신 + 스냅샷 저장
//
// 타임아웃 안전 장치: Vercel Pro 300s 기준, 250s 이내에 처리 중단
// 미완료 클랜은 다음 실행 때 이어서 처리됨 (lastSynced 기준 정렬)

import prisma from '../../../utils/prisma.js';
import { calculateMMR } from '../../../utils/mmrCalculator.js';
import { cachedPubgFetch, TTL } from '../../../utils/pubgApiCache.js';
import { fetchClanMembersBatch } from '../../../utils/pubgBatchApi.js';

const MAX_MS        = 250_000;
const DEFAULT_SHARD = 'steam';
const ACTIVE_DAYS   = 30; // 최근 N일 내 업데이트된 멤버만 처리 (버그2)
const ALL_MODES     = ['solo', 'duo', 'squad', 'solo-fpp', 'duo-fpp', 'squad-fpp'];
// RP 우선, RP 같으면 티어 우선 — pages/api/pubg/[nickname].js 티어 선정 로직과 동일
const TIER_ORDER = ['Conqueror', 'Master', 'Diamond', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Unranked'];

// 경쟁전 전 모드 중 RP가 가장 높은(동률이면 티어가 높은) 모드를 대표 티어로 선정
function pickBestRankedTier(rankedGameModeStats) {
  const entries = Object.values(rankedGameModeStats || {})
    .filter((r) => r?.currentTier?.tier);
  if (entries.length === 0) return null;
  entries.sort((a, b) => {
    const rpA = a.currentRankPoint || 0, rpB = b.currentRankPoint || 0;
    if (rpB !== rpA) return rpB - rpA;
    return TIER_ORDER.indexOf(a.currentTier.tier) - TIER_ORDER.indexOf(b.currentTier.tier);
  });
  const top = entries[0];
  // PUBG API는 currentTier.subTier를 문자열("4")로 내려줌 — Int 컬럼이라 반드시 숫자로 변환
  return { tier: top.currentTier.tier, subTier: parseInt(top.currentTier.subTier, 10) || 0, rp: top.currentRankPoint || 0 };
}

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();

  // [버그3] 에러 카운터 분리
  const log = {
    total: 0,
    updatedClans: 0,
    updatedMembers: 0,
    skippedInactive: 0,
    clanErrors: 0,   // 클랜 레벨 에러 (API 실패 등)
    memberErrors: 0, // 멤버 레벨 에러 (data.error)
    apiErrors: 0,    // PUBG API 에러 (상세)
    timedOut: false,
  };

  console.log('⏰ [FullBatch] 시작:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

  try {
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

    // [버그1] 개별 플레이어 시즌 통계 fallback
    async function fetchPlayerSeasonStatsDirect(shard, playerId, seasonId) {
      const url = `https://api.pubg.com/shards/${shard}/players/${playerId}/seasons/${seasonId}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.PUBG_API_KEY}`,
          Accept: 'application/vnd.api+json',
        },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error(`[FullBatch] 개별 시즌 통계 실패 playerId=${playerId} status=${res.status} body=${body.slice(0, 200)}`);
        log.apiErrors++;
        return null;
      }
      return await res.json();
    }

    // 멤버 데이터에서 일반전 6모드 합산
    function sumNormalStats(seasonStats) {
      let totalRounds = 0, totalDamage = 0, totalKills = 0;
      let totalSurvival = 0, totalWins = 0, totalTop10s = 0, totalAssists = 0;
      for (const mode of ALL_MODES) {
        const stats = seasonStats?.[mode]?.attributes?.gameModeStats?.[mode];
        if (!stats?.roundsPlayed) continue;
        totalRounds   += stats.roundsPlayed;
        totalDamage   += stats.damageDealt  || 0;
        totalKills    += stats.kills        || 0;
        totalAssists  += stats.assists      || 0;
        totalSurvival += stats.timeSurvived || 0;
        totalWins     += stats.wins         || 0;
        totalTop10s   += stats.top10s       || 0;
      }
      return { totalRounds, totalDamage, totalKills, totalAssists, totalSurvival, totalWins, totalTop10s };
    }

    // 개별 플레이어 API 응답(단일 객체)에서 합산
    function sumNormalStatsDirect(directData) {
      const gms = directData?.data?.attributes?.gameModeStats || {};
      let totalRounds = 0, totalDamage = 0, totalKills = 0;
      let totalSurvival = 0, totalWins = 0, totalTop10s = 0, totalAssists = 0;
      for (const mode of ALL_MODES) {
        const stats = gms[mode];
        if (!stats?.roundsPlayed) continue;
        totalRounds   += stats.roundsPlayed;
        totalDamage   += stats.damageDealt  || 0;
        totalKills    += stats.kills        || 0;
        totalAssists  += stats.assists      || 0;
        totalSurvival += stats.timeSurvived || 0;
        totalWins     += stats.wins         || 0;
        totalTop10s   += stats.top10s       || 0;
      }
      return { totalRounds, totalDamage, totalKills, totalAssists, totalSurvival, totalWins, totalTop10s };
    }

    // 클랜 목록 — lastSynced 오래된 순으로 처리
    const clans = await prisma.clan.findMany({
      where: { NOT: { name: '무소속' } },
      include: { members: true },
      orderBy: { lastSynced: { sort: 'asc', nulls: 'first' } },
    });

    log.total = clans.length;

    // [버그2] 활성 기준 날짜 (30일)
    const activeThreshold = new Date(Date.now() - ACTIVE_DAYS * 24 * 60 * 60 * 1000);

    for (const clan of clans) {
      if (Date.now() - startTime > MAX_MS) {
        log.timedOut = true;
        console.warn(`⚠️ [FullBatch] 타임아웃 도달, ${log.updatedClans}/${clans.length} 클랜 완료`);
        break;
      }

      const allMembers = clan.pubgClanId
        ? clan.members.filter(m => m.pubgClanId === clan.pubgClanId)
        : clan.members;

      if (allMembers.length === 0) continue;

      // [버그2] 최근 30일 내 업데이트된 활성 멤버만 처리
      const members = allMembers.filter(m => {
        if (!m.lastUpdated) return true; // 한 번도 업데이트 안 된 멤버는 포함
        return new Date(m.lastUpdated) >= activeThreshold;
      });

      const skipped = allMembers.length - members.length;
      if (skipped > 0) {
        log.skippedInactive += skipped;
        console.log(`[FullBatch] ${clan.name}: ${skipped}명 비활성 제외, ${members.length}명 처리 대상`);
      }

      if (members.length === 0) {
        // 멤버 없어도 lastSynced 갱신
        await prisma.clan.update({ where: { id: clan.id }, data: { lastSynced: new Date() } }).catch(() => {});
        log.updatedClans++;
        continue;
      }

      // 멤버별 shard 그룹핑
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
          if (!currentSeason) {
            console.warn(`[FullBatch] ${shard} 시즌 없음`);
            continue;
          }
          const memberNames = shardMembers.map(m => m.nickname);

          // 배치 조회 시도
          let memberData = {};
          try {
            memberData = await fetchClanMembersBatch(shard, memberNames, currentSeason.id);
          } catch (batchErr) {
            // [버그1] 배치 자체가 throw한 경우 — 상세 로그
            console.error(`[FullBatch] 배치 조회 실패 shard=${shard} clan=${clan.name}:`, batchErr.message);
            log.apiErrors++;
          }

          // [버그1] 배치 결과에서 data.error인 멤버 → 개별 API fallback
          for (const shardMember of shardMembers) {
            const nick = shardMember.nickname;
            const d = memberData[nick] || memberData[nick.toLowerCase()];

            if (!d || d.error) {
              if (d?.error) {
                console.warn(`[FullBatch] 배치 멤버 에러 nick=${nick}: ${d.error}`);
                log.memberErrors++;
              } else {
                console.warn(`[FullBatch] 배치 결과 없음 nick=${nick}, fallback 시도`);
              }

              // [버그1] 개별 플레이어 ID 조회 후 직접 시즌 통계 호출
              if (shardMember.pubgPlayerId) {
                const directData = await fetchPlayerSeasonStatsDirect(shard, shardMember.pubgPlayerId, currentSeason.id);
                if (directData) {
                  memberData[nick] = { basicInfo: null, seasonStatsDirect: directData };
                  console.log(`[FullBatch] fallback 성공 nick=${nick}`);
                } else {
                  memberData[nick] = { error: 'fallback_failed' };
                }
              } else {
                console.warn(`[FullBatch] pubgPlayerId 없음 nick=${nick}, 스킵`);
                memberData[nick] = { error: 'no_player_id' };
              }
            }
          }

          Object.assign(allMemberData, memberData);
        }

        const memberNames = members.map(m => m.nickname);

        for (const member of members) {
          const nick = member.nickname;
          const data = allMemberData[nick] || allMemberData[nick.toLowerCase()];

          if (!data || data.error) {
            // [버그3] 멤버 에러 카운터
            if (data?.error !== 'no_player_id') log.memberErrors++;
            console.warn(`[FullBatch] 멤버 스킵 nick=${nick} reason=${data?.error || 'no_data'}`);
            continue;
          }

          // 일반전 합산 — 배치 결과 또는 직접 API 결과 분기
          let totals;
          if (data.seasonStatsDirect) {
            totals = sumNormalStatsDirect(data.seasonStatsDirect);
          } else {
            totals = sumNormalStats(data.seasonStats);
          }

          const { totalRounds, totalDamage, totalKills, totalAssists, totalSurvival, totalWins, totalTop10s } = totals;

          // 경쟁전 합산 — 일반전 합계(totals)와 분리해서 별도 집계 (멤버 탭 일반전/경쟁전 토글용)
          let rTotalRounds = 0, rTotalDamage = 0, rTotalKills = 0;
          let rTotalAssists = 0, rTotalSurvival = 0, rTotalWins = 0, rTotalTop10s = 0;
          let bestTier = null;
          const shard = member.pubgShardId || DEFAULT_SHARD;
          const currentSeason = seasonCache[shard];
          if (member.pubgPlayerId && currentSeason) {
            try {
              const rankedData = await cachedPubgFetch(
                `https://api.pubg.com/shards/${shard}/players/${member.pubgPlayerId}/seasons/${currentSeason.id}/ranked`,
                { ttl: TTL.PLAYER }
              );
              const rms = rankedData?.data?.attributes?.rankedGameModeStats || {};
              bestTier = pickBestRankedTier(rms);
              // 경쟁전(ranked) API는 일반전(gameModeStats)과 필드명이 다름:
              // timeSurvived(합계)가 아니라 avgSurvivalTime(이미 라운드당 평균), top10s(횟수)가 아니라
              // top10Ratio(0~1 비율)로 내려옴 — 모드 간 가중평균을 위해 라운드 수를 곱해 합계로 환산 후 나중에 나눔
              for (const rm of Object.values(rms)) {
                if (!rm?.roundsPlayed) continue;
                rTotalRounds   += rm.roundsPlayed;
                rTotalDamage   += rm.damageDealt  || 0;
                rTotalKills    += rm.kills        || 0;
                rTotalAssists  += rm.assists      || 0;
                rTotalSurvival += (rm.avgSurvivalTime || 0) * rm.roundsPlayed;
                rTotalWins     += rm.wins         || 0;
                rTotalTop10s   += (rm.top10Ratio  || 0) * rm.roundsPlayed;
              }
            } catch (rankedErr) {
              console.warn(`[FullBatch] ranked 조회 실패 nick=${nick}:`, rankedErr.message);
            }
          }

          let avgDamage = 0, avgKills = 0, avgAssists = 0;
          let avgSurviveTime = 0, winRate = 0, top10Rate = 0;
          if (totalRounds > 0) {
            avgDamage      = totalDamage   / totalRounds;
            avgKills       = totalKills    / totalRounds;
            avgAssists     = totalAssists  / totalRounds;
            avgSurviveTime = totalSurvival / totalRounds;
            winRate        = (totalWins   / totalRounds) * 100;
            top10Rate      = (totalTop10s / totalRounds) * 100;
          }

          let rankedAvgDamage = 0, rankedAvgKills = 0, rankedAvgAssists = 0;
          let rankedAvgSurviveTime = 0, rankedWinRate = 0, rankedTop10Rate = 0, rankedScore = 0;
          if (rTotalRounds > 0) {
            rankedAvgDamage      = rTotalDamage   / rTotalRounds;
            rankedAvgKills       = rTotalKills    / rTotalRounds;
            rankedAvgAssists     = rTotalAssists  / rTotalRounds;
            rankedAvgSurviveTime = rTotalSurvival / rTotalRounds;
            rankedWinRate        = (rTotalWins   / rTotalRounds) * 100;
            rankedTop10Rate      = (rTotalTop10s / rTotalRounds) * 100;
            rankedScore = calculateMMR({
              avgDamage: rankedAvgDamage, avgKills: rankedAvgKills, avgAssists: rankedAvgAssists,
              avgSurviveTime: rankedAvgSurviveTime, winRate: rankedWinRate, top10Rate: rankedTop10Rate,
            });
          }

          const hasData = avgDamage > 0 || avgKills > 0 || winRate > 0;
          if (!hasData && rTotalRounds === 0) {
            console.warn(`[FullBatch] hasData=false nick=${nick} totalRounds=${totalRounds} — 배치 통계 비어있음`);
            continue;
          }

          const score = calculateMMR({ avgDamage, avgKills, avgAssists, avgSurviveTime, winRate, top10Rate });
          const existingScore = calculateMMR({
            avgDamage:  member.avgDamage  || 0,
            avgKills:   member.avgKills   || 0,
            winRate:    member.winRate    || 0,
            top10Rate:  member.top10Rate  || 0,
          });
          const shouldUpdate = hasData && (score >= existingScore * 0.7 || !member.avgDamage);

          await prisma.clanMember.update({
            where: { id: member.id },
            data: {
              ...(shouldUpdate ? {
                avgDamage:      Math.round(avgDamage),
                avgKills:       parseFloat(avgKills.toFixed(2)),
                avgAssists:     parseFloat(avgAssists.toFixed(2)),
                avgSurviveTime: Math.round(avgSurviveTime),
                winRate:        parseFloat(winRate.toFixed(1)),
                top10Rate:      parseFloat(top10Rate.toFixed(1)),
                score,
              } : {}),
              // 경쟁전 데이터는 이번 조회에서 실제로 라운드를 찾은 경우에만 갱신
              // (일시적 API 실패로 0건 조회됐다고 기존 경쟁전 기록을 지우지 않기 위함)
              ...(rTotalRounds > 0 ? {
                rankedAvgDamage:      Math.round(rankedAvgDamage),
                rankedAvgKills:       parseFloat(rankedAvgKills.toFixed(2)),
                rankedAvgAssists:     parseFloat(rankedAvgAssists.toFixed(2)),
                rankedAvgSurviveTime: Math.round(rankedAvgSurviveTime),
                rankedWinRate:        parseFloat(rankedWinRate.toFixed(1)),
                rankedTop10Rate:      parseFloat(rankedTop10Rate.toFixed(1)),
                rankedRoundsPlayed:   rTotalRounds,
                rankedScore,
                ...(bestTier ? { rankedTier: bestTier.tier, rankedSubTier: bestTier.subTier, rankedRP: bestTier.rp } : {}),
              } : {}),
              lastUpdated: new Date(),
            },
          });

          await prisma.playerStatSnapshot.create({
            data: {
              nickname: nick,
              pubgShardId: member.pubgShardId || DEFAULT_SHARD,
              score,
              avgDamage:      Math.round(avgDamage),
              avgKills:       parseFloat(avgKills.toFixed(2)),
              avgAssists:     parseFloat(avgAssists.toFixed(2)),
              avgSurviveTime: Math.round(avgSurviveTime),
              winRate:        parseFloat(winRate.toFixed(1)),
              top10Rate:      parseFloat(top10Rate.toFixed(1)),
            },
          }).catch(e => console.warn(`[FullBatch] 스냅샷 저장 실패 nick=${nick}:`, e.message));

          log.updatedMembers++;
          console.log(`  ✔ ${nick} MMR=${score} avg딜=${Math.round(avgDamage)} shouldUpdate=${shouldUpdate}`);
        }

        await prisma.clan.update({
          where: { id: clan.id },
          data: { lastSynced: new Date(), memberCount: allMembers.length },
        });

        log.updatedClans++;
        console.log(`✅ [FullBatch] ${clan.name} 완료 (처리 ${members.length}명 / 전체 ${allMembers.length}명)`);

      } catch (clanErr) {
        // [버그3] 클랜 레벨 에러
        console.error(`❌ [FullBatch] ${clan.name} 클랜 실패:`, clanErr.message);
        log.clanErrors++;
      }
    }

    const details = {
      durationMs:      Date.now() - startTime,
      totalClans:      log.total,
      updatedClans:    log.updatedClans,
      updatedMembers:  log.updatedMembers,
      skippedInactive: log.skippedInactive,
      clanErrors:      log.clanErrors,
      memberErrors:    log.memberErrors,
      apiErrors:       log.apiErrors,
      timedOut:        log.timedOut,
    };

    await prisma.rankingUpdateLog.create({
      data: {
        updateType:   'cron_full_batch',
        updatedCount: log.updatedMembers,
        updateTime:   new Date(),
        status:       log.timedOut ? 'partial' : 'success',
        details:      JSON.stringify(details),
      },
    }).catch(() => {});

    console.log(`🏁 [FullBatch] 완료: ${log.updatedClans}클랜 / ${log.updatedMembers}명 / clanErr=${log.clanErrors} memberErr=${log.memberErrors} apiErr=${log.apiErrors} / ${Date.now() - startTime}ms`);

    return res.status(200).json({ success: true, ...details });

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
