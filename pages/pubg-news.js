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
      const response = await fetch(`/api/pubg/news?category=${category}`);
      const data = await response.json();
      if (response.ok && data.success) {
        const newsData = data.data || [];
        setNews(newsData);
        // 페이지네이션 계산 (20개씩 나누어 계산)
        const totalItems = newsData.length;
        const itemsPerPage = 20;
        const calculatedTotalPages = Math.ceil(totalItems / itemsPerPage) || 1;
        setTotalPages(calculatedTotalPages);
        setCurrentPage(page);
      } else {
        setError(data.message || '뉴스를 불러오는데 실패했습니다');
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
      const response = await fetch('/api/pubg/news?action=generate');
      const data = await response.json();
      if (response.ok && data.success) {
        alert(`업데이트 완료! ${data.data?.length || 0}개의 뉴스가 업데이트되었습니다.`);
        await loadNews(currentPage, selectedCategory); // 새로고침
      } else {
        alert('업데이트 실패: ' + (data.message || '알 수 없는 오류'));
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

  useEffect(() => {
    loadNews();
    // eslint-disable-next-line
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

  const categories = [
    { id: 'all', name: '전체' },
    { id: '공지사항', name: '공지사항' },
    { id: '업데이트', name: '업데이트' },
    { id: '이벤트', name: '이벤트' },
    { id: '패치', name: '패치노트' }
  ];

  return (
    <Layout>
      <>
        <Head>
          <title>배그공지사항 - PK.GG</title>
          <meta name="description" content="PUBG 공식 공지사항 및 업데이트 소식" />
        </Head>
        <div className="min-h-screen bg-gray-900 text-white" style={{ paddingTop: '0', marginTop: '-6rem' }}>
          <div className="pt-24 pb-8 px-8">
            <div className="max-w-6xl mx-auto">
              {/* 페이지 헤더 */}
              <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">📢 배그 공지사항</h1>
                <p className="text-gray-400">PUBG 공식 뉴스와 이벤트 정보를 확인하세요</p>
                <div className="flex items-center gap-4 mt-4">
                  <button
                    onClick={updateNews}
                    disabled={isUpdating}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    최신 뉴스 업데이트
                    {isUpdating && <span className="ml-2 animate-spin">🔄</span>}
                  </button>
                </div>
              </div>
              {/* 카테고리 탭 */}
              <div className="flex gap-2 mb-8">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              {/* 뉴스 목록 */}
              {loading ? (
                <div className="flex items-center justify-center min-h-[300px]">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              ) : error ? (
                <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
                  <p className="text-red-300 font-semibold">{error}</p>
                </div>
              ) : (
                <div>
                  {news.length === 0 ? (
                    <div className="text-center text-gray-400 py-12">공지사항이 없습니다.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {news.slice((currentPage - 1) * 20, currentPage * 20).map((item) => (
                        <a
                          key={item.id}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50 hover:border-gray-600/50 transition-colors"
                        >
                          <div className="flex items-center gap-4 mb-2">
                            <span className="bg-blue-600/20 text-blue-300 px-2 py-1 rounded text-xs font-medium">
                              {item.category}
                            </span>
                            <span className="text-xs text-gray-400">{formatDate(item.publishDate)}</span>
                          </div>
                          <h2 className="text-lg font-bold mb-2">{item.title}</h2>
                          <p className="text-gray-300 text-sm mb-2 line-clamp-2">{item.summary}</p>
                          {item.imageUrl && (
                            <img src={item.imageUrl} alt="뉴스 이미지" className="w-full h-40 object-cover rounded-lg mt-2" />
                          )}
                          <div className="mt-2 text-right">
                            <span className="bg-red-600/20 text-red-300 px-2 py-1 rounded text-xs font-medium">원문 보기</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                  {/* 페이지네이션 */}
                  <div className="flex justify-center items-center gap-2 mt-8">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ← 이전
                    </button>
                    <span className="text-gray-300 text-sm">
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
        </div>
      </>
    </Layout>
  );
}
