import React from "react";
import RankedSummaryCard from "./RankedSummaryCard";
import RankedModeCard from "./RankedModeCard";

export default function RankedStatsSection({ rankedSummary, rankedStats }) {
  // rankedSummary와 rankedStats가 존재하면 표시 (rounds > 0 조건 제거)
  const hasRanked = rankedSummary && rankedStats && Array.isArray(rankedStats) && rankedStats.length > 0;
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
        <div className="rounded-xl border border-dashed border-gray-400 bg-gray-100 dark:bg-gray-800 p-6 text-center text-lg font-semibold text-gray-500 dark:text-gray-300 shadow-sm my-4">
          <div className="mb-2 text-2xl">🚧</div>
          <div>경쟁전 데이터가 없습니다.<br /><span className="text-blue-500 font-bold">추후 업데이트</span></div>
        </div>
      )}
    </section>
  );
}
