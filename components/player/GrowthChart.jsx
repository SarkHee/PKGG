// components/player/GrowthChart.jsx
// 플레이어 성장 추적 차트 (Line chart — chart.js)

import { useEffect, useRef, useState } from 'react';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

const METRICS = [
  { key: 'score',          label: 'PKGG MMR',   color: '#A78BFA', unit: '' },
  { key: 'avgDamage',      label: '평균딜량',     color: '#60A5FA', unit: '딜' },
  { key: 'avgKills',       label: '평균킬',       color: '#34D399', unit: '킬' },
  { key: 'winRate',        label: '승률',         color: '#FBBF24', unit: '%' },
  { key: 'top10Rate',      label: 'Top10%',       color: '#F87171', unit: '%' },
];

function fmtDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function GrowthChart({ nickname, shard = 'steam' }) {
  const canvasRef  = useRef(null);
  const chartRef   = useRef(null);
  const [snapshots, setSnapshots] = useState([]);
  const [active,    setActive]    = useState('score');
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  useEffect(() => {
    if (!nickname) return;
    setLoading(true);
    fetch(`/api/pubg/growth?nickname=${encodeURIComponent(nickname)}&shard=${shard}`)
      .then((r) => r.json())
      .then(({ snapshots: s, error: e }) => {
        if (e) setError(e);
        else setSnapshots(s || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [nickname, shard]);

  useEffect(() => {
    if (!canvasRef.current || snapshots.length < 2) return;
    if (chartRef.current) chartRef.current.destroy();

    const metric = METRICS.find((m) => m.key === active) || METRICS[0];
    const labels  = snapshots.map((s) => fmtDate(s.capturedAt));
    const values  = snapshots.map((s) => s[metric.key]);
    const minVal  = Math.min(...values);
    const maxVal  = Math.max(...values);
    const padding = (maxVal - minVal) * 0.15 || 10;

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: metric.label,
          data: values,
          borderColor: metric.color,
          backgroundColor: metric.color + '20',
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: snapshots.length <= 10 ? 5 : 3,
          pointHoverRadius: 7,
          pointBackgroundColor: metric.color,
          pointBorderColor: '#1F2937',
          pointBorderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            grid:  { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#9CA3AF', font: { size: 11 }, maxTicksLimit: 12 },
          },
          y: {
            min:  Math.max(0, minVal - padding),
            max:  maxVal + padding,
            grid:  { color: 'rgba(255,255,255,0.05)' },
            ticks: {
              color: '#9CA3AF',
              font: { size: 11 },
              callback: (v) => `${Math.round(v * 10) / 10}${metric.unit}`,
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.95)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              title: (items) => {
                const idx = items[0].dataIndex;
                return new Date(snapshots[idx].capturedAt).toLocaleDateString('ko-KR');
              },
              label: (ctx) =>
                ` ${metric.label}: ${ctx.raw}${metric.unit}`,
              afterLabel: (ctx) => {
                const idx = ctx.dataIndex;
                if (idx === 0) return '';
                const prev  = snapshots[idx - 1][metric.key];
                const curr  = snapshots[idx][metric.key];
                const delta = curr - prev;
                const sign  = delta >= 0 ? '▲' : '▼';
                const abs   = Math.abs(Math.round(delta * 100) / 100);
                return ` ${sign} ${abs}${metric.unit} (이전 대비)`;
              },
            },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [snapshots, active]);

  if (loading) {
    return (
      <div className="bg-gray-800/60 rounded-xl border border-gray-700 p-6 text-center text-gray-500 text-sm">
        성장 데이터 로딩 중…
      </div>
    );
  }

  if (error || snapshots.length === 0) {
    return (
      <div className="bg-gray-800/60 rounded-xl border border-gray-700 p-6 text-center text-gray-500 text-sm">
        {snapshots.length === 0
          ? '아직 성장 데이터가 없습니다. 클랜 배치 업데이트 후 기록됩니다.'
          : error}
      </div>
    );
  }

  const metric = METRICS.find((m) => m.key === active) || METRICS[0];
  const latest = snapshots[snapshots.length - 1];
  const first  = snapshots[0];
  const delta  = latest[active] - first[active];
  const sign   = delta >= 0 ? '+' : '';
  const pct    = first[active] !== 0
    ? ((delta / first[active]) * 100).toFixed(1)
    : '∞';

  return (
    <div className="bg-gray-800/60 rounded-xl border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="font-bold text-gray-200 text-lg">📈 성장 추적</h3>

        {/* 변화량 요약 */}
        <div className="text-right">
          <div className="text-xs text-gray-500">
            {fmtDate(first.capturedAt)} → {fmtDate(latest.capturedAt)}
          </div>
          <div
            className="text-sm font-bold"
            style={{ color: delta >= 0 ? '#34D399' : '#F87171' }}
          >
            {sign}{Math.round(delta * 100) / 100}{metric.unit}
            <span className="text-xs text-gray-400 ml-1">({sign}{pct}%)</span>
          </div>
        </div>
      </div>

      {/* 지표 탭 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setActive(m.key)}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
            style={
              active === m.key
                ? { backgroundColor: m.color + '30', color: m.color, border: `1px solid ${m.color}` }
                : { backgroundColor: 'transparent', color: '#6B7280', border: '1px solid #374151' }
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* 차트 */}
      <div className="relative h-52">
        <canvas ref={canvasRef} />
      </div>

      <p className="text-xs text-gray-600 mt-3 text-right">
        총 {snapshots.length}회 스냅샷 · 클랜 배치 업데이트마다 기록
      </p>
    </div>
  );
}
