// components/layout/Header.jsx

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useT } from '../../utils/i18n';
import { useAuth } from '../../utils/useAuth';

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

  // 초기 테마 읽기 + 후원 수 로드
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    setMyDonations(parseInt(localStorage.getItem('pkgg_my_donations') || '0', 10));
    fetch('/api/donations/count')
      .then((r) => r.json())
      .then((d) => setDonationCount(d.count ?? 0))
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
    { href: '/daily-goals',          labelKey: 'nav.daily_goals',          icon: '📅' },
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
                  <div className={`flex items-center gap-1.5 h-9 px-3 rounded-lg border ${
                    user.platform === 'kakao'
                      ? 'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700'
                      : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                  }`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      user.platform === 'kakao' ? 'bg-yellow-400' : 'bg-green-500'
                    }`} />
                    <span className={`text-xs font-semibold max-w-[100px] truncate ${
                      user.platform === 'kakao' ? 'text-yellow-700' : 'text-green-700'
                    }`}>
                      {user.pubgNickname || (user.platform === 'kakao' ? '카카오 유저' : 'Steam 유저')}
                    </span>
                    <span className={`text-[10px] font-medium ${
                      user.platform === 'kakao' ? 'text-yellow-500' : 'text-green-400'
                    }`}>
                      {user.platform === 'kakao' ? 'KA' : 'ST'}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-medium"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <a
                    href="/api/auth/steam-login"
                    className="h-9 flex items-center gap-1.5 px-3 rounded-lg bg-[#1b2838] hover:bg-[#2a475e] text-white text-xs font-semibold transition-colors border border-[#1b2838]"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.623 3.872 10.328 9.092 11.63L9.086 12H12v-1.5c0-.828.672-1.5 1.5-1.5S15 9.672 15 10.5V12h1.5c.828 0 1.5.672 1.5 1.5 0 .796-.622 1.45-1.406 1.496L18 24c3.534-1.257 6-4.649 6-8.5C24 10.745 18.627 0 12 0z"/>
                    </svg>
                    Steam
                  </a>
                  <a
                    href="/api/auth/kakao-login"
                    className="h-9 flex items-center gap-1.5 px-3 rounded-lg bg-[#FEE500] hover:bg-[#F0D800] text-[#3C1E1E] text-xs font-semibold transition-colors border border-[#FEE500]"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.707 1.566 5.09 3.938 6.548L5 21l4.188-2.188C10.065 19.258 11.012 19.4 12 19.4c5.523 0 10-3.478 10-7.8C22 6.477 17.523 3 12 3z"/>
                    </svg>
                    카카오
                  </a>
                </div>
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
              className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
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
