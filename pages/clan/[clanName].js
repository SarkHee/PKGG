// pages/clan/[clanName].js — 클랜 상세 페이지

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/layout/Layout';
import { useT } from '../../utils/i18n';

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

  const [clanData, setClanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [memberSort, setMemberSort] = useState('mmr');

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

  if (loading) {
    return (
      <Layout>
        <Head>
          <title>클랜 정보 로딩 중... | PK.GG</title>
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
          <title>클랜을 찾을 수 없습니다 | PK.GG</title>
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
  ];

  const clanTitle = clan?.name ? `${clan.name} | PK.GG` : '클랜 정보 | PK.GG';
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
        </div>
      </div>
    </Layout>
  );
}
