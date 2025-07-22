import SynergyHeatmap from '../../../components/SynergyHeatmap.jsx';

import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

import RankedStatsSection from '../../../components/RankedStatsSection';


import PlayerPlaystyleStats from '../../../components/PlayerPlaystyleStats.jsx';
import PlayerDashboard from '../../../components/PlayerDashboard';
import MmrTrendChart from '../../../components/MmrTrendChart';
import ModeDistributionChart from '../../../components/ModeDistributionChart';
import RecentDamageTrendChart from '../../../components/RecentDamageTrendChart.jsx';
import MatchListRow from '../../../components/MatchListRow';

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
  // DB에서만 유저 통계 조회 (Prisma 직접 사용)
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    // nickname, server로 clanMember + clan 정보 + 통계 필드 조회
    const members = await prisma.clanMember.findMany({
      where: { nickname },
      include: { clan: true }
    });
    if (!members || members.length === 0) {
      // 빈 데이터 구조도 항상 내려줌
      return {
        props: {
          error: `DB에 '${nickname}' 유저가 없습니다.`,
          playerData: {
            profile: { nickname, lastUpdated: null, clan: null },
            summary: {
              avgDamage: 0, avgKills: 0, avgAssists: 0, avgSurviveTime: 0, winRate: 0, top10Rate: 0, score: 0, style: '-'
            },
            recentMatches: [],
            modeStats: [],
            modeDistribution: { ranked: 0, normal: 0, event: 0 },
            clanMembers: []
          }
        }
      };
    }
    // 첫 번째 멤버 기준으로 profile/통계 생성 (여러 클랜 소속일 경우 확장 가능)
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
        lastUpdated: member.updatedAt ? member.updatedAt.toISOString?.() || member.updatedAt : null,
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
      clanMembers: members || []
    };
    return { props: { playerData, error: null } };
  } catch (err) {
    return { props: { error: '서버 오류가 발생했습니다.', playerData: null } };
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

export default function PlayerPage({ playerData, error }) {

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
    <div className="container mx-auto p-4 bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100 font-sans">
      <Head>
        <title>{profile.nickname}님의 PUBG 전적 | PK.GG</title>
        <meta name="description" content={`${profile.nickname}님의 PUBG 전적, MMR 추이, 플레이스타일 및 클랜 시너지 분석 정보.`} />
      </Head>

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
        <RankedStatsSection rankedSummary={rankedSummary} rankedStats={rankedStats} />
      </div>

      {/* 플레이스타일/통계 시각화 섹션 */}
      <PlayerPlaystyleStats summary={summary} />

      {/* Figma 대시보드형 카드 UI */}
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

      {/* PK.GG MMR 안내 */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 my-2">
        PK.GG MMR은 공식 랭킹 RP가 아닌, 킬 + 딜량 + 생존 시간을 가중치 기반으로 조합한 경기 성과 기반 내부 점수입니다.
      </div>

      {/* 함께한 유저 시너지 히트맵 */}
      <SynergyHeatmap matches={recentMatches} myNickname={profile.nickname} />


      {/* 시즌별 통계(이전 시즌 포함) */}
      {playerData.seasonStatsBySeason && (
        <SeasonStatsTabs seasonStatsBySeason={playerData.seasonStatsBySeason} />
      )}

      {/* 랭크 점수 분포(전체 유저 중 내 위치) */}
      {playerData.rankDistribution && playerData.myRankScore !== undefined && (
        <RankDistributionChart distribution={playerData.rankDistribution} myScore={playerData.myRankScore} />
      )}



      {/* 최근 20경기 딜량 그래프 */}
      <RecentDamageTrendChart matches={recentMatches} />

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
  );
}