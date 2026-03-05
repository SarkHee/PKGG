// pages/party.js — 파티 모집 게시판
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Header from '../components/layout/Header';

const MODE_OPTIONS = [
  { value: 'all',       label: '전체 모드' },
  { value: 'squad',     label: '스쿼드' },
  { value: 'squad-fpp', label: '스쿼드 FPP' },
  { value: 'duo',       label: '듀오' },
  { value: 'duo-fpp',   label: '듀오 FPP' },
  { value: 'solo',      label: '솔로' },
];

const SERVER_OPTIONS = [
  { value: 'all',   label: '전체 서버' },
  { value: 'steam', label: 'Steam' },
  { value: 'kakao', label: 'Kakao' },
];

const MIC_OPTIONS = [
  { value: 'all',         label: '마이크 무관' },
  { value: 'required',    label: '마이크 필수' },
  { value: 'preferred',   label: '선호' },
  { value: 'not_required',label: '불필요' },
];

const MODE_LABELS = {
  squad:     '🏆 스쿼드',
  'squad-fpp':'🏆 스쿼드FPP',
  duo:       '👥 듀오',
  'duo-fpp': '👥 듀오FPP',
  solo:      '🎯 솔로',
};

const SERVER_STYLE = {
  steam: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  kakao: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

const MIC_LABELS = {
  required:    '🎤 마이크 필수',
  preferred:   '🎤 마이크 선호',
  not_required:'🔇 불필요',
};

const PLAYTIME_LABELS = {
  morning:   '☀️ 오전',
  afternoon: '🌤️ 오후',
  evening:   '🌙 저녁',
  midnight:  '🌃 새벽',
  anytime:   '⏰ 언제든',
};

function parseParty(content) {
  try {
    const d = JSON.parse(content);
    if (d && d.__party) return d;
  } catch {}
  return null;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function PartyCard({ post }) {
  const router = useRouter();
  const p = parseParty(post.content);
  if (!p) return null;

  const slotsText = p.slotsNeeded > 0 ? `${p.slotsNeeded}자리 모집` : '인원 협의';
  const mmrText = (p.mmrMin || p.mmrMax)
    ? `MMR ${p.mmrMin || '0'}~${p.mmrMax ? p.mmrMax : '무제한'}`
    : null;

  return (
    <div
      className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-blue-500/40 hover:bg-gray-800/50 transition-all cursor-pointer group"
      onClick={() => router.push(`/forum/post/${post.id}`)}
    >
      {/* 배지 + 시간 */}
      <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          {p.mode && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30">
              {MODE_LABELS[p.mode] || p.mode}
            </span>
          )}
          {p.server && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${SERVER_STYLE[p.server] || 'bg-gray-700 text-gray-400 border-gray-600'}`}>
              {p.server === 'steam' ? 'Steam' : 'Kakao'}
            </span>
          )}
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
            {slotsText}
          </span>
          {p.playtime && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
              {PLAYTIME_LABELS[p.playtime] || p.playtime}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-600 flex-shrink-0">{timeAgo(post.createdAt)}</span>
      </div>

      {/* 제목 */}
      <h3 className="text-sm font-bold text-gray-200 mb-2 group-hover:text-blue-300 transition-colors line-clamp-1">
        {post.title}
      </h3>

      {/* 메타 정보 */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
        <span>👤 {post.author}</span>
        {p.mic && <span>{MIC_LABELS[p.mic] || p.mic}</span>}
        {mmrText && <span>📊 {mmrText}</span>}
      </div>

      {/* 설명 */}
      {p.description && (
        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 mb-3 border-t border-gray-800 pt-3">
          {p.description}
        </p>
      )}

      {/* 하단 */}
      <div className="flex items-center gap-3 text-xs text-gray-700">
        <span>💬 {post.replyCount || 0}</span>
        <span>👁️ {post.views || 0}</span>
      </div>
    </div>
  );
}

export default function PartyPage() {
  const [posts, setPosts]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [page, setPage]             = useState(1);
  const [pagination, setPagination] = useState({});
  const [modeFilter, setModeFilter]     = useState('all');
  const [serverFilter, setServerFilter] = useState('all');
  const [micFilter, setMicFilter]       = useState('all');

  const loadPosts = async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/forum/posts?category=party&page=${p}&limit=30`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPosts(data.posts || []);
      setPagination(data.pagination || {});
    } catch {
      setError('게시글을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPosts(1); }, []);

  // 클라이언트 필터링
  const filtered = posts.filter((post) => {
    const p = parseParty(post.content);
    if (!p) return false;
    if (modeFilter   !== 'all' && p.mode   !== modeFilter)   return false;
    if (serverFilter !== 'all' && p.server !== serverFilter) return false;
    if (micFilter    !== 'all' && p.mic    !== micFilter)    return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-950">
      <Head>
        <title>파티 찾기 | PKGG</title>
        <meta name="description" content="PUBG 함께 게임할 파티원을 모집하거나 찾아보세요." />
      </Head>
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white">🎮 파티 찾기</h1>
            <p className="text-sm text-gray-400 mt-1">함께 플레이할 파티원을 모집하거나 참여하세요</p>
          </div>
          <Link href="/party/create" passHref>
            <span className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all cursor-pointer">
              + 모집글 작성
            </span>
          </Link>
        </div>

        {/* 필터 바 */}
        <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-900 border border-gray-800 rounded-2xl">
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {MODE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={serverFilter}
            onChange={(e) => setServerFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {SERVER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={micFilter}
            onChange={(e) => setMicFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {MIC_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {(modeFilter !== 'all' || serverFilter !== 'all' || micFilter !== 'all') && (
            <button
              onClick={() => { setModeFilter('all'); setServerFilter('all'); setMicFilter('all'); }}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-500 hover:text-gray-300 text-sm rounded-xl transition-colors"
            >
              ✕ 초기화
            </button>
          )}
        </div>

        {/* 게시글 */}
        {loading ? (
          <div className="text-center py-16 text-gray-500">
            <div className="text-4xl mb-3 animate-pulse">🎮</div>
            <p>불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-gray-500">
            <p>{error}</p>
            <button onClick={() => loadPosts(1)} className="mt-4 text-blue-400 hover:text-blue-300 text-sm">다시 시도</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🎯</div>
            <p className="text-gray-400 mb-6">
              {posts.length === 0
                ? '아직 모집글이 없습니다. 첫 번째로 파티를 모집해보세요!'
                : '해당 조건의 모집글이 없습니다. 필터를 변경해보세요.'}
            </p>
            {posts.length === 0 && (
              <Link href="/party/create" passHref>
                <span className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer">
                  모집글 작성하기
                </span>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((post) => (
              <PartyCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {/* 페이지네이션 */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-8">
            <button
              disabled={page <= 1}
              onClick={() => { const p = page - 1; setPage(p); loadPosts(p); }}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 text-sm disabled:opacity-40"
            >
              이전
            </button>
            <span className="text-gray-400 text-sm">{page} / {pagination.totalPages}</span>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => { const p = page + 1; setPage(p); loadPosts(p); }}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 text-sm disabled:opacity-40"
            >
              다음
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
