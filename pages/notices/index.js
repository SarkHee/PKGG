import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';

export default function NoticesPage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState({ type: '', priority: '' });
  const router = useRouter();

  useEffect(() => {
    fetchNotices();
  }, [currentPage, filter]);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
      });

      if (filter.type) params.append('type', filter.type);
      if (filter.priority) params.append('priority', filter.priority);

      const response = await fetch(`/api/notices?${params}`);
      const data = await response.json();

      if (response.ok) {
        setNotices(data.notices);
        setPagination(data.pagination);
      } else {
        console.error('공지사항 조회 오류:', data.error);
      }
    } catch (error) {
      console.error('공지사항 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNoticeClick = (noticeId) => {
    router.push(`/notices/${noticeId}`);
  };

  const getTypeLabel = (type) => {
    const typeMap = {
      UPDATE: '기능 업데이트',
      MAINTENANCE: '점검 공지',
      EVENT: '이벤트',
      GENERAL: '일반 공지',
    };
    return typeMap[type] || type;
  };

  const getTypeColor = (type) => {
    const colorMap = {
      UPDATE: 'bg-blue-100 text-blue-800',
      MAINTENANCE: 'bg-yellow-100 text-yellow-800',
      EVENT: 'bg-green-100 text-green-800',
      GENERAL: 'bg-gray-100 text-gray-800',
    };
    return colorMap[type] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityIcon = (priority, isPinned) => {
    if (isPinned) return '📌';
    if (priority === 'HIGH') return '🚨';
    if (priority === 'NORMAL') return '📋';
    return '💬';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  📋 공지사항
                </h1>
                <p className="text-gray-600 mt-1">
                  사이트 업데이트 및 공지사항을 확인하세요
                </p>
              </div>

              {/* 필터 */}
              <div className="mt-4 sm:mt-0 flex gap-2">
                <select
                  value={filter.type}
                  onChange={(e) =>
                    setFilter((prev) => ({ ...prev, type: e.target.value }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">전체 유형</option>
                  <option value="UPDATE">기능 업데이트</option>
                  <option value="MAINTENANCE">점검 공지</option>
                  <option value="EVENT">이벤트</option>
                  <option value="GENERAL">일반 공지</option>
                </select>

                <select
                  value={filter.priority}
                  onChange={(e) =>
                    setFilter((prev) => ({ ...prev, priority: e.target.value }))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">전체 우선순위</option>
                  <option value="HIGH">높음</option>
                  <option value="NORMAL">보통</option>
                  <option value="LOW">낮음</option>
                </select>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="px-6 py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">공지사항을 불러오는 중...</p>
              </div>
            ) : notices.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                등록된 공지사항이 없습니다.
              </div>
            ) : (
              notices.map((notice) => (
                <div
                  key={notice.id}
                  onClick={() => handleNoticeClick(notice.id)}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">
                          {getPriorityIcon(notice.priority, notice.isPinned)}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(notice.type)}`}
                        >
                          {getTypeLabel(notice.type)}
                        </span>
                        {notice.isPinned && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            고정
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {notice.title}
                      </h3>

                      {notice.summary && (
                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                          {notice.summary}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>작성자: {notice.author}</span>
                        <span>조회: {notice.views.toLocaleString()}</span>
                        <span>
                          {new Date(notice.createdAt).toLocaleDateString(
                            'ko-KR'
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="ml-4 flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 페이지네이션 */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  총 {pagination.total}개 중{' '}
                  {(currentPage - 1) * pagination.limit + 1}-
                  {Math.min(currentPage * pagination.limit, pagination.total)}개
                  표시
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                  >
                    이전
                  </button>

                  {[...Array(pagination.totalPages)].map((_, i) => {
                    const page = i + 1;
                    if (
                      page === 1 ||
                      page === pagination.totalPages ||
                      Math.abs(page - currentPage) <= 2
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 text-sm border rounded-md ${
                            currentPage === page
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (Math.abs(page - currentPage) === 3) {
                      return (
                        <span key={page} className="px-2 py-1 text-gray-500">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}

                  <button
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(pagination.totalPages, prev + 1)
                      )
                    }
                    disabled={currentPage === pagination.totalPages}
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                  >
                    다음
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
