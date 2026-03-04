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

function FloatingSearch() {
  const [nick, setNick] = useState('');
  const [srv, setSrv] = useState('steam');
  const router = useRouter();
  const { t } = useT();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nick.trim()) {
      router.push(`/player/${srv}/${encodeURIComponent(nick.trim())}`);
      setNick('');
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-5 px-4 pointer-events-none">
      <form
        onSubmit={handleSubmit}
        className="pointer-events-auto flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-2 shadow-lg w-full max-w-md"
      >
        <select
          value={srv}
          onChange={(e) => setSrv(e.target.value)}
          className="bg-transparent text-gray-600 text-xs font-bold border-none outline-none cursor-pointer"
        >
          <option value="steam">Steam</option>
          <option value="kakao">Kakao</option>
          <option value="console">Console</option>
        </select>
        <div className="w-px h-4 bg-gray-200" />
        <input
          type="text"
          placeholder={t('search.placeholder')}
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          className="flex-1 bg-transparent text-gray-800 placeholder-gray-400 text-sm outline-none min-w-0"
        />
        <button
          type="submit"
          className="flex-shrink-0 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm transition-colors"
        >
          {t('search.button')}
        </button>
      </form>
    </div>
  );
}

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const { pathname } = router;

  // null = 아직 결정 안 함(배너 표시), true = 동의, false = 거부
  const [cookieConsent, setCookieConsent] = useState(null);

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

      <div className="min-h-screen bg-white text-gray-900 flex flex-col">
        <div className="flex-1">
          <Component {...pageProps} />
        </div>
        {showFooter && <Footer />}
      </div>
      {showSearch && <FloatingSearch />}
      <SpeedInsights />
      <Analytics />
    </LanguageProvider>
    </AuthProvider>
  );
}

export default MyApp;
