import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { calculateMMR } from '../../../utils/mmrCalculator';

import Header from '../../../components/layout/Header';
import PlayerHeader from '../../../components/player/PlayerHeader';
import MatchListRow from '../../../components/match/MatchListRow';
import AdUnit from '../../../components/AdUnit';

// 무거운 컴포넌트 lazy load → 초기 JS 번들 분리, LCP 차단 제거
const PlayerDashboard       = dynamic(() => import('../../../components/player/PlayerDashboard'), { ssr: false });
const ModeDistributionChart = dynamic(() => import('../../../components/charts/ModeDistributionChart'), { ssr: false });
const RecentDamageTrendChart= dynamic(() => import('../../../components/charts/RecentDamageTrendChart'), { ssr: false });
const SeasonStatsTabs       = dynamic(() => import('../../../components/SeasonStatsTabs'), { ssr: false });
const RankDistributionChart = dynamic(() => import('../../../components/charts/RankDistributionChart'), { ssr: false });
const SynergyHeatmap        = dynamic(() => import('../../../components/charts/SynergyHeatmap'), { ssr: false });
const EnhancedPlayerStats   = dynamic(() => import('../../../components/player/EnhancedPlayerStats'), { ssr: false });
const MatchDetailExpandable = dynamic(() => import('../../../components/match/MatchDetailExpandable'), { ssr: false });
const WeaponMasteryCard     = dynamic(() => import('../../../components/player/WeaponMasteryCard'), { ssr: false, loading: () => <div className="h-40 bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-xs text-gray-400">🔫 무기 데이터 불러오는 중...</div> });
const GrowthChart           = dynamic(() => import('../../../components/player/GrowthChart'), { ssr: false, loading: () => <div className="h-48 bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-xs text-gray-400">📈 성장 기록 수집 중...</div> });
const AICoachingCard        = dynamic(() => import('../../../components/player/AICoachingCard'), { ssr: false, loading: () => <div className="h-32 bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-xs text-gray-400">🤖 AI 코치 출동 준비 중...</div> });
const PlayerPercentileCard  = dynamic(() => import('../../../components/player/PlayerPercentileCard'), { ssr: false, loading: () => <div className="h-24 bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-xs text-gray-400">🌍 전 세계 유저와 비교 중...</div> });

// 반드시 export default 함수 바깥에 위치!
function MatchList({ recentMatches, playerData }) {
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
        />
      ))}
    </div>
  );
}

// 플레이어 데이터 DB 저장/업데이트 (백그라운드 upsert)
async function savePlayerToDatabase(pubgPlayer, shard, pubgClan, summary, matches = []) {
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
      roundsPlayed: summary?.roundsPlayed || 0,
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

    // 최근 매치 저장 (기존 삭제 후 재저장)
    if (matches.length > 0 && memberId) {
      await prisma.playerMatch.deleteMany({ where: { clanMemberId: memberId } });
      await prisma.playerMatch.createMany({
        data: matches.slice(0, 20).map(m => ({
          clanMemberId: memberId,
          matchId: m.matchId || `${Date.now()}-${Math.random()}`,
          mode: m.mode || 'unknown',
          mapName: m.mapName || '알 수 없음',
          placement: m.placement || 0,
          kills: m.kills || 0,
          assists: m.assists || 0,
          damage: m.damage || 0,
          surviveTime: m.surviveTime || 0,
          createdAt: m.matchTimestamp ? new Date(m.matchTimestamp) : new Date(),
        })),
      });
      console.log(`✅ 매치 ${matches.length}개 DB 저장 완료`);
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
        roundsPlayed: summary?.roundsPlayed || 0,
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
              score: Math.round(summary.score || 0),
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
              총 킬수:{' '}
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

const LOADING_MSGS = [
  { icon: '🪂', text: '낙하산 펼치는 중...' },
  { icon: '🗺️', text: '착지 지점 분석 중...' },
  { icon: '🔫', text: '탄약 장전 중...' },
  { icon: '📦', text: '보급품 확인 중...' },
  { icon: '🏃', text: '블루존 피하는 중...' },
  { icon: '🔭', text: '적 위치 스캔 중...' },
  { icon: '💊', text: '진통제 먹는 중...' },
  { icon: '🚗', text: '차량 수리 중...' },
  { icon: '🩹', text: '팀원 부활시키는 중...' },
  { icon: '🎯', text: '에임 조정 중...' },
];

function PlayerSkeleton() {
  const msg = LOADING_MSGS[Math.floor(Math.random() * LOADING_MSGS.length)];
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
        {/* 로딩 메시지 */}
        <div className="flex items-center justify-center gap-2 py-2">
          <span className="text-xl">{msg.icon}</span>
          <span className="text-sm text-gray-500 font-medium">{msg.text}</span>
          <span className="flex gap-0.5">
            {[0,1,2].map(i => (
              <span key={i} className="w-1 h-1 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
        </div>
        {/* 스탯 카드 스켈레톤 */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
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

export default function PlayerPage({ playerData: ssrData, error, dataSource, availableSeasons = [], playerId, shardId }) {
  const router = useRouter();
  const { server, nickname } = router.query;
  const cacheKey = `${server}_${nickname}`;

  const [playerData, setPlayerData] = useState(ssrData);
  const [pageLoading, setPageLoading] = useState(false);
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
  const [currentSeasonId, setCurrentSeasonId] = useState(() =>
    availableSeasons.find(s => s.isCurrent)?.id || ''
  );
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [selectedMatchFilter, setSelectedMatchFilter] = useState('전체');

  // SSR 데이터를 세션 캐시에 저장
  useEffect(() => {
    if (ssrData && cacheKey) setCachedPlayer(cacheKey, ssrData);
  }, [ssrData, cacheKey]);

  // 클라이언트에서 초기 매치 로딩 (SSR에서 매치 제거로 LCP 개선)
  // DB 캐시 데이터는 teammatesDetail이 없으므로 API에서 매치 재로드 (백그라운드)
  useEffect(() => {
    const isDbCached = dataSource === 'database';
    if (ssrData?.recentMatches?.length > 0 && !isDbCached) {
      setMatchesLoading(false);
      return;
    }
    const nick = ssrData?.profile?.nickname;
    const shard = ssrData?.profile?.shardId || server || 'steam';
    if (!nick) { setMatchesLoading(false); return; }

    const matchCacheKey = `matches_${shard}_${nick}`;
    const cachedMatches = getCachedPlayer(matchCacheKey);
    if (cachedMatches) {
      setPlayerData(prev => prev ? { ...prev, recentMatches: cachedMatches } : prev);
      setMatchesLoading(false);
      return;
    }

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
      if (url !== router.asPath) setPageLoading(true);
    };
    const handleDone = () => setPageLoading(false);
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

  // 쿨타임 타이머 — early return 이전에 위치해야 훅 규칙 준수
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  if (pageLoading) {
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

  // 지난 시즌 전적 조회 핸들러
  const handleSeasonChange = async (seasonId) => {
    const currentId = availableSeasons.find(s => s.isCurrent)?.id;
    if (seasonId === currentId) {
      setCurrentSeasonId(seasonId);
      setCurrentSeasonData(null);
      return;
    }
    if (!playerId || !shardId) return;
    setCurrentSeasonId(seasonId);
    setSeasonLoading(true);
    try {
      const res = await fetch(`/api/pubg/stats/season/${shardId}/${playerId}/${seasonId}`);
      const json = await res.json();
      if (json.success && json.data?.gameModeStats) {
        const modeStats = json.data.gameModeStats;
        const isEventMode = (m) => m.startsWith('normal') || m.includes('event') || m.includes('airoyale');
        const transformed = {};
        for (const [mode, s] of Object.entries(modeStats)) {
          if (isEventMode(mode)) continue;
          const rounds = s.roundsPlayed || 0;
          if (rounds === 0) continue;
          transformed[mode] = {
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
        setCurrentSeasonData({ [seasonId]: transformed });
      }
    } catch (e) {
      console.error('과거 시즌 조회 실패:', e);
    } finally {
      setSeasonLoading(false);
    }
  };

  // 현재 표시할 데이터 결정 (시즌이 변경되었으면 시즌 데이터, 아니면 기본 데이터)
  const displayData = currentSeasonData || playerData;

  // 경기 필터링 로직
  const filterMatches = (matches, filter) => {
    if (!matches || matches.length === 0) return [];

    // 경쟁전 판별: matchType 우선, 없으면 mode로 fallback
    const isRanked = (m) => {
      const mt = (m.matchType || '').toLowerCase();
      if (mt) return mt === 'ranked' || mt === 'competitive';
      return (m.mode || '').toLowerCase().includes('ranked');
    };
    // 이벤트/사용자지정 판별 — matchType 우선, gameMode fallback
    const EVENT_MT = new Set(['event', 'casual', 'airoyale', 'custom']);
    const isEvent = (m) => {
      const mt = (m.matchType || '').toLowerCase();
      if (mt) return EVENT_MT.has(mt);
      const gm = (m.gameMode || '').toLowerCase();
      return ['tdm', 'ibr', 'arcade', 'training'].some((k) => gm.includes(k));
    };
    const mode = (m) => (m.mode || '').toLowerCase();

    switch (filter) {
      case '전체':
        return matches;
      case '이벤트':
        return matches.filter((m) => isEvent(m));
      case '경쟁전':
        return matches.filter((m) => isRanked(m));
      case '경쟁전 솔로':
        return matches.filter((m) => isRanked(m) && mode(m).includes('solo'));
      case '솔로':
        return matches.filter((m) => !isRanked(m) && !isEvent(m) && mode(m).includes('solo'));
      case '듀오':
        return matches.filter((m) => !isRanked(m) && !isEvent(m) && mode(m).includes('duo'));
      case '스쿼드':
        return matches.filter((m) => !isRanked(m) && !isEvent(m) && mode(m).includes('squad'));
      case '솔로 FPP':
        return matches.filter((m) => !isRanked(m) && !isEvent(m) && mode(m).includes('solo') && mode(m).includes('fpp'));
      case '듀오 FPP':
        return matches.filter((m) => !isRanked(m) && !isEvent(m) && mode(m).includes('duo') && mode(m).includes('fpp'));
      case '스쿼드 FPP':
        return matches.filter((m) => !isRanked(m) && !isEvent(m) && mode(m).includes('squad') && mode(m).includes('fpp'));
      default:
        return matches;
    }
  };

  // 최신화 버튼 클릭 핸들러 - PUBG API에서 새로 불러와 DB 갱신
  const handleRefresh = () => {
    if (refreshing || cooldown > 0) return;
    setRefreshing(true);
    setRefreshMsg('최신화 중...');
    const { server: srv, nickname: nick } = router.query;
    const targetUrl = `/player/${srv}/${nick}?force=1`;
    const currentUrl = `/player/${srv}/${nick}?force=1`;
    // 이미 force=1 상태면 reload, 아니면 push
    const navPromise = router.asPath === currentUrl
      ? (window.location.reload(), Promise.resolve())
      : router.push(targetUrl);
    navPromise?.finally?.(() => {
      setRefreshing(false);
      setRefreshMsg('');
      setCooldown(30);
    });
  };

  if (error) {
    return (
      <>
        <Header />
        <div className="container mx-auto p-6 bg-gradient-to-br from-white via-gray-50 to-blue-50 min-h-screen">
          <div className="max-w-2xl mx-auto mt-20">
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🔍</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  플레이어를 찾을 수 없습니다
                </h1>
                <p className="text-lg text-gray-600 mb-4">
                  PKGG에 등록되어있지않은 플레이어입니다.
                </p>
                <p className="text-base text-gray-500">
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
      <div className="container mx-auto p-4 text-center text-gray-600 dark:text-gray-400 mt-10">
        <p className="text-lg">플레이어 데이터를 불러오는 중입니다...</p>
        <div className="mt-4 animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      </div>
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

    // 클랜 내 티어 계산
    const currentPlayerScore = summary?.score || 0;
    const higherScoreMembers = clanMembers.filter(
      (member) => member.score > currentPlayerScore
    ).length;

    let clanTier = '-';
    if (clanMembers.length > 1) {
      const rank = higherScoreMembers + 1;
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

    // 클랜 내 티어 계산 (클랜원들 중에서 순위)
    const currentPlayerScore = summary?.score || 0;
    const higherScoreMembers = clanMembers.filter(
      (member) => member.score > currentPlayerScore
    ).length;

    let clanTier = '-';
    if (clanMembers.length > 1) {
      const rank = higherScoreMembers + 1;
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
  const hasTeammatesDetail = recentMatches.some(
    (match) => match.teammatesDetail && match.teammatesDetail.length > 0
  );

  if (!hasTeammatesDetail) {
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

  return (
    <>
      <Header />
      <div className="bg-gray-50 min-h-screen text-gray-900">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
        <Head>
          <title>{`${profile?.nickname || '플레이어'}님의 PUBG 전적 | PKGG`}</title>
          <meta name="description" content={`${profile?.nickname || '플레이어'}님의 PUBG 전적, MMR 추이, 플레이스타일 및 클랜 시너지 분석 정보.`} />
          <meta property="og:type" content="profile" />
          <meta property="og:url" content={`https://pk.gg/player/${router.query.server}/${profile?.nickname}`} />
          <meta property="og:title" content={`${profile?.nickname || '플레이어'}님의 PUBG 전적 | PKGG`} />
          <meta property="og:description" content={`${profile?.nickname || '플레이어'}님의 PUBG 전적, MMR 추이, 플레이스타일 분석.`} />
          <meta property="og:image" content="https://pk.gg/og-image.png" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={`${profile?.nickname || '플레이어'}님의 PUBG 전적 | PKGG`} />
          <meta name="twitter:description" content={`${profile?.nickname || '플레이어'}님의 PUBG 전적, MMR 추이, 플레이스타일 분석.`} />
          <meta name="twitter:image" content="https://pk.gg/og-image.png" />
          <link rel="canonical" href={`https://pk.gg/player/${router.query.server}/${profile?.nickname}`} />
        </Head>

        {/* 최신화 완료 알림 */}
        {dataSource === 'pubg_api_refreshed' && (
          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse flex-shrink-0"></span>
            <span className="font-medium">최신화 완료</span>
            <span className="text-emerald-500">— PUBG API에서 새로운 데이터를 불러왔습니다</span>
          </div>
        )}

        {/* 새로운 플레이어 헤더 */}
        <PlayerHeader
          profile={profile}
          summary={summary}
          rankedSummary={rankedSummary}
          seasonStats={seasonStats}
          clanInfo={profile?.clan}
          recentMatches={recentMatches}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          cooldown={cooldown}
          refreshMsg={refreshMsg}
          mmr={displayData?.mmr || 1000}
          dataSource={dataSource}
        />

        {/* 광고 1: 플레이어 헤더 아래 (상단 배너) */}
        <AdUnit slot="2646189375" format="auto" className="mb-6" />

        {/* 퍼포먼스 백분위 리포트 */}
        <div className="mb-6">
          <PlayerPercentileCard playerStats={summary || profile} />
        </div>

        {/* 성장 추적 섹션 */}
        <div className="mb-8">
          <GrowthChart
            nickname={profile.nickname}
            shard={profile.shardId || router.query.server || 'steam'}
          />
        </div>

        {/* 개인 맞춤형 AI 코칭 시스템 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="w-1 h-5 bg-blue-500 rounded-full flex-shrink-0"></div>
            <h2 className="text-lg font-bold text-gray-800">개인 맞춤형 AI 코칭</h2>
            <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200">훈련/피드백</span>
          </div>
          {/* AI 개인 맞춤 코칭 카드 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {/* 디버깅을 위한 데이터 출력 */}
            {typeof window !== 'undefined' &&
              console.log('🚀 PlayerPage - summary 전체:', summary) &&
              console.log('🚀 PlayerPage - profile 전체:', profile) &&
              console.log('🚀 PlayerPage - 특정 필드들:', {
                avgKills: summary?.avgKills,
                winRate: summary?.winRate,
                top10Rate: summary?.top10Rate,
                avgDamage: summary?.avgDamage,
              }) &&
              false}
            <AICoachingCard
              rankedStats={rankedSummary || null}
              playerStats={(() => {
                // 시즌 통계에서 최신 데이터 추출 (전체 시즌 기준 분석)
                const latestSeasonStats =
                  seasonStats && Object.keys(seasonStats).length > 0
                    ? Object.values(seasonStats)[0]
                    : null;

                // 스쿼드 모드 우선, 없으면 다른 모드
                const bestModeStats =
                  latestSeasonStats?.squad ||
                  latestSeasonStats?.duo ||
                  latestSeasonStats?.solo ||
                  Object.values(latestSeasonStats || {})[0];

                // 경쟁전 포함 시즌 전체 경기 수 계산
                const totalSeasonMatches = latestSeasonStats
                  ? Object.values(latestSeasonStats).reduce(
                      (total, modeStats) => {
                        return total + (modeStats?.rounds || 0);
                      },
                      0
                    )
                  : 0;

                // 랭킹 경기 수도 포함 (있는 경우)
                const rankedMatches = rankedSummary?.games || 0;
                const totalAllMatches = Math.max(
                  totalSeasonMatches,
                  rankedMatches,
                  summary?.roundsPlayed || 0
                );

                console.log(
                  '🎯 AI 코칭용 데이터 선택 (경쟁전 포함 시즌 전체 기준):',
                  {
                    latestSeasonStats: latestSeasonStats,
                    bestModeStats: bestModeStats,
                    totalSeasonMatches: totalSeasonMatches,
                    rankedMatches: rankedMatches,
                    totalAllMatches: totalAllMatches,
                    summary: summary,
                  }
                );

                return {
                  avgDamage:
                    bestModeStats?.avgDamage ||
                    summary?.avgDamage ||
                    profile?.avgDamage ||
                    0,
                  avgKills:
                    bestModeStats?.avgKills ||
                    summary?.avgKills ||
                    profile?.avgKills ||
                    0,
                  avgAssists:
                    bestModeStats?.avgAssists ||
                    summary?.avgAssists ||
                    profile?.avgAssists ||
                    0,
                  avgSurvivalTime:
                    bestModeStats?.avgSurvivalTime ||
                    summary?.avgSurviveTime ||
                    profile?.avgSurviveTime ||
                    0,
                  winRate:
                    bestModeStats?.winRate ||
                    summary?.winRate ||
                    profile?.winRate ||
                    0,
                  top10Rate:
                    bestModeStats?.top10Rate ||
                    summary?.top10Rate ||
                    profile?.top10Rate ||
                    0,
                  headshotRate: (() => {
                    // 경쟁전 전체 통계에서 헤드샷 비율 계산
                    if (
                      summary?.headshotKillRatio !== undefined &&
                      summary?.headshotKillRatio !== null
                    ) {
                      const ratio = parseFloat(summary.headshotKillRatio);
                      return parseFloat(
                        (ratio > 1 ? ratio : ratio * 100).toFixed(1)
                      );
                    }
                    // 직접 계산: 경쟁전 전체 헤드샷킬수 / 경쟁전 전체 킬수 * 100
                    if (
                      summary?.kills > 0 &&
                      summary?.headshots !== undefined
                    ) {
                      return parseFloat(
                        ((summary.headshots / summary.kills) * 100).toFixed(1)
                      );
                    }
                    // 기본값들 (하위 호환성)
                    return (
                      bestModeStats?.headshotRate ||
                      profile?.headshotKillRatio ||
                      0
                    );
                  })(),
                  headshots:
                    summary?.headshots || bestModeStats?.headshots || 0, // 헤드샷 킬 수 추가
                  totalKills: summary?.kills || bestModeStats?.kills || 0, // 전체 킬 수 추가
                  totalMatches: totalAllMatches, // 경쟁전 포함 시즌 전체 경기 수
                  kd: bestModeStats?.kd || summary?.kd || profile?.kd || 0,
                };
              })()}
              playerInfo={{
                nickname: profile?.nickname || router.query.nickname,
                server: router.query.server || 'steam',
                playerId: profile?.playerId || null,
              }}
            />
          </div>
        </div>

        {/* 광고 2: AI 코칭 아래 */}
        <AdUnit slot="2646189375" format="auto" className="mb-6" />

        {/* 주사용 무기 통계 섹션 */}
        {profile?.nickname && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4 px-1">
              <div className="w-1 h-5 bg-blue-500 rounded-full flex-shrink-0"></div>
              <h2 className="text-lg font-bold text-gray-800">주사용 무기 통계</h2>
              <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200">weapon mastery</span>
            </div>
            <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
              <WeaponMasteryCard
                playerId={profile.playerId || null}
                nickname={profile.nickname}
                shard={profile.shardId || router.query.server || 'steam'}
                force={router.query.force === '1'}
              />
            </div>
          </div>
        )}

        {/* 광고 3: 무기 통계 아래 */}
        <AdUnit slot="2646189375" format="auto" className="mb-6" />

        {/* 클랜 및 팀플레이 분석 섹션 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="w-1 h-5 bg-blue-500 rounded-full flex-shrink-0"></div>
            <h2 className="text-lg font-bold text-gray-800">클랜 및 팀플레이 분석</h2>
            <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200">클랜 시너지</span>
          </div>
          <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
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

            {/* 클랜원 시너지 히트맵 - 클랜 소속인 경우에만 표시 */}
            {(() => {
              const clanInfo = profile?.clan;
              const clanName =
                typeof clanInfo === 'string' ? clanInfo : clanInfo?.name;
              const hasValidClan =
                clanName &&
                clanName !== '-' &&
                clanName !== '무소속' &&
                clanName !== 'N/A';
              const hasClanData =
                hasValidClan && clanMembers && clanMembers.length > 0;

              return hasClanData ? (
                <div className="mt-10 pt-8 border-t border-gray-200">
                  <SynergyHeatmap
                    matches={recentMatches}
                    myNickname={profile?.nickname}
                    clanMembers={clanMembers}
                    playerClan={clanName}
                  />
                </div>
              ) : null;
            })()}
          </div>
        </div>

        {/* 광고 4: 클랜 분석 아래 */}
        <AdUnit slot="2646189375" format="auto" className="mb-6" />

        {/* 시즌 플레이 현황 - 최근 20경기 matchType 기반 */}
        {(() => {
          // 최근 20경기의 matchType으로 실제 모드 분포 계산
          const recent = (recentMatches || []).slice(0, 20);
          if (recent.length === 0) return null;

          let rankedCount = 0, normalCount = 0, eventCount = 0;
          for (const m of recent) {
            const mt = (m.matchType || '').toLowerCase();
            if (mt === 'ranked' || mt === 'competitive') rankedCount++;
            else if (mt === 'event' || mt === 'casual' || mt === 'airoyale' || mt === 'custom') eventCount++;
            else normalCount++; // official 또는 matchType 없음 → 일반
          }
          const total = recent.length;
          const matchModeDistribution = {
            ranked:      Math.round((rankedCount / total) * 100),
            normal:      Math.round((normalCount / total) * 100),
            event:       Math.round((eventCount  / total) * 100),
            rankedCount,
            normalCount,
            eventCount,
            total,
          };

          return (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4 px-1">
                <div className="w-1 h-5 bg-blue-500 rounded-full flex-shrink-0"></div>
                <h2 className="text-lg font-bold text-gray-800">시즌 플레이 현황</h2>
                <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200">최근 {total}경기 기준</span>
              </div>
              <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
                <ModeDistributionChart modeDistribution={matchModeDistribution} />
              </div>
            </div>
          );
        })()}

        {/* 차트 및 시각화 섹션 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="w-1 h-5 bg-blue-500 rounded-full flex-shrink-0"></div>
            <h2 className="text-lg font-bold text-gray-800">경기 추이 분석</h2>
            <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200">성과 트렌드</span>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-base">💪</span>
              <h4 className="text-sm font-bold text-gray-700">딜량 추이</h4>
            </div>
            <RecentDamageTrendChart matches={recentMatches} />
          </div>
        </div>

        {/* 게임 모드별 통계 섹션 */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-4 px-1 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 bg-blue-500 rounded-full flex-shrink-0"></div>
              <h2 className="text-lg font-bold text-gray-800">게임 모드별 통계</h2>
              <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200">상세 분석</span>
            </div>
            {availableSeasons.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">시즌 선택</span>
                <select
                  value={currentSeasonId}
                  onChange={(e) => handleSeasonChange(e.target.value)}
                  disabled={seasonLoading}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
                >
                  {availableSeasons.map(s => {
                    const label = s.isCurrent ? '현재 시즌' : s.id.replace('division.bro.official.pc-', 'S').replace('-', ' ');
                    return <option key={s.id} value={s.id}>{label}</option>;
                  })}
                </select>
                {seasonLoading && <span className="text-xs text-blue-500 animate-pulse">로딩중...</span>}
              </div>
            )}
          </div>
          <SeasonStatsTabs seasonStatsBySeason={currentSeasonData || seasonStats || {}} />
        </div>

        {/* 최근 경기 내역 섹션 */}
        <section className="recent-matches-section mb-8">
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className="w-1 h-5 bg-blue-500 rounded-full flex-shrink-0"></div>
            <h2 className="text-lg font-bold text-gray-800">최근 경기 내역</h2>
            <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200">최근 20경기</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* 경기 모드 필터 탭 */}
            <div className="border-b border-gray-100 px-4 py-3 overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {[
                  { label: '전체', key: '전체' },
                  { label: '경쟁전', key: '경쟁전' },
                  { label: '솔로', key: '솔로' },
                  { label: '듀오', key: '듀오' },
                  { label: '스쿼드', key: '스쿼드' },
                  { label: '경쟁전 솔로', key: '경쟁전 솔로' },
                  { label: 'FPP 솔로', key: '솔로 FPP' },
                  { label: 'FPP 듀오', key: '듀오 FPP' },
                  { label: 'FPP 스쿼드', key: '스쿼드 FPP' },
                  { label: '이벤트/사용자지정', key: '이벤트' },
                ].map(({ label, key }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedMatchFilter(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      selectedMatchFilter === key
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4">
              {matchesLoading ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-32" />
                        <div className="h-3 bg-gray-200 rounded w-48" />
                      </div>
                      <div className="h-8 w-16 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>
              ) : filteredMatches && filteredMatches.length > 0 ? (
                <MatchList
                  recentMatches={filteredMatches}
                  playerData={playerData}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-4xl mb-3">📋</div>
                  <div className="text-sm font-medium text-gray-600">
                    {selectedMatchFilter === '전체'
                      ? '최근 경기 데이터가 없습니다.'
                      : `${selectedMatchFilter} 모드의 기록된 전적이 없습니다.`}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    게임을 플레이하면 데이터가 업데이트됩니다.
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 더보기 버튼 — 최근 경기 섹션 하단 */}
        {!noMoreMatches && (
          <div className="flex justify-center mt-4 mb-2">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600 text-sm font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                <>
                  경기 더 보기
                  <span className="text-xs text-gray-400">(+5경기)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* 경기 상세 정보 표시 */}
        {selectedMatchId && (
          <div ref={detailRef} className="mt-6 mb-8">
            <div className="flex items-center gap-3 mb-4 px-1">
              <div className="w-1 h-5 bg-blue-500 rounded-full flex-shrink-0"></div>
              <h4 className="text-lg font-bold text-gray-800">경기 상세 정보</h4>
              <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold border border-blue-200">상세 분석</span>
            </div>
            <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200 shadow-sm">
              <MatchDetailExpandable matchId={selectedMatchId} />
            </div>
          </div>
        )}

        {/* 데이터 정보 푸터 */}
        <div className="mt-8 mb-2 text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
          <span>최종 업데이트:</span>
          <span className="font-medium text-gray-500">
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

// DB에서 플레이어 캐시 데이터 조회 — 만료 없음, 항상 DB 우선 노출
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

    if (cached) {
      const hoursSince = (Date.now() - new Date(cached.lastUpdated).getTime()) / 3600000;
      console.log(`✅ PlayerCache 히트: ${nickname} (${Math.round(hoursSince * 60)}분 전)`);
      // PlayerCache에는 매치/클랜 정보가 없으므로 ClanMember도 함께 조회
      const clanMemberForCache = await prisma.clanMember.findFirst({
        where: { nickname: { equals: nickname, mode: 'insensitive' } },
        include: {
          clan: true,
          matches: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
      });
      if (clanMemberForCache) {
        // ClanMember 데이터가 있으면 아래 기존 로직으로 처리
        // → fall-through, 2순위 로직에서 clanMember 재조회
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
            roundsPlayed: cached.roundsPlayed || 0,
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

    // 2순위: ClanMember 테이블 (기존 로직)
    const member = await prisma.clanMember.findFirst({
      where: { nickname: { equals: nickname, mode: 'insensitive' } },
      include: {
        clan: true,
        matches: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!member) return null;
    // 캐시 만료 없음 — 항상 DB 데이터 우선 노출, 최신화는 force=1 버튼으로만

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
      roundsPlayed: member.roundsPlayed || 0,
    };
    const { playstyle, realPlayStyle } = derivePlayStyle(summaryBase);
    const summary = {
      ...summaryBase,
      playstyle,
      realPlayStyle,
      style: member.style && member.style !== '-' ? member.style : playstyle,
    };

    const recentMatches = member.matches.map(m => ({
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
      seasonStats: {},
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
    // Step 1: PUBG API로 플레이어 검색
    // 명시적으로 선택된 shard(steam/kakao/psn/xbox)면 해당 shard만 검색
    let pubgPlayer = null;
    let pubgShard = server || 'steam';
    const searchShards = shards.includes(server)
      ? [server]
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

    // 최근 시즌 목록 (현재 + 이전 5시즌) SSR 전달용
    let availableSeasons = [];
    if (seasonResult.status === 'fulfilled') {
      const allSeasons = seasonResult.value.data || [];
      availableSeasons = allSeasons
        .filter(s => s.id && !s.id.includes('beta') && !s.id.includes('pre'))
        .sort((a, b) => b.id.localeCompare(a.id))
        .slice(0, 6)
        .map(s => ({ id: s.id, isCurrent: !!s.attributes?.isCurrentSeason }));
    }
    if (seasonResult.status === 'fulfilled') {
      const seasons = seasonResult.value.data || []; // cachedPubgFetch: json.data = 배열
      const currentSeason = seasons.find(s => s.attributes?.isCurrentSeason);
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
          // 이벤트맵/사용자 지정/데스매치(normal-* 접두사) 제외 — 일반·경쟁전만 집계
          const isEventMode = (m) => m.startsWith('normal') || m.includes('event') || m.includes('airoyale') || m.includes('deathmatch') || m.includes('casual');
          for (const [mode, s] of Object.entries(gameModeStats)) {
            if (isEventMode(mode)) continue;
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

            // summary 계산 (시즌 전체 합산)
            let totalRounds = 0, totalWins = 0, totalTop10s = 0;
            let totalDamage = 0, totalKills = 0, totalAssists = 0, totalSurvivalTime = 0;
            for (const ms of Object.values(transformedModes)) {
              const r = ms.rounds || 0;
              if (r === 0) continue;
              totalRounds += r;
              totalWins += ms.wins || 0;
              totalTop10s += ms.top10s || 0;
              totalDamage += (ms.avgDamage || 0) * r;
              totalKills += ms.totalKills || 0;
              totalAssists += ms.assists || 0;
              totalSurvivalTime += (ms.avgSurvivalTime || 0) * r;
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
              headshotKills: modeData.headshotKills || 0,
              headshotRate: (modeData.kills || 0) > 0
                ? parseFloat(((modeData.headshotKills || 0) / (modeData.kills || 1) * 100).toFixed(1))
                : 0,
              damageDealt: modeData.damageDealt || 0,
              dBNOs: modeData.dBNOs || 0,
              roundsPlayed: r,
            };
            console.log(`✅ 랭크: 티어=${pubgRankedSummary.tier}, RP=${pubgRankedSummary.rp}, 게임=${r}`);
          }
        } else {
          console.warn('랭크 통계 조회 실패:', rankedResult.reason?.message);
        }
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
      clanMembers: [],
      rankedStats: [],
      rankedSummary: pubgRankedSummary,
      mmr: calcMMR(pubgSummaryFromStats),
    };

    // Step 6: 백그라운드 DB 저장 (upsert + 매치 저장) + 클랜 멤버 조회
    savePlayerToDatabase(pubgPlayer, pubgShard, pubgClan, pubgSummaryFromStats, recentMatches)
      .catch(e => console.error('DB 저장 실패:', e.message));

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
      props: {
        playerData,
        error: null,
        dataSource: forceRefresh ? 'pubg_api_refreshed' : 'pubg_api',
        availableSeasons,
        playerId: pubgPlayer.id,
        shardId: pubgShard,
      },
    };
  } catch (error) {
    console.error('getServerSideProps error:', error);
    return {
      props: { playerData: null, error: error.message, dataSource: null },
    };
  }
}
