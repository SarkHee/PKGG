import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.js';
import { MessageCircle } from 'lucide-react';

const PubgNewsCard = ({ category = 'all', maxItems = 5, theme = 'dark' }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = async (forceRefresh = false) => {
    try {
      setLoading(!forceRefresh);
      setRefreshing(forceRefresh);
      const response = await fetch(
        `/api/pubg-news?category=${category}&limit=${maxItems}${forceRefresh ? '&refresh=true' : ''}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setNews(data.success ? data.data : []);
      setError(null);
    } catch (err) {
      console.error('PUBG 뉴스 로딩 실패:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [category, maxItems]);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatViews = (views) => {
    if (!views || views === 0) return '';
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const getCategoryColor = (cat) => {
    if (theme === 'light') {
      switch (cat) {
        case '공지사항':
          return 'bg-blue-100 text-blue-800 border border-blue-200';
        case '업데이트':
          return 'bg-green-100 text-green-800 border border-green-200';
        case '이벤트':
          return 'bg-purple-100 text-purple-800 border border-purple-200';
        case '점검':
          return 'bg-orange-100 text-orange-800 border border-orange-200';
        default:
          return 'bg-gray-100 text-gray-800 border border-gray-200';
      }
    } else {
      switch (cat) {
        case '공지사항':
          return 'bg-blue-600/80 text-blue-100 border border-blue-400/30';
        case '업데이트':
          return 'bg-green-600/80 text-green-100 border border-green-400/30';
        case '이벤트':
          return 'bg-purple-600/80 text-purple-100 border border-purple-400/30';
        case '점검':
          return 'bg-orange-600/80 text-orange-100 border border-orange-400/30';
        default:
          return 'bg-gray-600/80 text-gray-100 border border-gray-400/30';
      }
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📢 PUBG 공지사항
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <MessageCircle className="w-5 h-5" />
            PUBG 공지사항
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">뉴스를 불러올 수 없습니다: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2
            className={`text-2xl font-bold flex items-center gap-3 ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}
          >
            <MessageCircle
              className={`w-7 h-7 ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`}
            />
            PUBG 이벤트 & 뉴스
            {news.length > 0 && (
              <span
                className={`ml-2 px-3 py-1 text-sm rounded-full ${
                  theme === 'light'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-blue-900/50 text-blue-300'
                }`}
              >
                {news.length}개
              </span>
            )}
          </h2>
        </div>
        <p className={theme === 'light' ? 'text-gray-600' : 'text-gray-400'}>
          최신 PUBG 이벤트와 소식을 확인하세요
        </p>
      </div>

      {news.length === 0 ? (
        <Card
          className={`p-8 text-center ${
            theme === 'light'
              ? 'bg-gray-50 border-gray-200'
              : 'bg-gray-800/50 border-gray-700'
          }`}
        >
          <div
            className={`mb-4 ${theme === 'light' ? 'text-gray-400' : 'text-gray-500'}`}
          >
            <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          </div>
          <h3
            className={`text-lg font-medium mb-2 ${
              theme === 'light' ? 'text-gray-700' : 'text-gray-300'
            }`}
          >
            등록된 뉴스가 없습니다
          </h3>
          <p className={theme === 'light' ? 'text-gray-500' : 'text-gray-400'}>
            새로운 소식이 업데이트될 때까지 기다려주세요.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.map((item, index) => (
            <Card
              key={item.id || index}
              className={`overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group ${
                theme === 'light'
                  ? 'bg-white border-gray-200 hover:shadow-lg'
                  : 'bg-gray-800/60 border-gray-700 backdrop-blur-sm'
              }`}
            >
              {/* 이미지 영역 */}
              {item.imageUrl ? (
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
                  <div className="hidden w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 items-center justify-center">
                    <MessageCircle className="w-12 h-12 text-white opacity-70" />
                  </div>
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <MessageCircle className="w-12 h-12 text-white opacity-70" />
                </div>
              )}

              <CardContent className="p-6">
                {/* 카테고리 및 소스 태그 */}
                <div className="flex items-center gap-2 mb-3">
                  {item.category && (
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${getCategoryColor(item.category)}`}
                    >
                      {item.category}
                    </span>
                  )}
                  {item.source && (
                    <span
                      className={`px-3 py-1 text-xs rounded-full ${
                        theme === 'light'
                          ? 'bg-gray-100 text-gray-700 border border-gray-200'
                          : 'bg-gray-600/80 text-gray-100 border border-gray-400/30'
                      }`}
                    >
                      {item.source === 'PUBG_EVENTS'
                        ? '이벤트'
                        : item.source === 'STEAM_PUBG'
                          ? 'Steam'
                          : '공식'}
                    </span>
                  )}
                </div>

                {/* 제목 */}
                <h3
                  className={`font-bold text-lg mb-3 transition-colors ${
                    theme === 'light'
                      ? 'text-gray-900 group-hover:text-blue-600'
                      : 'text-white group-hover:text-blue-400'
                  }`}
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {item.title}
                </h3>

                {/* 요약 */}
                {item.summary && (
                  <p
                    className={`text-sm mb-4 leading-relaxed ${
                      theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                    }`}
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {item.summary}
                  </p>
                )}

                {/* 메타 정보 */}
                <div
                  className={`flex items-center justify-between text-xs mb-4 ${
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                  }`}
                >
                  {item.publishedAt && (
                    <div className="flex items-center gap-1">
                      📅
                      <span>{formatDate(item.publishedAt)}</span>
                    </div>
                  )}

                  {item.views && item.views > 0 && (
                    <div className="flex items-center gap-1">
                      👁️
                      <span>{formatViews(item.views)}</span>
                    </div>
                  )}
                </div>

                {/* 링크 버튼 */}
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 w-full justify-center px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors group-hover:shadow-md ${
                      theme === 'light'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-blue-600/80 hover:bg-blue-600'
                    }`}
                  >
                    자세히 보기
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 더 보기 링크 */}
      {news.length > 0 && (
        <div className="mt-8 text-center">
          <a
            href="https://www.pubg.com/ko/events"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-6 py-3 font-medium rounded-lg transition-colors ${
              theme === 'light'
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                : 'bg-gray-700/50 hover:bg-gray-600/70 text-gray-300'
            }`}
          >
            더 많은 이벤트 보기
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
};

export default PubgNewsCard;
