import React from "react";

const modeLabels = {
  "squad-fpp": "스쿼드 FPP",
  "squad": "스쿼드",
  "duo-fpp": "듀오 FPP",
  "solo-fpp": "솔로 FPP",
};

function StatCard({ title, value, sub }) {
  return (
    <div>
      <div>{title}</div>
      <div>{value}</div>
      {sub && <div>{sub}</div>}
    </div>
  );
}

function EmptyCard({ label }) {
  return <div>아직 {label} 경기가 없습니다.</div>;
}

export default function PlayerDashboard({ profile, summary, clanAverage, clanMembers, clanTier, synergyTop, clanSynergyStatusList, bestSquad, rankedStats, seasonStats }) {
  // 클랜 시너지 상태
  const synergyStatus = clanSynergyStatusList && clanSynergyStatusList.length > 0 ?
    clanSynergyStatusList.sort((a,b) => a === "좋음" ? -1 : 1)[0] : "-";

  // 모드별 카드
  const modes = ["solo", "duo", "squad"];
  return (
    <div>
      {/* 랭크 티어 아이콘 및 등급 */}
      <div>
        {profile.tierIcon && (
          <img src={profile.tierIcon} alt={profile.tier || "티어"} />
        )}
        <span>{profile.tier || 'Unranked'}</span>
      </div>
      {/* 상단 클랜/개인 요약 카드 그리드 */}
      <div>
        <StatCard title="클랜명" value={profile.clan} />
        <StatCard title="클랜 평균 딜" value={clanAverage ?? "-"} />
        <StatCard title="클랜 내 티어" value={profile.clanTier ?? "-"} />
        <StatCard title="함께한 클랜원 TOP3" value={<>{synergyTop?.map(p => <div key={p.name}>{p.name}</div>)}</>} />
        <StatCard title="클랜 시너지" value={<span>😊</span>} sub={synergyStatus} />
        <StatCard title="Best Squad 추천" value={bestSquad?.names?.join(", ") ?? "-"} />
      </div>
      <div>
        <StatCard title="평균점수" value={summary.averageScore ?? "-"} />
        <StatCard title="시즌 평균 데미지" value={seasonStats?.squad?.avgDamage ?? "-"} />
        <StatCard title="20판 평균 데미지" value={summary.avgDamage ?? "-"} />
        <StatCard title="평균 이동거리" value={summary.averageDistance ? summary.averageDistance + "M" : "-"} />
        <StatCard title="플레이 스타일" value={summary.playstyle} sub={summary.realPlayStyle} />
      </div>
      {/* 하단 모드별 카드 */}
      <div>
        {modes.map(mode => {
          const stat = seasonStats?.[mode];
          if (!stat || !stat.rounds) return <EmptyCard key={mode} label={modeLabels[mode+"-fpp"]||mode.toUpperCase()} />;
          return (
            <div key={mode}>
              <div>{modeLabels[mode+"-fpp"]||mode.toUpperCase()} <span>{stat.rounds} 게임</span></div>
              <div>
                <span>K/D <b>{stat.kd}</b></span>
                <span>경기당 데미지 <b>{stat.avgDamage}</b></span>
                <span>승률 <b>{stat.winRate}%</b></span>
                <span>TOP10 <b>{stat.top10Rate}%</b></span>
              </div>
              <div>
                <span>헤드샷 {stat.headshots}</span>
                <span>최대킬 {stat.maxKills}</span>
                <span>최대거리킬 {stat.maxDistanceKill}m</span>
                <span>평균 등수 #{stat.avgRank}</span>
                <span>평균 생존시간 {stat.avgSurvivalTime ? (Math.floor(stat.avgSurvivalTime/60)+":"+("0"+Math.floor(stat.avgSurvivalTime%60)).slice(-2)) : "-"}</span>
                <span>KDA {stat.kda ?? "-"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
