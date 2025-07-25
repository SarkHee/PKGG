// components/PlayerStats.tsx

import React from "react";

type ModeStats = {
  rounds: number;
  wins: number;
  top10s: number;
  kd: number;
  avgDamage: number;
  winRate: number;
  top10Rate: number;
  longestKill: number;
  headshots: number;
  headshotRate?: number; // 헤드샷 비율 추가
};

type MatchSummary = {
  damage: number;
  distance: number;
  survivalTime: number;
  firstCombatTime: number | null;
};

type Props = {
  stats: {
    solo?: ModeStats;
    duo?: ModeStats;
    squad?: ModeStats;
  };
  matchStats: {
    solo?: MatchSummary[];
    duo?: MatchSummary[];
    squad?: MatchSummary[];
  };
};

const formatStat = (label: string, value: any, className?: string) => (
  <div className="flex justify-between text-sm">
    <span className="text-gray-600">{label}</span>
    <span className={`font-semibold ${className || ''}`}>{value}</span>
  </div>
);

const StatCard = ({ mode, stat, matches }: { mode: string; stat?: ModeStats; matches?: MatchSummary[] }) => {
  if (!stat) return null;

  const avgDistance =
    matches && matches.length > 0
      ? Math.round(matches.reduce((sum, m) => sum + m.distance, 0) / matches.length)
      : 0;

  return (
    <div className="border p-4 rounded-2xl shadow mb-6 bg-white">
      <h2 className="text-lg font-bold mb-2">{mode.toUpperCase()} 모드</h2>
      <div className="space-y-1">
        {formatStat("경기 수", stat.rounds)}
        {formatStat("승리 수", stat.wins)}
        {formatStat("Top10 진입", stat.top10s)}
        {formatStat("K/D", stat.kd.toFixed(2))}
        {formatStat("평균 딜량", stat.avgDamage.toFixed(1))}
        {formatStat("승률", `${stat.winRate.toFixed(1)}%`)}
        {formatStat("Top10 비율", `${stat.top10Rate.toFixed(1)}%`)}
        {formatStat("헤드샷 비율", `${(stat.headshotRate || 0).toFixed(1)}%`, "text-red-600 dark:text-red-400")}
        {formatStat("최장 킬 거리", `${stat.longestKill.toFixed(1)}m`)}
        {formatStat("헤드샷 수", stat.headshots || 0)}
        {formatStat("평균 이동 거리", `${avgDistance}m`)}
      </div>
    </div>
  );
};

const PlayerStats = ({ stats, matchStats }: Props) => {
  return (
    <div className="grid gap-4">
      <StatCard mode="squad" stat={stats.squad} matches={matchStats.squad} />
      <StatCard mode="duo" stat={stats.duo} matches={matchStats.duo} />
      <StatCard mode="solo" stat={stats.solo} matches={matchStats.solo} />
    </div>
  );
};

export default PlayerStats;
