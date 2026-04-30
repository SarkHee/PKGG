// pages/_app.js

import '../styles/globals.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Script from 'next/script';
import CookieBanner from '../components/CookieBanner';
import Footer from '../components/layout/Footer';
import { LanguageProvider, useT } from '../utils/i18n';
import { AuthProvider } from '../utils/useAuth';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

function FloatingFavorites() {
  const [favs, setFavs] = useState([]);
  const router = useRouter();
  const { pathname } = router;

  useEffect(() => {
    const load = () => {
      try { setFavs(JSON.parse(localStorage.getItem('pkgg_favorites') || '[]')); }
      catch { setFavs([]); }
    };
    load();
  }, [pathname]); // 페이지 이동 시마다 새로 로드

  // 홈·어드민·모바일은 제외 (홈은 인라인으로 이미 표시)
  if (pathname === '/' || pathname.startsWith('/admin') || favs.length === 0) return null;

  return (
    <div className="hidden sm:block fixed right-3 bottom-24 z-40 pointer-events-none">
      <div className="pointer-events-auto flex flex-col items-center gap-1.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur border border-gray-200 dark:border-gray-700 rounded-2xl px-2 py-3 shadow-lg">
        <span className="text-gray-500 dark:text-gray-400 text-xs font-bold mb-0.5 whitespace-nowrap">즐겨찾기 유저</span>
        {favs.map((fav) => (
          <button
            key={`${fav.shard}-${fav.nickname}`}
            onClick={() => router.push(`/player/${fav.shard}/${encodeURIComponent(fav.nickname)}`)}
            className="px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-400 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold transition-colors text-center max-w-[90px] truncate"
            title={fav.nickname}
          >
            {fav.nickname}
          </button>
        ))}
      </div>
    </div>
  );
}

const SHARD_LABEL_FLOAT = { steam: '🎮 Steam', kakao: '🟡 카카오', psn: '🎯 PS', xbox: '🎯 Xbox', console: '🎯 Console' }
const SHARD_COLOR_FLOAT = {
  steam: 'bg-blue-900/60 text-blue-300',
  kakao: 'bg-yellow-500/20 text-yellow-300',
  psn: 'bg-blue-800/40 text-blue-300',
  xbox: 'bg-green-800/40 text-green-300',
  console: 'bg-blue-800/40 text-blue-300',
}

function FloatingSearch() {
  const [nick, setNick] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const { t } = useT();

  // 패널이 열릴 때마다 입력값·결과 초기화
  useEffect(() => {
    if (open) { setNick(''); setResults(null); }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = nick.trim();
    if (!trimmed) return;
    setResults(null);
    setSearching(true);
    try {
      const res = await fetch(`/api/pubg/search?nickname=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (nickname, shard) => {
    router.push(`/player/${shard}/${encodeURIComponent(nickname)}`);
    setOpen(false);
  };

  return (
    <div className="fixed left-4 bottom-6 z-50 flex flex-col items-start gap-2 pointer-events-none">
      {open && (
        <div className="pointer-events-auto w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 shadow-xl">
          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">🔍 플레이어 검색</div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="닉네임 입력..."
                value={nick}
                onChange={(e) => { setNick(e.target.value); if (!e.target.value) setResults(null); }}
                className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-400"
                autoComplete="off"
                autoFocus
              />
              <button
                type="submit"
                disabled={searching}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-bold text-xs transition-colors flex items-center"
              >
                {searching
                  ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : t('search.button')}
              </button>
            </div>
          </form>

          {/* 검색 결과 */}
          {results !== null && (
            <div className="mt-2 border-t border-gray-100 dark:border-gray-700 pt-2">
              {results.length === 0 ? (
                <p className="text-[11px] text-gray-400 text-center py-1">플레이어를 찾을 수 없습니다</p>
              ) : (
                <div className="space-y-1">
                  {results.map((r) => (
                    <div
                      key={`${r.shard}-${r.nickname}`}
                      onClick={() => handleSelect(r.nickname, r.shard)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${SHARD_COLOR_FLOAT[r.shard] || ''}`}>
                        {SHARD_LABEL_FLOAT[r.shard] || r.shard}
                      </span>
                      <span className="text-xs text-gray-800 dark:text-gray-200 font-semibold flex-1 truncate">{r.nickname}</span>
                      {r.stats && (
                        <span className="text-[9px] text-gray-400 flex-shrink-0">딜{r.stats.avgDamage} {r.stats.mmr > 0 ? `MMR${r.stats.mmr}` : ''}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto w-11 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-lg transition-colors self-start"
        title="플레이어 검색"
      >
        {open ? '✕' : '🔍'}
      </button>
    </div>
  );
}

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const { pathname } = router;

  // null = 아직 결정 안 함(배너 표시), true = 동의, false = 거부
  const [cookieConsent, setCookieConsent] = useState(null);

  // GTM 페이지뷰 이벤트 (Next.js SPA 라우팅 대응)
  useEffect(() => {
    const handleRouteChange = (url) => {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'pageview', page: url });
    };
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, [router.events]);

  useEffect(() => {
    // 앱 시작 시 포럼 카테고리 초기화
    const initializeForum = async () => {
      try {
        await fetch('/api/forum/init', { method: 'POST' });
      } catch (error) {
        console.log('포럼 초기화 요청 실패:', error.message);
      }
    };
    initializeForum();

    // 저장된 쿠키 동의 여부 확인
    const saved = localStorage.getItem('cookie_consent');
    if (saved === 'accepted') setCookieConsent(true);
    else if (saved === 'rejected') setCookieConsent(false);
    // else: null 유지 → 배너 표시

    // 테마 초기화 (시스템 선호 또는 저장값)
    const savedTheme = localStorage.getItem('pkgg_theme');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setCookieConsent(true);
  };

  const handleReject = () => {
    localStorage.setItem('cookie_consent', 'rejected');
    setCookieConsent(false);
  };

  // 관리자 페이지는 Footer/검색 제외
  const showFooter = !pathname.startsWith('/admin');
  const showSearch = !pathname.startsWith('/admin') && pathname !== '/';

  return (
    <AuthProvider>
    <LanguageProvider>
      {/* 쿠키 동의 후에만 AdSense 로드 */}
      {cookieConsent === true && (
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7884456727026548"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      )}

      {/* 동의 미결정 상태일 때만 배너 표시 */}
      {cookieConsent === null && (
        <CookieBanner onAccept={handleAccept} onReject={handleReject} />
      )}

      <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col">
        <div className="flex-1">
          <Component {...pageProps} />
        </div>
        {showFooter && <Footer />}
      </div>
      <FloatingFavorites />
      {showSearch && <FloatingSearch />}
      <SpeedInsights sampleRate={0.1} />
      <Analytics />
    </LanguageProvider>
    </AuthProvider>
  );
}

export default MyApp;
