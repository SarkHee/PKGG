import React, { useState } from "react";
import MatchDetailCard from "./MatchDetailCard.jsx";

export default function MatchDetailExpandable({ match }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`match-expandable-card${open ? " open" : ""}`}>
      <div className="match-expandable-header flex items-center justify-between gap-2">
        <div className="flex-1">
          <MatchDetailCard match={match} />
        </div>
        <button
          className={`expand-arrow-btn${open ? " open" : ""}`}
          aria-label={open ? "상세 닫기" : "상세 열기"}
          onClick={() => setOpen((v) => !v)}
        >
          <span style={{ display: "inline-block", transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>
            ▶
          </span>
        </button>
      </div>
      {open && (
        <div className="match-expandable-detail bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 mt-2">
          {/* 상세 정보: 팀 전체, 순위표, 팀스탯 등 (샘플) */}
          <div className="font-bold text-lg mb-2 text-blue-700">팀원 상세</div>
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="p-1">닉네임</th>
                <th className="p-1">킬</th>
                <th className="p-1">딜량</th>
                <th className="p-1">어시</th>
                <th className="p-1">생존</th>
                <th className="p-1">OP</th>
              </tr>
            </thead>
            <tbody>
              {match.teammatesDetail && match.teammatesDetail.map((t) => (
                <tr key={t.name} className="text-center border-t">
                  <td className="p-1 font-semibold">{t.name}</td>
                  <td className="p-1">{t.kills}</td>
                  <td className="p-1">{t.damage}</td>
                  <td className="p-1">{t.assists}</td>
                  <td className="p-1">{Math.floor((t.survivalTime||0)/60)}:{("0"+((t.survivalTime||0)%60)).slice(-2)}</td>
                  <td className="p-1">{t.opGrade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
