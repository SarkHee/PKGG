// components/player/GrowthChart.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
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
  { key: 'score',     label: 'MMR',   unit: '',   color: '#7C3AED', bg: '#EDE9FE', icon: '🏆' },
  { key: 'avgDamage', label: '평균딜', unit: '딜', color: '#2563EB', bg: '#DBEAFE', icon: '⚔️' },
  { key: 'avgKills',  label: '평균킬', unit: 'K',  color: '#059669', bg: '#D1FAE5', icon: '🎯' },
  { key: 'winRate',   label: '승률',   unit: '%',  color: '#D97706', bg: '#FEF3C7', icon: '🥇' },
  { key: 'top10Rate', label: 'Top10',  unit: '%',  color: '#DC2626', bg: '#FEE2E2', icon: '📊' },
];

const PERIODS = [
  { key: '7d',  label: '7일' },
  { key: '30d', label: '30일' },
  { key: 'all', label: '전체' },
];

function fmtDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function fmtFull(iso) {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

export default function GrowthChart({ nickname, shard = 'steam' }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);
  const [snapshots, setSnapshots] = useState([]);
  const [active,    setActive]    = useState('score');
  const [period,    setPeriod]    = useState('all');
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

  const filteredSnaps = useMemo(() => {
    if (period === 'all') return snapshots;
    const days = period === '7d' ? 7 : 30;
    const cutoff = Date.now() - days * 86400000;
    const f = snapshots.filter((s) => new Date(s.capturedAt).getTime() >= cutoff);
    return f.length >= 2 ? f : snapshots.slice(-Math.min(snapshots.length, days));
  }, [snapshots, period]);

  useEffect(() => {
    if (!canvasRef.current || filteredSnaps.length < 2) return;
    if (chartRef.current) chartRef.current.destroy();

    const metric = METRICS.find((m) => m.key === active) || METRICS[0];
    const labels  = filteredSnaps.map((s) => fmtDate(s.capturedAt));
    const values  = filteredSnaps.map((s) => s[metric.key]);
    const minVal  = Math.min(...values);
    const maxVal  = Math.max(...values);
    const padding = (maxVal - minVal) * 0.2 || 10;

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: metric.label,
          data: values,
          borderColor: metric.color,
          backgroundColor: metric.color + '14',
          fill: true,
          tension: 0.45,
          borderWidth: 2.5,
          pointRadius: filteredSnaps.length <= 14 ? 4 : 2,
          pointHoverRadius: 7,
          pointBackgroundColor: metric.color,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            grid:  { color: 'rgba(0,0,0,0.06)' },
            ticks: { color: '#9CA3AF', font: { size: 11 }, maxTicksLimit: 10 },
            border: { color: 'rgba(0,0,0,0.08)' },
          },
          y: {
            min:  Math.max(0, minVal - padding),
            max:  maxVal + padding,
            grid:  { color: 'rgba(0,0,0,0.06)' },
            ticks: {
              color: '#9CA3AF',
              font: { size: 11 },
              callback: (v) => `${Math.round(v * 10) / 10}${metric.unit}`,
            },
            border: { color: 'rgba(0,0,0,0.08)' },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#ffffff',
            titleColor: '#111827',
            bodyColor: '#374151',
            borderColor: metric.color + '40',
            borderWidth: 1,
            padding: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            callbacks: {
              title: (items) => fmtFull(filteredSnaps[items[0].dataIndex]?.capturedAt),
              label: (ctx) => ` ${metric.label}: ${ctx.raw}${metric.unit}`,
              afterLabel: (ctx) => {
                const idx = ctx.dataIndex;
                if (idx === 0) return '';
                const delta = filteredSnaps[idx][metric.key] - filteredSnaps[idx - 1][metric.key];
                const sign  = delta >= 0 ? '▲' : '▼';
                return ` ${sign} ${Math.abs(Math.round(delta * 100) / 100)}${metric.unit}`;
              },
            },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [filteredSnaps, active]);

  /* ── 로딩 / 빈 상태 ── */
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
        <div className="inline-block w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-gray-400 text-sm">📈 성장 기록 수집 중... 블루존 피하는 중</p>
      </div>
    );
  }

  if (error || snapshots.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
        <div className="text-3xl mb-3">📉</div>
        <p className="text-gray-600 text-sm font-medium">아직 성장 기록이 없습니다</p>
        <p className="text-gray-400 text-xs mt-1">플레이어 페이지 방문 시 하루 1회 자동 저장됩니다</p>
      </div>
    );
  }

  const metric = METRICS.find((m) => m.key === active) || METRICS[0];
  const latest = filteredSnaps[filteredSnaps.length - 1];
  const first  = filteredSnaps[0];
  const delta  = latest[active] - first[active];
  const sign   = delta >= 0 ? '+' : '';
  const pct    = first[active] !== 0 ? ((delta / first[active]) * 100).toFixed(1) : '∞';
  const isUp   = delta >= 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">

      {/* ── 상단 헤더 ── */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-lg">📈</span>
          <span className="font-bold text-gray-800 text-base">성장 추적</span>
          <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 border border-gray-200">
            {snapshots.length}회 기록
          </span>
        </div>

        {/* 기간 필터 */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                period === p.key
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 지표 카드 ── */}
      <div className="grid grid-cols-5 gap-0 border-b border-gray-100 overflow-x-auto">
        {METRICS.map((m, i) => {
          const lv    = latest[m.key];
          const fv    = first[m.key];
          const d     = lv - fv;
          const up    = d >= 0;
          const isAct = active === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setActive(m.key)}
              className={`relative flex flex-col items-center py-3 px-1.5 sm:px-2 text-center transition-all min-w-[60px]
                ${i > 0 ? 'border-l border-gray-100' : ''}
                ${isAct ? '' : 'hover:bg-gray-50'}`}
              style={isAct ? { backgroundColor: m.bg } : {}}
            >
              {/* 활성 인디케이터 바 */}
              {isAct && (
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: m.color }} />
              )}
              <span className="text-sm mb-1">{m.icon}</span>
              <div className="text-[11px] text-gray-400 mb-0.5">{m.label}</div>
              <div className="text-sm font-bold" style={{ color: isAct ? m.color : '#374151' }}>
                {typeof lv === 'number' ? (Number.isInteger(lv) ? lv : lv.toFixed(1)) : '–'}{m.unit}
              </div>
              {d !== 0 && (
                <div className={`text-[10px] font-semibold mt-0.5 ${up ? 'text-emerald-600' : 'text-red-500'}`}>
                  {up ? '▲' : '▼'} {Math.abs(Math.round(d * 10) / 10)}{m.unit}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── 선택 지표 요약 배너 ── */}
      <div
        className="px-4 sm:px-5 py-3 flex items-center justify-between flex-wrap gap-2 border-b border-gray-100"
        style={{ backgroundColor: metric.bg + 'aa' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{metric.icon}</span>
          <span className="text-gray-700 text-sm font-semibold">{metric.label}</span>
          <span className="text-gray-400 text-xs">{fmtDate(first.capturedAt)} → {fmtDate(latest.capturedAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-black" style={{ color: metric.color }}>
            {typeof latest[active] === 'number'
              ? (Number.isInteger(latest[active]) ? latest[active] : latest[active].toFixed(1))
              : '–'}{metric.unit}
          </span>
          <div
            className={`flex items-center gap-0.5 text-sm font-bold px-2.5 py-0.5 rounded-full border ${
              isUp
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-600 border-red-200'
            }`}
          >
            {isUp ? '▲' : '▼'} {sign}{Math.round(Math.abs(delta) * 10) / 10}{metric.unit}
            <span className="text-xs opacity-60 ml-1">({sign}{pct}%)</span>
          </div>
        </div>
      </div>

      {/* ── 차트 ── */}
      <div className="px-3 sm:px-5 pt-4 pb-2">
        {filteredSnaps.length < 2 ? (
          <div className="h-56 flex flex-col items-center justify-center gap-2 text-gray-400">
            <span className="text-2xl">📊</span>
            <span className="text-sm">데이터가 2개 이상 필요합니다</span>
          </div>
        ) : (
          <div className="relative h-56">
            <canvas ref={canvasRef} />
          </div>
        )}
      </div>

      {/* ── 푸터 ── */}
      <div className="px-5 pb-4 pt-1 flex items-center justify-between">
        <p className="text-xs text-gray-300">
          {filteredSnaps.length}개 표시 중 · 하루 1회 자동 저장
        </p>
        <p className="text-xs text-gray-300">
          최근 기록: {fmtFull(latest.capturedAt)}
        </p>
      </div>
    </div>
  );
}
