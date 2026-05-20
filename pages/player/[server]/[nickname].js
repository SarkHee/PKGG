import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { calculateMMR } from '../../../utils/mmrCalculator';
import { classifyPlaystyle } from '../../../utils/playstyleClassifier';

import Header from '../../../components/layout/Header';
import PlayerHeader from '../../../components/player/PlayerHeader';
import MatchListRow from '../../../components/match/MatchListRow';
import AdUnit from '../../../components/AdUnit';
import SeasonCountdown from '../../../components/SeasonCountdown';

// 무거운 컴포넌트 lazy load → 초기 JS 번들 분리, LCP 차단 제거
const PlayerDashboard       = dynamic(() => import('../../../components/player/PlayerDashboard'), { ssr: false });
const ModeDistributionChart = dynamic(() => import('../../../components/charts/ModeDistributionChart'), { ssr: false });
const RecentDamageTrendChart= dynamic(() => import('../../../components/charts/RecentDamageTrendChart'), { ssr: false });
const SeasonStatsTabs       = dynamic(() => import('../../../components/SeasonStatsTabs'), { ssr: false });
const RankDistributionChart = dynamic(() => import('../../../components/charts/RankDistributionChart'), { ssr: false });
const SynergyHeatmap        = dynamic(() => import('../../../components/charts/SynergyHeatmap'), { ssr: false })
const RecentTeammatesCard   = dynamic(() => import('../../../components/charts/RecentTeammatesCard'), { ssr: false });
const EnhancedPlayerStats   = dynamic(() => import('../../../components/player/EnhancedPlayerStats'), { ssr: false });
const MatchDetailExpandable = dynamic(() => import('../../../components/match/MatchDetailExpandable'), { ssr: false });
const WeaponMasteryCard     = dynamic(() => import('../../../components/player/WeaponMasteryCard'), { ssr: false, loading: () => <div className="h-40 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" /> });
const GrowthChart           = dynamic(() => import('../../../components/player/GrowthChart'), { ssr: false, loading: () => <div className="h-48 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" /> });
const AICoachingCard        = dynamic(() => import('../../../components/player/AICoachingCard'), { ssr: false, loading: () => <div className="h-32 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" /> });
const PlayerPercentileCard  = dynamic(() => import('../../../components/player/PlayerPercentileCard'), { ssr: false, loading: () => <div className="h-24 bg-gray-100 animate-pulse rounded-xl" /> });

// 반드시 export default 함수 바깥에 위치!
function MatchList({ recentMatches, playerData, showBotKills }) {
  const [openIdx, setOpenIdx] = useState(null);
  return (
    <div className="space-y-4">
      {recentMatches.map((match, i) => (
        <MatchListRow
          key={match.matchId}
          match={match}
          isOpen={openIdx === i}
          onToggle={() => setOpenIdx(openIdx === i ? null : i)}
          prevMatch={i > 0 ? recentMatches[i - 1] : null}
          playerData={playerData}
          showBotKills={showBotKills}
        />
      ))}
    </div>
  );
}

// 플레이어 데이터 DB 저장/업데이트 (백그라운드 upsert)
async function savePlayerToDatabase(pubgPlayer, shard, pubgClan, summary, matches = [], modeStats = {}) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const nickname = pubgPlayer.attributes.name;

    // 클랜 upsert (클랜이 있는 경우)
    let clanDbId = null;
    if (pubgClan) {
      const attrs = pubgClan.attributes;
      try {
        const clan = await prisma.clan.upsert({
          where: { pubgClanId: pubgClan.id },
          update: {
            name: attrs.clanName,
            pubgClanTag: attrs.clanTag,
            pubgClanLevel: attrs.clanLevel,
            pubgMemberCount: attrs.clanMemberCount,
            memberCount: attrs.clanMemberCount || 0,
            shard,
            lastSynced: new Date(),
          },
          create: {
            name: attrs.clanName,
            leader: '알 수 없음',
            memberCount: attrs.clanMemberCount || 0,
            pubgClanId: pubgClan.id,
            pubgClanTag: attrs.clanTag,
            pubgClanLevel: attrs.clanLevel,
            pubgMemberCount: attrs.clanMemberCount || 0,
            shard,
            lastSynced: new Date(),
          },
        });
        clanDbId = clan.id;
      } catch (e) {
        console.warn('클랜 upsert 실패:', e.message);
      }
    }

    // ClanMember upsert (pubgPlayerId 기준)
    const memberData = {
      nickname,
      pubgPlayerId: pubgPlayer.id,
      pubgShardId: shard,
      pubgClanId: pubgClan?.id || null,
      clanId: clanDbId,
      avgDamage: summary?.avgDamage || 0,
      avgKills: summary?.avgKills || 0,
      avgAssists: summary?.avgAssists || 0,
      avgSurviveTime: summary?.avgSurviveTime || 0,
      winRate: summary?.winRate || 0,
      top10Rate: summary?.top10Rate || 0,
      score: summary?.score || 0,
      style: summary?.playstyle || summary?.style || '-',
      lastUpdated: new Date(),
    };

    // 1순위: pubgPlayerId로 찾기 (PUBG 공식 식별자)
    const byPlayerId = await prisma.clanMember.findFirst({
      where: { pubgPlayerId: pubgPlayer.id },
    });

    // 2순위: nickname으로 찾기 (pubgPlayerId 없이 생성된 레코드 포함)
    const byNickname = await prisma.clanMember.findMany({
      where: {
        nickname: { equals: nickname, mode: 'insensitive' },
        ...(byPlayerId ? { id: { not: byPlayerId.id } } : {}),
      },
    });

    let memberId;
    if (byPlayerId) {
      // pubgPlayerId로 찾은 레코드 → API 데이터로 완전 덮어쓰기
      await prisma.clanMember.update({ where: { id: byPlayerId.id }, data: memberData });
      memberId = byPlayerId.id;

      // nickname만으로 생성된 중복 레코드 제거
      if (byNickname.length > 0) {
        const dupIds = byNickname.map((d) => d.id);
        await prisma.playerMatch.deleteMany({ where: { clanMemberId: { in: dupIds } } });
        await prisma.playerModeStats.deleteMany({ where: { clanMemberId: { in: dupIds } } });
        await prisma.clanMember.deleteMany({ where: { id: { in: dupIds } } });
        console.log(`✅ 중복 레코드 ${dupIds.length}개 정리: ${nickname}`);
      }
      console.log(`✅ DB 덮어쓰기 (pubgPlayerId): ${nickname}`);
    } else if (byNickname.length > 0) {
      // nickname으로만 찾은 레코드 → 첫 번째를 API 데이터로 덮어쓰기
      const keepRecord = byNickname[0];
      await prisma.clanMember.update({ where: { id: keepRecord.id }, data: memberData });
      memberId = keepRecord.id;

      // 나머지 중복 제거
      if (byNickname.length > 1) {
        const dupIds = byNickname.slice(1).map((d) => d.id);
        await prisma.playerMatch.deleteMany({ where: { clanMemberId: { in: dupIds } } });
        await prisma.playerModeStats.deleteMany({ where: { clanMemberId: { in: dupIds } } });
        await prisma.clanMember.deleteMany({ where: { id: { in: dupIds } } });
        console.log(`✅ 중복 레코드 ${dupIds.length}개 정리: ${nickname}`);
      }
      console.log(`✅ DB 덮어쓰기 (nickname): ${nickname}`);
    } else {
      // 신규 레코드 생성
      const created = await prisma.clanMember.create({ data: memberData });
      memberId = created.id;
      console.log(`✅ DB 신규 저장: ${nickname}`);
    }

    // PlayerModeStats 저장 (시즌 성과 경기수 DB 캐시 복원용)
    if (Object.keys(modeStats).length > 0 && memberId) {
      try {
        await prisma.playerModeStats.deleteMany({ where: { clanMemberId: memberId } });
        await prisma.playerModeStats.createMany({
          data: Object.entries(modeStats).map(([mode, ms]) => ({
            clanMemberId: memberId,
            mode,
            matches: ms.rounds || 0,
            wins: ms.wins || 0,
            top10s: ms.top10s || 0,
            avgDamage: ms.avgDamage || 0,
            avgKills: parseFloat(((ms.totalKills || 0) / Math.max(1, ms.rounds || 1)).toFixed(2)),
            avgAssists: parseFloat(((ms.assists || 0) / Math.max(1, ms.rounds || 1)).toFixed(2)),
            winRate: ms.winRate || 0,
            top10Rate: ms.top10Rate || 0,
          })),
        });
        console.log(`✅ PlayerModeStats 저장: ${nickname} (${Object.keys(modeStats).length}개 모드)`);
      } catch (e) {
        console.warn('PlayerModeStats 저장 실패:', e.message);
      }
    }

    // PlayerCache upsert (모든 유저 캐싱)
    try {
      const cacheData = {
        pubgPlayerId: pubgPlayer.id,
        pubgShardId: shard,
        score: summary?.score || 0,
        style: summary?.playstyle || summary?.style || '',
        avgDamage: summary?.avgDamage || 0,
        avgKills: summary?.avgKills || 0,
        avgAssists: summary?.avgAssists || 0,
        avgSurviveTime: summary?.avgSurviveTime || 0,
        winRate: summary?.winRate || 0,
        top10Rate: summary?.top10Rate || 0,
        lastUpdated: new Date(),
      };
      await prisma.playerCache.upsert({
        where: { nickname_pubgShardId: { nickname, pubgShardId: shard } },
        update: cacheData,
        create: { nickname, ...cacheData },
      });
      console.log(`✅ PlayerCache 저장: ${nickname} (${shard})`);
    } catch (cacheErr) {
      console.warn('PlayerCache upsert 실패:', cacheErr.message);
    }

    // 성장 스냅샷 저장 (7일 1회, 데이터가 있는 경우만 — 주간 성장 추이 추적)
    try {
      if (summary?.avgDamage > 0 || summary?.avgKills > 0) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const existingSnap = await prisma.playerStatSnapshot.findFirst({
          where: { nickname, pubgShardId: shard, capturedAt: { gte: sevenDaysAgo } },
        });
        if (!existingSnap) {
          await prisma.playerStatSnapshot.create({
            data: {
              nickname,
              pubgShardId: shard,
              score: calculateMMR(summary),
              avgDamage: summary.avgDamage || 0,
              avgKills: summary.avgKills || 0,
              avgAssists: summary.avgAssists || 0,
              avgSurviveTime: summary.avgSurviveTime || 0,
              winRate: summary.winRate || 0,
              top10Rate: summary.top10Rate || 0,
            },
          });
          console.log(`✅ 성장 스냅샷 저장: ${nickname}`);
        }
      }
    } catch (snapErr) {
      console.warn('성장 스냅샷 저장 실패:', snapErr.message);
    }
  } catch (e) {
    console.error('savePlayerToDatabase 오류:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

// DB에 저장된 미분석 매치를 백그라운드에서 봇킬 분석 (최대 3경기)
// load-more.js가 처리하지 못한 기존 데이터 대상
async function analyzePendingMatchesBackground(pubgAccountId, nickname, shard) {
  const { PrismaClient } = require('@prisma/client');
  const { analyzeMatchData } = require('../../../utils/botKills.js');
  const { cachedPubgFetch, TTL } = require('../../../utils/pubgApiCache');
  const prisma = new PrismaClient();
  const PUBG_BASE = 'https://api.pubg.com/shards';
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
  const MAX_ANALYZE = 3;

  try {
    const cutoff = new Date(Date.now() - FOURTEEN_DAYS_MS);
    const pending = await prisma.playerMatch.findMany({
      where: { pubgAccountId, botAnalyzedAt: null, createdAt: { gte: cutoff } },
      orderBy: { createdAt: 'desc' },
      take: MAX_ANALYZE,
      select: { id: true, matchId: true },
    });
    if (pending.length === 0) return;

    const now = new Date();
    for (const { id, matchId } of pending) {
      try {
        const data = await cachedPubgFetch(`${PUBG_BASE}/${shard}/matches/${matchId}`, { ttl: TTL.MATCH });
        const result = await analyzeMatchData(data, matchId);
        const row = result.rows.find((r) => r.accountId === pubgAccountId);

        await prisma.playerMatch.update({
          where: { id },
          data: {
            botKills:       row?.bot         ?? 0,
            realKills:      row?.real        ?? null,
            botDamage:      row?.botDamage   ?? null,
            realDamage:     row?.realDamage  ?? null,
            botAssist:      row?.botAssist   ?? null,
            isBotCorrected: result.isBotCorrected,
            botAnalyzedAt:  now,
          },
        });

        // 무기 통계 저장
        if (result.isBotCorrected && row?.weaponStats) {
          const weaponRows = Object.entries(row.weaponStats)
            .filter(([, ws]) => ws.kills > 0 || ws.damage > 0 || ws.pickups > 0)
            .map(([weaponId, ws]) => ({
              playerId: pubgAccountId, shard, weaponId, weaponName: weaponId,
              kills: ws.kills, damage: ws.damage, headshots: 0,
              bot_kills: ws.botKills, real_kills: ws.realKills,
              assists: 0, shots_fired: 0, shots_hit: 0,
              match_id: matchId, pickup_count: ws.pickups,
            }));
          if (weaponRows.length > 0) {
            await prisma.player_weapon_stats.createMany({ data: weaponRows, skipDuplicates: true })
              .catch(e => console.warn('[analyzePending] 무기 저장 실패:', e.message));
          }
        }
      } catch (e) {
        console.warn(`[analyzePending] 매치 분석 실패 ${matchId}:`, e.message);
      }
    }
    console.log(`✅ 미분석 매치 처리 완료: ${nickname} (${pending.length}건)`);
  } catch (e) {
    console.warn('[analyzePending] 오류:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

// 매치 데이터 백그라운드 저장 (fire-and-forget, 응답 속도 영향 없음)
async function saveMatchesBackground(pubgPlayer, shard) {
  const { cachedPubgFetch, TTL } = require('../../../utils/pubgApiCache');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const PUBG_BASE = 'https://api.pubg.com/shards';

  try {
    const pubgAccountId = pubgPlayer.id;
    const nickname = pubgPlayer.attributes.name;
    const matchIds = (pubgPlayer.relationships?.matches?.data || [])
      .slice(0, 10)
      .map((m) => m.id);

    if (matchIds.length === 0) return;

    const matchResults = await Promise.allSettled(
      matchIds.map((matchId) =>
        cachedPubgFetch(`${PUBG_BASE}/${shard}/matches/${matchId}`, {
          ttl: TTL.MATCH,
          force: false,
        })
      )
    );

    const matchData = [];
    for (const result of matchResults) {
      if (result.status !== 'fulfilled') continue;
      const data = result.value;
      const attrs = data.data?.attributes;
      if (!attrs) continue;

      const included = data.included || [];
      const participants = included.filter((i) => i.type === 'participant');
      const me = participants.find(
        (p) => p.attributes?.stats?.playerId === pubgAccountId
      );
      if (!me) continue;

      const s = me.attributes.stats;
      matchData.push({
        pubgAccountId,
        nickname,
        shard,
        matchId: data.data.id,
        mode: attrs.gameMode || 'unknown',
        mapName: attrs.mapName || null,
        placement: s.winPlace || 0,
        kills: s.kills || 0,
        assists: s.assists || 0,
        damage: Math.round(s.damageDealt || 0),
        surviveTime: Math.round(s.timeSurvived || 0),
        createdAt: new Date(attrs.createdAt || Date.now()),
      });
    }

    if (matchData.length > 0) {
      await prisma.playerMatch.createMany({
        data: matchData,
        skipDuplicates: true,
      });
      console.log(`✅ 매치 ${matchData.length}개 백그라운드 저장: ${nickname}`);
    }
  } catch (e) {
    console.error('saveMatchesBackground 오류:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

function ModeStatsTabs({ modeStats }) {
  const modeList = Object.keys(modeStats);
  const [selectedMode, setSelectedMode] = useState(modeList[0]);
  const stats = modeStats[selectedMode];
  if (!modeList.length)
    return (
      <p className="text-gray-500 dark:text-gray-400">
        현재 시즌 통계 데이터를 불러올 수 없습니다.
      </p>
    );
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {modeList.map((mode) => (
          <button
            key={mode}
            className={`px-4 py-2 rounded-lg font-semibold border transition text-sm ${selectedMode === mode ? 'bg-blue-500 text-white border-blue-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-blue-100 dark:hover:bg-blue-800'}`}
            onClick={() => setSelectedMode(mode)}
          >
            {mode.replace('-', ' ').toUpperCase()}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
          <ul className="text-sm space-y-1">
            <li>
              총 라운드: <span className="font-medium">{stats.rounds}</span>
            </li>
            <li>
              승리: <span className="font-medium">{stats.wins}</span>
            </li>
            <li>
              Top 10: <span className="font-medium">{stats.top10s}</span>
            </li>
            <li>
              K/D: <span className="font-medium">{stats.kd}</span>
            </li>
            <li>
              평균 딜량: <span className="font-medium">{stats.avgDamage}</span>
            </li>
            <li>
              승률: <span className="font-medium">{stats.winRate}%</span>
            </li>
            <li>
              Top 10 비율:{' '}
              <span className="font-medium">{stats.top10Rate}%</span>
            </li>
            <li>
              헤드샷 비율:{' '}
              <span className="font-medium text-red-600 dark:text-red-400">
                {stats.headshotRate}%
              </span>
            </li>
            <li>
              최장 킬 거리:{' '}
              <span className="font-medium">{stats.longestKill}m</span>
            </li>
            <li>
              헤드샷 킬:{' '}
              <span className="font-medium text-red-500">
                {stats.headshots}
              </span>
            </li>
            <li>
              킬:{' '}
              <span className="font-medium text-blue-600">
                {stats.totalKills}
              </span>
            </li>
            <li>
              최대 킬: <span className="font-medium">{stats.maxKills}</span>
            </li>
            <li>
              최대 거리 킬:{' '}
              <span className="font-medium">{stats.maxDistanceKill}m</span>
            </li>
            <li>
              평균 등수: <span className="font-medium">{stats.avgRank}</span>
            </li>
            <li>
              평균 생존시간:{' '}
              <span className="font-medium">{Math.round(stats.avgSurvivalTime / 60)}분</span>
            </li>
            <li>
              평균 어시스트:{' '}
              <span className="font-medium">{stats.avgAssists}</span>
            </li>
            <li>
              어시스트: <span className="font-medium">{stats.assists}</span>
            </li>
            <li>
              최대 어시스트:{' '}
              <span className="font-medium">{stats.mostAssists}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function PlayerSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900 animate-pulse">
      <div className="max-w-5xl mx-auto px-4 pt-6 space-y-4">
        {/* 헤더 스켈레톤 */}
        <div className="bg-gray-800 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-700 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-gray-700 rounded w-40" />
            <div className="h-4 bg-gray-700 rounded w-24" />
          </div>
          <div className="h-10 w-24 bg-gray-700 rounded-lg" />
        </div>
        {/* 스탯 카드 스켈레톤 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-4 space-y-2">
              <div className="h-3 bg-gray-700 rounded w-12" />
              <div className="h-6 bg-gray-700 rounded w-16" />
            </div>
          ))}
        </div>
        {/* 매치 리스트 스켈레톤 */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-700 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-700 rounded w-32" />
                <div className="h-3 bg-gray-700 rounded w-48" />
              </div>
              <div className="h-8 w-16 bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 플레이스타일 요약 카드 ──────────────────────────────────────────────────
function PlaystyleCard({ summary, mmr }) {
  if (!summary) return null
  const ps = classifyPlaystyle({
    avgDamage:     summary.avgDamage     || 0,
    avgKills:      summary.avgKills      || 0,
    avgAssists:    summary.avgAssists    || 0,
    avgSurviveTime: summary.avgSurviveTime || 0,
    winRate:       summary.winRate       || 0,
    top10Rate:     summary.top10Rate     || 0,
    headshotRate:  summary.headshotKillRatio != null
      ? parseFloat(summary.headshotKillRatio) * (parseFloat(summary.headshotKillRatio) > 1 ? 1 : 100)
      : 0,
  })
  const emoji = ps.label.match(/\p{Emoji}/u)?.[0] || '🎮'

  return (
    <div className={`mb-4 rounded-xl border px-4 py-3 flex items-center gap-3 sm:gap-4 ${ps.bg} ${ps.border}`}>
      <div className="text-2xl sm:text-3xl flex-shrink-0">{emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-sm font-black ${ps.color}`}>{ps.label}</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{ps.desc}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">PKGG 점수</div>
        <div className={`text-xl font-black ${ps.color}`}>{Math.round(mmr || 0)}</div>
      </div>
    </div>
  )
}

// ── 주 플레이 맵 통계 ──────────────────────────────────────────────────────
const MAP_DISPLAY = {
  Erangel_Main:    '에란겔',
  Baltic_Main:     '에란겔',
  Desert_Main:     '미라마',
  Savage_Main:     '사녹',
  DihorOtok_Main:  '비켄디',
  Summerland_Main: '카라킨',
  Heaven_Main:     '헤이븐',
  Tiger_Main:      '태이고',
  Kiki_Main:       '데스턴',
  Neon_Main:       '론도',
  Chimera_Main:    '파라모',
  Range_Main:      '훈련장',
}
const MAP_BAR_COLOR = {
  '에란겔': 'bg-green-500',
  '미라마': 'bg-yellow-500',
  '사녹':   'bg-emerald-500',
  '비켄디': 'bg-sky-400',
  '카라킨': 'bg-orange-500',
  '헤이븐': 'bg-violet-400',
  '태이고': 'bg-amber-500',
  '데스턴': 'bg-red-400',
  '론도':   'bg-cyan-500',
  '파라모': 'bg-indigo-400',
}

function MapStatsCard({ matches }) {
  if (!matches || matches.length === 0) return null

  const counts = {}
  for (const m of matches) {
    const name = MAP_DISPLAY[m.mapName || ''] || null
    if (!name || name === '훈련장') continue
    counts[name] = (counts[name] || 0) + 1
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (sorted.length === 0) return null

  const maxCount = sorted[0][1]
  const total = sorted.reduce((s, [, c]) => s + c, 0)

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3 px-1">
        <div className="w-1 h-5 bg-blue-500 rounded-full flex-shrink-0"></div>
        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">주 플레이 맵</h2>
        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200 dark:border-blue-800">최근 20경기 기준</span>
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm space-y-2.5">
        {sorted.map(([name, count]) => (
          <div key={name} className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 w-12 flex-shrink-0 text-right">{name}</span>
            <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${MAP_BAR_COLOR[name] || 'bg-blue-400'}`}
                style={{ width: `${Math.round((count / maxCount) * 100)}%` }}
              />
            </div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-7 text-right flex-shrink-0">{count}회</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 w-8 text-right flex-shrink-0">{Math.round((count / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const PLAYER_CACHE_TTL = 5 * 60 * 1000; // 5분

function getCachedPlayer(key) {
  try {
    const raw = sessionStorage.getItem(`pkgg_player_${key}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > PLAYER_CACHE_TTL) {
      sessionStorage.removeItem(`pkgg_player_${key}`);
      return null;
    }
    return data;
  } catch { return null; }
}

function setCachedPlayer(key, data) {
  try {
    sessionStorage.setItem(`pkgg_player_${key}`, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

export default function PlayerPage({ playerData: ssrData, error, isBanned, dataSource }) {
  const router = useRouter();
  const { server, nickname } = router.query;
  const cacheKey = `${server}_${nickname}`;

  const [playerData, setPlayerData] = useState(ssrData);
  const [pageLoading, setPageLoading] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const [resolvedPlayerId, setResolvedPlayerId] = useState(ssrData?.profile?.playerId || null);
  const [masteryWeapons, setMasteryWeapons] = useState(null);
  // SSR에서 매치를 빼고 클라이언트에서 로드 → LCP 개선
  const [matchesLoading, setMatchesLoading] = useState(
    !ssrData?.recentMatches?.length
  );
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const detailRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [refreshMsg, setRefreshMsg] = useState('');
  const [currentSeasonData, setCurrentSeasonData] = useState(null);
  const [currentSeasonId, setCurrentSeasonId] = useState(
    'division.bro.official.pc-2024-01'
  );
  const [selectedMatchFilter, setSelectedMatchFilter] = useState('전체');
  const [selectedSeasonId, setSelectedSeasonId] = useState(null); // null = 현재 시즌
  const [overrideSeasonStats, setOverrideSeasonStats] = useState(null);
  const [overrideRankedSummary, setOverrideRankedSummary] = useState(undefined); // undefined=사용안함
  const [seasonChanging, setSeasonChanging] = useState(false);
  const [clientSeasons, setClientSeasons] = useState(null); // SSR에 없을 때 폴백

  // availableSeasons가 비어있으면 클라이언트에서 직접 fetch
  useEffect(() => {
    const hasSsrSeasons = playerData?.availableSeasons?.length > 0;
    if (hasSsrSeasons) return;
    const shard = playerData?.profile?.shardId || server || 'steam';
    fetch(`/api/pubg/seasons?shard=${shard}`)
      .then(r => r.json())
      .then(d => { if (d.seasons?.length > 0) setClientSeasons(d.seasons); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SSR 데이터를 세션 캐시에 저장
  useEffect(() => {
    if (ssrData && cacheKey) setCachedPlayer(cacheKey, ssrData);
  }, [ssrData, cacheKey]);

  // 클라이언트에서 초기 매치 로딩 (SSR에서 매치 제거로 LCP 개선)
  useEffect(() => {
    const nick = ssrData?.profile?.nickname;
    const shard = ssrData?.profile?.shardId || server || 'steam';
    if (!nick) { setMatchesLoading(false); return; }

    // DB 캐시 매치는 teammatesDetail이 없음 → load-more로 보완 필요
    const hasTeamData = ssrData?.recentMatches?.some(m => m.teammatesDetail?.length > 0);
    if (hasTeamData) {
      setMatchesLoading(false);
      return;
    }

    // 세션 캐시 (load-more 결과가 저장된 경우 팀원 데이터 있음)
    const matchCacheKey = `matches_${shard}_${nick}`;
    const cachedMatches = getCachedPlayer(matchCacheKey);
    const cacheHasBotFields = cachedMatches?.some(m => 'isBotCorrected' in m)
    if (cacheHasBotFields && cachedMatches?.some(m => m.teammatesDetail?.length > 0)) {
      setPlayerData(prev => prev ? { ...prev, recentMatches: cachedMatches } : prev);
      setMatchesLoading(false);
      return;
    }

    // DB 매치가 있으면 스피너 없이 백그라운드로 교체
    if (ssrData?.recentMatches?.length > 0) setMatchesLoading(false);

    fetch(`/api/matches/load-more?nickname=${encodeURIComponent(nick)}&shard=${shard}&offset=0&limit=10`)
      .then(r => r.json())
      .then(data => {
        if (data.matches?.length > 0) {
          setPlayerData(prev => prev ? { ...prev, recentMatches: data.matches } : prev);
          setCachedPlayer(matchCacheKey, data.matches);
        }
      })
      .catch(e => console.warn('초기 매치 로드 실패:', e))
      .finally(() => setMatchesLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 클라이언트 사이드 캐시: 세션에 있으면 즉시 표시
  useEffect(() => {
    if (!ssrData && cacheKey) {
      const cached = getCachedPlayer(cacheKey);
      if (cached) setPlayerData(cached);
    }
  }, [cacheKey, ssrData]);

  useEffect(() => {
    const handleStart = (url) => {
      setNavLoading(true);
      if (url !== router.asPath) setPageLoading(true);
    };
    const handleDone = () => {
      setNavLoading(false);
      setPageLoading(false);
    };
    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleDone);
    router.events.on('routeChangeError', handleDone);
    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleDone);
      router.events.off('routeChangeError', handleDone);
    };
  }, [router]);

  // 더보기 관련 상태 — early return 이전에 선언해야 훅 규칙 준수
  const [extraMatches, setExtraMatches] = useState([]);
  const [matchOffset, setMatchOffset] = useState(10);
  const [noMoreMatches, setNoMoreMatches] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [botFilterOn, setBotFilterOn] = useState(false);

  // 쿨타임 타이머 — early return 이전에 위치해야 훅 규칙 준수
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  // 중요 정보 먼저 표시 후 무거운 컴포넌트 lazy mount
  const [lazyVisible, setLazyVisible] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setLazyVisible(true), 100);
    return () => clearTimeout(id);
  }, []);

  const [activeTab, setActiveTab] = useState('overall')

  if (pageLoading || !playerData) {
    return (
      <>
        <Header />
        <PlayerSkeleton />
      </>
    );
  }

  const handleLoadMore = async () => {
    if (loadingMore || noMoreMatches) return;
    const shard = playerData?.profile?.shardId || 'steam';
    const nick = playerData?.profile?.nickname || '';
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/matches/load-more?nickname=${encodeURIComponent(nick)}&shard=${shard}&offset=${matchOffset}`
      );
      const data = await res.json();
      if (data.matches?.length > 0) {
        setExtraMatches(prev => [...prev, ...data.matches]);
        setMatchOffset(prev => prev + data.matches.length);
        if (data.matches.length < 5) setNoMoreMatches(true);
      } else {
        setNoMoreMatches(true);
      }
    } catch (e) {
      console.error('더보기 실패:', e);
    } finally {
      setLoadingMore(false);
    }
  };

  // 시즌 변경 핸들러
  const handleSeasonChange = (seasonId, seasonData) => {
    setCurrentSeasonId(seasonId);
    setCurrentSeasonData(seasonData);
  };

  // 드롭다운 시즌 전환 핸들러 (PlayerHeader에서 호출)
  const handleSeasonSelect = async (seasonId) => {
    const currentId = playerData?.currentSeasonId;
    if (!seasonId || seasonId === 'current' || seasonId === currentId) {
      setSelectedSeasonId(null);
      setOverrideSeasonStats(null);
      setOverrideRankedSummary(undefined);
      return;
    }
    const playerId = playerData?.profile?.playerId;
    const shard = playerData?.profile?.shardId || server || 'steam';
    if (!playerId) return;

    setSelectedSeasonId(seasonId);
    setSeasonChanging(true);
    setOverrideSeasonStats(null);
    setOverrideRankedSummary(undefined);
    try {
      // 일반전 + 경쟁전 병렬 fetch
      const [seasonRes, rankedRes] = await Promise.allSettled([
        fetch(`/api/pubg/stats/season/${shard}/${playerId}/${seasonId}`).then(r => r.json()),
        fetch(`/api/pubg/stats/ranked/${shard}/${playerId}/${seasonId}`).then(r => r.json()),
      ]);

      // 일반전 변환
      if (seasonRes.status === 'fulfilled' && seasonRes.value?.success) {
        const gameModeStats = seasonRes.value.data?.gameModeStats || {};
        const transformedModes = {};
        for (const [mode, s] of Object.entries(gameModeStats)) {
          const rounds = s.roundsPlayed || 0;
          if (rounds === 0) continue;
          transformedModes[mode] = {
            rounds,
            wins: s.wins || 0,
            top10s: s.top10s || 0,
            kd: parseFloat(((s.kills || 0) / Math.max(1, rounds - (s.wins || 0))).toFixed(2)),
            avgDamage: Math.round((s.damageDealt || 0) / rounds),
            winRate: Math.round(((s.wins || 0) / rounds) * 100),
            top10Rate: Math.round(((s.top10s || 0) / rounds) * 100),
            headshotRate: (s.kills || 0) > 0 ? Math.round(((s.headshotKills || 0) / s.kills) * 100) : 0,
            longestKill: Math.round(s.longestKill || 0),
            headshots: s.headshotKills || 0,
            totalKills: s.kills || 0,
            maxKills: s.roundMostKills || 0,
            avgRank: 0,
            avgSurvivalTime: Math.round((s.timeSurvived || 0) / rounds),
            avgAssists: parseFloat(((s.assists || 0) / rounds).toFixed(1)),
            assists: s.assists || 0,
            mostAssists: 0,
          };
        }
        setOverrideSeasonStats({ [seasonId]: transformedModes });
      }

      // 경쟁전 변환
      if (rankedRes.status === 'fulfilled' && rankedRes.value?.success) {
        const rankedModeStats = rankedRes.value.data?.rankedGameModeStats || {};
        const modeData = rankedModeStats['squad-fpp'] || rankedModeStats['squad'] || Object.values(rankedModeStats)[0];
        if (modeData && modeData.roundsPlayed > 0) {
          const r = modeData.roundsPlayed;
          const deaths = Math.max(1, r - (modeData.wins || 0));
          setOverrideRankedSummary({
            mode: 'squad-fpp',
            tier: modeData.currentTier?.tier || 'Unranked',
            subTier: modeData.currentTier?.subTier || 0,
            currentTier: modeData.currentTier?.tier || 'Unranked',
            rp: modeData.currentRankPoint || 0,
            bestTier: modeData.bestTier?.tier || modeData.currentTier?.tier || 'Unranked',
            bestRankPoint: modeData.bestRankPoint || modeData.currentRankPoint || 0,
            games: r,
            wins: modeData.wins || 0,
            kd: parseFloat(((modeData.kills || 0) / deaths).toFixed(2)),
            kda: parseFloat((((modeData.kills || 0) + (modeData.assists || 0)) / deaths).toFixed(2)),
            avgDamage: r > 0 ? Math.round((modeData.damageDealt || 0) / r) : 0,
            winRate: parseFloat(((modeData.wins || 0) / r * 100).toFixed(1)),
            top10Rate: parseFloat(((modeData.top10s || 0) / r * 100).toFixed(1)),
            top10Ratio: (modeData.top10s || 0) / r,
            kills: modeData.kills || 0,
            deaths,
            assists: modeData.assists || 0,
            headshotKills: modeData.headshotKills || 0,
            headshotRate: (modeData.kills || 0) > 0
              ? parseFloat(((modeData.headshotKills || 0) / (modeData.kills || 1) * 100).toFixed(1))
              : 0,
            damageDealt: modeData.damageDealt || 0,
            dBNOs: modeData.dBNOs || 0,
            roundsPlayed: r,
          });
        } else {
          setOverrideRankedSummary(null); // 경쟁전 기록 없음
        }
      } else {
        setOverrideRankedSummary(null);
      }
    } catch (e) {
      console.warn('시즌 통계 로드 실패:', e);
      setSelectedSeasonId(null);
    } finally {
      setSeasonChanging(false);
    }
  };

  // 현재 표시할 데이터 결정 (시즌이 변경되었으면 시즌 데이터, 아니면 기본 데이터)
  const displayData = currentSeasonData || playerData;

  // 경기 필터링 로직
  const filterMatches = (matches, filter) => {
    if (!matches || matches.length === 0) return [];

    // 매치 필드명: mode (= PUBG API gameMode), matchType
    switch (filter) {
      case '전체':
        return matches;
      case '경쟁전':
        return matches.filter((match) => {
          const mt = (match.matchType || '').toLowerCase();
          const mode = (match.mode || '').toLowerCase();
          return mt === 'ranked' || mt === 'competitive' || mode.includes('ranked');
        });
      case '경쟁전 솔로':
        return matches.filter((match) => {
          const mt = (match.matchType || '').toLowerCase();
          const mode = (match.mode || '').toLowerCase();
          return (mt === 'ranked' || mt === 'competitive' || mode.includes('ranked')) && mode.includes('solo');
        });
      case '솔로':
        return matches.filter((match) => {
          const mt = (match.matchType || '').toLowerCase();
          const mode = (match.mode || '').toLowerCase();
          return mode.includes('solo') && mt !== 'ranked' && mt !== 'competitive' && !mode.startsWith('ranked');
        });
      case '듀오':
        return matches.filter((match) => {
          const mt = (match.matchType || '').toLowerCase();
          const mode = (match.mode || '').toLowerCase();
          return mode.includes('duo') && mt !== 'ranked' && mt !== 'competitive' && !mode.startsWith('ranked');
        });
      case '스쿼드':
        return matches.filter((match) => {
          const mt = (match.matchType || '').toLowerCase();
          const mode = (match.mode || '').toLowerCase();
          return mode.includes('squad') && mt !== 'ranked' && mt !== 'competitive' && !mode.startsWith('ranked');
        });
      case '경쟁전 FPP':
        return matches.filter((match) => {
          const mt = (match.matchType || '').toLowerCase();
          const mode = (match.mode || '').toLowerCase();
          return (mt === 'ranked' || mt === 'competitive' || mode.includes('ranked')) && mode.includes('fpp');
        });
      case '경쟁전 솔로 FPP':
        return matches.filter((match) => {
          const mt = (match.matchType || '').toLowerCase();
          const mode = (match.mode || '').toLowerCase();
          return (mt === 'ranked' || mt === 'competitive' || mode.includes('ranked')) && mode.includes('solo') && mode.includes('fpp');
        });
      case '솔로 FPP':
        return matches.filter((match) => {
          const mt = (match.matchType || '').toLowerCase();
          const mode = (match.mode || '').toLowerCase();
          return mode.includes('solo') && mode.includes('fpp') && mt !== 'ranked' && mt !== 'competitive' && !mode.startsWith('ranked');
        });
      case '솔로 TPP':
        return matches.filter((match) => {
          const mt = (match.matchType || '').toLowerCase();
          const mode = (match.mode || '').toLowerCase();
          return mode.includes('solo') && !mode.includes('fpp') && mt !== 'ranked' && mt !== 'competitive' && !mode.startsWith('ranked');
        });
      case '듀오 FPP':
        return matches.filter((match) => {
          const mt = (match.matchType || '').toLowerCase();
          const mode = (match.mode || '').toLowerCase();
          return mode.includes('duo') && mode.includes('fpp') && mt !== 'ranked' && mt !== 'competitive' && !mode.startsWith('ranked');
        });
      case '듀오 TPP':
        return matches.filter((match) => {
          const mt = (match.matchType || '').toLowerCase();
          const mode = (match.mode || '').toLowerCase();
          return mode.includes('duo') && !mode.includes('fpp') && mt !== 'ranked' && mt !== 'competitive' && !mode.startsWith('ranked');
        });
      case '스쿼드 FPP':
        return matches.filter((match) => {
          const mt = (match.matchType || '').toLowerCase();
          const mode = (match.mode || '').toLowerCase();
          return mode.includes('squad') && mode.includes('fpp') && mt !== 'ranked' && mt !== 'competitive' && !mode.startsWith('ranked');
        });
      case '스쿼드 TPP':
        return matches.filter((match) => {
          const mt = (match.matchType || '').toLowerCase();
          const mode = (match.mode || '').toLowerCase();
          return mode.includes('squad') && !mode.includes('fpp') && mt !== 'ranked' && mt !== 'competitive' && !mode.startsWith('ranked');
        });
      case '이벤트': {
        const EVENT_TYPES = new Set(['event', 'casual', 'airoyale', 'arcade', 'custom', 'training', 'trainingroom']);
        return matches.filter((match) => {
          const mt = (match.matchType || '').toLowerCase();
          if (EVENT_TYPES.has(mt)) return true;
          if (mt === 'official' || mt === '') {
            const mode = (match.mode || '').toLowerCase();
            const mapN = (match.mapName || '').toLowerCase();
            return mode.includes('event') || mode.includes('arcade') || mode.includes('tdm') || mode.includes('training') || mapN.includes('range_main');
          }
          return false;
        });
      }
      default:
        return matches;
    }
  };

  // 최신화 버튼 클릭 핸들러 - PUBG API에서 새로 불러와 DB 갱신
  const handleRefresh = () => {
    if (refreshing || cooldown > 0) return;
    setRefreshing(true);
    setRefreshMsg('최신화 중...');
    // ?force=1 쿼리 파라미터로 이동 → getServerSideProps에서 DB 캐시 무시하고 API 재호출
    const { server: srv, nickname: nick } = router.query;
    router.push(`/player/${srv}/${nick}?force=1`).finally(() => {
      setRefreshing(false);
      setRefreshMsg('');
      setCooldown(30);
    });
  };

  if (isBanned) {
    return (
      <>
        <Header />
        <div className="container mx-auto p-6 min-h-screen">
          <div className="max-w-2xl mx-auto mt-20">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-red-300 dark:border-red-700 shadow-lg text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">⚠️</span>
                </div>
                <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
                  정지된 계정입니다
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  이 플레이어는 PUBG 서비스 이용이 제한된 계정입니다.
                </p>
              </div>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                메인으로
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="container mx-auto p-6 bg-gradient-to-br from-white dark:from-gray-900 via-gray-50 dark:via-gray-900 to-blue-50 dark:to-gray-950 min-h-screen">
          <div className="max-w-2xl mx-auto mt-20">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-lg text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🔍</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  플레이어를 찾을 수 없습니다
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                  PKGG에 등록되어있지않은 플레이어입니다.
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400">
                  닉네임확인 후 다시 검색해주세요.
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                    💡 검색 팁
                  </h3>
                  <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 text-left">
                    <li>• 정확한 닉네임을 입력했는지 확인해주세요</li>
                    <li>• 대소문자, 특수문자를 정확히 입력해주세요</li>
                    <li>
                      • 올바른 플랫폼(Steam/Kakao/Console)을 선택했는지
                      확인해주세요
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => router.push('/?searchFailed=true')}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  다시 검색하기
                </button>
              </div>

              {/* 기술적 오류 정보 (개발자용) */}
              <details className="mt-6 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                  기술적 오류 정보 보기
                </summary>
                <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400 font-mono">
                  {error}
                </div>
              </details>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!playerData) {
    return (
      <>
        <Header />
        <div className="container mx-auto p-4 text-center mt-20">
          {error ? (
            <>
              <p className="text-xl font-bold text-red-500 mb-2">플레이어를 찾을 수 없습니다</p>
              <p className="text-gray-400 mb-6">{error}</p>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                뒤로 가기
              </button>
            </>
          ) : (
            <>
              <p className="text-lg text-gray-600 dark:text-gray-400">플레이어 데이터를 불러오는 중입니다...</p>
              <div className="mt-4 animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            </>
          )}
        </div>
      </>
    );
  }

  // 구조 분해 - 표시할 데이터 사용 (안전한 기본값 설정)
  const {
    profile = {},
    summary = {},
    rankedSummary = null,
    seasonStats = {},
    recentMatches = [],
    clanMembers = [],
  } = displayData || {};

  // profile.clan이 객체일 경우 안전하게 문자열로 출력
  const clanName =
    profile?.clan?.name ||
    (typeof profile?.clan === 'string' ? profile.clan : '');

  // 최근 경기 기반 클랜 시너지 분석 함수 (DB 데이터 전용 - 간단한 추정 방식)
  const analyzeClanSynergyForDB = (
    recentMatches,
    clanMembers,
    currentPlayerNickname
  ) => {
    if (
      !recentMatches ||
      recentMatches.length === 0 ||
      !clanMembers ||
      clanMembers.length === 0
    ) {
      return {
        clanAverage: 0,
        synergyTop: [],
        clanSynergyStatusList: [],
        clanTier: '-',
        bestSquad: {},
      };
    }

    console.log(`[DB 시너지 분석] 시작 - 플레이어: ${currentPlayerNickname}`);
    console.log(
      `[DB 시너지 분석] 클랜원 수: ${clanMembers.length}, 매치 수: ${recentMatches.length}`
    );

    // DB에서는 팀원 정보가 없으므로 간단한 추정 방식 사용
    // 1. 클랜원들의 활동성과 점수를 기반으로 함께 플레이했을 가능성이 높은 멤버들 추출
    const activeMembers = clanMembers
      .filter((member) => member.nickname !== currentPlayerNickname)
      .filter((member) => member.score > 0) // 활동성이 있는 멤버만
      .sort((a, b) => b.score - a.score); // 점수 높은 순으로 정렬

    // TOP3 클랜원 (점수 기반으로 추정)
    const synergyTop = activeMembers.slice(0, 3).map((member, index) => ({
      name: member.nickname,
      count: Math.max(1, Math.floor(Math.random() * 8) + 1), // 1-8 경기로 추정
      avgDamage: Math.round(
        (member.avgDamage || 0) * (0.9 + Math.random() * 0.2)
      ), // 약간의 변동
      winRate: Math.round((member.winRate || 0) * (0.8 + Math.random() * 0.4)), // 약간의 변동
    }));

    // 클랜 평균 딜량 (클랜원들의 평균 딜량을 기반으로 추정)
    const clanAvgDamage =
      activeMembers.length > 0
        ? Math.round(
            activeMembers.reduce(
              (sum, member) => sum + (member.avgDamage || 0),
              0
            ) / activeMembers.length
          )
        : 0;

    // 현재 플레이어의 평균 딜량
    const playerAvgDamage =
      recentMatches.length > 0
        ? Math.round(
            recentMatches.reduce((sum, match) => sum + (match.damage || 0), 0) /
              recentMatches.length
          )
        : 0;

    // 클랜 시너지 딜량 (플레이어 딜량 + 클랜 시너지 보정)
    let clanAverage = 0;
    let synergyStatus = '보통';

    if (clanAvgDamage > 0 && activeMembers.length > 0) {
      // 클랜원들의 실력이 좋으면 시너지 효과도 좋다고 가정
      const synergyBonus = Math.min(
        50,
        Math.max(-30, (clanAvgDamage - playerAvgDamage) * 0.3)
      );
      clanAverage = Math.round(playerAvgDamage + synergyBonus);

      if (synergyBonus > 20) {
        synergyStatus = '좋음';
      } else if (synergyBonus < -20) {
        synergyStatus = '나쁨';
      }
    } else {
      clanAverage = playerAvgDamage;
    }

    // 클랜 내 티어 계산 (MMR 기준 — 클랜 분석/클랜 상세 페이지와 동일 기준)
    const currentPlayerMMR = displayData?.mmr || 0;
    const higherMMRMembers = clanMembers.filter(
      (member) => (member.mmr || 0) > currentPlayerMMR
    ).length;

    let clanTier = '-';
    if (clanMembers.length > 1) {
      const rank = higherMMRMembers + 1;
      const total = clanMembers.length;

      if (rank === 1) clanTier = `🥇 1위 (${rank}/${total})`;
      else if (rank === 2) clanTier = `🥈 2위 (${rank}/${total})`;
      else if (rank === 3) clanTier = `🥉 3위 (${rank}/${total})`;
      else if (rank <= Math.ceil(total * 0.3))
        clanTier = `🔥 상위권 (${rank}/${total})`;
      else if (rank <= Math.ceil(total * 0.7))
        clanTier = `⚡ 중위권 (${rank}/${total})`;
      else clanTier = `📈 하위권 (${rank}/${total})`;
    }

    console.log(
      `[DB 시너지 분석] 완료 - 클랜 딜량: ${clanAverage}, 시너지: ${synergyStatus}, 티어: ${clanTier}`
    );

    return {
      clanAverage,
      synergyTop,
      clanSynergyStatusList: [synergyStatus],
      clanTier,
      bestSquad:
        synergyTop.length > 0
          ? {
              members: synergyTop.map((t) => t.name),
              avgWinRate: Math.round(
                synergyTop.reduce((sum, t) => sum + t.winRate, 0) /
                  synergyTop.length
              ),
            }
          : {},
    };
  };

  // 최근 경기 기반 클랜 시너지 분석 함수 (PUBG API 데이터용)
  const analyzeClanSynergyForAPI = (
    recentMatches,
    clanMembers,
    currentPlayerNickname
  ) => {
    if (
      !recentMatches ||
      recentMatches.length === 0 ||
      !clanMembers ||
      clanMembers.length === 0
    ) {
      return {
        clanAverage: 0,
        synergyTop: [],
        clanSynergyStatusList: [],
        clanTier: '-',
        bestSquad: {},
      };
    }

    // 클랜원 닉네임 목록 생성 (소문자로 변환해서 매칭 정확도 향상)
    const clanMemberNames = clanMembers.map((m) => m.nickname.toLowerCase());
    const currentPlayerLower = currentPlayerNickname?.toLowerCase() || '';

    console.log(`[API 시너지 분석] 클랜원 목록:`, clanMemberNames);
    console.log(`[API 시너지 분석] 현재 플레이어:`, currentPlayerLower);
    console.log(`[API 시너지 분석] 분석할 경기 수:`, recentMatches.length);

    // 최근 경기에서 클랜원들과 함께한 경기 필터링
    const clanMatches = recentMatches.filter((match) => {
      // PUBG API 데이터에서 teammatesDetail 확인
      if (match.teammatesDetail && Array.isArray(match.teammatesDetail)) {
        const teammateNames = match.teammatesDetail.map((t) =>
          t.name.toLowerCase()
        );
        const hasCleanMates = teammateNames.some(
          (name) =>
            clanMemberNames.includes(name) && name !== currentPlayerLower
        );
        if (hasCleanMates) {
          console.log(
            `[API 시너지 분석] 클랜 경기 발견 - 매치 ${match.matchId}, 팀원:`,
            teammateNames
          );
        }
        return hasCleanMates;
      }
      return false;
    });

    console.log(
      `[API 시너지 분석] 클랜원과 함께한 경기:`,
      clanMatches.length,
      '개'
    );

    // 클랜원별 함께한 경기 통계
    const teammateStats = {};
    clanMatches.forEach((match) => {
      if (match.teammatesDetail) {
        match.teammatesDetail.forEach((teammate) => {
          const teammateLower = teammate.name.toLowerCase();
          if (
            clanMemberNames.includes(teammateLower) &&
            teammateLower !== currentPlayerLower
          ) {
            if (!teammateStats[teammate.name]) {
              teammateStats[teammate.name] = {
                name: teammate.name,
                matchCount: 0,
                totalDamage: 0,
                totalKills: 0,
                wins: 0,
                top10s: 0,
                placements: [],
              };
            }

            teammateStats[teammate.name].matchCount++;
            teammateStats[teammate.name].totalDamage += match.damage || 0;
            teammateStats[teammate.name].totalKills += match.kills || 0;
            teammateStats[teammate.name].placements.push(match.rank || 100);

            if (match.win) {
              teammateStats[teammate.name].wins++;
            }
            if (match.top10) {
              teammateStats[teammate.name].top10s++;
            }
          }
        });
      }
    });

    // 함께한 클랜원 TOP3 계산
    const synergyTop = Object.values(teammateStats)
      .filter((stat) => stat.matchCount >= 1) // 최소 1경기 이상
      .sort((a, b) => {
        // 먼저 경기 수로 정렬, 같으면 승률로 정렬
        if (b.matchCount !== a.matchCount) {
          return b.matchCount - a.matchCount;
        }
        const aWinRate = a.matchCount > 0 ? a.wins / a.matchCount : 0;
        const bWinRate = b.matchCount > 0 ? b.wins / b.matchCount : 0;
        return bWinRate - aWinRate;
      })
      .slice(0, 3)
      .map((stat) => ({
        name: stat.name,
        count: stat.matchCount,
        avgDamage:
          stat.matchCount > 0
            ? Math.round(stat.totalDamage / stat.matchCount)
            : 0,
        winRate:
          stat.matchCount > 0
            ? Math.round((stat.wins / stat.matchCount) * 100)
            : 0,
      }));

    console.log(`[API 시너지 분석] TOP3 클랜원:`, synergyTop);

    // 클랜 시너지 딜량 계산 (클랜원과 함께한 경기에서의 평균 딜량)
    const clanMatchDamages = clanMatches.map((match) => match.damage || 0);
    const clanAverage =
      clanMatchDamages.length > 0
        ? Math.round(
            clanMatchDamages.reduce((sum, dmg) => sum + dmg, 0) /
              clanMatchDamages.length
          )
        : 0;

    // 솔로 경기 딜량과 비교
    const soloMatches = recentMatches.filter((match) => {
      if (!match.teammatesDetail || !Array.isArray(match.teammatesDetail))
        return true;
      const teammateNames = match.teammatesDetail.map((t) =>
        t.name.toLowerCase()
      );
      return !teammateNames.some(
        (name) => clanMemberNames.includes(name) && name !== currentPlayerLower
      );
    });
    const soloAverage =
      soloMatches.length > 0
        ? Math.round(
            soloMatches.reduce((sum, match) => sum + (match.damage || 0), 0) /
              soloMatches.length
          )
        : 0;

    console.log(
      `[API 시너지 분석] 클랜 평균 딜량: ${clanAverage}, 솔로 평균 딜량: ${soloAverage}`
    );

    // 클랜 시너지 상태 결정
    let synergyStatus = '보통';
    if (clanAverage > soloAverage * 1.15) {
      synergyStatus = '좋음';
    } else if (clanAverage < soloAverage * 0.85) {
      synergyStatus = '나쁨';
    }

    // 클랜 내 티어 계산 (MMR 기준 — 클랜 분석/클랜 상세 페이지와 동일 기준)
    const currentPlayerMMR = displayData?.mmr || 0;
    const higherMMRMembers = clanMembers.filter(
      (member) => (member.mmr || 0) > currentPlayerMMR
    ).length;

    let clanTier = '-';
    if (clanMembers.length > 1) {
      const rank = higherMMRMembers + 1;
      const total = clanMembers.length;

      if (rank === 1) clanTier = `🥇 1위 (${rank}/${total})`;
      else if (rank === 2) clanTier = `🥈 2위 (${rank}/${total})`;
      else if (rank === 3) clanTier = `🥉 3위 (${rank}/${total})`;
      else if (rank <= Math.ceil(total * 0.3))
        clanTier = `🔥 상위권 (${rank}/${total})`;
      else if (rank <= Math.ceil(total * 0.7))
        clanTier = `⚡ 중위권 (${rank}/${total})`;
      else clanTier = `📈 하위권 (${rank}/${total})`;
    }

    console.log(
      `[API 시너지 분석] 최종 결과 - 클랜티어: ${clanTier}, 시너지: ${synergyStatus}`
    );

    return {
      clanAverage,
      synergyTop,
      clanSynergyStatusList: [synergyStatus],
      clanTier,
      bestSquad:
        synergyTop.length > 0
          ? {
              members: synergyTop.map((t) => t.name),
              avgWinRate: Math.round(
                synergyTop.reduce((sum, t) => sum + t.winRate, 0) /
                  synergyTop.length
              ),
            }
          : {},
    };
  };

  // 클랜 시너지 분석 실행 (데이터 소스에 따라 다른 분석 방법 사용)
  let synergyAnalysis;

  // 데이터 소스가 DB인지 PUBG API인지 확인
  const isDbData = dataSource === 'database';
  const hasTeammatesDetail = recentMatches.some(
    (match) => match.teammatesDetail && match.teammatesDetail.length > 0
  );

  if (isDbData || !hasTeammatesDetail) {
    // DB 데이터이거나 teammatesDetail이 없는 경우
    console.log('[시너지 분석] DB 전용 분석 모드 사용');
    synergyAnalysis = analyzeClanSynergyForDB(
      recentMatches,
      clanMembers,
      profile?.nickname,
      profile?.id
    );
  } else {
    // PUBG API 데이터인 경우
    console.log('[시너지 분석] API 데이터 분석 모드 사용');
    synergyAnalysis = analyzeClanSynergyForAPI(
      recentMatches,
      clanMembers,
      profile?.nickname
    );
  }

  const {
    clanAverage,
    synergyTop,
    clanSynergyStatusList,
    clanTier,
    bestSquad,
  } = synergyAnalysis;

  // 필터된 경기 목록 (초기 5경기 + 더보기로 로드된 경기 합산)
  const allMatches = [...recentMatches, ...extraMatches];
  const filteredMatches = filterMatches(allMatches, selectedMatchFilter);

  const SECTION_TABS = [
    { key: 'overall',  label: '종합 전적',    icon: '📊' },
    { key: 'analysis', label: '플레이어 분석', icon: '🔍' },
    { key: 'weapons',  label: '무기 통계',     icon: '🔫' },
    { key: 'team',     label: '팀 분석',       icon: '👥' },
    { key: 'ai',       label: 'AI 코칭',       icon: '🤖' },
  ]

  return (
    <>
      {/* 네비게이션 로딩 오버레이 */}
      {navLoading && (
        <div className="fixed inset-0 z-[9999] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 bg-gray-900 border border-gray-700 rounded-2xl px-10 py-8 shadow-2xl">
            <div className="w-10 h-10 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-white text-sm font-medium">로딩 중...</span>
          </div>
        </div>
      )}
      <Header />
      <div className="bg-gray-50 dark:bg-gray-950 min-h-screen text-gray-900 dark:text-gray-100">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
        <Head>
          <title>{`${profile?.nickname || '플레이어'} 배그 전적 | PKGG`}</title>
          <meta name="description" content={`${profile?.nickname || '플레이어'}의 배틀그라운드 전적, PKGG 점수, 플레이스타일 분석`} />
          <meta property="og:type" content="profile" />
          <meta property="og:url" content={`https://pkgg.vercel.app/player/${router.query.server}/${profile?.nickname}`} />
          <meta property="og:title" content={`${profile?.nickname || '플레이어'} 배그 전적 | PKGG`} />
          <meta property="og:description" content={`${profile?.nickname || '플레이어'}의 배틀그라운드 전적, PKGG 점수, 플레이스타일 분석`} />
          <meta property="og:image" content="https://pkgg.vercel.app/og-image.png" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={`${profile?.nickname || '플레이어'} 배그 전적 | PKGG`} />
          <meta name="twitter:description" content={`${profile?.nickname || '플레이어'}의 배틀그라운드 전적, PKGG 점수, 플레이스타일 분석`} />
          <meta name="twitter:image" content="https://pkgg.vercel.app/og-image.png" />
          <link rel="canonical" href={`https://pkgg.vercel.app/player/${router.query.server}/${profile?.nickname}`} />
        </Head>

        {/* 데이터 소스 알림 - 간결하게 */}
        {(dataSource === 'db_with_api_enhancement' || dataSource === 'enhanced') && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-xl text-sm">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0"></span>
            <span className="font-medium">최신 데이터 반영 완료</span>
          </div>
        )}
        {(dataSource === 'pubg_api' || dataSource === 'pubg_api_only') && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse flex-shrink-0"></span>
            <span className="font-medium">실시간 데이터 로드 완료</span>
          </div>
        )}
        {dataSource === 'pubg_api_refreshed' && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse flex-shrink-0"></span>
            <span className="font-medium">최신화 완료</span>
            <span className="text-emerald-500 dark:text-emerald-400">— PUBG API에서 새로운 데이터를 불러왔습니다</span>
          </div>
        )}

        {/* 시즌 카운트다운 */}
        <div className="mb-4">
          <SeasonCountdown />
        </div>

        {/* 새로운 플레이어 헤더 */}
        <PlayerHeader
          profile={profile}
          summary={summary}
          rankedSummary={overrideRankedSummary !== undefined ? overrideRankedSummary : rankedSummary}
          seasonStats={overrideSeasonStats || seasonStats}
          clanInfo={profile?.clan}
          recentMatches={recentMatches}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          cooldown={cooldown}
          refreshMsg={refreshMsg}
          mmr={displayData?.mmr || 1000}
          dataSource={dataSource}
          onBotFilterChange={setBotFilterOn}
          matchesLoading={matchesLoading}
          availableSeasons={playerData?.availableSeasons?.length > 0 ? playerData.availableSeasons : (clientSeasons || [])}
          selectedSeasonId={selectedSeasonId}
          onSeasonChange={handleSeasonSelect}
          seasonChanging={seasonChanging}
        />

        {/* 광고 1 */}
        <AdUnit slot="2646189375" format="auto" className="mb-4" />

        <style>{`
          @keyframes tabFadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .tab-fade-in { animation: tabFadeIn 0.2s ease-out; }
        `}</style>

        {/* ── 섹션 탭 네비게이션 (sticky) ── */}
        <div className="sticky top-[60px] z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 -mx-4 px-4 mb-6">
          <nav className="flex gap-1 overflow-x-auto scrollbar-none py-2">
            {SECTION_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <span className="hidden sm:inline">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 탭 콘텐츠 (탭 전환 시 fade 애니메이션) */}
        <div key={activeTab} className="tab-fade-in">

          {/* ══ 종합 전적 ══ */}
          {activeTab === 'overall' && (
            <>
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4 px-1">
                  <div className="w-1 h-5 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">게임 모드별 통계</h2>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200 dark:border-blue-800">상세 분석</span>
                </div>
                <SeasonStatsTabs seasonStatsBySeason={seasonStats || {}} />
              </div>

              <AdUnit slot="2646189375" format="auto" className="mb-6" />

              <section className="recent-matches-section mb-8">
                <div className="flex items-center gap-3 mb-4 px-1">
                  <div className="w-1 h-5 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">최근 경기 내역</h2>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200 dark:border-blue-800">최근 20경기</span>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                  <div className="border-b border-gray-100 dark:border-gray-700 px-4 py-3 overflow-x-auto">
                    <div className="flex gap-1 min-w-max">
                      {[
                        { label: '전체', key: '전체' },
                        { label: '경쟁전', key: '경쟁전' },
                        { label: '솔로', key: '솔로' },
                        { label: '듀오', key: '듀오' },
                        { label: '스쿼드', key: '스쿼드' },
                        { label: '경쟁전 솔로', key: '경쟁전 솔로' },
                        { label: '1인칭 솔로', key: '솔로 FPP' },
                        { label: '3인칭 솔로', key: '솔로 TPP' },
                        { label: '1인칭 듀오', key: '듀오 FPP' },
                        { label: '3인칭 듀오', key: '듀오 TPP' },
                        { label: '1인칭 스쿼드', key: '스쿼드 FPP' },
                        { label: '3인칭 스쿼드', key: '스쿼드 TPP' },
                        { label: '🎉 이벤트', key: '이벤트' },
                      ].map(({ label, key }) => (
                        <button
                          key={key}
                          onClick={() => setSelectedMatchFilter(key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                            selectedMatchFilter === key
                              ? key === '이벤트' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-4">
                    {matchesLoading ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1 pb-1">
                          <svg className="w-3.5 h-3.5 animate-spin text-cyan-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          <span className="text-xs text-cyan-500 font-medium">매치 데이터 분석 중...</span>
                          <span className="text-[11px] text-gray-400">봇킬 분석 포함 — 잠시 기다려 주세요</span>
                        </div>
                        <div className="space-y-3 animate-pulse">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
                              <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48" />
                              </div>
                              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : filteredMatches && filteredMatches.length > 0 ? (
                      <MatchList recentMatches={filteredMatches} playerData={playerData} showBotKills={botFilterOn} />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="text-4xl mb-3">📋</div>
                        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {selectedMatchFilter === '전체'
                            ? '최근 경기 데이터가 없습니다.'
                            : `${selectedMatchFilter} 모드의 기록된 전적이 없습니다.`}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">게임을 플레이하면 데이터가 업데이트됩니다.</div>
                      </div>
                    )}
                  </div>
                </div>

                {!noMoreMatches && (
                  <div className="flex justify-center mt-4 mb-2">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="flex items-center gap-2 px-8 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingMore ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          불러오는 중...
                        </>
                      ) : (
                        <>경기 더 보기<span className="text-xs text-gray-400 ml-1">(+5경기)</span></>
                      )}
                    </button>
                  </div>
                )}

                {selectedMatchId && (
                  <div ref={detailRef} className="mt-6 mb-8">
                    <div className="flex items-center gap-3 mb-4 px-1">
                      <div className="w-1 h-5 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100">경기 상세 정보</h4>
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200 dark:border-blue-800">상세 분석</span>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                      <MatchDetailExpandable matchId={selectedMatchId} />
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          {/* ══ 플레이어 분석 ══ */}
          {activeTab === 'analysis' && (
            <>
              {/* 성장 추적 - 맨 위 */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4 px-1">
                  <div className="w-1 h-5 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">성장 추적</h2>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200 dark:border-blue-800">시간별 성장 분석</span>
                </div>
                {lazyVisible ? (
                  <GrowthChart
                    nickname={profile.nickname}
                    shard={profile.shardId || router.query.server || 'steam'}
                  />
                ) : (
                  <div className="h-48 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
                )}
              </div>

              {/* 주 플레이 맵 - 최근 20경기 */}
              <MapStatsCard matches={recentMatches} />

              {/* 시즌 플레이 현황 - 시즌 데이터 기준 */}
              {(() => {
                const latestSeasonStats = seasonStats && Object.keys(seasonStats).length > 0
                  ? Object.values(seasonStats)[0]
                  : null
                // gameModeStats에는 일반/이벤트 모드만 포함 — 경쟁전은 rankedSummary에서 별도 합산
                let rankedCount = rankedSummary?.games || 0
                let normalCount = 0, eventCount = 0
                for (const [mode, ms] of Object.entries(latestSeasonStats || {})) {
                  const rounds = ms?.rounds || 0
                  if (rounds === 0) continue
                  const m = mode.toLowerCase()
                  if (m.includes('ranked') || m.startsWith('competitive')) rankedCount += rounds
                  else if (m.startsWith('normal') || m.includes('event') || m.includes('casual') || m.includes('arcade')) eventCount += rounds
                  else normalCount += rounds
                }
                const total = rankedCount + normalCount + eventCount
                if (total === 0) return null
                return (
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4 px-1">
                      <div className="w-1 h-5 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">시즌 플레이 현황</h2>
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200 dark:border-blue-800">이번 시즌 {total}경기</span>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                      <ModeDistributionChart modeDistribution={{
                        ranked: Math.round((rankedCount / total) * 100),
                        normal: Math.round((normalCount / total) * 100),
                        event:  Math.round((eventCount  / total) * 100),
                        rankedCount, normalCount, eventCount, total,
                      }} />
                    </div>
                  </div>
                )
              })()}

              {/* 경기 추이 분석 */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4 px-1">
                  <div className="w-1 h-5 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">경기 추이 분석</h2>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200 dark:border-blue-800">성과 트렌드</span>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-base">💪</span>
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">딜량 추이</h4>
                  </div>
                  <RecentDamageTrendChart matches={recentMatches} />
                </div>
              </div>

              {/* 퍼포먼스 백분위 */}
              <div className="mb-6">
                {lazyVisible
                  ? <PlayerPercentileCard playerStats={summary || profile} />
                  : <div className="h-24 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />}
              </div>
            </>
          )}

          {/* ══ 무기 통계 ══ */}
          {activeTab === 'weapons' && profile?.nickname && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4 px-1">
                <div className="w-1 h-5 bg-blue-500 rounded-full flex-shrink-0"></div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">주사용 무기 통계</h2>
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200 dark:border-blue-800">weapon mastery</span>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                {lazyVisible && <WeaponMasteryCard
                  playerId={profile.playerId || null}
                  nickname={profile.nickname}
                  shard={profile.shardId || router.query.server || 'steam'}
                  force={router.query.force === '1'}
                  onReady={(id, weapons) => {
                    setResolvedPlayerId(id)
                    setMasteryWeapons(weapons)
                  }}
                />}
                {!lazyVisible && <div className="h-40 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />}
              </div>
            </div>
          )}

          {/* ══ 팀 분석 ══ */}
          {activeTab === 'team' && (
            <div className="mb-8 flex flex-col gap-4">
              {/* 최근 함께한 플레이어 */}
              <div>
                <div className="flex items-center gap-3 mb-4 px-1">
                  <div className="w-1 h-5 bg-indigo-500 rounded-full flex-shrink-0"></div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">최근 함께한 플레이어</h2>
                  <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-semibold border border-indigo-200 dark:border-indigo-800">최근 20경기</span>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <RecentTeammatesCard
                    matches={recentMatches}
                    myNickname={profile?.nickname}
                  />
                </div>
              </div>

              {/* 클랜 및 팀플레이 분석 */}
              <div>
                <div className="flex items-center gap-3 mb-4 px-1">
                  <div className="w-1 h-5 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">클랜 및 팀플레이 분석</h2>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200 dark:border-blue-800">클랜 시너지</span>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <PlayerDashboard
                    profile={profile}
                    summary={summary}
                    clanAverage={clanAverage}
                    clanMembers={clanMembers}
                    clanTier={clanTier}
                    synergyTop={synergyTop}
                    clanSynergyStatusList={clanSynergyStatusList}
                    bestSquad={bestSquad}
                    seasonStats={seasonStats}
                  />
                  {/* 클랜원 시너지 (클랜 소속 시에만) */}
                  {(() => {
                    const clanInfo = profile?.clan
                    const clanName = typeof clanInfo === 'string' ? clanInfo : clanInfo?.name
                    const hasValidClan = clanName && clanName !== '-' && clanName !== '무소속' && clanName !== 'N/A'
                    return hasValidClan && clanMembers?.length > 0 ? (
                      <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700">
                        <SynergyHeatmap
                          matches={recentMatches}
                          myNickname={profile?.nickname}
                          clanMembers={clanMembers}
                          playerClan={clanName}
                        />
                      </div>
                    ) : null
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ══ AI 코칭 ══ */}
          {activeTab === 'ai' && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4 px-1">
                <div className="w-1 h-5 bg-blue-500 rounded-full flex-shrink-0"></div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">개인 맞춤형 AI 코칭</h2>
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200 dark:border-blue-800">훈련/피드백</span>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                {lazyVisible && <AICoachingCard
                  playerStats={(() => {
                    const latestSeasonStats =
                      seasonStats && Object.keys(seasonStats).length > 0
                        ? Object.values(seasonStats)[0]
                        : null
                    const nonEventModes = latestSeasonStats
                      ? Object.fromEntries(
                          Object.entries(latestSeasonStats).filter(
                            ([mode]) => !mode.startsWith('normal') && !mode.includes('event')
                          )
                        )
                      : {}
                    // 판수가 가장 많은 모드를 선택 (1인칭/3인칭 무관하게 주력 모드 기준)
                    const bestModeStats = Object.values(nonEventModes)
                      .filter(Boolean)
                      .sort((a, b) => (b?.rounds || 0) - (a?.rounds || 0))[0] ?? null
                    const totalSeasonMatches = latestSeasonStats
                      ? Object.values(latestSeasonStats).reduce((total, ms) => total + (ms?.rounds || 0), 0)
                      : 0
                    const rankedMatches = rankedSummary?.games || 0
                    const totalAllMatches = Math.max(totalSeasonMatches, rankedMatches, summary?.roundsPlayed || 0)
                    return {
                      avgDamage:       bestModeStats?.avgDamage       || summary?.avgDamage       || profile?.avgDamage       || 0,
                      avgKills:        bestModeStats?.avgKills         || summary?.avgKills         || profile?.avgKills         || 0,
                      avgAssists:      bestModeStats?.avgAssists       || summary?.avgAssists       || profile?.avgAssists       || 0,
                      avgSurvivalTime: bestModeStats?.avgSurvivalTime  || summary?.avgSurviveTime   || profile?.avgSurviveTime   || 0,
                      winRate:         bestModeStats?.winRate          || summary?.winRate          || profile?.winRate          || 0,
                      top10Rate:       bestModeStats?.top10Rate        || summary?.top10Rate        || profile?.top10Rate        || 0,
                      headshotRate: (() => {
                        if (summary?.headshotKillRatio != null) {
                          const r = parseFloat(summary.headshotKillRatio)
                          return parseFloat((r > 1 ? r : r * 100).toFixed(1))
                        }
                        if (summary?.kills > 0 && summary?.headshots != null) {
                          return parseFloat(((summary.headshots / summary.kills) * 100).toFixed(1))
                        }
                        return bestModeStats?.headshotRate || profile?.headshotKillRatio || 0
                      })(),
                      headshots:   summary?.headshots   || bestModeStats?.headshots || 0,
                      totalKills:  summary?.kills        || bestModeStats?.kills     || 0,
                      totalMatches: totalAllMatches,
                      kd:          bestModeStats?.kd     || summary?.kd              || profile?.kd || 0,
                    }
                  })()}
                  playerInfo={{
                    nickname: profile?.nickname || router.query.nickname,
                    server:   router.query.server || 'steam',
                    playerId: resolvedPlayerId || profile?.playerId || null,
                  }}
                  masteryWeapons={masteryWeapons}
                  rankedStats={rankedSummary}
                />}
                {!lazyVisible && <div className="h-32 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />}
              </div>
            </div>
          )}

        </div>

        {/* 데이터 정보 푸터 */}
        <div className="mt-8 mb-2 text-center text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1.5">
          <span>최종 업데이트:</span>
          <span className="font-medium text-gray-500 dark:text-gray-400">
            {profile?.lastUpdated
              ? new Date(profile.lastUpdated).toLocaleString('ko-KR')
              : '알 수 없음'}
          </span>
        </div>
        </div>
      </div>
    </>
  );
}

/**
 * 시즌 통계에서 한국어 플레이스타일 자동 판별
 * @param {{ avgDamage, avgKills, avgAssists, avgSurviveTime, winRate, top10Rate }} stats
 * @returns {{ playstyle: string, realPlayStyle: string }}
 */
function derivePlayStyle(stats) {
  const {
    avgDamage = 0,
    avgKills = 0,
    avgAssists = 0,
    avgSurviveTime = 0,
    winRate = 0,
    top10Rate = 0,
  } = stats || {};

  // ── 상세 스타일 (realPlayStyle) ──
  let realPlayStyle;
  if (avgKills >= 4 && avgDamage >= 400) {
    realPlayStyle = '극단적 공격형';
  } else if (avgKills >= 3 && avgDamage >= 300) {
    realPlayStyle = '교전형';
  } else if (avgKills >= 2 && avgDamage >= 250) {
    realPlayStyle = '캐리형';
  } else if (avgDamage >= 300 && avgKills < 2) {
    realPlayStyle = '지속 전투형';
  } else if (top10Rate >= 50 && avgSurviveTime >= 1200) {
    realPlayStyle = '극단적 수비형';
  } else if (top10Rate >= 30 && avgSurviveTime >= 900) {
    realPlayStyle = '후반 존버형';
  } else if (avgAssists >= 1.5 && top10Rate >= 25) {
    realPlayStyle = '전략적 어시스트러';
  } else if (avgDamage >= 180 && avgKills < 1.5 && avgSurviveTime >= 800) {
    realPlayStyle = '저격 위주';
  } else if (avgKills >= 2 && avgDamage < 180) {
    realPlayStyle = '고효율 승부사';
  } else if (avgDamage >= 200 && avgKills >= 1.5) {
    realPlayStyle = '중거리 안정형';
  } else if (top10Rate >= 25 || avgSurviveTime >= 800) {
    realPlayStyle = '생존형';
  } else if (avgKills >= 1.5) {
    realPlayStyle = '공격형';
  } else {
    realPlayStyle = '일반 밸런스형';
  }

  // ── 기본 스타일 (playstyle) ──
  const aggression = avgKills * 20 + avgDamage / 8;
  const survival   = avgSurviveTime / 60 + top10Rate + winRate * 1.5;
  const support    = avgAssists * 20 + top10Rate * 0.5;

  let playstyle;
  if (aggression >= 75) playstyle = '교전형';
  else if (survival >= 60) playstyle = '수비형';
  else if (support >= 50) playstyle = '안정형';
  else playstyle = '밸런스';

  return { playstyle, realPlayStyle };
}

// DB에서 플레이어 캐시 데이터 조회 (최근 2시간 이내만 유효)
// 조회 순서: 1) PlayerCache → 2) ClanMember (하위 호환)
async function getPlayerFromDB(nickname, server) {
  const { PrismaClient } = require('@prisma/client');
  const { calculateMMR: calcMMR } = require('../../../utils/mmrCalculator');
  const prisma = new PrismaClient();
  try {
    // 1순위: PlayerCache 테이블 조회 (모든 유저 포함)
    const cached = await prisma.playerCache.findFirst({
      where: {
        nickname: { equals: nickname, mode: 'insensitive' },
        ...(server && server !== 'unknown' ? { pubgShardId: server } : {}),
      },
      orderBy: { lastUpdated: 'desc' },
    });

    // 정지 계정 체크 (캐시 신선도와 무관하게 먼저 처리)
    if (cached?.isBanned) return { __banned: true }

    if (cached) {
      const hoursSince = (Date.now() - new Date(cached.lastUpdated).getTime()) / 3600000;
      const hasRealStats = (cached.avgDamage > 0 || cached.avgKills > 0 || (cached.roundsPlayed ?? 0) > 0);
      if (hoursSince <= 2 && hasRealStats) {
        console.log(`✅ PlayerCache 히트: ${nickname} (${Math.round(hoursSince * 60)}분 전)`);
        // PlayerCache에는 매치/클랜 정보가 없으므로 ClanMember도 함께 조회
        const member = await prisma.clanMember.findFirst({
          where: { nickname: { equals: nickname, mode: 'insensitive' } },
          include: {
            clan: true,
            modeStats: true,
          },
        });
        if (member) {
          // ClanMember 데이터가 있으면 아래 기존 로직으로 처리 (member 사용)
          // → 아래 로직으로 fall-through하기 위해 cached를 무시하고 member 경로로 진행
        } else {
          // ClanMember 없는 솔로 유저: PlayerCache 기본 데이터로 응답 구성
          const summaryBase = {
            avgDamage: cached.avgDamage || 0,
            avgKills: cached.avgKills || 0,
            avgAssists: cached.avgAssists || 0,
            avgSurviveTime: cached.avgSurviveTime || 0,
            winRate: cached.winRate || 0,
            top10Rate: cached.top10Rate || 0,
            score: cached.score || 0,
          };
          const { playstyle, realPlayStyle } = derivePlayStyle(summaryBase);
          const summary = { ...summaryBase, playstyle, realPlayStyle, style: cached.style || playstyle };
          const mmr = calcMMR(summaryBase);
          return {
            profile: {
              nickname: cached.nickname,
              shardId: cached.pubgShardId,
              playerId: cached.pubgPlayerId,
              clanName: null,
              clanTag: null,
              lastCachedAt: cached.lastUpdated ? cached.lastUpdated.toISOString() : null,
            },
            summary,
            mmr,
            recentMatches: [],
            modeStats: {},
            clanMembers: [],
            clanSynergy: null,
            rankedStats: null,
          };
        }
      }
    }

    // 2순위: ClanMember 테이블 (기존 로직)
    const member = await prisma.clanMember.findFirst({
      where: { nickname: { equals: nickname, mode: 'insensitive' } },
      include: {
        clan: true,
        modeStats: true,
      },
    });

    // PlayerMatch 별도 조회 (ClanMember에 matches relation 없음)
    const memberMatches = member
      ? await prisma.playerMatch.findMany({
          where: member.pubgPlayerId
            ? { pubgAccountId: member.pubgPlayerId }
            : { nickname: { equals: nickname, mode: 'insensitive' } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        })
      : [];

    if (!member) return null;

    // 2시간 이상 지난 캐시는 무효 처리
    const hoursSince = (Date.now() - new Date(member.lastUpdated).getTime()) / 3600000;
    if (hoursSince > 2) return null;

    // 클랜 멤버 목록 조회
    const rawClanMembers = member.clanId
      ? await prisma.clanMember.findMany({
          where: { clanId: member.clanId },
          orderBy: { score: 'desc' },
        })
      : [];

    // pubgClanId 교차 검증: 이 클랜 소속이 확인된 멤버만 인정
    const clanPubgId = member.clan?.pubgClanId || null;
    const verifiedMembers = clanPubgId
      ? rawClanMembers.filter((m) => m.pubgClanId === clanPubgId)
      : rawClanMembers;

    // 중복 제거 (pubgPlayerId 기준, 없으면 nickname 기준)
    const seenKeys = new Set();
    const clanMembers = verifiedMembers.filter((m) => {
      const key = m.pubgPlayerId || `nick_${m.nickname}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    const summaryBase = {
      avgDamage: member.avgDamage || 0,
      avgKills: member.avgKills || 0,
      avgAssists: member.avgAssists || 0,
      avgSurviveTime: member.avgSurviveTime || 0,
      winRate: member.winRate || 0,
      top10Rate: member.top10Rate || 0,
      score: member.score || 0,
    };
    const { playstyle, realPlayStyle } = derivePlayStyle(summaryBase);
    const summary = {
      ...summaryBase,
      playstyle,
      realPlayStyle,
      style: member.style && member.style !== '-' ? member.style : playstyle,
    };

    const recentMatches = memberMatches.map(m => ({
      matchId: m.matchId,
      mode: m.mode,
      mapName: m.mapName,
      placement: m.placement,
      kills: m.kills,
      assists: m.assists,
      damage: m.damage,
      surviveTime: m.surviveTime,
      matchTimestamp: m.createdAt ? m.createdAt.toISOString() : new Date().toISOString(),
    }));

    // 최근 경기에서 모드 분포 추정
    const ranked = recentMatches.filter(m => m.mode?.includes('ranked')).length;
    const event  = recentMatches.filter(m => m.mode?.includes('event')).length;
    const normal = recentMatches.length - ranked - event;
    const total  = recentMatches.length || 1;

    // PlayerModeStats → seasonStats 빌드 (DB 캐시에서도 시즌 성과 경기수 복원)
    let seasonStatsFromDB = {};
    if (member.modeStats && member.modeStats.length > 0) {
      const modesObj = {};
      for (const ms of member.modeStats) {
        if (!ms.matches) continue;
        modesObj[ms.mode] = {
          rounds:          ms.matches,
          wins:            ms.wins || 0,
          top10s:          ms.top10s || 0,
          avgDamage:       ms.avgDamage || 0,
          totalKills:      Math.round((ms.avgKills || 0) * ms.matches),
          avgKills:        ms.avgKills || 0,
          assists:         Math.round((ms.avgAssists || 0) * ms.matches),
          avgAssists:      ms.avgAssists || 0,
          winRate:         ms.winRate || 0,
          top10Rate:       ms.top10Rate || 0,
          avgSurvivalTime: ms.avgSurvivalTime || 0,
          headshotRate:    ms.headshotRate    || 0,
          longestKill:     ms.longestKill     || 0,
        };
      }
      if (Object.keys(modesObj).length > 0) seasonStatsFromDB = { db_cache: modesObj };
    }

    return {
      profile: {
        nickname: member.nickname,
        playerId: member.pubgPlayerId,
        shardId: member.pubgShardId || server,
        lastUpdated: member.lastUpdated.toISOString(),
        lastCachedAt: member.lastUpdated ? member.lastUpdated.toISOString() : null,
        clan: member.clan
          ? {
              name: member.clan.name,
              tag: member.clan.pubgClanTag,
              level: member.clan.pubgClanLevel,
              memberCount: member.clan.pubgMemberCount,
            }
          : null,
      },
      summary,
      recentMatches,
      modeDistribution: {
        ranked: Math.round((ranked / total) * 100),
        normal: Math.round((normal / total) * 100),
        event:  Math.round((event  / total) * 100),
      },
      seasonStats: seasonStatsFromDB,
      rankedSummary: null,
      clanMembers: clanMembers.map(m => ({
        id: m.id,
        nickname: m.nickname,
        score: m.score || 0,
        avgDamage: m.avgDamage || 0,
        avgKills: m.avgKills || 0,
        winRate: m.winRate || 0,
        top10Rate: m.top10Rate || 0,
        style: m.style || '-',
        mmr: calcMMR({ avgDamage: m.avgDamage, avgKills: m.avgKills, winRate: m.winRate, top10Rate: m.top10Rate }),
      })),
      modeStats: [],
      rankedStats: [],
      mmr: calcMMR(summary),
    };
  } catch (e) {
    console.warn('DB 캐시 조회 실패:', e.message);
    return null;
  } finally {
    await prisma.$disconnect();
  }
}

export async function getServerSideProps({ params, query }) {
  const { server, nickname } = params;
  const forceRefresh = query.force === '1';
  const { calculateMMR: calcMMR } = require('../../../utils/mmrCalculator');
  const { cachedPubgFetch, TTL, PubgApiError, getPlayerDataCache, setPlayerDataCache } = require('../../../utils/pubgApiCache');
  const PUBG_BASE = 'https://api.pubg.com/shards';
  const shards = ['steam', 'kakao', 'psn', 'xbox'];

  // ── 1순위: 인메모리 닉네임 캐시 (5분, PUBG API + DB 완전 스킵) ──
  if (!forceRefresh) {
    const memCached = getPlayerDataCache(nickname, server);
    if (memCached) {
      return { props: { playerData: memCached, error: null, dataSource: 'memory_cache' } };
    }
  }

  try {
    // ── 2순위: DB 캐시 (force=1이면 무조건 API 호출) ──
    if (!forceRefresh) {
      const cached = await getPlayerFromDB(nickname, server);
      if (cached?.__banned) {
        return { props: { playerData: null, error: null, isBanned: true, dataSource: null } };
      }
      if (cached) {
        console.log(`[SSR] DB 캐시 HIT: ${nickname}`);

        // PUBG API에서 시즌 통계 + 경쟁전 랭크 보완
        if (cached.profile?.playerId) {
          try {
            const playerShard = cached.profile.shardId || server;
            const seasonsData = await cachedPubgFetch(
              `${PUBG_BASE}/${playerShard}/seasons`,
              { ttl: TTL.SEASON, force: false }
            );
            const seasons = seasonsData.data || [];
            const currentSeason = seasons.find(s => s.attributes?.isCurrentSeason);

            // availableSeasons 빌드 (드롭다운용) — 현재 시즌 번호 기반으로 이전 4시즌 생성
            if (currentSeason) {
              const curNum2 = parseInt(currentSeason.id.match(/-(\d+)$/)?.[1] || '0', 10);
              if (curNum2 > 0) {
                cached.availableSeasons = [
                  { id: currentSeason.id, isCurrentSeason: true, label: `시즌 ${curNum2} (현재)` },
                  ...Array.from({ length: 4 }, (_, i) => ({
                    id: `division.bro.official.pc-2018-${curNum2 - i - 1}`,
                    isCurrentSeason: false,
                    label: `시즌 ${curNum2 - i - 1}`,
                  })).filter(s => parseInt(s.id.match(/-(\d+)$/)?.[1] || '0', 10) > 0),
                ];
              }
              cached.currentSeasonId = currentSeason.id;
            }

            if (currentSeason) {
              const [statsResult, rankedResult] = await Promise.allSettled([
                cachedPubgFetch(
                  `${PUBG_BASE}/${playerShard}/players/${cached.profile.playerId}/seasons/${currentSeason.id}`,
                  { ttl: TTL.PLAYER, force: false }
                ),
                cachedPubgFetch(
                  `${PUBG_BASE}/${playerShard}/players/${cached.profile.playerId}/seasons/${currentSeason.id}/ranked`,
                  { ttl: TTL.PLAYER, force: false }
                ),
              ]);

              // 시즌 통계 보완
              if (statsResult.status === 'fulfilled') {
                const gameModeStats = statsResult.value.data?.attributes?.gameModeStats || {};
                const transformedModes = {};
                for (const [mode, s] of Object.entries(gameModeStats)) {
                  const rounds = s.roundsPlayed || 0;
                  if (rounds === 0) continue;
                  transformedModes[mode] = {
                    rounds, wins: s.wins || 0, top10s: s.top10s || 0,
                    kd: parseFloat(((s.kills || 0) / Math.max(1, rounds - (s.wins || 0))).toFixed(2)),
                    avgDamage: Math.round((s.damageDealt || 0) / rounds),
                    winRate: Math.round(((s.wins || 0) / rounds) * 100),
                    top10Rate: Math.round(((s.top10s || 0) / rounds) * 100),
                    headshotRate: (s.kills || 0) > 0 ? Math.round(((s.headshotKills || 0) / s.kills) * 100) : 0,
                    longestKill: Math.round(s.longestKill || 0),
                    totalKills: s.kills || 0,
                    avgSurvivalTime: Math.round((s.timeSurvived || 0) / rounds),
                    avgAssists: parseFloat(((s.assists || 0) / rounds).toFixed(1)),
                    assists: s.assists || 0,
                  };
                }
                if (Object.keys(transformedModes).length > 0) {
                  cached.seasonStats = { [currentSeason.id]: transformedModes };
                  console.log(`[DB캐시] 시즌 통계 보완: ${Object.keys(transformedModes).join(', ')}`);
                }
              }

              // 경쟁전 랭크 보완
              if (rankedResult.status === 'fulfilled') {
                const rankedModeStats = rankedResult.value.data?.attributes?.rankedGameModeStats || {};
                const modeData = rankedModeStats['squad-fpp'] || rankedModeStats['squad'] || Object.values(rankedModeStats)[0];
                if (modeData && modeData.roundsPlayed > 0) {
                  const r = modeData.roundsPlayed;
                  const deaths = Math.max(1, r - (modeData.wins || 0));
                  cached.rankedSummary = {
                    mode: 'squad-fpp',
                    tier: modeData.currentTier?.tier || 'Unranked',
                    subTier: modeData.currentTier?.subTier || 0,
                    currentTier: modeData.currentTier?.tier || 'Unranked',
                    rp: modeData.currentRankPoint || 0,
                    bestTier: modeData.bestTier?.tier || modeData.currentTier?.tier || 'Unranked',
                    bestRankPoint: modeData.bestRankPoint || modeData.currentRankPoint || 0,
                    games: r,
                    wins: modeData.wins || 0,
                    kd: parseFloat(((modeData.kills || 0) / deaths).toFixed(2)),
                    kda: parseFloat((((modeData.kills || 0) + (modeData.assists || 0)) / deaths).toFixed(2)),
                    avgDamage: r > 0 ? Math.round((modeData.damageDealt || 0) / r) : 0,
                    winRate: parseFloat(((modeData.wins || 0) / r * 100).toFixed(1)),
                    top10Rate: parseFloat(((modeData.top10s || 0) / r * 100).toFixed(1)),
                    top10Ratio: (modeData.top10s || 0) / r,
                    kills: modeData.kills || 0,
                    deaths,
                    assists: modeData.assists || 0,
                    headshotKills: modeData.headshotKills || 0,
                    headshotRate: (modeData.kills || 0) > 0
                      ? parseFloat(((modeData.headshotKills || 0) / (modeData.kills || 1) * 100).toFixed(1))
                      : 0,
                    damageDealt: modeData.damageDealt || 0,
                    dBNOs: modeData.dBNOs || 0,
                    roundsPlayed: r,
                  };
                  console.log(`[DB캐시] 경쟁전 보완: 티어=${cached.rankedSummary.tier}, RP=${cached.rankedSummary.rp}`);
                }
              }

              // DB 캐시 경로에서도 PKGG 점수를 정확하게 재계산
              // (DB 저장값이 일반전만 반영한 경우 경쟁전 포함 재계산으로 보정)
              try {
                const gmStats = statsResult.status === 'fulfilled'
                  ? (statsResult.value.data?.attributes?.gameModeStats || {}) : {};
                const rms = rankedResult.status === 'fulfilled'
                  ? (rankedResult.value.data?.attributes?.rankedGameModeStats || {}) : {};

                let tr = 0, tw = 0, tt = 0, tdmg = 0, tk = 0, ta = 0, ts = 0;
                for (const [mode, s] of Object.entries(gmStats)) {
                  if (mode.startsWith('normal') || mode.includes('event') || !s?.roundsPlayed) continue;
                  tr += s.roundsPlayed; tw += s.wins || 0; tt += s.top10s || 0;
                  tdmg += s.damageDealt || 0; tk += s.kills || 0;
                  ta += s.assists || 0; ts += s.timeSurvived || 0;
                }
                for (const rm of Object.values(rms)) {
                  if (!rm?.roundsPlayed) continue;
                  tr += rm.roundsPlayed; tw += rm.wins || 0; tt += rm.top10s || 0;
                  tdmg += rm.damageDealt || 0; tk += rm.kills || 0;
                  ta += rm.assists || 0; ts += rm.timeSurvived || 0;
                }
                if (tr > 0) {
                  const freshSummary = {
                    avgDamage:      Math.round(tdmg / tr),
                    avgKills:       parseFloat((tk / tr).toFixed(2)),
                    avgAssists:     parseFloat((ta / tr).toFixed(2)),
                    avgSurviveTime: Math.round(ts / tr),
                    winRate:        parseFloat(((tw / tr) * 100).toFixed(1)),
                    top10Rate:      parseFloat(((tt / tr) * 100).toFixed(1)),
                  };
                  const freshMMR = calcMMR(freshSummary);
                  // DB에 저장된 mmr보다 크면 보완 (경쟁전 포함 계산이 더 정확)
                  if (freshMMR > (cached.mmr || 0)) {
                    cached.mmr = freshMMR;
                    cached.summary = { ...cached.summary, ...freshSummary };
                    console.log(`[DB캐시] PKGG 점수 재계산: ${cached.mmr} → ${freshMMR} (경쟁전 포함)`);
                  }
                }
              } catch (e) {
                console.warn('[DB캐시] PKGG 점수 재계산 실패:', e.message);
              }
            }
          } catch (e) {
            console.warn('[DB캐시] PUBG API 보완 실패:', e.message);
          }
        }

        setPlayerDataCache(nickname, cached.profile?.shardId || server, cached);
        return { props: { playerData: cached, error: null, dataSource: 'database' } };
      }
      console.log(`[SSR] DB 캐시 MISS: ${nickname} — PUBG API 호출`);
    }
    // Step 1: PUBG API로 플레이어 검색 (shard 우선순위 적용)
    let pubgPlayer = null;
    let pubgShard = server || 'steam';
    const searchShards = server && server !== 'unknown'
      ? [server, ...shards.filter(s => s !== server)]
      : shards;

    for (const shard of searchShards) {
      try {
        const json = await cachedPubgFetch(
          `${PUBG_BASE}/${shard}/players?filter[playerNames]=${encodeURIComponent(nickname)}`,
          { ttl: TTL.PLAYER, force: forceRefresh }
        );
        if (json.data?.length > 0) {
          pubgPlayer = json.data[0];
          pubgShard = shard;
          console.log(`✅ 플레이어 발견: ${nickname} (${shard})`);
          break;
        }
      } catch (e) {
        if (e.code !== 'NOT_FOUND') console.warn(`${shard} 샤드 오류:`, e.message);
      }
    }

    if (!pubgPlayer) {
      throw new Error(`플레이어를 찾을 수 없습니다: ${nickname}`);
    }

    // Step 2: 클랜 + 시즌 목록 병렬 조회 (캐시 + 중복제거 적용)
    const [clanResult, seasonResult] = await Promise.allSettled([
      pubgPlayer.attributes.clanId
        ? cachedPubgFetch(
            `${PUBG_BASE}/${pubgShard}/clans/${pubgPlayer.attributes.clanId}`,
            { ttl: TTL.CLAN, force: forceRefresh }
          )
        : Promise.resolve(null),
      cachedPubgFetch(
        `${PUBG_BASE}/${pubgShard}/seasons`,
        { ttl: TTL.SEASON, force: false } // 시즌 목록은 잘 안 바뀌므로 force bypass 없음
      ),
    ]);

    let pubgClan = null;
    if (clanResult.status === 'fulfilled' && clanResult.value) {
      pubgClan = clanResult.value.data; // cachedPubgFetch는 이미 파싱된 JSON, .data가 리소스 객체
      console.log(`✅ 클랜: ${pubgClan.attributes.clanName}`);
    }

    // Step 3: 현재 시즌 통계 + 랭크 통계 병렬 조회
    let pubgSeasonStats = {};
    let pubgSummaryFromStats = null;
    let pubgRankedSummary = null;
    let pubgModeDistribution = { ranked: 0, normal: 0, event: 0 };
    let currentSeasonModes = {};

    let availableSeasons = [];
    if (seasonResult.status === 'fulfilled') {
      const seasons = seasonResult.value.data || []; // cachedPubgFetch: json.data = 배열
      const currentSeason = seasons.find(s => s.attributes?.isCurrentSeason);
      // 현재 시즌 번호에서 이전 4시즌 생성 (ID 패턴: division.bro.official.pc-2018-N)
      if (currentSeason) {
        const curNum = parseInt(currentSeason.id.match(/-(\d+)$/)?.[1] || '0', 10);
        if (curNum > 0) {
          availableSeasons = [
            { id: currentSeason.id, isCurrentSeason: true, label: `시즌 ${curNum} (현재)` },
            ...Array.from({ length: 4 }, (_, i) => ({
              id: `division.bro.official.pc-2018-${curNum - i - 1}`,
              isCurrentSeason: false,
              label: `시즌 ${curNum - i - 1}`,
            })).filter(s => parseInt(s.id.match(/-(\d+)$/)?.[1] || '0', 10) > 0),
          ];
        }
      }
      if (currentSeason) {
        console.log(`✅ 현재 시즌: ${currentSeason.id}`);
        const [statsResult, rankedResult] = await Promise.allSettled([
          cachedPubgFetch(
            `${PUBG_BASE}/${pubgShard}/players/${pubgPlayer.id}/seasons/${currentSeason.id}`,
            { ttl: TTL.PLAYER, force: forceRefresh }
          ),
          cachedPubgFetch(
            `${PUBG_BASE}/${pubgShard}/players/${pubgPlayer.id}/seasons/${currentSeason.id}/ranked`,
            { ttl: TTL.PLAYER, force: forceRefresh }
          ),
        ]);

        // 시즌 통계 변환
        if (statsResult.status === 'fulfilled') {
          const gameModeStats = statsResult.value.data?.attributes?.gameModeStats || {};
          const transformedModes = {};
          for (const [mode, s] of Object.entries(gameModeStats)) {
            const rounds = s.roundsPlayed || 0;
            if (rounds === 0) continue;
            transformedModes[mode] = {
              rounds,
              wins: s.wins || 0,
              top10s: s.top10s || 0,
              kd: parseFloat(((s.kills || 0) / Math.max(1, rounds - (s.wins || 0))).toFixed(2)),
              avgDamage: Math.round((s.damageDealt || 0) / rounds),
              winRate: Math.round(((s.wins || 0) / rounds) * 100),
              top10Rate: Math.round(((s.top10s || 0) / rounds) * 100),
              headshotRate: (s.kills || 0) > 0 ? Math.round(((s.headshotKills || 0) / s.kills) * 100) : 0,
              longestKill: Math.round(s.longestKill || 0),
              headshots: s.headshotKills || 0,
              totalKills: s.kills || 0,
              maxKills: s.roundMostKills || 0,
              avgRank: 0,
              avgSurvivalTime: Math.round((s.timeSurvived || 0) / rounds),
              avgAssists: parseFloat(((s.assists || 0) / rounds).toFixed(1)),
              assists: s.assists || 0,
              mostAssists: 0,
            };
          }
          if (Object.keys(transformedModes).length > 0) {
            pubgSeasonStats = { [currentSeason.id]: transformedModes };
            currentSeasonModes = transformedModes;
            console.log(`✅ 시즌 통계 모드: ${Object.keys(transformedModes).join(', ')}`);

            // modeDistribution 계산
            let rankedGames = 0, normalGames = 0, eventGames = 0;
            for (const [mode, ms] of Object.entries(transformedModes)) {
              const r = ms.rounds || 0;
              if (mode.startsWith('ranked')) rankedGames += r;
              else if (mode.startsWith('normal') || mode.includes('event')) eventGames += r;
              else normalGames += r;
            }
            const totalForDist = rankedGames + normalGames + eventGames || 1;
            pubgModeDistribution = {
              ranked: Math.round((rankedGames / totalForDist) * 100),
              normal: Math.round((normalGames / totalForDist) * 100),
              event: Math.round((eventGames / totalForDist) * 100),
            };
          }

          // summary 계산 — transformedModes 존재 여부와 무관하게 항상 실행
          // 일반전 게임수가 0이고 경쟁전만 플레이하는 고수 유저도 PKGG 점수 정상 계산
          {
            let totalRounds = 0, totalWins = 0, totalTop10s = 0;
            let totalDamage = 0, totalKills = 0, totalAssists = 0, totalSurvivalTime = 0;
            let totalHeadshotKills = 0;
            for (const [mode, ms] of Object.entries(transformedModes)) {
              if (mode.startsWith('normal') || mode.includes('event')) continue;
              const r = ms.rounds || 0;
              if (r === 0) continue;
              totalRounds += r;
              totalWins += ms.wins || 0;
              totalTop10s += ms.top10s || 0;
              totalDamage += (ms.avgDamage || 0) * r;
              totalKills += ms.totalKills || 0;
              totalAssists += ms.assists || 0;
              totalSurvivalTime += (ms.avgSurvivalTime || 0) * r;
              totalHeadshotKills += ms.headshots || 0;
            }
            if (rankedResult.status === 'fulfilled') {
              const rms = rankedResult.value.data?.attributes?.rankedGameModeStats || {};
              for (const rm of Object.values(rms)) {
                if (!rm || !rm.roundsPlayed) continue;
                const rr = rm.roundsPlayed;
                totalRounds    += rr;
                totalWins      += rm.wins          || 0;
                totalTop10s    += rm.top10s        || 0;
                totalDamage    += rm.damageDealt   || 0;
                totalKills     += rm.kills         || 0;
                totalAssists   += rm.assists       || 0;
                totalSurvivalTime  += rm.timeSurvived  || 0;
                totalHeadshotKills += rm.headshotKills || 0;
              }
            }
            if (totalRounds > 0) {
              const avgDamage = Math.round(totalDamage / totalRounds);
              const avgKills = parseFloat((totalKills / totalRounds).toFixed(2));
              const winRate = parseFloat(((totalWins / totalRounds) * 100).toFixed(1));
              const top10Rate = parseFloat(((totalTop10s / totalRounds) * 100).toFixed(1));
              const avgAssists = parseFloat((totalAssists / totalRounds).toFixed(2));
              const avgSurviveTime = Math.round(totalSurvivalTime / totalRounds);
              const { playstyle, realPlayStyle } = derivePlayStyle({ avgDamage, avgKills, avgAssists, avgSurviveTime, winRate, top10Rate });
              pubgSummaryFromStats = {
                avgDamage,
                avgKills,
                avgAssists,
                avgSurviveTime,
                winRate,
                top10Rate,
                score: Math.round(avgDamage * 0.4 + avgKills * 40 + top10Rate + 1000),
                roundsPlayed: totalRounds,
                kills: totalKills,
                headshots: totalHeadshotKills,
                headshotKillRatio: totalKills > 0 ? parseFloat((totalHeadshotKills / totalKills * 100).toFixed(1)) : 0,
                playstyle,
                realPlayStyle,
                style: playstyle,
              };
              console.log(`✅ summary: avgDamage=${avgDamage}, avgKills=${avgKills}, winRate=${winRate}%, style=${playstyle}`);
            }
          }
        } else {
          console.warn('시즌 통계 조회 실패:', statsResult.reason?.message);
        }

        // 랭크 통계 변환
        if (rankedResult.status === 'fulfilled') {
          const rankedModeStats = rankedResult.value.data?.attributes?.rankedGameModeStats || {};
          const modeData = rankedModeStats['squad-fpp'] || rankedModeStats['squad'] || Object.values(rankedModeStats)[0];
          if (modeData && modeData.roundsPlayed > 0) {
            const r = modeData.roundsPlayed;
            const deaths = Math.max(1, r - (modeData.wins || 0));

            // PUBG /ranked 엔드포인트는 headshotKills를 제공하지 않음
            // gameModeStats의 ranked-* 모드에서 헤드샷 데이터 보완
            let hsKills = modeData.headshotKills || 0;
            let totalKillsForHs = modeData.kills || 0;
            if (hsKills === 0 && currentSeasonModes) {
              for (const [mode, ms] of Object.entries(currentSeasonModes)) {
                if (mode.startsWith('ranked')) {
                  hsKills += ms.headshots || 0;
                  totalKillsForHs = totalKillsForHs || ms.totalKills || 0;
                }
              }
            }

            pubgRankedSummary = {
              mode: 'squad-fpp',
              tier: modeData.currentTier?.tier || 'Unranked',
              subTier: modeData.currentTier?.subTier || 0,
              currentTier: modeData.currentTier?.tier || 'Unranked',
              rp: modeData.currentRankPoint || 0,
              bestTier: modeData.bestTier?.tier || modeData.currentTier?.tier || 'Unranked',
              bestRankPoint: modeData.bestRankPoint || modeData.currentRankPoint || 0,
              games: r,
              wins: modeData.wins || 0,
              kd: parseFloat(((modeData.kills || 0) / deaths).toFixed(2)),
              kda: parseFloat((((modeData.kills || 0) + (modeData.assists || 0)) / deaths).toFixed(2)),
              avgDamage: r > 0 ? Math.round((modeData.damageDealt || 0) / r) : 0,
              winRate: parseFloat(((modeData.wins || 0) / r * 100).toFixed(1)),
              top10Rate: parseFloat(((modeData.top10s || 0) / r * 100).toFixed(1)),
              top10Ratio: (modeData.top10s || 0) / r,
              avgRank: 0,
              kills: modeData.kills || 0,
              deaths,
              assists: modeData.assists || 0,
              headshotKills: hsKills,
              headshotRate: totalKillsForHs > 0
                ? parseFloat((hsKills / totalKillsForHs * 100).toFixed(1))
                : 0,
              damageDealt: modeData.damageDealt || 0,
              dBNOs: modeData.dBNOs || 0,
              roundsPlayed: r,
            };
            console.log(`✅ 랭크: 티어=${pubgRankedSummary.tier}, RP=${pubgRankedSummary.rp}, 게임=${r}, 헤드샷킬=${hsKills}`);
          }
        } else {
          console.warn('랭크 통계 조회 실패:', rankedResult.reason?.message);
        }
      }
    }

    // Kakao 샤드 폴백: Kakao PUBG 서비스 종료로 현재 시즌 데이터가 없는 경우
    // Steam 샤드에서 동일 닉네임 플레이어 데이터 재조회
    if (pubgShard === 'kakao' && pubgSummaryFromStats === null) {
      try {
        console.log(`[Kakao fallback] Steam 샤드에서 ${nickname} 재조회 시도`);
        const steamSearch = await cachedPubgFetch(
          `${PUBG_BASE}/steam/players?filter[playerNames]=${encodeURIComponent(nickname)}`,
          { ttl: TTL.PLAYER, force: forceRefresh }
        );
        if (steamSearch.data?.length > 0) {
          const steamPlayer = steamSearch.data[0];
          const steamSeasonsRes = await cachedPubgFetch(
            `${PUBG_BASE}/steam/seasons`,
            { ttl: TTL.SEASON, force: false }
          );
          const steamSeasons = steamSeasonsRes.data || [];
          const steamCurrentSeason = steamSeasons.find(s => s.attributes?.isCurrentSeason);
          if (steamCurrentSeason) {
            const [steamStatsRes, steamRankedRes] = await Promise.allSettled([
              cachedPubgFetch(
                `${PUBG_BASE}/steam/players/${steamPlayer.id}/seasons/${steamCurrentSeason.id}`,
                { ttl: TTL.PLAYER, force: forceRefresh }
              ),
              cachedPubgFetch(
                `${PUBG_BASE}/steam/players/${steamPlayer.id}/seasons/${steamCurrentSeason.id}/ranked`,
                { ttl: TTL.PLAYER, force: forceRefresh }
              ),
            ]);
            if (steamStatsRes.status === 'fulfilled') {
              const steamModeStats = steamStatsRes.value.data?.attributes?.gameModeStats || {};
              const steamTransformed = {};
              for (const [mode, s] of Object.entries(steamModeStats)) {
                const rounds = s.roundsPlayed || 0;
                if (rounds === 0) continue;
                steamTransformed[mode] = {
                  rounds,
                  wins: s.wins || 0,
                  top10s: s.top10s || 0,
                  kd: parseFloat(((s.kills || 0) / Math.max(1, rounds - (s.wins || 0))).toFixed(2)),
                  avgDamage: Math.round((s.damageDealt || 0) / rounds),
                  winRate: Math.round(((s.wins || 0) / rounds) * 100),
                  top10Rate: Math.round(((s.top10s || 0) / rounds) * 100),
                  headshotRate: (s.kills || 0) > 0 ? Math.round(((s.headshotKills || 0) / s.kills) * 100) : 0,
                  headshots: s.headshotKills || 0,
                  totalKills: s.kills || 0,
                  avgSurvivalTime: Math.round((s.timeSurvived || 0) / rounds),
                  avgAssists: parseFloat(((s.assists || 0) / rounds).toFixed(1)),
                  assists: s.assists || 0,
                };
              }
              // 이벤트 모드 제외한 summary 계산
              let sr = 0, sw = 0, st10 = 0, sd = 0, sk = 0, sa = 0, ss = 0, shs = 0;
              for (const [mode, ms] of Object.entries(steamTransformed)) {
                if (mode.startsWith('normal') || mode.includes('event')) continue;
                const r = ms.rounds || 0;
                if (r === 0) continue;
                sr += r; sw += ms.wins || 0; st10 += ms.top10s || 0;
                sd += (ms.avgDamage || 0) * r; sk += ms.totalKills || 0;
                sa += ms.assists || 0; ss += (ms.avgSurvivalTime || 0) * r;
                shs += ms.headshots || 0;
              }
              if (sr > 0) {
                const aD = Math.round(sd / sr), aK = parseFloat((sk / sr).toFixed(2));
                const wR = parseFloat(((sw / sr) * 100).toFixed(1));
                const t10 = parseFloat(((st10 / sr) * 100).toFixed(1));
                const aA = parseFloat((sa / sr).toFixed(2));
                const aST = Math.round(ss / sr);
                const { playstyle, realPlayStyle } = derivePlayStyle({ avgDamage: aD, avgKills: aK, avgAssists: aA, avgSurviveTime: aST, winRate: wR, top10Rate: t10 });
                pubgSummaryFromStats = {
                  avgDamage: aD, avgKills: aK, avgAssists: aA, avgSurviveTime: aST,
                  winRate: wR, top10Rate: t10,
                  score: Math.round(aD * 0.4 + aK * 40 + t10 + 1000),
                  roundsPlayed: sr, kills: sk,
                  headshots: shs,
                  headshotKillRatio: sk > 0 ? parseFloat((shs / sk * 100).toFixed(1)) : 0,
                  playstyle, realPlayStyle, style: playstyle,
                };
                pubgSeasonStats = { [steamCurrentSeason.id]: steamTransformed };
                currentSeasonModes = steamTransformed;
                console.log(`✅ [Kakao fallback] Steam 데이터 사용: avgDamage=${aD}, avgKills=${aK}`);
              }
            }
            // 랭크 통계도 Steam에서 가져오기
            if (steamRankedRes.status === 'fulfilled' && pubgRankedSummary === null) {
              const rms = steamRankedRes.value.data?.attributes?.rankedGameModeStats || {};
              const md = rms['squad-fpp'] || rms['squad'] || Object.values(rms)[0];
              if (md && md.roundsPlayed > 0) {
                const r = md.roundsPlayed;
                const deaths = Math.max(1, r - (md.wins || 0));
                pubgRankedSummary = {
                  mode: 'squad-fpp', tier: md.currentTier?.tier || 'Unranked',
                  subTier: md.currentTier?.subTier || 0,
                  currentTier: md.currentTier?.tier || 'Unranked',
                  rp: md.currentRankPoint || 0,
                  bestTier: md.bestTier?.tier || md.currentTier?.tier || 'Unranked',
                  bestRankPoint: md.bestRankPoint || md.currentRankPoint || 0,
                  games: r, wins: md.wins || 0,
                  kd: parseFloat(((md.kills || 0) / deaths).toFixed(2)),
                  kda: parseFloat((((md.kills || 0) + (md.assists || 0)) / deaths).toFixed(2)),
                  avgDamage: r > 0 ? Math.round((md.damageDealt || 0) / r) : 0,
                  winRate: parseFloat(((md.wins || 0) / r * 100).toFixed(1)),
                  top10Rate: parseFloat(((md.top10s || 0) / r * 100).toFixed(1)),
                  kills: md.kills || 0, deaths, assists: md.assists || 0,
                  headshotKills: md.headshotKills || 0,
                  headshotRate: (md.kills || 0) > 0 ? parseFloat(((md.headshotKills || 0) / (md.kills || 1) * 100).toFixed(1)) : 0,
                  dBNOs: md.dBNOs || 0, roundsPlayed: r,
                };
              }
            }
          }
        }
      } catch (e) {
        console.warn('[Kakao fallback] Steam 재조회 실패:', e.message);
      }
    }

    // Step 4: 매치는 클라이언트에서 비동기 로딩 (LCP 개선)
    // 매치 10개 병렬 API 조회를 SSR에서 제거 → HTML 즉시 전송 후 client에서 /api/matches/load-more 호출
    const recentMatches = [];

    // Step 5: API 기반 playerData 구성
    const playerData = {
      profile: {
        nickname: pubgPlayer.attributes.name,
        playerId: pubgPlayer.id,
        shardId: pubgShard,
        lastUpdated: new Date().toISOString(),
        lastCachedAt: new Date().toISOString(),
        clan: pubgClan
          ? {
              name: pubgClan.attributes.clanName,
              tag: pubgClan.attributes.clanTag,
              level: pubgClan.attributes.clanLevel,
              memberCount: pubgClan.attributes.clanMemberCount,
            }
          : null,
      },
      summary: pubgSummaryFromStats || {
        avgDamage: 0, avgKills: 0, avgAssists: 0, avgSurviveTime: 0,
        winRate: 0, top10Rate: 0, score: 0, style: '-',
      },
      recentMatches,
      modeStats: [],
      modeDistribution: pubgModeDistribution,
      seasonStats: pubgSeasonStats,
      availableSeasons,
      currentSeasonId: Object.keys(pubgSeasonStats)[0] || null,
      clanMembers: [],
      rankedStats: [],
      rankedSummary: pubgRankedSummary,
      mmr: calcMMR(pubgSummaryFromStats),
    };

    // Step 6: 백그라운드 DB 저장 (upsert) + 매치 저장
    savePlayerToDatabase(pubgPlayer, pubgShard, pubgClan, pubgSummaryFromStats, recentMatches, currentSeasonModes)
      .catch(e => console.error('DB 저장 실패:', e.message));

    // 최근 매치 10개 백그라운드 저장 (PlayerMatch 테이블 — skipDuplicates)
    saveMatchesBackground(pubgPlayer, pubgShard)
      .catch(e => console.error('매치 백그라운드 저장 실패:', e.message));

    // DB에 저장된 미분석 매치 봇킬 분석 (기존 데이터 처리, 최대 3경기)
    analyzePendingMatchesBackground(pubgPlayer.id, pubgPlayer.attributes.name, pubgShard)
      .catch(e => console.warn('미분석 매치 백그라운드 분석 실패:', e.message));

    // 클랜 멤버 DB에서 조회 (클랜 소속인 경우)
    if (pubgClan) {
      try {
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const clanRow = await prisma.clan.findFirst({ where: { pubgClanId: pubgClan.id } });
        if (clanRow) {
          const rawMembers = await prisma.clanMember.findMany({
            where: { clanId: clanRow.id },
            orderBy: { score: 'desc' },
          });

          // pubgClanId 교차 검증: 실제 이 클랜 소속 멤버만 인정
          const verifiedMembers = clanRow.pubgClanId
            ? rawMembers.filter((m) => m.pubgClanId === clanRow.pubgClanId)
            : rawMembers;

          // 중복 제거 (pubgPlayerId 기준, 없으면 nickname 기준)
          const seenKeys = new Set();
          const members = verifiedMembers.filter((m) => {
            const key = m.pubgPlayerId || `nick_${m.nickname}`;
            if (seenKeys.has(key)) return false;
            seenKeys.add(key);
            return true;
          });

          playerData.clanMembers = members.map(m => ({
            id: m.id,
            nickname: m.nickname,
            score: m.score || 0,
            avgDamage: m.avgDamage || 0,
            avgKills: m.avgKills || 0,
            winRate: m.winRate || 0,
            top10Rate: m.top10Rate || 0,
            style: m.style || '-',
            mmr: calcMMR({ avgDamage: m.avgDamage, avgKills: m.avgKills, winRate: m.winRate, top10Rate: m.top10Rate }),
          }));
        }
        await prisma.$disconnect();
      } catch (e) {
        console.warn('클랜 멤버 DB 조회 실패:', e.message);
      }
    }

    // PUBG API 결과를 5분 인메모리 캐시에 저장 (Rate Limit 절약)
    if (!forceRefresh) {
      setPlayerDataCache(playerData.profile.nickname, pubgShard, playerData);
    }

    return {
      props: { playerData, error: null, dataSource: forceRefresh ? 'pubg_api_refreshed' : 'pubg_api' },
    };
  } catch (error) {
    console.error('getServerSideProps error:', error);
    return {
      props: { playerData: null, error: error.message, dataSource: null },
    };
  }
}
