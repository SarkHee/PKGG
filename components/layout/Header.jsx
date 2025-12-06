// components/Header.jsx

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Header() {
  const [nickname, setNickname] = useState('');
  const [server, setServer] = useState('steam');
  const router = useRouter();

  const handleInquiryClick = (e) => {
    e.preventDefault();
    const emailSubject = 'PKGG 사이트 문의';
    const emailBody =
      '안녕하세요! PKGG 사이트 관련 문의드립니다.\n\n문의내용:\n';

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
  };

  return (
    <>
      <header
        className="main-header bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50"
        style={{ width: '100%', minWidth: '100%' }}
      >
        <div className="w-full px-4 py-3" style={{ width: '100%' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" passHref>
                <span className="logo text-2xl font-bold cursor-pointer text-blue-600">
                  PK.GG
                </span>
              </Link>
              <Link href="/clan-analytics" passHref>
                <span className="text-base font-semibold text-gray-700 hover:text-gray-900 cursor-pointer flex items-center gap-1">
                  📊 클랜 분석
                </span>
              </Link>
              <Link href="/forum" passHref>
                <span className="text-base font-semibold text-gray-700 hover:text-gray-900 cursor-pointer flex items-center gap-1">
                  💬 포럼
                </span>
              </Link>
              <Link href="/notices" passHref>
                <span className="text-base font-semibold text-gray-700 hover:text-gray-900 cursor-pointer flex items-center gap-1">
                  📋 공지사항
                </span>
              </Link>
              <Link href="/pubg-news" passHref>
                <span className="text-base font-semibold text-gray-700 hover:text-gray-900 cursor-pointer flex items-center gap-1">
                  📢 배그공지사항
                </span>
              </Link>
              <button
                onClick={handleInquiryClick}
                className="text-base font-semibold text-gray-700 hover:text-gray-900 cursor-pointer flex items-center gap-1 bg-transparent border-none"
              >
                📧 문의하기
              </button>
            </div>
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <select
                value={server}
                onChange={(e) => setServer(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="steam">Steam</option>
                <option value="kakao">Kakao</option>
              </select>
              <input
                type="text"
                placeholder="닉네임 검색"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 w-48"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                검색
              </button>
            </form>
          </div>
        </div>
      </header>
    </>
  );
}
