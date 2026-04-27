// pages/index.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import Header from '../components/layout/Header';
import { useT } from '../utils/i18n';
import { MAJOR, TYPES } from '../utils/playstyleClassifier';

const FAV_KEY    = 'pkgg_favorites';
const SEARCH_KEY = 'pkgg_recent_searches';
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

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [server, setServer] = useState('steam');
  const [activeMajor, setActiveMajor] = useState('OFFENSIVE');
  const [searchMessage, setSearchMessage] = useState('');
  const [favorites, setFavorites]           = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showDropdown, setShowDropdown]     = useState(false);
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

  const handleSearch = (nick = searchTerm, shard = server) => {
    const name = nick.trim();
    if (!name) return;
    saveRecentSearch(name, shard);
    setRecentSearches(loadRecentSearches());
    setShowDropdown(false);
    router.push(`/player/${shard}/${encodeURIComponent(name)}`);
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
    if (e.key === 'Escape') setShowDropdown(false);
  };

  return (
    <>
      <Head>
        <title>{t('home.meta_title')}</title>
        <meta name="description" content={t('home.meta_desc')} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://pk.gg/" />
        <meta property="og:title" content={t('home.meta_title')} />
        <meta property="og:description" content={t('home.meta_desc')} />
        <meta property="og:image" content="https://pk.gg/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t('home.meta_title')} />
        <meta name="twitter:description" content={t('home.meta_desc')} />
        <meta name="twitter:image" content="https://pk.gg/og-image.png" />
        <link rel="canonical" href="https://pk.gg/" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "PKGG",
            "url": "https://pk.gg",
            "description": "PUBG 플레이어 전적 검색, 클랜 분석, 무기 성향 테스트",
            "potentialAction": {
              "@type": "SearchAction",
              "target": { "@type": "EntryPoint", "urlTemplate": "https://pk.gg/?q={search_term_string}" },
              "query-input": "required name=search_term_string"
            }
          })}}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="true"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
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
        <Header
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          server={server}
          setServer={setServer}
          handleSearch={handleSearch}
          handleKeyPress={handleKeyPress}
        />

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
                {/* 서버 선택 탭 */}
                <div className="flex gap-1.5 sm:gap-2 mb-3">
                  {[
                    { key: 'steam',   label: '🎮 Steam',  mLabel: '🎮',  active: 'bg-[#1b2838] border border-[#4a9eff]/60 text-white' },
                    { key: 'kakao',   label: '🟡 카카오배그', mLabel: '🟡 카카오', active: 'bg-yellow-500 text-gray-900' },
                    { key: 'console', label: '🎯 Console', mLabel: '🎯',  active: 'bg-blue-600 text-white' },
                  ].map(({ key, label, mLabel, active }) => (
                    <button
                      key={key}
                      onClick={() => setServer(key)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                        server === key
                          ? active
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                      }`}
                    >
                      <span className="hidden sm:inline">{label}</span>
                      <span className="sm:hidden">{mLabel}</span>
                    </button>
                  ))}
                </div>
                {/* 선택된 플랫폼 안내 */}
                <p className="text-[11px] text-gray-500 mb-2 px-0.5">
                  {server === 'kakao' ? '🟡 카카오배그 닉네임으로 검색합니다' : server === 'console' ? '🎯 PS/Xbox 닉네임으로 검색합니다' : '🎮 Steam 배틀그라운드 닉네임으로 검색합니다'}
                </p>
                {/* 검색 입력 */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={server === 'kakao' ? '카카오배그 닉네임 입력...' : server === 'console' ? 'Console 닉네임 입력...' : 'Steam 닉네임 입력...'}
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    onKeyDown={handleKeyPress}
                    className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  />
                  <button
                    onClick={() => handleSearch()}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all duration-200 shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40 flex items-center gap-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {t('search.button')}
                  </button>
                </div>

                {/* 최근 검색 드롭다운 */}
                {showDropdown && recentSearches.length > 0 && (
                  <div className="mt-2 border-t border-white/10 pt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">🕐 최근 검색</span>
                      <button
                        onClick={clearAllRecent}
                        className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
                      >
                        전체 삭제
                      </button>
                    </div>
                    <div className="space-y-0.5">
                      {recentSearches
                        .filter((s) => !searchTerm || s.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((s) => (
                          <div
                            key={`${s.shard}-${s.nickname}`}
                            onClick={() => { setSearchTerm(s.nickname); setServer(s.shard); handleSearch(s.nickname, s.shard); }}
                            className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-white/10 cursor-pointer group transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-gray-500 text-xs flex-shrink-0">🔍</span>
                              <span className="text-sm text-gray-300 truncate">{s.nickname}</span>
                              <span className="text-[10px] text-gray-600 flex-shrink-0">{s.shard}</span>
                            </div>
                            <button
                              onClick={(e) => removeRecentSearch(s.nickname, s.shard, e)}
                              className="text-gray-700 hover:text-gray-400 text-xs opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ml-2"
                            >
                              ×
                            </button>
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
                        onClick={() => router.push(`/player/${fav.shard}/${encodeURIComponent(fav.nickname)}`)}
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
                    onClick={() => setActiveMajor(key)}
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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {Object.values(TYPES)
                  .filter(tp => tp.major === activeMajor && tp.label !== '❓ 분류 불가')
                  .map(tp => (
                    <div
                      key={tp.label}
                      className={`px-3 py-2.5 rounded-xl border text-center ${tp.bg} ${tp.border}`}
                    >
                      <span className={`text-xs font-semibold ${tp.color}`}>{tp.label}</span>
                    </div>
                  ))}
              </div>
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
                  a: 'Steam, Kakao, Console(PS·Xbox) 세 가지 플랫폼을 지원합니다. 검색창에서 플랫폼을 선택한 뒤 닉네임을 입력하면 해당 플랫폼의 데이터를 불러옵니다.',
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
