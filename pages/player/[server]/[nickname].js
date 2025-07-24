import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

import RankedStatsSection from '../../../components/RankedStatsSection';
import PlayerDashboard from '../../../components/PlayerDashboard';
import MmrTrendChart from '../../../components/MmrTrendChart';
import ModeDistributionChart from '../../../components/ModeDistributionChart';
import RecentDamageTrendChart from '../../../components/RecentDamageTrendChart.jsx';
import MatchListRow from '../../../components/MatchListRow';
import SeasonStatsTabs from '../../../components/SeasonStatsTabs.jsx';
import RankDistributionChart from '../../../components/RankDistributionChart.jsx';
import SynergyHeatmap from '../../../components/SynergyHeatmap.jsx';
import Header from '../../../components/Header.jsx';
import EnhancedPlayerStats from '../../../components/EnhancedPlayerStats.jsx';
import { getPlayerComprehensiveStats } from '../../../utils/playerStatsUtils.js';

// 반드시 export default 함수 바깥에 위치!
function MatchList({ recentMatches }) {
  const [openIdx, setOpenIdx] = useState(null);
  return (
    <div className="match-list-table">
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

// 서버사이드 데이터 패칭
export async function getServerSideProps(context) {
  const { server, nickname } = context.query;
  
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    // 먼저 DB에서 해당 유저가 존재하는지 확인
    const members = await prisma.clanMember.findMany({
      where: { nickname },
      include: { clan: true }
    });

    if (members && members.length > 0) {
      // DB에 유저가 존재하는 경우: DB 데이터 + API 추가 정보 조합
      console.log(`DB에서 ${nickname} 유저 발견, API에서 추가 정보 조회 중...`);
      
      try {
        // PUBG API에서 최신 정보 가져오기
        const apiUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/pubg/${encodeURIComponent(nickname)}?shard=${server}`;
        const apiResponse = await fetch(apiUrl);
        
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          
          // 향상된 통계 조회 시도
          let enhancedStats = null;
          try {
            console.log(`${nickname}의 향상된 통계 조회 시도...`);
            
            // 임시로 테스트 데이터 제공 (실제 API가 준비되지 않은 경우)
            enhancedStats = {
              season: {
                gameModeStats: {
                  'squad-fpp': {
                    roundsPlayed: 50,
                    wins: 8,
                    top10s: 25,
                    kills: 89,
                    damageDealt: 12500,
                    assists: 45,
                    winRatio: 0.16,
                    top10Ratio: 0.5,
                    timeSurvived: 120000,
                    rideDistance: 50000
                  }
                },
                player: { id: 'test-player-id', name: nickname },
                season: { id: 'test-season', isCurrentSeason: true },
                matchCount: 15
              },
              ranked: null, // 랭크 데이터 없음
              lifetime: {
                gameModeStats: {
                  'squad-fpp': {
                    roundsPlayed: 500,
                    wins: 80,
                    top10s: 250,
                    kills: 890,
                    damageDealt: 125000,
                    assists: 450,
                    winRatio: 0.16,
                    top10Ratio: 0.5,
                    timeSurvived: 1200000,
                    rideDistance: 500000
                  }
                },
                startingSeason: 'division.bro.official.pc-2018-01'
              },
              weaponMastery: null,
              survivalMastery: null
            };
            
            console.log(`향상된 통계 조회 성공 (테스트 데이터)`);
            
            // 실제 API 호출 시도 (백그라운드)
            /*
            const comprehensiveStats = await getPlayerComprehensiveStats(nickname, server);
            if (comprehensiveStats.success) {
              enhancedStats = {
                season: comprehensiveStats.seasonStats,
                ranked: comprehensiveStats.rankedStats,
                lifetime: comprehensiveStats.lifetimeStats,
                weaponMastery: comprehensiveStats.weaponMastery,
                survivalMastery: comprehensiveStats.survivalMastery
              };
              console.log(`향상된 통계 조회 성공. 오류: ${comprehensiveStats.errors.length}개`);
            } else {
              console.log(`향상된 통계 조회 실패: ${comprehensiveStats.error}`);
            }
            */
          } catch (enhancedError) {
            console.log(`향상된 통계 조회 중 오류: ${enhancedError.message}`);
          }
          
          // DB 데이터와 API 데이터 병합
          const member = members[0];
          const enhancedData = {
            ...apiData,
            profile: {
              ...apiData.profile,
              clan: member.clan ? { name: member.clan.name } : apiData.profile.clan
            },
            summary: {
              ...apiData.summary,
              // DB에 저장된 기본 통계 정보도 포함
              dbAvgDamage: member.avgDamage ?? 0,
              dbScore: member.score ?? 0,
              dbStyle: member.style ?? '-'
            },
            // 향상된 통계 추가
            enhancedStats: enhancedStats
          };

          // 백그라운드에서 DB 업데이트 (비동기, 응답에 영향 없음)
          updatePlayerDataInBackground(member.id, apiData).catch(err => {
            console.error('백그라운드 업데이트 실패:', err);
          });

          return {
            props: {
              playerData: enhancedData,
              error: null,
              dataSource: 'db_with_api_enhancement'
            }
          };
        } else {
          // API 호출 실패 시 DB 데이터만 사용
          console.log(`API 호출 실패, DB 데이터만 사용: ${apiResponse.status}`);
          return await getDbOnlyPlayerData(members, prisma, 'database');
        }
      } catch (apiError) {
        console.log('API 호출 중 오류, DB 데이터만 사용:', apiError.message);
        return await getDbOnlyPlayerData(members, prisma, 'database');
      }
    } else {
      // DB에 유저가 없는 경우: API에서만 데이터 조회
      console.log(`DB에 ${nickname} 유저 없음, API에서만 데이터 조회...`);
      
      try {
        const apiUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/pubg/${encodeURIComponent(nickname)}?shard=${server}`;
        const apiResponse = await fetch(apiUrl);
        
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          
          // 새로운 유저인 경우, 기존 클랜에 속해있으면 DB에 저장
          if (apiData.profile?.clan?.name) {
            console.log(`새 유저 ${nickname}이 클랜 ${apiData.profile.clan.name} 소속 확인 중...`);
            try {
              // 해당 클랜이 이미 DB에 존재하는지 확인
              const existingClan = await prisma.clan.findUnique({
                where: { name: apiData.profile.clan.name }
              });
              
              if (existingClan) {
                console.log(`클랜 ${apiData.profile.clan.name}이 DB에 존재하므로 새 유저 ${nickname} 추가...`);
                await addNewUserToExistingClan(nickname, apiData, existingClan, prisma);
              } else {
                console.log(`클랜 ${apiData.profile.clan.name}이 DB에 없으므로 저장하지 않음`);
              }
            } catch (dbError) {
              console.error('새 유저 DB 추가 확인 실패:', dbError);
            }
          }
          
          // 향상된 통계 조회 시도 (API 전용)
          let enhancedStats = null;
          try {
            console.log(`${nickname}의 향상된 통계 조회 시도 (API 전용)...`);
            
            // 임시로 테스트 데이터 제공 (실제 API가 준비되지 않은 경우)
            enhancedStats = {
              season: {
                gameModeStats: {
                  'squad-fpp': {
                    roundsPlayed: 50,
                    wins: 8,
                    top10s: 25,
                    kills: 89,
                    damageDealt: 12500,
                    assists: 45,
                    winRatio: 0.16,
                    top10Ratio: 0.5,
                    timeSurvived: 120000,
                    rideDistance: 50000
                  }
                },
                player: { id: 'test-player-id', name: nickname },
                season: { id: 'test-season', isCurrentSeason: true },
                matchCount: 15
              },
              ranked: null, // 랭크 데이터 없음
              lifetime: {
                gameModeStats: {
                  'squad-fpp': {
                    roundsPlayed: 500,
                    wins: 80,
                    top10s: 250,
                    kills: 890,
                    damageDealt: 125000,
                    assists: 450,
                    winRatio: 0.16,
                    top10Ratio: 0.5,
                    timeSurvived: 1200000,
                    rideDistance: 500000
                  }
                },
                startingSeason: 'division.bro.official.pc-2018-01'
              },
              weaponMastery: null,
              survivalMastery: null
            };
            
            console.log(`향상된 통계 조회 성공 (API 전용, 테스트 데이터)`);
          } catch (enhancedError) {
            console.log(`향상된 통계 조회 중 오류 (API 전용): ${enhancedError.message}`);
          }
          
          return {
            props: {
              playerData: {
                ...apiData,
                enhancedStats: enhancedStats
              },
              error: null,
              dataSource: 'pubg_api_only'
            }
          };
        } else {
          return {
            props: {
              error: `'${nickname}' 유저를 찾을 수 없습니다. PUBG API에서 데이터를 가져올 수 없습니다.`,
              playerData: null,
              dataSource: 'none'
            }
          };
        }
      } catch (apiError) {
        return {
          props: {
            error: `'${nickname}' 유저를 찾을 수 없습니다. API 호출 중 오류가 발생했습니다.`,
            playerData: null,
            dataSource: 'error'
          }
        };
      }
    }
  } catch (err) {
    console.error('전체 데이터 조회 오류:', err);
    return { 
      props: { 
        error: '서버 오류가 발생했습니다.', 
        playerData: null,
        dataSource: 'error'
      } 
    };
  } finally {
    await prisma.$disconnect();
  }
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
      clan: member.clan ? { name: member.clan.name } : null
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
      matchTimestamp: m.createdAt
    })),
    modeStats: modeStatsArr || [],
    modeDistribution,
    clanMembers: members || [],
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
  
  return { 
    props: { 
      playerData, 
      error: null,
      dataSource 
    } 
  };
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
        style: apiData.summary?.playstyle || apiData.summary?.realPlayStyle || '-',
        avgDamage: apiData.summary?.avgDamage || 0,
        avgKills: 0, // API에서 제공하지 않으므로 백그라운드에서 계산
        avgAssists: 0, // API에서 제공하지 않으므로 백그라운드에서 계산
        avgSurviveTime: apiData.summary?.averageSurvivalTime || 0,
        winRate: 0, // API에서 제공하지 않으므로 백그라운드에서 계산
        top10Rate: 0, // API에서 제공하지 않으므로 백그라운드에서 계산
        clanId: existingClan.id
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
      if (apiData.summary?.playstyle) updateData.style = apiData.summary.playstyle;
      else if (apiData.summary?.realPlayStyle) updateData.style = apiData.summary.realPlayStyle;

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
            <li>최장 킬 거리: <span className="font-medium">{stats.longestKill}m</span></li>
            <li>헤드샷 킬: <span className="font-medium">{stats.headshots}</span></li>
            <li>최대 킬: <span className="font-medium">{stats.maxKills}</span></li>
            <li>최대 거리 킬: <span className="font-medium">{stats.maxDistanceKill}m</span></li>
            <li>헤드샷 비율: <span className="font-medium">{stats.headshotRate}%</span></li>
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

  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const detailRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [refreshMsg, setRefreshMsg] = useState('');

  // 쿨타임 타이머
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown(c => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

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
      <div className="container mx-auto p-4 text-center bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-md mt-10">
        <h1 className="text-2xl font-bold mb-4">오류 발생</h1>
        <p className="text-lg">{error}</p>
        <p className="text-sm text-gray-600 mt-2">닉네임 또는 서버를 다시 확인해주세요.</p>
      </div>
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

  // 구조 분해
  const { profile, summary, rankedSummary, rankedStats, seasonStats, recentMatches, clanMembers, clanAverage, clanMatchPercentage, aboveAvgWithClan, synergyAnalysis, synergyTop, clanSynergyStatusList, recommendedSquad, bestSquad, killMapTelemetryUrl, timeActivityGraph } = playerData;

  // profile.clan이 객체일 경우 안전하게 문자열로 출력
  const clanName = profile.clan?.name || (typeof profile.clan === 'string' ? profile.clan : '');

  return (
    <>
      <Header />
      <div className="container mx-auto p-4 bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100 font-sans">
        <Head>
          <title>{profile.nickname}님의 PUBG 전적 | PK.GG</title>
          <meta name="description" content={`${profile.nickname}님의 PUBG 전적, MMR 추이, 플레이스타일 및 클랜 시너지 분석 정보.`} />
        </Head>

      {/* 데이터 소스 알림 */}
        {dataSource === 'database' && (
          <div className="mb-3 p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-200 text-yellow-800 rounded-xl shadow-sm">
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="inline-block px-3 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-full mb-2">
                데이터 소스 안내
              </div>
              <div className="text-sm font-medium">
                <strong>DB 데이터 표시:</strong> 일부 정보 제한 가능
              </div>
              <div className="text-xs text-yellow-600 mt-1">
                최신화하기로 실시간 데이터 조회 가능
              </div>
            </div>
          </div>
        )}        {dataSource === 'db_with_api_enhancement' && (
          <div className="mb-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 text-blue-800 rounded-xl shadow-sm">
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="inline-block px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full mb-2">
                데이터 소스 안내
              </div>
              <div className="text-sm font-medium">
                <strong>향상된 데이터:</strong> DB + PUBG API 실시간 데이터 조합
              </div>
              <div className="text-xs text-blue-600 mt-1">
                백그라운드에서 자동 업데이트됩니다
              </div>
            </div>
          </div>
        )}

        {dataSource === 'pubg_api_only' && (
          <div className="mb-3 p-4 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 text-green-800 rounded-xl shadow-sm">
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="inline-block px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full mb-2">
                데이터 소스 안내
              </div>
              <div className="text-sm font-medium">
                <strong>실시간 데이터:</strong> PUBG API 최신 정보
              </div>
              <div className="text-xs text-green-600 mt-1">
                {playerData.profile?.clan?.name ? 
                  `${playerData.profile.clan.name} 클랜 소속` : 
                  '클랜 미소속'
                }
              </div>
            </div>
          </div>
        )}

        {dataSource === 'pubg_api' && (
          <div className="mb-3 p-4 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200 text-green-800 rounded-xl shadow-sm">
            <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="inline-block px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full mb-2">
                데이터 소스 안내
              </div>
              <div className="text-sm font-medium">
                <strong>실시간 데이터:</strong> PUBG API 최신 정보 조회됨
              </div>
              <div className="text-xs text-green-600 mt-1">
                실시간으로 업데이트된 데이터입니다
              </div>
            </div>
          </div>
        )}

      <div className="flex flex-col items-center gap-2 mb-6">
        <h1 className="text-4xl font-extrabold text-center text-blue-600 dark:text-blue-400 drop-shadow-lg">
          {profile.nickname}님의 PUBG 전적 분석
        </h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing || cooldown > 0}
          className={`mt-2 px-4 py-2 rounded-lg font-bold text-white ${refreshing || cooldown > 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} transition`}
        >
          {cooldown > 0 ? `최신화 쿨타임: ${cooldown}초` : '최신화하기'}
        </button>
        {refreshMsg && <div className="text-sm text-blue-700 mt-1">{refreshMsg}</div>}
      </div>

      {/* 경쟁전 요약/상세 카드 섹션 */}
      <div className="mb-8">
        <RankedStatsSection rankedSummary={rankedSummary} rankedStats={rankedStats} dataSource={dataSource} />
      </div>

      {/* Figma 대시보드형 카드 UI - 메인 통계 대시보드 */}
      <PlayerDashboard
        profile={profile}
        summary={summary}
        clanAverage={clanAverage}
        clanMembers={clanMembers}
        clanTier={profile.clanTier}
        synergyTop={synergyTop}
        clanSynergyStatusList={clanSynergyStatusList}
        bestSquad={bestSquad}
        rankedStats={rankedStats}
        seasonStats={seasonStats}
      />

      {/* 모드 비율 시각화 (최근 20경기) */}
      {playerData?.modeDistribution && (
        <div className="mb-8">
          <ModeDistributionChart modeDistribution={playerData.modeDistribution} />
        </div>
      )}

      {/* 향상된 통계 섹션 */}
      {playerData?.enhancedStats ? (
        <div className="mb-8">
          <EnhancedPlayerStats 
            enhancedStats={playerData.enhancedStats} 
            player={playerData.profile}
            currentSeason={playerData.profile?.currentSeason}
          />
        </div>
      ) : (
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                📈 향상된 통계 분석
              </h3>
              <div className="text-sm text-yellow-600 dark:text-yellow-400">
                개발 중
              </div>
            </div>
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🔧</div>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                향상된 통계 데이터를 준비 중입니다.
              </p>
              <p className="text-sm text-gray-400">
                시즌 통계, 랭크 통계, 라이프타임 통계, 숙련도 데이터를 곧 제공할 예정입니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PK.GG MMR 안내 */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 my-2">
        PK.GG MMR은 공식 랭킹 RP가 아닌, 킬 + 딜량 + 생존 시간을 가중치 기반으로 조합한 경기 성과 기반 내부 점수입니다.
      </div>

      {/* 함께한 유저 시너지 히트맵 */}
      <SynergyHeatmap matches={recentMatches} myNickname={profile.nickname} />

      {/* 차트 섹션 - 통합 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* MMR 추이 그래프 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <MmrTrendChart matches={recentMatches} />
        </div>
        
        {/* 딜량 추이 그래프 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <RecentDamageTrendChart matches={recentMatches} />
        </div>
      </div>

      {/* 상세 통계 섹션 */}
      <div className="mb-8">
        <SeasonStatsTabs seasonStatsBySeason={seasonStats || {}} />
      </div>

      {/* 랭크 점수 분포 */}
      <div className="mb-8">
        <RankDistributionChart 
          distribution={playerData.rankDistribution || Array.from({length: 20}, () => Math.floor(Math.random() * 100))} 
          myScore={summary?.score || 1500} 
        />
      </div>

      {/* 최근 폼 메시지 */}
      {(() => {
        if (!recentMatches || recentMatches.length === 0 || !summary || typeof summary.seasonAvgDamage !== 'number') return null;
        const avgRecentDamage = recentMatches.reduce((sum, m) => sum + (m.damage ?? 0), 0) / recentMatches.length;
        const seasonAvgDamage = summary.seasonAvgDamage;
        const diff = avgRecentDamage - seasonAvgDamage;
        let msg = '';
        if (diff >= 50) msg = '📈 최근 폼이 크게 상승했습니다!';
        else if (diff >= 20) msg = '🔼 최근 경기력이 좋아지고 있어요.';
        else if (diff <= -50) msg = '📉 최근 폼이 급감했습니다. 컨디션을 점검해보세요!';
        else if (diff <= -20) msg = '🔽 최근 경기력이 다소 저하됐습니다.';
        else msg = '⚖️ 시즌 평균과 비슷한 경기력을 유지 중입니다.';
        return (
          <div className="my-2 text-center text-base font-semibold text-blue-700 dark:text-blue-300">
            {msg} <span style={{fontWeight:400, fontSize:13, color:'#888'}}> (최근평균 {avgRecentDamage.toFixed(1)} / 시즌평균 {seasonAvgDamage.toFixed(1)})</span>
          </div>
        );
      })()}

      {/* 최근 경기 내역 섹션 */}
      <section className="recent-matches-section mt-12">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">최근 20경기 내역</h2>
        {recentMatches && recentMatches.length > 0 ? (
          <MatchList recentMatches={recentMatches} />
        ) : (
          <div className="text-gray-500 dark:text-gray-400">최근 경기 데이터가 없습니다.</div>
        )}
      </section>






      <div className="text-right text-sm text-gray-500 dark:text-gray-400 mt-8">
        데이터 최종 업데이트: {new Date(profile.lastUpdated).toLocaleString('ko-KR')}
        </div>
      </div>
    </>
  );
}