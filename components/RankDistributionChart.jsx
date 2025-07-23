import React, { useState, useEffect } from "react";

/**
 * 랭크 점수 분포(전체 유저 중 내 위치) 차트 (op.gg 스타일)
 * @param {Object} props
 * @param {Array<number>} props.distribution - 점수 구간별 유저 수 배열
 * @param {number} props.myScore - 내 점수
 */
export default function RankDistributionChart({ distribution, myScore }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="text-gray-500 dark:text-gray-400">로딩 중...</div>;
  }

  if (!Array.isArray(distribution) || distribution.length === 0) return <div className="text-gray-500 dark:text-gray-400">점수 분포 데이터가 없습니다.</div>;
  const max = Math.max(...distribution);
  const myIdx = Math.floor(myScore / 100); // 예시: 100점 단위 구간
  return (
    <div className="rank-distribution-chart bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mt-8">
      <div className="font-bold text-base mb-2 text-blue-700 dark:text-blue-300">랭크 점수 분포</div>
      <div className="flex items-end gap-1 h-32">
        {distribution.map((v, i) => (
          <div key={i} style={{width:8, height:`${(v/max)*100}%`, background:i===myIdx?"#38bdf8":"#d1d5db", borderRadius:2, position:'relative'}}>
            {i===myIdx && <div style={{position:'absolute',top:-18,left:-8,color:'#38bdf8',fontWeight:700,fontSize:12}}>내 점수</div>}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>낮음</span>
        <span>높음</span>
      </div>
    </div>
  );
}
