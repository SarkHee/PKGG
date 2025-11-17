import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';

export default function NoticeDetailPage() {
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (id) {
      fetchNotice();
    }
  }, [id]);

  const fetchNotice = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notices/${id}`);
      const data = await response.json();

      if (response.ok) {
        setNotice(data);
      } else {
        setError(data.error || '공지사항을 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('공지사항 조회 오류:', error);
      setError('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
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

  const formatContent = (content) => {
    // 간단한 마크다운 스타일 변환
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-6"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center py-8">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                오류가 발생했습니다
              </h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => router.push('/notices')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                공지사항 목록으로 돌아가기
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md">
          {/* 헤더 */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => router.push('/notices')}
                className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                목록으로
              </button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">
                {getPriorityIcon(notice.priority, notice.isPinned)}
              </span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(notice.type)}`}
              >
                {getTypeLabel(notice.type)}
              </span>
              {notice.isPinned && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  고정
                </span>
              )}
              {notice.priority === 'HIGH' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                  중요
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {notice.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span>작성자: {notice.author}</span>
              <span>조회: {notice.views.toLocaleString()}</span>
              <span>
                작성일: {new Date(notice.createdAt).toLocaleString('ko-KR')}
              </span>
              {notice.updatedAt !== notice.createdAt && (
                <span>
                  수정일: {new Date(notice.updatedAt).toLocaleString('ko-KR')}
                </span>
              )}
            </div>
          </div>

          {/* 내용 */}
          <div className="px-6 py-6">
            <div
              className="prose max-w-none text-gray-800 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: formatContent(notice.content),
              }}
            />
          </div>

          {/* 하단 버튼 */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <button
                onClick={() => router.push('/notices')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                목록으로 돌아가기
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: notice.title,
                        text: notice.summary || notice.title,
                        url: window.location.href,
                      });
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      alert('링크가 클립보드에 복사되었습니다.');
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                    />
                  </svg>
                  공유
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
