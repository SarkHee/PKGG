import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../components/layout/Header';

const CATEGORY_ICON = {
  strategy: '🧠', general: '💬', questions: '❓',
  recruitment: '👥', party: '🎮', settings: '⚙️',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

export default function MyPosts() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/mypage');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    setLoading(true);
    fetch(`/api/forum/my-posts?page=${page}&limit=20`)
      .then((r) => r.json())
      .then((d) => {
        setPosts(d.posts || []);
        setPagination(d.pagination || null);
      })
      .finally(() => setLoading(false));
  }, [status, page]);

  if (status === 'loading' || (status === 'authenticated' && loading && posts.length === 0)) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>내가 쓴 글 | PKGG</title>
      </Head>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* 브레드크럼 */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/mypage" className="hover:text-blue-600">마이페이지</Link>
            <span>›</span>
            <span className="text-gray-800 font-medium">내가 쓴 글</span>
          </nav>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">✏️ 내가 쓴 글</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {pagination ? `총 ${pagination.total}개의 글` : ''}
                </p>
              </div>
              <Link
                href="/forum/create"
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                + 새 글 작성
              </Link>
            </div>

            {posts.length === 0 && !loading ? (
              <div className="py-20 text-center">
                <div className="text-5xl mb-4">📝</div>
                <p className="text-gray-500 font-medium">아직 작성한 글이 없습니다.</p>
                <Link
                  href="/forum/create"
                  className="inline-block mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  첫 글 작성하기
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {posts.map((post) => (
                  <li key={post.id}>
                    <Link
                      href={`/forum/post/${post.id}`}
                      className="flex items-start gap-3 px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-xl mt-0.5 shrink-0">
                        {CATEGORY_ICON[post.categoryId] || '📄'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {post.category && (
                            <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                              {post.category.name}
                            </span>
                          )}
                          <span className="text-gray-900 font-medium text-sm leading-snug line-clamp-1">
                            {post.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>{timeAgo(post.createdAt)}</span>
                          <span>👁 {post.views}</span>
                          <span>💬 {post.replyCount}</span>
                          <span>❤️ {post.likes}</span>
                        </div>
                      </div>
                      <span className="text-gray-300 shrink-0">›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {/* 페이지네이션 */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-4 border-t border-gray-100">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  이전
                </button>
                <span className="text-sm text-gray-600">
                  {page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  다음
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
