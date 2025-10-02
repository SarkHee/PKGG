import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.js';

const PubgNewsCard = ({ category = 'all', maxItems = 5 }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/pubg-news?category=${category}&limit=${maxItems}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setNews(data.success ? data.data : []);
      } catch (err) {
        console.error('PUBG 뉴스 로딩 실패:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [category, maxItems]);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
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
    switch (cat) {
      case '공지사항': return 'bg-blue-100 text-blue-800';
      case '업데이트': return 'bg-green-100 text-green-800';
      case '이벤트': return 'bg-purple-100 text-purple-800';
      case '점검': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📢
            PUBG 공지사항
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          PUBG 공지사항
          {news.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {news.length}개
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {news.length === 0 ? (
          <p className="text-gray-500 text-center py-4">등록된 뉴스가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {news.map((item, index) => (
              <div 
                key={item.id || index} 
                className="border-b border-gray-100 last:border-b-0 pb-3 last:pb-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item.category && (
                        <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(item.category)}`}>
                          {item.category}
                        </span>
                      )}
                      {item.source && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          {item.source}
                        </span>
                      )}
                    </div>
                    
                    <h3 className="font-medium text-gray-900 line-clamp-2 mb-2">
                      {item.title}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {item.publishedAt && (
                        <div className="flex items-center gap-1">
                          📅
                          {formatDate(item.publishedAt)}
                        </div>
                      )}
                      
                      {item.views && item.views > 0 && (
                        <div className="flex items-center gap-1">
                          👁️
                          {formatViews(item.views)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="새 창에서 열기"
                    >
                      🔗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {news.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <a 
              href="https://pubg.com/ko/news" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              더 많은 소식 보기
              🔗
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PubgNewsCard;