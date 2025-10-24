// PK.GG/components/MmrTrendChart.js

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

/**
 * MMR 추이 그래프를 렌더링하는 컴포넌트.
 * @param {Object} props
 * @param {Array<Object>} props.matches - 백엔드에서 받아온 최근 매치 데이터 배열. 각 객체는 avgMmr 및 matchTimestamp 필드를 포함해야 함.
 */
const MmrTrendChart = ({ matches }) => {
  if (!Array.isArray(matches) || matches.length === 0) {
    return (
      <div className="card text-center text-gray-500 bg-gray-100 rounded-lg shadow-inner">
        <p>
          최근 MMR 추이 데이터를 불러올 수 없습니다. 경기를 더 플레이해보세요!
        </p>
      </div>
    );
  }

  // PK.GG 내부 점수 기반으로 정렬 및 시각화
  const sortedMatches = [...matches].sort((a, b) => {
    const dateA = new Date(a.matchTimestamp);
    const dateB = new Date(b.matchTimestamp);
    return dateA.getTime() - dateB.getTime();
  });

  const labels = sortedMatches.map((match, index) => {
    const date = new Date(match.matchTimestamp);
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  });

  const mmrData = sortedMatches.map((match) => {
    return typeof match.mmrScore === 'number' && !isNaN(match.mmrScore)
      ? match.mmrScore
      : 0;
  });

  const hasValidMmrData = mmrData.some((mmr) => mmr > 0);
  if (!hasValidMmrData) {
    return (
      <div className="card text-center text-gray-500 bg-gray-100 rounded-lg shadow-inner">
        <p>
          유효한 MMR 추이 데이터가 부족합니다. (MMR이 모두 0 또는 계산 불가)
        </p>
      </div>
    );
  }

  const data = {
    labels: labels,
    datasets: [
      {
        label: 'MMR',
        data: mmrData,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.3,
        fill: false,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'rgb(107, 114, 128)',
        },
      },
      title: {
        display: true,
        text: '최근 경기 MMR 추이',
        color: 'rgb(17, 24, 39)',
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `MMR: ${context.raw}`;
          },
          title: function (context) {
            return context[0].label;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: '경기 (오래된 순 -> 최신)',
          color: 'rgb(75, 85, 99)',
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          maxRotation: 45,
          minRotation: 45,
        },
        grid: {
          color: 'rgba(209, 213, 219, 0.2)',
        },
      },
      y: {
        title: {
          display: true,
          text: 'MMR',
          color: 'rgb(75, 85, 99)',
        },
        beginAtZero: false,
        ticks: {
          color: 'rgb(107, 114, 128)',
        },
        grid: {
          color: 'rgba(209, 213, 219, 0.2)',
        },
      },
    },
  };

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <Line data={data} options={options} />
    </div>
  );
};

export default MmrTrendChart;
