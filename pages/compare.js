// pages/compare.js — 플레이어 비교 페이지

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/layout/Header';
import { useT } from '../utils/i18n';
import { getMMRTier } from '../utils/mmrCalculator';
import { toPng } from 'html-to-image';

// 레이더 축 정의 — label, key, max(정규화기준), 실제값 포매터
// RADAR_AXES labels are computed inside component with t()
const RADAR_AXES_KEYS = [
  { tKey: 'cmp.stat.damage',  key: 'avgDamage',     max: 600,  fmt: (v) => Math.round(v) },
  { tKey: 'cmp.stat.kills',   key: 'avgKills',       max: 6,    fmt: (v) => (+v).toFixed(2) },
  { tKey: 'cmp.stat.winrate', key: 'winRate',        max: 25,   fmt: (v) => `${(+v).toFixed(1)}%` },
  { tKey: 'Top10',            key: 'top10Rate',      max: 70,   fmt: (v) => `${(+v).toFixed(1)}%` },
  { tKey: 'cmp.stat.survive', key: 'avgSurviveTime', max: 1800, fmt: (v) => `${Math.floor(v/60)}m` },
  { tKey: 'cmp.stat.assists', key: 'avgAssists',     max: 3,    fmt: (v) => (+v).toFixed(2) },
];

function normalize(val, max) {
  return Math.min(100, Math.max(0, (val / max) * 100));
}

// ── SVG 레이더 차트 ───────────────────────────────────────────────────────────
function RadarChart({ playerA, playerB }) {
  const [hovered, setHovered] = useState(null)
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'))
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  const c = isDark
    ? {
        svgBg:       '#0a0f1e',
        border:      'rgba(255,255,255,0.08)',
        bgGradC1:    '#1e1b4b',
        bgGradC2:    '#0f172a',
        gridFaint:   'rgba(255,255,255,0.06)',
        gridBold:    'rgba(255,255,255,0.18)',
        axis:        'rgba(255,255,255,0.09)',
        axisHov:     'rgba(255,255,255,0.35)',
        label:       '#94a3b8',
        labelHov:    '#f1f5f9',
        tick:        'rgba(148,163,184,0.4)',
        dotBg:       '#0f172a',
        tooltipBg:   'rgba(10,15,30,0.97)',
        tooltipBdr:  'rgba(255,255,255,0.12)',
        tooltipLbl:  '#64748b',
        tooltipSub:  '#475569',
        barRowHov:   'rgba(255,255,255,0.05)',
        barRowLbl:   '#64748b',
        barDimA:     'rgba(59,130,246,0.22)',
        barDimB:     'rgba(239,68,68,0.22)',
        legendA:     '#60a5fa',
        legendB:     '#f87171',
      }
    : {
        svgBg:       '#f1f5f9',
        border:      'rgba(0,0,0,0.1)',
        bgGradC1:    '#dbeafe',
        bgGradC2:    '#e0f2fe',
        gridFaint:   'rgba(0,0,0,0.06)',
        gridBold:    'rgba(0,0,0,0.18)',
        axis:        'rgba(0,0,0,0.1)',
        axisHov:     'rgba(0,0,0,0.35)',
        label:       '#475569',
        labelHov:    '#0f172a',
        tick:        'rgba(100,116,139,0.5)',
        dotBg:       '#f1f5f9',
        tooltipBg:   'rgba(248,250,252,0.98)',
        tooltipBdr:  'rgba(0,0,0,0.12)',
        tooltipLbl:  '#6b7280',
        tooltipSub:  '#9ca3af',
        barRowHov:   'rgba(0,0,0,0.04)',
        barRowLbl:   '#6b7280',
        barDimA:     'rgba(59,130,246,0.18)',
        barDimB:     'rgba(239,68,68,0.18)',
        legendA:     '#2563eb',
        legendB:     '#dc2626',
      }

  const N  = RADAR_AXES.length
  const SZ = 280
  const CX = SZ / 2
  const CY = SZ / 2
  const R  = 96
  const LR = R + 26

  const angle = (i) => (Math.PI * 2 * i) / N - Math.PI / 2
  const pt    = (i, r) => ({
    x: CX + r * Math.cos(angle(i)),
    y: CY + r * Math.sin(angle(i)),
  })

  const polyPoints = (values) =>
    values.map((v, i) => {
      const { x, y } = pt(i, (v / 100) * R)
      return `${x},${y}`
    }).join(' ')

  const gridPoints = (pct) =>
    Array.from({ length: N }, (_, i) => {
      const { x, y } = pt(i, (pct / 100) * R)
      return `${x},${y}`
    }).join(' ')

  const dataA = RADAR_AXES.map(({ key, max }) => normalize(playerA[key] ?? 0, max))
  const dataB = RADAR_AXES.map(({ key, max }) => normalize(playerB[key] ?? 0, max))

  return (
    <div className="flex flex-col gap-3">
      {/* SVG 차트 */}
      <div
        className="relative rounded-2xl overflow-hidden p-2"
        style={{ backgroundColor: c.svgBg, border: `1px solid ${c.border}` }}
      >
        <svg viewBox={`0 0 ${SZ} ${SZ}`} className="w-full" style={{ maxHeight: '300px' }}>
          <defs>
            <filter id="glowA" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glowB" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor={c.bgGradC1} stopOpacity="0.5"/>
              <stop offset="100%" stopColor={c.bgGradC2} stopOpacity="0"/>
            </radialGradient>
            <linearGradient id="fillA" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#3B82F6" stopOpacity="0.55"/>
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.25"/>
            </linearGradient>
            <linearGradient id="fillB" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#EF4444" stopOpacity="0.55"/>
              <stop offset="100%" stopColor="#F97316" stopOpacity="0.25"/>
            </linearGradient>
          </defs>

          {/* 배경 그라디언트 */}
          <circle cx={CX} cy={CY} r={R + 10} fill="url(#bgGrad)" />

          {/* 그리드 링 */}
          {[20, 40, 60, 80, 100].map((pct) => (
            <polygon
              key={pct}
              points={gridPoints(pct)}
              fill="none"
              stroke={pct === 100 ? c.gridBold : c.gridFaint}
              strokeWidth={pct === 100 ? 1.5 : 1}
              strokeLinejoin="round"
            />
          ))}

          {/* 축 선 */}
          {RADAR_AXES.map((_, i) => {
            const { x, y } = pt(i, R)
            return (
              <line
                key={i}
                x1={CX} y1={CY} x2={x} y2={y}
                stroke={hovered === i ? c.axisHov : c.axis}
                strokeWidth={hovered === i ? 1.5 : 1}
              />
            )
          })}

          {/* 데이터 영역 B (뒤) */}
          <polygon
            points={polyPoints(dataB)}
            fill="url(#fillB)"
            stroke="#F87171"
            strokeWidth="2"
            strokeLinejoin="round"
            filter="url(#glowB)"
          />

          {/* 데이터 영역 A (앞) */}
          <polygon
            points={polyPoints(dataA)}
            fill="url(#fillA)"
            stroke="#60A5FA"
            strokeWidth="2"
            strokeLinejoin="round"
            filter="url(#glowA)"
          />

          {/* 포인트 A */}
          {dataA.map((v, i) => {
            const { x, y } = pt(i, (v / 100) * R)
            const vA = playerA[RADAR_AXES[i].key] ?? 0
            const vB = playerB[RADAR_AXES[i].key] ?? 0
            const wins = vA >= vB
            return (
              <circle
                key={i} cx={x} cy={y} r={hovered === i ? 6 : 4.5}
                fill={wins ? '#60A5FA' : '#93C5FD'}
                stroke={c.dotBg} strokeWidth="1.5"
                filter="url(#glowA)"
                style={{ cursor: 'pointer', transition: 'r 0.15s' }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            )
          })}

          {/* 포인트 B */}
          {dataB.map((v, i) => {
            const { x, y } = pt(i, (v / 100) * R)
            const vA = playerA[RADAR_AXES[i].key] ?? 0
            const vB = playerB[RADAR_AXES[i].key] ?? 0
            const wins = vB > vA
            return (
              <circle
                key={i} cx={x} cy={y} r={hovered === i ? 6 : 4.5}
                fill={wins ? '#F87171' : '#FCA5A5'}
                stroke={c.dotBg} strokeWidth="1.5"
                style={{ cursor: 'pointer', transition: 'r 0.15s' }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            )
          })}

          {/* 축 라벨 */}
          {RADAR_AXES.map(({ label }, i) => {
            const { x, y } = pt(i, LR)
            const anchor = x < CX - 6 ? 'end' : x > CX + 6 ? 'start' : 'middle'
            const isHov  = hovered === i
            return (
              <text
                key={i}
                x={x} y={y}
                textAnchor={anchor}
                dominantBaseline="middle"
                fill={isHov ? c.labelHov : c.label}
                fontSize={isHov ? 13 : 12}
                fontWeight="700"
                style={{ cursor: 'pointer', transition: 'fill 0.15s' }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {label}
              </text>
            )
          })}

          {/* % 눈금 표시 */}
          {[40, 80].map((pct) => {
            const { x, y } = pt(0, (pct / 100) * R)
            return (
              <text key={pct} x={x + 3} y={y} fill={c.tick} fontSize="8">
                {pct}
              </text>
            )
          })}
        </svg>

        {/* 호버 툴팁 */}
        {hovered !== null && (() => {
          const ax   = RADAR_AXES[hovered]
          const vA   = ax.fmt(playerA[ax.key] ?? 0)
          const vB   = ax.fmt(playerB[ax.key] ?? 0)
          const aWin = (playerA[ax.key] ?? 0) >= (playerB[ax.key] ?? 0)
          return (
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 rounded-xl px-4 py-2.5 text-center pointer-events-none shadow-xl z-10 min-w-[160px]"
              style={{ backgroundColor: c.tooltipBg, border: `1px solid ${c.tooltipBdr}` }}
            >
              <div className="text-xs font-black uppercase tracking-widest mb-1.5" style={{ color: c.tooltipLbl }}>{ax.label}</div>
              <div className="flex items-center justify-center gap-3">
                <span className={`text-sm font-black ${aWin ? 'text-blue-400' : 'text-gray-500'}`}>{vA}</span>
                <span className="text-xs" style={{ color: c.tooltipSub }}>vs</span>
                <span className={`text-sm font-black ${!aWin ? 'text-red-400' : 'text-gray-500'}`}>{vB}</span>
              </div>
              <div className="text-[10px] mt-1" style={{ color: c.tooltipSub }}>
                {aWin ? `${playerA.nickname} 우세` : `${playerB.nickname} 우세`}
              </div>
            </div>
          )
        })()}
      </div>

      {/* 범례 */}
      <div className="flex justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6', boxShadow: '0 0 6px #3B82F6' }} />
          <span className="text-sm font-bold" style={{ color: c.legendA }}>{playerA.nickname}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444', boxShadow: '0 0 6px #EF4444' }} />
          <span className="text-sm font-bold" style={{ color: c.legendB }}>{playerB.nickname}</span>
        </div>
      </div>

      {/* 버터플라이 바 차트 — 중앙 기준 양쪽으로 뻗어 차이를 시각화 */}
      <div className="flex flex-col gap-1">
        {/* 헤더: 플레이어 이름 */}
        <div className="flex items-center text-[11px] font-bold mb-1 px-1">
          <span className="w-14 text-right" style={{ color: c.legendA }}>{playerA.nickname}</span>
          <div className="flex-1 text-center" style={{ color: c.barRowLbl }}></div>
          <span className="w-14 text-left" style={{ color: c.legendB }}>{playerB.nickname}</span>
        </div>

        {RADAR_AXES.map(({ label, key, fmt }, idx) => {
          const vA    = playerA[key] ?? 0
          const vB    = playerB[key] ?? 0
          const total = vA + vB
          const pA    = total > 0 ? (vA / total) * 100 : 50
          const pB    = total > 0 ? (vB / total) * 100 : 50
          const aWins = vA > vB
          const bWins = vB > vA
          const isHov = hovered === idx

          return (
            <div
              key={key}
              className="rounded-lg px-2 py-1.5 transition-colors cursor-default"
              style={{ backgroundColor: isHov ? c.barRowHov : 'transparent' }}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="flex items-center gap-2">
                {/* A 수치 */}
                <span
                  className="text-xs font-bold shrink-0 text-right"
                  style={{ width: '52px', color: aWins ? '#60a5fa' : c.barRowLbl }}
                >
                  {fmt(vA)}
                </span>

                {/* 버터플라이 바 */}
                <div className="flex-1 flex items-center gap-px">
                  {/* A 바 (오른쪽 정렬) */}
                  <div className="flex-1 h-5 flex items-center justify-end overflow-hidden rounded-l-sm">
                    <div
                      className="h-full rounded-l-full transition-all duration-500"
                      style={{
                        width: `${pA}%`,
                        backgroundColor: aWins ? '#3b82f6' : c.barDimA,
                      }}
                    />
                  </div>
                  {/* 중앙 구분선 + 라벨 */}
                  <div className="flex flex-col items-center shrink-0" style={{ width: '36px' }}>
                    <div className="w-px h-5" style={{ backgroundColor: c.gridBold }} />
                    <span className="text-[9px] font-semibold mt-0.5" style={{ color: c.barRowLbl }}>{label}</span>
                  </div>
                  {/* B 바 (왼쪽 정렬) */}
                  <div className="flex-1 h-5 flex items-center overflow-hidden rounded-r-sm">
                    <div
                      className="h-full rounded-r-full transition-all duration-500"
                      style={{
                        width: `${pB}%`,
                        backgroundColor: bWins ? '#ef4444' : c.barDimB,
                      }}
                    />
                  </div>
                </div>

                {/* B 수치 */}
                <span
                  className="text-xs font-bold shrink-0 text-left"
                  style={{ width: '52px', color: bWins ? '#f87171' : c.barRowLbl }}
                >
                  {fmt(vB)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
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
    <div className="py-3 border-b border-gray-200 dark:border-gray-700/50 last:border-0">
      {/* 라벨 */}
      <div className="text-center text-xs text-gray-500 dark:text-gray-400 mb-2">{label}</div>
      <div className="flex items-center gap-2">
        {/* Player A */}
        <div className="flex-1 flex flex-col items-end gap-1">
          <span className={`text-sm font-bold ${aWins ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>{fmtA}</span>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${aWins ? 'bg-blue-500' : 'bg-blue-300 dark:bg-blue-800'}`}
              style={{ width: `${pA}%`, marginLeft: 'auto', float: 'right' }}
            />
          </div>
        </div>
        {/* 중앙 구분 */}
        <div className="w-6 text-center text-gray-400 dark:text-gray-500 text-xs shrink-0">VS</div>
        {/* Player B */}
        <div className="flex-1 flex flex-col items-start gap-1">
          <span className={`text-sm font-bold ${bWins ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>{fmtB}</span>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${bWins ? 'bg-red-500' : 'bg-red-300 dark:bg-red-800'}`}
              style={{ width: `${pB}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 플랫폼 뱃지 ──────────────────────────────────────────────────────────────
const PLATFORM_META = {
  steam:   { label: 'Steam',       style: { background: '#1b2838', color: '#c7d5e0', border: '1px solid #4a6fa5' } },
  kakao:   { label: 'Kakao',       style: { background: '#fee500', color: '#000',    border: '1px solid #e6ce00' } },
  psn:     { label: 'PlayStation', style: { background: '#003087', color: '#fff',    border: '1px solid #0050d8' } },
  xbox:    { label: 'Xbox',        style: { background: '#107c10', color: '#fff',    border: '1px solid #0d6b0d' } },
}

function PlatformBadge({ shard }) {
  const meta = PLATFORM_META[shard] || { label: shard, style: { background: '#374151', color: '#9ca3af' } }
  return (
    <span style={{ ...meta.style, fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', letterSpacing: '0.02em' }}>
      {meta.label}
    </span>
  )
}

// ── 경쟁전 티어 표시 ─────────────────────────────────────────────────────────
const RANK_TIER_COLOR = {
  Bronze:   '#cd7f32', Silver: '#a8a9ad', Gold: '#ffd700',
  Platinum: '#00b4d8', Diamond: '#b9f2ff', Master: '#e040fb',
}

function RankBadge({ tier, subTier, rankPoint }) {
  const color = RANK_TIER_COLOR[tier] || '#94a3b8'
  return (
    <div style={{ color, fontSize: '12px', fontWeight: 700 }}>
      {tier} {subTier} · {rankPoint?.toLocaleString()}RP
    </div>
  )
}

// ── 플레이어 카드 ──────────────────────────────────────────────────────────────
function PlayerCard({ player, side }) {
  const stats = player.combined || {}
  const tier = getMMRTier(stats.mmr ?? 1000);
  const color = side === 'A' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20';
  const textColor = side === 'A' ? 'text-blue-400' : 'text-red-400';
  const surv = Math.floor((stats.avgSurviveTime || 0) / 60);
  const survSec = (stats.avgSurviveTime || 0) % 60;

  return (
    <div className={`rounded-xl border-2 ${color} p-5 flex flex-col items-center gap-3 flex-1`}>
      {/* 닉네임 + 플랫폼 뱃지 */}
      <div className="flex flex-col items-center gap-1.5">
        <Link
          href={`/player/${player.shard || 'steam'}/${encodeURIComponent(player.nickname)}`}
          className={`text-xl font-bold ${textColor} hover:underline`}
        >
          {player.nickname}
        </Link>
        {player.shard && <PlatformBadge shard={player.shard} />}
      </div>

      {/* MMR 배지 */}
      <div
        className="px-4 py-1 rounded-full text-sm font-semibold"
        style={{ backgroundColor: tier.color + '30', color: tier.color, border: `1px solid ${tier.color}60` }}
      >
        {tier.emoji} {tier.label} {(stats.mmr ?? 1000).toLocaleString()}
      </div>

      {/* 경쟁전 티어 (데이터 있을 때만) */}
      {stats.tier && (
        <RankBadge tier={stats.tier} subTier={stats.subTier} rankPoint={stats.rankPoint} />
      )}

      {/* 주요 스탯 요약 */}
      {stats.hasData ? (
        <div className="w-full grid grid-cols-3 gap-2 text-center">
          {[
            { label: t('cmp.stat.avg_damage'), value: (stats.avgDamage || 0).toLocaleString() },
            { label: t('cmp.stat.avg_kills'),  value: (stats.avgKills  || 0).toFixed(2) },
            { label: t('cmp.stat.winrate'),    value: (stats.winRate   || 0).toFixed(1) + '%' },
            { label: 'Top10',  value: (stats.top10Rate || 0).toFixed(1) + '%' },
            { label: t('cmp.stat.survive'),    value: `${surv}m${String(Math.round(survSec)).padStart(2,'0')}s` },
            { label: t('cmp.stat.games'),      value: (stats.roundsPlayed || 0).toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-100 dark:bg-gray-800/60 rounded-lg py-2 px-1">
              <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
              <div className={`text-sm font-semibold ${textColor}`}>{value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-500 text-sm text-center px-2">{t('cmp.no_data')}</div>
      )}
    </div>
  );
}

// ── 배틀 공유 카드 (이미지 캡처용, 화면 밖 렌더링) ─────────────────────────
function BattleShareCard({ playerA, playerB, cardRef }) {
  const mmrA = playerA.mmr ?? 1000;
  const mmrB = playerB.mmr ?? 1000;
  const tierA = getMMRTier(mmrA);
  const tierB = getMMRTier(mmrB);
  const winner = mmrA > mmrB ? playerA.nickname
               : mmrB > mmrA ? playerB.nickname
               : null;

  const stats = [
    { label: t('cmp.stat.avg_damage'), dispA: Math.round(playerA.avgDamage || 0).toLocaleString(), dispB: Math.round(playerB.avgDamage || 0).toLocaleString(), rawA: playerA.avgDamage || 0, rawB: playerB.avgDamage || 0 },
    { label: t('cmp.stat.avg_kills'),  dispA: (playerA.avgKills ?? 0).toFixed(2), dispB: (playerB.avgKills ?? 0).toFixed(2), rawA: playerA.avgKills || 0, rawB: playerB.avgKills || 0 },
    { label: t('cmp.stat.winrate'),    dispA: (playerA.winRate ?? 0).toFixed(1) + '%', dispB: (playerB.winRate ?? 0).toFixed(1) + '%', rawA: playerA.winRate || 0, rawB: playerB.winRate || 0 },
    { label: 'Top10',                  dispA: (playerA.top10Rate ?? 0).toFixed(1) + '%', dispB: (playerB.top10Rate ?? 0).toFixed(1) + '%', rawA: playerA.top10Rate || 0, rawB: playerB.top10Rate || 0 },
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
          <div style={s({ color: '#60a5fa', fontWeight: 700, fontSize: '15px', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>{playerA.nickname}</div>
          {playerA.shard && <div style={s({ color: '#64748b', fontSize: '9px', marginBottom: '4px' })}>{(PLATFORM_META[playerA.shard] || {}).label || playerA.shard}</div>}
          <div style={s({ color: tierA.color, fontSize: '11px', fontWeight: 600 })}>{tierA.emoji} {tierA.label}</div>
          <div style={s({ color: tierA.color, fontSize: '20px', fontWeight: 900 })}>{mmrA.toLocaleString()}</div>
        </div>
        <div style={s({ color: '#475569', fontWeight: 900, fontSize: '18px' })}>VS</div>
        <div style={s({ flex: 1, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '10px', padding: '12px', textAlign: 'center' })}>
          <div style={s({ color: '#f87171', fontWeight: 700, fontSize: '15px', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}>{playerB.nickname}</div>
          {playerB.shard && <div style={s({ color: '#64748b', fontSize: '9px', marginBottom: '4px' })}>{(PLATFORM_META[playerB.shard] || {}).label || playerB.shard}</div>}
          <div style={s({ color: tierB.color, fontSize: '11px', fontWeight: 600 })}>{tierB.emoji} {tierB.label}</div>
          <div style={s({ color: tierB.color, fontSize: '20px', fontWeight: 900 })}>{mmrB.toLocaleString()}</div>
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

// ── AI 비교 요약 컴포넌트 ─────────────────────────────────────────────────────
const STAT_BATTLES = [
  { label: '평균 딜량', key: 'avgDamage', fmt: (v) => Math.round(v ?? 0).toLocaleString() },
  { label: '평균 킬',  key: 'avgKills',  fmt: (v) => (+(v ?? 0)).toFixed(2) },
  { label: '승률',     key: 'winRate',   fmt: (v) => `${(+(v ?? 0)).toFixed(1)}%` },
  { label: 'Top10',   key: 'top10Rate', fmt: (v) => `${(+(v ?? 0)).toFixed(1)}%` },
  { label: 'MMR',     key: 'mmr',       fmt: (v) => Math.round(v ?? 0).toLocaleString() },
]

function AiComparison({ playerA, playerB }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const hasData = playerA?.hasData && playerB?.hasData;

  useEffect(() => {
    if (!hasData) return;
    let cancelled = false;
    setLoading(true);
    setSummary('');
    setError('');

    fetch('/api/pubg/compare-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerA, playerB }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) setError(d.error);
        else setSummary(d.summary);
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerA?.nickname, playerB?.nickname, hasData]);

  if (!hasData) return (
    <div className="text-center text-gray-500 dark:text-gray-500 text-sm py-6 mb-8">
      해당 모드의 경기 데이터가 없어 AI 분석을 제공할 수 없습니다
    </div>
  );

  // 스탯 배틀 계산
  let aWins = 0, bWins = 0;
  STAT_BATTLES.forEach(({ key }) => {
    const a = +(playerA?.[key] ?? 0), b = +(playerB?.[key] ?? 0);
    if (a > b) aWins++;
    else if (b > a) bWins++;
  });
  const verdict = aWins > bWins ? 'A' : bWins > aWins ? 'B' : 'TIE';

  const highlight = (text, cls = 'text-sm') =>
    text
      .replace(playerA.nickname, `__A__${playerA.nickname}__A__`)
      .replace(playerB.nickname, `__B__${playerB.nickname}__B__`)
      .split(/(__A__.*?__A__|__B__.*?__B__)/)
      .map((chunk, j) => {
        if (chunk.startsWith('__A__')) return (
          <span key={j} className={`${cls} font-extrabold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent`}>
            {playerA.nickname}
          </span>
        );
        if (chunk.startsWith('__B__')) return (
          <span key={j} className={`${cls} font-extrabold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent`}>
            {playerB.nickname}
          </span>
        );
        return chunk;
      });

  return (
    <div className="relative rounded-2xl mb-8 overflow-hidden border border-violet-300 dark:border-violet-500/30 bg-white dark:bg-gray-900">
      {/* 상단 레인보우 바 */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-fuchsia-500 to-orange-500" />

      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-600/20 border border-violet-200 dark:border-violet-500/30 flex items-center justify-center text-base shrink-0">🤖</div>
          <div>
            <div className="text-[11px] font-black text-violet-500 dark:text-violet-400 uppercase tracking-widest leading-none">AI 전투 분석</div>
            <div className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">PUBG Battle Analysis</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-green-500 dark:text-green-400 font-bold uppercase tracking-wide">Live</span>
        </div>
      </div>

      {/* 플레이어 VS 헤더 */}
      <div className="flex items-center">
        <div className={`flex-1 py-3 px-4 text-center ${verdict === 'A' ? 'bg-blue-50 dark:bg-blue-600/15' : 'bg-gray-50 dark:bg-white/3'}`}>
          <div className="flex items-center justify-center gap-1.5">
            {verdict === 'A' && <span className="text-base">👑</span>}
            <span className="text-sm font-black text-blue-500 dark:text-blue-400 truncate max-w-[120px]">{playerA.nickname}</span>
          </div>
          <div className={`text-2xl font-black tabular-nums mt-0.5 ${verdict === 'A' ? 'text-blue-500 dark:text-blue-300' : 'text-gray-300 dark:text-gray-600'}`}>{aWins}</div>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-3 gap-0.5">
          <span className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">스탯 배틀</span>
          <span className="text-base font-black text-gray-400 dark:text-gray-500">VS</span>
        </div>
        <div className={`flex-1 py-3 px-4 text-center ${verdict === 'B' ? 'bg-orange-50 dark:bg-orange-600/15' : 'bg-gray-50 dark:bg-white/3'}`}>
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-sm font-black text-orange-500 dark:text-orange-400 truncate max-w-[120px]">{playerB.nickname}</span>
            {verdict === 'B' && <span className="text-base">👑</span>}
          </div>
          <div className={`text-2xl font-black tabular-nums mt-0.5 ${verdict === 'B' ? 'text-orange-500 dark:text-orange-300' : 'text-gray-300 dark:text-gray-600'}`}>{bWins}</div>
        </div>
      </div>

      {/* 스탯 배틀 바 */}
      <div className="px-4 pb-4 pt-2 space-y-2">
        {STAT_BATTLES.map(({ label, key, fmt }) => {
          const aVal = +(playerA?.[key] ?? 0);
          const bVal = +(playerB?.[key] ?? 0);
          const total = aVal + bVal || 1;
          const aPct  = Math.round((aVal / total) * 100);
          const bPct  = 100 - aPct;
          const aWin  = aVal > bVal;
          const bWin  = bVal > aVal;
          return (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-black tabular-nums ${aWin ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-600'}`}>{fmt(aVal)}</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">{label}</span>
                <span className={`text-xs font-black tabular-nums ${bWin ? 'text-orange-500 dark:text-orange-400' : 'text-gray-400 dark:text-gray-600'}`}>{fmt(bVal)}</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden gap-px bg-gray-100 dark:bg-transparent">
                <div
                  className={`h-full transition-all duration-500 ${aWin ? 'bg-gradient-to-r from-blue-600 to-blue-400' : 'bg-gray-200 dark:bg-gray-700/60'}`}
                  style={{ width: `${aPct}%` }}
                />
                <div
                  className={`h-full transition-all duration-500 ${bWin ? 'bg-gradient-to-l from-orange-600 to-orange-400' : 'bg-gray-200 dark:bg-gray-700/60'}`}
                  style={{ width: `${bPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 구분선 */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />

      {/* AI 판정 영역 */}
      <div className="px-4 py-5">
        {loading && (
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 text-sm py-2">
            <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin shrink-0" />
            <span>AI가 두 플레이어를 분석 중입니다…</span>
          </div>
        )}

        {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}

        {summary && (() => {
          const lines      = summary.split('\n').filter(Boolean);
          const titleLine  = lines.find((l) => l.startsWith('제목:'))?.replace('제목:', '').trim() || '';
          const reasonLine = lines.find((l) => l.startsWith('이유:'))?.replace('이유:', '').trim() || '';
          return (
            <div className="space-y-3">
              {/* 판정 카드 */}
              <div className="relative rounded-2xl overflow-hidden border border-violet-200 dark:border-violet-500/25 bg-gradient-to-br from-violet-50 dark:from-violet-900/30 to-purple-50/50 dark:to-fuchsia-900/10 p-5">
                <div className="absolute top-3 right-3 text-[10px] font-black text-violet-400 dark:text-violet-500 uppercase tracking-widest">⚡ AI VERDICT</div>
                <p className="text-[11px] font-bold text-violet-500 dark:text-violet-400 uppercase tracking-widest mb-2">판정</p>
                <p className="text-xl font-black text-gray-900 dark:text-white leading-snug">{highlight(titleLine, 'text-xl')}</p>
              </div>

              {/* 분석 코멘트 */}
              <div className="relative rounded-xl bg-gray-50 dark:bg-white/3 border border-gray-200 dark:border-white/5 px-4 py-3.5">
                <div className="absolute -top-2.5 left-4">
                  <span className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest px-2 py-0.5 rounded-full">분석 코멘트</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pt-1">{highlight(reasonLine, 'text-sm')}</p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function ComparePage() {
  const router       = useRouter();
  const { t }        = useT();
  const RADAR_AXES = RADAR_AXES_KEYS.map(a => ({
    ...a,
    label: a.tKey.startsWith('cmp.') ? t(a.tKey) : a.tKey,
  }));
  const [inputA, setInputA] = useState('');
  const [inputB, setInputB] = useState('');
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState(false);
  const cardRef = useRef(null);

  // URL 파라미터에서 초기값 세팅
  useEffect(() => {
    if (!router.isReady) return;
    const { a, b } = router.query;
    if (a) setInputA(a);
    if (b) setInputB(b);
    if (a && b) fetchCompare(a, b);
  }, [router.isReady]);

  async function fetchCompare(a, b) {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res  = await fetch(`/api/pubg/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '비교 실패');
      setData(json);
      // URL 업데이트 (공유 가능)
      router.replace(`/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`, undefined, { shallow: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!inputA.trim() || !inputB.trim()) return;
    fetchCompare(inputA.trim(), inputB.trim());
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
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://pkgg.vercel.app/compare" />
        <meta
          property="og:title"
          content={data ? `${data.playerA.nickname} vs ${data.playerB.nickname} — PKGG` : '플레이어 비교 — PKGG'}
        />
        <meta
          property="og:description"
          content="두 PUBG 플레이어의 시즌 통계를 나란히 비교해보세요. MMR, 평균딜량, 승률, Top10% 등을 한눈에."
        />
        <meta property="og:image" content="https://pkgg.vercel.app/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content={data ? `${data.playerA.nickname} vs ${data.playerB.nickname} — PKGG` : '플레이어 비교 — PKGG'}
        />
        <meta
          name="twitter:description"
          content="두 PUBG 플레이어의 시즌 통계를 나란히 비교해보세요. MMR, 평균딜량, 승률, Top10% 등을 한눈에."
        />
        <meta name="twitter:image" content="https://pkgg.vercel.app/og-image.png" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
        <Header />

        {/* ── 히어로 ── */}
        <div className="bg-gray-100 dark:bg-gradient-to-b dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-transparent py-10 px-4">
          <div className="max-w-2xl mx-auto text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">
              ⚔️ {t('cmp.title')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('cmp.enter_nicknames')}</p>
          </div>

          {/* ── 검색 폼 ── */}
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            {/* 모바일: 세로 스택 / 데스크탑: 가로 한줄 */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                value={inputA}
                onChange={(e) => setInputA(e.target.value)}
                placeholder="플레이어 A"
                className="flex-1 bg-white dark:bg-gray-700 border border-blue-500/50 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              />
              <button
                type="button"
                onClick={swapPlayers}
                className="self-center px-3 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-lg"
                title="플레이어 교환"
              >⇄</button>
              <input
                value={inputB}
                onChange={(e) => setInputB(e.target.value)}
                placeholder="플레이어 B"
                className="flex-1 bg-white dark:bg-gray-700 border border-red-500/50 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                {loading ? t('cmp.comparing') : t('cmp.compare_btn')}
              </button>
            </div>
          </form>
        </div>

        {/* ── 메인 컨텐츠 ── */}
        <div className="max-w-5xl mx-auto px-4 py-8">

          {/* 에러 */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/40 border border-red-500/50 rounded-xl p-5 text-center text-red-600 dark:text-red-300 mb-8">
              {error}
            </div>
          )}

          {/* 로딩 */}
          {loading && (
            <div className="text-center py-20 text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4 animate-pulse">⚔️</div>
              <div>{t('cmp.comparing')}</div>
            </div>
          )}

          {/* 초기 상태 */}
          {!data && !loading && !error && (
            <div className="text-center py-20 text-gray-500 dark:text-gray-500">
              <div className="text-5xl mb-4">⚔️</div>
              <div className="text-lg">{t('cmp.enter_nicknames')}</div>
            </div>
          )}

          {/* 비교 결과 */}
          {data && !loading && (
            <>
              {/* 통계 기준 안내 */}
              <div className="flex justify-center mb-5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                  <span>📊</span>
                  <span>모든 매치 통계 기준 (일반전 + 경쟁전, 이벤트 제외)</span>
                </div>
              </div>

              {/* 플레이어 카드 */}
              <div className="flex gap-4 mb-8 flex-col sm:flex-row">
                <PlayerCard player={data.playerA} side="A" />
                <div className="flex items-center justify-center text-2xl font-black text-gray-500">VS</div>
                <PlayerCard player={data.playerB} side="B" />
              </div>

              {/* 스탯 비교 바 + 레이더 차트 */}
              {(() => {
                const sA = data.playerA.combined || {}
                const sB = data.playerB.combined || {}
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* 스탯 비교 바 */}
                    <div className="bg-white dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                      <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">📊 스탯 비교</h2>

                      <div className="flex justify-between mb-3 text-sm font-semibold">
                        <span className="text-blue-500 dark:text-blue-400">{data.playerA.nickname}</span>
                        <span className="text-red-500 dark:text-red-400">{data.playerB.nickname}</span>
                      </div>

                      <StatRow label="PKGG MMR"       valA={sA.mmr}          valB={sB.mmr}          format={(v) => v.toLocaleString()} />
                      <StatRow label="평균 딜량"       valA={sA.avgDamage}    valB={sB.avgDamage}    format={(v) => v.toLocaleString()} />
                      <StatRow label="평균 킬"         valA={sA.avgKills}     valB={sB.avgKills}     format={(v) => v.toFixed(2)} />
                      <StatRow label="승률 (%)"        valA={sA.winRate}      valB={sB.winRate}      format={(v) => v.toFixed(1) + '%'} />
                      <StatRow label="Top 10% 진입률"  valA={sA.top10Rate}    valB={sB.top10Rate}    format={(v) => v.toFixed(1) + '%'} />
                      <StatRow label="평균 생존시간"   valA={sA.avgSurviveTime} valB={sB.avgSurviveTime} format={(v) => {
                        const m = Math.floor(v / 60); const s = Math.round(v % 60);
                        return `${m}m ${String(s).padStart(2, '0')}s`;
                      }} />
                      <StatRow label="평균 어시스트"   valA={sA.avgAssists}   valB={sB.avgAssists}   format={(v) => v.toFixed(2)} />
                      <StatRow label="총 게임 수"      valA={sA.roundsPlayed} valB={sB.roundsPlayed} format={(v) => v.toLocaleString()} />
                    </div>

                    {/* 레이더 차트 */}
                    <div className="bg-gray-900 rounded-xl border border-gray-700/50 p-5 flex flex-col">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-lg">🕸️</span>
                        <h2 className="text-base font-bold text-gray-100">능력치 레이더</h2>
                        <span className="ml-auto text-[10px] text-gray-600 font-medium">마우스오버로 수치 확인</span>
                      </div>
                      {sA.hasData && sB.hasData ? (
                        <RadarChart playerA={{ ...sA, nickname: data.playerA.nickname }} playerB={{ ...sB, nickname: data.playerB.nickname }} />
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm py-12">
                          분석할 경기의 수가 부족합니다
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* AI 비교 분석 */}
              <AiComparison
                playerA={{ ...data.playerA, ...data.playerA.combined }}
                playerB={{ ...data.playerB, ...data.playerB.combined }}
              />

              {/* 공유 버튼 */}
              <div className="bg-gray-100 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">이 비교를 공유하세요</p>
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
              <BattleShareCard
                playerA={{ ...data.playerA, ...data.playerA.combined }}
                playerB={{ ...data.playerB, ...data.playerB.combined }}
                cardRef={cardRef}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
