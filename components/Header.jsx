// components/Header.jsx

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Header() {
  const [nickname, setNickname] = useState('');
  const [server, setServer] = useState('steam');
  const router = useRouter();


  const handleSearch = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    // 1. 자동 저장(최신화) API 호출
    try {
      await fetch('/api/clan/update-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clanName: '', nickname })
      });
    } catch (err) {
      // 무시하고 계속 진행
    }
    // 2. 상세 페이지로 이동
    router.push(`/player/${server}/${encodeURIComponent(nickname)}`);
    setNickname('');
  };

  return (
    <>
    <header className="main-header bg-gray-900/80 backdrop-blur-md shadow-lg border-b border-gray-700/50 sticky top-0 z-50" style={{ width: '100%', minWidth: '100%' }}>
      <div className="w-full px-4 py-3" style={{ width: '100%' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" passHref>
              <span className="logo text-2xl font-bold cursor-pointer text-blue-600">PK.GG</span>
            </Link>
            <Link href="/clan-analytics" passHref>
              <span className="text-base font-semibold text-white hover:text-gray-200 cursor-pointer">클랜 분석</span>
            </Link>
            <Link href="/forum" passHref>
              <span className="text-base font-semibold text-white hover:text-gray-200 cursor-pointer flex items-center gap-1">
                💬 포럼
              </span>
            </Link>
            <Link href="/pubg-news" passHref>
              <span className="text-base font-semibold text-white hover:text-gray-200 cursor-pointer flex items-center gap-1">
                📢 배그공지사항
              </span>
            </Link>
          </div>
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <select 
              value={server} 
              onChange={e => setServer(e.target.value)} 
              className="border border-gray-600 rounded px-3 py-2 text-sm text-white bg-gray-800/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="steam">Steam</option>
              <option value="kakao">Kakao</option>
            </select>
            <input
              type="text"
              placeholder="닉네임 검색"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              className="border border-gray-600 rounded px-3 py-2 text-sm text-white bg-gray-800/80 backdrop-blur-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
            />
            <button 
              type="submit" 
              className="bg-blue-600/90 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors backdrop-blur-sm"
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