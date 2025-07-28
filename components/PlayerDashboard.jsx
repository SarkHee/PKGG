import React from "react";
import Link from "next/link";

const modeLabels = {
  "squad-fpp": "스쿼드 FPP",
  "squad": "스쿼드",
  "duo-fpp": "듀오 FPP",
  "solo-fpp": "솔로 FPP",
};

function StatCard({ title, value, sub, icon, colorClass = "blue" }) {
  const colorClasses = {
    blue: "from-blue-50 to-blue-100 border-blue-200 text-blue-800",
    green: "from-green-50 to-green-100 border-green-200 text-green-800",
    purple: "from-purple-50 to-purple-100 border-purple-200 text-purple-800",
    orange: "from-orange-50 to-orange-100 border-orange-200 text-orange-800",
    pink: "from-pink-50 to-pink-100 border-pink-200 text-pink-800",
    indigo: "from-indigo-50 to-indigo-100 border-indigo-200 text-indigo-800"
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[colorClass]} rounded-xl p-4 border shadow-sm hover:shadow-md transition-shadow`}>
      <div className="mb-2">
        {/* 아이콘(대활호 등) 완전히 제거 */}
      </div>
      <div className="text-lg font-bold mb-1">{value}</div>
      {sub && <div className="text-xs opacity-70">{sub}</div>}
      <div className="text-sm font-medium opacity-75 mt-1">{title}</div>
    </div>
  );
}

function EmptyCard({ label, icon = "📝" }) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-6 text-center text-gray-600">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm">아직 {label} 경기가 없습니다.</div>
    </div>
  );
}

export default function PlayerDashboard({ profile, summary, clanAverage, clanMembers, clanTier, synergyTop, clanSynergyStatusList, bestSquad, seasonStats, aboveAvgWithClan }) {
  const [showDetailStats, setShowDetailStats] = React.useState(false);
  // 클랜 시너지 상태
  const synergyStatus = clanSynergyStatusList && clanSynergyStatusList.length > 0 ?
    clanSynergyStatusList.sort((a,b) => a === "좋음" ? -1 : 1)[0] : "-";

  // 시너지 상태에 따른 이모지와 텍스트 결정
  const getSynergyDisplay = (status) => {
    if (status === "좋음") return { emoji: "😊", text: "좋음" };
    if (status === "나쁨") return { emoji: "😞", text: "나쁨" };
    return { emoji: "😐", text: "보통" };
  };

  // profile.clan이 객체일 경우 안전하게 문자열로 변환
  const clanName = profile.clan && typeof profile.clan === 'object' && 'name' in profile.clan ? profile.clan.name : (profile.clan ?? '-');
  
  // clanAverage가 객체인 경우 안전하게 처리
  const clanAverageValue = typeof clanAverage === 'number' ? clanAverage : (typeof clanAverage === 'object' && clanAverage !== null ? Object.values(clanAverage)[0] : "-");
  
  // aboveAvgWithClan이 객체인 경우 안전하게 처리
  const aboveAvgValue = typeof aboveAvgWithClan === 'number' ? aboveAvgWithClan : (typeof aboveAvgWithClan === 'object' && aboveAvgWithClan !== null ? Object.values(aboveAvgWithClan)[0] : "-");

  return (
    <div className="space-y-4">
      {/* 클랜 및 팀플레이 요약 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard 
          title="클랜명" 
          value={clanName} 
          icon="🏰"
          colorClass="blue"
        />
        <StatCard 
          title="클랜 시너지 딜량" 
          value={clanAverageValue} 
          icon="💪"
          colorClass="green"
        />
        <StatCard 
          title="클랜 내 티어" 
          value={profile.clanTier ?? "-"} 
          icon="🏆"
          colorClass="purple"
        />
        <StatCard 
          title="함께한 클랜원 TOP3" 
          value={
            <div className="space-y-1">
              {synergyTop?.map(p => 
                <div key={p.name} className="text-sm">
                  <Link href={`/player/steam/${encodeURIComponent(p.name)}`}>
                    <span className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium">
                      {p.name}
                    </span>
                  </Link>
                </div>
              )}
            </div>
          } 
          icon="👥"
          colorClass="orange"
        />
        <StatCard 
          title="클랜 시너지" 
          value={
            <div className="flex items-center gap-2">
              <span className="text-xl">{getSynergyDisplay(synergyStatus).emoji}</span>
              <span className="font-bold">{getSynergyDisplay(synergyStatus).text}</span>
            </div>
          } 
          icon="🤝"
          colorClass="pink"
        />
      </div>
    </div>
  );
}
