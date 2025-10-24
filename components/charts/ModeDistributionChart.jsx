import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';

Chart.register(ArcElement, Tooltip, Legend);

const MODE_LABELS = ['일반게임', '경쟁전', '이벤트게임'];
const MODE_COLORS = ['#2563eb', '#dc2626', '#f59e0b'];
const MODE_ICONS = ['⚔️', '🏆', '🎉'];

export default function ModeDistributionChart({ modeDistribution }) {
  if (!modeDistribution) return null;
  const dataArr = [
    modeDistribution.normal,
    modeDistribution.ranked,
    modeDistribution.event,
  ];
  const total = dataArr.reduce((a, b) => a + b, 0);

  // 성향 요약 텍스트 (PUBG OP.GG 스타일)
  let mainType = 0;
  if (dataArr[1] >= dataArr[0] && dataArr[1] >= dataArr[2]) mainType = 1;
  else if (dataArr[2] >= dataArr[0] && dataArr[2] >= dataArr[1]) mainType = 2;

  // 실제 플레이 경기 수 기반 요약
  const actualCounts = {
    normal: Math.round((modeDistribution.normal / 100) * 20),
    ranked: Math.round((modeDistribution.ranked / 100) * 20),
    event: Math.round((modeDistribution.event / 100) * 20),
  };

  let summary = '';
  if (mainType === 0) {
    summary = `최근 20경기 중 ${dataArr[0]}%를 일반게임으로 플레이했습니다. 일반게임에 특화된 유저입니다.`;
  } else if (mainType === 1) {
    summary = `최근 활동에서 경쟁전 비중이 높습니다. 랭크 상승에 집중하는 유저입니다.`;
  } else {
    summary = `이벤트게임을 자주 플레이합니다. 다양한 모드를 즐기는 유저입니다.`;
  }

  const chartData = {
    labels: MODE_LABELS.map((label, i) => `${MODE_ICONS[i]} ${label}`),
    datasets: [
      {
        data: dataArr,
        backgroundColor: MODE_COLORS,
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div style={{ maxWidth: 300, margin: '0 auto' }}>
        <Doughnut
          data={chartData}
          options={{
            plugins: {
              legend: {
                display: true,
                position: 'bottom',
                labels: {
                  padding: 15,
                  usePointStyle: true,
                  font: {
                    size: 12,
                  },
                },
              },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    return `${context.label}: ${context.parsed}%`;
                  },
                },
              },
            },
            responsive: true,
            maintainAspectRatio: true,
          }}
        />
      </div>
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center px-2">
        {summary}
      </div>
    </div>
  );
}
