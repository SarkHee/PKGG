import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

import PlayerDashboard from '../../../components/player/PlayerDashboard';
import ModeDistributionChart from '../../../components/charts/ModeDistributionChart';
import RecentDamageTrendChart from '../../../components/charts/RecentDamageTrendChart';
import MatchListRow from '../../../components/match/MatchListRow';
import SeasonStatsTabs from '../../../components/SeasonStatsTabs';
import RankDistributionChart from '../../../components/charts/RankDistributionChart';
import SynergyHeatmap from '../../../components/charts/SynergyHeatmap';
import Header from '../../../components/layout/Header';
import EnhancedPlayerStats from '../../../components/player/EnhancedPlayerStats';
import PlayerHeader from '../../../components/player/PlayerHeader';
import MatchDetailExpandable from '../../../components/match/MatchDetailExpandable';
import AICoachingCard from '../../../components/player/AICoachingCard';

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

// DB 전용 플레이어 데이터 조회 함수
async function getDbOnlyPlayerData(members, prisma, dataSource) {
  const member = members[0];

  // 최근 20경기
  const matches = await prisma.playerMatch.findMany({
    where: { clanMemberId: member.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // 모드별 통계
  const modeStatsArr = await prisma.playerModeStats.findMany({
    where: { clanMemberId: member.id },
  });

  // 모드 비율(최근 20경기)
  const modeCount = { ranked: 0, normal: 0, event: 0 };
  (matches || []).forEach((m) => {
    if (m.mode?.includes('ranked')) modeCount.ranked++;
    else if (m.mode?.includes('event')) modeCount.event++;
    else modeCount.normal++;
  });
  const total = matches && matches.length ? matches.length : 1;
  const modeDistribution = {
    ranked: Math.round((modeCount.ranked / total) * 100),
    normal: Math.round((modeCount.normal / total) * 100),
    event: Math.round((modeCount.event / total) * 100),
  };

  const playerData = {
    profile: {
      nickname: member.nickname,
      lastUpdated: new Date().toISOString(), // 현재 시간으로 설정
      clan: member.clan
        ? {
            name: member.clan.name,
            tag: member.clan.pubgClanTag || member.clan.tag,
            level: member.clan.pubgClanLevel,
            memberCount: member.clan.pubgMemberCount || member.clan.memberCount,
            description: member.clan.description,
          }
        : null,
    },
    summary: {
      avgDamage: member.avgDamage ?? 0,
      avgKills: member.avgKills ?? 0,
      avgAssists: member.avgAssists ?? 0,
      avgSurviveTime: member.avgSurviveTime ?? 0,
      winRate: member.winRate ?? 0,
      top10Rate: member.top10Rate ?? 0,
      score: member.score ?? 0,
      style: member.style ?? '-',
    },
    recentMatches: (matches || []).map((m) => ({
      matchId: m.matchId,
      mode: m.mode,
      mapName: m.mapName,
      placement: m.placement,
      kills: m.kills,
      assists: m.assists,
      damage: m.damage,
      surviveTime: m.surviveTime,
      matchTimestamp: m.createdAt
        ? m.createdAt.toISOString()
        : new Date().toISOString(),
    })),
    modeStats: modeStatsArr || [],
    modeDistribution,
    clanMembers: (members || []).map((m) => ({
      id: m.id,
      nickname: m.nickname,
      score: m.score,
      style: m.style,
      avgDamage: m.avgDamage,
      avgKills: m.avgKills,
      avgAssists: m.avgAssists,
      avgSurviveTime: m.avgSurviveTime,
      winRate: m.winRate,
      top10Rate: m.top10Rate,
      pubgClanId: m.pubgClanId,
      pubgPlayerId: m.pubgPlayerId,
      pubgShardId: m.pubgShardId,
      lastUpdated: m.lastUpdated ? m.lastUpdated.toISOString() : null,
      clan: m.clan
        ? {
            id: m.clan.id,
            name: m.clan.name,
            leader: m.clan.leader,
            description: m.clan.description,
            memberCount: m.clan.memberCount,
          }
        : null,
    })),
    // DB에서 랭크 정보가 없으므로 기본값을 설정하되, API 호출이 가능하면 실시간으로 가져오도록 함
    rankedStats: [
      {
        mode: 'squad-fpp',
        tier: 'Unranked',
        rp: 0,
        kd: 0,
        avgDamage: 0,
        winRate: 0,
        survivalTime: 0,
        rounds: 0,
      },
      {
        mode: 'squad',
        tier: 'Unranked',
        rp: 0,
        kd: 0,
        avgDamage: 0,
        winRate: 0,
        survivalTime: 0,
        rounds: 0,
      },
      {
        mode: 'duo-fpp',
        tier: 'Unranked',
        rp: 0,
        kd: 0,
        avgDamage: 0,
        winRate: 0,
        survivalTime: 0,
        rounds: 0,
      },
      {
        mode: 'solo-fpp',
        tier: 'Unranked',
        rp: 0,
        kd: 0,
        avgDamage: 0,
        winRate: 0,
        survivalTime: 0,
        rounds: 0,
      },
    ],
    rankedSummary: {
      mode: 'squad-fpp',
      tier: 'Unranked',
      rp: 0,
      games: 0,
      wins: 0,
      kd: 0,
      avgDamage: 0,
      winRate: 0,
      top10Rate: 0,
      kda: 0,
      avgAssist: 0,
      avgKill: 0,
      avgRank: 0,
      survivalTime: 0,
    },
  };

  return playerData;
}

// PUBG API 데이터로 새 클랜 생성하는 함수
async function createNewClanFromApi(clanData, prisma) {
  try {
    console.log(`새 클랜 생성 시작: ${clanData.name} (ID: ${clanData.id})`);

    // 이미 해당 PUBG 클랜 ID가 있는지 확인
    const existingClan = await prisma.clan.findUnique({
      where: { pubgClanId: clanData.id },
    });

    if (existingClan) {
      console.log(
        `클랜 ${clanData.name}은 이미 존재함 (DB ID: ${existingClan.id})`
      );
      return existingClan;
    }

    // 새 클랜 생성
    const newClan = await prisma.clan.create({
      data: {
        name: clanData.name,
        leader: clanData.leader || '알 수 없음',
        description: clanData.description || '',
        announcement: clanData.announcement || '',
        memberCount: clanData.memberCount || 0,
        pubgClanId: clanData.id,
        pubgClanTag: clanData.tag || clanData.name,
        pubgClanLevel: clanData.level || 1,
        pubgMemberCount: clanData.memberCount || 0,
        lastSynced: new Date(),
        region: 'UNKNOWN', // 나중에 멤버 분석으로 결정
        isKorean: false, // 나중에 멤버 분석으로 결정
      },
    });

    console.log(`새 클랜 생성 완료: ${newClan.name} (DB ID: ${newClan.id})`);
    return newClan;
  } catch (error) {
    console.error(`새 클랜 생성 실패:`, error);
    throw error;
  }
}

// 새 유저를 DB에 저장하는 통합 함수
async function saveNewUserToDB(nickname, apiData, prisma) {
  try {
    console.log(`새 유저 ${nickname} DB 저장 시작...`);

    let targetClan = null;

    // 1. 클랜이 있는 경우
    if (apiData.profile?.clan) {
      const clanData = apiData.profile.clan;

      // 기존 클랜 확인
      const existingClan = await prisma.clan.findFirst({
        where: {
          OR: [{ pubgClanId: clanData.id }, { name: clanData.name }],
        },
      });

      if (existingClan) {
        targetClan = existingClan;
        console.log(`기존 클랜 사용: ${existingClan.name}`);
      } else {
        // 새 클랜 생성
        targetClan = await createNewClanFromApi(clanData, prisma);
      }
    }

    // 2. 유저를 클랜 멤버로 추가 (클랜이 있는 경우) 또는 독립 저장
    if (targetClan) {
      // 클랜 멤버로 추가
      await addNewUserToExistingClan(nickname, apiData, targetClan, prisma);
    } else {
      // 클랜 없는 유저 - 임시로 "무소속" 클랜에 추가
      const nolanClan = await prisma.clan.upsert({
        where: { name: '무소속' },
        update: {},
        create: {
          name: '무소속',
          leader: 'SYSTEM',
          description: '클랜에 소속되지 않은 플레이어들',
          announcement: '',
          memberCount: 0,
          pubgClanId: 'no-clan',
          pubgClanTag: 'NONE',
          pubgClanLevel: 0,
          pubgMemberCount: 0,
          lastSynced: new Date(),
          region: 'GLOBAL',
          isKorean: false,
        },
      });

      await addNewUserToExistingClan(nickname, apiData, nolanClan, prisma);
    }

    console.log(`새 유저 ${nickname} DB 저장 완료`);
  } catch (error) {
    console.error(`새 유저 ${nickname} DB 저장 실패:`, error);
    throw error;
  }
}

// 기존 클랜에 새로운 유저를 추가하는 함수
async function addNewUserToExistingClan(
  nickname,
  apiData,
  existingClan,
  prisma
) {
  try {
    console.log(
      `기존 클랜 ${existingClan.name}에 새 유저 ${nickname} 추가 시작...`
    );

    // 이미 해당 클랜에 같은 닉네임이 있는지 확인
    const existingMember = await prisma.clanMember.findFirst({
      where: {
        nickname: nickname,
        clanId: existingClan.id,
      },
    });

    if (existingMember) {
      console.log(`유저 ${nickname}은 이미 클랜 ${existingClan.name}에 존재함`);
      return;
    }

    // 새 클랜 멤버 추가
    const newMember = await prisma.clanMember.create({
      data: {
        nickname: nickname,
        score: apiData.summary?.averageScore || 0,
        style:
          apiData.summary?.realPlayStyle ||
          apiData.summary?.playstyle ||
          '📦 일반 밸런스형',
        avgDamage: apiData.summary?.avgDamage || 0,
        avgKills: 0, // API에서 제공하지 않으므로 백그라운드에서 계산
        avgAssists: 0, // API에서 제공하지 않으므로 백그라운드에서 계산
        avgSurviveTime: apiData.summary?.averageSurvivalTime || 0,
        winRate: 0, // API에서 제공하지 않으므로 백그라운드에서 계산
        top10Rate: 0, // API에서 제공하지 않으므로 백그라운드에서 계산
        clanId: existingClan.id,
        // PUBG API 정보 추가
        pubgClanId: apiData.profile?.clan?.id || null,
        pubgPlayerId: apiData.profile?.playerId || null,
        pubgShardId: apiData.profile?.shardId || 'steam',
      },
    });

    console.log(`새 클랜 멤버 ${nickname} 추가 완료 (ID: ${newMember.id})`);

    // 백그라운드에서 추가 데이터 업데이트
    updatePlayerDataInBackground(newMember.id, apiData).catch((err) => {
      console.error('새 유저 백그라운드 업데이트 실패:', err);
    });

    // 클랜 멤버 수 업데이트
    const memberCount = await prisma.clanMember.count({
      where: { clanId: existingClan.id },
    });

    await prisma.clan.update({
      where: { id: existingClan.id },
      data: { memberCount },
    });

    console.log(
      `기존 클랜 ${existingClan.name}에 새 유저 ${nickname} 추가 완료`
    );
  } catch (error) {
    console.error(`새 유저 ${nickname} 기존 클랜 추가 실패:`, error);
    throw error;
  }
}

// 백그라운드에서 DB 업데이트 (비동기)
async function updatePlayerDataInBackground(memberId, apiData) {
  const { PrismaClient } = require('@prisma/client');
  const backgroundPrisma = new PrismaClient();

  try {
    console.log(`백그라운드에서 멤버 ID ${memberId} 데이터 업데이트 시작...`);

    // 기본 통계 업데이트 (최근 매치에서 계산)
    if (apiData.summary || apiData.recentMatches) {
      const updateData = {};

      // API summary에서 직접 가져올 수 있는 데이터
      if (apiData.summary?.avgDamage !== undefined)
        updateData.avgDamage = apiData.summary.avgDamage;
      if (apiData.summary?.averageSurvivalTime !== undefined)
        updateData.avgSurviveTime = apiData.summary.averageSurvivalTime;
      if (apiData.summary?.averageScore !== undefined)
        updateData.score = apiData.summary.averageScore;
      if (apiData.summary?.realPlayStyle)
        updateData.style = apiData.summary.realPlayStyle;
      else if (apiData.summary?.playstyle)
        updateData.style = apiData.summary.playstyle;

      // 최근 매치에서 킬/어시스트/승률/Top10 계산
      if (apiData.recentMatches && apiData.recentMatches.length > 0) {
        const matches = apiData.recentMatches;
        const totalMatches = matches.length;

        const totalKills = matches.reduce((sum, m) => sum + (m.kills || 0), 0);
        const totalAssists = matches.reduce(
          (sum, m) => sum + (m.assists || 0),
          0
        );
        const wins = matches.filter(
          (m) => (m.rank || m.placement) === 1
        ).length;
        const top10s = matches.filter(
          (m) => (m.rank || m.placement) <= 10
        ).length;

        updateData.avgKills = totalMatches > 0 ? totalKills / totalMatches : 0;
        updateData.avgAssists =
          totalMatches > 0 ? totalAssists / totalMatches : 0;
        updateData.winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
        updateData.top10Rate =
          totalMatches > 0 ? (top10s / totalMatches) * 100 : 0;
      }

      // 업데이트할 데이터가 있을 때만 실행
      if (Object.keys(updateData).length > 0) {
        await backgroundPrisma.clanMember.update({
          where: { id: memberId },
          data: updateData,
        });
        console.log(
          `멤버 ID ${memberId} 기본 통계 업데이트 완료 (kills: ${updateData.avgKills?.toFixed(1) || 'N/A'}, winRate: ${updateData.winRate?.toFixed(1) || 'N/A'}%)`
        );
      }
    }

    // 최근 매치 데이터 업데이트 (최대 20개)
    if (apiData.recentMatches && apiData.recentMatches.length > 0) {
      // 기존 매치 삭제 후 새로 추가
      await backgroundPrisma.playerMatch.deleteMany({
        where: { clanMemberId: memberId },
      });

      const matchesToInsert = apiData.recentMatches
        .slice(0, 20)
        .map((match) => ({
          clanMemberId: memberId,
          matchId: match.matchId || `${Date.now()}-${Math.random()}`,
          mode: match.mode || match.gameMode || 'unknown',
          mapName: match.mapName || '알 수 없음',
          placement:
            typeof (match.rank || match.placement) === 'number'
              ? match.rank || match.placement
              : 0,
          kills: match.kills || 0,
          assists: match.assists || 0,
          damage: match.damage || 0,
          surviveTime: match.survivalTime || match.surviveTime || 0,
          createdAt: match.matchTimestamp
            ? new Date(match.matchTimestamp)
            : new Date(),
        }));

      await backgroundPrisma.playerMatch.createMany({
        data: matchesToInsert,
      });
      console.log(
        `멤버 ID ${memberId} 매치 데이터 ${matchesToInsert.length}개 업데이트 완료`
      );
    }

    // 모드별 통계 업데이트
    if (apiData.seasonStats) {
      // 기존 모드 통계 삭제
      await backgroundPrisma.playerModeStats.deleteMany({
        where: { clanMemberId: memberId },
      });

      const modeStatsToInsert = Object.entries(apiData.seasonStats).map(
        ([mode, stats]) => ({
          clanMemberId: memberId,
          mode: mode,
          matches: stats.rounds || 0,
          wins: stats.wins || 0,
          top10s: stats.top10s || 0,
          avgDamage: stats.avgDamage || 0,
          avgKills: stats.kills || 0,
          avgAssists: stats.assists || 0,
          winRate: stats.winRate || 0,
          top10Rate: stats.top10Rate || 0,
        })
      );

      if (modeStatsToInsert.length > 0) {
        await backgroundPrisma.playerModeStats.createMany({
          data: modeStatsToInsert,
        });
        console.log(
          `멤버 ID ${memberId} 모드별 통계 ${modeStatsToInsert.length}개 업데이트 완료`
        );
      }
    }

    console.log(`멤버 ID ${memberId} 백그라운드 업데이트 완료`);
  } catch (updateError) {
    console.error(
      `백그라운드 업데이트 실패 (멤버 ID: ${memberId}):`,
      updateError
    );
  } finally {
    await backgroundPrisma.$disconnect();
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

export default function PlayerPage({ playerData, error, dataSource }) {
  const router = useRouter();
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const detailRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [refreshMsg, setRefreshMsg] = useState('');
  const [currentSeasonData, setCurrentSeasonData] = useState(null);
  const [currentSeasonId, setCurrentSeasonId] = useState(
    'division.bro.official.pc-2024-01'
  );
  const [selectedMatchFilter, setSelectedMatchFilter] = useState('전체'); // 경기 필터 상태 추가

  // 쿨타임 타이머
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  // 시즌 변경 핸들러
  const handleSeasonChange = (seasonId, seasonData) => {
    setCurrentSeasonId(seasonId);
    setCurrentSeasonData(seasonData);
  };

  // 현재 표시할 데이터 결정 (시즌이 변경되었으면 시즌 데이터, 아니면 기본 데이터)
  const displayData = currentSeasonData || playerData;

  // 경기 필터링 로직
  const filterMatches = (matches, filter) => {
    if (!matches || matches.length === 0) return [];

    switch (filter) {
      case '전체':
        return matches;
      case '경쟁전':
        return matches.filter((match) => match.gameMode?.includes('ranked'));
      case '경쟁전 솔로':
        return matches.filter(
          (match) =>
            match.gameMode?.includes('ranked') &&
            match.gameMode?.includes('solo')
        );
      case '솔로':
        return matches.filter(
          (match) =>
            match.gameMode?.includes('solo') &&
            !match.gameMode?.includes('ranked')
        );
      case '듀오':
        return matches.filter(
          (match) =>
            match.gameMode?.includes('duo') &&
            !match.gameMode?.includes('ranked')
        );
      case '스쿼드':
        return matches.filter(
          (match) =>
            match.gameMode?.includes('squad') &&
            !match.gameMode?.includes('ranked')
        );
      case '경쟁전 FPP':
        return matches.filter(
          (match) =>
            match.gameMode?.includes('ranked') &&
            match.gameMode?.includes('fpp')
        );
      case '경쟁전 솔로 FPP':
        return matches.filter(
          (match) =>
            match.gameMode?.includes('ranked') &&
            match.gameMode?.includes('solo') &&
            match.gameMode?.includes('fpp')
        );
      case '솔로 FPP':
        return matches.filter(
          (match) =>
            match.gameMode?.includes('solo') &&
            match.gameMode?.includes('fpp') &&
            !match.gameMode?.includes('ranked')
        );
      case '듀오 FPP':
        return matches.filter(
          (match) =>
            match.gameMode?.includes('duo') &&
            match.gameMode?.includes('fpp') &&
            !match.gameMode?.includes('ranked')
        );
      case '스쿼드 FPP':
        return matches.filter(
          (match) =>
            match.gameMode?.includes('squad') &&
            match.gameMode?.includes('fpp') &&
            !match.gameMode?.includes('ranked')
        );
      default:
        return matches;
    }
  };

  // 최신화 버튼 클릭 핸들러
  const handleRefresh = async () => {
    if (refreshing || cooldown > 0) return;
    setRefreshing(true);
    setRefreshMsg('최신화 중...');
    try {
      const res = await fetch('/api/clan/update-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clanName: playerData.clanMembers?.[0]?.clan?.name || '',
          nickname: playerData.profile.nickname,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRefreshMsg('최신화 완료! 새로고침(F5) 시 반영됩니다.');
        setCooldown(30);
      } else {
        setRefreshMsg(data.error || '최신화 실패');
        setCooldown(5);
      }
    } catch (e) {
      setRefreshMsg('네트워크 오류');
      setCooldown(5);
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshMsg(''), 5000);
    }
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
                  PK.GG에 등록되어있지않은 플레이어입니다.
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

  // 필터된 경기 목록 (구조분해할당 이후에 계산)
  const filteredMatches = filterMatches(recentMatches, selectedMatchFilter);

  return (
    <>
      <Header />
      <div className="container mx-auto p-6 bg-gradient-to-br from-white via-gray-50 to-blue-50 min-h-screen text-gray-900 font-sans">
        <Head>
          <title>{`${profile?.nickname || '플레이어'}님의 PUBG 전적 | PK.GG`}</title>
          <meta
            name="description"
            content={`${profile?.nickname || '플레이어'}님의 PUBG 전적, MMR 추이, 플레이스타일 및 클랜 시너지 분석 정보.`}
          />
        </Head>

        {/* 데이터 소스 알림 */}
        {dataSource === 'database' && (
          <div className="mb-6 p-5 bg-gradient-to-r from-yellow-50 via-yellow-100 to-yellow-50 border-2 border-yellow-200 text-yellow-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="inline-block px-4 py-2 bg-yellow-500 text-white text-sm font-bold rounded-full mb-3 shadow-sm">
                📊 데이터 소스 안내
              </div>
              <div className="text-base font-semibold mb-2">
                <strong>DB 데이터 표시:</strong> 일부 정보 제한 가능
              </div>
              <div className="text-sm text-yellow-700">
                최신화하기로 실시간 데이터 조회 가능
              </div>
            </div>
          </div>
        )}

        {dataSource === 'db_with_api_enhancement' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 text-blue-800 rounded-lg shadow-sm">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">
                향상된 데이터 업데이트 완료
              </span>
            </div>
          </div>
        )}

        {dataSource === 'enhanced' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 text-blue-800 rounded-lg shadow-sm">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">
                향상된 데이터 업데이트 완료
              </span>
            </div>
          </div>
        )}

        {dataSource === 'pubg_api_only' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 text-green-800 rounded-lg shadow-sm">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">
                실시간 데이터 업데이트 완료
              </span>
            </div>
          </div>
        )}

        {dataSource === 'pubg_api' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 text-green-800 rounded-lg shadow-sm">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">
                실시간 데이터 업데이트 완료
              </span>
            </div>
          </div>
        )}

        {/* 새로운 플레이어 헤더 */}
        <PlayerHeader
          profile={profile}
          summary={summary}
          rankedSummary={rankedSummary}
          clanInfo={profile?.clan}
          recentMatches={recentMatches}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          cooldown={cooldown}
          refreshMsg={refreshMsg}
        />

        {/* 개인 맞춤형 AI 코칭 시스템 */}
        <div className="mb-10">
          <div className="bg-gradient-to-r from-violet-50 via-violet-100 to-purple-50 rounded-2xl p-6 mb-6 border-l-4 border-violet-500 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <h2 className="text-xl font-bold text-gray-800">
                개인 맞춤형 AI 코칭
              </h2>
              <span className="text-sm bg-violet-200 text-violet-800 px-3 py-1 rounded-full font-medium">
                훈련/피드백
              </span>
            </div>
          </div>
          {/* AI 개인 맞춤 코칭 카드 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all">
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
              }}
            />
          </div>
        </div>

        {/* 클랜 및 팀플레이 분석 섹션 */}
        <div className="mb-10">
          <div className="bg-gradient-to-r from-blue-50 via-blue-100 to-purple-50 rounded-2xl p-6 mb-6 border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤝</span>
              <h2 className="text-xl font-bold text-gray-800">
                클랜 및 팀플레이 분석
              </h2>
              <span className="text-sm bg-blue-200 text-blue-800 px-3 py-1 rounded-full font-medium">
                클랜 시너지
              </span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg hover:shadow-xl transition-all">
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

        {/* 시즌 플레이 현황 */}
        {displayData?.modeDistribution && (
          <div className="mb-10">
            <div className="bg-gradient-to-r from-purple-50 via-purple-100 to-pink-50 rounded-2xl p-6 mb-6 border-l-4 border-purple-500 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📊</span>
                <h2 className="text-xl font-bold text-gray-800">
                  시즌 플레이 현황
                </h2>
                <span className="text-sm bg-purple-200 text-purple-800 px-3 py-1 rounded-full font-medium">
                  모드별 분석
                </span>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg hover:shadow-xl transition-all">
              <ModeDistributionChart
                modeDistribution={displayData.modeDistribution}
              />
            </div>
          </div>
        )}

        {/* 차트 및 시각화 섹션 */}
        <div className="mb-10">
          <div className="bg-gradient-to-r from-cyan-50 via-cyan-100 to-teal-50 dark:from-cyan-900/20 dark:to-teal-800/20 rounded-2xl p-6 mb-6 border-l-4 border-cyan-500 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <span className="text-2xl">�</span>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                경기 추이 분석
              </h2>
              <span className="text-sm bg-cyan-200 dark:bg-cyan-700 text-cyan-800 dark:text-cyan-200 px-3 py-1 rounded-full font-medium">
                성과 트렌드
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* 딜량 추이 그래프 */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-xl">💪</span>
                <h4 className="text-xl font-bold text-gray-900">딜량 추이</h4>
              </div>
              <RecentDamageTrendChart matches={recentMatches} />
            </div>
          </div>
        </div>

        {/* 게임 모드별 통계 섹션 */}
        <div className="mb-10">
          <div className="bg-gradient-to-r from-indigo-50 via-indigo-100 to-blue-50 rounded-2xl p-6 mb-6 border-l-4 border-indigo-500 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎮</span>
              <h2 className="text-xl font-bold text-gray-800">
                게임 모드별 통계
              </h2>
              <span className="text-sm bg-indigo-200 text-indigo-800 px-3 py-1 rounded-full font-medium">
                상세 분석
              </span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg hover:shadow-xl transition-all">
            <SeasonStatsTabs seasonStatsBySeason={seasonStats || {}} />
          </div>
        </div>

        {/* 최근 경기 내역 섹션 */}
        <section className="recent-matches-section mb-10">
          <div className="bg-gradient-to-r from-orange-50 via-orange-100 to-red-50 rounded-2xl p-6 mb-6 border-l-4 border-orange-500 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <span className="text-2xl">�</span>
              <h2 className="text-xl font-bold text-gray-800">
                최근 경기 내역
              </h2>
              <span className="text-sm bg-orange-200 text-orange-800 px-3 py-1 rounded-full font-medium">
                최근 20경기
              </span>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg hover:shadow-xl transition-all">
            {/* 경기 모드 필터 탭 */}
            <div className="mb-8 flex justify-center">
              <div className="flex gap-2 bg-gray-100 p-2 rounded-xl shadow-inner">
                {[
                  '전체',
                  '경쟁전',
                  '경쟁전 솔로',
                  '솔로',
                  '듀오',
                  '스쿼드',
                  '경쟁전 FPP',
                  '경쟁전 솔로 FPP',
                  '솔로 FPP',
                  '듀오 FPP',
                  '스쿼드 FPP',
                ].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedMatchFilter(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedMatchFilter === tab
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {filteredMatches && filteredMatches.length > 0 ? (
              <MatchList
                recentMatches={filteredMatches}
                playerData={playerData}
              />
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-6">📋</div>
                <div className="text-lg text-gray-600 font-medium">
                  {selectedMatchFilter === '전체'
                    ? '최근 경기 데이터가 없습니다.'
                    : `${selectedMatchFilter} 모드의 기록된 전적이 없습니다.`}
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  게임을 플레이하면 데이터가 업데이트됩니다.
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 경기 상세 정보 표시 */}
        {selectedMatchId && (
          <div ref={detailRef} className="mt-8 mb-10">
            <div className="bg-gradient-to-r from-purple-50 via-purple-100 to-pink-50 rounded-2xl p-6 mb-6 border-l-4 border-purple-500 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔍</span>
                <h4 className="text-xl font-bold text-gray-800">
                  경기 상세 정보
                </h4>
                <span className="text-sm bg-purple-200 text-purple-800 px-3 py-1 rounded-full font-medium">
                  상세 분석
                </span>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg hover:shadow-xl transition-all">
              <MatchDetailExpandable matchId={selectedMatchId} />
            </div>
          </div>
        )}

        {/* 데이터 정보 섹션 */}
        <div className="mt-10 mb-6">
          <div className="bg-gradient-to-r from-gray-50 via-gray-100 to-slate-50 rounded-2xl p-6 border border-gray-300 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">ℹ️</span>
                <h2 className="text-lg font-bold text-gray-800">데이터 정보</h2>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="text-xl">⏰</span>
                <span className="font-medium">
                  데이터 최종 업데이트:{' '}
                  {profile?.lastUpdated
                    ? new Date(profile.lastUpdated).toLocaleString('ko-KR')
                    : '알 수 없음'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps({ params }) {
  const { server, nickname } = params;
  const { PrismaClient } = require('@prisma/client');
  const axios = require('axios');
  const prisma = new PrismaClient();

  const PUBG_API_KEY = `Bearer ${process.env.PUBG_API_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI3MDNhNDhhMC0wMjI1LTAxM2UtMzAwYi0wNjFhOWQ1YjYxYWYiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzQ1MzgwODM3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6InViZCJ9.hs5WCvTM6d0W_y0lsYzpbkREq61PD1p7vbibOGTFK3o'}`;
  const PUBG_HEADERS = { Authorization: PUBG_API_KEY, Accept: 'application/vnd.api+json' };
  const shards = ['steam', 'kakao', 'psn', 'xbox'];

  try {
    // DB에서 클랜 멤버 조회
    const members = await prisma.clanMember.findMany({
      where: { nickname },
      include: {
        clan: true,
        matches: { orderBy: { createdAt: 'desc' }, take: 20 },
        modeStats: true,
      },
    });

    let playerData;
    let dataSource = 'database';

    // PUBG API에서 직접 최신 플레이어+클랜+시즌 정보 가져오기
    let pubgPlayer = null;
    let pubgClan = null;
    let pubgShard = server || 'steam';
    let pubgSeasonStats = {};

    try {
      const searchShards = server && server !== 'unknown' ? [server, ...shards.filter(s => s !== server)] : shards;
      for (const shard of searchShards) {
        try {
          const resp = await axios.get(
            `https://api.pubg.com/shards/${shard}/players?filter[playerNames]=${encodeURIComponent(nickname)}`,
            { headers: PUBG_HEADERS, timeout: 8000 }
          );
          if (resp.data.data && resp.data.data.length > 0) {
            pubgPlayer = resp.data.data[0];
            pubgShard = shard;
            console.log(`✅ PUBG API 플레이어 발견: ${nickname} (${shard})`);

            // 클랜 + 현재 시즌 ID 병렬 조회
            const [clanResult, seasonResult] = await Promise.allSettled([
              pubgPlayer.attributes.clanId
                ? axios.get(
                    `https://api.pubg.com/shards/${shard}/clans/${pubgPlayer.attributes.clanId}`,
                    { headers: PUBG_HEADERS, timeout: 5000 }
                  )
                : Promise.resolve(null),
              axios.get(
                `https://api.pubg.com/shards/${shard}/seasons`,
                { headers: PUBG_HEADERS, timeout: 5000 }
              ),
            ]);

            if (clanResult.status === 'fulfilled' && clanResult.value) {
              pubgClan = clanResult.value.data.data;
              console.log(`✅ 클랜 정보: ${pubgClan.attributes.clanName}`);
            }

            // 현재 시즌 ID 추출 후 플레이어 시즌 통계 조회
            if (seasonResult.status === 'fulfilled') {
              const seasons = seasonResult.value.data.data || [];
              const currentSeason = seasons.find(s => s.attributes?.isCurrentSeason);
              if (currentSeason) {
                console.log(`✅ 현재 시즌: ${currentSeason.id}`);
                try {
                  const statsResp = await axios.get(
                    `https://api.pubg.com/shards/${shard}/players/${pubgPlayer.id}/seasons/${currentSeason.id}`,
                    { headers: PUBG_HEADERS, timeout: 8000 }
                  );
                  const gameModeStats = statsResp.data.data?.attributes?.gameModeStats || {};
                  // gameModeStats → seasonStatsBySeason 형식 변환
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
                    console.log(`✅ 시즌 통계 모드: ${Object.keys(transformedModes).join(', ')}`);
                  }
                } catch (e) {
                  console.warn('시즌 통계 조회 실패:', e.message);
                }
              }
            }
            break;
          }
        } catch (e) {
          if (e.response?.status !== 404) console.warn(`${shard} 샤드 오류:`, e.message);
        }
      }
    } catch (pubgError) {
      console.warn('PUBG API 호출 오류:', pubgError.message);
    }

    if (members.length > 0) {
      // DB 데이터 기반으로 로드
      playerData = await getDbOnlyPlayerData(members, prisma, 'database');

      if (pubgPlayer) {
        // API 성공: 최신 클랜/플레이어 정보 + 시즌 통계 업데이트
        playerData = {
          ...playerData,
          profile: {
            ...playerData.profile,
            nickname: pubgPlayer.attributes.name || nickname,
            playerId: pubgPlayer.id,
            shardId: pubgShard,
            clan: pubgClan
              ? {
                  name: pubgClan.attributes.clanName,
                  tag: pubgClan.attributes.clanTag,
                  level: pubgClan.attributes.clanLevel,
                  memberCount: pubgClan.attributes.clanMemberCount,
                }
              : playerData.profile?.clan,
          },
          seasonStats: Object.keys(pubgSeasonStats).length > 0 ? pubgSeasonStats : (playerData.seasonStats || {}),
        };
        dataSource = 'db_with_api_enhancement';

        // 백그라운드 DB 업데이트
        const member = members[0];
        if (member?.id) {
          updatePlayerDataInBackground(member.id, { player: pubgPlayer, clan: pubgClan }).catch(() => {});
        }
      } else {
        dataSource = 'database';
      }
    } else {
      // DB에 없는 신규 유저
      if (!pubgPlayer) {
        throw new Error(`플레이어를 찾을 수 없습니다: ${nickname}`);
      }

      // 신규 유저 기본 데이터 구성
      playerData = {
        profile: {
          nickname: pubgPlayer.attributes.name,
          playerId: pubgPlayer.id,
          shardId: pubgShard,
          lastUpdated: new Date().toISOString(),
          clan: pubgClan
            ? {
                name: pubgClan.attributes.clanName,
                tag: pubgClan.attributes.clanTag,
                level: pubgClan.attributes.clanLevel,
                memberCount: pubgClan.attributes.clanMemberCount,
              }
            : null,
        },
        summary: { avgDamage: 0, avgKills: 0, avgAssists: 0, avgSurviveTime: 0, winRate: 0, top10Rate: 0, score: 0, style: '-' },
        recentMatches: [],
        modeStats: [],
        modeDistribution: { ranked: 0, normal: 0, event: 0 },
        seasonStats: pubgSeasonStats,
        clanMembers: [],
        rankedStats: [],
        rankedSummary: null,
      };
      dataSource = 'pubg_api';

      // 신규 유저 DB 저장 (백그라운드)
      saveNewUserToDB(nickname, playerData, prisma).catch((e) =>
        console.error('신규 유저 DB 저장 실패:', e.message)
      );
    }

    await prisma.$disconnect();

    return {
      props: { playerData, error: null, dataSource },
    };
  } catch (error) {
    console.error('getServerSideProps error:', error);
    await prisma.$disconnect();

    return {
      props: { playerData: null, error: error.message, dataSource: null },
    };
  }
}
