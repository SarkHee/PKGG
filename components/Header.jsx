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
    <header className="main-header flex items-center justify-between px-4 py-2 bg-white shadow">
      <div className="flex items-center gap-6">
        <Link href="/" passHref>
          <span className="logo text-2xl font-bold cursor-pointer">PK.GG</span>
        </Link>
        <Link href="/clans" passHref>
          <span className="text-base font-semibold text-blue-700 hover:underline cursor-pointer">클랜 보기</span>
        </Link>
      </div>
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <select value={server} onChange={e => setServer(e.target.value)} className="border rounded px-2 py-1 text-sm">
          <option value="steam">Steam</option>
          <option value="kakao">Kakao</option>
        </select>
        <input
          type="text"
          placeholder="닉네임 검색"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        />
        <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">검색</button>
      </form>
    </header>
  );
}