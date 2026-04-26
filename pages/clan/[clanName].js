// pages/clan/[clanName].js — 클랜 상세 페이지

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/layout/Layout';
import { useT } from '../../utils/i18n';
import { useAuth } from '../../utils/useAuth';

// ─── 유틸 ──────────────────────────────────────────────────────────────────────

const regionFlags = {
  KR: '🇰🇷', CN: '🇨🇳', JP: '🇯🇵', RU: '🇷🇺', EU: '🇪🇺',
  NA: '🇺🇸', SEA: '🌏', BR: '🇧🇷', ME: '🌍', MIXED: '🌐',
};

const regionColors = {
  KR: 'bg-blue-600', CN: 'bg-red-600', JP: 'bg-purple-600', RU: 'bg-red-700',
  EU: 'bg-green-600', NA: 'bg-orange-600', SEA: 'bg-teal-600', BR: 'bg-lime-600',
  ME: 'bg-amber-600', MIXED: 'bg-yellow-600',
};

const rankColors = ['text-yellow-400', 'text-slate-300', 'text-orange-400'];

function getRankColor(i) {
  return rankColors[i] ?? 'text-white';
}

// 클랜 등급
function clanGrade(mmr, t) {
  const _t = (k, fallback) => (t ? t(k) : fallback);
  if (mmr >= 1900) return { grade: 'S', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30', desc: `Master — ${_t('cd.grade_s_desc', '최상위 클랜')}` };
  if (mmr >= 1700) return { grade: 'A', color: 'text-sky-400',    bg: 'bg-sky-400/10 border-sky-400/30',       desc: `Diamond — ${_t('cd.grade_a_desc', '상위 클랜')}` };
  if (mmr >= 1500) return { grade: 'B', color: 'text-teal-400',   bg: 'bg-teal-400/10 border-teal-400/30',     desc: `Platinum — ${_t('cd.grade_b_desc', '고수 클랜')}` };
  if (mmr >= 1350) return { grade: 'C', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30', desc: `Gold — ${_t('cd.grade_c_desc', '평균 이상')}` };
  if (mmr >= 1180) return { grade: 'D', color: 'text-gray-300',   bg: 'bg-gray-400/10 border-gray-400/30',     desc: `Silver — ${_t('cd.grade_d_desc', '평균 수준')}` };
  return             { grade: 'E', color: 'text-amber-500',  bg: 'bg-amber-500/10 border-amber-500/30',   desc: `Bronze — ${_t('cd.grade_e_desc', '성장 중')}` };
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
  const { t } = useT();
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
        ].map((tier) => (
          <div key={tier.label} className="flex items-center gap-1 text-xs text-gray-400">
            <div className={`w-2 h-2 rounded-full ${tier.color}`} />
            {tier.label}: {tier.count}{t('cd.persons')}
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
  const { t } = useT();
  const { user } = useAuth() || {};

  const [clanData, setClanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [memberSort, setMemberSort] = useState('mmr');
  const [allSquads, setAllSquads] = useState(null); // { squads: [...], unassigned: [...] }
  const [rankingData, setRankingData] = useState(null);
  const [rankingLoading, setRankingLoading] = useState(false);

  // i18n 유틸
  const fmtTime = (sec) => {
    if (!sec) return 'N/A';
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}${t('cd.min')} ${s}${t('cd.sec')}`;
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return 'N/A';
    const diff = Date.now() - new Date(dateStr).getTime();
    const d = Math.floor(diff / 86400000);
    if (d === 0) return t('cd.today');
    if (d < 30) return `${d}${t('cd.days_ago')}`;
    if (d < 365) return `${Math.floor(d / 30)}${t('cd.months_ago')}`;
    return `${Math.floor(d / 365)}${t('cd.years_ago')}`;
  };

  useEffect(() => {
    if (!clanName) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/clan/${encodeURIComponent(clanName)}`);
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('서버에서 올바르지 않은 응답을 받았습니다');
        if (res.status === 404) throw new Error(t('cd.not_found'));
        if (!res.ok) throw new Error(`클랜 데이터를 가져올 수 없습니다 (${res.status})`);
        setClanData(await res.json());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [clanName]);

  // 랭킹 탭 진입 시 데이터 로드
  useEffect(() => {
    if (activeTab !== 'ranking' || !clanName || rankingData) return;
    (async () => {
      try {
        setRankingLoading(true);
        const res = await fetch(`/api/clan/${encodeURIComponent(clanName)}/ranking`);
        if (res.ok) setRankingData(await res.json());
      } catch (_) {} finally {
        setRankingLoading(false);
      }
    })();
  }, [activeTab, clanName]);

  if (loading) {
    return (
      <Layout>
        <Head>
          <title>클랜 정보 로딩 중... | PKGG</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="min-h-screen bg-gray-900 text-white" style={{ marginTop: '-5rem' }}>
          <div className="pt-32 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">{t('cd.loading')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Head>
          <title>클랜을 찾을 수 없습니다 | PKGG</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center gap-4" style={{ marginTop: '-5rem' }}>
          <div className="text-5xl">😕</div>
          <div className="text-xl font-bold text-red-400">{error}</div>
          <Link href="/clan-analytics" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition-colors">
            {t('cd.error_back')}
          </Link>
        </div>
      </Layout>
    );
  }

  const { clan, ranking, members, stats, distribution, topPerformers, styleDistribution, strengths, weaknesses } = clanData;
  const grade = stats?.avgMMR ? clanGrade(Number(stats.avgMMR), t) : null;

  // ── 접근 권한 계산 ───────────────────────────────────────────────────────────
  // 로그인 유저: 모든 클랜 전체 열람 가능
  // 비로그인: blur 처리
  const canViewFull = !!user;
  const regFlag = regionFlags[clan.region] ?? '❓';
  const regColor = regionColors[clan.region] ?? 'bg-gray-600';
  const regLabel = clan.region ? t('region.' + clan.region) : t('region.UNKNOWN');

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
    { id: 'overview', name: t('cd.tab_overview'), icon: '📊' },
    { id: 'members', name: t('cd.tab_members'), icon: '👥' },
    { id: 'stats', name: t('cd.tab_stats'), icon: '📈' },
    { id: 'analysis', name: t('cd.tab_analysis'), icon: '🔍' },
    { id: 'ranking', name: '랭킹', icon: '🏆' },
    { id: 'custom', name: '커스텀', icon: '⚡' },
  ];

  const clanTitle = clan?.name ? `${clan.name} | PKGG` : '클랜 정보 | PKGG';
  const clanDesc = clan?.name
    ? `${clan.name} 클랜의 멤버 통계, MMR 랭킹, 플레이스타일 분석 정보를 확인하세요.`
    : 'PUBG 클랜 통계 및 분석 정보.';
  const clanUrl = `https://pk.gg/clan/${encodeURIComponent(clan?.name || '')}`;

  return (
    <Layout>
      <Head>
        <title>{clanTitle}</title>
        <meta name="description" content={clanDesc} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={clanUrl} />
        <meta property="og:title" content={clanTitle} />
        <meta property="og:description" content={clanDesc} />
        <meta property="og:image" content="https://pk.gg/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={clanTitle} />
        <meta name="twitter:description" content={clanDesc} />
        <meta name="twitter:image" content="https://pk.gg/og-image.png" />
        <link rel="canonical" href={clanUrl} />
      </Head>
      <div className="min-h-screen bg-gray-950 text-white" style={{ marginTop: '-5rem' }}>

        {/* ── 히어로 헤더 ─────────────────────────────────────────────── */}
        <div className="bg-gradient-to-b from-gray-800 to-gray-900 border-b border-gray-700/60 pt-28 pb-8 px-4">
          <div className="max-w-6xl mx-auto">
            <Link href="/clan-analytics" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-400 transition-colors mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('cd.back')}
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
                      #{ranking.overall}{t('cd.rank_suffix')}
                    </span>
                  )}
                  {grade && (
                    <span className={`px-3 py-1 rounded-full text-sm font-black border ${grade.bg} ${grade.color}`}>
                      {grade.grade} {t('cd.grade_suffix')}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-white ${regColor}`}>
                    {regFlag} {regLabel}
                  </span>
                  <span>{t('cd.level')} {clan.level}</span>
                  <span className="text-gray-600">•</span>
                  <span>{t('cd.pubg_members')} {clan.apiMemberCount}{t('cd.persons')}</span>
                  {stats && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span>{t('cd.data_members')} {stats.memberCount}{t('cd.persons')}</span>
                    </>
                  )}
                  {clan.updatedAt && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span>{t('cd.last_sync')} {new Date(clan.updatedAt).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </div>

              {/* 핵심 지표 빠른 요약 */}
              {stats && (
                <div className="flex gap-3 flex-wrap lg:flex-nowrap">
                  {[
                    { label: t('cd.avg_mmr'), value: stats.avgMMR, color: 'text-blue-400' },
                    { label: t('cd.avg_damage'), value: stats.avgDamage, color: 'text-orange-400' },
                    { label: t('cd.avg_winrate'), value: `${stats.winRate}%`, color: 'text-green-400' },
                    { label: t('cd.top10_rate'), value: `${stats.top10Rate}%`, color: 'text-purple-400' },
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
            <nav className="flex gap-2 py-2.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                      : 'text-gray-300 hover:text-white hover:bg-gray-800 border border-transparent hover:border-gray-700'
                  }`}
                >
                  {tab.icon} {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* ── 접근 제한 배너 ─────────────────────────────────────────── */}
        {!canViewFull && (
          <div className="bg-blue-950/60 border-b border-blue-800/50 px-4 py-3">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm text-blue-300">
                Steam 로그인 후 클랜 상세 데이터를 전체 열람할 수 있습니다.
              </div>
              {!user && (
                <a
                  href="/api/auth/steam-login"
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-1.5 bg-[#1b2838] hover:bg-[#2a475e] text-white text-xs font-semibold rounded-lg transition-colors border border-[#2a475e]"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.623 3.872 10.328 9.092 11.63L9.086 12H12v-1.5c0-.828.672-1.5 1.5-1.5S15 9.672 15 10.5V12h1.5c.828 0 1.5.672 1.5 1.5 0 .796-.622 1.45-1.406 1.496L18 24c3.534-1.257 6-4.649 6-8.5C24 10.745 18.627 0 12 0z"/>
                  </svg>
                  Steam 로그인
                </a>
              )}
            </div>
          </div>
        )}

        {/* ── 탭 콘텐츠 ───────────────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

          {/* ────────── 개요 탭 ────────── */}
          {activeTab === 'overview' && (
            <>
              {/* 6개 핵심 지표 카드 */}
              {stats ? (
                <section>
                  <h2 className="text-lg font-bold mb-4 text-gray-200">{t('cd.key_metrics')}</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { icon: '🏆', label: t('cd.avg_mmr'), value: stats.avgMMR, color: 'text-blue-400', sub: grade?.desc },
                      { icon: '💥', label: t('cd.avg_damage'), value: stats.avgDamage, color: 'text-orange-400', sub: t('cd.game_per') },
                      { icon: '🎯', label: t('cd.avg_kills'), value: Number(stats.avgKills).toFixed(1), color: 'text-red-400', sub: t('cd.game_per') },
                      { icon: '🤝', label: t('cd.avg_assists'), value: Number(stats.avgAssists).toFixed(1), color: 'text-teal-400', sub: t('cd.game_per') },
                      { icon: '👑', label: t('cd.winrate'), value: `${stats.winRate}%`, color: 'text-green-400', sub: t('cd.total_basis') },
                      { icon: '🛡️', label: t('cd.top10'), value: `${stats.top10Rate}%`, color: 'text-purple-400', sub: t('cd.entry_rate') },
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
                <div className="bg-gray-800 rounded-xl p-6 text-center text-gray-500">{t('cd.no_stats')}</div>
              )}

              {/* 클랜 등급 + 순위 */}
              <section>
                <h2 className="text-lg font-bold mb-4 text-gray-200">{t('cd.grade_rank')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 등급 카드 */}
                  {grade && (
                    <div className={`border rounded-xl p-6 ${grade.bg}`}>
                      <div className="flex items-center gap-4">
                        <div className={`text-6xl font-black ${grade.color}`}>{grade.grade}</div>
                        <div>
                          <div className={`text-xl font-bold ${grade.color}`}>{grade.desc}</div>
                          <div className="text-sm text-gray-400 mt-1">{t('cd.avg_mmr')} {stats.avgMMR} {t('cd.mmr_basis')}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            S≥1600 · A≥1400 · B≥1200 · C≥1000 · D&lt;1000
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* 순위 카드 */}
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <div className="text-sm text-gray-400 mb-3">{t('cd.total_rank')}</div>
                    <div className="flex items-end gap-2">
                      <span className={`text-5xl font-black ${ranking?.overall <= 3 ? 'text-yellow-400' : ranking?.overall <= 10 ? 'text-orange-400' : 'text-white'}`}>
                        #{ranking?.overall ?? '—'}
                      </span>
                      <span className="text-gray-500 text-sm mb-1 pb-1">{t('cd.rank_unit')}</span>
                    </div>
                    {ranking?.overall <= 10 && (
                      <div className="mt-2 text-xs font-bold text-yellow-400">{t('cd.top10_clan_badge')}</div>
                    )}
                  </div>
                </div>
              </section>

              {/* 멤버 등급 분포 미리보기 */}
              {distribution && (
                <section>
                  <h2 className="text-lg font-bold mb-4 text-gray-200">{t('cd.member_dist')}</h2>
                  <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                    <TierBar {...distribution} />
                  </div>
                </section>
              )}

              {/* TOP 3 멤버 스포트라이트 */}
              {topPerformers?.byMMR?.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold mb-4 text-gray-200">{t('cd.top3')}</h2>
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
                              <div className="text-gray-400">{t('cd.damage')} <span className="text-orange-400 font-bold">{member.stats.avgDamage}</span></div>
                              <div className="text-gray-400">{t('cd.kills')} <span className="text-red-400 font-bold">{member.stats.avgKills}</span></div>
                              <div className="text-gray-400">{t('cd.winrate')} <span className="text-green-400 font-bold">{member.stats.winRate}%</span></div>
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
                <h2 className="text-lg font-bold text-gray-200">{t('cd.members_title')} ({sortedMembers.length}{t('cd.persons')})</h2>
                {/* 정렬 버튼 */}
                <div className="flex gap-1 flex-wrap">
                  {[
                    { key: 'mmr', label: 'MMR' },
                    { key: 'damage', label: t('cd.damage') },
                    { key: 'kills', label: t('cd.kills') },
                    { key: 'winRate', label: t('cd.winrate') },
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

              <div className={`relative ${!canViewFull ? 'select-none' : ''}`}>
                {!canViewFull && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-950/70 backdrop-blur-sm rounded-xl">
                    <div className="text-center px-6">
                      <div className="text-2xl mb-2">🔒</div>
                      <div className="text-sm font-semibold text-white mb-1">멤버 상세 데이터 잠금</div>
                      <p className="text-xs text-gray-400 mb-3">Steam 로그인 후 전체 열람 가능합니다</p>
                      {!user && (
                        <a href="/api/auth/steam-login" className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1b2838] hover:bg-[#2a475e] text-white text-xs font-semibold rounded-lg transition-colors">
                          Steam 로그인
                        </a>
                      )}
                    </div>
                  </div>
                )}
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-800/80 text-gray-400 text-xs">
                        <th className="px-4 py-3 text-left w-10">#</th>
                        <th className="px-4 py-3 text-left">{t('cd.nickname')}</th>
                        <th className="px-4 py-3 text-right">
                          <Tooltip content={t('cd.mmr_tooltip')}>
                            <span className="cursor-help border-b border-dotted border-gray-600">MMR</span>
                          </Tooltip>
                        </th>
                        <th className="px-4 py-3 text-right">{t('cd.avg_deal_col')}</th>
                        <th className="px-4 py-3 text-right">{t('cd.avg_kill_col')}</th>
                        <th className="px-4 py-3 text-right">{t('cd.winrate_col')}</th>
                        <th className="px-4 py-3 text-right">{t('cd.top10_col')}</th>
                        <th className="px-4 py-3 text-right">{t('cd.survive_time')}</th>
                        <th className="px-4 py-3 text-right text-gray-600">{t('cd.last_update_col')}</th>
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
              </div>{/* /blur wrapper */}
            </>
          )}

          {/* ────────── 통계 탭 ────────── */}
          {activeTab === 'stats' && (
            <>
              {!stats ? (
                <div className="bg-gray-800 rounded-xl p-10 text-center text-gray-500">{t('cd.no_stats')}</div>
              ) : (
                <>
                  {/* 배그 평균 대비 비교 */}
                  <section>
                    <h2 className="text-lg font-bold mb-4 text-gray-200">{t('cd.stats_vs_avg')}</h2>
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
                      <p className="text-xs text-gray-500 mb-2">{t('cd.bar_note')}</p>
                      <StatBar label={t('cd.avg_damage')} value={Number(stats.avgDamage)} max={500} color="bg-orange-500"
                        sub={`${stats.avgDamage} (${t('cd.pubg_avg_prefix')} ~200)`} />
                      <StatBar label={t('cd.avg_kills')} value={Number(stats.avgKills)} max={5} color="bg-red-500"
                        sub={`${stats.avgKills} (${t('cd.pubg_avg_prefix')} ~1.5)`} />
                      <StatBar label={t('cd.winrate')} value={Number(stats.winRate)} max={20} color="bg-green-500"
                        sub={`${stats.winRate}% (${t('cd.pubg_avg_prefix')} ~5%)`} />
                      <StatBar label={t('cd.top10_rate')} value={Number(stats.top10Rate)} max={70} color="bg-purple-500"
                        sub={`${stats.top10Rate}% (${t('cd.pubg_avg_prefix')} ~20%)`} />
                      <StatBar label={t('cd.avg_survive')} value={Number(stats.avgSurviveTime)} max={2000} color="bg-teal-500"
                        sub={`${fmtTime(stats.avgSurviveTime)} (${t('cd.pubg_avg_prefix')} ~13${t('cd.min')})`} />
                      <StatBar label={t('cd.avg_assists')} value={Number(stats.avgAssists)} max={3} color="bg-blue-500"
                        sub={`${stats.avgAssists} (${t('cd.pubg_avg_prefix')} ~0.8)`} />
                    </div>
                  </section>

                  {/* 멤버 등급 분포 */}
                  {distribution && (
                    <section>
                      <h2 className="text-lg font-bold mb-4 text-gray-200">{t('cd.member_mmr_dist')}</h2>
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
                              <div className="text-2xl font-black">{count}{t('cd.persons')}</div>
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
                      <h2 className="text-lg font-bold mb-4 text-gray-200">{t('cd.cat_top3')}</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <TopList label={t('cd.mmr_rank')} icon="🏆" items={topPerformers.byMMR} />
                        <TopList label={t('cd.avg_damage')} icon="💥" items={topPerformers.byDamage} />
                        <TopList label={t('cd.avg_kills')} icon="🎯" items={topPerformers.byKills} />
                        <TopList label={t('cd.winrate')} icon="👑" items={topPerformers.byWinRate} />
                        <TopList label={t('cd.top10_rate')} icon="🛡️" items={topPerformers.byTop10} />
                      </div>
                    </section>
                  )}

                  {/* 수치 요약 테이블 */}
                  <section>
                    <h2 className="text-lg font-bold mb-4 text-gray-200">{t('cd.summary')}</h2>
                    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-700 text-gray-400 text-xs">
                          <tr>
                            <th className="px-5 py-3 text-left">{t('cd.col_metric')}</th>
                            <th className="px-5 py-3 text-right">{t('cd.col_clan_avg')}</th>
                            <th className="px-5 py-3 text-right">{t('cd.col_pubg_avg')}</th>
                            <th className="px-5 py-3 text-right">{t('cd.col_eval')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                          {[
                            { label: t('cd.avg_mmr'), clan: stats.avgMMR, avg: '~1200', ok: Number(stats.avgMMR) >= 1200 },
                            { label: t('cd.avg_damage'), clan: stats.avgDamage, avg: '~200', ok: Number(stats.avgDamage) >= 200 },
                            { label: t('cd.avg_kills'), clan: stats.avgKills, avg: '~1.5', ok: Number(stats.avgKills) >= 1.5 },
                            { label: t('cd.avg_assists_label'), clan: stats.avgAssists, avg: '~0.8', ok: Number(stats.avgAssists) >= 0.8 },
                            { label: t('cd.winrate'), clan: `${stats.winRate}%`, avg: '~5%', ok: Number(stats.winRate) >= 5 },
                            { label: t('cd.top10_rate'), clan: `${stats.top10Rate}%`, avg: '~20%', ok: Number(stats.top10Rate) >= 20 },
                            { label: t('cd.avg_survive'), clan: fmtTime(stats.avgSurviveTime), avg: '~13m', ok: Number(stats.avgSurviveTime) >= 780 },
                          ].map(({ label, clan: cVal, avg, ok }) => (
                            <tr key={label} className="hover:bg-gray-800/60">
                              <td className="px-5 py-3 text-gray-300">{label}</td>
                              <td className="px-5 py-3 text-right font-bold text-white">{cVal}</td>
                              <td className="px-5 py-3 text-right text-gray-500">{avg}</td>
                              <td className="px-5 py-3 text-right">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ok ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                                  {ok ? t('cd.above_avg') : t('cd.need_improve')}
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
                <div className="bg-gray-800 rounded-xl p-10 text-center text-gray-500">{t('cd.no_analysis')}</div>
              ) : (
                <>
                  {/* 종합 평가 */}
                  {grade && (
                    <section>
                      <h2 className="text-lg font-bold mb-4 text-gray-200">{t('cd.analysis_title')}</h2>
                      <div className={`border rounded-xl p-6 ${grade.bg}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                          <div className={`text-8xl font-black ${grade.color} leading-none`}>{grade.grade}</div>
                          <div>
                            <div className={`text-2xl font-bold ${grade.color}`}>{grade.desc}</div>
                            <div className="text-sm text-gray-400 mt-1">
                              {clan.name} {t('cd.avg_mmr')} <span className="font-bold text-white">{stats.avgMMR}</span> {t('cd.mmr_basis')}
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                              {t('cd.data_count')} {stats.memberCount}{t('cd.persons')} · {t('cd.pubg_official_count')} {clan.apiMemberCount}{t('cd.persons')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* 강점 & 약점 */}
                  <section>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <span>🏆</span>
                          <span className="font-bold text-emerald-400 text-sm">{t('cd.strengths')}</span>
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
                          <span className="font-bold text-orange-400 text-sm">{t('cd.weaknesses')}</span>
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
                      <h2 className="text-lg font-bold mb-4 text-gray-200">{t('cd.style_dist')}</h2>
                      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
                        {[
                          { key: 'aggressive', labelKey: 'cd.aggressive', icon: '⚔️', color: 'bg-red-500', desc: '킬 2.5+ & 딜 300+' },
                          { key: 'passive', labelKey: 'cd.passive', icon: '🛡️', color: 'bg-blue-500', desc: '생존 1200s+ & Top10 30%+' },
                          { key: 'sniper', labelKey: 'cd.sniper', icon: '🎯', color: 'bg-purple-500', desc: '딜 300+ & 킬 낮음' },
                          { key: 'support', labelKey: 'cd.support', icon: '🤝', color: 'bg-teal-500', desc: '어시스트 1.5+' },
                          { key: 'balanced', labelKey: 'cd.balanced', icon: '⚖️', color: 'bg-gray-500', desc: '복합 스타일' },
                        ].map(({ key, labelKey, icon, color, desc }) => {
                          const count = styleDistribution[key] || 0;
                          const pct = stats.memberCount > 0 ? Math.round((count / stats.memberCount) * 100) : 0;
                          return (
                            <div key={key} className="flex items-center gap-3">
                              <span className="text-sm w-5 text-center">{icon}</span>
                              <span className="text-xs text-gray-400 w-16 flex-shrink-0">{t(labelKey)}</span>
                              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-bold text-white w-8 text-right">{count}{t('cd.persons')}</span>
                              <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                              <span className="text-xs text-gray-600 hidden sm:block w-36">{desc}</span>
                            </div>
                          );
                        })}
                        <p className="text-xs text-gray-600 pt-2 border-t border-gray-700">{t('cd.style_note')}</p>
                      </div>
                    </section>
                  )}

                  {/* 클랜 활동성 분석 */}
                  {members && (
                    <section>
                      <h2 className="text-lg font-bold mb-4 text-gray-200">{t('cd.activity')}</h2>
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
                            { labelKey: 'cd.d30', count: buckets.d30, pct: Math.round((buckets.d30 / total) * 100), color: 'bg-green-500', noteKey: 'cd.active_label' },
                            { labelKey: 'cd.d31_60', count: buckets.d60, pct: Math.round((buckets.d60 / total) * 100), color: 'bg-yellow-500', noteKey: 'cd.inactive_label' },
                            { labelKey: 'cd.d61_90', count: buckets.d90, pct: Math.round((buckets.d90 / total) * 100), color: 'bg-orange-500', noteKey: 'cd.long_inactive' },
                            { labelKey: 'cd.d90_plus', count: buckets.old, pct: Math.round((buckets.old / total) * 100), color: 'bg-red-500', noteKey: 'cd.suspected_leave' },
                          ];
                          return (
                            <div className="space-y-3">
                              {rows.map(({ labelKey, count, pct, color, noteKey }) => (
                                <div key={labelKey} className="flex items-center gap-3">
                                  <span className="text-xs text-gray-400 w-32 flex-shrink-0">{t(labelKey)}</span>
                                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-xs font-bold text-white w-10 text-right">{count}{t('cd.persons')}</span>
                                  <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                                  <span className="text-xs text-gray-600 hidden sm:block w-24">{t(noteKey)}</span>
                                </div>
                              ))}
                              <p className="text-xs text-gray-600 pt-2 border-t border-gray-700">{t('cd.activity_note')}</p>
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

          {/* ────────── 랭킹 탭 ────────── */}
          {activeTab === 'ranking' && (
            <ClanRankingTab data={rankingData} loading={rankingLoading} />
          )}

          {/* ────────── 커스텀 탭 ────────── */}
          {activeTab === 'custom' && (
            <SquadCustomTab members={members} allSquads={allSquads} setAllSquads={setAllSquads} />
          )}
        </div>
      </div>
    </Layout>
  );
}

// ─── 클랜 내부 랭킹 탭 컴포넌트 ─────────────────────────────────────────────

function ClanRankingTab({ data, loading }) {
  const [lbSort, setLbSort] = useState('mmr');
  const [lbTab, setLbTab] = useState('leaderboard'); // 'leaderboard' | 'weekly' | 'growth'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          랭킹 데이터 로드 중...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 text-gray-500">랭킹 데이터를 불러올 수 없습니다.</div>
    );
  }

  const { leaderboard = [], weeklyMvp = [], growthKing = [] } = data;

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (lbSort === 'mmr') return b.mmr - a.mmr;
    if (lbSort === 'damage') return b.avgDamage - a.avgDamage;
    if (lbSort === 'kills') return parseFloat(b.avgKills) - parseFloat(a.avgKills);
    if (lbSort === 'winRate') return parseFloat(b.winRate) - parseFloat(a.winRate);
    if (lbSort === 'top10') return parseFloat(b.top10Rate) - parseFloat(a.top10Rate);
    return 0;
  });

  const rankMedal = (i) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return `#${i + 1}`;
  };

  const deltaColor = (v) => (v > 0 ? 'text-green-400' : v < 0 ? 'text-red-400' : 'text-gray-400');
  const deltaSign = (v) => (v > 0 ? '+' : '');

  return (
    <div className="space-y-6">
      {/* 탭 네비 */}
      <div className="flex gap-2">
        {[
          { id: 'leaderboard', label: '📋 전체 리더보드' },
          { id: 'weekly', label: `⚡ 이번 주 MVP${weeklyMvp.length ? ` (${weeklyMvp.length}명)` : ''}` },
          { id: 'growth', label: `📈 성장왕${growthKing.length ? ` (${growthKing.length}명)` : ''}` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setLbTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              lbTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 전체 리더보드 */}
      {lbTab === 'leaderboard' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          {/* 정렬 버튼 */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700 flex-wrap">
            <span className="text-xs text-gray-400 mr-1">정렬:</span>
            {[
              { key: 'mmr', label: 'MMR' },
              { key: 'damage', label: '딜량' },
              { key: 'kills', label: '킬' },
              { key: 'winRate', label: '승률' },
              { key: 'top10', label: 'Top10' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setLbSort(key)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  lbSort === key ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-700">
                  <th className="text-left px-4 py-2 w-10">순위</th>
                  <th className="text-left px-4 py-2">닉네임</th>
                  <th className="text-right px-3 py-2">MMR</th>
                  <th className="text-right px-3 py-2">딜량</th>
                  <th className="text-right px-3 py-2">킬</th>
                  <th className="text-right px-3 py-2">승률</th>
                  <th className="text-right px-3 py-2">Top10</th>
                </tr>
              </thead>
              <tbody>
                {sortedLeaderboard.map((m, i) => (
                  <tr key={m.id} className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${i < 3 ? 'bg-gray-700/20' : ''}`}>
                    <td className="px-4 py-2.5 text-sm font-bold">{rankMedal(i)}</td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/player/${encodeURIComponent(m.server || 'steam')}/${encodeURIComponent(m.nickname)}`}
                        className="hover:text-blue-400 transition-colors font-medium"
                      >
                        {m.nickname}
                      </Link>
                    </td>
                    {m.hasData ? (
                      <>
                        <td className="px-3 py-2.5 text-right font-bold text-blue-400">{m.mmr.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right text-gray-300">{m.avgDamage.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right text-gray-300">{m.avgKills}</td>
                        <td className="px-3 py-2.5 text-right text-gray-300">{m.winRate}%</td>
                        <td className="px-3 py-2.5 text-right text-gray-300">{m.top10Rate}%</td>
                      </>
                    ) : (
                      <td colSpan={5} className="px-3 py-2.5 text-right text-gray-600 text-xs">데이터 없음</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 이번 주 MVP */}
      {lbTab === 'weekly' && (
        <div>
          {/* MVP 점수 산출 기준 안내 */}
          <div className="mb-4 px-4 py-3 bg-gray-800/60 border border-gray-700 rounded-xl text-xs text-gray-400 leading-relaxed">
            <span className="text-yellow-400 font-semibold">MVP 점수</span>는 최근 7일간의 매치 기록을 바탕으로 딜·킬·승리를 종합해 산출된 활약 지수입니다.
          </div>
          {weeklyMvp.length === 0 ? (
            <div className="text-center py-16 bg-gray-800 rounded-xl border border-gray-700 text-gray-500">
              <p className="text-2xl mb-3">📭</p>
              최근 7일간 기록된 매치 데이터가 없습니다.
              <p className="text-xs mt-2 text-gray-600">클랜 배치 업데이트 시 자동으로 갱신됩니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 1위 하이라이트 */}
              {weeklyMvp[0] && (
                <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/20 border border-yellow-600/40 rounded-xl p-5 flex items-center gap-5">
                  <div className="text-4xl">🏆</div>
                  <div className="flex-1">
                    <div className="text-xs text-yellow-400 font-semibold mb-0.5">이번 주 MVP</div>
                    <Link
                      href={`/player/${encodeURIComponent(weeklyMvp[0].server)}/${encodeURIComponent(weeklyMvp[0].nickname)}`}
                      className="text-xl font-bold text-white hover:text-yellow-400 transition-colors"
                    >
                      {weeklyMvp[0].nickname}
                    </Link>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-gray-400">{weeklyMvp[0].matches}게임</span>
                      <span className="text-orange-400">딜 {weeklyMvp[0].avgDamage.toLocaleString()}</span>
                      <span className="text-blue-400">킬 {weeklyMvp[0].avgKills}</span>
                      <span className="text-green-400">승 {weeklyMvp[0].wins}회</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">MVP 점수</div>
                    <div className="text-2xl font-black text-yellow-400">{weeklyMvp[0].mvpScore.toLocaleString()}</div>
                  </div>
                </div>
              )}

              {/* 2위~ */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-700">
                      <th className="text-left px-4 py-2">순위</th>
                      <th className="text-left px-4 py-2">닉네임</th>
                      <th className="text-right px-3 py-2">게임 수</th>
                      <th className="text-right px-3 py-2">평균딜</th>
                      <th className="text-right px-3 py-2">평균킬</th>
                      <th className="text-right px-3 py-2">승</th>
                      <th className="text-right px-3 py-2">MVP점수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyMvp.map((m, i) => (
                      <tr key={m.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-2.5 font-bold">{rankMedal(i)}</td>
                        <td className="px-4 py-2.5">
                          <Link href={`/player/${encodeURIComponent(m.server)}/${encodeURIComponent(m.nickname)}`} className="hover:text-blue-400 transition-colors">
                            {m.nickname}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-400">{m.matches}</td>
                        <td className="px-3 py-2.5 text-right">{m.avgDamage.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right">{m.avgKills}</td>
                        <td className="px-3 py-2.5 text-right text-green-400">{m.wins}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-yellow-400">{m.mvpScore.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 성장왕 */}
      {lbTab === 'growth' && (
        <div>
          {growthKing.length === 0 ? (
            <div className="text-center py-16 bg-gray-800 rounded-xl border border-gray-700 text-gray-500">
              <p className="text-2xl mb-3">📊</p>
              비교할 수 있는 성장 데이터가 없습니다.
              <p className="text-xs mt-2 text-gray-600">클랜 배치 업데이트가 2회 이상 실행되면 자동으로 집계됩니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 1위 하이라이트 */}
              {growthKing[0] && (
                <div className="bg-gradient-to-r from-green-900/30 to-teal-900/20 border border-green-600/40 rounded-xl p-5 flex items-center gap-5">
                  <div className="text-4xl">📈</div>
                  <div className="flex-1">
                    <div className="text-xs text-green-400 font-semibold mb-0.5">이번 주 성장왕</div>
                    <Link
                      href={`/player/${encodeURIComponent(growthKing[0].server)}/${encodeURIComponent(growthKing[0].nickname)}`}
                      className="text-xl font-bold text-white hover:text-green-400 transition-colors"
                    >
                      {growthKing[0].nickname}
                    </Link>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className={`font-bold ${deltaColor(growthKing[0].mmrDelta)}`}>MMR {deltaSign(growthKing[0].mmrDelta)}{growthKing[0].mmrDelta}</span>
                      <span className={deltaColor(growthKing[0].dmgDelta)}>딜 {deltaSign(growthKing[0].dmgDelta)}{growthKing[0].dmgDelta}</span>
                      <span className={deltaColor(parseFloat(growthKing[0].killDelta))}>킬 {deltaSign(parseFloat(growthKing[0].killDelta))}{growthKing[0].killDelta}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">현재 MMR</div>
                    <div className="text-2xl font-black text-blue-400">{growthKing[0].currentMmr.toLocaleString()}</div>
                  </div>
                </div>
              )}

              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-700">
                      <th className="text-left px-4 py-2">순위</th>
                      <th className="text-left px-4 py-2">닉네임</th>
                      <th className="text-right px-3 py-2">현재 MMR</th>
                      <th className="text-right px-3 py-2">MMR 변화</th>
                      <th className="text-right px-3 py-2">딜 변화</th>
                      <th className="text-right px-3 py-2">킬 변화</th>
                    </tr>
                  </thead>
                  <tbody>
                    {growthKing.map((m, i) => (
                      <tr key={m.nickname} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-2.5 font-bold">{rankMedal(i)}</td>
                        <td className="px-4 py-2.5">
                          <Link href={`/player/${encodeURIComponent(m.server)}/${encodeURIComponent(m.nickname)}`} className="hover:text-blue-400 transition-colors">
                            {m.nickname}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold text-blue-400">{m.currentMmr.toLocaleString()}</td>
                        <td className={`px-3 py-2.5 text-right font-bold ${deltaColor(m.mmrDelta)}`}>{deltaSign(m.mmrDelta)}{m.mmrDelta}</td>
                        <td className={`px-3 py-2.5 text-right ${deltaColor(m.dmgDelta)}`}>{deltaSign(m.dmgDelta)}{m.dmgDelta}</td>
                        <td className={`px-3 py-2.5 text-right ${deltaColor(parseFloat(m.killDelta))}`}>{deltaSign(parseFloat(m.killDelta))}{m.killDelta}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 스쿼드 추천 탭 컴포넌트 ────────────────────────────────────────────────

function normalize(val, min, max) {
  if (max === min) return 0;
  return (val - min) / (max - min);
}

function classifyRole(member, allMembers) {
  const mmrs    = allMembers.map(m => m.mmr || 0);
  const damages = allMembers.map(m => m.stats?.avgDamage || 0);
  const top10s  = allMembers.map(m => m.stats?.top10Rate || 0);
  const maxMmr  = Math.max(...mmrs, 1);
  const maxDmg  = Math.max(...damages, 1);
  const maxTop  = Math.max(...top10s, 1);
  const mmrPct    = (member.mmr || 0) / maxMmr;
  const damagePct = (member.stats?.avgDamage || 0) / maxDmg;
  const top10Pct  = (member.stats?.top10Rate || 0) / maxTop;
  if (damagePct >= 0.75) return 'dealer';
  if (top10Pct >= 0.75) return 'survivor';
  if (mmrPct >= 0.75) return 'fragger';
  return 'support';
}

function calcBalanceScore(member, allMembers) {
  const vals = (key) => allMembers.map(m => key(m));
  const mmrVals    = vals(m => m.mmr || 0);
  const dmgVals    = vals(m => m.stats?.avgDamage || 0);
  const top10Vals  = vals(m => m.stats?.top10Rate || 0);
  const killVals   = vals(m => m.stats?.avgKills || 0);
  return (
    normalize(member.mmr || 0, Math.min(...mmrVals), Math.max(...mmrVals)) * 0.4 +
    normalize(member.stats?.avgDamage || 0, Math.min(...dmgVals), Math.max(...dmgVals)) * 0.3 +
    normalize(member.stats?.top10Rate || 0, Math.min(...top10Vals), Math.max(...top10Vals)) * 0.2 +
    normalize(member.stats?.avgKills || 0, Math.min(...killVals), Math.max(...killVals)) * 0.1
  );
}

// 멤버를 지정 크기의 스쿼드로 밸런스 분배
function packSquads(members, size) {
  if (!members || members.length === 0) return { squads: [], unassigned: [] };
  if (members.length < size) return { squads: [members], unassigned: [] };

  const n = Math.floor(members.length / size);
  const squads = Array.from({ length: n }, () => []);
  const assigned = new Set();

  const byRole = { dealer: [], fragger: [], survivor: [], support: [] };
  members.forEach(m => byRole[m._role || 'support'].push(m));
  Object.values(byRole).forEach(arr => arr.sort((a, b) => (b._score || 0) - (a._score || 0)));

  for (const role of ['dealer', 'fragger', 'survivor', 'support']) {
    byRole[role].slice(0, n).forEach((m, i) => {
      squads[i].push(m);
      assigned.add(m.playerName || m.id);
    });
  }

  const remaining = members
    .filter(m => !assigned.has(m.playerName || m.id))
    .sort((a, b) => (b._score || 0) - (a._score || 0));

  for (const m of remaining) {
    const target = squads.find(sq => sq.length < size);
    if (!target) break;
    target.push(m);
    assigned.add(m.playerName || m.id);
  }

  const unassigned = members.filter(m => !assigned.has(m.playerName || m.id));
  return { squads, unassigned };
}

// 점수 기반 1군/2군/3군 분류
function assignTiers(scored) {
  const sorted = [...scored].sort((a, b) => (b._score || 0) - (a._score || 0));
  const n = sorted.length;
  const t1 = Math.ceil(n / 3);
  const t2 = Math.ceil(n * 2 / 3);
  return sorted.map((m, i) => ({ ...m, _tier: i < t1 ? 1 : i < t2 ? 2 : 3 }));
}

// 통합 스쿼드 추천 (밸런스형 / 1군2군3군형)
function recommendSquads(members, size, mode) {
  if (!members || members.length === 0) return { squads: [], unassigned: [], tiers: null };
  const scored = members.map(m => ({
    ...m,
    _role: classifyRole(m, members),
    _score: calcBalanceScore(m, members),
  }));

  if (mode === 'tier') {
    const tiered = assignTiers(scored);
    const tiers = {};
    for (const t of [1, 2, 3]) {
      const tierMembers = tiered.filter(m => m._tier === t);
      tiers[t] = packSquads(tierMembers, size);
    }
    return { squads: [], unassigned: [], tiers };
  }

  const { squads, unassigned } = packSquads(scored, size);
  return { squads, unassigned, tiers: null };
}

// 하위 호환: 기존 코드에서 호출되는 경우를 위해 유지
function recommendAllSquads(members) {
  return recommendSquads(members, 4, 'balanced');
}

function teamBalanceScore(squadArr, allMembers) {
  if (!squadArr || squadArr.length === 0) return 0;
  const scores = squadArr.map(m => calcBalanceScore(m, allMembers));
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / scores.length;
  return Math.round((avg * 0.7 + (1 - Math.sqrt(variance)) * 0.3) * 100);
}

const ROLE_META = {
  dealer:   { label: '딜러',   emoji: '💥', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30', desc: '클랜 내 평균 딜량 상위 25% — 교전마다 높은 데미지를 꾸준히 뽑아내는 화력 담당' },
  fragger:  { label: '프래거', emoji: '🎯', color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/30',     desc: '클랜 내 MMR 상위 25% — 킬 기여도와 전투 지배력이 높은 핵심 교전 요원' },
  survivor: { label: '생존형', emoji: '🛡️', color: 'text-teal-400',   bg: 'bg-teal-400/10 border-teal-400/30',  desc: '클랜 내 TOP10 진입률 상위 25% — 생존력이 뛰어나 후반 결정전에서 강점을 보임' },
  support:  { label: '서포트', emoji: '🤝', color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/30',  desc: '딜·MMR·TOP10 세 지표가 고르게 분포 — 팀 밸런스를 잡아주는 범용 플레이어' },
};

const TIER_META = {
  1: { label: '1군', emoji: '🥇', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', desc: '상위 1/3 — 클랜 핵심 전력' },
  2: { label: '2군', emoji: '🥈', color: 'text-gray-300',   bg: 'bg-gray-500/10 border-gray-500/30',   desc: '중위 1/3 — 클랜 주전급' },
  3: { label: '3군', emoji: '🥉', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', desc: '하위 1/3 — 성장 잠재 멤버' },
};

// 멤버 카드 (스쿼드 결과에서 공통 사용)
function MemberCard({ member, idx, allMembers, showTier }) {
  const role = ROLE_META[member._role] || ROLE_META.support;
  const tier = TIER_META[member._tier];
  return (
    <div className={`border rounded-xl p-3 ${role.bg} relative`}>
      <div className="flex items-center justify-between mb-2 gap-1 flex-wrap">
        <Tooltip content={role.desc}>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border cursor-help ${role.bg} ${role.color}`}>
            {role.emoji} {role.label}
          </span>
        </Tooltip>
        {showTier && tier && (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${tier.bg} ${tier.color}`}>
            {tier.emoji} {tier.label}
          </span>
        )}
      </div>
      <Link href={`/player/${encodeURIComponent(member.server || 'steam')}/${encodeURIComponent(member.playerName)}`}>
        <div className={`text-sm font-bold mb-1 hover:underline cursor-pointer truncate ${role.color}`}>
          {member.playerName}
        </div>
      </Link>
      <div className="text-xs text-gray-400 space-y-0.5">
        <div>MMR <span className="text-white font-semibold">{member.mmr || '-'}</span></div>
        <div>딜 <span className="text-white font-semibold">{member.stats?.avgDamage || '-'}</span></div>
        <div>TOP10 <span className="text-white font-semibold">{member.stats?.top10Rate ? `${Number(member.stats.top10Rate).toFixed(0)}%` : '-'}</span></div>
      </div>
    </div>
  );
}

// 스쿼드 블록 렌더러
function SquadBlock({ squad, squadIdx, label, allMembers, gridCols, showTier }) {
  const balScore = teamBalanceScore(squad, allMembers);
  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">
          {squadIdx + 1}
        </span>
        <span className="text-sm font-bold text-gray-200">{label}</span>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-gray-500">밸런스</span>
          <span className="text-sm font-black text-white">{balScore}</span>
          <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${balScore >= 70 ? 'bg-green-500' : balScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${balScore}%` }}
            />
          </div>
        </div>
      </div>
      <div className={`grid gap-2 ${gridCols}`}>
        {squad.map((member) => (
          <MemberCard key={member.playerName || member.id} member={member} allMembers={allMembers} showTier={showTier} />
        ))}
      </div>
    </div>
  );
}

// 미배정 표시
function UnassignedRow({ members, size }) {
  if (!members || members.length === 0) return null;
  return (
    <div className="mt-2">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        미배정 ({members.length}명) — {size}인 편성 후 남은 클랜원
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {members.map(member => {
          const role = ROLE_META[member._role] || ROLE_META.support;
          return (
            <div key={member.playerName || member.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-700 bg-gray-800">
              <span className="text-base w-6 text-center">{role.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{member.playerName}</div>
                <div className="text-xs text-gray-500">MMR {member.mmr || '-'} · 딜 {member.stats?.avgDamage || '-'}</div>
              </div>
              <span className={`text-xs font-bold ${role.color}`}>{role.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SquadCustomTab({ members, allSquads, setAllSquads }) {
  const validMembers = (members || [])
    .filter(m => m.playerName && (m.mmr || m.stats?.avgDamage))
    .sort((a, b) => (b.mmr || 0) - (a.mmr || 0));

  const [selectedIds, setSelectedIds] = useState(() => new Set(validMembers.map(m => m.playerName || m.id)));
  const [squadSize, setSquadSize] = useState(4);
  const [mode, setMode] = useState('balanced'); // 'balanced' | 'tier'
  const [result, setResult] = useState(null);

  const hasStats = validMembers.length > 0;
  const selectedMembers = validMembers.filter(m => selectedIds.has(m.playerName || m.id));
  const expectedSquads = Math.floor(selectedMembers.length / squadSize);

  const gridCols = squadSize === 4 ? 'grid-cols-2 lg:grid-cols-4'
    : squadSize === 3 ? 'grid-cols-1 sm:grid-cols-3'
    : 'grid-cols-2';

  const toggleMember = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelectedIds(new Set(validMembers.map(m => m.playerName || m.id)));
  const clearAll  = () => setSelectedIds(new Set());

  const handleRecommend = () => {
    if (selectedMembers.length < 2) return;
    const res = recommendSquads(selectedMembers, squadSize, mode);
    setResult(res);
    if (mode === 'balanced') setAllSquads({ squads: res.squads, unassigned: res.unassigned });
  };

  if (!hasStats) {
    return (
      <div className="bg-gray-800 rounded-xl p-10 text-center text-gray-500">
        클랜원 스탯 데이터가 없어 스쿼드 추천을 사용할 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 상단: 클랜원 선택 + 설정 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

        {/* 클랜원 선택 리스트 */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm font-bold text-gray-200">클랜원 선택</span>
              <span className="ml-2 text-xs text-gray-500">{selectedMembers.length}/{validMembers.length}명 선택됨</span>
            </div>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 border border-blue-600/30 transition-colors">전체선택</button>
              <button onClick={clearAll}  className="text-xs px-2.5 py-1 rounded-lg bg-gray-700 text-gray-400 hover:bg-gray-600 border border-gray-600 transition-colors">전체해제</button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
            {validMembers.map((m) => {
              const id = m.playerName || m.id;
              const checked = selectedIds.has(id);
              const role = ROLE_META[classifyRole(m, validMembers)] || ROLE_META.support;
              return (
                <label
                  key={id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                    checked ? 'bg-blue-600/15 border border-blue-600/30' : 'border border-transparent hover:bg-gray-700/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMember(id)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-600 flex-shrink-0"
                  />
                  <span className="text-base w-5 text-center flex-shrink-0">{role.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{m.playerName}</div>
                    <div className="text-xs text-gray-500">MMR {m.mmr || '-'} · 딜 {m.stats?.avgDamage || '-'}</div>
                  </div>
                  <span className={`text-xs font-bold flex-shrink-0 ${role.color}`}>{role.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 설정 패널 */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-4 flex flex-col gap-4">
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">스쿼드 크기</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { size: 4, label: '4인 스쿼드' },
                { size: 3, label: '3인 스쿼드' },
                { size: 2, label: '듀오' },
              ].map(({ size, label }) => (
                <button
                  key={size}
                  onClick={() => setSquadSize(size)}
                  className={`py-2 rounded-xl text-sm font-bold transition-colors border ${
                    squadSize === size
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">분류 방식</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode('balanced')}
                className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-colors border text-left ${
                  mode === 'balanced'
                    ? 'bg-emerald-600/30 border-emerald-500/60 text-emerald-300'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <div>⚖️ 밸런스형</div>
                <div className="text-xs font-normal opacity-70 mt-0.5">역할 고르게 분배</div>
              </button>
              <button
                onClick={() => setMode('tier')}
                className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-colors border text-left ${
                  mode === 'tier'
                    ? 'bg-yellow-600/20 border-yellow-500/50 text-yellow-300'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <div>🏅 1군·2군·3군</div>
                <div className="text-xs font-normal opacity-70 mt-0.5">실력대 별 분리</div>
              </button>
            </div>
          </div>

          <div className="mt-auto pt-2 border-t border-gray-700">
            <div className="text-xs text-gray-500 mb-3">
              {selectedMembers.length}명 선택 →&nbsp;
              {mode === 'balanced'
                ? `${expectedSquads}개 스쿼드 + 미배정 ${selectedMembers.length % squadSize}명`
                : `1군·2군·3군 각 ${squadSize}인 편성`}
            </div>
            <button
              onClick={handleRecommend}
              disabled={selectedMembers.length < 2}
              className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${
                selectedMembers.length >= 2
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/40'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              🎲 스쿼드 추천 받기
            </button>
          </div>
        </div>
      </div>

      {/* 결과 */}
      {result && (
        <div className="space-y-4">
          {result.tiers ? (
            // 1군/2군/3군 모드
            [1, 2, 3].map(tierNum => {
              const { squads, unassigned } = result.tiers[tierNum];
              const tierInfo = TIER_META[tierNum];
              if (squads.length === 0 && (!unassigned || unassigned.length === 0)) return null;
              return (
                <div key={tierNum}>
                  <div className={`flex items-center gap-2 mb-3 px-1`}>
                    <span className="text-xl">{tierInfo.emoji}</span>
                    <span className={`text-base font-black ${tierInfo.color}`}>{tierInfo.label}</span>
                    <span className="text-xs text-gray-500">— {tierInfo.desc}</span>
                  </div>
                  <div className="space-y-3 pl-2">
                    {squads.map((squad, si) => (
                      <SquadBlock
                        key={si}
                        squad={squad}
                        squadIdx={si}
                        label={`${tierInfo.label} Squad ${si + 1}`}
                        allMembers={selectedMembers}
                        gridCols={gridCols}
                        showTier={false}
                      />
                    ))}
                    <UnassignedRow members={unassigned} size={squadSize} />
                  </div>
                </div>
              );
            })
          ) : (
            // 밸런스형 모드
            <>
              {result.squads.map((squad, si) => (
                <SquadBlock
                  key={si}
                  squad={squad}
                  squadIdx={si}
                  label={`Squad ${si + 1}`}
                  allMembers={selectedMembers}
                  gridCols={gridCols}
                  showTier={false}
                />
              ))}
              <UnassignedRow members={result.unassigned} size={squadSize} />
            </>
          )}
        </div>
      )}

      {!result && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">⚡</div>
          <div className="text-gray-300 font-semibold mb-1">클랜원을 선택하고 편성 방식을 설정하세요</div>
          <p className="text-sm text-gray-500">왼쪽 목록에서 참가할 클랜원을 체크한 뒤 추천 버튼을 누르세요</p>
        </div>
      )}
    </div>
  );
}
