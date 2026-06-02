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
import { SessionProvider, useSession } from 'next-auth/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

const TOPIC_LABEL_PANEL = {
  bug:     '🐛 버그/오류',
  feature: '💡 기능 제안',
  data:    '📊 데이터 오류',
  forum:   '🚨 포럼 신고',
  other:   '📬 기타',
}

function FloatingInquiryPanel() {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [deleting, setDeleting] = useState(null)

  // 관리자 이메일이 아니면 렌더하지 않음
  if (!session?.user?.isAdmin) return null

  const loadInquiries = async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/inquiries-panel')
      const data = await res.json()
      setInquiries(data.inquiries || [])
    } catch {
      setInquiries([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    try {
      const res = await fetch(`/api/admin/delete-inquiry?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setInquiries((prev) => prev.filter((inq) => inq.id !== id))
        if (expanded === id) setExpanded(null)
      }
    } catch {}
    finally { setDeleting(null) }
  }

  const handleOpen = () => {
    setOpen((v) => {
      if (!v) loadInquiries()
      return !v
    })
  }

  return (
    <div className="fixed left-4 bottom-32 z-50 flex flex-col items-start gap-2">
      {open && (
        <div className="w-80 sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[70vh]">
          {/* 패널 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
              📬 문의함 {inquiries.length > 0 && <span className="text-blue-500">({inquiries.length})</span>}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={loadInquiries}
                className="text-xs text-gray-400 hover:text-blue-500 transition-colors"
                title="새로고침"
              >
                🔄
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>

          {/* 목록 */}
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {loading ? (
              <div className="text-center py-8 text-sm text-gray-400">불러오는 중...</div>
            ) : inquiries.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">접수된 문의가 없습니다.</div>
            ) : (
              inquiries.map((inq) => (
                <div key={inq.id} className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="flex items-start">
                    <button
                      onClick={() => setExpanded(expanded === inq.id ? null : inq.id)}
                      className="flex-1 px-3 py-2.5 flex items-start gap-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors min-w-0"
                    >
                      <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                        {TOPIC_LABEL_PANEL[inq.topic] || inq.topic}
                      </span>
                      <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">{inq.message}</span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {new Date(inq.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </span>
                    </button>
                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => handleDelete(inq.id)}
                      disabled={deleting === inq.id}
                      className="flex-shrink-0 px-2.5 py-2.5 text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 transition-colors disabled:opacity-40"
                      title="삭제"
                    >
                      {deleting === inq.id ? '…' : '🗑'}
                    </button>
                  </div>
                  {expanded === inq.id && (
                    <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700 pt-2 space-y-2">
                      <p className="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                        {inq.message}
                      </p>
                      {inq.email && (
                        <a href={`mailto:${inq.email}`} className="text-xs text-blue-500 hover:underline block">
                          ✉️ {inq.email}
                        </a>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-gray-400">
                          {new Date(inq.createdAt).toLocaleString('ko-KR')}
                        </p>
                        <button
                          onClick={() => handleDelete(inq.id)}
                          disabled={deleting === inq.id}
                          className="text-xs text-red-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                        >
                          {deleting === inq.id ? '삭제 중...' : '삭제'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 트리거 버튼 */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2.5 rounded-full shadow-lg transition-colors border border-blue-500"
      >
        <span>📬</span>
        <span>피드백 확인</span>
        {inquiries.length > 0 && (
          <span className="bg-white text-blue-600 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ml-0.5">
            {inquiries.length > 99 ? '99+' : inquiries.length}
          </span>
        )}
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

  // 관리자 페이지는 Footer 제외
  const showFooter = !pathname.startsWith('/admin');

  return (
    <SessionProvider session={pageProps.session}>
    <AuthProvider>
    <LanguageProvider>
      {/* 페이지 전환 로딩 바 */}
      {routeLoading && (
        <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 animate-[loading-bar_1s_ease-in-out_infinite]" style={{ width: '60%', animation: 'loading-bar 1.2s ease-in-out infinite' }} />
        </div>
      )}

      {/* 동의 미결정 상태일 때만 배너 표시 */}
      {cookieConsent === null && (
        <CookieBanner onAccept={handleAccept} onReject={handleReject} />
      )}

      <div className={`${inter.className} min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col`}>
        <div className="flex-1">
          <Component key={router.pathname === '/player/[server]/[nickname]' ? router.asPath : router.pathname} {...pageProps} />
        </div>
        {showFooter && <Footer />}
      </div>
      <FloatingFavorites />
      <FloatingInquiryPanel />
      <SpeedInsights sampleRate={0.1} />
      <Analytics />
    </LanguageProvider>
    </AuthProvider>
    </SessionProvider>
  );
}

export default MyApp;
