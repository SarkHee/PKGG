import React from "react";
import Link from "next/link";

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

export default function PlayerDashboard({ profile, summary, clanAverage, clanMembers, clanTier, synergyTop, clanSynergyStatusList, bestSquad, seasonStats, aboveAvgWithClan }) {
  // 클랜 시너지 상태
  const synergyStatus = clanSynergyStatusList && clanSynergyStatusList.length > 0 ?
    clanSynergyStatusList.sort((a,b) => a === "좋음" ? -1 : 1)[0] : "-";

  // profile.clan이 객체일 경우 안전하게 문자열로 변환
  const clanName = profile.clan && typeof profile.clan === 'object' && 'name' in profile.clan ? profile.clan.name : (profile.clan ?? '-');
  
  // clanAverage가 객체인 경우 안전하게 처리
  const clanAverageValue = typeof clanAverage === 'number' ? clanAverage : (typeof clanAverage === 'object' && clanAverage !== null ? Object.values(clanAverage)[0] : "-");
  
  // aboveAvgWithClan이 객체인 경우 안전하게 처리
  const aboveAvgValue = typeof aboveAvgWithClan === 'number' ? aboveAvgWithClan : (typeof aboveAvgWithClan === 'object' && aboveAvgWithClan !== null ? Object.values(aboveAvgWithClan)[0] : "-");

  return (
    <div>
      {/* 클랜 및 팀플레이 요약 카드 그리드 */}
      <div>
        <StatCard title="클랜명" value={clanName} />
        <StatCard title="클랜 평균 딜" value={clanAverageValue} />
        <StatCard title="클랜 내 티어" value={profile.clanTier ?? "-"} />
        <StatCard title="함께한 클랜원 TOP3" value={<>{synergyTop?.map(p => 
          <div key={p.name}>
            <Link href={`/player/steam/${encodeURIComponent(p.name)}`}>
              <span style={{ color: '#007bff', cursor: 'pointer', textDecoration: 'none' }}
                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}>
                {p.name}
              </span>
            </Link>
          </div>
        )}</>} />
        <StatCard title="클랜 시너지" value={<span>😊</span>} sub={synergyStatus} />
        <StatCard 
          title="Best Squad 추천" 
          value={bestSquad?.names ? (
            <>
              {bestSquad.names.map((name, index) => (
                <span key={name}>
                  <Link href={`/player/steam/${encodeURIComponent(name)}`}>
                    <span style={{ color: '#007bff', cursor: 'pointer', textDecoration: 'none' }}
                          onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.target.style.textDecoration = 'none'}>
                      {name}
                    </span>
                  </Link>
                  {index < bestSquad.names.length - 1 ? ", " : ""}
                </span>
              ))}
            </>
          ) : "-"} 
          sub={bestSquad ? `평균 MMR: ${bestSquad.avgMmr} (${bestSquad.count}경기)` : undefined}
        />
        <StatCard title="클랜 평균 이상 경기 수" value={aboveAvgValue} />
        <StatCard title="클랜 시너지 상세" value={Array.isArray(clanSynergyStatusList) ? clanSynergyStatusList.join(", ") : "-"} />
      </div>
      
      {/* 클랜 관련 안내 메시지 */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
        <div className="text-sm text-blue-700 dark:text-blue-300 text-center">
          💡 <strong>클랜 & 팀플레이 분석:</strong> 함께 플레이한 클랜원들과의 시너지와 추천 스쿼드 조합을 확인하세요
        </div>
      </div>
    </div>
  );
}
