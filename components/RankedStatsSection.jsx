import React from "react";
import RankedSummaryCard from "./RankedSummaryCard";
import RankedModeCard from "./RankedModeCard";

export default function RankedStatsSection({ rankedSummary, rankedStats }) {
  const hasRanked = rankedSummary && rankedStats && rankedStats.some(r => r.rounds > 0);
  return (
    <section>
      <h2>경쟁전 요약</h2>
      {hasRanked ? (
        <>
          <RankedSummaryCard summary={rankedSummary} />
          <div>
            {rankedStats.map(r => (
              <RankedModeCard key={r.mode} mode={r} />
            ))}
          </div>
        </>
      ) : (
        <div>경쟁전 데이터가 없습니다.</div>
      )}
    </section>
  );
}
