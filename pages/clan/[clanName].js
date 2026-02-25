// pages/clan/[clanName].js — 클랜 상세 페이지

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/layout/Layout';

// ─── 유틸 ──────────────────────────────────────────────────────────────────────

const regionMeta = {
  KR:    { flag: '🇰🇷', label: '한국',   color: 'bg-blue-600' },
  CN:    { flag: '🇨🇳', label: '중국',   color: 'bg-red-600' },
  JP:    { flag: '🇯🇵', label: '일본',   color: 'bg-purple-600' },
  RU:    { flag: '🇷🇺', label: '러시아', color: 'bg-red-700' },
  EU:    { flag: '🇪🇺', label: '유럽',   color: 'bg-green-600' },
  NA:    { flag: '🇺🇸', label: '북미',   color: 'bg-orange-600' },
  SEA:   { flag: '🌏', label: '동남아', color: 'bg-teal-600' },
  BR:    { flag: '🇧🇷', label: '브라질', color: 'bg-lime-600' },
  ME:    { flag: '🌍', label: '중동',   color: 'bg-amber-600' },
  MIXED: { flag: '🌐', label: '혼합',   color: 'bg-yellow-600' },
};

const rankColors = [
  'text-yellow-400',
  'text-slate-300',
  'text-orange-400',
];

function getRankColor(i) {
  return rankColors[i] ?? 'text-white';
}

// 클랜 등급 — mmrCalculator.js 티어와 동일 기준 (새 공식 기반)
function clanGrade(mmr) {
  if (mmr >= 1900) return { grade: 'S', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30', desc: 'Master — 최상위 클랜' };
  if (mmr >= 1700) return { grade: 'A', color: 'text-sky-400',    bg: 'bg-sky-400/10 border-sky-400/30',       desc: 'Diamond — 상위 클랜' };
  if (mmr >= 1500) return { grade: 'B', color: 'text-teal-400',   bg: 'bg-teal-400/10 border-teal-400/30',     desc: 'Platinum — 고수 클랜' };
  if (mmr >= 1350) return { grade: 'C', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30', desc: 'Gold — 평균 이상' };
  if (mmr >= 1180) return { grade: 'D', color: 'text-gray-300',   bg: 'bg-gray-400/10 border-gray-400/30',     desc: 'Silver — 평균 수준' };
  return             { grade: 'E', color: 'text-amber-500',  bg: 'bg-amber-500/10 border-amber-500/30',   desc: 'Bronze — 성장 중' };
}

function fmtTime(sec) {
  if (!sec) return 'N/A';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}분 ${s}초`;
}

function timeAgo(dateStr) {
  if (!dateStr) return 'N/A';
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return '오늘';
  if (d < 30) return `${d}일 전`;
  if (d < 365) return `${Math.floor(d / 30)}개월 전`;
  return `${Math.floor(d / 365)}년 전`;
}

// ─── 소형 컴포넌트 ───────────────────────────────────────────────────────────

const Tooltip = ({ children, content }) => {
  const [vis, setVis] = useState(false);
  return (
    <div className="relative inline-block" onMouseEnter={() => setVis(true)} onMouseLeave={() => setVis(false)}>
      {children}
      {vis && (
        <div className="absolute z-[99999] px-3 py-2 text-xs text-white bg-gray-900 border border-gray-700 rounded-lg shadow-xl min-w-[220px] max-w-[340px] break-words whitespace-normal bottom-full mb-2 left-1/2 -translate-x-1/2">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-transparent border-t-4 border-t-gray-900" />
        </div>
      )}
    </div>
  );
};

// 수평 진행 바
const StatBar = ({ value, max, color = 'bg-blue-500', label, sub }) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-semibold">{sub ?? value}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

// 등급 분포 바
const TierBar = ({ expert, advanced, intermediate, beginner }) => {
  const total = expert + advanced + intermediate + beginner || 1;
  const pcts = [
    { label: 'S', pct: Math.round((expert / total) * 100), color: 'bg-yellow-400' },
    { label: 'A', pct: Math.round((advanced / total) * 100), color: 'bg-orange-400' },
    { label: 'B', pct: Math.round((intermediate / total) * 100), color: 'bg-blue-400' },
    { label: 'C↓', pct: Math.round((beginner / total) * 100), color: 'bg-gray-500' },
  ].filter((t) => t.pct > 0);

  return (
    <div>
      <div className="flex h-5 rounded-full overflow-hidden gap-0.5">
        {pcts.map((t) => (
          <div key={t.label} className={`${t.color} flex items-center justify-center text-[10px] font-bold text-white`} style={{ width: `${t.pct}%` }}>
            {t.pct >= 10 ? t.label : ''}
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-2">
        {[
          { label: 'S (1600+)', count: expert, color: 'bg-yellow-400' },
          { label: 'A (1400+)', count: advanced, color: 'bg-orange-400' },
          { label: 'B (1200+)', count: intermediate, color: 'bg-blue-400' },
          { label: 'C↓ (<1200)', count: beginner, color: 'bg-gray-500' },
        ].map((t) => (
          <div key={t.label} className="flex items-center gap-1 text-xs text-gray-400">
            <div className={`w-2 h-2 rounded-full ${t.color}`} />
            {t.label}: {t.count}명
          </div>
        ))}
      </div>
    </div>
  );
};

// 탑 퍼포머 리스트
const TopList = ({ label, icon, items, unit = '' }) => (
  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
    <div className="text-xs text-gray-400 font-semibold mb-3 flex items-center gap-1.5">
      <span>{icon}</span> {label}
    </div>
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold w-4 ${getRankColor(i)}`}>#{i + 1}</span>
            <Link href={`/player/${encodeURIComponent(item.server || 'steam')}/${encodeURIComponent(item.name)}`}
              className="text-sm hover:text-blue-400 transition-colors truncate max-w-[120px]">
              {item.name}
            </Link>
          </div>
          <span className="text-sm font-bold text-white">{item.value}{unit}</span>
        </div>
      ))}
    </div>
  </div>
);

// ─── 메인 ────────────────────────────────────────────────────────────────────

export default function ClanDetail() {
  const router = useRouter();
  const { clanName } = router.query;

  const [clanData, setClanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [memberSort, setMemberSort] = useState('mmr');

  useEffect(() => {
    if (!clanName) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/clan/${encodeURIComponent(clanName)}`);
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('서버에서 올바르지 않은 응답을 받았습니다');
        if (res.status === 404) throw new Error('클랜을 찾을 수 없습니다');
        if (!res.ok) throw new Error(`클랜 데이터를 가져올 수 없습니다 (${res.status})`);
        setClanData(await res.json());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [clanName]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-900 text-white" style={{ marginTop: '-5rem' }}>
          <div className="pt-32 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">클랜 정보 로딩 중...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4" style={{ marginTop: '-5rem' }}>
          <div className="text-5xl">😕</div>
          <div className="text-xl font-bold text-red-400">{error}</div>
          <Link href="/clan-analytics" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition-colors">
            ← 클랜 분석으로 돌아가기
          </Link>
        </div>
      </Layout>
    );
  }

  const { clan, ranking, members, stats, distribution, topPerformers, styleDistribution, strengths, weaknesses } = clanData;
  const grade = stats?.avgMMR ? clanGrade(Number(stats.avgMMR)) : null;
  const reg = regionMeta[clan.region] ?? { flag: '❓', label: clan.region || '미분류', color: 'bg-gray-600' };

  // 멤버 정렬
  const sortedMembers = [...(members || [])].sort((a, b) => {
    if (memberSort === 'mmr') return (b.mmr || 0) - (a.mmr || 0);
    if (memberSort === 'kills') return Number(b.stats?.avgKills || 0) - Number(a.stats?.avgKills || 0);
    if (memberSort === 'damage') return (b.stats?.avgDamage || 0) - (a.stats?.avgDamage || 0);
    if (memberSort === 'winRate') return Number(b.stats?.winRate || 0) - Number(a.stats?.winRate || 0);
    if (memberSort === 'top10') return Number(b.stats?.top10Rate || 0) - Number(a.stats?.top10Rate || 0);
    return 0;
  });

  const tabs = [
    { id: 'overview', name: '개요', icon: '📊' },
    { id: 'members', name: '멤버', icon: '👥' },
    { id: 'stats', name: '통계', icon: '📈' },
    { id: 'analysis', name: '분석', icon: '🔍' },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-950 text-white" style={{ marginTop: '-5rem' }}>

        {/* ── 히어로 헤더 ─────────────────────────────────────────────── */}
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 border-b border-gray-700/60 pt-28 pb-8 px-4">
          <div className="max-w-6xl mx-auto">
            <Link href="/clan-analytics" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-400 transition-colors mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              클랜 분석으로 돌아가기
            </Link>

            <div className="flex flex-col lg:flex-row lg:items-end gap-6 justify-between">
              {/* 클랜명 + 기본 정보 */}
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-3xl lg:text-4xl font-black tracking-tight">{clan.name}</h1>
                  {clan.tag && clan.tag !== 'N/A' && (
                    <span className="bg-gray-700 text-gray-200 px-3 py-1 rounded-lg font-mono text-lg border border-gray-600">
                      [{clan.tag}]
                    </span>
                  )}
                  {ranking?.overall && (
                    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${
                      ranking.overall === 1 ? 'border-yellow-400 text-yellow-400 bg-yellow-400/10'
                      : ranking.overall <= 3 ? 'border-gray-300 text-gray-300 bg-gray-300/10'
                      : ranking.overall <= 10 ? 'border-orange-400 text-orange-400 bg-orange-400/10'
                      : 'border-blue-400 text-blue-400 bg-blue-400/10'
                    }`}>
                      #{ranking.overall} 위
                    </span>
                  )}
                  {grade && (
                    <span className={`px-3 py-1 rounded-full text-sm font-black border ${grade.bg} ${grade.color}`}>
                      {grade.grade} 등급
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-white ${reg.color}`}>
                    {reg.flag} {reg.label}
                  </span>
                  <span>레벨 {clan.level}</span>
                  <span className="text-gray-600">•</span>
                  <span>PUBG 멤버 {clan.apiMemberCount}명</span>
                  {stats && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span>데이터 확인 {stats.memberCount}명</span>
                    </>
                  )}
                  {clan.updatedAt && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span>마지막 동기화: {new Date(clan.updatedAt).toLocaleDateString('ko-KR')}</span>
                    </>
                  )}
                </div>
              </div>

              {/* 핵심 지표 빠른 요약 */}
              {stats && (
                <div className="flex gap-3 flex-wrap lg:flex-nowrap">
                  {[
                    { label: '평균 MMR', value: stats.avgMMR, color: 'text-blue-400' },
                    { label: '평균 딜량', value: stats.avgDamage, color: 'text-orange-400' },
                    { label: '평균 승률', value: `${stats.winRate}%`, color: 'text-green-400' },
                    { label: 'Top10 진입률', value: `${stats.top10Rate}%`, color: 'text-purple-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-3 text-center min-w-[90px]">
                      <div className={`text-xl font-black ${color}`}>{value}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 탭 ──────────────────────────────────────────────────────── */}
        <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4">
            <nav className="flex gap-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tab.icon} {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* ── 탭 콘텐츠 ───────────────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

          {/* ────────── 개요 탭 ────────── */}
          {activeTab === 'overview' && (
            <>
              {/* 6개 핵심 지표 카드 */}
              {stats ? (
                <section>
                  <h2 className="text-lg font-bold mb-4 text-gray-200">핵심 지표</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { icon: '🏆', label: '평균 MMR', value: stats.avgMMR, color: 'text-blue-400', sub: grade?.desc },
                      { icon: '💥', label: '평균 딜량', value: stats.avgDamage, color: 'text-orange-400', sub: '게임당' },
                      { icon: '🎯', label: '평균 킬', value: Number(stats.avgKills).toFixed(1), color: 'text-red-400', sub: '게임당' },
                      { icon: '🤝', label: '평균 어시', value: Number(stats.avgAssists).toFixed(1), color: 'text-teal-400', sub: '게임당' },
                      { icon: '👑', label: '승률', value: `${stats.winRate}%`, color: 'text-green-400', sub: '전체 기준' },
                      { icon: '🛡️', label: 'Top 10', value: `${stats.top10Rate}%`, color: 'text-purple-400', sub: '진입률' },
                    ].map(({ icon, label, value, color, sub }) => (
                      <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
                        <div className="text-xl mb-1">{icon}</div>
                        <div className={`text-xl font-black ${color}`}>{value}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                        {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <div className="bg-gray-800 rounded-xl p-6 text-center text-gray-500">통계 데이터가 없습니다</div>
              )}

              {/* 클랜 등급 + 순위 */}
              <section>
                <h2 className="text-lg font-bold mb-4 text-gray-200">클랜 평가 & 순위</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 등급 카드 */}
                  {grade && (
                    <div className={`border rounded-xl p-6 ${grade.bg}`}>
                      <div className="flex items-center gap-4">
                        <div className={`text-6xl font-black ${grade.color}`}>{grade.grade}</div>
                        <div>
                          <div className={`text-xl font-bold ${grade.color}`}>{grade.desc}</div>
                          <div className="text-sm text-gray-400 mt-1">평균 MMR {stats.avgMMR} 기준</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            S≥1600 · A≥1400 · B≥1200 · C≥1000 · D&lt;1000
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* 순위 카드 */}
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <div className="text-sm text-gray-400 mb-3">전체 클랜 순위</div>
                    <div className="flex items-end gap-2">
                      <span className={`text-5xl font-black ${ranking?.overall <= 3 ? 'text-yellow-400' : ranking?.overall <= 10 ? 'text-orange-400' : 'text-white'}`}>
                        #{ranking?.overall ?? '—'}
                      </span>
                      <span className="text-gray-500 text-sm mb-1 pb-1">위</span>
                    </div>
                    {ranking?.overall <= 10 && (
                      <div className="mt-2 text-xs font-bold text-yellow-400">🏅 전체 TOP 10 클랜</div>
                    )}
                  </div>
                </div>
              </section>

              {/* 멤버 등급 분포 미리보기 */}
              {distribution && (
                <section>
                  <h2 className="text-lg font-bold mb-4 text-gray-200">멤버 등급 분포</h2>
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                    <TierBar {...distribution} />
                  </div>
                </section>
              )}

              {/* TOP 3 멤버 스포트라이트 */}
              {topPerformers?.byMMR?.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold mb-4 text-gray-200">TOP 3 멤버 (MMR 기준)</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {topPerformers.byMMR.slice(0, 3).map((m, i) => {
                      const medalIcons = ['🥇', '🥈', '🥉'];
                      const member = members?.find((x) => x.playerName === m.name);
                      return (
                        <div key={m.name} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">{medalIcons[i]}</span>
                            <Link
                              href={`/player/${encodeURIComponent(m.server || 'steam')}/${encodeURIComponent(m.name)}`}
                              className="font-bold hover:text-blue-400 transition-colors truncate"
                            >
                              {m.name}
                            </Link>
                          </div>
                          <div className="text-2xl font-black text-blue-400">{m.value}</div>
                          <div className="text-xs text-gray-500">MMR</div>
                          {member?.stats && (
                            <div className="mt-3 pt-3 border-t border-gray-700 grid grid-cols-2 gap-1 text-xs">
                              <div className="text-gray-400">딜량 <span className="text-orange-400 font-bold">{member.stats.avgDamage}</span></div>
                              <div className="text-gray-400">킬 <span className="text-red-400 font-bold">{member.stats.avgKills}</span></div>
                              <div className="text-gray-400">승률 <span className="text-green-400 font-bold">{member.stats.winRate}%</span></div>
                              <div className="text-gray-400">Top10 <span className="text-purple-400 font-bold">{member.stats.top10Rate}%</span></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}

          {/* ────────── 멤버 탭 ────────── */}
          {activeTab === 'members' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <h2 className="text-lg font-bold text-gray-200">클랜 멤버 ({sortedMembers.length}명)</h2>
                {/* 정렬 버튼 */}
                <div className="flex gap-1 flex-wrap">
                  {[
                    { key: 'mmr', label: 'MMR' },
                    { key: 'damage', label: '딜량' },
                    { key: 'kills', label: '킬' },
                    { key: 'winRate', label: '승률' },
                    { key: 'top10', label: 'Top10' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setMemberSort(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                        memberSort === key
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-800/80 text-gray-400 text-xs">
                        <th className="px-4 py-3 text-left w-10">#</th>
                        <th className="px-4 py-3 text-left">닉네임</th>
                        <th className="px-4 py-3 text-right">
                          <Tooltip content="PK.GG 독자 계산 MMR — 킬·딜량·Top10 종합">
                            <span className="cursor-help border-b border-dotted border-gray-600">MMR</span>
                          </Tooltip>
                        </th>
                        <th className="px-4 py-3 text-right">평균 딜</th>
                        <th className="px-4 py-3 text-right">평균 킬</th>
                        <th className="px-4 py-3 text-right">승률</th>
                        <th className="px-4 py-3 text-right">Top10</th>
                        <th className="px-4 py-3 text-right">생존시간</th>
                        <th className="px-4 py-3 text-right text-gray-600">마지막 업데이트</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {sortedMembers.map((member, i) => {
                        const s = member.stats;
                        return (
                          <tr key={member.id} className="hover:bg-gray-800/40 transition-colors">
                            <td className="px-4 py-3">
                              <span className={`font-bold text-sm ${getRankColor(i)}`}>
                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Link
                                href={`/player/${encodeURIComponent(member.server || 'steam')}/${encodeURIComponent(member.playerName)}`}
                                className="font-semibold hover:text-blue-400 transition-colors"
                              >
                                {member.playerName}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-right font-black text-blue-400">{member.mmr || '—'}</td>
                            <td className="px-4 py-3 text-right text-orange-400 font-semibold">{s?.avgDamage ?? '—'}</td>
                            <td className="px-4 py-3 text-right text-red-400 font-semibold">{s?.avgKills ?? '—'}</td>
                            <td className="px-4 py-3 text-right text-green-400 font-semibold">{s?.winRate != null ? `${s.winRate}%` : '—'}</td>
                            <td className="px-4 py-3 text-right text-purple-400 font-semibold">{s?.top10Rate != null ? `${s.top10Rate}%` : '—'}</td>
                            <td className="px-4 py-3 text-right text-gray-400">{s?.avgSurviveTime ? fmtTime(s.avgSurviveTime) : '—'}</td>
                            <td className="px-4 py-3 text-right text-gray-600 text-xs">{timeAgo(member.lastActiveAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ────────── 통계 탭 ────────── */}
          {activeTab === 'stats' && (
            <>
              {!stats ? (
                <div className="bg-gray-800 rounded-xl p-10 text-center text-gray-500">통계 데이터가 없습니다</div>
              ) : (
                <>
                  {/* 배그 평균 대비 비교 */}
                  <section>
                    <h2 className="text-lg font-bold mb-4 text-gray-200">배그 평균 대비 클랜 성과</h2>
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
                      <p className="text-xs text-gray-500 mb-2">막대 너비 = 배그 상위권 기준치(100%) 대비 비율</p>
                      <StatBar label="평균 딜량" value={Number(stats.avgDamage)} max={500} color="bg-orange-500"
                        sub={`${stats.avgDamage} (배그 평균 ~200)`} />
                      <StatBar label="평균 킬" value={Number(stats.avgKills)} max={5} color="bg-red-500"
                        sub={`${stats.avgKills}킬 (배그 평균 ~1.5)`} />
                      <StatBar label="승률" value={Number(stats.winRate)} max={20} color="bg-green-500"
                        sub={`${stats.winRate}% (배그 평균 ~5%)`} />
                      <StatBar label="Top10 진입률" value={Number(stats.top10Rate)} max={70} color="bg-purple-500"
                        sub={`${stats.top10Rate}% (배그 평균 ~20%)`} />
                      <StatBar label="평균 생존시간" value={Number(stats.avgSurviveTime)} max={2000} color="bg-teal-500"
                        sub={`${fmtTime(stats.avgSurviveTime)} (배그 평균 ~13분)`} />
                      <StatBar label="평균 어시스트" value={Number(stats.avgAssists)} max={3} color="bg-blue-500"
                        sub={`${stats.avgAssists}개 (배그 평균 ~0.8)`} />
                    </div>
                  </section>

                  {/* 멤버 등급 분포 */}
                  {distribution && (
                    <section>
                      <h2 className="text-lg font-bold mb-4 text-gray-200">멤버 MMR 등급 분포</h2>
                      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                        <TierBar {...distribution} />
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { label: 'S (1900+)', count: distribution.expert, desc: 'Master', color: 'text-purple-400 border-purple-400/30 bg-purple-400/5' },
                            { label: 'A (1700+)', count: distribution.advanced, desc: 'Diamond', color: 'text-sky-400 border-sky-400/30 bg-sky-400/5' },
                            { label: 'B (1500+)', count: distribution.intermediate, desc: 'Platinum', color: 'text-teal-400 border-teal-400/30 bg-teal-400/5' },
                            { label: 'C↓ (<1500)', count: distribution.beginner, desc: 'Gold↓', color: 'text-gray-400 border-gray-600/30 bg-gray-600/5' },
                          ].map(({ label, count, desc, color }) => (
                            <div key={label} className={`rounded-lg border p-3 ${color}`}>
                              <div className="text-2xl font-black">{count}명</div>
                              <div className="text-xs mt-0.5">{label}</div>
                              <div className="text-xs opacity-60">{desc}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}

                  {/* 카테고리별 TOP 3 */}
                  {topPerformers && (
                    <section>
                      <h2 className="text-lg font-bold mb-4 text-gray-200">카테고리별 TOP 3</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <TopList label="MMR 랭킹" icon="🏆" items={topPerformers.byMMR} />
                        <TopList label="평균 딜량" icon="💥" items={topPerformers.byDamage} />
                        <TopList label="평균 킬" icon="🎯" items={topPerformers.byKills} />
                        <TopList label="승률" icon="👑" items={topPerformers.byWinRate} />
                        <TopList label="Top10 진입률" icon="🛡️" items={topPerformers.byTop10} />
                      </div>
                    </section>
                  )}

                  {/* 수치 요약 테이블 */}
                  <section>
                    <h2 className="text-lg font-bold mb-4 text-gray-200">클랜 평균 수치 요약</h2>
                    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-700 text-gray-400 text-xs">
                          <tr>
                            <th className="px-5 py-3 text-left">지표</th>
                            <th className="px-5 py-3 text-right">클랜 평균</th>
                            <th className="px-5 py-3 text-right">배그 평균</th>
                            <th className="px-5 py-3 text-right">평가</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {[
                            { label: '평균 MMR', clan: stats.avgMMR, avg: '~1200', ok: Number(stats.avgMMR) >= 1200 },
                            { label: '평균 딜량', clan: stats.avgDamage, avg: '~200', ok: Number(stats.avgDamage) >= 200 },
                            { label: '평균 킬', clan: stats.avgKills, avg: '~1.5', ok: Number(stats.avgKills) >= 1.5 },
                            { label: '평균 어시스트', clan: stats.avgAssists, avg: '~0.8', ok: Number(stats.avgAssists) >= 0.8 },
                            { label: '승률', clan: `${stats.winRate}%`, avg: '~5%', ok: Number(stats.winRate) >= 5 },
                            { label: 'Top10 진입률', clan: `${stats.top10Rate}%`, avg: '~20%', ok: Number(stats.top10Rate) >= 20 },
                            { label: '평균 생존시간', clan: fmtTime(stats.avgSurviveTime), avg: '~13분', ok: Number(stats.avgSurviveTime) >= 780 },
                          ].map(({ label, clan: cVal, avg, ok }) => (
                            <tr key={label} className="hover:bg-gray-800/60">
                              <td className="px-5 py-3 text-gray-300">{label}</td>
                              <td className="px-5 py-3 text-right font-bold text-white">{cVal}</td>
                              <td className="px-5 py-3 text-right text-gray-500">{avg}</td>
                              <td className="px-5 py-3 text-right">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ok ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                                  {ok ? '평균 이상' : '개선 필요'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}
            </>
          )}

          {/* ────────── 분석 탭 ────────── */}
          {activeTab === 'analysis' && (
            <>
              {!stats ? (
                <div className="bg-gray-800 rounded-xl p-10 text-center text-gray-500">분석 데이터가 없습니다</div>
              ) : (
                <>
                  {/* 종합 평가 */}
                  {grade && (
                    <section>
                      <h2 className="text-lg font-bold mb-4 text-gray-200">종합 클랜 평가</h2>
                      <div className={`border rounded-xl p-6 ${grade.bg}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                          <div className={`text-8xl font-black ${grade.color} leading-none`}>{grade.grade}</div>
                          <div>
                            <div className={`text-2xl font-bold ${grade.color}`}>{grade.desc}</div>
                            <div className="text-sm text-gray-400 mt-1">
                              {clan.name}의 평균 MMR <span className="font-bold text-white">{stats.avgMMR}</span> 기준
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                              데이터 확인 멤버 {stats.memberCount}명 · PUBG 공식 멤버 {clan.apiMemberCount}명
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* 강점 & 약점 */}
                  <section>
                    <h2 className="text-lg font-bold mb-4 text-gray-200">강점 & 약점 분석</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <span>🏆</span>
                          <span className="font-bold text-emerald-400 text-sm">클랜 강점</span>
                        </div>
                        <div className="space-y-3">
                          {strengths.map((s, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="w-5 h-5 bg-emerald-600 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{i + 1}</span>
                              <div>
                                <div className="text-sm font-bold text-emerald-300">{s.label}</div>
                                <div className="text-xs text-emerald-600 mt-0.5">{s.desc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-orange-950/30 border border-orange-800/30 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <span>⚡</span>
                          <span className="font-bold text-orange-400 text-sm">개선 포인트</span>
                        </div>
                        <div className="space-y-3">
                          {weaknesses.map((w, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="w-5 h-5 bg-orange-600 text-white rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{i + 1}</span>
                              <div>
                                <div className="text-sm font-bold text-orange-300">{w.label}</div>
                                <div className="text-xs text-orange-600/80 mt-0.5">{w.desc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* 멤버 플레이스타일 분포 */}
                  {styleDistribution && stats.memberCount > 0 && (
                    <section>
                      <h2 className="text-lg font-bold mb-4 text-gray-200">멤버 플레이스타일 분포</h2>
                      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
                        {[
                          { key: 'aggressive', label: '공격형', icon: '⚔️', color: 'bg-red-500', desc: '킬 2.5+ & 딜 300+' },
                          { key: 'passive', label: '생존형', icon: '🛡️', color: 'bg-blue-500', desc: '생존 1200s+ & Top10 30%+' },
                          { key: 'sniper', label: '딜링형', icon: '🎯', color: 'bg-purple-500', desc: '딜 300+ & 킬 낮음' },
                          { key: 'support', label: '지원형', icon: '🤝', color: 'bg-teal-500', desc: '어시스트 1.5+' },
                          { key: 'balanced', label: '균형형', icon: '⚖️', color: 'bg-gray-500', desc: '복합 스타일' },
                        ].map(({ key, label, icon, color, desc }) => {
                          const count = styleDistribution[key] || 0;
                          const pct = stats.memberCount > 0 ? Math.round((count / stats.memberCount) * 100) : 0;
                          return (
                            <div key={key} className="flex items-center gap-3">
                              <span className="text-sm w-5 text-center">{icon}</span>
                              <span className="text-xs text-gray-400 w-16 flex-shrink-0">{label}</span>
                              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-bold text-white w-8 text-right">{count}명</span>
                              <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                              <span className="text-xs text-gray-600 hidden sm:block w-36">{desc}</span>
                            </div>
                          );
                        })}
                        <p className="text-xs text-gray-600 pt-2 border-t border-gray-700">
                          * 각 멤버의 avgKills, avgDamage, avgSurviveTime, top10Rate, avgAssists 기반으로 자동 분류
                        </p>
                      </div>
                    </section>
                  )}

                  {/* 클랜 활동성 분석 */}
                  {members && (
                    <section>
                      <h2 className="text-lg font-bold mb-4 text-gray-200">멤버 활동성 분석</h2>
                      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                        {(() => {
                          const now = Date.now();
                          const buckets = { d30: 0, d60: 0, d90: 0, old: 0 };
                          for (const m of members) {
                            if (!m.lastActiveAt) { buckets.old++; continue; }
                            const days = (now - new Date(m.lastActiveAt).getTime()) / 86400000;
                            if (days <= 30) buckets.d30++;
                            else if (days <= 60) buckets.d60++;
                            else if (days <= 90) buckets.d90++;
                            else buckets.old++;
                          }
                          const total = members.length || 1;
                          const rows = [
                            { label: '30일 이내 업데이트', count: buckets.d30, pct: Math.round((buckets.d30 / total) * 100), color: 'bg-green-500', note: '활성 멤버' },
                            { label: '31~60일', count: buckets.d60, pct: Math.round((buckets.d60 / total) * 100), color: 'bg-yellow-500', note: '비활성 주의' },
                            { label: '61~90일', count: buckets.d90, pct: Math.round((buckets.d90 / total) * 100), color: 'bg-orange-500', note: '장기 미활성' },
                            { label: '90일 초과', count: buckets.old, pct: Math.round((buckets.old / total) * 100), color: 'bg-red-500', note: '탈퇴 의심' },
                          ];
                          return (
                            <div className="space-y-3">
                              {rows.map(({ label, count, pct, color, note }) => (
                                <div key={label} className="flex items-center gap-3">
                                  <span className="text-xs text-gray-400 w-32 flex-shrink-0">{label}</span>
                                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-xs font-bold text-white w-10 text-right">{count}명</span>
                                  <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                                  <span className="text-xs text-gray-600 hidden sm:block w-24">{note}</span>
                                </div>
                              ))}
                              <p className="text-xs text-gray-600 pt-2 border-t border-gray-700">
                                * lastUpdated 기준 — 유저 검색 시 자동 업데이트
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
