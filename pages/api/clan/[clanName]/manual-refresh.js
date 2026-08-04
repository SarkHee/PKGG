// POST /api/clan/[clanName]/manual-refresh
// 클랜장 또는 관리자만 호출 가능 — 해당 클랜 멤버 스탯 즉시 갱신

import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '../../../../utils/prisma.js';
import { calculateMMR } from '../../../../utils/mmrCalculator.js';
import { cachedPubgFetch, TTL } from '../../../../utils/pubgApiCache.js';
import { fetchClanMembersBatch } from '../../../../utils/pubgBatchApi.js';

const DEFAULT_SHARD = 'steam';
const ALL_MODES = ['solo', 'duo', 'squad', 'solo-fpp', 'duo-fpp', 'squad-fpp'];
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
// RP 우선, RP 같으면 티어 우선 — pages/api/pubg/[nickname].js 티어 선정 로직과 동일
const TIER_ORDER = ['Conqueror', 'Master', 'Diamond', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Unranked'];

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
  if (req.method !== 'POST') return res.status(405).end();

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: '로그인이 필요합니다.' });

  // req.query.clanName은 이미 URL-디코딩된 값 — 다시 decodeURIComponent 호출 시 이중 디코딩됨
  const { clanName } = req.query;
  const isAdmin = ADMIN_EMAILS.includes(session.user.email);

  // 클랜 조회
  const clan = await prisma.clan.findFirst({
    where: { name: clanName },
    include: { members: true },
  });
  if (!clan) return res.status(404).json({ error: '클랜을 찾을 수 없습니다.' });

  // 클랜장 확인 — 관리자는 패스, 일반 유저는 PUBG 닉네임 대조
  if (!isAdmin) {
    const authUser = await prisma.authUser.findUnique({
      where: { googleId: session.user.googleId },
      include: { pubgAccounts: true },
    });
    const mainAcc = authUser?.pubgAccounts?.find(a => a.id === authUser.mainAccountId)
      || authUser?.pubgAccounts?.[0];

    if (!mainAcc) {
      return res.status(403).json({ error: 'PUBG 계정이 연동되지 않았습니다.' });
    }
    if (clan.leader?.toLowerCase() !== mainAcc.nickname?.toLowerCase()) {
      return res.status(403).json({ error: '클랜장만 멤버 최신화를 할 수 있습니다.' });
    }
  }

  // 멤버 필터
  const members = clan.pubgClanId
    ? clan.members.filter(m => m.pubgClanId === clan.pubgClanId)
    : clan.members;

  if (members.length === 0) {
    return res.status(200).json({ success: true, updatedMembers: 0, message: '처리할 멤버가 없습니다.' });
  }

  // 현재 시즌 조회
  const shard = members[0]?.pubgShardId || DEFAULT_SHARD;
  const seasonData = await cachedPubgFetch(
    `https://api.pubg.com/shards/${shard}/seasons`,
    { ttl: TTL.SEASON }
  );
  const currentSeason = seasonData?.data?.find(s => s.attributes?.isCurrentSeason);
  if (!currentSeason) return res.status(500).json({ error: '현재 시즌 정보를 가져올 수 없습니다.' });

  const memberNames = members.map(m => m.nickname);
  let updatedCount = 0;
  let errorCount = 0;

  // 배치 조회
  let memberData = {};
  try {
    memberData = await fetchClanMembersBatch(shard, memberNames, currentSeason.id);
  } catch (e) {
    console.error('[ManualRefresh] 배치 조회 실패:', e.message);
  }

  for (const member of members) {
    const nick = member.nickname;
    let data = memberData[nick] || memberData[nick.toLowerCase()];

    // fallback: 개별 플레이어 API
    if (!data || data.error) {
      if (member.pubgPlayerId) {
        try {
          const url = `https://api.pubg.com/shards/${shard}/players/${member.pubgPlayerId}/seasons/${currentSeason.id}`;
          const r = await fetch(url, {
            headers: { Authorization: `Bearer ${process.env.PUBG_API_KEY}`, Accept: 'application/vnd.api+json' },
          });
          if (r.ok) {
            const directData = await r.json();
            data = { seasonStatsDirect: directData };
          }
        } catch (_) {}
      }
      if (!data || data.error) { errorCount++; continue; }
    }

    // 일반전 합산
    let totalRounds = 0, totalDamage = 0, totalKills = 0;
    let totalSurvival = 0, totalWins = 0, totalTop10s = 0, totalAssists = 0;

    if (data.seasonStatsDirect) {
      const gms = data.seasonStatsDirect?.data?.attributes?.gameModeStats || {};
      for (const mode of ALL_MODES) {
        const s = gms[mode];
        if (!s?.roundsPlayed) continue;
        totalRounds += s.roundsPlayed; totalDamage += s.damageDealt || 0;
        totalKills += s.kills || 0; totalAssists += s.assists || 0;
        totalSurvival += s.timeSurvived || 0; totalWins += s.wins || 0; totalTop10s += s.top10s || 0;
      }
    } else {
      for (const mode of ALL_MODES) {
        const s = data.seasonStats?.[mode]?.attributes?.gameModeStats?.[mode];
        if (!s?.roundsPlayed) continue;
        totalRounds += s.roundsPlayed; totalDamage += s.damageDealt || 0;
        totalKills += s.kills || 0; totalAssists += s.assists || 0;
        totalSurvival += s.timeSurvived || 0; totalWins += s.wins || 0; totalTop10s += s.top10s || 0;
      }
    }

    // 경쟁전 합산 — 일반전 합계와 분리해서 별도 집계 (멤버 탭 일반전/경쟁전 토글용)
    let rTotalRounds = 0, rTotalDamage = 0, rTotalKills = 0;
    let rTotalAssists = 0, rTotalSurvival = 0, rTotalWins = 0, rTotalTop10s = 0;
    let bestTier = null;
    if (member.pubgPlayerId) {
      try {
        const rankedData = await cachedPubgFetch(
          `https://api.pubg.com/shards/${shard}/players/${member.pubgPlayerId}/seasons/${currentSeason.id}/ranked`,
          { ttl: TTL.PLAYER }
        );
        const rms = rankedData?.data?.attributes?.rankedGameModeStats || {};
        bestTier = pickBestRankedTier(rms);
        // 경쟁전 API는 timeSurvived/top10s 대신 avgSurvivalTime(평균)/top10Ratio(비율)로 내려옴
        // → 라운드 수를 곱해 합계로 환산 후 나중에 나눠서 모드 간 가중평균 처리
        for (const rm of Object.values(rms)) {
          if (!rm?.roundsPlayed) continue;
          rTotalRounds += rm.roundsPlayed; rTotalDamage += rm.damageDealt || 0;
          rTotalKills += rm.kills || 0; rTotalAssists += rm.assists || 0;
          rTotalSurvival += (rm.avgSurvivalTime || 0) * rm.roundsPlayed;
          rTotalWins += rm.wins || 0; rTotalTop10s += (rm.top10Ratio || 0) * rm.roundsPlayed;
        }
      } catch (_) {}
    }

    if (totalRounds === 0 && rTotalRounds === 0) { errorCount++; continue; }

    let avgDamage = 0, avgKills = 0, avgAssists = 0, avgSurviveTime = 0, winRate = 0, top10Rate = 0;
    if (totalRounds > 0) {
      avgDamage      = totalDamage   / totalRounds;
      avgKills       = totalKills    / totalRounds;
      avgAssists     = totalAssists  / totalRounds;
      avgSurviveTime = totalSurvival / totalRounds;
      winRate        = (totalWins    / totalRounds) * 100;
      top10Rate      = (totalTop10s  / totalRounds) * 100;
    }
    const score = calculateMMR({ avgDamage, avgKills, avgAssists, avgSurviveTime, winRate, top10Rate });

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

    const existingScore = calculateMMR({
      avgDamage: member.avgDamage || 0, avgKills: member.avgKills || 0,
      winRate: member.winRate || 0, top10Rate: member.top10Rate || 0,
    });
    const shouldUpdate = totalRounds > 0 && (score >= existingScore * 0.7 || !member.avgDamage);

    await prisma.clanMember.update({
      where: { id: member.id },
      data: {
        ...(shouldUpdate ? {
          avgDamage: Math.round(avgDamage),
          avgKills: parseFloat(avgKills.toFixed(2)),
          avgAssists: parseFloat(avgAssists.toFixed(2)),
          avgSurviveTime: Math.round(avgSurviveTime),
          winRate: parseFloat(winRate.toFixed(1)),
          top10Rate: parseFloat(top10Rate.toFixed(1)),
          score,
        } : {}),
        ...(rTotalRounds > 0 ? {
          rankedAvgDamage: Math.round(rankedAvgDamage),
          rankedAvgKills: parseFloat(rankedAvgKills.toFixed(2)),
          rankedAvgAssists: parseFloat(rankedAvgAssists.toFixed(2)),
          rankedAvgSurviveTime: Math.round(rankedAvgSurviveTime),
          rankedWinRate: parseFloat(rankedWinRate.toFixed(1)),
          rankedTop10Rate: parseFloat(rankedTop10Rate.toFixed(1)),
          rankedRoundsPlayed: rTotalRounds,
          rankedScore,
          ...(bestTier ? { rankedTier: bestTier.tier, rankedSubTier: bestTier.subTier, rankedRP: bestTier.rp } : {}),
        } : {}),
        lastUpdated: new Date(),
      },
    });

    await prisma.playerStatSnapshot.create({
      data: {
        nickname: nick,
        pubgShardId: shard,
        score,
        avgDamage: Math.round(avgDamage),
        avgKills: parseFloat(avgKills.toFixed(2)),
        avgAssists: parseFloat(avgAssists.toFixed(2)),
        avgSurviveTime: Math.round(avgSurviveTime),
        winRate: parseFloat(winRate.toFixed(1)),
        top10Rate: parseFloat(top10Rate.toFixed(1)),
      },
    }).catch(() => {});

    updatedCount++;
  }

  await prisma.clan.update({
    where: { id: clan.id },
    data: { lastSynced: new Date(), memberCount: members.length },
  }).catch(() => {});

  return res.status(200).json({
    success: true,
    updatedMembers: updatedCount,
    errorMembers: errorCount,
    total: members.length,
  });
}
