import { useState } from 'react';
import { useRouter } from 'next/router';

export default function SearchBar() {
  const [nickname, setNickname] = useState('');
  const router = useRouter();

  const handleSearch = () => {
    if (nickname.trim()) {
      router.push(`/player/${nickname}`);
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <input
        type="text"
        placeholder="닉네임 입력"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        style={{ padding: '8px', width: '200px', marginRight: '8px' }}
      />
      <button onClick={handleSearch} style={{ padding: '8px 16px' }}>
        검색
      </button>
    </div>
  );
}

