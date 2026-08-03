import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from "../../../components/layout/Header";
import { useT } from '../../../utils/i18n';

const CATEGORY_INFO = {
  strategy: { name: '전략 & 팁', icon: '🧠', color: 'blue', description: '게임 전략, 팁, 가이드를 공유하세요' },
  general: { name: '자유 게시판', icon: '💬', color: 'green', description: '자유롭게 이야기를 나누세요' },
  questions: { name: '질문 & 답변', icon: '❓', color: 'orange', description: '궁금한 점을 물어보고 답변해주세요' },
  recruitment: { name: '클랜 모집', icon: '👥', color: 'purple', description: '클랜원을 모집하거나 클랜을 찾아보세요' },
  party: { name: '파티 찾기', icon: '🎮', color: 'cyan', description: '함께 플레이할 파티원을 모집하거나 찾아보세요' },
};

const CAT_I18N_KEY = { strategy: 'strategy', general: 'general', questions: 'questions', recruitment: 'recruitment', party: 'party', settings: 'settings' };

function PostCard({ post }) {
  const router = useRouter();

  return (
    <div
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => router.push(`/forum/post/${post.id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {post.isPinned && <span className="text-red-500 text-sm">📌</span>}
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 transition-colors">
            {post.title}
          </h3>
        </div>
        <div className="text-xs text-gray-500 flex-shrink-0 ml-2">
          {new Date(post.createdAt).toLocaleDateString('ko-KR')}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>👤 {post.author}</span>
          <span>👁️ {post.views}</span>
          <span>💬 {post.replyCount || 0}</span>
          <span>👍 {post.likeCount || 0}</span>
        </div>
        {post.isLocked && <span className="text-red-500 text-sm">🔒</span>}
      </div>
    </div>
  );
}

export default function ForumCategory() {
  const router = useRouter();
  const { t } = useT();
  const { categoryId } = router.query;
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryInfo, setCategoryInfo] = useState(null);
  const catI18nKey = CAT_I18N_KEY[categoryId];
  const catName = catI18nKey ? t(`forum.cat.${catI18nKey}.name`) : categoryInfo?.name;
  const catDesc = catI18nKey ? t(`forum.cat.${catI18nKey}.desc`) : categoryInfo?.description;

  // 카테고리 정보 로드
  useEffect(() => {
    if (!categoryId) return;

    const loadCategoryInfo = async () => {
      try {
        const response = await fetch('/api/forum/categories');
        const data = await response.json();

        if (response.ok) {
          const category = data.find((cat) => cat.id === categoryId);
          if (category) {
            setCategoryInfo({
              name: category.name,
              icon: category.icon,
              color: category.color,
              description: category.description,
            });
          } else {
            // 폴백: 하드코딩된 정보 사용
            setCategoryInfo(CATEGORY_INFO[categoryId] || null);
          }
        } else {
          // API 실패 시 폴백
          setCategoryInfo(CATEGORY_INFO[categoryId] || null);
        }
      } catch (error) {
        console.error('Error loading category info:', error);
        // 오류 시 폴백
        setCategoryInfo(CATEGORY_INFO[categoryId] || null);
      }
    };

    loadCategoryInfo();
  }, [categoryId]);

  useEffect(() => {
    if (!categoryId) return;
    loadPosts();
  }, [categoryId, page, searchQuery]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category: categoryId,
        page: page.toString(),
        limit: '10',
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/forum/posts?${params}`);
      const data = await response.json();

      if (response.ok) {
        setPosts(data.posts);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadPosts();
  };

  if (!categoryInfo) {
    return <div>{t('forum.category_not_found')}</div>;
  }

  return (
    <>
      <Head>
        <title>{t('forum.category_page_title').replace('{n}', catName)}</title>
        <meta
          name="description"
          content={t('forum.category_meta_desc').replace('{n}', catName)}
        />
      </Head>

      <Header />

      <div className="container mx-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
        {/* 브레드크럼 */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link href="/forum" className="hover:text-blue-600">
              {t('forum.heading')}
            </Link>
            <span>›</span>
            <span className="text-gray-900 dark:text-gray-100">
              {catName}
            </span>
          </nav>
        </div>

        {/* 카테고리 헤더 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 bg-${categoryInfo.color}-500 text-white rounded-lg flex items-center justify-center text-xl`}
              >
                {categoryInfo.icon}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {catName}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {t('forum.category_desc_template').replace('{n}', catName)}
                </p>
              </div>
            </div>

            <Link href={`/forum/create?category=${categoryId}`}>
              <button className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors">
                {t('forum.write_post_new')}
              </button>
            </Link>
          </div>
        </div>

        {/* 검색 */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder={t('forum.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              {t('forum.search_button')}
            </button>
          </form>
        </div>

        {/* 게시글 목록 */}
        <div className="space-y-4 mb-8">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 animate-pulse"
                >
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                  <div className="flex justify-between">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length > 0 ? (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('forum.no_posts_cat')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('forum.no_posts_desc')}
              </p>
              <Link href={`/forum/create?category=${categoryId}`}>
                <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors">
                  {t('forum.write_post_short')}
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              {t('forum.prev')}
            </button>

            {Array.from(
              { length: Math.min(5, pagination.totalPages) },
              (_, i) => {
                const pageNum = Math.max(
                  1,
                  Math.min(pagination.totalPages, page - 2 + i)
                );
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-4 py-2 border rounded-lg ${
                      page === pageNum
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              }
            )}

            <button
              onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
              disabled={page === pagination.totalPages}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              {t('forum.next')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
