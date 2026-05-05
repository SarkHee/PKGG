// pages/_app.js

import '../styles/globals.css';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap' });
import Script from 'next/script';
import CookieBanner from '../components/CookieBanner';
import Footer from '../components/layout/Footer';
import { LanguageProvider, useT } from '../utils/i18n';
import { AuthProvider } from '../utils/useAuth';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

function FloatingFeedback() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('bug')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | done | error

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim() || status === 'sending') return
    setStatus('sending')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message: message.trim() }),
      })
      if (!res.ok) throw new Error()
      setStatus('done')
      setTimeout(() => { setStatus('idle'); setMessage(''); setOpen(false) }, 2000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <div className="fixed right-4 bottom-32 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">피드백 보내기</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none">×</button>
          </div>
          {status === 'done' ? (
            <div className="text-center py-4 text-green-500 font-semibold text-sm">✓ 전송됐어요! 감사합니다.</div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <button type="button" onClick={() => setType('bug')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${type === 'bug' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                  🐛 버그 신고
                </button>
                <button type="button" onClick={() => setType('suggest')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${type === 'suggest' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                  💡 개선 제안
                </button>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={type === 'bug' ? '어떤 버그가 발생했나요? 페이지, 상황을 알려주세요.' : '어떤 기능이 있으면 좋을까요?'}
                rows={4}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
              {status === 'error' && (
                <p className="text-[11px] text-red-400 text-center">전송 실패. 잠시 후 다시 시도해주세요.</p>
              )}
              <button type="submit" disabled={!message.trim() || status === 'sending'}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors">
                {status === 'sending' ? '전송 중...' : '보내기'}
              </button>
            </form>
          )}
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        title="버그 신고 / 개선 제안"
        className="flex items-center gap-1.5 bg-gray-800 dark:bg-gray-700 hover:bg-gray-700 dark:hover:bg-gray-600 text-white text-xs font-semibold px-3 py-2.5 rounded-full shadow-lg transition-colors border border-gray-600"
      >
        <span>💬</span>
        <span>버그 · 개선 제안</span>
      </button>
    </div>
  )
}

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
  const prefetchCache = useRef({});
  const prefetchTimer = useRef(null);
  const router = useRouter();
  const { t } = useT();

  // 패널이 열릴 때마다 입력값·결과 초기화
  useEffect(() => {
    if (open) { setNick(''); setResults(null); }
  }, [open]);

  const triggerPrefetch = (name) => {
    clearTimeout(prefetchTimer.current);
    if (name.length < 2) return;
    const key = name.toLowerCase();
    const cached = prefetchCache.current[key];
    if (cached && Date.now() - cached.ts < 5 * 60 * 1000) return;
    prefetchTimer.current = setTimeout(() => {
      const promise = fetch(`/api/pubg/search?nickname=${encodeURIComponent(name)}`)
        .then((r) => r.json())
        .then((data) => { prefetchCache.current[key] = { ts: Date.now(), data }; return data; })
        .catch(() => null);
      prefetchCache.current[key] = { ts: Date.now(), promise, data: null };
    }, 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = nick.trim();
    if (!trimmed) return;
    setResults(null);
    setSearching(true);
    try {
      const key = trimmed.toLowerCase();
      const cached = prefetchCache.current[key];
      let data;
      if (cached?.data) {
        data = cached.data;
      } else if (cached?.promise) {
        data = await cached.promise;
      } else {
        const res = await fetch(`/api/pubg/search?nickname=${encodeURIComponent(trimmed)}`);
        data = await res.json();
      }
      setResults(data?.results || []);
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
                onChange={(e) => { const v = e.target.value; setNick(v); triggerPrefetch(v); if (!v) setResults(null); }}
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

  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    const start = () => setRouteLoading(true);
    const stop  = () => setRouteLoading(false);
    router.events.on('routeChangeStart',    start);
    router.events.on('routeChangeComplete', stop);
    router.events.on('routeChangeError',    stop);
    return () => {
      router.events.off('routeChangeStart',    start);
      router.events.off('routeChangeComplete', stop);
      router.events.off('routeChangeError',    stop);
    };
  }, [router.events]);

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
      {/* 페이지 전환 로딩 바 */}
      {routeLoading && (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 animate-[loading-bar_1s_ease-in-out_infinite]" style={{ width: '60%', animation: 'loading-bar 1.2s ease-in-out infinite' }} />
        </div>
      )}
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

      <div className={`${inter.className} min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col`}>
        <div className="flex-1">
          <Component {...pageProps} />
        </div>
        {showFooter && <Footer />}
      </div>
      <FloatingFavorites />
      {showSearch && <FloatingSearch />}
      <FloatingFeedback />
      <SpeedInsights sampleRate={0.1} />
      <Analytics />
    </LanguageProvider>
    </AuthProvider>
  );
}

export default MyApp;
