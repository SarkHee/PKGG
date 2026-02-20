// components/Header.jsx

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Header() {
  const [nickname, setNickname] = useState('');
  const [server, setServer] = useState('steam');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const handleInquiryClick = (e) => {
    e.preventDefault();
    const emailSubject = 'PKGG 사이트 문의';
    const emailBody = '안녕하세요! PKGG 사이트 관련 문의드립니다.\n\n문의내용:\n';
    const mailtoLink = `mailto:sssyck123@naver.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoLink;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    try {
      await fetch('/api/clan/update-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clanName: '', nickname }),
      });
    } catch (err) {
      // 무시하고 계속 진행
    }
    router.push(`/player/${server}/${encodeURIComponent(nickname)}`);
    setNickname('');
    setMobileMenuOpen(false);
  };

  const isActive = (path) => router.pathname === path || router.pathname.startsWith(path + '/');

  const navLinks = [
    { href: '/clan-analytics', label: '클랜 분석', icon: '📊' },
    { href: '/weapon-test', label: '무기성향 테스트', icon: '🔫', highlight: true },
    { href: '/forum', label: '포럼', icon: '💬' },
    { href: '/notices', label: '공지사항', icon: '📋' },
    { href: '/pubg-news', label: '배그뉴스', icon: '📢' },
  ];

  return (
    <>
      {/* 상단 파란 강조선 */}
      <div className="h-0.5 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 w-full" />

      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">

            {/* 로고 + 네비게이션 */}
            <div className="flex items-center gap-1">
              <Link href="/" passHref>
                <span className="text-xl font-black text-blue-600 cursor-pointer mr-5 tracking-tight hover:text-blue-700 transition-colors">
                  PK.GG
                </span>
              </Link>

              {/* 데스크탑 네비게이션 */}
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} passHref>
                    <span className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                      isActive(link.href)
                        ? 'bg-blue-50 text-blue-700'
                        : link.highlight
                        ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}>
                      <span className="text-base leading-none">{link.icon}</span>
                      {link.label}
                      {link.highlight && !isActive(link.href) && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                      )}
                    </span>
                  </Link>
                ))}
                <button
                  onClick={handleInquiryClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all bg-transparent border-none cursor-pointer"
                >
                  <span className="text-base leading-none">📧</span>
                  문의
                </button>
              </nav>
            </div>

            {/* 검색 폼 */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2">
              <select
                value={server}
                onChange={(e) => setServer(e.target.value)}
                className="h-9 border border-gray-200 rounded-lg px-2 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
              >
                <option value="steam">Steam</option>
                <option value="kakao">Kakao</option>
              </select>
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="닉네임 검색..."
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="h-9 border border-gray-200 rounded-l-lg pl-3 pr-2 text-sm text-gray-800 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all w-44"
                />
                <button
                  type="submit"
                  className="h-9 bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-r-lg text-sm font-semibold transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  검색
                </button>
              </div>
            </form>

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
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} passHref>
                <span
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                    isActive(link.href) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.icon} {link.label}
                </span>
              </Link>
            ))}
            <div className="pt-2 border-t border-gray-100">
              <form onSubmit={handleSearch} className="flex gap-2">
                <select
                  value={server}
                  onChange={(e) => setServer(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-2 text-sm bg-gray-50 flex-shrink-0"
                >
                  <option value="steam">Steam</option>
                  <option value="kakao">Kakao</option>
                </select>
                <input
                  type="text"
                  placeholder="닉네임 검색..."
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-l-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-r-lg text-sm font-semibold">
                  검색
                </button>
              </form>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
