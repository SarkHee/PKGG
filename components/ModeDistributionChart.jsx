import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';

Chart.register(ArcElement, Tooltip, Legend);

const MODE_LABELS = ['경쟁전', '일반전', '이벤트전'];
const MODE_COLORS = ['#ff6384', '#36a2eb', '#ffcd56'];
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
    <div style={{ maxWidth: 320, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>모드 비율 (최근 20경기)</div>
      <Doughnut data={chartData} options={{ plugins: { legend: { display: true, position: 'bottom' } } }} />
      <div style={{ marginTop: 12, fontSize: 14, color: '#444' }}>{summary}</div>
    </div>
  );
}
