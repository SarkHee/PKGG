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

function FloatingSearch() {
  const [nick, setNick] = useState('');
  const [srv, setSrv] = useState('steam');
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { t } = useT();

  // 패널이 열릴 때마다 입력값 초기화
  useEffect(() => {
    if (open) setNick('');
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = nick.trim();
    if (trimmed) {
      router.push(`/player/${srv}/${encodeURIComponent(trimmed)}`);
      setNick('');
      setOpen(false);
    }
  };

  return (
    <div className="fixed left-4 bottom-6 z-50 flex flex-col items-start gap-2 pointer-events-none">
      {open && (
        <div className="pointer-events-auto w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 shadow-xl">
          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">🔍 플레이어 검색</div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <select
              value={srv}
              onChange={(e) => setSrv(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 outline-none cursor-pointer"
            >
              <option value="steam">Steam</option>
              <option value="kakao">Kakao</option>
              <option value="console">Console</option>
            </select>
            <input
              type="text"
              placeholder={t('search.placeholder')}
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-400"
              autoComplete="off"
              autoFocus
            />
            <button
              type="submit"
              className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition-colors"
            >
              {t('search.button')}
            </button>
          </form>
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
