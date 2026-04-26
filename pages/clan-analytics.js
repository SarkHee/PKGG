// pages/clan-analytics.js
// 클랜 종합 분석 대시보드 페이지

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import Header from '../components/layout/Header';
import { getMMRTier, MMR_DISCLAIMER } from '../utils/mmrCalculator';
import { useT } from '../utils/i18n';
import { useAuth } from '../utils/useAuth';

// 랭킹 업데이트 상태 컴포넌트
function RankingUpdateStatus() {
  const [updateStatus, setUpdateStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useT();

  useEffect(() => {
    fetchUpdateStatus();
    const interval = setInterval(fetchUpdateStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchUpdateStatus = async () => {
    try {
      const response = await fetch('/api/clan/ranking-status');
      const data = await response.json();
      if (data.success) setUpdateStatus(data.data);
    } catch (error) {
      console.error('상태 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !updateStatus) {
    return <div className="text-xs text-gray-500 mt-1">{t('ca.update_checking')}</div>;
  }

  return (
    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
      <div>{t('ca.last_update')} {updateStatus.lastUpdate.timeKorean}</div>
      <div>{t('ca.next_update')} {updateStatus.nextUpdate.schedules.join(', ')}</div>
    </div>
  );
}

// 수동 업데이트 버튼 컴포넌트
function ManualUpdateButton({ adminToken }) {
  const [updating, setUpdating] = useState(false);
  const { t } = useT();

  const handleManualUpdate = async () => {
    if (updating) return;
    setUpdating(true);
    try {
      const response = await fetch('/api/clan/update-rankings', {
        method: 'POST',
        headers: { 'x-admin-token': adminToken || '' },
      });
      const data = await response.json();
      if (data.success) {
        alert(`✅ 랭킹 업데이트 완료!\n${data.data.updatedCount}개 클랜이 업데이트되었습니다.`);
        window.location.reload();
      } else {
        alert(`❌ 업데이트 실패: ${data.message}`);
      }
    } catch (error) {
      alert(`❌ 업데이트 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <button
      onClick={handleManualUpdate}
      disabled={updating}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
        updating ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'
      }`}
    >
      {updating ? t('ca.updating') : t('ca.update_btn')}
    </button>
  );
}

// 지역 코드 → 표시 정보
const REGION_MAP = {
  KR: { label: '🇰🇷 한국', bg: 'bg-blue-900/60 text-blue-300 border-blue-700' },
  CN: { label: '🇨🇳 중국', bg: 'bg-red-900/60 text-red-300 border-red-700' },
  JP: { label: '🇯🇵 일본', bg: 'bg-purple-900/60 text-purple-300 border-purple-700' },
  RU: { label: '🇷🇺 러시아', bg: 'bg-rose-900/60 text-rose-300 border-rose-700' },
  EU: { label: '🇪🇺 유럽', bg: 'bg-green-900/60 text-green-300 border-green-700' },
  NA: { label: '🇺🇸 북미', bg: 'bg-orange-900/60 text-orange-300 border-orange-700' },
  SEA: { label: '🌏 동남아', bg: 'bg-teal-900/60 text-teal-300 border-teal-700' },
  BR: { label: '🇧🇷 브라질', bg: 'bg-lime-900/60 text-lime-300 border-lime-700' },
  ME: { label: '🌍 중동', bg: 'bg-amber-900/60 text-amber-300 border-amber-700' },
  MIXED: { label: '🌐 혼합', bg: 'bg-yellow-900/60 text-yellow-300 border-yellow-700' },
};

const REGION_FLAGS = {
  KR: '🇰🇷', CN: '🇨🇳', JP: '🇯🇵', RU: '🇷🇺', EU: '🇪🇺',
  NA: '🇺🇸', SEA: '🌏', BR: '🇧🇷', ME: '🌍', MIXED: '🌐',
};

function RegionBadge({ region }) {
  const { t } = useT();
  if (!region) return <span className="text-gray-600 text-xs">-</span>;
  const bg = REGION_MAP[region]?.bg || 'bg-gray-800 text-gray-400 border-gray-700';
  const flag = REGION_FLAGS[region] || '❓';
  const label = `${flag} ${t('region.' + region)}`;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${bg}`}>
      {label}
    </span>
  );
}

// 플레이스타일 배지
const PLAY_STYLE_COLORS = {
  '극단적 공격형': 'bg-red-900/60 text-red-300 border-red-700',
  '핫드롭 마스터': 'bg-orange-900/60 text-orange-300 border-orange-700',
  '스피드 파이터': 'bg-yellow-900/60 text-yellow-300 border-yellow-700',
  '초반 어그로꾼': 'bg-orange-900/60 text-orange-300 border-orange-700',
  '빠른 청소부': 'bg-green-900/60 text-green-300 border-green-700',
  '초반 돌격형': 'bg-red-900/60 text-red-300 border-red-700',
  '극단적 수비형': 'bg-gray-800 text-gray-300 border-gray-600',
  '후반 존버형': 'bg-slate-800 text-slate-300 border-slate-600',
  '장거리 정찰러': 'bg-teal-900/60 text-teal-300 border-teal-700',
  '저격 위주': 'bg-purple-900/60 text-purple-300 border-purple-700',
  '중거리 안정형': 'bg-indigo-900/60 text-indigo-300 border-indigo-700',
  '지속 전투형': 'bg-pink-900/60 text-pink-300 border-pink-700',
  '유령 생존자': 'bg-slate-800 text-slate-300 border-slate-600',
  '도박형 파밍러': 'bg-amber-900/60 text-amber-300 border-amber-700',
  순간광폭형: 'bg-violet-900/60 text-violet-300 border-violet-700',
  '치명적 저격수': 'bg-rose-900/60 text-rose-300 border-rose-700',
  '전략적 어시스트러': 'bg-emerald-900/60 text-emerald-300 border-emerald-700',
  '고효율 승부사': 'bg-cyan-900/60 text-cyan-300 border-cyan-700',
  공격형: 'bg-red-900/60 text-red-300 border-red-700',
  생존형: 'bg-gray-800 text-gray-300 border-gray-600',
  이동형: 'bg-lime-900/60 text-lime-300 border-lime-700',
  혼합: 'bg-gray-800 text-gray-400 border-gray-700',
};

// 간단한 툴팁
const Tooltip = ({ children, content }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="absolute z-[9999] px-3 py-2 text-xs text-white bg-gray-900 border border-gray-700 rounded-lg shadow-xl min-w-[220px] max-w-[360px] break-words whitespace-normal bottom-full mb-2 left-1/2 -translate-x-1/2">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-transparent border-t-4 border-t-gray-900" />
        </div>
      )}
    </div>
  );
};

const PlayStyleBadge = ({ style }) => {
  const cls = PLAY_STYLE_COLORS[style] || PLAY_STYLE_COLORS['혼합'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {style || '혼합'}
    </span>
  );
};

// 개요 통계 카드
function StatCard({ label, value, sub, color = 'text-blue-400' }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-3xl font-black ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  );
}

// 랭킹 메달 색
function rankColor(i) {
  if (i === 0) return 'text-yellow-400';
  if (i === 1) return 'text-gray-300';
  if (i === 2) return 'text-orange-400';
  return 'text-gray-500';
}

function ClanRankRow({ clan, index, isMyClan, effectiveMyClanId, t }) {
  return (
    <tr className={`transition-all duration-200 ${
      effectiveMyClanId
        ? isMyClan
          ? 'bg-blue-950/50 ring-1 ring-inset ring-blue-500/50 hover:bg-blue-950/70'
          : 'opacity-20 blur-[1.5px] select-none pointer-events-none'
        : isMyClan
          ? 'bg-blue-950/40 ring-1 ring-inset ring-blue-500/40 hover:bg-blue-950/60'
          : 'hover:bg-gray-800/40'
    }`}>
      <td className="px-4 py-3">
        <span className={`text-lg font-black ${rankColor(index)}`}>#{index + 1}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {isMyClan || !effectiveMyClanId ? (
            <Link href={`/clan/${encodeURIComponent(clan.name)}`} className="font-bold text-white hover:text-blue-400 transition-colors">
              {clan.name}
            </Link>
          ) : (
            <span className="font-bold text-gray-500 cursor-not-allowed select-none">{clan.name}</span>
          )}
          {isMyClan && (
            <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-blue-600 text-white">내 클랜</span>
          )}
        </div>
        {clan.tag && <div className="text-xs text-gray-500">{clan.tag}</div>}
      </td>
      <td className="px-4 py-3"><RegionBadge region={clan.region} /></td>
      <td className="px-4 py-3 text-gray-400 text-sm">{clan.level ?? '-'}</td>
      <td className="px-4 py-3 text-blue-400 font-semibold text-sm">{clan.apiMemberCount}{t('ca.persons')}</td>
      <td className="px-4 py-3 font-bold text-blue-400">{clan.avgStats?.score}</td>
      <td className="px-4 py-3">
        {clan.avgStats?.avgMMR ? (() => {
          const tier = getMMRTier(clan.avgStats.avgMMR);
          return (
            <Tooltip content={MMR_DISCLAIMER}>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border cursor-help text-xs font-bold ${tier.bgColor} ${tier.borderColor} ${tier.textColor}`}>
                {tier.emoji} {clan.avgStats.avgMMR.toLocaleString()}
              </span>
            </Tooltip>
          );
        })() : <span className="text-gray-600">-</span>}
      </td>
      <td className="px-4 py-3 text-orange-400 font-semibold text-sm">{clan.avgStats?.damage}</td>
      <td className="px-4 py-3 text-green-400 font-semibold text-sm">{clan.avgStats?.winRate}%</td>
      <td className="px-4 py-3">
        {clan.playStyle ? (
          <div>
            <PlayStyleBadge style={clan.playStyle.primary} />
            {clan.playStyle.special && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-purple-900/60 text-purple-300 border border-purple-700">
                ⭐ {clan.playStyle.special}
              </span>
            )}
            <div className="text-xs text-gray-600 mt-0.5">{t('ca.dominance')} {clan.playStyle.dominance}%</div>
          </div>
        ) : (
          <span className="text-gray-600 text-sm">-</span>
        )}
      </td>
    </tr>
  );
}

export default function ClanAnalytics() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [showSearchResult, setShowSearchResult] = useState(false);
  const [selectedShard, setSelectedShard] = useState(null); // null = 로그인 후 자동 결정
  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [isKoreanOnly, setIsKoreanOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const itemsPerPage = 10;
  const { t } = useT();
  const { user } = useAuth() || {};
  const canViewFull = user?.role === 'admin' || !!user;
  const isSteamAdmin = user?.role === 'admin';
  const myClanId = user?.clanId ?? null;
  const effectiveMyClanId = (isSteamAdmin || isAdmin) ? null : myClanId;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsAdmin(sessionStorage.getItem('admin_authed') === 'true');
    }
  }, []);

  // 로그인 상태 확정 후 shard 자동 설정 (undefined=로딩중, null=비로그인, object=로그인)
  useEffect(() => {
    if (user === undefined) return; // 아직 로딩 중
    if (user === null) {
      setSelectedShard(prev => prev === null ? 'steam' : prev); // 비로그인 → steam 기본값
    } else {
      setSelectedShard(user.platform || 'steam'); // 로그인 → 플랫폼에 맞게
    }
  }, [user]);

  useEffect(() => {
    if (selectedShard !== null) {
      fetchAnalytics();
      setCurrentPage(1);
    }
  }, [selectedShard, selectedRegion, isKoreanOnly]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedShard && selectedShard !== 'all') params.append('shard', selectedShard);
      if (selectedRegion !== 'ALL') params.append('region', selectedRegion);
      if (isKoreanOnly) params.append('isKorean', 'true');
      const response = await fetch(`/api/clan-analytics?${params.toString()}`);
      if (!response.ok) throw new Error('분석 데이터를 가져올 수 없습니다');
      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim() || !analyticsData) return;
    const foundClan = analyticsData.rankings.allRankedClans.find(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.tag && c.tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setSearchResult(foundClan || { notFound: true });
    setShowSearchResult(true);
  };

  const closeSearchResult = () => {
    setShowSearchResult(false);
    setSearchResult(null);
    setSearchQuery('');
  };

  if (loading) {
    return (
      <>
        <Head>
        <title>클랜 분석 | PKGG</title>
        <meta name="description" content="PUBG 클랜 랭킹 및 통계 분석 페이지. 클랜 MMR, 멤버 수, 플레이스타일 분포를 확인하세요." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://pk.gg/clan-analytics" />
        <meta property="og:title" content="클랜 분석 | PKGG" />
        <meta property="og:description" content="PUBG 클랜 랭킹 및 통계 분석 페이지. 클랜 MMR, 멤버 수, 플레이스타일 분포를 확인하세요." />
        <meta property="og:image" content="https://pk.gg/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="클랜 분석 | PKGG" />
        <meta name="twitter:description" content="PUBG 클랜 랭킹 및 통계 분석 페이지." />
        <meta name="twitter:image" content="https://pk.gg/og-image.png" />
        <link rel="canonical" href="https://pk.gg/clan-analytics" />
      </Head>
        <Header />
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-gray-400">{t('ca.loading')}</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Head>
        <title>클랜 분석 | PKGG</title>
        <meta name="description" content="PUBG 클랜 랭킹 및 통계 분석 페이지. 클랜 MMR, 멤버 수, 플레이스타일 분포를 확인하세요." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://pk.gg/clan-analytics" />
        <meta property="og:title" content="클랜 분석 | PKGG" />
        <meta property="og:description" content="PUBG 클랜 랭킹 및 통계 분석 페이지. 클랜 MMR, 멤버 수, 플레이스타일 분포를 확인하세요." />
        <meta property="og:image" content="https://pk.gg/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="클랜 분석 | PKGG" />
        <meta name="twitter:description" content="PUBG 클랜 랭킹 및 통계 분석 페이지." />
        <meta name="twitter:image" content="https://pk.gg/og-image.png" />
        <link rel="canonical" href="https://pk.gg/clan-analytics" />
      </Head>
        <Header />
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="text-center text-red-400">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold mb-2">{t('ca.error')}</h2>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        </div>
      </>
    );
  }

  const { overview, rankings, distributions, allClans } = analyticsData;

  const totalPages = Math.ceil(allClans.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentClans = allClans.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    document.getElementById('clan-list-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const renderPagination = () => {
    const buttons = [];
    const maxVisible = 10;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

    const btn = (key, label, page, active = false) => (
      <button
        key={key}
        onClick={() => handlePageChange(page)}
        className={`px-3 py-1.5 mx-0.5 rounded-lg text-sm transition-colors ${
          active
            ? 'bg-blue-600 text-white font-bold'
            : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
        }`}
      >
        {label}
      </button>
    );

    if (currentPage > 1) buttons.push(btn('prev', '←', currentPage - 1));
    if (start > 1) {
      buttons.push(btn(1, '1', 1));
      if (start > 2) buttons.push(<span key="d1" className="px-1 text-gray-600 text-sm">…</span>);
    }
    for (let i = start; i <= end; i++) buttons.push(btn(i, i, i, i === currentPage));
    if (end < totalPages) {
      if (end < totalPages - 1) buttons.push(<span key="d2" className="px-1 text-gray-600 text-sm">…</span>);
      buttons.push(btn(totalPages, totalPages, totalPages));
    }
    if (currentPage < totalPages) buttons.push(btn('next', '→', currentPage + 1));
    return buttons;
  };

  return (
    <>
      <Head>
        <title>클랜 분석 | PKGG</title>
        <meta name="description" content="PUBG 클랜 랭킹 및 통계 분석 페이지. 클랜 MMR, 멤버 수, 플레이스타일 분포를 확인하세요." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://pk.gg/clan-analytics" />
        <meta property="og:title" content="클랜 분석 | PKGG" />
        <meta property="og:description" content="PUBG 클랜 랭킹 및 통계 분석 페이지. 클랜 MMR, 멤버 수, 플레이스타일 분포를 확인하세요." />
        <meta property="og:image" content="https://pk.gg/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="클랜 분석 | PKGG" />
        <meta name="twitter:description" content="PUBG 클랜 랭킹 및 통계 분석 페이지." />
        <meta name="twitter:image" content="https://pk.gg/og-image.png" />
        <link rel="canonical" href="https://pk.gg/clan-analytics" />
      </Head>
      <Header />

      {/* 비로그인 팝업 오버레이 */}
      {user === null && !isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="w-14 h-14 rounded-full bg-[#1b2838] flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 5.623 3.872 10.328 9.092 11.63L9.086 12H12v-1.5c0-.828.672-1.5 1.5-1.5S15 9.672 15 10.5V12h1.5c.828 0 1.5.672 1.5 1.5 0 .796-.622 1.45-1.406 1.496L18 24c3.534-1.257 6-4.649 6-8.5C24 10.745 18.627 0 12 0z"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">로그인이 필요합니다</h2>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              로그인하면 내 플랫폼의 클랜 데이터를<br />바로 확인할 수 있습니다.
            </p>
            <div className="flex flex-col gap-3">
              <a
                href="/api/auth/steam-login"
                className="flex items-center justify-center gap-2.5 w-full px-5 py-3 bg-[#1b2838] hover:bg-[#2a475e] text-white text-sm font-semibold rounded-xl transition-colors border border-[#2a475e]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 5.623 3.872 10.328 9.092 11.63L9.086 12H12v-1.5c0-.828.672-1.5 1.5-1.5S15 9.672 15 10.5V12h1.5c.828 0 1.5.672 1.5 1.5 0 .796-.622 1.45-1.406 1.496L18 24c3.534-1.257 6-4.649 6-8.5C24 10.745 18.627 0 12 0z"/>
                </svg>
                Steam으로 로그인
              </a>
              <a
                href="/api/auth/kakao-login"
                className="flex items-center justify-center gap-2.5 w-full px-5 py-3 bg-[#FEE500] hover:bg-[#F0D800] text-[#3C1E1E] text-sm font-semibold rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.667 1.567 5.01 3.938 6.394L5 21l4.563-2.418A11.2 11.2 0 0 0 12 18c5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/>
                </svg>
                카카오로 로그인
              </a>
            </div>
          </div>
        </div>
      )}

      <div className={`min-h-screen bg-gray-950 px-4 py-8 ${user === null && !isAdmin ? 'blur-sm pointer-events-none select-none' : ''}`}>
        <div className="max-w-6xl mx-auto">

          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-1">{t('ca.title')}</h1>
            <p className="text-gray-500 text-sm">{t('ca.subtitle')}</p>
          </div>

          {/* 클랜 미가입 안내 배너 */}
          {user && !myClanId && !isSteamAdmin && !isAdmin && (
            <div className="mb-6 bg-gray-900 border border-yellow-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-yellow-300 mb-0.5">클랜이 확인되지 않습니다</p>
                <p className="text-xs text-gray-400">가입된 클랜 정보가 없습니다. 클랜을 찾고 있다면 포럼 클랜 모집 게시판을 확인해보세요.</p>
              </div>
              <Link href="/forum/category/recruitment" passHref>
                <span className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  클랜 홍보 확인하기
                </span>
              </Link>
            </div>
          )}

          {/* 플랫폼 탭 */}
          <div className="flex gap-2 mb-4 items-center">
            {[
              { key: 'steam',  label: '🖥 Steam 클랜' },
              { key: 'kakao',  label: '🟡 카카오 클랜' },
              { key: 'all',    label: '전체' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setSelectedShard(key); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
                  selectedShard === key
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500'
                }`}
              >
                {label}
              </button>
            ))}
            {user && (
              <span className="ml-2 text-xs text-gray-500">
                {user.platform === 'kakao' ? '🟡 카카오 계정으로 로그인됨' : '🖥 Steam 계정으로 로그인됨'}
              </span>
            )}
          </div>

          {/* 필터 & 검색 */}
          <div className="mb-8 bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">{t('ca.filter_title')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 지역 필터 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('ca.region_filter')}</label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                >
                  <option value="ALL">{t('ca.region_all')}</option>
                  <option value="KR">🇰🇷 {t('region.KR')}</option>
                  <option value="CN">🇨🇳 {t('region.CN')}</option>
                  <option value="JP">🇯🇵 {t('region.JP')}</option>
                  <option value="RU">🇷🇺 {t('region.RU')}</option>
                  <option value="EU">🇪🇺 {t('region.EU')}</option>
                  <option value="NA">🇺🇸 {t('region.NA')}</option>
                  <option value="SEA">🌏 {t('region.SEA')}</option>
                  <option value="BR">🇧🇷 {t('region.BR')}</option>
                  <option value="ME">🌍 {t('region.ME')}</option>
                  <option value="MIXED">🌐 {t('region.MIXED')}</option>
                  <option value="UNKNOWN">❓ {t('region.UNKNOWN')}</option>
                </select>
              </div>

              {/* 한국 클랜 필터 */}
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isKoreanOnly}
                    onChange={(e) => setIsKoreanOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-600"
                  />
                  <span className="text-sm text-gray-300">{t('ca.korean_only')}</span>
                </label>
              </div>

              {/* 검색 */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('ca.search_label')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder={t('ca.search_placeholder')}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                  />
                  <button
                    onClick={handleSearch}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm text-white font-semibold transition-colors"
                  >
                    {t('ca.search_btn')}
                  </button>
                </div>
              </div>
            </div>

            {/* 활성 필터 태그 */}
            {(selectedRegion !== 'ALL' || isKoreanOnly) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedRegion !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-900/60 text-blue-300 border border-blue-700">
                    {t('ca.filter_region_tag')} {selectedRegion}
                    <button onClick={() => setSelectedRegion('ALL')} className="ml-1 hover:text-white">×</button>
                  </span>
                )}
                {isKoreanOnly && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-900/60 text-green-300 border border-green-700">
                    {t('ca.filter_korean_tag')}
                    <button onClick={() => setIsKoreanOnly(false)} className="ml-1 hover:text-white">×</button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 검색 결과 모달 */}
          {showSearchResult && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-lg font-bold text-white">{t('ca.search_result')}</h3>
                  <button onClick={closeSearchResult} className="text-gray-500 hover:text-white text-2xl leading-none">×</button>
                </div>

                {searchResult?.notFound ? (
                  <div className="text-center py-6">
                    <div className="text-4xl mb-3">🔍</div>
                    <p className="text-gray-400 mb-1">{t('ca.not_found')}</p>
                    <p className="text-xs text-gray-600">{t('ca.not_found_sub')}</p>
                  </div>
                ) : searchResult ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className={`text-4xl font-black mb-1 ${rankColor(searchResult.rank - 1)}`}>
                        #{searchResult.rank}{t('cd.rank_suffix')}
                      </div>
                      <h4 className="text-xl font-bold text-white">{searchResult.name}</h4>
                      <p className="text-gray-500 text-sm">{searchResult.tag}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: t('ca.search_result_score'), value: searchResult.avgStats?.score, color: 'text-blue-400' },
                        { label: t('ca.search_result_members'), value: `${searchResult.apiMemberCount}${t('ca.persons')}`, color: 'text-green-400' },
                        { label: t('ca.search_result_damage'), value: searchResult.avgStats?.damage, color: 'text-orange-400' },
                        { label: t('ca.search_result_winrate'), value: `${searchResult.avgStats?.winRate}%`, color: 'text-purple-400' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-gray-800 rounded-xl p-3">
                          <div className="text-xs text-gray-500 mb-1">{label}</div>
                          <div className={`text-lg font-bold ${color}`}>{value}</div>
                        </div>
                      ))}
                    </div>
                    {searchResult.playStyle && (
                      <div className="bg-gray-800 rounded-xl p-3">
                        <div className="text-xs text-gray-500 mb-2">{t('ca.search_result_style')}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <PlayStyleBadge style={searchResult.playStyle.primary} />
                          {searchResult.playStyle.special && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-900/60 text-purple-300 border border-purple-700">
                              ⭐ {searchResult.playStyle.special}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* TOP 10 랭킹 */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">{t('ca.top10_title')}</h2>
                <p className="text-xs text-blue-400 mt-0.5">{t('ca.top10_subtitle')}</p>
                <RankingUpdateStatus />
              </div>
              {isAdmin && (
                <ManualUpdateButton adminToken={typeof window !== 'undefined' ? sessionStorage.getItem('admin_pw') : ''} />
              )}
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{t('ca.col_rank')}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{t('ca.col_clan')}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{t('ca.col_region')}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{t('ca.col_level')}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{t('ca.col_members')}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <Tooltip content={<div><div className="font-semibold text-yellow-400 mb-1">{t('ca.col_avg_score')}</div><div className="text-gray-400">{t('ca.tooltip_avg_score_desc')}</div></div>}>
                          <span className="cursor-help border-b border-dotted border-gray-600">{t('ca.col_avg_score')}</span>
                        </Tooltip>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <Tooltip content={MMR_DISCLAIMER}>
                          <span className="cursor-help border-b border-dotted border-gray-600">{t('ca.col_mmr')}</span>
                        </Tooltip>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{t('ca.col_damage')}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{t('ca.col_winrate')}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{t('ca.col_style')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {(() => {
                      const isMyInTop10 = myClanId && rankings.topClansByScore.some(c => c.id === myClanId);
                      const myClanOutside = (!isMyInTop10 && myClanId)
                        ? rankings.allRankedClans?.find(c => c.id === myClanId)
                        : null;
                      return (
                        <>
                          {rankings.topClansByScore.map((clan, index) => {
                            const isMyClan = myClanId && clan.id === myClanId;
                            return (
                              <ClanRankRow
                                key={clan.id}
                                clan={clan}
                                index={index}
                                isMyClan={isMyClan}
                                effectiveMyClanId={effectiveMyClanId}
                                t={t}
                              />
                            );
                          })}
                          {myClanOutside && (
                            <>
                              <tr>
                                <td colSpan={10} className="px-4 py-2 text-center">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 border-t border-dashed border-gray-700" />
                                    <span className="text-xs text-gray-600 font-mono tracking-widest">• • •</span>
                                    <div className="flex-1 border-t border-dashed border-gray-700" />
                                  </div>
                                </td>
                              </tr>
                              <ClanRankRow
                                key={myClanOutside.id}
                                clan={myClanOutside}
                                index={(myClanOutside.rank ?? 0) - 1}
                                isMyClan={true}
                                effectiveMyClanId={null}
                                t={t}
                              />
                            </>
                          )}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 분포 통계 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            {/* 레벨별 분포 */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">{t('ca.level_dist')}</h3>
              <div className="space-y-2.5">
                {Object.entries(distributions.byLevel)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([level, count]) => (
                    <div key={level} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-14 shrink-0">{t('ca.level_label')} {level}</span>
                      <div className="flex-1 bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${Math.max((count / overview.totalClans) * 100, 2)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-10 text-right shrink-0">{count}{t('ca.clans')}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* 규모별 분포 */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">{t('ca.member_dist')}</h3>
              <div className="space-y-2.5">
                {[
                  { labelKey: 'ca.small_clan', key: 'small', color: 'bg-green-500' },
                  { labelKey: 'ca.medium_clan', key: 'medium', color: 'bg-yellow-500' },
                  { labelKey: 'ca.large_clan', key: 'large', color: 'bg-red-500' },
                ].map(({ labelKey, key, color }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-24 shrink-0">{t(labelKey)}</span>
                    <div className="flex-1 bg-gray-800 rounded-full h-2">
                      <div
                        className={`${color} h-2 rounded-full`}
                        style={{ width: `${Math.max((distributions.byMemberCount[key] / overview.totalClans) * 100, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-10 text-right shrink-0">
                      {distributions.byMemberCount[key]}{t('ca.clans')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 전체 클랜 목록 */}
          <div id="clan-list-section" className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">{t('ca.list_title')}</h2>
                <p className="text-xs text-blue-400 mt-0.5">{t('ca.list_subtitle')}</p>
              </div>
              <div className="text-xs text-gray-500">
                {startIndex + 1}–{Math.min(startIndex + itemsPerPage, allClans.length)} / {allClans.length}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{t('ca.col_clan')}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{t('ca.col_tag')}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{t('ca.col_level')}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{t('ca.col_members')}</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <Tooltip content={t('ca.tooltip_score_desc')}>
                          <span className="cursor-help border-b border-dotted border-gray-600">{t('ca.col_score')}</span>
                        </Tooltip>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <Tooltip content={MMR_DISCLAIMER}>
                          <span className="cursor-help border-b border-dotted border-gray-600">MMR</span>
                        </Tooltip>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{t('ca.col_style')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {currentClans.map((clan, index) => {
                      const isMyClan = myClanId && clan.id === myClanId;
                      return (
                      <tr key={clan.id} className={`transition-all duration-200 ${
                        effectiveMyClanId
                          ? isMyClan
                            ? 'bg-blue-950/50 ring-1 ring-inset ring-blue-500/50 hover:bg-blue-950/70'
                            : 'opacity-20 blur-[1.5px] select-none pointer-events-none'
                          : 'hover:bg-gray-800/40'
                      }`}>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-bold ${rankColor(startIndex + index)}`}>
                            #{startIndex + index + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isMyClan || !effectiveMyClanId ? (
                              <Link href={`/clan/${encodeURIComponent(clan.name)}`} className="font-semibold text-white hover:text-blue-400 transition-colors text-sm">
                                {clan.name}
                              </Link>
                            ) : (
                              <span className="font-semibold text-gray-500 cursor-not-allowed select-none text-sm">{clan.name}</span>
                            )}
                            {isMyClan && (
                              <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-blue-600 text-white">내 클랜</span>
                            )}
                            {clan.staleMemberCount > 0 && (
                              <Tooltip content={`${clan.staleMemberCount}${t('ca.stale_tooltip_post')}`}>
                                <span className="text-xs bg-yellow-900/50 text-yellow-400 border border-yellow-700/50 px-1.5 py-0.5 rounded cursor-help">
                                  ⚠️ {clan.staleMemberCount}{t('ca.stale_suffix')}
                                </span>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md text-xs bg-gray-800 border border-gray-700 text-gray-400">
                            {clan.tag || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-sm">{clan.level ?? '-'}</td>
                        <td className="px-4 py-3 text-green-400 font-semibold text-sm">{clan.apiMemberCount}{t('ca.persons')}</td>
                        <td className="px-4 py-3">
                          {clan.avgStats ? (
                            <span className="font-bold text-blue-400">{clan.avgStats.score}</span>
                          ) : (
                            <span className="text-gray-700 text-xs">{t('ca.no_stats')}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {clan.avgStats?.avgMMR ? (() => {
                            const tier = getMMRTier(clan.avgStats.avgMMR);
                            return (
                              <Tooltip content={MMR_DISCLAIMER}>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border cursor-help text-xs font-bold ${tier.bgColor} ${tier.borderColor} ${tier.textColor}`}>
                                  {tier.emoji} {clan.avgStats.avgMMR.toLocaleString()}
                                </span>
                              </Tooltip>
                            );
                          })() : <span className="text-gray-700">-</span>}
                        </td>
                        <td className="px-4 py-3">
                          {clan.playStyle ? (
                            <div>
                              <PlayStyleBadge style={clan.playStyle.primary} />
                              {clan.playStyle.special && (
                                <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-purple-900/60 text-purple-300 border border-purple-700">
                                  ⭐ {clan.playStyle.special}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-700 text-xs">{t('ca.no_analysis')}</span>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="mt-5 flex flex-col items-center gap-2">
                <div className="flex items-center flex-wrap justify-center gap-0.5">
                  {renderPagination()}
                </div>
                <div className="text-xs text-gray-600">
                  {currentPage} / {totalPages}
                </div>
              </div>
            )}
          </div>

          {/* 새로고침 (관리자 전용) */}
          {isAdmin && (
            <div className="text-center">
              <button
                onClick={fetchAnalytics}
                className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-sm font-semibold text-gray-300 transition-colors"
              >
                {t('ca.refresh')}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
