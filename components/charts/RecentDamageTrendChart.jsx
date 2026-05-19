import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
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
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function RecentDamageTrendChart({ matches }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  if (!Array.isArray(matches) || matches.length === 0) {
    return (
      <div className="text-center text-gray-400 dark:text-gray-500 py-4">
        최근 경기 데이터가 없습니다.
      </div>
    );
  }

  const sorted = [...matches].sort(
    (a, b) => new Date(b.matchTimestamp) - new Date(a.matchTimestamp)
  );
  const labels = sorted.map((m, i) => `${i + 1}경기`);

  const tickColor  = isDark ? '#9CA3AF' : '#6B7280';
  const gridColor  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const tooltipBg  = isDark ? '#1f2937' : '#ffffff';
  const tooltipTitle = isDark ? '#f9fafb' : '#111827';
  const tooltipBody  = isDark ? '#d1d5db' : '#374151';

  const data = {
    labels,
    datasets: [
      {
        label: '딜량',
        data: sorted.map((m) => (m.damage ?? 0).toFixed(1)),
        borderColor: '#2563eb',
        backgroundColor: isDark ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.15)',
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBorderColor: isDark ? '#1f2937' : '#ffffff',
        pointBorderWidth: 2,
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
        color: isDark ? '#60a5fa' : '#2563eb',
        font: { size: 16, weight: 'bold' },
        padding: { bottom: 14 },
      },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: tooltipTitle,
        bodyColor: tooltipBody,
        borderColor: 'rgba(37,99,235,0.3)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx) => {
            const match = sorted[ctx.dataIndex];
            const date = new Date(match.matchTimestamp).toLocaleDateString('ko-KR', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            return [`딜량: ${ctx.raw}`, `날짜: ${date}`];
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: '경기 (1경기: 가장 오래된 경기 → 최근 경기)',
          color: tickColor,
          font: { size: 12 },
        },
        ticks: { color: tickColor, maxTicksLimit: 10 },
        grid: { color: gridColor },
        border: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
      },
      y: {
        title: { display: true, text: '딜량', color: tickColor },
        beginAtZero: true,
        ticks: { color: tickColor },
        grid: { color: gridColor },
        border: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' },
      },
    },
  };

  return (
    <div className="w-full bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 my-2" style={{ height: 300 }}>
      <Line data={data} options={options} />
    </div>
  );
}
