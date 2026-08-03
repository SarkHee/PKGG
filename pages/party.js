// pages/party.js — 파티 모집 게시판
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Header from '../components/layout/Header';
import { useT } from '../utils/i18n';

function parseParty(content) {
  try {
    const d = JSON.parse(content);
    if (d && d.__party) return d;
  } catch {}
  return null;
}

function timeAgo(dateStr, t) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t('party.time_now');
  if (m < 60) return t('party.time_min').replace('{n}', m);
  const h = Math.floor(m / 60);
  if (h < 24) return t('party.time_hour').replace('{n}', h);
  return t('party.time_day').replace('{n}', Math.floor(h / 24));
}

function PartyCard({ post }) {
  const router = useRouter();
  const { t } = useT();
  const MODE_LABELS = {
    squad: t('party.badge.mode_squad'),
    'squad-fpp': t('party.badge.mode_squad_fpp'),
    duo: t('party.badge.mode_duo'),
    'duo-fpp': t('party.badge.mode_duo_fpp'),
    solo: t('party.badge.mode_solo'),
  };
  const SERVER_STYLE = {
    steam: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    kakao: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  };
  const MIC_LABELS = {
    required: t('party.badge.mic_required'),
    preferred: t('party.badge.mic_preferred'),
    not_required: t('party.badge.mic_not_required'),
  };
  const PLAYTIME_LABELS = {
    morning: t('party.badge.playtime_morning'),
    afternoon: t('party.badge.playtime_afternoon'),
    evening: t('party.badge.playtime_evening'),
    midnight: t('party.badge.playtime_midnight'),
    anytime: t('party.badge.playtime_anytime'),
  };

  const p = parseParty(post.content);
  if (!p) return null;

  const slotsText = p.slotsNeeded > 0 ? t('party.slots_needed').replace('{n}', p.slotsNeeded) : t('party.slots_negotiable');
  const mmrText = (p.mmrMin || p.mmrMax)
    ? `MMR ${p.mmrMin || '0'}~${p.mmrMax ? p.mmrMax : t('party.mmr_unlimited')}`
    : null;

  return (
    <div
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-blue-500/40 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all cursor-pointer group"
      onClick={() => router.push(`/forum/post/${post.id}`)}
    >
      {/* 배지 + 시간 */}
      <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          {p.mode && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
              {MODE_LABELS[p.mode] || p.mode}
            </span>
          )}
          {p.server && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${SERVER_STYLE[p.server] || 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600'}`}>
              {p.server === 'steam' ? 'Steam' : 'Kakao'}
            </span>
          )}
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30">
            {slotsText}
          </span>
          {p.playtime && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
              {PLAYTIME_LABELS[p.playtime] || p.playtime}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-600 flex-shrink-0">{timeAgo(post.createdAt, t)}</span>
      </div>

      {/* 제목 */}
      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors line-clamp-1">
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
        <p className="text-xs text-gray-500 dark:text-gray-600 leading-relaxed line-clamp-2 mb-3 border-t border-gray-100 dark:border-gray-800 pt-3">
          {p.description}
        </p>
      )}

      {/* 하단 */}
      <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-600">
        <span>💬 {post.replyCount || 0}</span>
        <span>👁️ {post.views || 0}</span>
      </div>
    </div>
  );
}

export default function PartyPage() {
  const { t } = useT();
  const MODE_OPTIONS = [
    { value: 'all',       label: t('party.opt.mode_all') },
    { value: 'squad',     label: t('party.opt.mode_squad') },
    { value: 'squad-fpp', label: t('party.opt.mode_squad_fpp') },
    { value: 'duo',       label: t('party.opt.mode_duo') },
    { value: 'duo-fpp',   label: t('party.opt.mode_duo_fpp') },
    { value: 'solo',      label: t('party.opt.mode_solo') },
  ];
  const SERVER_OPTIONS = [
    { value: 'all',   label: t('party.opt.server_all') },
    { value: 'steam', label: t('party.opt.server_steam') },
    { value: 'kakao', label: t('party.opt.server_kakao') },
  ];
  const MIC_OPTIONS = [
    { value: 'all',          label: t('party.opt.mic_all') },
    { value: 'required',     label: t('party.opt.mic_required') },
    { value: 'preferred',    label: t('party.opt.mic_preferred') },
    { value: 'not_required', label: t('party.opt.mic_not_required') },
  ];

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
      setError(t('party.load_failed'));
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Head>
        <title>{t('party.title')}</title>
        <meta name="description" content={t('party.meta_desc')} />
      </Head>
      <Header />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('party.heading')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('party.subheading')}</p>
          </div>
          <Link href="/party/create" passHref>
            <span className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all cursor-pointer">
              {t('party.create_btn')}
            </span>
          </Link>
        </div>

        {/* 필터 바 */}
        <div className="flex flex-wrap gap-2 mb-6 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {MODE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={serverFilter}
            onChange={(e) => setServerFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {SERVER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={micFilter}
            onChange={(e) => setMicFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {MIC_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {(modeFilter !== 'all' || serverFilter !== 'all' || micFilter !== 'all') && (
            <button
              onClick={() => { setModeFilter('all'); setServerFilter('all'); setMicFilter('all'); }}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm rounded-xl transition-colors"
            >
              {t('party.filter_reset')}
            </button>
          )}
        </div>

        {/* 게시글 */}
        {loading ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-500">
            <div className="text-4xl mb-3 animate-pulse">🎮</div>
            <p>{t('party.loading')}</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-gray-500">
            <p>{error}</p>
            <button onClick={() => loadPosts(1)} className="mt-4 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 text-sm">{t('party.retry')}</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🎯</div>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {posts.length === 0
                ? t('party.empty_all')
                : t('party.empty_filtered')}
            </p>
            {posts.length === 0 && (
              <Link href="/party/create" passHref>
                <span className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer">
                  {t('party.create_first')}
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
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-sm disabled:opacity-40"
            >
              {t('party.prev')}
            </button>
            <span className="text-gray-500 dark:text-gray-400 text-sm">{page} / {pagination.totalPages}</span>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => { const p = page + 1; setPage(p); loadPosts(p); }}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-sm disabled:opacity-40"
            >
              {t('party.next')}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
