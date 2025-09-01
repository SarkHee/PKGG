import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../../components/Header';

export default function PostDetail() {
  const router = useRouter();
  const { postId } = router.query;
  
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newReply, setNewReply] = useState('');
  const [replyAuthor, setReplyAuthor] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      
      // 실제 API 호출로 해당 게시물 데이터 가져오기
      const response = await fetch(`/api/forum/posts?postId=${postId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.post) {
          setPost(data.post);
          setReplies(data.replies || []);
        } else {
          // 해당 ID의 게시물이 없는 경우
          setPost(null);
        }
      } else {
        console.error('Failed to fetch post:', response.status);
        setPost(null);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      
      // API 실패 시 임시 데이터로 폴백 (postId에 따라 다른 내용)
      const fallbackPosts = {
        '1': {
          id: '1',
          title: "초보자를 위한 PUBG 생존 가이드",
          content: `PUBG를 처음 시작하는 분들을 위한 생존 가이드를 작성했습니다.

**1. 착지 지역 선택**
- 인기 지역을 피하고 주변부에 착지하세요
- 건물이 있는 곳을 목표로 하세요
- 차량이 있는 지역을 기억해두세요

**2. 초반 아이템 파밍**  
- 무기와 방어구를 우선적으로 챙기세요
- 치료 아이템과 에너지 드링크를 확보하세요
- 가방을 빠르게 업그레이드하세요`,
          author: "PUBG마스터",
          categoryId: "strategy",
          category: { name: "전략 & 팁", icon: "🧠" },
          views: 1250,
          createdAt: new Date().toISOString(),
          likes: 45,
          isLiked: false
        },
        '2': {
          id: '2',
          title: "랭크 시스템 분석 및 티어 올리는 법",
          content: `PUBG 랭크 시스템에 대해 자세히 분석해보겠습니다.

**티어 시스템**
- Bronze → Silver → Gold → Platinum → Diamond → Master

**랭크 포인트 획득 방식**
- 킬 점수: 킬 당 20-30 RP
- 순위 보너스: TOP 10 진입 시 추가 RP
- 생존 시간 보너스: 오래 생존할수록 더 많은 RP

**티어 올리기 팁**
- 무작정 킬을 노리지 말고 안정적인 플레이
- 팀플레이 중요 (듀오/스쿼드)
- 핫드랍보다는 안정적인 착지`,
          author: "랭크킹",
          categoryId: "strategy", 
          category: { name: "전략 & 팁", icon: "🧠" },
          views: 890,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          likes: 23,
          isLiked: false
        },
        '3': {
          id: '3',
          title: "UBD 클랜 모집합니다!",
          content: `안녕하세요! UBD 클랜에서 새로운 멤버를 모집합니다.

**클랜 소개**
- 클랜명: UBD (Ultimate Battle Division)
- 현재 인원: 45명
- 주요 활동: 경쟁전, 클랜전, 스크림

**모집 조건**
- 티어: 골드 이상
- 평균 딜량: 150+ 
- 적극적인 참여 의지
- 디스코드 사용 가능

**지원 방법**
- 게임 내 클랜 검색: UBD
- 디스코드: UBD#1234
- 클랜장: parksrk

많은 지원 부탁드립니다!`,
          author: "parksrk",
          categoryId: "recruitment",
          category: { name: "클랜 모집", icon: "👥" },
          views: 456,
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          likes: 12,
          isLiked: false
        }
      };
      
      const fallbackPost = fallbackPosts[postId] || fallbackPosts['1'];
      setPost(fallbackPost);
      setReplies([
        {
          id: 1,
          content: `${fallbackPost.title}에 대한 댓글입니다. 유용한 정보 감사합니다!`,
          author: "독자1",
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          likes: 3
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    
    if (!newReply.trim() || !replyAuthor.trim()) {
      alert('댓글 내용과 작성자명을 입력해주세요.');
      return;
    }

    setSubmittingReply(true);
    
    try {
      // 임시로 클라이언트에서 댓글 추가 (실제로는 API 호출)
      const tempReply = {
        id: Date.now(),
        content: newReply,
        author: replyAuthor,
        createdAt: new Date().toISOString(),
        likes: 0
      };
      
      setReplies(prev => [...prev, tempReply]);
      setNewReply('');
      
      // 실제로는 여기서 API 호출
      // await fetch(`/api/forum/posts/${postId}/replies`, { ... });
      
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert('댓글 작성에 실패했습니다.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleLike = async () => {
    try {
      // 실제로는 API 호출
      setPost(prev => ({
        ...prev,
        likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1,
        isLiked: !prev.isLiked
      }));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="container mx-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">게시글을 불러오는 중...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <Header />
        <div className="container mx-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
          <div className="max-w-4xl mx-auto text-center py-20">
            <div className="text-6xl mb-6">📭</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              게시글을 찾을 수 없습니다
            </h1>
            <Link 
              href="/forum"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              포럼 메인으로 돌아가기
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{post.title} | 커뮤니티 포럼 | PK.GG</title>
        <meta name="description" content={post.content.substring(0, 160)} />
      </Head>

      <Header />
      
      <div className="container mx-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* 브레드크럼 */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
            <Link href="/forum" className="hover:text-blue-600">커뮤니티 포럼</Link>
            <span>›</span>
            <Link href={`/forum/category/${post.categoryId}`} className="hover:text-blue-600">
              {post.category.name}
            </Link>
            <span>›</span>
            <span className="text-gray-900 dark:text-gray-100 truncate">{post.title}</span>
          </nav>

          {/* 게시글 내용 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
            {/* 게시글 헤더 */}
            <div className="border-b border-gray-200 dark:border-gray-600 pb-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">{post.category.icon}</span>
                <span className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                  {post.category.name}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                {post.title}
              </h1>
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-4">
                  <span>👤 {post.author}</span>
                  <span>📅 {new Date(post.createdAt).toLocaleDateString('ko-KR')}</span>
                  <span>👁️ {post.views}회</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLike}
                    className={`flex items-center gap-1 px-3 py-1 rounded transition-colors ${
                      post.isLiked 
                        ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span>{post.isLiked ? '❤️' : '🤍'}</span>
                    <span>{post.likes}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 게시글 본문 */}
            <div className="prose dark:prose-invert max-w-none">
              {post.content.split('\n').map((line, index) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                  return (
                    <h3 key={index} className="font-bold text-lg mt-6 mb-3 text-gray-900 dark:text-gray-100">
                      {line.slice(2, -2)}
                    </h3>
                  );
                }
                if (line.startsWith('- ')) {
                  return (
                    <li key={index} className="ml-4 mb-1 text-gray-700 dark:text-gray-300">
                      {line.slice(2)}
                    </li>
                  );
                }
                return line.trim() ? (
                  <p key={index} className="mb-3 text-gray-700 dark:text-gray-300 leading-relaxed">
                    {line}
                  </p>
                ) : (
                  <div key={index} className="mb-3"></div>
                );
              })}
            </div>
          </div>

          {/* 댓글 섹션 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              💬 댓글 ({replies.length})
            </h3>

            {/* 댓글 목록 */}
            <div className="space-y-4 mb-6">
              {replies.map(reply => (
                <div key={reply.id} className="border-l-2 border-blue-200 dark:border-blue-800 pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <span>👤 {reply.author}</span>
                      <span>📅 {new Date(reply.createdAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <span>🤍</span>
                      <span>{reply.likes}</span>
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {reply.content}
                  </p>
                </div>
              ))}
              
              {replies.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <span className="text-4xl mb-3 block">💭</span>
                  첫 번째 댓글을 작성해보세요!
                </div>
              )}
            </div>

            {/* 댓글 작성 폼 */}
            <form onSubmit={handleSubmitReply} className="border-t border-gray-200 dark:border-gray-600 pt-6">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">댓글 작성</h4>
              
              <div className="mb-4">
                <input
                  type="text"
                  value={replyAuthor}
                  onChange={(e) => setReplyAuthor(e.target.value)}
                  placeholder="작성자명을 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
              
              <div className="mb-4">
                <textarea
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  placeholder="댓글을 입력하세요..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-vertical"
                  required
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingReply}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  {submittingReply ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      작성 중...
                    </>
                  ) : (
                    <>
                      💬 댓글 작성
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
