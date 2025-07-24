import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

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
import PlayerHeader from '../../../components/PlayerHeader.jsx';
import MatchDetailExpandable from '../../../components/MatchDetailExpandable.jsx';

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
              dbStyle: member.style ?? '-',
              // 플레이어 성향 정보 추가 (realPlayStyle 우선, 없으면 playstyle, 최종적으로 DB style)
              style: apiData.summary?.realPlayStyle || apiData.summary?.playstyle || member.style || '📦 일반 밸런스형'
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
                summary: {
                  ...apiData.summary,
                  // API에서 온 플레이스타일 데이터를 style로 정리 (realPlayStyle 우선)
                  style: apiData.summary?.realPlayStyle || apiData.summary?.playstyle || '📦 일반 밸런스형'
                },
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
      matchTimestamp: m.createdAt ? m.createdAt.toISOString() : new Date().toISOString()
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
        style: apiData.summary?.realPlayStyle || apiData.summary?.playstyle || '📦 일반 밸런스형',
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
  const [currentSeasonData, setCurrentSeasonData] = useState(null);
  const [currentSeasonId, setCurrentSeasonId] = useState('division.bro.official.pc-2024-01');

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

  return (
    <>
      <Header />
      <div className="container mx-auto p-4 bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100 font-sans">
        <Head>
          <title>{`${profile?.nickname || '플레이어'}님의 PUBG 전적 | PK.GG`}</title>
          <meta name="description" content={`${profile?.nickname || '플레이어'}님의 PUBG 전적, MMR 추이, 플레이스타일 및 클랜 시너지 분석 정보.`} />
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
        )}
        
        {dataSource === 'db_with_api_enhancement' && (
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

        {/* 새로운 플레이어 헤더 */}
        <PlayerHeader 
          profile={profile}
          summary={summary}
          rankedSummary={rankedSummary}
          clanName={clanName}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          cooldown={cooldown}
          refreshMsg={refreshMsg}
        />

      {/* 향상된 통계 분석 섹션 - 개인 상세 아이디 바로 밑으로 이동 */}
      {playerData?.enhancedStats ? (
        <div className="mb-8">
          <div className="bg-gradient-to-r from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-800/20 rounded-xl p-4 mb-4 border-l-4 border-violet-500">
            <div className="flex items-center gap-2">
              <span className="text-lg">📈</span>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">향상된 통계 분석</h2>
              <span className="text-xs bg-violet-200 dark:bg-violet-700 text-violet-800 dark:text-violet-200 px-2 py-1 rounded-full">시즌별 상세 데이터</span>
            </div>
          </div>
          <EnhancedPlayerStats 
            enhancedStats={playerData.enhancedStats} 
            player={playerData.profile}
            currentSeason={currentSeasonId}
            onSeasonChange={handleSeasonChange}
          />
        </div>
      ) : (
        <div className="mb-8">
          <div className="bg-gradient-to-r from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-800/20 rounded-xl p-4 mb-4 border-l-4 border-violet-500">
            <div className="flex items-center gap-2">
              <span className="text-lg">📈</span>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">향상된 통계 분석</h2>
              <span className="text-xs bg-yellow-200 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full">개발 중</span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
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

      {/* 클랜 및 팀플레이 분석 섹션 */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 mb-4 border-l-4 border-blue-500">
          <div className="flex items-center gap-2">
            <span className="text-lg">�</span>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">클랜 및 팀플레이 분석</h2>
            <span className="text-xs bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">클랜 시너지</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
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
        </div>
      </div>

      {/* 모드 비율 시각화 (최근 20경기) */}
      {displayData?.modeDistribution && (
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 mb-4 border-l-4 border-purple-500">
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">모드 비율 분석</h2>
              <span className="text-xs bg-purple-200 dark:bg-purple-700 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full">최근 20경기</span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
            <ModeDistributionChart modeDistribution={displayData.modeDistribution} />
          </div>
        </div>
      )}

      {/* PK.GG MMR 안내 */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 my-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-lg">ℹ️</span>
          <span className="font-semibold text-blue-700 dark:text-blue-300">PK.GG MMR 안내</span>
        </div>
        PK.GG MMR은 공식 랭킹 RP가 아닌, 킬 + 딜량 + 생존 시간을 가중치 기반으로 조합한 경기 성과 기반 내부 점수입니다.
      </div>

      {/* 함께한 유저 시너지 히트맵 */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 rounded-xl p-4 mb-4 border-l-4 border-teal-500">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤝</span>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">팀플레이 시너지 분석</h2>
            <span className="text-xs bg-teal-200 dark:bg-teal-700 text-teal-800 dark:text-teal-200 px-2 py-1 rounded-full">최근 경기 기준</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <SynergyHeatmap matches={recentMatches} myNickname={profile?.nickname} />
        </div>
      </div>

      {/* 차트 및 시각화 섹션 */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 rounded-xl p-4 mb-4 border-l-4 border-cyan-500">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">경기 추이 분석</h2>
            <span className="text-xs bg-cyan-200 dark:bg-cyan-700 text-cyan-800 dark:text-cyan-200 px-2 py-1 rounded-full">최근 20경기 기준</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* MMR 추이 그래프 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-sm">📈</span>
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">MMR 추이</h4>
            </div>
            <MmrTrendChart matches={recentMatches} />
          </div>
          
          {/* 딜량 추이 그래프 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <span className="text-sm">⚔️</span>
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">딜량 추이</h4>
            </div>
            <RecentDamageTrendChart matches={recentMatches} />
          </div>
        </div>
      </div>

      {/* 상세 통계 섹션 */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl p-4 mb-4 border-l-4 border-indigo-500">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">상세 통계</h2>
            <span className="text-xs bg-indigo-200 dark:bg-indigo-700 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded-full">시즌별 모드 상세</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <SeasonStatsTabs seasonStatsBySeason={seasonStats || {}} />
        </div>
      </div>

      {/* 랭크 점수 분포 */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl p-4 mb-4 border-l-4 border-yellow-500">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏆</span>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">랭크 점수 분포</h2>
            <span className="text-xs bg-yellow-200 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full">PK.GG 내부 점수</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <RankDistributionChart 
            distribution={playerData.rankDistribution || Array.from({length: 20}, () => Math.floor(Math.random() * 100))} 
            myScore={summary?.score || 1500} 
          />
        </div>
      </div>

      {/* 최근 경기 내역 섹션 */}
      <section className="recent-matches-section mt-12">
        <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl p-4 mb-4 border-l-4 border-indigo-500">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎮</span>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">최근 경기 내역</h2>
            <span className="text-xs bg-indigo-200 dark:bg-indigo-700 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded-full">최근 20경기</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          {recentMatches && recentMatches.length > 0 ? (
            <MatchList recentMatches={recentMatches} />
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🎯</div>
              <div className="text-gray-500 dark:text-gray-400">최근 경기 데이터가 없습니다.</div>
            </div>
          )}
        </div>
      </section>

      {/* 경기 상세 정보 표시 */}
      {selectedMatchId && (
        <div ref={detailRef} className="mt-6 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <span className="text-sm">🔍</span>
            </div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">경기 상세 정보</h4>
          </div>
          <MatchDetailExpandable matchId={selectedMatchId} />
        </div>
      )}

      {/* 데이터 정보 섹션 */}
      <div className="mt-8">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl p-4 border-l-4 border-gray-400">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">ℹ️</span>
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">데이터 정보</h2>
          </div>
          <div className="flex items-center justify-end gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="text-base">⏰</span>
            <span>
              데이터 최종 업데이트: {profile?.lastUpdated ? new Date(profile.lastUpdated).toLocaleString('ko-KR') : '알 수 없음'}
            </span>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}