// 베그공지사항 페이지
// pages/pubg-news.js

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Head from 'next/head';

export default function PubgNewsPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 뉴스 로드
  const loadNews = async (page = 1, category = 'all') => {
    try {
      setLoading(true);
      const response = await fetch(`/api/pubg/news?page=${page}&limit=20&category=${category}`);
      const data = await response.json();
      
      if (response.ok) {
        setNews(data.news);
        setTotalPages(data.pagination.totalPages);
        setCurrentPage(data.pagination.page);
      } else {
        setError(data.error || '뉴스를 불러오는데 실패했습니다');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다');
      console.error('뉴스 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // 뉴스 업데이트 (크롤링)
  const updateNews = async () => {
    try {
      setIsUpdating(true);
      const response = await fetch('/api/pubg/news', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (response.ok) {
        alert(`업데이트 완료! 신규 ${data.result.saved}개, 갱신 ${data.result.updated}개`);
        await loadNews(currentPage, selectedCategory); // 새로고침
      } else {
        alert('업데이트 실패: ' + (data.error || '알 수 없는 오류'));
      }
    } catch (err) {
      alert('업데이트 중 오류가 발생했습니다');
      console.error('업데이트 오류:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // 카테고리 변경
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    loadNews(1, category);
  };

  // 페이지 변경
  const handlePageChange = (page) => {
    loadNews(page, selectedCategory);
  };

  // 컴포넌트 마운트 시 뉴스 로드
  useEffect(() => {
    loadNews();
  }, []);

  // 날짜 포매팅
  const formatDate = (dateString) => {
    if (!dateString) return '날짜 미상';
    try {
      return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return '날짜 미상';
    }
  };

  // 카테고리 목록
  const categories = [
    { id: 'all', name: '전체' },
    { id: '공지사항', name: '공지사항' },
    { id: '업데이트', name: '업데이트' },
    { id: '이벤트', name: '이벤트' },
    { id: '패치', name: '패치노트' }
  ];

  return (
    <Layout>
      <Head>
        <title>배그공지사항 - PK.GG</title>
        <meta name="description" content="PUBG 공식 공지사항 및 업데이트 소식" />
      </Head>

      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          {/* 헤더 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold flex items-center gap-2">
                📢 배그공지사항
              </h1>
              <button
                onClick={updateNews}
                disabled={isUpdating}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    업데이트 중...
                  </>
                ) : (
                  <>
                  🔄 최신 뉴스 업데이트
                  </>
                )}
              </button>
            </div>

            {/* 카테고리 필터 */}
            <div className="flex gap-2 flex-wrap">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* 로딩 상태 */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3">뉴스를 불러오는 중...</span>
            </div>
          )}

          {/* 에러 상태 */}
          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
              <p className="text-red-300">⚠️ {error}</p>
            </div>
          )}

          {/* 뉴스 목록 */}
          {!loading && !error && (
            <div className="space-y-4">
              {news.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>📭 아직 뉴스가 없습니다.</p>
                  <p className="text-sm mt-2">
                                  <p className="text-sm mt-2">
                "최신 뉴스 업데이트" 버튼을 클릭해서 PUBG 관련 소식을 확인해보세요.
              </p>
                  </p>
                </div>
              ) : (
                news.map((item) => (
                  <div 
                    key={item.id}
                    className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50 hover:border-gray-600/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* 카테고리와 우선순위 */}
                        <div className="flex items-center gap-2 mb-2">
                          {item.category && (
                            <span className="bg-blue-600/20 text-blue-300 px-2 py-1 rounded text-xs font-medium">
                              {item.category}
                            </span>
                          )}
                          {item.priority > 5 && (
                            <span className="bg-red-600/20 text-red-300 px-2 py-1 rounded text-xs font-medium">
                              🔥 HOT
                            </span>
                          )}
                        </div>

                        {/* 제목 */}
                        <h2 className="text-xl font-semibold mb-2 text-white hover:text-blue-300 transition-colors">
                          <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block"
                          >
                            {item.title}
                          </a>
                        </h2>

                        {/* 날짜 */}
                        <p className="text-gray-400 text-sm">
                          📅 {formatDate(item.publishDate)}
                        </p>
                      </div>

                      {/* 썸네일 이미지 (있는 경우) */}
                      {item.imageUrl && (
                        <div className="ml-4">
                          <img 
                            src={item.imageUrl} 
                            alt={item.title}
                            className="w-20 h-20 object-cover rounded-lg border border-gray-600"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* 링크 버튼 */}
                    <div className="mt-4">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium"
                      >
                        🔗 원문 보기
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 페이지네이션 */}
          {!loading && !error && totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← 이전
                </button>
                
                <span className="px-4 py-2 text-gray-300">
                  {currentPage} / {totalPages}
                </span>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음 →
                </button>
              </div>
            </div>
          )}

          {/* 안내사항 */}
          <div className="mt-12 bg-gray-800/30 border border-gray-700/30 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2 text-yellow-400">📋 이용 안내</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• 이 페이지는 PUBG 공식사이트의 공지사항을 자동으로 가져옵니다.</li>
              <li>• 모든 내용의 저작권은 PUBG Corporation에 있습니다.</li>
              <li>• 자세한 내용은 "원문 보기"를 클릭하여 공식 사이트에서 확인해주세요.</li>
              <li>• "최신 뉴스 업데이트" 버튼으로 최신 소식을 업데이트할 수 있습니다.</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}
