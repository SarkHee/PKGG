// pages/settings-share.js — 인게임 세팅 공유 게시판
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Header from '../components/layout/Header';

const TYPE_OPTIONS = [
  { value: 'all',      label: '전체' },
  { value: 'full',     label: '풀세팅' },
  { value: 'graphics', label: '그래픽' },
  { value: 'mouse',    label: '마우스/감도' },
  { value: 'keybind',  label: '키바인딩' },
];

const TYPE_META = {
  full:     { label: '풀세팅',    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  graphics: { label: '그래픽',    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  mouse:    { label: '마우스/감도', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  keybind:  { label: '키바인딩',  color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
};

const PRESET_LABELS = {
  very_low: '매우 낮음', low: '낮음', medium: '중간', high: '높음', ultra: '울트라',
};

function parseSettings(content) {
  try {
    const d = JSON.parse(content);
    if (d && d.__settings) return d;
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

function SettingsCard({ post }) {
  const router = useRouter();
  const s = parseSettings(post.content);
  if (!s) return null;
  const meta = TYPE_META[s.type] || TYPE_META.full;

  return (
    <div
      className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-purple-500/40 hover:bg-gray-800/50 transition-all cursor-pointer group"
      onClick={() => router.push(`/forum/post/${post.id}`)}
    >
      {/* 배지 + 시간 */}
      <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${meta.color}`}>
            {meta.label}
          </span>
          {s.resolution && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
              {s.resolution}
            </span>
          )}
          {s.hz && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
              {s.hz}Hz
            </span>
          )}
          {s.graphicsPreset && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
              {PRESET_LABELS[s.graphicsPreset] || s.graphicsPreset}
            </span>
          )}
        </div>
        <span suppressHydrationWarning className="text-xs text-gray-600 flex-shrink-0">{timeAgo(post.createdAt)}</span>
      </div>

      {/* 제목 */}
      <h3 className="text-sm font-bold text-gray-200 mb-2 group-hover:text-purple-300 transition-colors line-clamp-1">
        {post.title}
      </h3>

      {/* 스탯 행 */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
        <span>👤 {post.author}</span>
        {s.dpi && <span>🖱️ DPI {s.dpi}</span>}
        {s.sensitivity && <span>감도 {s.sensitivity}</span>}
      </div>

      {/* 설명 미리보기 */}
      {s.description && (
        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 mb-3 border-t border-gray-800 pt-3">
          {s.description}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-700">
        <span>💬 {post.replyCount || 0}</span>
        <span>👁️ {post.views || 0}</span>
      </div>
    </div>
  );
}

export default function SettingsSharePage() {
  const [posts, setPosts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [page, setPage]         = useState(1);
  const [pagination, setPagination] = useState({});
  const [typeFilter, setTypeFilter] = useState('all');

  const loadPosts = async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/forum/posts?category=settings&page=${p}&limit=30`);
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

  const filtered = posts.filter((post) => {
    if (typeFilter === 'all') return parseSettings(post.content) !== null;
    const s = parseSettings(post.content);
    return s && s.type === typeFilter;
  });

  return (
    <div className="min-h-screen bg-gray-950">
      <Head>
        <title>인게임 세팅 공유 | PKGG</title>
        <meta name="description" content="PUBG 그래픽/마우스/키바인딩 세팅을 공유하고 참고하세요." />
      </Head>
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white">⚙️ 인게임 세팅 공유</h1>
            <p className="text-sm text-gray-400 mt-1">그래픽·마우스·키바인딩 세팅을 공유하고 참고하세요</p>
          </div>
          <Link href="/settings-share/create" passHref>
            <span className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap">
              + 세팅 공유
            </span>
          </Link>
        </div>

        {/* 타입 필터 */}
        <div className="flex gap-2 flex-wrap mb-6">
          {TYPE_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setTypeFilter(o.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                typeFilter === o.value
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="text-center py-16 text-gray-500">불러오는 중...</div>
        ) : error ? (
          <div className="text-center py-16 text-red-400">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">아직 공유된 세팅이 없습니다.</p>
            <Link href="/settings-share/create" passHref>
              <span className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl cursor-pointer transition-all">
                첫 세팅 공유하기
              </span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((post) => (
              <SettingsCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {/* 페이지네이션 */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => { setPage(p => p - 1); loadPosts(page - 1); }}
              disabled={page <= 1}
              className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl text-sm disabled:opacity-40"
            >
              ◀
            </button>
            <span className="px-4 py-2 text-gray-400 text-sm">{page} / {pagination.totalPages}</span>
            <button
              onClick={() => { setPage(p => p + 1); loadPosts(page + 1); }}
              disabled={page >= pagination.totalPages}
              className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl text-sm disabled:opacity-40"
            >
              ▶
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
