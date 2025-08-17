import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../../components/Header';

const FORUM_CATEGORIES = [
  {
    id: 'strategy',
    name: '전략 & 팁',
    description: '게임 전략, 팁, 가이드를 공유하세요',
    icon: '🧠',
    color: 'blue'
  },
  {
    id: 'general',
    name: '자유 게시판',
    description: '자유롭게 이야기를 나누세요',
    icon: '💬',
    color: 'green'
  },
  {
    id: 'questions',
    name: '질문 & 답변',
    description: '궁금한 점을 물어보고 답변해주세요',
    icon: '❓',
    color: 'orange'
  },
  {
    id: 'clan',
    name: '클랜 모집',
    description: '클랜원을 모집하거나 클랜을 찾아보세요',
    icon: '👥',
    color: 'purple'
  },
  {
    id: 'showcase',
    name: '플레이 영상',
    description: '멋진 플레이 영상을 공유하세요',
    icon: '🎬',
    color: 'red'
  }
];

function ForumCategoryCard({ category, postCount = 0, latestPost = null }) {
  const router = useRouter();
  
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 border-blue-200 text-blue-800 bg-blue-500',
    green: 'from-green-50 to-green-100 border-green-200 text-green-800 bg-green-500',
    orange: 'from-orange-50 to-orange-100 border-orange-200 text-orange-800 bg-orange-500',
    purple: 'from-purple-50 to-purple-100 border-purple-200 text-purple-800 bg-purple-500',
    red: 'from-red-50 to-red-100 border-red-200 text-red-800 bg-red-500'
  };

  return (
    <div 
      className={`bg-gradient-to-r ${colorClasses[category.color]} border rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group`}
      onClick={() => router.push(`/forum/category/${category.id}`)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 ${colorClasses[category.color].split(' ')[4]} text-white rounded-lg flex items-center justify-center text-xl group-hover:scale-105 transition-transform`}>
            {category.icon}
          </div>
          <div>
            <h3 className="text-lg font-bold mb-1">{category.name}</h3>
            <p className="text-sm opacity-75">{category.description}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">게시글 {postCount}개</div>
          {latestPost && (
            <div className="text-xs opacity-75 mt-1">
              최근: {latestPost.title.slice(0, 20)}...
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
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 transition-colors">
          {post.title}
        </h4>
        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          {post.category?.name || post.category}
        </span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        {post.preview}...
      </p>
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
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // 임시 데이터로 빠르게 로딩
    setTimeout(() => {
      setRecentPosts([
        {
          id: 1,
          title: "초보자를 위한 PUBG 생존 가이드",
          preview: "PUBG를 처음 시작하는 분들을 위한 기본적인 생존 팁들을 정리해봤습니다",
          category: { name: "전략 & 팁" },
          author: "PUBG마스터",
          replyCount: 15,
          likeCount: 42,
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          title: "솔로 랭크 올리는 법",
          preview: "솔로 플레이어들을 위한 효과적인 랭크 상승 전략을 공유합니다",
          category: { name: "전략 & 팁" },
          author: "솔로킹",
          replyCount: 8,
          likeCount: 28,
          createdAt: new Date().toISOString()
        },
        {
          id: 3,
          title: "클랜원 모집합니다! (Lv.10+ 환영)",
          preview: "활발한 클랜에서 함께 플레이할 멤버를 모집합니다",
          category: { name: "클랜 모집" },
          author: "클랜리더123",
          replyCount: 5,
          likeCount: 12,
          createdAt: new Date().toISOString()
        }
      ]);
      setLoading(false);
    }, 500);
  }, []);

  return (
    <>
      <Head>
        <title>커뮤니티 포럼 | PK.GG</title>
        <meta name="description" content="PUBG 플레이어들의 커뮤니티 포럼 - 전략, 팁, 질문을 공유하세요" />
      </Head>

      <Header />
      
      <div className="container mx-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
        {/* 헤더 섹션 */}
        <div className="text-center mb-12">
          <div className="inline-block p-3 bg-blue-500 text-white rounded-full mb-4">
            <span className="text-2xl">🏆</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            커뮤니티 포럼
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            PUBG 플레이어들과 전략을 공유하고, 팁을 배우며, 클랜원을 모집해보세요!
          </p>
        </div>

        {/* 새 글 작성 버튼 */}
        <div className="flex justify-center mb-8">
          <button 
            onClick={() => router.push('/forum/create')}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            ✏️ 새 글 작성하기
          </button>
        </div>

        {/* 카테고리 섹션 */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
            📂 카테고리
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FORUM_CATEGORIES.map(category => (
              <ForumCategoryCard 
                key={category.id} 
                category={category} 
                postCount={Math.floor(Math.random() * 50) + 10}
              />
            ))}
          </div>
        </div>

        {/* 최근 게시글 섹션 */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
            🔥 최근 인기 게시글
          </h2>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                  <div className="flex justify-between">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentPosts.map(post => (
                <RecentPostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>

        {/* 포럼 규칙 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            📋 포럼 이용 규칙
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-green-600 mb-2">✅ 권장사항</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• 건설적이고 도움이 되는 내용 공유</li>
                <li>• 정확한 정보와 근거 제시</li>
                <li>• 다른 사용자에게 예의바른 태도</li>
                <li>• 관련 카테고리에 게시글 작성</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-red-600 mb-2">❌ 금지사항</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• 욕설, 비방, 차별적 발언</li>
                <li>• 스팸, 광고, 도배 행위</li>
                <li>• 부정행위 관련 정보 공유</li>
                <li>• 개인정보 노출 및 사생활 침해</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
