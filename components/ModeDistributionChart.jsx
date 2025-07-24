import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';

Chart.register(ArcElement, Tooltip, Legend);

const MODE_LABELS = ['랭크게임', '일반게임', '이벤트게임'];
const MODE_COLORS = ['#dc2626', '#2563eb', '#f59e0b'];
const MODE_ICONS = ['🏆', '⚔️', '🎉'];

export default function ModeDistributionChart({ modeDistribution }) {
  if (!modeDistribution) return null;
  const dataArr = [modeDistribution.ranked, modeDistribution.normal, modeDistribution.event];
  const total = dataArr.reduce((a, b) => a + b, 0);

  // 성향 요약 텍스트
  let mainType = 0;
  if (dataArr[1] >= dataArr[0] && dataArr[1] >= dataArr[2]) mainType = 1;
  else if (dataArr[2] >= dataArr[0] && dataArr[2] >= dataArr[1]) mainType = 2;
  // 예: 최근 20경기 중 65%를 일반전으로 플레이했습니다. 일반전에 특화된 유저입니다.
  const summary = `최근 20경기 중 ${dataArr[mainType]}%를 ${MODE_LABELS[mainType]}으로 플레이했습니다. ${MODE_LABELS[mainType]}에 특화된 유저입니다.`;

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
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 text-center">
        게임 모드 분포 (최근 20경기)
      </h3>
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
                    size: 12
                  }
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return `${context.label}: ${context.parsed}%`;
                  }
                }
              }
            },
            responsive: true,
            maintainAspectRatio: true
          }} 
        />
      </div>
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center px-2">
        {summary}
      </div>
    </div>
  );
}
