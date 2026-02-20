import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';

Chart.register(ArcElement, Tooltip, Legend);

const MODE_LABELS = ['일반게임', '경쟁전', '이벤트게임'];
const MODE_COLORS = ['#2563eb', '#dc2626', '#f59e0b'];
const MODE_ICONS = ['⚔️', '🏆', '🎉'];

export default function ModeDistributionChart({ modeDistribution }) {
  if (!modeDistribution) return null;

  // 실제 경기 수 (있으면 직접 사용, 없으면 퍼센트로 역산)
  const total        = modeDistribution.total       || 20;
  const normalCount  = modeDistribution.normalCount  ?? Math.round((modeDistribution.normal  / 100) * total);
  const rankedCount  = modeDistribution.rankedCount  ?? Math.round((modeDistribution.ranked  / 100) * total);
  const eventCount   = modeDistribution.eventCount   ?? Math.round((modeDistribution.event   / 100) * total);

  const counts = [normalCount, rankedCount, eventCount];
  const pcts   = [modeDistribution.normal, modeDistribution.ranked, modeDistribution.event];

  // 가장 많은 모드 판별
  let mainType = 0;
  if (counts[1] >= counts[0] && counts[1] >= counts[2]) mainType = 1;
  else if (counts[2] >= counts[0] && counts[2] >= counts[1]) mainType = 2;

  const summaryMap = [
    `최근 ${total}경기 중 일반게임 ${normalCount}판 (${pcts[0]}%)으로 가장 많이 플레이했습니다.`,
    `최근 ${total}경기 중 경쟁전 ${rankedCount}판 (${pcts[1]}%) — 랭크 상승에 집중하는 유저입니다.`,
    `최근 ${total}경기 중 이벤트 ${eventCount}판 (${pcts[2]}%) — 다양한 모드를 즐기는 유저입니다.`,
  ];

  const chartData = {
    labels: MODE_LABELS.map((label, i) => `${MODE_ICONS[i]} ${label} ${counts[i]}판`),
    datasets: [
      {
        data: counts,
        backgroundColor: MODE_COLORS,
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 6,
      },
    ],
  };

  return (
    <div>
      {/* 도넛 차트 */}
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div style={{ width: 220, height: 220, flexShrink: 0 }}>
          <Doughnut
            data={chartData}
            options={{
              cutout: '62%',
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) =>
                      ` ${ctx.label.replace(/[^가-힣a-zA-Z ]/g, '').trim()}: ${ctx.parsed}판 (${pcts[ctx.dataIndex]}%)`,
                  },
                },
              },
              responsive: true,
              maintainAspectRatio: false,
            }}
          />
        </div>

        {/* 범례 + 수치 */}
        <div className="flex-1 space-y-3 w-full">
          {MODE_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              {/* 색상 바 */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-700">
                    {MODE_ICONS[i]} {label}
                  </span>
                  <span className="text-sm font-black" style={{ color: MODE_COLORS[i] }}>
                    {counts[i]}판
                    <span className="text-xs font-normal text-gray-400 ml-1">({pcts[i]}%)</span>
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pcts[i]}%`,
                      backgroundColor: MODE_COLORS[i],
                    }}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* 요약 문구 */}
          <p className="text-xs text-gray-500 pt-2 border-t border-gray-100">
            {summaryMap[mainType]}
          </p>
        </div>
      </div>
    </div>
  );
}
