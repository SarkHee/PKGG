import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function SearchBar() {
  const [nickname, setNickname] = useState('');
  const router = useRouter();
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleSearch = () => {
    if (nickname.trim()) {
      // OP.GG와 동일하게 steam 기준 URL로 이동
      router.push(`/player/steam/${nickname.trim()}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        placeholder="플레이어 닉네임 입력"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button onClick={handleSearch}>
        검색
      </button>
    </div>
  );
}

