// pages/index.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import Header from '../components/layout/Header';
import { useT } from '../utils/i18n';
import { MAJOR, TYPES } from '../utils/playstyleClassifier';
import { getMMRTier } from '../utils/mmrCalculator';

const FAV_KEY    = 'pkgg_favorites';
const SEARCH_KEY = 'pkgg_recent_searches';

const STYLE_LABEL = {
  HYPER_CARRY: '하이퍼 캐리', ASSAULT: '공격형', SNIPER: '스나이퍼', SUPPORT: '서포터',
  LURKER: '잠복형', RUSHER: '러셔', DEFENSIVE: '수비형', BALANCED: '밸런스형',
  SCOUT: '스카우트', TACTICAL: '전술형', PRECISION_SNIPER: '정밀 사수', EARLY_RUSHER: '초반 러셔',
  TACTICAL_LEADER: '전술 리더', UNKNOWN: '분석 중',
}

function PlayerResultCard({ result, onClose }) {
  const { shard, nickname, clanName, clanTag, stats } = result
  const tier = stats?.mmr ? getMMRTier(stats.mmr) : null
  const styleLabel = stats?.style ? (STYLE_LABEL[stats.style] || stats.style) : null
  const lastUpdated = stats?.lastUpdated
    ? new Date(stats.lastUpdated).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    : null
  const playerUrl = `/player/${shard}/${encodeURIComponent(nickname)}`

  return (
    <div className="mt-3 bg-[#0b1120] border border-blue-500/25 rounded-2xl p-4 animate-in fade-in">
      <div className="flex items-start gap-3 mb-3">
        {/* 아바타 */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
          {nickname.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white text-base leading-tight">{nickname}</span>
            {clanTag && <span className="text-xs text-gray-500">[{clanTag}]</span>}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${SHARD_COLOR[shard] || 'bg-gray-700 text-gray-300 border border-gray-600'}`}>
              {SHARD_LABEL[shard] || shard}
            </span>
          </div>
          {tier && stats?.mmr ? (
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-bold mt-1 ${tier.bgColor} ${tier.borderColor}`}>
              <span>{tier.emoji}</span>
              <span className={tier.textColor}>{stats.mmr.toLocaleString()} PK · {tier.label}</span>
            </div>
          ) : (
            <p className="text-xs text-gray-600 mt-1">스탯 정보 없음</p>
          )}
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-400 text-lg flex-shrink-0">×</button>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: '평균딜', value: Math.round(stats.avgDamage || 0).toLocaleString(), color: 'text-blue-300' },
            { label: 'K/D',   value: (stats.avgKills || 0).toFixed(2),                   color: 'text-cyan-300' },
            { label: '승률',  value: (stats.winRate || 0).toFixed(1) + '%',               color: 'text-yellow-300' },
            { label: 'Top10', value: (stats.top10Rate || 0).toFixed(1) + '%',             color: 'text-green-300' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl px-2 py-2 text-center">
              <p className="text-[9px] text-gray-500 mb-0.5">{s.label}</p>
              <p className={`text-sm font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {styleLabel && <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-full border border-white/10">🧠 {styleLabel}</span>}
          {clanName && <span className="text-[10px] text-purple-400">👥 {clanName}</span>}
          {lastUpdated && <span className="text-[10px] text-gray-600">{lastUpdated} 기준</span>}
        </div>
        <Link href={playerUrl} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors">
          전적 보기 →
        </Link>
      </div>
    </div>
  )
}
const MAX_RECENT = 8;


function FaqItem({ q, a }) {
  return (
    <div className="bg-white/5 border border-blue-500/10 rounded-xl overflow-hidden">
      <div className="px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-200 mb-2">{q}</h3>
        <p className="text-sm text-gray-400 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

function loadFavs() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; }
}

function loadRecentSearches() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(SEARCH_KEY) || '[]'); } catch { return []; }
}

function saveRecentSearch(nickname, shard) {
  const list = loadRecentSearches().filter(
    (s) => !(s.nickname.toLowerCase() === nickname.toLowerCase() && s.shard === shard)
  );
  list.unshift({ nickname, shard, ts: Date.now() });
  localStorage.setItem(SEARCH_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

const SHARD_LABEL = { steam: '🎮 Steam', kakao: '🟡 카카오', psn: '🎯 PS', xbox: '🎯 Xbox', console: '🎯 Console' }
const SHARD_COLOR = {
  steam: 'bg-[#1b2838] text-[#4a9eff] border border-[#4a9eff]/40',
  kakao: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
  psn: 'bg-blue-800/40 text-blue-300 border border-blue-500/40',
  xbox: 'bg-green-800/40 text-green-300 border border-green-500/40',
  console: 'bg-blue-800/40 text-blue-300 border border-blue-500/40',
}

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMajor, setActiveMajor] = useState('OFFENSIVE');
  const [activeType, setActiveType]   = useState(null);
  const [searchMessage, setSearchMessage] = useState('');
  const [favorites, setFavorites]           = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showDropdown, setShowDropdown]     = useState(false);
  const [isSearching, setIsSearching]       = useState(false);
  const [navigating, setNavigating]         = useState(false);
  const [searchCard, setSearchCard]         = useState(null);
  const searchBoxRef = useRef(null);
  const router = useRouter();
  const { t } = useT();

  // 즐겨찾기 + 최근 검색 로드 (클라이언트 전용)
  useEffect(() => {
    setFavorites(loadFavs());
    setRecentSearches(loadRecentSearches());
  }, []);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handler = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const removeFavorite = (nickname, shard) => {
    const next = loadFavs().filter(f => !(f.nickname === nickname && f.shard === shard));
    localStorage.setItem(FAV_KEY, JSON.stringify(next));
    setFavorites(next);
  };

  // URL 파라미터에서 검색 실패 메시지 확인
  useEffect(() => {
    if (router.query.searchFailed) {
      setSearchMessage(t('search.not_found'));
      setTimeout(() => setSearchMessage(''), 5000);
    }
  }, [router.query, t]);

  // 검색 → 플랫폼 지정 1회 호출 → 확인 카드 표시
  useEffect(() => {
    const handleDone = () => setNavigating(false);
    router.events.on('routeChangeComplete', handleDone);
    router.events.on('routeChangeError', handleDone);
    return () => {
      router.events.off('routeChangeComplete', handleDone);
      router.events.off('routeChangeError', handleDone);
    };
  }, [router]);

  const handleSearch = async (nick = searchTerm) => {
    const name = nick.trim();
    if (!name) return;
    setSearchMessage('');
    setSearchCard(null);
    setShowDropdown(false);
    setIsSearching(true);
    try {
      const res = await fetch(`/api/pubg/search?nickname=${encodeURIComponent(name)}`);
      const data = await res.json();
      const r = data?.results?.[0];
      if (data?.retry) {
        setSearchMessage('서버 연결 중입니다. 잠시 후 다시 시도해주세요.');
      } else if (!r) {
        setSearchMessage(`"${name}" 플레이어를 찾을 수 없습니다.`);
      } else {
        saveRecentSearch(r.nickname, r.shard);
        setNavigating(true);
        router.push(`/player/${r.shard}/${encodeURIComponent(r.nickname)}`);
      }
    } catch {
      setSearchMessage('검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleDirectNavigate = (nickname, shard) => {
    setShowDropdown(false);
    setSearchCard(null);
    saveRecentSearch(nickname, shard);
    setRecentSearches(loadRecentSearches());
    router.push(`/player/${shard}/${encodeURIComponent(nickname)}`);
  };

  const removeRecentSearch = (nickname, shard, e) => {
    e.stopPropagation();
    const list = loadRecentSearches().filter(
      (s) => !(s.nickname.toLowerCase() === nickname.toLowerCase() && s.shard === shard)
    );
    localStorage.setItem(SEARCH_KEY, JSON.stringify(list));
    setRecentSearches(list);
  };

  const clearAllRecent = (e) => {
    e.stopPropagation();
    localStorage.setItem(SEARCH_KEY, '[]');
    setRecentSearches([]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSearch();
    if (e.key === 'Escape') { setShowDropdown(false); }
  };

  return (
    <>
      {navigating && (
        <div className="fixed inset-0 z-[9999] bg-gray-900/70 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 bg-gray-900 border border-gray-700 rounded-2xl px-10 py-8 shadow-2xl">
            <div className="w-10 h-10 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-white text-sm font-medium">플레이어 데이터 로딩 중...</span>
          </div>
        </div>
      )}
      <Head>
        <title>{t('home.meta_title')}</title>
        <meta name="description" content={t('home.meta_desc')} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://pkgg.vercel.app/" />
        <meta property="og:title" content={t('home.meta_title')} />
        <meta property="og:description" content={t('home.meta_desc')} />
        <meta property="og:image" content="https://pkgg.vercel.app/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t('home.meta_title')} />
        <meta name="twitter:description" content={t('home.meta_desc')} />
        <meta name="twitter:image" content="https://pkgg.vercel.app/og-image.png" />
        <link rel="canonical" href="https://pkgg.vercel.app/" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "PKGG",
            "url": "https://pkgg.vercel.app",
            "description": "PUBG 플레이어 전적 검색, 클랜 분석, 무기 성향 테스트",
            "potentialAction": {
              "@type": "SearchAction",
              "target": { "@type": "EntryPoint", "urlTemplate": "https://pkgg.vercel.app/?q={search_term_string}" },
              "query-input": "required name=search_term_string"
            }
          })}}
        />
      </Head>

      <div className="min-h-screen text-white relative overflow-hidden" style={{ background: '#060614' }}>
        {/* 오로라 그라디언트 배경 */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {/* 파랑 오로라 */}
          <div
            className="absolute rounded-full"
            style={{
              width: '70vw',
              height: '70vw',
              top: '-15%',
              left: '-10%',
              background: 'radial-gradient(circle, rgba(37,99,235,0.35) 0%, transparent 70%)',
              filter: 'blur(60px)',
              animation: 'aurora1 18s ease-in-out infinite alternate',
            }}
          />
          {/* 보라 오로라 */}
          <div
            className="absolute rounded-full"
            style={{
              width: '60vw',
              height: '60vw',
              top: '10%',
              right: '-10%',
              background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)',
              filter: 'blur(70px)',
              animation: 'aurora2 22s ease-in-out infinite alternate',
            }}
          />
          {/* 청록 오로라 */}
          <div
            className="absolute rounded-full"
            style={{
              width: '55vw',
              height: '55vw',
              bottom: '-10%',
              left: '20%',
              background: 'radial-gradient(circle, rgba(6,182,212,0.22) 0%, transparent 70%)',
              filter: 'blur(65px)',
              animation: 'aurora3 26s ease-in-out infinite alternate',
            }}
          />
        </div>

        {/* 헤더 */}
        <Header />

        {/* 메인 콘텐츠 */}
        <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-3 pt-20 pb-10 sm:pt-24 sm:pb-16 sm:py-20">
          <div className="text-center w-full max-w-4xl mx-auto mb-6 sm:mb-16">

            {/* 배경 글로우 */}
            <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none" style={{ top: '12%', zIndex: -1 }}>
              <div className="w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)' }} />
            </div>

            {/* 배지 */}
            <div className="mb-4 sm:mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full text-[10px] sm:text-xs font-bold tracking-widest text-blue-400 uppercase">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                PUBG Stats &amp; Analytics
              </span>
            </div>
            {/* 로고 */}
            <h1 className="mb-4 sm:mb-6">
              <Image
                src="/logo.png"
                alt="PKGG"
                width={518}
                height={295}
                className="w-44 sm:w-80 md:w-[460px] h-auto mx-auto"
                style={{ filter: 'drop-shadow(0 0 36px rgba(59,130,246,0.55)) drop-shadow(0 6px 18px rgba(0,0,0,0.6))' }}
                priority
              />
            </h1>
            {/* 서브타이틀 */}
            <p className="text-base sm:text-xl font-semibold text-white/75 mb-1 max-w-xl mx-auto leading-relaxed px-2">
              {t('home.subtitle')}
            </p>
            <p className="text-xs text-gray-600 mb-6 sm:mb-10">
              {t('home.notice')}
            </p>

            {/* 검색 메시지 알림 */}
            {searchMessage && (
              <div className="mb-6 max-w-xl mx-auto px-4">
                <div className="bg-orange-500/20 border border-orange-500/50 text-orange-300 px-4 py-3 rounded-xl">
                  <div className="flex items-center gap-2 justify-center">
                    <span>⚠️</span>
                    <p className="text-sm font-medium">{searchMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 검색 섹션 */}
            <div className="w-full max-w-xl mx-auto px-0 sm:px-4 mb-4" ref={searchBoxRef}>
              <div className="bg-white/5 backdrop-blur-md border border-blue-500/20 rounded-2xl p-3 sm:p-4 shadow-2xl shadow-blue-900/30">

                {/* 닉네임 입력 */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="닉네임 입력 (플랫폼 자동 감지)"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setSearchCard(null); if (!e.target.value) setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    onKeyDown={handleKeyPress}
                    className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                    autoComplete="off"
                  />
                  <button
                    onClick={() => handleSearch()}
                    disabled={isSearching || !searchTerm.trim()}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all duration-200 shadow-lg shadow-blue-600/30 flex items-center gap-2 text-sm"
                  >
                    {isSearching
                      ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                      : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    }
                    {isSearching ? '검색 중...' : '검색'}
                  </button>
                </div>


                {/* 최근 검색 드롭다운 */}
                {showDropdown && recentSearches.length > 0 && (
                  <div className="mt-2 border-t border-white/10 pt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">🕐 최근 검색</span>
                      <button onClick={clearAllRecent} className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">전체 삭제</button>
                    </div>
                    <div className="space-y-0.5">
                      {recentSearches
                        .filter((s) => !searchTerm || s.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((s) => (
                          <div
                            key={`${s.shard}-${s.nickname}`}
                            onClick={() => handleDirectNavigate(s.nickname, s.shard)}
                            className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer group transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-gray-500 text-xs flex-shrink-0">🔍</span>
                              <span className="text-sm text-gray-300 truncate">{s.nickname}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${SHARD_COLOR[s.shard] || ''}`}>{SHARD_LABEL[s.shard] || s.shard}</span>
                            </div>
                            <button onClick={(e) => removeRecentSearch(s.nickname, s.shard, e)} className="text-gray-700 hover:text-gray-400 text-xs opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ml-2">×</button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-gray-600 text-xs mt-2.5">{t('search.hint')}</p>
            </div>

            {/* 즐겨찾기 섹션 */}
            {favorites.length > 0 && (
              <div className="max-w-xl mx-auto px-4 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500 font-semibold tracking-wide">★ 즐겨찾기</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {favorites.map((fav) => (
                    <div key={`${fav.shard}-${fav.nickname}`} className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-3 py-1 group">
                      <button
                        onClick={() => handleDirectNavigate(fav.nickname, fav.shard)}
                        className="text-xs text-gray-300 hover:text-white transition-colors font-medium"
                      >
                        {fav.nickname}
                        <span className="ml-1 text-gray-600 text-[10px]">{fav.shard}</span>
                      </button>
                      <button
                        onClick={() => removeFavorite(fav.nickname, fav.shard)}
                        className="text-gray-600 hover:text-red-400 transition-colors text-xs ml-0.5 opacity-0 group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 특징 카드 섹션 */}
          <div className="w-full max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-blue-500/40" />
              <h2 className="text-xs font-bold text-blue-400/70 uppercase tracking-widest">{t('home.features')}</h2>
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-blue-500/40" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* 디스코드 봇 배너 카드 */}
              <a
                href="https://discord.com/api/oauth2/authorize?client_id=1498570099689521172&permissions=274877991936&scope=bot%20applications.commands"
                target="_blank"
                rel="noopener noreferrer"
                className="col-span-2 md:col-span-3 flex items-center justify-between gap-3 px-5 py-4 rounded-xl border transition-all duration-200 hover:brightness-110 group"
                style={{ background: 'rgba(88,101,242,0.12)', borderColor: 'rgba(88,101,242,0.35)' }}
              >
                <div className="flex items-center gap-3">
                  <svg width="24" height="18" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                    <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.44077 45.4204 0.52529C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.52529C25.5141 0.44359 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.292408 45.3914C0.29801 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="#7289da"/>
                  </svg>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white leading-tight">디스코드 봇 추가하기</p>
                    <p className="text-[11px] text-[#7289da] mt-0.5">/전적 /클랜 명령어로 디스코드에서 바로 전적 조회</p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-[#7289da] group-hover:translate-x-0.5 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </a>
              {[
                { icon: '📊', titleKey: 'feat.stats_title', descKey: 'feat.stats_desc' },
                { icon: '👥', titleKey: 'feat.clan_title', descKey: 'feat.clan_desc' },
                { icon: '🏆', titleKey: 'feat.score_title', descKey: 'feat.score_desc' },
                { icon: '🎯', titleKey: 'feat.match_title', descKey: 'feat.match_desc' },
                { icon: '📈', titleKey: 'feat.rank_title', descKey: 'feat.rank_desc' },
                { icon: '⚡', titleKey: 'feat.search_title', descKey: 'feat.search_desc' },
              ].map((item) => (
                <div
                  key={item.titleKey}
                  className="bg-white/5 border border-blue-500/10 rounded-xl p-4 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-200 group"
                >
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200 inline-block">{item.icon}</div>
                  <h3 className="text-sm font-bold text-gray-200 mb-1">{t(item.titleKey)}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{t(item.descKey)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* PKGG 플레이 분석 카드 */}
          <div className="w-full max-w-4xl mx-auto px-4 mt-8 sm:mt-12">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-blue-500/40" />
              <h2 className="text-xs font-bold text-blue-400/70 uppercase tracking-widest">PKGG 플레이 분석</h2>
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-blue-500/40" />
            </div>
            <div className="bg-white/5 border border-blue-500/10 rounded-2xl p-4 sm:p-6">
              <p className="text-xs text-gray-500 text-center mb-4">
                실제 전적 데이터를 기반으로 <strong className="text-gray-300">25가지 세부 유형</strong>으로 플레이스타일을 분석합니다
              </p>
              {/* 대카테고리 탭 */}
              <div className="flex gap-2 mb-5 flex-wrap justify-center">
                {Object.entries(MAJOR).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={() => { setActiveMajor(key); setActiveType(null); }}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all border ${
                      activeMajor === key
                        ? `${info.bg} ${info.border} ${info.color}`
                        : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10 hover:text-gray-300'
                    }`}
                  >
                    {info.icon} {info.label}
                  </button>
                ))}
              </div>
              {/* 세부 유형 목록 */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
                {Object.values(TYPES)
                  .filter(tp => tp.major === activeMajor && tp.label !== '❓ 분류 불가')
                  .map(tp => {
                    const isActive = activeType?.label === tp.label
                    return (
                      <button
                        key={tp.label}
                        onClick={() => setActiveType(isActive ? null : tp)}
                        className={`px-3 py-2.5 rounded-xl border text-center transition-all ${tp.bg} ${tp.border} ${
                          isActive ? 'ring-2 ring-offset-1 ring-offset-transparent opacity-100 scale-[1.03]' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={isActive ? { '--tw-ring-color': 'currentColor' } : {}}
                      >
                        <span className={`text-xs font-semibold ${tp.color}`}>{tp.label}</span>
                      </button>
                    )
                  })}
              </div>
              {/* 선택된 유형 설명 */}
              {activeType && (
                <div className={`mt-2 px-4 py-3 rounded-xl border ${activeType.bg} ${activeType.border} transition-all`}>
                  <div className="flex items-start gap-2">
                    <span className={`text-sm font-bold ${activeType.color} flex-shrink-0`}>{activeType.label}</span>
                    <span className="text-xs text-gray-400 leading-relaxed">{activeType.desc}</span>
                  </div>
                  <div className={`mt-1.5 text-[11px] ${activeType.color} opacity-70`}>💡 {activeType.tip}</div>
                </div>
              )}
            </div>
          </div>

          {/* PKGG란? */}
          <div className="w-full max-w-2xl mx-auto px-4 mt-8 sm:mt-14 mb-6 sm:mb-10">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-blue-500/40" />
              <h2 className="text-xs font-bold text-blue-400/70 uppercase tracking-widest">PKGG란?</h2>
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-blue-500/40" />
            </div>
            <div className="bg-white/5 border border-blue-500/10 rounded-xl px-6 py-5 space-y-3 text-sm text-gray-400 leading-relaxed">
              <p>
                <strong className="text-gray-200">PKGG(PK.GG)</strong>는 PUBG(배틀그라운드) 플레이어를 위한 무료 전적 조회 및 분석 플랫폼입니다. 닉네임 하나만 입력하면 시즌 통계, 랭크 정보, 무기 숙련도, 플레이스타일 분석까지 한눈에 확인할 수 있습니다.
              </p>
              <p>
                단순한 K/D 조회를 넘어, <strong className="text-gray-200">PKGG MMR(PPS)</strong>이라는 자체 지표로 플레이어의 종합 실력을 수치화합니다. 딜량·생존·승률·어시스트 등 6가지 지표를 정규화해 Bronze부터 Legend까지 7단계 티어로 표현합니다.
              </p>
              <p>
                클랜 기능도 강력합니다. 클랜원 전체 스탯 비교, 시너지 히트맵, 스쿼드 자동 편성, 내전 기록 관리까지 지원합니다. 공개 클랜 디렉토리에서 MMR 랭킹 순으로 전국 클랜을 탐색할 수도 있습니다.
              </p>
              <p>
                그 외에도 에임 트레이너, 반동 패턴 시뮬레이터, 크로스헤어 배치 트레이너, 피킹 트레이너 등 실력 향상을 위한 미니게임과 훈련 도구를 무료로 제공합니다. PUBG 공식 API 데이터를 기반으로 하며, 회원가입 없이 누구나 이용 가능합니다.
              </p>
            </div>
          </div>

          {/* FAQ */}
          <div className="w-full max-w-2xl mx-auto px-4 mt-4 mb-4">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-blue-500/40" />
              <h2 className="text-xs font-bold text-blue-400/70 uppercase tracking-widest">FAQ</h2>
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-blue-500/40" />
            </div>
            <div className="space-y-3">
              {[
                {
                  q: 'PKGG는 무료인가요?',
                  a: '네, 완전 무료입니다. 회원가입·로그인 없이 닉네임 검색만으로 전적 조회, 클랜 분석, 훈련 도구 등 모든 기능을 이용할 수 있습니다.',
                },
                {
                  q: '어떤 플랫폼을 지원하나요?',
                  a: 'Steam, Kakao, Console(PS·Xbox) 세 가지 플랫폼을 지원합니다. 닉네임만 입력하면 플랫폼을 자동으로 감지해 결과를 보여줍니다. 같은 닉네임이 여러 플랫폼에 있는 경우 선택 화면이 나타납니다.',
                },
                {
                  q: 'PKGG MMR(PPS)은 어떻게 계산되나요?',
                  a: 'K/D, 딜량, 승률, Top10 진입률, 어시스트, 생존시간 6가지 지표를 0~1 범위로 정규화한 뒤 가중 합산해 1000~2500 범위로 환산합니다. 공식 랭크와는 별개로 실력을 종합적으로 나타내는 PKGG 자체 지표입니다.',
                },
                {
                  q: '클랜 분석은 어떻게 사용하나요?',
                  a: '상단 메뉴 → 클랜 분석에서 클랜명을 검색하면 멤버 스탯 비교, 시너지 히트맵, 스쿼드 자동 편성, 내전 기록 등을 확인할 수 있습니다. 공개 클랜은 /clans 페이지에서 MMR 랭킹 순으로 탐색할 수도 있습니다.',
                },
                {
                  q: '데이터는 얼마나 자주 업데이트되나요?',
                  a: '플레이어 정보는 조회 시점 기준으로 PUBG 공식 API에서 실시간으로 가져옵니다. 클랜 멤버 일괄 업데이트는 주기적인 배치 작업으로 진행됩니다.',
                },
                {
                  q: '훈련 도구에는 어떤 것들이 있나요?',
                  a: '에임 트레이너(반응속도·플리커·이동타겟), 반동 패턴 시뮬레이터, 크로스헤어 배치 트레이너, 피킹 트레이너, 낙하 지점 계산기, 감도 분석기, 반동 퀴즈 등을 무료로 제공합니다. 모두 브라우저에서 바로 실행되며 별도 설치가 필요 없습니다.',
                },
              ].map((item, i) => (
                <FaqItem key={i} q={item.q} a={item.a} />
              ))}
            </div>
          </div>

        </main>

      </div>
    </>
  );
}
