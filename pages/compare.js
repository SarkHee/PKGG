// pages/compare.js — 플레이어 비교 페이지

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/layout/Header';
import { useT } from '../utils/i18n';
import { getMMRTier } from '../utils/mmrCalculator';
import { toPng } from 'html-to-image';

// ── Chart.js 레이더 차트 ─────────────────────────────────────────────────────
import {
  Chart,
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

// 레이더 축 정의 — label, key, max(정규화기준), 실제값 포매터
const RADAR_AXES = [
  { label: '딜량',  key: 'avgDamage',      max: 600,  fmt: (v) => `${Math.round(v)} 딜` },
  { label: '킬',    key: 'avgKills',        max: 6,    fmt: (v) => `${v.toFixed(2)} 킬` },
  { label: '승률',  key: 'winRate',         max: 25,   fmt: (v) => `${v.toFixed(1)}%` },
  { label: 'Top10', key: 'top10Rate',       max: 70,   fmt: (v) => `${v.toFixed(1)}%` },
  { label: '생존',  key: 'avgSurviveTime',  max: 1800, fmt: (v) => `${Math.floor(v/60)}분 ${Math.round(v%60)}초` },
  { label: '어시',  key: 'avgAssists',      max: 3,    fmt: (v) => `${v.toFixed(2)}` },
];

function normalize(val, max) {
  return Math.min(100, Math.round((val / max) * 100));
}

function RadarChart({ playerA, playerB }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const toData = (p) =>
      RADAR_AXES.map(({ key, max }) => normalize(p[key] ?? 0, max));

    chartRef.current = new Chart(canvasRef.current, {
      type: 'radar',
      data: {
        labels: RADAR_AXES.map(({ label }) => label),
        datasets: [
          {
            label: playerA.nickname,
            data: toData(playerA),
            borderColor: '#60A5FA',
            backgroundColor: 'rgba(59,130,246,0.35)',
            borderWidth: 2.5,
            pointBackgroundColor: '#60A5FA',
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: '#93C5FD',
          },
          {
            label: playerB.nickname,
            data: toData(playerB),
            borderColor: '#F87171',
            backgroundColor: 'rgba(239,68,68,0.35)',
            borderWidth: 2.5,
            pointBackgroundColor: '#F87171',
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: '#FCA5A5',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: { mode: 'index' },
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 25,
              color: '#6B7280',
              font: { size: 9 },
              backdropColor: 'transparent',
              callback: (v) => `${v}`,
            },
            grid:       { color: 'rgba(255,255,255,0.07)' },
            angleLines: { color: 'rgba(255,255,255,0.15)' },
            pointLabels: {
              color: '#E5E7EB',
              font: { size: 13, weight: 'bold' },
            },
          },
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#D1D5DB',
              font: { size: 12 },
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 10,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.96)',
            borderColor: 'rgba(255,255,255,0.12)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              title: (items) => RADAR_AXES[items[0].dataIndex].label + ' 비교',
              label: (ctx) => {
                const player = ctx.datasetIndex === 0 ? playerA : playerB;
                const axis   = RADAR_AXES[ctx.dataIndex];
                const raw    = player[axis.key] ?? 0;
                const score  = ctx.raw;
                const winner = (() => {
                  const vA = playerA[axis.key] ?? 0;
                  const vB = playerB[axis.key] ?? 0;
                  if (ctx.datasetIndex === 0) return vA > vB ? ' ✓' : '';
                  return vB > vA ? ' ✓' : '';
                })();
                return ` ${ctx.dataset.label}: ${axis.fmt(raw)}  (${score}/100점)${winner}`;
              },
            },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [playerA, playerB]);

  // 축별 실제 수치 비교 테이블
  return (
    <div className="flex flex-col gap-4">
      <canvas ref={canvasRef} />
      {/* 축 기준 안내 */}
      <div className="grid grid-cols-3 gap-1 text-center">
        {RADAR_AXES.map(({ label, key, max, fmt }) => {
          const vA = playerA[key] ?? 0;
          const vB = playerB[key] ?? 0;
          const aWins = vA > vB;
          const bWins = vB > vA;
          return (
            <div key={key} className="bg-gray-900/60 rounded-lg py-2 px-2">
              <div className="text-xs text-gray-500 mb-1">{label}<span className="text-gray-600"> /100</span></div>
              <div className="flex justify-between items-center gap-1 text-xs font-semibold">
                <span className={aWins ? 'text-blue-400' : 'text-gray-400'}>{fmt(vA)}</span>
                <span className="text-gray-600">:</span>
                <span className={bWins ? 'text-red-400' : 'text-gray-400'}>{fmt(vB)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-600 text-center">
        각 축: 딜량 최대 600딜 · 킬 최대 6킬 · 승률 최대 25% · Top10 최대 70% · 생존 최대 30분 · 어시 최대 3 기준으로 정규화
      </p>
    </div>
  );
}

// ── 스탯 비교 바 ─────────────────────────────────────────────────────────────
function StatRow({ label, valA, valB, format }) {
  const a   = parseFloat(valA) || 0;
  const b   = parseFloat(valB) || 0;
  const max = Math.max(a, b, 0.001);
  const pA  = (a / max) * 100;
  const pB  = (b / max) * 100;
  const fmtA = format ? format(a) : a;
  const fmtB = format ? format(b) : b;
  const aWins = a > b;
  const bWins = b > a;

  return (
    <div className="py-3 border-b border-gray-700/50 last:border-0">
      {/* 라벨 */}
      <div className="text-center text-xs text-gray-400 mb-2">{label}</div>
      <div className="flex items-center gap-2">
        {/* Player A */}
        <div className="flex-1 flex flex-col items-end gap-1">
          <span className={`text-sm font-bold ${aWins ? 'text-blue-400' : 'text-gray-300'}`}>{fmtA}</span>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${aWins ? 'bg-blue-500' : 'bg-blue-800'}`}
              style={{ width: `${pA}%`, marginLeft: 'auto', float: 'right' }}
            />
          </div>
        </div>
        {/* 중앙 구분 */}
        <div className="w-6 text-center text-gray-500 text-xs shrink-0">VS</div>
        {/* Player B */}
        <div className="flex-1 flex flex-col items-start gap-1">
          <span className={`text-sm font-bold ${bWins ? 'text-red-400' : 'text-gray-300'}`}>{fmtB}</span>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${bWins ? 'bg-red-500' : 'bg-red-800'}`}
              style={{ width: `${pB}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 플레이어 카드 ──────────────────────────────────────────────────────────────
function PlayerCard({ player, side }) {
  const tier = getMMRTier(player.mmr);
  const color = side === 'A' ? 'border-blue-500 bg-blue-900/20' : 'border-red-500 bg-red-900/20';
  const textColor = side === 'A' ? 'text-blue-400' : 'text-red-400';
  const surv = Math.floor(player.avgSurviveTime / 60);
  const survSec = player.avgSurviveTime % 60;

  return (
    <div className={`rounded-xl border-2 ${color} p-5 flex flex-col items-center gap-3 flex-1`}>
      {/* 닉네임 */}
      <Link
        href={`/player/steam/${encodeURIComponent(player.nickname)}`}
        className={`text-xl font-bold ${textColor} hover:underline`}
      >
        {player.nickname}
      </Link>

      {/* MMR 배지 */}
      <div
        className="px-4 py-1 rounded-full text-sm font-semibold"
        style={{ backgroundColor: tier.color + '30', color: tier.color, border: `1px solid ${tier.color}60` }}
      >
        {tier.emoji} {tier.label} {player.mmr.toLocaleString()}
      </div>

      {/* 주요 스탯 요약 */}
      {player.hasData ? (
        <div className="w-full grid grid-cols-3 gap-2 text-center">
          {[
            { label: '평균딜', value: player.avgDamage.toLocaleString() },
            { label: '평균킬', value: player.avgKills.toFixed(2) },
            { label: '승률',   value: player.winRate.toFixed(1) + '%' },
            { label: 'Top10',  value: player.top10Rate.toFixed(1) + '%' },
            { label: '생존',   value: `${surv}m${String(Math.round(survSec)).padStart(2,'0')}s` },
            { label: '게임수', value: player.roundsPlayed.toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-800/60 rounded-lg py-2 px-1">
              <div className="text-xs text-gray-400">{label}</div>
              <div className={`text-sm font-semibold ${textColor}`}>{value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-500 text-sm">이번 시즌 데이터 없음</div>
      )}

      {player.primaryMode && (
        <div className="text-xs text-gray-500">주 모드: {player.primaryMode}</div>
      )}
    </div>
  );
}

// ── 배틀 공유 카드 (이미지 캡처용, 화면 밖 렌더링) ─────────────────────────
function BattleShareCard({ playerA, playerB, cardRef }) {
  const tierA = getMMRTier(playerA.mmr);
  const tierB = getMMRTier(playerB.mmr);
  const winner = playerA.mmr > playerB.mmr ? playerA.nickname
               : playerB.mmr > playerA.mmr ? playerB.nickname
               : null;

  const stats = [
    { label: '평균딜', dispA: Math.round(playerA.avgDamage).toLocaleString(), dispB: Math.round(playerB.avgDamage).toLocaleString(), rawA: playerA.avgDamage, rawB: playerB.avgDamage },
    { label: '평균킬', dispA: playerA.avgKills?.toFixed(2), dispB: playerB.avgKills?.toFixed(2), rawA: playerA.avgKills, rawB: playerB.avgKills },
    { label: '승률',   dispA: playerA.winRate?.toFixed(1) + '%', dispB: playerB.winRate?.toFixed(1) + '%', rawA: playerA.winRate, rawB: playerB.winRate },
    { label: 'Top10',  dispA: playerA.top10Rate?.toFixed(1) + '%', dispB: playerB.top10Rate?.toFixed(1) + '%', rawA: playerA.top10Rate, rawB: playerB.top10Rate },
  ];

  const s = (obj) => obj; // inline style helper

  return (
    <div style={{ position: 'absolute', top: 0, left: '-9999px', overflow: 'hidden', pointerEvents: 'none' }}>
    <div ref={cardRef} style={s({ width: '480px', backgroundColor: '#0f172a', borderRadius: '12px', overflow: 'hidden', fontFamily: 'Arial, sans-serif' })}>
      {/* 헤더 */}
      <div style={s({ background: 'linear-gradient(135deg,#1e3a5f,#1e1b4b)', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
        <span style={s({ color: '#60a5fa', fontWeight: 800, fontSize: '14px' })}>⚔️ PKGG BATTLE RESULT</span>
        <span style={s({ color: '#475569', fontSize: '11px' })}>pk.gg</span>
      </div>

      {/* 플레이어 카드 */}
      <div style={s({ display: 'flex', padding: '14px 16px', gap: '10px', alignItems: 'center' })}>
        <div style={s({ flex: 1, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)', borderRadius: '10px', padding: '12px', textAlign: 'center' })}>
          <div style={s({ color: '#60a5fa', fontWeight: 700, fontSize: '15px', marginBottom: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>{playerA.nickname}</div>
          <div style={s({ color: tierA.color, fontSize: '11px', fontWeight: 600 })}>{tierA.emoji} {tierA.label}</div>
          <div style={s({ color: tierA.color, fontSize: '20px', fontWeight: 900 })}>{playerA.mmr.toLocaleString()}</div>
        </div>
        <div style={s({ color: '#475569', fontWeight: 900, fontSize: '18px' })}>VS</div>
        <div style={s({ flex: 1, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px', padding: '12px', textAlign: 'center' })}>
          <div style={s({ color: '#f87171', fontWeight: 700, fontSize: '15px', marginBottom: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>{playerB.nickname}</div>
          <div style={s({ color: tierB.color, fontSize: '11px', fontWeight: 600 })}>{tierB.emoji} {tierB.label}</div>
          <div style={s({ color: tierB.color, fontSize: '20px', fontWeight: 900 })}>{playerB.mmr.toLocaleString()}</div>
        </div>
      </div>

      {/* 스탯 바 */}
      <div style={s({ padding: '0 16px 14px' })}>
        {stats.map(({ label, dispA, dispB, rawA, rawB }) => {
          const max = Math.max(rawA || 0, rawB || 0, 0.001);
          const wA = ((rawA || 0) / max) * 100;
          const wB = ((rawB || 0) / max) * 100;
          const aWins = (rawA || 0) >= (rawB || 0);
          return (
            <div key={label} style={s({ marginBottom: '8px' })}>
              <div style={s({ color: '#64748b', fontSize: '10px', textAlign: 'center', marginBottom: '3px' })}>{label}</div>
              <div style={s({ display: 'flex', alignItems: 'center', gap: '8px' })}>
                <div style={s({ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' })}>
                  <span style={s({ color: aWins ? '#60a5fa' : '#475569', fontSize: '12px', fontWeight: 700 })}>{dispA}</span>
                  <div style={s({ width: '80px', height: '4px', background: '#1e293b', borderRadius: '2px' })}>
                    <div style={s({ width: `${wA}%`, height: '100%', background: aWins ? '#3b82f6' : '#1e40af', borderRadius: '2px', marginLeft: 'auto' })} />
                  </div>
                </div>
                <div style={s({ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' })}>
                  <div style={s({ width: '80px', height: '4px', background: '#1e293b', borderRadius: '2px' })}>
                    <div style={s({ width: `${wB}%`, height: '100%', background: !aWins ? '#ef4444' : '#7f1d1d', borderRadius: '2px' })} />
                  </div>
                  <span style={s({ color: !aWins ? '#f87171' : '#475569', fontSize: '12px', fontWeight: 700 })}>{dispB}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 승자 */}
      <div style={s({ background: winner ? 'rgba(234,179,8,0.1)' : 'rgba(148,163,184,0.08)', borderTop: '1px solid rgba(234,179,8,0.2)', padding: '10px 16px', textAlign: 'center' })}>
        {winner
          ? <span style={s({ color: '#eab308', fontWeight: 800, fontSize: '14px' })}>🏆 WINNER: {winner}</span>
          : <span style={s({ color: '#94a3b8', fontWeight: 700, fontSize: '13px' })}>🤝 DRAW</span>
        }
      </div>
    </div>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function ComparePage() {
  const router       = useRouter();
  const { t }        = useT();
  const [inputA, setInputA] = useState('');
  const [inputB, setInputB] = useState('');
  const [shard, setShard]   = useState('steam');
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState(false);
  const cardRef = useRef(null);

  // URL 파라미터에서 초기값 세팅
  useEffect(() => {
    if (!router.isReady) return;
    const { a, b, shard: s } = router.query;
    if (a) setInputA(a);
    if (b) setInputB(b);
    if (s) setShard(s);
    if (a && b) fetchCompare(a, b, s || 'steam');
  }, [router.isReady]);

  async function fetchCompare(a, b, sh) {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res  = await fetch(`/api/pubg/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}&shard=${sh}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '비교 실패');
      setData(json);
      // URL 업데이트 (공유 가능)
      router.replace(`/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}&shard=${sh}`, undefined, { shallow: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!inputA.trim() || !inputB.trim()) return;
    fetchCompare(inputA.trim(), inputB.trim(), shard);
  }

  const swapPlayers = () => {
    setInputA(inputB);
    setInputB(inputA);
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  async function handleDownloadCard() {
    if (!cardRef.current || !data) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `pkgg-${data.playerA.nickname}-vs-${data.playerB.nickname}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      alert('카드 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Head>
        <title>
          {data
            ? `${data.playerA.nickname} vs ${data.playerB.nickname} — PKGG`
            : '플레이어 비교 — PKGG'}
        </title>
        <meta
          name="description"
          content="두 PUBG 플레이어의 시즌 통계를 나란히 비교해보세요. MMR, 평균딜량, 승률, Top10% 등을 한눈에."
        />
      </Head>

      <div className="min-h-screen bg-gray-900 text-white">
        <Header />

        {/* ── 히어로 ── */}
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 py-10 px-4">
          <div className="max-w-2xl mx-auto text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">
              ⚔️ 플레이어 비교
            </h1>
            <p className="text-gray-400 text-sm">두 플레이어의 이번 시즌 통계를 나란히 비교합니다</p>
          </div>

          {/* ── 검색 폼 ── */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Player A */}
              <div className="flex-1 min-w-[120px]">
                <input
                  value={inputA}
                  onChange={(e) => setInputA(e.target.value)}
                  placeholder="플레이어 A"
                  className="w-full bg-gray-700 border border-blue-500/50 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                />
              </div>

              {/* 교환 버튼 */}
              <button
                type="button"
                onClick={swapPlayers}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="플레이어 교환"
              >
                ⇄
              </button>

              {/* Player B */}
              <div className="flex-1 min-w-[120px]">
                <input
                  value={inputB}
                  onChange={(e) => setInputB(e.target.value)}
                  placeholder="플레이어 B"
                  className="w-full bg-gray-700 border border-red-500/50 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
                />
              </div>

              {/* 서버 선택 */}
              <select
                value={shard}
                onChange={(e) => setShard(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-blue-400"
              >
                <option value="steam">Steam</option>
                <option value="kakao">Kakao</option>
                <option value="console">Console</option>
              </select>

              {/* 비교 버튼 */}
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                {loading ? '조회 중…' : '비교하기'}
              </button>
            </div>
          </form>
        </div>

        {/* ── 메인 컨텐츠 ── */}
        <div className="max-w-5xl mx-auto px-4 py-8">

          {/* 에러 */}
          {error && (
            <div className="bg-red-900/40 border border-red-500/50 rounded-xl p-5 text-center text-red-300 mb-8">
              {error}
            </div>
          )}

          {/* 로딩 */}
          {loading && (
            <div className="text-center py-20 text-gray-400">
              <div className="text-4xl mb-4 animate-pulse">⚔️</div>
              <div>플레이어 데이터 불러오는 중…</div>
            </div>
          )}

          {/* 초기 상태 */}
          {!data && !loading && !error && (
            <div className="text-center py-20 text-gray-500">
              <div className="text-5xl mb-4">⚔️</div>
              <div className="text-lg">비교할 두 플레이어 닉네임을 입력하세요</div>
              <div className="text-sm mt-2">공유 URL로 바로 비교 결과를 전달할 수 있습니다</div>
            </div>
          )}

          {/* 비교 결과 */}
          {data && !loading && (
            <>
              {/* 플레이어 카드 */}
              <div className="flex gap-4 mb-8 flex-col sm:flex-row">
                <PlayerCard player={data.playerA} side="A" />
                <div className="flex items-center justify-center text-2xl font-black text-gray-500">VS</div>
                <PlayerCard player={data.playerB} side="B" />
              </div>

              {/* 스탯 비교 바 + 레이더 차트 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* 스탯 비교 바 */}
                <div className="bg-gray-800/60 rounded-xl border border-gray-700 p-6">
                  <h2 className="text-lg font-bold mb-4 text-gray-200">📊 스탯 비교</h2>

                  {/* 상단 플레이어 레이블 */}
                  <div className="flex justify-between mb-3 text-sm font-semibold">
                    <span className="text-blue-400">{data.playerA.nickname}</span>
                    <span className="text-red-400">{data.playerB.nickname}</span>
                  </div>

                  <StatRow
                    label="PKGG MMR"
                    valA={data.playerA.mmr}
                    valB={data.playerB.mmr}
                    format={(v) => v.toLocaleString()}
                  />
                  <StatRow
                    label="평균 딜량"
                    valA={data.playerA.avgDamage}
                    valB={data.playerB.avgDamage}
                    format={(v) => v.toLocaleString()}
                  />
                  <StatRow
                    label="평균 킬"
                    valA={data.playerA.avgKills}
                    valB={data.playerB.avgKills}
                    format={(v) => v.toFixed(2)}
                  />
                  <StatRow
                    label="승률 (%)"
                    valA={data.playerA.winRate}
                    valB={data.playerB.winRate}
                    format={(v) => v.toFixed(1) + '%'}
                  />
                  <StatRow
                    label="Top 10% 진입률"
                    valA={data.playerA.top10Rate}
                    valB={data.playerB.top10Rate}
                    format={(v) => v.toFixed(1) + '%'}
                  />
                  <StatRow
                    label="평균 생존시간"
                    valA={data.playerA.avgSurviveTime}
                    valB={data.playerB.avgSurviveTime}
                    format={(v) => {
                      const m = Math.floor(v / 60);
                      const s = Math.round(v % 60);
                      return `${m}m ${String(s).padStart(2, '0')}s`;
                    }}
                  />
                  <StatRow
                    label="평균 어시스트"
                    valA={data.playerA.avgAssists}
                    valB={data.playerB.avgAssists}
                    format={(v) => v.toFixed(2)}
                  />
                  <StatRow
                    label="총 게임 수"
                    valA={data.playerA.roundsPlayed}
                    valB={data.playerB.roundsPlayed}
                    format={(v) => v.toLocaleString()}
                  />
                </div>

                {/* 레이더 차트 */}
                <div className="bg-gray-800/60 rounded-xl border border-gray-700 p-6 flex flex-col">
                  <h2 className="text-lg font-bold mb-4 text-gray-200">🕸️ 능력치 레이더</h2>
                  <div className="flex-1 flex items-center justify-center">
                    {data.playerA.hasData && data.playerB.hasData ? (
                      <div className="w-full max-w-sm mx-auto">
                        <RadarChart playerA={data.playerA} playerB={data.playerB} />
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm text-center">
                        한 명 이상 데이터가 없어 레이더 차트를 표시할 수 없습니다
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 공유 버튼 */}
              <div className="bg-gray-800/40 rounded-xl border border-gray-700 p-5 text-center">
                <p className="text-gray-400 text-sm mb-3">이 비교를 공유하세요</p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <button
                    onClick={handleDownloadCard}
                    disabled={saving}
                    className="bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm transition-colors font-semibold"
                  >
                    {saving ? '저장 중…' : '🖼️ 카드 저장'}
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(shareUrl);
                      alert('링크가 복사되었습니다!');
                    }}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-2 rounded-lg text-sm transition-colors"
                  >
                    🔗 링크 복사
                  </button>
                  <button
                    onClick={() => {
                      const text = `${data.playerA.nickname} vs ${data.playerB.nickname} 비교하기`;
                      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
                    }}
                    className="bg-sky-700 hover:bg-sky-600 text-white px-5 py-2 rounded-lg text-sm transition-colors"
                  >
                    𝕏 트위터 공유
                  </button>
                </div>
              </div>

              {/* 이미지 캡처용 카드 (화면 밖) */}
              <BattleShareCard playerA={data.playerA} playerB={data.playerB} cardRef={cardRef} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
