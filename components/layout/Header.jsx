// components/layout/Header.jsx

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useT } from '../../utils/i18n';
import { useAuth } from '../../utils/useAuth';
import { signIn } from 'next-auth/react';

const LANG_OPTIONS = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

function NavDropdown({ label, links, isActive, t, openKey, openMenu, setOpenMenu }) {
  const ref = useRef(null);
  const isOpen = openMenu === openKey;
  const hasActive = links.some((l) => isActive(l.href));

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpenMenu(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, setOpenMenu]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpenMenu(isOpen ? null : openKey)}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          hasActive
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10'
        }`}
      >
        {label}
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-[999] min-w-[160px]">
          {links.map((link) => (
            <Link key={link.href} href={link.href} passHref>
              <span
                onClick={() => setOpenMenu(null)}
                className={`relative flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                  isActive(link.href)
                    ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/60'
                }`}
              >
                <span>{link.icon}</span>
                {t(link.labelKey)}
                {link.highlight && !isActive(link.href) && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-red-500 rounded-full" />
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen,   setLangMenuOpen]   = useState(false);
  const [openMenu,       setOpenMenu]       = useState(null); // 'analysis' | 'weapon' | 'community' | 'training'
  const [isDark, setIsDark] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [donationCount, setDonationCount]   = useState(null); // 전체 후원 횟수
  const [myDonations,   setMyDonations]     = useState(0);    // 이 기기 후원 횟수
  const [donating,      setDonating]        = useState(false);
  const [thankMsg,      setThankMsg]        = useState('');
  const router = useRouter();
  const { lang, t, switchLang } = useT();
  const { user, logout } = useAuth() || {};

  // 초기 테마 읽기 + 후원 수 로드 (localStorage 5분 캐시)
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    setMyDonations(parseInt(localStorage.getItem('pkgg_my_donations') || '0', 10));

    const DONATION_TTL = 5 * 60 * 1000;
    try {
      const raw = localStorage.getItem('pkgg_donation_cache');
      if (raw) {
        const { count, ts } = JSON.parse(raw);
        if (Date.now() - ts < DONATION_TTL) {
          setDonationCount(count);
          return;
        }
      }
    } catch {}

    fetch('/api/donations/count')
      .then((r) => r.json())
      .then((d) => {
        const count = d.count ?? 0;
        setDonationCount(count);
        localStorage.setItem('pkgg_donation_cache', JSON.stringify({ count, ts: Date.now() }));
      })
      .catch(() => {});
  }, []);

  const handleDonationComplete = useCallback(async () => {
    if (donating) return;
    setDonating(true);
    try {
      const res = await fetch('/api/donations/count', { method: 'POST' });
      const data = await res.json();
      const newTotal = data.count;
      const myNext = myDonations + 1;

      setDonationCount(newTotal);
      setMyDonations(myNext);
      localStorage.setItem('pkgg_my_donations', String(myNext));
      localStorage.setItem('pkgg_donation_cache', JSON.stringify({ count: newTotal, ts: Date.now() }));

      setThankMsg(`${newTotal}번째 후원자님 감사합니다! 🎉`);

      // 폭죽
      if (typeof window !== 'undefined') {
        import('canvas-confetti').then(({ default: confetti }) => {
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.4 }, colors: ['#FFD700','#FEE500','#3B82F6','#10B981','#F59E0B'] });
          setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 } }), 250);
          setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 } }), 400);
        });
      }

      setTimeout(() => { setThankMsg(''); setShowQR(false); }, 4000);
    } catch {
      setThankMsg('감사합니다! 🙏');
      setTimeout(() => setThankMsg(''), 3000);
    } finally {
      setDonating(false);
    }
  }, [donating, myDonations]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('pkgg_theme', next ? 'dark' : 'light');
  };

  const isActive = (path) => router.pathname === path || router.pathname.startsWith(path + '/');

  const analysisLinks = [
    { href: '/compare',           labelKey: 'nav.compare',           icon: '⚔️' },
    { href: '/clans',             labelKey: 'nav.clans',             icon: '🏆' },
    { href: '/clan-analytics',    labelKey: 'nav.clan_analytics',    icon: '📊' },
    { href: '/clan-war',          labelKey: 'nav.clan_war',          icon: '🛡️' },
    { href: '/playstyle-matchup', labelKey: 'nav.playstyle_matchup', icon: '🧭' },
  ];

  const weaponLinks = [
    { href: '/weapon-test',   labelKey: 'nav.weapon_test',   icon: '🔫', highlight: true },
    { href: '/weapon-damage', labelKey: 'nav.weapon_damage', icon: '💥' },
    { href: '/weapon-meta',   labelKey: 'nav.weapon_meta',   icon: '📈' },
  ];

  const communityLinks = [
    { href: '/forum',           labelKey: 'nav.forum',           icon: '💬' },
    { href: '/party',           labelKey: 'nav.party',           icon: '👥' },
    { href: '/settings-share',  labelKey: 'nav.settings_share',  icon: '⚙️' },
    { href: '/notices',         labelKey: 'nav.notices',         icon: '📢' },
    { href: '/pubg-news',       labelKey: 'nav.news',            icon: '📰' },
  ];

  const trainingLinks = [
    { href: '/sensitivity-analyzer', labelKey: 'nav.sensitivity_analyzer', icon: '📹' },
    { href: '/aim-trainer',          labelKey: 'nav.aim_trainer',          icon: '⚡' },
    { href: '/recoil-pattern',       labelKey: 'nav.recoil_pattern',       icon: '🔫' },
    { href: '/sens-preset',          labelKey: 'nav.sens_preset',          icon: '⚙️' },
    { href: '/pubg-survivors',       labelKey: 'nav.pubg_survivors',       icon: '🎮' },
  ];

  const currentLang = LANG_OPTIONS.find((lp) => lp.code === lang) || LANG_OPTIONS[0];

  return (
    <>
      {/* 상단 강조선 */}
      <div className="h-0.5 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 w-full" />

      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 shadow-sm dark:shadow-gray-900/50">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-14 gap-2">

            {/* 로고 + 네비게이션 */}
            <div className="flex items-center gap-1 min-w-0">
              <Link href="/" passHref>
                <span className="cursor-pointer mr-5 flex items-center flex-shrink-0">
                  <Image
                    src="/logo.png"
                    alt="PKGG"
                    width={518}
                    height={295}
                    className="h-8 w-auto object-contain"
                    priority
                  />
                </span>
              </Link>

              {/* 데스크탑 네비게이션 — 4개 드롭다운 */}
              <nav className="hidden md:flex items-center gap-1">
                <NavDropdown label={t('nav.group_analysis')}   links={analysisLinks}  isActive={isActive} t={t} openKey="analysis"  openMenu={openMenu} setOpenMenu={setOpenMenu} />
                <NavDropdown label={t('nav.group_weapon')}     links={weaponLinks}    isActive={isActive} t={t} openKey="weapon"    openMenu={openMenu} setOpenMenu={setOpenMenu} />
                <NavDropdown label={t('nav.group_community')}  links={communityLinks} isActive={isActive} t={t} openKey="community" openMenu={openMenu} setOpenMenu={setOpenMenu} />
                <NavDropdown label={t('nav.training')}         links={trainingLinks}  isActive={isActive} t={t} openKey="training"  openMenu={openMenu} setOpenMenu={setOpenMenu} />
              </nav>
            </div>

            {/* 오른쪽: 언어 + 로그인 */}
            <div className="hidden md:flex items-center gap-2 flex-shrink-0">
              {/* 로그인 / 유저 정보 */}
              {user === undefined ? null : user ? (
                <div className="flex items-center gap-2">
                  <Link href="/mypage" className="flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                    {user.image ? (
                      <img src={user.image} alt={user.name} className="w-5 h-5 rounded-full" />
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold">{user.name?.[0] || 'U'}</span>
                    )}
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 max-w-[80px] truncate">{user.name}</span>
                  </Link>
                  <button
                    onClick={logout}
                    className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-medium"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signIn('google')}
                  className="h-9 flex items-center gap-2 px-3 rounded-lg bg-white hover:bg-gray-50 border border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google 로그인
                </button>
              )}

              {/* 커피 후원 버튼 */}
              <button
                onClick={() => setShowQR(true)}
                className="h-8 flex items-center gap-1 px-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-xs font-medium transition-colors whitespace-nowrap"
              >
                ☕
                <span className="hidden sm:inline">커피 사주기</span>
                {donationCount !== null && (
                  <span className="hidden sm:inline text-[10px] text-yellow-500 font-bold ml-0.5">{donationCount}</span>
                )}
              </button>

              {/* 다크/라이트 테마 토글 */}
              <button
                onClick={toggleTheme}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
              >
                {isDark ? '☀️' : '🌙'}
              </button>

              {/* 언어 드롭다운 */}
              <div className="relative">
                <button
                  onClick={() => setLangMenuOpen(!langMenuOpen)}
                  onBlur={() => setTimeout(() => setLangMenuOpen(false), 150)}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-medium"
                >
                  <span>{currentLang.flag}</span>
                  <span>{currentLang.label}</span>
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {langMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-[999] min-w-[130px]">
                    {LANG_OPTIONS.map((option) => (
                      <button
                        key={option.code}
                        onClick={() => { switchLang(option.code); setLangMenuOpen(false); }}
                        className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left ${
                          lang === option.code
                            ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-900/30 dark:text-blue-400'
                            : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/60'
                        }`}
                      >
                        <span>{option.flag}</span>
                        <span>{option.label}</span>
                        {lang === option.code && <span className="ml-auto text-blue-500 text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 모바일 메뉴 버튼 */}
            <button
              className="md:hidden p-2.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            {/* 빠른 닉네임 검색 (훈련 도구 페이지에서는 숨김) */}
            {!['/sensitivity-analyzer', '/sensitivity', '/aim-trainer', '/recoil-pattern', '/peek-trainer', '/pubg-survivors'].includes(router.pathname) && (
            <form
              className="px-4 pt-3 pb-2"
              onSubmit={(e) => {
                e.preventDefault();
                const q = e.target.q.value.trim();
                if (q) { router.push(`/?search=${encodeURIComponent(q)}`); setMobileMenuOpen(false); }
              }}
            >
              <div className="flex gap-2">
                <input
                  name="q"
                  placeholder="닉네임 검색..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button type="submit" className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg font-semibold hover:bg-blue-700 transition-colors">검색</button>
              </div>
            </form>
            )}

            <div className="px-4 pb-3 space-y-4">
              {/* 분석 */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-1">{t('nav.group_analysis')}</p>
                <div className="grid grid-cols-2 gap-1">
                  {analysisLinks.map((link) => (
                    <Link key={link.href} href={link.href} passHref>
                      <span
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                          isActive(link.href)
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10'
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span className="text-base leading-none">{link.icon}</span>
                        <span className="truncate">{t(link.labelKey)}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* 무기 */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-1">{t('nav.group_weapon')}</p>
                <div className="grid grid-cols-2 gap-1">
                  {weaponLinks.map((link) => (
                    <Link key={link.href} href={link.href} passHref>
                      <span
                        className={`relative flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                          isActive(link.href)
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : link.highlight
                              ? 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20'
                              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10'
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span className="text-base leading-none">{link.icon}</span>
                        <span className="truncate">{t(link.labelKey)}</span>
                        {link.highlight && !isActive(link.href) && (
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
                        )}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* 커뮤니티 */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-1">{t('nav.group_community')}</p>
                <div className="grid grid-cols-2 gap-1">
                  {communityLinks.map((link) => (
                    <Link key={link.href} href={link.href} passHref>
                      <span
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                          isActive(link.href)
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10'
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span className="text-base leading-none">{link.icon}</span>
                        <span className="truncate">{t(link.labelKey)}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* 훈련 도구 */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-1">{t('nav.training')}</p>
                <div className="grid grid-cols-3 gap-1">
                  {trainingLinks.map((link) => (
                    <Link key={link.href} href={link.href} passHref>
                      <span
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg text-xs cursor-pointer transition-all text-center ${
                          isActive(link.href)
                            ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-900/30 dark:text-blue-400'
                            : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10'
                        }`}
                      >
                        <span className="text-xl leading-none">{link.icon}</span>
                        <span>{t(link.labelKey)}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* 하단: 언어 + 테마 */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
                <div className="flex gap-1.5 flex-wrap">
                  {LANG_OPTIONS.map((option) => (
                    <button
                      key={option.code}
                      onClick={() => { switchLang(option.code); setMobileMenuOpen(false); }}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                        lang === option.code
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      {option.flag} {option.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { toggleTheme(); setMobileMenuOpen(false); }}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-base"
                  title={isDark ? '라이트 모드' : '다크 모드'}
                >
                  {isDark ? '☀️' : '🌙'}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 카카오페이 후원 팝업 */}
      {showQR && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => { if (!donating) setShowQR(false); }}
        >
          <div
            className="relative bg-gray-900 border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-4 shadow-2xl w-[280px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white text-sm transition-colors"
            >
              ✕
            </button>

            <p className="text-white font-semibold text-sm">☕ 카카오페이로 후원하기</p>

            {/* 전체 후원 횟수 */}
            {donationCount !== null && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
                <span className="text-yellow-400 text-xs font-bold">🏆 누적 후원</span>
                <span className="text-yellow-300 text-xs font-black">{donationCount}회</span>
              </div>
            )}

            {/* 모바일: 링크 버튼 / PC: QR 이미지 */}
            <div className="block sm:hidden w-full">
              <a
                href="https://qr.kakaopay.com/Ej80WO41U"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#FEE500] hover:bg-[#F0D800] text-[#3C1E1E] font-bold text-sm rounded-xl transition-colors"
              >
                카카오페이로 후원하기 →
              </a>
            </div>
            <div className="hidden sm:block">
              <Image
                src="/kakao-qr.png"
                alt="카카오페이 QR"
                width={180}
                height={180}
                className="rounded-xl"
              />
              <p className="text-gray-500 text-xs text-center mt-2">QR 코드를 스캔해 후원해주세요</p>
            </div>

            {/* 후원 완료 버튼 */}
            {thankMsg ? (
              <div className="w-full py-3 bg-green-500/20 border border-green-500/40 rounded-xl text-center">
                <p className="text-green-300 font-bold text-sm">{thankMsg}</p>
              </div>
            ) : (
              <button
                onClick={handleDonationComplete}
                disabled={donating}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {donating ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 처리 중...</>
                ) : (
                  '✅ 후원 완료'
                )}
              </button>
            )}

            {myDonations > 0 && (
              <p className="text-gray-600 text-[10px]">이 기기에서 총 {myDonations}회 후원</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
