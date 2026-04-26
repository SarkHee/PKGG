// components/layout/Header.jsx

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
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
          hasActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`}
      >
        {label}
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-[999] min-w-[160px]">
          {links.map((link) => (
            <Link key={link.href} href={link.href} passHref>
              <span
                onClick={() => setOpenMenu(null)}
                className={`relative flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                  isActive(link.href) ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
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
  const router = useRouter();
  const { lang, t, switchLang } = useT();
  const { user, logout } = useAuth() || {};

  // 초기 테마 읽기
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

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

      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
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
                      ? 'bg-yellow-50 border-yellow-300'
                      : 'bg-green-50 border-green-200'
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
                    className="h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-600 hover:bg-gray-100 transition-all font-medium"
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

              {/* 다크/라이트 테마 토글 */}
              <button
                onClick={toggleTheme}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all"
                title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
              >
                {isDark ? '☀️' : '🌙'}
              </button>

              {/* 언어 드롭다운 */}
              <div className="relative">
                <button
                  onClick={() => setLangMenuOpen(!langMenuOpen)}
                  onBlur={() => setTimeout(() => setLangMenuOpen(false), 150)}
                  className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 hover:bg-gray-100 transition-all font-medium"
                >
                  <span>{currentLang.flag}</span>
                  <span>{currentLang.label}</span>
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {langMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-[999] min-w-[130px]">
                    {LANG_OPTIONS.map((option) => (
                      <button
                        key={option.code}
                        onClick={() => { switchLang(option.code); setLangMenuOpen(false); }}
                        className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left ${
                          lang === option.code
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'text-gray-700 hover:bg-gray-50'
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
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
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
          <div className="md:hidden border-t border-gray-100 bg-white">
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
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                          isActive(link.href) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
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
                          isActive(link.href) ? 'bg-blue-50 text-blue-700' : link.highlight ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-600 hover:bg-gray-100'
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
                          isActive(link.href) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
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
                          isActive(link.href) ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-500 hover:bg-gray-100'
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
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                <div className="flex gap-1.5 flex-wrap">
                  {LANG_OPTIONS.map((option) => (
                    <button
                      key={option.code}
                      onClick={() => { switchLang(option.code); setMobileMenuOpen(false); }}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                        lang === option.code
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {option.flag} {option.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { toggleTheme(); setMobileMenuOpen(false); }}
                  className="p-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all text-base"
                  title={isDark ? '라이트 모드' : '다크 모드'}
                >
                  {isDark ? '☀️' : '🌙'}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
