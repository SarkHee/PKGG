import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    summary: '',
    type: 'GENERAL',
    priority: 'NORMAL',
    isPinned: false,
    showUntil: '',
  });

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notices?limit=50');
      const data = await response.json();
      if (response.ok) {
        setNotices(data.notices);
      }
    } catch (error) {
      console.error('공지사항 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }

    try {
      const url = editingNotice
        ? `/api/notices/${editingNotice.id}`
        : '/api/notices';
      const method = editingNotice ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          summary: formData.summary || formData.content.substring(0, 200),
        }),
      });

      if (response.ok) {
        alert(
          editingNotice
            ? '공지사항이 수정되었습니다.'
            : '공지사항이 등록되었습니다.'
        );
        setShowForm(false);
        setEditingNotice(null);
        setFormData({
          title: '',
          content: '',
          summary: '',
          type: 'GENERAL',
          priority: 'NORMAL',
          isPinned: false,
          showUntil: '',
        });
        fetchNotices();
      } else {
        const error = await response.json();
        alert('오류: ' + error.error);
      }
    } catch (error) {
      console.error('공지사항 등록/수정 오류:', error);
      alert('서버 오류가 발생했습니다.');
    }
  };

  const handleEdit = (notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      content: notice.content,
      summary: notice.summary || '',
      type: notice.type,
      priority: notice.priority,
      isPinned: notice.isPinned,
      showUntil: notice.showUntil
        ? new Date(notice.showUntil).toISOString().slice(0, 16)
        : '',
    });
    setShowForm(true);
  };

  const handleDelete = async (noticeId) => {
    if (!confirm('정말로 이 공지사항을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/notices/${noticeId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('공지사항이 삭제되었습니다.');
        fetchNotices();
      } else {
        const error = await response.json();
        alert('오류: ' + error.error);
      }
    } catch (error) {
      console.error('공지사항 삭제 오류:', error);
      alert('서버 오류가 발생했습니다.');
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">공지사항 관리</h1>
          <p className="text-gray-600 mt-2">
            사이트 공지사항을 작성하고 관리합니다.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">공지사항 목록</h2>
              <button
                onClick={() => {
                  setShowForm(!showForm);
                  setEditingNotice(null);
                  setFormData({
                    title: '',
                    content: '',
                    summary: '',
                    type: 'GENERAL',
                    priority: 'NORMAL',
                    isPinned: false,
                    showUntil: '',
                  });
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                {showForm ? '취소' : '새 공지사항 작성'}
              </button>
            </div>
          </div>

          {showForm && (
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      제목 *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      유형
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          type: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="GENERAL">일반 공지</option>
                      <option value="UPDATE">기능 업데이트</option>
                      <option value="MAINTENANCE">점검 공지</option>
                      <option value="EVENT">이벤트</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      우선순위
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          priority: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="LOW">낮음</option>
                      <option value="NORMAL">보통</option>
                      <option value="HIGH">높음</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      표시 종료 시간
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.showUntil}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          showUntil: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center mt-6">
                    <input
                      type="checkbox"
                      checked={formData.isPinned}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          isPinned: e.target.checked,
                        }))
                      }
                      className="mr-2"
                    />
                    <label className="text-sm text-gray-700">상단 고정</label>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    요약 (선택사항)
                  </label>
                  <textarea
                    value={formData.summary}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        summary: e.target.value,
                      }))
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="공지사항 요약 (미입력시 내용 앞부분 자동 사용)"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    내용 *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        content: e.target.value,
                      }))
                    }
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="공지사항 내용을 입력하세요. 마크다운 문법 지원 (**굵게**, *기울임*)"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    {editingNotice ? '수정하기' : '등록하기'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingNotice(null);
                    }}
                    className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          )}

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
                <div key={notice.id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            notice.type === 'UPDATE'
                              ? 'bg-blue-100 text-blue-800'
                              : notice.type === 'MAINTENANCE'
                                ? 'bg-yellow-100 text-yellow-800'
                                : notice.type === 'EVENT'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {getTypeLabel(notice.type)}
                        </span>
                        {notice.isPinned && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            고정
                          </span>
                        )}
                        {notice.priority === 'HIGH' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            중요
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {notice.title}
                      </h3>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>조회: {notice.views.toLocaleString()}</span>
                        <span>
                          {new Date(notice.createdAt).toLocaleDateString(
                            'ko-KR'
                          )}
                        </span>
                        {notice.showUntil && (
                          <span>
                            종료:{' '}
                            {new Date(notice.showUntil).toLocaleDateString(
                              'ko-KR'
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(notice)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(notice.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
