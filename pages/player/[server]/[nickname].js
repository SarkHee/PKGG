import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

import PlayerDashboard from '../../../components/PlayerDashboard';
import ModeDistributionChart from '../../../components/ModeDistributionChart';
import RecentDamageTrendChart from '../../../components/RecentDamageTrendChart.jsx';
import MatchListRow from '../../../components/MatchListRow';
import SeasonStatsTabs from '../../../components/SeasonStatsTabs.jsx';
import RankDistributionChart from '../../../components/RankDistributionChart.jsx';
import SynergyHeatmap from '../../../components/SynergyHeatmap.jsx';
import Header from '../../../components/Header.jsx';
import EnhancedPlayerStats from '../../../components/EnhancedPlayerStats.jsx';
import PlayerHeader from '../../../components/PlayerHeader.jsx';
import MatchDetailExpandable from '../../../components/MatchDetailExpandable.jsx';

// 반드시 export default 함수 바깥에 위치!
function MatchList({ recentMatches }) {
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
    take: 20
  });
  
  // 모드별 통계
  const modeStatsArr = await prisma.playerModeStats.findMany({
    where: { clanMemberId: member.id }
  });
  
  // 모드 비율(최근 20경기)
  const modeCount = { ranked: 0, normal: 0, event: 0 };
  (matches || []).forEach(m => {
    if (m.mode?.includes('ranked')) modeCount.ranked++;
    else if (m.mode?.includes('event')) modeCount.event++;
    else modeCount.normal++;
  });
  const total = (matches && matches.length) ? matches.length : 1;
  const modeDistribution = {
    ranked: Math.round((modeCount.ranked / total) * 100),
    normal: Math.round((modeCount.normal / total) * 100),
    event: Math.round((modeCount.event / total) * 100)
  };
  
  const playerData = {
    profile: {
      nickname: member.nickname,
      lastUpdated: new Date().toISOString(), // 현재 시간으로 설정
      clan: member.clan ? { 
        name: member.clan.name,
        tag: member.clan.pubgClanTag || member.clan.tag,
        level: member.clan.pubgClanLevel,
        memberCount: member.clan.pubgMemberCount || member.clan.memberCount,
        description: member.clan.description
      } : null
    },
    summary: {
      avgDamage: member.avgDamage ?? 0,
      avgKills: member.avgKills ?? 0,
      avgAssists: member.avgAssists ?? 0,
      avgSurviveTime: member.avgSurviveTime ?? 0,
      winRate: member.winRate ?? 0,
      top10Rate: member.top10Rate ?? 0,
      score: member.score ?? 0,
      style: member.style ?? '-'
    },
    recentMatches: (matches || []).map(m => ({
      matchId: m.matchId,
      mode: m.mode,
      mapName: m.mapName,
      placement: m.placement,
      kills: m.kills,
      assists: m.assists,
      damage: m.damage,
      surviveTime: m.surviveTime,
      matchTimestamp: m.createdAt ? m.createdAt.toISOString() : new Date().toISOString()
    })),
    modeStats: modeStatsArr || [],
    modeDistribution,
    clanMembers: (members || []).map(m => ({
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
      clan: m.clan ? {
        id: m.clan.id,
        name: m.clan.name,
        leader: m.clan.leader,
        description: m.clan.description,
        memberCount: m.clan.memberCount
      } : null
    })),
    // DB에서 랭크 정보가 없으므로 기본값을 설정하되, API 호출이 가능하면 실시간으로 가져오도록 함
    rankedStats: [
      { mode: "squad-fpp", tier: "Unranked", rp: 0, kd: 0, avgDamage: 0, winRate: 0, survivalTime: 0, rounds: 0 },
      { mode: "squad", tier: "Unranked", rp: 0, kd: 0, avgDamage: 0, winRate: 0, survivalTime: 0, rounds: 0 }, 
      { mode: "duo-fpp", tier: "Unranked", rp: 0, kd: 0, avgDamage: 0, winRate: 0, survivalTime: 0, rounds: 0 },
      { mode: "solo-fpp", tier: "Unranked", rp: 0, kd: 0, avgDamage: 0, winRate: 0, survivalTime: 0, rounds: 0 }
    ],
    rankedSummary: {
      mode: "squad-fpp",
      tier: "Unranked", 
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
      survivalTime: 0
    }
  };
  
  return playerData;
}

// PUBG API 데이터로 새 클랜 생성하는 함수
async function createNewClanFromApi(clanData, prisma) {
  try {
    console.log(`새 클랜 생성 시작: ${clanData.name} (ID: ${clanData.id})`);
    
    // 이미 해당 PUBG 클랜 ID가 있는지 확인
    const existingClan = await prisma.clan.findUnique({
      where: { pubgClanId: clanData.id }
    });

    if (existingClan) {
      console.log(`클랜 ${clanData.name}은 이미 존재함 (DB ID: ${existingClan.id})`);
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
        isKorean: false    // 나중에 멤버 분석으로 결정
      }
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
          OR: [
            { pubgClanId: clanData.id },
            { name: clanData.name }
          ]
        }
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
          isKorean: false
        }
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
async function addNewUserToExistingClan(nickname, apiData, existingClan, prisma) {
  try {
    console.log(`기존 클랜 ${existingClan.name}에 새 유저 ${nickname} 추가 시작...`);
    
    // 이미 해당 클랜에 같은 닉네임이 있는지 확인
    const existingMember = await prisma.clanMember.findFirst({
      where: {
        nickname: nickname,
        clanId: existingClan.id
      }
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
        style: apiData.summary?.realPlayStyle || apiData.summary?.playstyle || '📦 일반 밸런스형',
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
        pubgShardId: apiData.profile?.shardId || 'steam'
      }
    });

    console.log(`새 클랜 멤버 ${nickname} 추가 완료 (ID: ${newMember.id})`);

    // 백그라운드에서 추가 데이터 업데이트
    updatePlayerDataInBackground(newMember.id, apiData).catch(err => {
      console.error('새 유저 백그라운드 업데이트 실패:', err);
    });

    // 클랜 멤버 수 업데이트
    const memberCount = await prisma.clanMember.count({
      where: { clanId: existingClan.id }
    });
    
    await prisma.clan.update({
      where: { id: existingClan.id },
      data: { memberCount }
    });

    console.log(`기존 클랜 ${existingClan.name}에 새 유저 ${nickname} 추가 완료`);
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
      if (apiData.summary?.avgDamage !== undefined) updateData.avgDamage = apiData.summary.avgDamage;
      if (apiData.summary?.averageSurvivalTime !== undefined) updateData.avgSurviveTime = apiData.summary.averageSurvivalTime;
      if (apiData.summary?.averageScore !== undefined) updateData.score = apiData.summary.averageScore;
      if (apiData.summary?.realPlayStyle) updateData.style = apiData.summary.realPlayStyle;
      else if (apiData.summary?.playstyle) updateData.style = apiData.summary.playstyle;

      // 최근 매치에서 킬/어시스트/승률/Top10 계산
      if (apiData.recentMatches && apiData.recentMatches.length > 0) {
        const matches = apiData.recentMatches;
        const totalMatches = matches.length;
        
        const totalKills = matches.reduce((sum, m) => sum + (m.kills || 0), 0);
        const totalAssists = matches.reduce((sum, m) => sum + (m.assists || 0), 0);
        const wins = matches.filter(m => (m.rank || m.placement) === 1).length;
        const top10s = matches.filter(m => (m.rank || m.placement) <= 10).length;

        updateData.avgKills = totalMatches > 0 ? totalKills / totalMatches : 0;
        updateData.avgAssists = totalMatches > 0 ? totalAssists / totalMatches : 0;
        updateData.winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
        updateData.top10Rate = totalMatches > 0 ? (top10s / totalMatches) * 100 : 0;
      }

      // 업데이트할 데이터가 있을 때만 실행
      if (Object.keys(updateData).length > 0) {
        await backgroundPrisma.clanMember.update({
          where: { id: memberId },
          data: updateData
        });
        console.log(`멤버 ID ${memberId} 기본 통계 업데이트 완료 (kills: ${updateData.avgKills?.toFixed(2) || 'N/A'}, winRate: ${updateData.winRate?.toFixed(1) || 'N/A'}%)`);
      }
    }

    // 최근 매치 데이터 업데이트 (최대 20개)
    if (apiData.recentMatches && apiData.recentMatches.length > 0) {
      // 기존 매치 삭제 후 새로 추가
      await backgroundPrisma.playerMatch.deleteMany({
        where: { clanMemberId: memberId }
      });

      const matchesToInsert = apiData.recentMatches.slice(0, 20).map(match => ({
        clanMemberId: memberId,
        matchId: match.matchId || `${Date.now()}-${Math.random()}`,
        mode: match.mode || match.gameMode || 'unknown',
        mapName: match.mapName || '알 수 없음',
        placement: typeof (match.rank || match.placement) === 'number' ? 
          (match.rank || match.placement) : 0,
        kills: match.kills || 0,
        assists: match.assists || 0,
        damage: match.damage || 0,
        surviveTime: match.survivalTime || match.surviveTime || 0,
        createdAt: match.matchTimestamp ? new Date(match.matchTimestamp) : new Date()
      }));

      await backgroundPrisma.playerMatch.createMany({
        data: matchesToInsert
      });
      console.log(`멤버 ID ${memberId} 매치 데이터 ${matchesToInsert.length}개 업데이트 완료`);
    }

    // 모드별 통계 업데이트
    if (apiData.seasonStats) {
      // 기존 모드 통계 삭제
      await backgroundPrisma.playerModeStats.deleteMany({
        where: { clanMemberId: memberId }
      });

      const modeStatsToInsert = Object.entries(apiData.seasonStats).map(([mode, stats]) => ({
        clanMemberId: memberId,
        mode: mode,
        matches: stats.rounds || 0,
        wins: stats.wins || 0,
        top10s: stats.top10s || 0,
        avgDamage: stats.avgDamage || 0,
        avgKills: stats.kills || 0,
        avgAssists: stats.assists || 0,
        winRate: stats.winRate || 0,
        top10Rate: stats.top10Rate || 0
      }));

      if (modeStatsToInsert.length > 0) {
        await backgroundPrisma.playerModeStats.createMany({
          data: modeStatsToInsert
        });
        console.log(`멤버 ID ${memberId} 모드별 통계 ${modeStatsToInsert.length}개 업데이트 완료`);
      }
    }

    console.log(`멤버 ID ${memberId} 백그라운드 업데이트 완료`);
  } catch (updateError) {
    console.error(`백그라운드 업데이트 실패 (멤버 ID: ${memberId}):`, updateError);
  } finally {
    await backgroundPrisma.$disconnect();
  }
}

function ModeStatsTabs({ modeStats }) {
  const modeList = Object.keys(modeStats);
  const [selectedMode, setSelectedMode] = useState(modeList[0]);
  const stats = modeStats[selectedMode];
  if (!modeList.length) return <p className="text-gray-500 dark:text-gray-400">현재 시즌 통계 데이터를 불러올 수 없습니다.</p>;
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {modeList.map(mode => (
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
            <li>총 라운드: <span className="font-medium">{stats.rounds}</span></li>
            <li>승리: <span className="font-medium">{stats.wins}</span></li>
            <li>Top 10: <span className="font-medium">{stats.top10s}</span></li>
            <li>K/D: <span className="font-medium">{stats.kd}</span></li>
            <li>평균 딜량: <span className="font-medium">{stats.avgDamage}</span></li>
            <li>승률: <span className="font-medium">{stats.winRate}%</span></li>
            <li>Top 10 비율: <span className="font-medium">{stats.top10Rate}%</span></li>
            <li>헤드샷 비율: <span className="font-medium text-red-600 dark:text-red-400">{stats.headshotRate}%</span></li>
            <li>최장 킬 거리: <span className="font-medium">{stats.longestKill}m</span></li>
            <li>헤드샷 킬: <span className="font-medium">{stats.headshots}</span></li>
            <li>최대 킬: <span className="font-medium">{stats.maxKills}</span></li>
            <li>최대 거리 킬: <span className="font-medium">{stats.maxDistanceKill}m</span></li>
            <li>평균 등수: <span className="font-medium">{stats.avgRank}</span></li>
            <li>평균 생존시간: <span className="font-medium">{stats.avgSurvivalTime}초</span></li>
            <li>평균 어시스트: <span className="font-medium">{stats.avgAssists}</span></li>
            <li>어시스트: <span className="font-medium">{stats.assists}</span></li>
            <li>최대 어시스트: <span className="font-medium">{stats.mostAssists}</span></li>
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
  const [currentSeasonId, setCurrentSeasonId] = useState('division.bro.official.pc-2024-01');
  const [selectedMatchFilter, setSelectedMatchFilter] = useState('전체'); // 경기 필터 상태 추가

  // 쿨타임 타이머
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown(c => c - 1), 1000);
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
        return matches.filter(match => match.gameMode?.includes('ranked'));
      case '경쟁전 솔로':
        return matches.filter(match => match.gameMode?.includes('ranked') && match.gameMode?.includes('solo'));
      case '솔로':
        return matches.filter(match => match.gameMode?.includes('solo') && !match.gameMode?.includes('ranked'));
      case '듀오':
        return matches.filter(match => match.gameMode?.includes('duo') && !match.gameMode?.includes('ranked'));
      case '스쿼드':
        return matches.filter(match => match.gameMode?.includes('squad') && !match.gameMode?.includes('ranked'));
      case '경쟁전 FPP':
        return matches.filter(match => match.gameMode?.includes('ranked') && match.gameMode?.includes('fpp'));
      case '경쟁전 솔로 FPP':
        return matches.filter(match => match.gameMode?.includes('ranked') && match.gameMode?.includes('solo') && match.gameMode?.includes('fpp'));
      case '솔로 FPP':
        return matches.filter(match => match.gameMode?.includes('solo') && match.gameMode?.includes('fpp') && !match.gameMode?.includes('ranked'));
      case '듀오 FPP':
        return matches.filter(match => match.gameMode?.includes('duo') && match.gameMode?.includes('fpp') && !match.gameMode?.includes('ranked'));
      case '스쿼드 FPP':
        return matches.filter(match => match.gameMode?.includes('squad') && match.gameMode?.includes('fpp') && !match.gameMode?.includes('ranked'));
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
        body: JSON.stringify({ clanName: playerData.clanMembers?.[0]?.clan?.name || '', nickname: playerData.profile.nickname })
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
        <div className="container mx-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
          <div className="max-w-2xl mx-auto mt-20">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-lg text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🔍</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  플레이어를 찾을 수 없습니다
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                  PK.GG에 등록되어있지않은 플레이어입니다.
                </p>
                <p className="text-base text-gray-500 dark:text-gray-500">
                  닉네임확인 후 다시 검색해주세요.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">💡 검색 팁</h3>
                  <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 text-left">
                    <li>• 정확한 닉네임을 입력했는지 확인해주세요</li>
                    <li>• 대소문자, 특수문자를 정확히 입력해주세요</li>
                    <li>• 올바른 플랫폼(Steam/Kakao/Console)을 선택했는지 확인해주세요</li>
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
    clanAverage = 0, 
    aboveAvgWithClan = 0, 
    synergyAnalysis = {}, 
    synergyTop = [], 
    clanSynergyStatusList = [], 
    recommendedSquad = [], 
    bestSquad = {}, 
    killMapTelemetryUrl = '', 
    timeActivityGraph = {} 
  } = displayData || {};

  // profile.clan이 객체일 경우 안전하게 문자열로 출력
  const clanName = profile?.clan?.name || (typeof profile?.clan === 'string' ? profile.clan : '');

  // 필터된 경기 목록 (구조분해할당 이후에 계산)
  const filteredMatches = filterMatches(recentMatches, selectedMatchFilter);

  return (
    <>
      <Header />
      <div className="container mx-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen text-gray-900 dark:text-gray-100 font-sans">
        <Head>
          <title>{`${profile?.nickname || '플레이어'}님의 PUBG 전적 | PK.GG`}</title>
          <meta name="description" content={`${profile?.nickname || '플레이어'}님의 PUBG 전적, MMR 추이, 플레이스타일 및 클랜 시너지 분석 정보.`} />
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
          <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50 border-2 border-blue-200 text-blue-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="inline-block px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-full mb-3 shadow-sm">
                🚀 데이터 소스 안내
              </div>
              <div className="text-base font-semibold mb-2">
                <strong>향상된 데이터:</strong> DB + PUBG API 실시간 데이터 조합
              </div>
              <div className="text-sm text-blue-700">
                백그라운드에서 자동 업데이트됩니다
              </div>
            </div>
          </div>
        )}

        {dataSource === 'pubg_api_only' && (
          <div className="mb-6 p-5 bg-gradient-to-r from-green-50 via-green-100 to-green-50 border-2 border-green-200 text-green-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="inline-block px-4 py-2 bg-green-500 text-white text-sm font-bold rounded-full mb-3 shadow-sm">
                ⚡ 데이터 소스 안내
              </div>
              <div className="text-base font-semibold mb-2">
                <strong>실시간 데이터:</strong> PUBG API 최신 정보
              </div>
              <div className="text-sm text-green-700">
                {(() => {
                  const clanInfo = playerData?.profile?.clan;
                  if (clanInfo) {
                    const clanNameStr = typeof clanInfo === 'string' ? clanInfo : clanInfo.name;
                    return clanNameStr ? `${clanNameStr} 클랜 소속` : '클랜 미소속';
                  }
                  return '클랜 미소속';
                })()}
              </div>
            </div>
          </div>
        )}

        {dataSource === 'pubg_api' && (
          <div className="mb-6 p-5 bg-gradient-to-r from-green-50 via-green-100 to-green-50 border-2 border-green-200 text-green-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
              <div className="inline-block px-4 py-2 bg-green-500 text-white text-sm font-bold rounded-full mb-3 shadow-sm">
                🔄 데이터 소스 안내
              </div>
              <div className="text-base font-semibold mb-2">
                <strong>실시간 데이터:</strong> PUBG API 최신 정보 조회됨
              </div>
              <div className="text-sm text-green-700">
                실시간으로 업데이트된 데이터입니다
              </div>
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

      {/* 클랜 및 팀플레이 분석 섹션 */}
      <div className="mb-10">
        <div className="bg-gradient-to-r from-blue-50 via-blue-100 to-purple-50 dark:from-blue-900/20 dark:to-purple-800/20 rounded-2xl p-6 mb-6 border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤝</span>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">클랜 및 팀플레이 분석</h2>
            <span className="text-sm bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full font-medium">클랜 시너지</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all">
          <PlayerDashboard
            profile={profile}
            summary={summary}
            clanAverage={clanAverage}
            clanMembers={clanMembers}
            clanTier={profile?.clanTier}
            synergyTop={synergyTop}
            clanSynergyStatusList={clanSynergyStatusList}
            bestSquad={bestSquad}
            seasonStats={seasonStats}
          />
          
          {/* 클랜원 시너지 히트맵 */}
          <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-600">
            <SynergyHeatmap 
              matches={recentMatches} 
              myNickname={profile?.nickname}
              clanMembers={clanMembers}
              playerClan={clanName}
            />
          </div>
        </div>
      </div>

      {/* 시즌 플레이 현황 */}
      {displayData?.modeDistribution && (
        <div className="mb-10">
          <div className="bg-gradient-to-r from-purple-50 via-purple-100 to-pink-50 dark:from-purple-900/20 dark:to-pink-800/20 rounded-2xl p-6 mb-6 border-l-4 border-purple-500 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">시즌 플레이 현황</h2>
              <span className="text-sm bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full font-medium">모드별 분석</span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all">
            <ModeDistributionChart modeDistribution={displayData.modeDistribution} />
          </div>
        </div>
      )}

      {/* 차트 및 시각화 섹션 */}
      <div className="mb-10">
        <div className="bg-gradient-to-r from-cyan-50 via-cyan-100 to-teal-50 dark:from-cyan-900/20 dark:to-teal-800/20 rounded-2xl p-6 mb-6 border-l-4 border-cyan-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <span className="text-2xl">�</span>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">경기 추이 분석</h2>
            <span className="text-sm bg-cyan-200 dark:bg-cyan-700 text-cyan-800 dark:text-cyan-200 px-3 py-1 rounded-full font-medium">성과 트렌드</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-8">
          {/* 딜량 추이 그래프 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xl">💪</span>
              <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">딜량 추이</h4>
            </div>
            <RecentDamageTrendChart matches={recentMatches} />
          </div>
        </div>
      </div>

      {/* 게임 모드별 통계 섹션 */}
      <div className="mb-10">
        <div className="bg-gradient-to-r from-indigo-50 via-indigo-100 to-blue-50 dark:from-indigo-900/20 dark:to-blue-800/20 rounded-2xl p-6 mb-6 border-l-4 border-indigo-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎮</span>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">게임 모드별 통계</h2>
            <span className="text-sm bg-indigo-200 dark:bg-indigo-700 text-indigo-800 dark:text-indigo-200 px-3 py-1 rounded-full font-medium">상세 분석</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all">
          <SeasonStatsTabs seasonStatsBySeason={seasonStats || {}} />
        </div>
      </div>

      {/* 최근 경기 내역 섹션 */}
      <section className="recent-matches-section mb-10">
        <div className="bg-gradient-to-r from-orange-50 via-orange-100 to-red-50 dark:from-orange-900/20 dark:to-red-800/20 rounded-2xl p-6 mb-6 border-l-4 border-orange-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <span className="text-2xl">�</span>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">최근 경기 내역</h2>
            <span className="text-sm bg-orange-200 dark:bg-orange-700 text-orange-800 dark:text-orange-200 px-3 py-1 rounded-full font-medium">최근 20경기</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all">
          {/* 경기 모드 필터 탭 */}
          <div className="mb-8 flex justify-center">
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-2 rounded-xl shadow-inner">
              {['전체', '경쟁전', '경쟁전 솔로', '솔로', '듀오', '스쿼드', '경쟁전 FPP', '경쟁전 솔로 FPP', '솔로 FPP', '듀오 FPP', '스쿼드 FPP'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedMatchFilter(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedMatchFilter === tab
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          
          {filteredMatches && filteredMatches.length > 0 ? (
            <MatchList recentMatches={filteredMatches} />
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-6">📋</div>
              <div className="text-lg text-gray-500 dark:text-gray-400 font-medium">
                {selectedMatchFilter === '전체' 
                  ? '최근 경기 데이터가 없습니다.' 
                  : `${selectedMatchFilter} 모드의 기록된 전적이 없습니다.`
                }
              </div>
              <div className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                게임을 플레이하면 데이터가 업데이트됩니다.
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 경기 상세 정보 표시 */}
      {selectedMatchId && (
        <div ref={detailRef} className="mt-8 mb-10">
          <div className="bg-gradient-to-r from-purple-50 via-purple-100 to-pink-50 dark:from-purple-900/20 dark:to-pink-800/20 rounded-2xl p-6 mb-6 border-l-4 border-purple-500 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔍</span>
              <h4 className="text-xl font-bold text-gray-800 dark:text-gray-200">경기 상세 정보</h4>
              <span className="text-sm bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full font-medium">상세 분석</span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all">
            <MatchDetailExpandable matchId={selectedMatchId} />
          </div>
        </div>
      )}

      {/* 데이터 정보 섹션 */}
      <div className="mt-10 mb-6">
        <div className="bg-gradient-to-r from-gray-50 via-gray-100 to-slate-50 dark:from-gray-800/50 dark:to-slate-700/50 rounded-2xl p-6 border border-gray-300 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">ℹ️</span>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">데이터 정보</h2>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span className="text-xl">⏰</span>
              <span className="font-medium">
                데이터 최종 업데이트: {profile?.lastUpdated ? new Date(profile.lastUpdated).toLocaleString('ko-KR') : '알 수 없음'}
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
  const prisma = new PrismaClient();

  try {
    // DB에서 클랜 멤버 조회
    const members = await prisma.clanMember.findMany({
      where: { nickname },
      include: {
        clan: true,
        matches: {
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        modeStats: true
      }
    });

    let playerData;
    let dataSource = 'database';

    if (members.length > 0) {
      console.log(`DB에서 ${nickname} 발견, API와 결합하여 데이터 제공`);
      
      try {
        // 내부 API 엔드포인트 직접 호출
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : 'http://localhost:3000';
        
        console.log(`API 호출 시도: ${baseUrl}/api/pubg/${nickname}`);
        const apiResponse = await fetch(`${baseUrl}/api/pubg/${nickname}`);
        
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          console.log('API 호출 성공, 데이터 통합 중...');
          
          // API 데이터와 DB 데이터 통합
          const member = members[0];
          
          playerData = {
            ...apiData,
            profile: {
              ...apiData.profile,
              clan: apiData.profile?.clan || (member?.clan ? { 
                name: member.clan.name,
                tag: member.clan.tag || member.clan.name,
                level: member.clan.level || 1 
              } : null)
            }
          };
          
          dataSource = 'db_with_api_enhancement';
          
          // 백그라운드에서 DB 업데이트
          if (member?.id) {
            updatePlayerDataInBackground(member.id, apiData).catch(err => 
              console.error('백그라운드 업데이트 실패:', err)
            );
          }
        } else {
          const errorData = await apiResponse.json().catch(() => ({}));
          console.log(`API 호출 실패 (${apiResponse.status}): ${errorData.error || 'Unknown error'}, DB 데이터만 사용`);
          playerData = await getDbOnlyPlayerData(members, prisma, 'database');
          dataSource = 'database';
        }
      } catch (apiError) {
        console.log('API 오류, DB 데이터만 사용:', apiError.message);
        playerData = await getDbOnlyPlayerData(members, prisma, 'database');
        dataSource = 'database';
      }
    } else {
      console.log(`DB에 ${nickname} 없음, API 단독 호출`);
      
      try {
        // 내부 API 엔드포인트 직접 호출
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : 'http://localhost:3000';
        
        const apiResponse = await fetch(`${baseUrl}/api/pubg/${nickname}`);
        
        if (!apiResponse.ok) {
          throw new Error(`API call failed: ${apiResponse.status}`);
        }
        
        const apiData = await apiResponse.json();
        playerData = apiData;
        dataSource = 'pubg_api';
        
        // 🚀 새 유저 자동 DB 저장
        try {
          await saveNewUserToDB(nickname, apiData, prisma);
          console.log(`✅ 새 유저 ${nickname} 자동 DB 저장 완료`);
        } catch (saveError) {
          console.error(`❌ 새 유저 ${nickname} DB 저장 실패:`, saveError);
          // DB 저장 실패해도 API 데이터는 정상 반환
        }
        
      } catch (apiError) {
        throw new Error(`플레이어를 찾을 수 없습니다: ${apiError.message}`);
      }
    }

    await prisma.$disconnect();
    
    return {
      props: {
        playerData,
        error: null,
        dataSource
      }
    };
  } catch (error) {
    console.error('getServerSideProps error:', error);
    await prisma.$disconnect();
    
    return {
      props: {
        playerData: null,
        error: error.message,
        dataSource: null
      }
    };
  }
}