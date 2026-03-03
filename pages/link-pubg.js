// pages/link-pubg.js — Steam 로그인 후 PUBG 닉네임 연결
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';

export default function LinkPubg() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/link-pubg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '연결 실패');
      } else {
        setResult(data);
        setTimeout(() => router.push('/'), 2000);
      }
    } catch {
      setError('서버 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>PUBG 계정 연결 | PK.GG</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* 로고 */}
          <div className="text-center mb-8">
            <Image src="/logo.png" alt="PK.GG" width={120} height={68} className="mx-auto mb-4" />
            <h1 className="text-2xl font-black text-white">PUBG 계정 연결</h1>
            <p className="text-gray-400 text-sm mt-2">Steam 로그인이 완료되었습니다.<br/>PUBG 닉네임을 입력해 클랜 데이터를 연결하세요.</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            {result ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✅</div>
                <div className="text-green-400 font-bold text-lg">{result.pubgNickname}</div>
                <div className="text-gray-400 text-sm mt-2">
                  {result.clanId ? '클랜 연결 완료!' : '클랜 정보를 찾지 못했습니다 (닉네임은 저장됨)'}
                </div>
                <div className="text-gray-600 text-xs mt-2">잠시 후 메인으로 이동합니다...</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                    PUBG 닉네임 (Steam)
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="닉네임 입력..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    autoFocus
                    disabled={loading}
                  />
                  {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading || !nickname.trim()}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-xl transition-colors text-sm"
                >
                  {loading ? '확인 중...' : '연결하기'}
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="w-full py-2.5 bg-transparent border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 font-medium rounded-xl transition-colors text-sm"
                >
                  나중에 연결하기
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-gray-600 mt-4">
            닉네임은 PUBG API로 검증되며, 클랜 정보를 찾지 못해도 저장됩니다.
          </p>
        </div>
      </div>
    </>
  );
}
