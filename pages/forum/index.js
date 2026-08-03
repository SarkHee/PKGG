import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from "../../components/layout/Header";
import { useT } from '../../utils/i18n';

const FORUM_CATEGORIES = [
  {
    id: 'strategy',
    name: '전략 & 팁',
    description: '게임 전략, 팁, 가이드를 공유하세요',
    icon: '🧠',
    color: 'blue',
  },
  {
    id: 'general',
    name: '자유 게시판',
    description: '자유롭게 이야기를 나누세요',
    icon: '💬',
    color: 'green',
  },
  {
    id: 'questions',
    name: '질문 & 답변',
    description: '궁금한 점을 물어보고 답변해주세요',
    icon: '❓',
    color: 'orange',
  },
  {
    id: 'recruitment',
    name: '클랜 모집',
    description: '클랜원을 모집하거나 클랜을 찾아보세요',
    icon: '👥',
    color: 'purple',
  },
];

const CAT_I18N_KEY = { strategy: 'strategy', general: 'general', questions: 'questions', recruitment: 'recruitment', party: 'party', settings: 'settings' };

function ForumCategoryCard({ category, postCount = 0, latestPost = null }) {
  const router = useRouter();
  const { t } = useT();
  const catKey = CAT_I18N_KEY[category?.id];
  const catName = catKey ? t(`forum.cat.${catKey}.name`) : category.name;
  const catDesc = catKey ? t(`forum.cat.${catKey}.desc`) : category.description;

  const colorClasses = {
    '#3B82F6':
      'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 bg-blue-500',
    '#10B981':
      'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 bg-green-500',
    '#F59E0B':
      'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/30 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200 bg-orange-500',
    '#8B5CF6':
      'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200 bg-purple-500',
    '#EF4444': 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 bg-red-500',
    '#06B6D4':
      'from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-900/30 border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-200 bg-cyan-500',
    // 기본 색상들 (하위 호환)
    blue: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 bg-blue-500',
    green:
      'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 bg-green-500',
    orange:
      'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/30 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200 bg-orange-500',
    purple:
      'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200 bg-purple-500',
    red: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 bg-red-500',
    cyan: 'from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-900/30 border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-200 bg-cyan-500',
    amber:
      'from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 bg-amber-500',
  };

  // 안전한 색상 클래스 가져오기
  const getColorClasses = (color) => {
    return colorClasses[color] || colorClasses['blue']; // 기본값은 파란색
  };

  const categoryColorClasses = getColorClasses(category?.color);

  return (
    <div
      className={`bg-gradient-to-r ${categoryColorClasses} border rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group`}
      onClick={() => {
        // 문의하기 카테고리는 최상위 문의하기 페이지로 이동
        if (category.id === 'inquiry') {
          router.push('/inquiry');
        } else {
          router.push(`/forum/category/${category.id}`);
        }
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 ${categoryColorClasses.split(' ')[4]} text-white rounded-lg flex items-center justify-center text-xl group-hover:scale-105 transition-transform`}
          >
            {category.icon}
          </div>
          <div>
            <h3 className="text-lg font-bold mb-1">{catName}</h3>
            <p className="text-sm opacity-75">{catDesc}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">{t('forum.post_count').replace('{n}', postCount)}</div>
          {latestPost && (
            <div className="text-xs opacity-75 mt-1">
              {t('forum.latest_prefix')} {latestPost.title.slice(0, 20)}...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecentPostCard({ post }) {
  const router = useRouter();

  return (
    <div
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => router.push(`/forum/post/${post.id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 transition-colors">
          {post.title}
        </h4>
        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded flex-shrink-0 ml-2">
          {post.category?.name || post.category}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span>👤 {post.author}</span>
          <span>💬 {post.replyCount || post.replies || 0}</span>
          <span>👍 {post.likeCount || post.likes || 0}</span>
        </div>
        <span>{new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
      </div>
    </div>
  );
}

export default function ForumIndex() {
  const { t } = useT();
  const [categories, setCategories] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadCategories();
    loadRecentPosts();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/forum/categories');
      if (response.ok) {
        const data = await response.json();
        if (data.length === 0) {
          // 카테고리가 없으면 초기화 시도
          console.log('카테고리가 없습니다. 자동 초기화를 시도합니다...');
          const initResponse = await fetch('/api/forum/init', {
            method: 'POST',
          });
          if (initResponse.ok) {
            // 초기화 후 다시 조회
            const retryResponse = await fetch('/api/forum/categories');
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              setCategories(retryData);
            }
          } else {
            // 초기화 실패 시 기본 카테고리 사용
            setCategories(
              FORUM_CATEGORIES.map((cat) => ({ ...cat, postCount: 0 }))
            );
          }
        } else {
          setCategories(data);
        }
      } else {
        // 응답이 실패한 경우 기본 카테고리 사용
        setCategories(
          FORUM_CATEGORIES.map((cat) => ({ ...cat, postCount: 0 }))
        );
      }
    } catch (error) {
      console.error('카테고리 로딩 오류:', error);
      // 오류 시 기본 카테고리 사용
      setCategories(FORUM_CATEGORIES.map((cat) => ({ ...cat, postCount: 0 })));
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadRecentPosts = async () => {
    try {
      const response = await fetch('/api/forum/posts?limit=6');
      if (response.ok) {
        const data = await response.json();
        setRecentPosts(data.posts || []);
      } else {
        // 실패 시 빈 배열
        setRecentPosts([]);
      }
    } catch (error) {
      console.error('최근 게시글 로딩 오류:', error);
      setRecentPosts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>{t('forum.title')}</title>
        <meta
          name="description"
          content={t('forum.meta_description')}
        />
      </Head>

      <Header />

      <div className="container mx-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
        {/* 헤더 섹션 */}
        <div className="text-center mb-12">
          <div className="inline-block p-3 bg-blue-500 text-white rounded-full mb-4">
            <span className="text-2xl">🏆</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {t('forum.heading')}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t('forum.intro')}
          </p>
        </div>

        {/* 새 글 작성 버튼 */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => router.push('/forum/create')}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            {t('forum.write_post')}
          </button>
        </div>

        {/* 카테고리 섹션 */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
            {t('forum.categories_heading')}
          </h2>
          {categoriesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                    <div className="text-right">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((category) => (
                <ForumCategoryCard
                  key={category.id}
                  category={category}
                  postCount={category.postCount || 0}
                />
              ))}
            </div>
          )}
        </div>

        {/* 최근 게시글 섹션 */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
            {t('forum.recent_posts_heading')}
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 animate-pulse"
                >
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                  <div className="flex justify-between">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentPosts.map((post) => (
                <RecentPostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('forum.no_posts_title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('forum.no_posts_desc')}
              </p>
              <button
                onClick={() => router.push('/forum/create')}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                {t('forum.write_post_short')}
              </button>
            </div>
          )}
        </div>

        {/* 포럼 규칙 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            {t('forum.rules_heading')}
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-green-600 mb-2">{t('forum.rules_recommend')}</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• {t('forum.rule_r1')}</li>
                <li>• {t('forum.rule_r2')}</li>
                <li>• {t('forum.rule_r3')}</li>
                <li>• {t('forum.rule_r4')}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-red-600 mb-2">{t('forum.rules_forbid')}</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• {t('forum.rule_f1')}</li>
                <li>• {t('forum.rule_f2')}</li>
                <li>• {t('forum.rule_f3')}</li>
                <li>• {t('forum.rule_f4')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
