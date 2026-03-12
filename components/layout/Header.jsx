// components/layout/Header.jsx

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useT } from '../../utils/i18n';
import { useAuth } from '../../utils/useAuth';

const LANG_OPTIONS = [
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

export default function Header() {
  const [mobileMenuOpen,  setMobileMenuOpen]  = useState(false);
  const [langMenuOpen,    setLangMenuOpen]    = useState(false);
  const [trainMenuOpen,   setTrainMenuOpen]   = useState(false);
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

  const navLinks = [
    { href: '/compare',          labelKey: 'nav.compare',          icon: '⚔️' },
    { href: '/clans',            labelKey: 'nav.clans',            icon: '🏆' },
    { href: '/clan-analytics',   labelKey: 'nav.clan_analytics',   icon: '📊' },
    { href: '/weapon-test',      labelKey: 'nav.weapon_test',      icon: '🔫', highlight: true },
    { href: '/weapon-damage',    labelKey: 'nav.weapon_damage',    icon: '💥' },
    { href: '/playstyle-matchup',labelKey: 'nav.playstyle_matchup',icon: '🗺️' },
    { href: '/forum',            labelKey: 'nav.forum',            icon: '💬' },
    { href: '/notices',          labelKey: 'nav.notices',          icon: '📢' },
    { href: '/pubg-news',        labelKey: 'nav.news',             icon: '📰' },
  ];

  const trainingLinks = [
    { href: '/sensitivity',           labelKey: 'nav.sensitivity',          icon: '🎯' },
    { href: '/sensitivity-analyzer',  labelKey: 'nav.sensitivity_analyzer', icon: '📹' },
    { href: '/aim-trainer',           labelKey: 'nav.aim_trainer',          icon: '⚡' },
    { href: '/recoil-pattern',        labelKey: 'nav.recoil_pattern',       icon: '🔫' },
    { href: '/pubg-survivors',        labelKey: 'nav.pubg_survivors',       icon: '🎮' },
    // { href: '/peek-trainer',   labelKey: 'nav.peek_trainer',   icon: '👁️' },  // WIP
    // { href: '/battle-sim',     labelKey: 'nav.battle_sim',     icon: '⚔️' },  // WIP
  ];

  const currentLang = LANG_OPTIONS.find((l) => l.code === lang) || LANG_OPTIONS[0];

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

              {/* 데스크탑 네비게이션 */}
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} passHref>
                    <span className={`relative flex items-center px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                      isActive(link.href)
                        ? 'bg-blue-50 text-blue-700'
                        : link.highlight
                        ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}>
                      {t(link.labelKey)}
                      {link.highlight && !isActive(link.href) && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                      )}
                    </span>
                  </Link>
                ))}

                {/* 훈련 도구 드롭다운 */}
                <div className="relative">
                  <button
                    onClick={() => setTrainMenuOpen((v) => !v)}
                    onBlur={() => setTimeout(() => setTrainMenuOpen(false), 150)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                      trainingLinks.some((l) => isActive(l.href))
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {t('nav.training')}
                    <svg className={`w-3 h-3 transition-transform ${trainMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {trainMenuOpen && (
                    <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-[999] min-w-[160px]">
                      {trainingLinks.map((link) => (
                        <Link key={link.href} href={link.href} passHref>
                          <span
                            onClick={() => setTrainMenuOpen(false)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                              isActive(link.href)
                                ? 'bg-blue-50 text-blue-700 font-semibold'
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span>{link.icon}</span>
                            {t(link.labelKey)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </nav>
            </div>

            {/* 오른쪽: 언어 + 로그인 */}
            <div className="hidden md:flex items-center gap-2 flex-shrink-0">
              {/* Steam 로그인 / 유저 정보 */}
              {user === undefined ? null : user ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-green-50 border border-green-200">
                    <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-green-700 max-w-[100px] truncate">
                      {user.pubgNickname || 'Steam 유저'}
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
                <a
                  href="/api/auth/steam-login"
                  className="h-9 flex items-center gap-2 px-3 rounded-lg bg-[#1b2838] hover:bg-[#2a475e] text-white text-xs font-semibold transition-colors border border-[#1b2838]"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.623 3.872 10.328 9.092 11.63L9.086 12H12v-1.5c0-.828.672-1.5 1.5-1.5S15 9.672 15 10.5V12h1.5c.828 0 1.5.672 1.5 1.5 0 .796-.622 1.45-1.406 1.496L18 24c3.534-1.257 6-4.649 6-8.5C24 10.745 18.627 0 12 0z"/>
                  </svg>
                  Steam 로그인
                </a>
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
            {/* 빠른 닉네임 검색 */}
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

            <div className="px-4 pb-3 space-y-4">
              {/* 분석 도구 */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-1">분석</p>
                <div className="grid grid-cols-2 gap-1">
                  {navLinks.slice(0, 6).map((link) => (
                    <Link key={link.href} href={link.href} passHref>
                      <span
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                          isActive(link.href) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
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
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-1">커뮤니티</p>
                <div className="grid grid-cols-2 gap-1">
                  {navLinks.slice(6).map((link) => (
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
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-1">훈련</p>
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
