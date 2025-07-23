import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function RecentDamageTrendChart({ matches }) {
  if (!Array.isArray(matches) || matches.length === 0) {
    return <div style={{ color: '#888', textAlign: 'center', padding: 16 }}>최근 경기 데이터가 없습니다.</div>;
  }
  // 오래된 순서로 정렬
  const sorted = [...matches].sort((a, b) => new Date(a.matchTimestamp) - new Date(b.matchTimestamp));
  const labels = sorted.map((m, i) => `${i + 1}경기`);
  const data = {
    labels,
    datasets: [
      {
        label: '딜량',
           data: sorted.map(m => (m.damage ?? 0).toFixed(1)),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.15)',
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 7,
        fill: true,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: '최근 20경기 딜량 추이',
        color: '#2563eb',
        font: { size: 20, weight: 'bold' },
        padding: { bottom: 16 },
      },
      tooltip: {
        callbacks: {
          label: ctx => `딜량: ${ctx.raw}`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: '경기', color: '#888' },
        ticks: { color: '#888' },
        grid: { color: 'rgba(209,213,219,0.15)' },
      },
      y: {
        title: { display: true, text: '딜량', color: '#888' },
        beginAtZero: true,
        ticks: { color: '#888' },
        grid: { color: 'rgba(209,213,219,0.15)' },
      },
    },
  };
  return (
    <div style={{ width: '100%', height: 320, background: '#f8fafc', borderRadius: 12, padding: 16, margin: '32px 0' }}>
      <Line data={data} options={options} />
    </div>
  );
}
