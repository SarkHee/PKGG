import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from '../../components/layout/Header';

const CHANGELOG = [
  {
    date: '2026.04.28',
    items: [
      { icon: '🔧', text: '플레이어 조회 방식 개선 — 항상 PUBG API에서 최신 데이터 로드 (DB 캐시 우선 방식 제거)' },
      { icon: '📊', text: 'AI 코칭 심층분석 수치 정상화 — 시즌 전체 경기수 및 랭크 데이터 정확히 반영' },
      { icon: '👥', text: '최근 경기 팀원 정보 표시 정상화 — PUBG API 데이터 기반 팀원 상세 스탯 복원' },
      { icon: '🏅', text: '경쟁전 탭 개선 — 데이터 없을 때 클릭 불가 대신 "경쟁전 데이터가 없습니다" 안내 메시지 표시' },
      { icon: '🎮', text: '이벤트/사용자 지정 게임 분리 — 커스텀 게임 경기를 이벤트로 분류하여 필터링 지원' },
      { icon: '🔄', text: '최신화 버튼 오류 수정 — 동일 URL 중복 이동 오류(Invariant hard navigate) 해결' },
    ],
  },
  {
    date: '2026.04',
    items: [
      { icon: '🟡', text: '카카오 로그인 추가 — 카카오 배그 계정으로 로그인 가능' },
      { icon: '🏰', text: '카카오 클랜 분석 지원 — 클랜 분석 페이지에서 Steam/카카오 탭으로 분리 조회' },
      { icon: '⚡', text: '플레이어 페이지 성능 개선 — LCP 단축, 스켈레톤 UI 적용' },
      { icon: '📊', text: '경기 상세 분석 — 팀원별 퍼포먼스 점수 및 에이스 표시' },
      { icon: '🔫', text: '주사용 무기 — 숙련도 등급 산출 기능 추가' },
      { icon: '📈', text: '성장 추적 차트 위치 개편 (퍼포먼스 리포트 하단으로 이동)' },
      { icon: '💡', text: 'AI 코칭 — 딜량 상위% 표시 및 개선 포인트 강화' },
      { icon: '🔍', text: '플레이어 검색창 측면 고정 패널로 개편' },
    ],
  },
  {
    date: '2026.03',
    items: [
      { icon: '🗺️', text: '무기 데미지 표 — Update 41.1 패치 내용 반영' },
      { icon: '👥', text: '경기 내역 — 팀원 상세 스탯 테이블 추가' },
      { icon: '🏆', text: '클랜 내전 기록 기능 추가' },
      { icon: '⭐', text: '플레이어 리뷰 시스템 추가' },
      { icon: '🎯', text: '피킹 트레이너 미니게임 추가' },
    ],
  },
  {
    date: '2026.02',
    items: [
      { icon: '🌙', text: '다크/라이트 테마 토글 지원' },
      { icon: '📱', text: '전체 페이지 모바일 최적화' },
      { icon: '🌐', text: '다국어 지원 (한/영/일/중)' },
      { icon: '📊', text: '플레이어 비교 페이지 추가' },
      { icon: '🏅', text: '공개 클랜 디렉토리 추가' },
    ],
  },
  {
    date: '2026.01',
    items: [
      { icon: '🤖', text: 'AI 코칭 시스템 출시' },
      { icon: '📈', text: '성장 추적 차트 추가' },
      { icon: '🔫', text: '무기 성향 테스트 v2 업데이트' },
      { icon: '🎮', text: '에임 트레이너·반동 퀴즈 등 훈련 도구 추가' },
      { icon: '💬', text: '커뮤니티 포럼 오픈' },
    ],
  },
];

export default function NoticesPage() {
  const [tab, setTab] = useState('notices');
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
            </div>

            {/* 탭 */}
            <div className="flex gap-1 mt-4 bg-gray-100 rounded-lg p-1 w-fit">
              {[
                { key: 'notices', label: '📋 공지사항' },
                { key: 'changelog', label: '🆕 업데이트 기록' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                    tab === key
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 업데이트 기록 탭 */}
          {tab === 'changelog' && (
            <div className="px-6 py-6">
              <div className="space-y-8">
                {CHANGELOG.map((release) => (
                  <div key={release.date} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
                      <div className="w-0.5 bg-gray-200 flex-1 mt-1" />
                    </div>
                    <div className="pb-2 flex-1">
                      <div className="text-sm font-bold text-blue-600 mb-2">{release.date}</div>
                      <ul className="space-y-1.5">
                        {release.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="flex-shrink-0">{item.icon}</span>
                            <span>{item.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 공지사항 탭 */}
          {tab === 'notices' && <>

          {/* 필터 */}
          <div className="px-6 py-3 border-b border-gray-100 flex gap-2">
            <select
              value={filter.type}
              onChange={(e) => setFilter((prev) => ({ ...prev, type: e.target.value }))}
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
              onChange={(e) => setFilter((prev) => ({ ...prev, priority: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">전체 우선순위</option>
              <option value="HIGH">높음</option>
              <option value="NORMAL">보통</option>
              <option value="LOW">낮음</option>
            </select>
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
          </>}

        </div>
      </main>
    </div>
  );
}
