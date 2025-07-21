
import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

import RankedStatsSection from '../../../components/RankedStatsSection';


import PlayerPlaystyleStats from '../../../components/PlayerPlaystyleStats.jsx';
import PlayerDashboard from '../../../components/PlayerDashboard';
import MmrTrendChart from '../../../components/MmrTrendChart';
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
  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/pubg/${nickname}`;
    const res = await fetch(apiUrl);
    if (!res.ok) {
      const errorData = await res.json();
      if (res.status === 404) {
        return { props: { error: `플레이어 '${nickname}'을(를) 찾을 수 없습니다.`, playerData: null } };
      }
      return { props: { error: errorData.error || '데이터를 불러오는 데 실패했습니다.', playerData: null } };
    }
    let playerData = await res.json();
    // recentMatches 필드 보강: 누락 필드 기본값 보장
    if (playerData && Array.isArray(playerData.recentMatches)) {
      playerData.recentMatches = playerData.recentMatches.map(match => ({
        // 기존 필드 유지
        ...match,
        // 누락 필드 기본값 보장
        opGrade: match.opGrade ?? '-',
        totalTeamDamage: match.totalTeamDamage ?? 0,
        rank: match.rank ?? '-',
        killLog: Array.isArray(match.killLog) ? match.killLog : [],
        movePath: match.movePath ?? '',
        weaponStats: match.weaponStats ?? {},
        teammatesDetail: Array.isArray(match.teammatesDetail) ? match.teammatesDetail : [],
        win: match.win ?? false,
        top10: match.top10 ?? false,
        avgMmr: match.avgMmr ?? null,
        matchTimestamp: match.matchTimestamp ?? null,
        kills: match.kills ?? 0,
        damage: match.damage ?? 0,
        distance: match.distance ?? 0,
      }));
    }
    // summary, seasonStats, rankedStats 주요 필드 기본값 보장
    function safeNum(val, def = 0) { return typeof val === 'number' && !isNaN(val) ? val : def; }
    if (playerData) {
      if (playerData.summary) {
        playerData.summary.seasonAvgDamage = safeNum(playerData.summary.seasonAvgDamage);
        playerData.summary.seasonAvgSurvivalTime = safeNum(playerData.summary.seasonAvgSurvivalTime);
        playerData.summary.seasonAvgDistance = safeNum(playerData.summary.seasonAvgDistance);
        playerData.summary.seasonAvgEngageDistance = safeNum(playerData.summary.seasonAvgEngageDistance);
        playerData.summary.seasonAvgKills = safeNum(playerData.summary.seasonAvgKills);
        playerData.summary.seasonAvgAssists = safeNum(playerData.summary.seasonAvgAssists);
      }
      if (playerData.seasonStats) {
        playerData.seasonStats.avgDamage = safeNum(playerData.seasonStats.avgDamage);
        playerData.seasonStats.avgSurvivalTime = safeNum(playerData.seasonStats.avgSurvivalTime);
        playerData.seasonStats.avgDistance = safeNum(playerData.seasonStats.avgDistance);
        playerData.seasonStats.avgEngageDistance = safeNum(playerData.seasonStats.avgEngageDistance);
        playerData.seasonStats.avgKills = safeNum(playerData.seasonStats.avgKills);
        playerData.seasonStats.avgAssists = safeNum(playerData.seasonStats.avgAssists);
      }
      if (playerData.rankedStats) {
        playerData.rankedStats.avgDamage = safeNum(playerData.rankedStats.avgDamage);
        playerData.rankedStats.avgSurvivalTime = safeNum(playerData.rankedStats.avgSurvivalTime);
        playerData.rankedStats.avgDistance = safeNum(playerData.rankedStats.avgDistance);
        playerData.rankedStats.avgEngageDistance = safeNum(playerData.rankedStats.avgEngageDistance);
        playerData.rankedStats.avgKills = safeNum(playerData.rankedStats.avgKills);
        playerData.rankedStats.avgAssists = safeNum(playerData.rankedStats.avgAssists);
      }
    }
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

  useEffect(() => {
    if (selectedMatchId && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedMatchId]);

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

  return (
    <div className="container mx-auto p-4 bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100 font-sans">
      <Head>
        <title>{profile.nickname}님의 PUBG 전적 | PK.GG</title>
        <meta name="description" content={`${profile.nickname}님의 PUBG 전적, MMR 추이, 플레이스타일 및 클랜 시너지 분석 정보.`} />
      </Head>

      <h1 className="text-4xl font-extrabold mb-8 text-center text-blue-600 dark:text-blue-400 drop-shadow-lg">
        {profile.nickname}님의 PUBG 전적 분석
      </h1>





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


      {/* 최근 경기 MMR 추이 그래프 */}
      <div className="mt-10 mb-8">
        <MmrTrendChart matches={recentMatches} />
      </div>


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