// PK.GG/pages/player/[server]/[nickname].js

import MmrTrendChart from '../../../components/MmrTrendChart.js'
import MatchDetailCard from '../../../components/MatchDetailCard.jsx'; // .jsx 확장자 주의
import Head from 'next/head';

// 이 함수는 서버 사이드에서 데이터를 미리 불러와 페이지를 렌더링합니다.
export async function getServerSideProps(context) {
  const { server, nickname } = context.query;

  try {
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/pubg/${nickname}`;
    console.log(`[getServerSideProps] API 호출: ${apiUrl}`);
    
    const res = await fetch(apiUrl);
    
    if (!res.ok) {
      const errorData = await res.json();
      console.error(`[getServerSideProps ERROR] API 응답 오류 (${res.status}):`, errorData);
      if (res.status === 404) {
        return { props: { error: `플레이어 '${nickname}'을(를) 찾을 수 없습니다.`, playerData: null } };
      }
      return { props: { error: errorData.error || '데이터를 불러오는 데 실패했습니다.', playerData: null } };
    }

    const playerData = await res.json();
    console.log(`[getServerSideProps] API 데이터 로드 성공: ${playerData.nickname}`);
    
    return { props: { playerData, error: null } };
  } catch (error) {
    console.error(`[getServerSideProps CATCH ERROR]`, error);
    return { props: { error: '서버 오류가 발생했습니다. 다시 시도해주세요.', playerData: null } };
  }
}

export default function PlayerPage({ playerData, error }) {
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

  return (
    <div className="container mx-auto p-4 bg-gray-50 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100 font-sans">
      <Head>
        <title>{playerData.nickname}님의 PUBG 전적 | PK.GG</title>
        <meta name="description" content={`${playerData.nickname}님의 PUBG 전적, MMR 추이, 플레이스타일 및 클랜 시너지 분석 정보.`} />
      </Head>

      <h1 className="text-4xl font-extrabold mb-8 text-center text-blue-600 dark:text-blue-400 drop-shadow-lg">
        {playerData.nickname}님의 PUBG 전적 분석
      </h1>

      {/* 요약 정보 섹션 */}
      <section className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
          <span className="mr-2">📈</span> 요약 정보
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-lg">
          <p><span className="font-medium text-blue-500 dark:text-blue-400">평균 점수:</span> {playerData.averageScore || 'N/A'}</p>
          <p><span className="font-medium text-blue-500 dark:text-blue-400">시즌 평균 딜량:</span> {playerData.seasonAvgDamage || 'N/A'}</p>
          <p><span className="font-medium text-blue-500 dark:text-blue-400">최근 평균 딜량:</span> {playerData.avgDamage || 'N/A'}</p>
          <p><span className="font-medium text-blue-500 dark:text-blue-400">평균 이동 거리:</span> {playerData.averageDistance || 'N/A'}m</p>
          <p><span className="font-medium text-blue-500 dark:text-blue-400">플레이스타일:</span> {playerData.realPlayStyle || '분석 불가'}</p>
          <p><span className="font-medium text-blue-500 dark:text-blue-400">이동 성향:</span> {playerData.distanceStyleHint || '분석 불가'}</p>
          <p className="md:col-span-2 lg:col-span-3">
            <span className="font-medium text-blue-500 dark:text-blue-400">최근 딜량 폼:</span> {playerData.formComment || '분석 불가'}
          </p>
        </div>
      </section>

      {/* MMR 추이 섹션 */}
      <section className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
          <span className="mr-2">📊</span> 최근 MMR 추이 (최근 {playerData.matches?.length || 0}경기)
        </h2>
        {/* MmrTrendChart 컴포넌트 사용 */}
        <MmrTrendChart matches={playerData.matches} />
      </section>

      {/* 클랜 정보 섹션 */}
      {playerData.clan ? (
        <section className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
            <span className="mr-2">🤝</span> 클랜 정보 (<span className="text-purple-600 dark:text-purple-400">{playerData.clan}</span>)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
            <p><span className="font-medium text-blue-500 dark:text-blue-400">내 클랜 티어:</span> {playerData.clanTier || 'N/A'}</p>
            <p><span className="font-medium text-blue-500 dark:text-blue-400">클랜전 참여 비율:</span> {playerData.clanMatchPercentage}%</p>
            <p><span className="font-medium text-blue-500 dark:text-blue-400">클랜원과 플레이 시 평균 딜량:</span> {playerData.clanAverage || 'N/A'}</p>
            <p><span className="font-medium text-blue-500 dark:text-blue-400">클랜원과 평균 이상 경기 수:</span> {playerData.aboveAvgWithClan || 0}회</p>
            {playerData.synergyTop && playerData.synergyTop.length > 0 && (
              <p className="md:col-span-2">
                <span className="font-medium text-blue-500 dark:text-blue-400">최고 시너지 클랜 파트너:</span>
                <span className="ml-2 font-bold text-green-600 dark:text-green-400">
                  {playerData.synergyTop.map(p => p.name).join(', ')}
                </span>
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
            <span className="mr-2">🤝</span> 클랜 정보
          </h2>
          <p className="text-gray-500 dark:text-gray-400">소속된 클랜이 없습니다. 클랜에 가입하여 시너지 분석을 받아보세요!</p>
        </section>
      )}

      {/* 추천 스쿼드 조합 섹션 */}
      {playerData.bestSquad ? (
        <section className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
            <span className="mr-2">⭐</span> 추천 스쿼드 조합
          </h2>
          <div className="text-lg">
            <p><span className="font-medium text-blue-500 dark:text-blue-400">최고 시너지 조합:</span> <span className="font-bold text-indigo-600 dark:text-indigo-400">{playerData.bestSquad.names.join(', ')}</span></p>
            <p><span className="font-medium text-blue-500 dark:text-blue-400">평균 MMR:</span> {playerData.bestSquad.avgMmr} (함께 {playerData.bestSquad.count}회 플레이)</p>
          </div>
        </section>
      ) : (
        <section className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
            <span className="mr-2">⭐</span> 추천 스쿼드 조합
          </h2>
          <p className="text-gray-500 dark:text-gray-400">충분한 스쿼드 플레이 데이터가 없습니다.</p>
        </section>
      )}

      {/* 시즌 통계 섹션 */}
      <section className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
          <span className="mr-2">📈</span> 시즌 통계
        </h2>
        {playerData.modeStats && Object.keys(playerData.modeStats).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(playerData.modeStats).map(([mode, stats]) => (
              <div key={mode} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
                <h3 className="text-xl font-bold text-blue-500 dark:text-blue-400 mb-2 capitalize">{mode.replace('-', ' ').toUpperCase()}</h3>
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
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">현재 시즌 통계 데이터를 불러올 수 없습니다.</p>
        )}
      </section>

      {/* 최근 경기 상세 카드 섹션 */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
          <span className="mr-2">📜</span> 최근 경기 상세 분석
        </h2>
        {playerData.matches && playerData.matches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {playerData.matches.map((match) => (
              <MatchDetailCard key={match.matchId} match={match} />
            ))}
          </div>
        ) : (
          <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg shadow-md">
            최근 경기 데이터가 없습니다.
          </div>
        )}
      </section>

      <div className="text-right text-sm text-gray-500 dark:text-gray-400 mt-8">
        데이터 최종 업데이트: {new Date(playerData.lastUpdated).toLocaleString('ko-KR')}
      </div>
    </div>
  );
}