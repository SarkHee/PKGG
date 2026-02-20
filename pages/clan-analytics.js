// pages/clan-analytics.js
// 클랜 종합 분석 대시보드 페이지

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '../components/layout/Layout';
import { getMMRTier, MMR_DISCLAIMER } from '../utils/mmrCalculator';

// 랭킹 업데이트 상태 컴포넌트
function RankingUpdateStatus() {
  const [updateStatus, setUpdateStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpdateStatus();
    // 1분마다 상태 업데이트
    const interval = setInterval(fetchUpdateStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchUpdateStatus = async () => {
    try {
      const response = await fetch('/api/clan/ranking-status');
      const data = await response.json();
      if (data.success) {
        setUpdateStatus(data.data);
      }
    } catch (error) {
      console.error('상태 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !updateStatus) {
    return (
      <div className="text-sm text-gray-400 mt-1">
        📊 업데이트 상태 조회 중...
      </div>
    );
  }

  return (
    <div className="text-sm text-gray-400 mt-1 space-y-1">
      <div>📅 마지막 업데이트: {updateStatus.lastUpdate.timeKorean}</div>
      <div>
        ⏰ 다음 업데이트: 매일 {updateStatus.nextUpdate.schedules.join(', ')}
      </div>
    </div>
  );
}

// 수동 업데이트 버튼 컴포넌트
function ManualUpdateButton() {
  const [updating, setUpdating] = useState(false);

  const handleManualUpdate = async () => {
    if (updating) return;

    setUpdating(true);
    try {
      const response = await fetch('/api/clan/update-rankings', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        alert(
          `✅ 랭킹 업데이트 완료!\n${data.data.updatedCount}개 클랜이 업데이트되었습니다.`
        );
        window.location.reload();
      } else {
        alert(`❌ 업데이트 실패: ${data.message}`);
      }
    } catch (error) {
      alert(`❌ 업데이트 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <button
      onClick={handleManualUpdate}
      disabled={updating}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        updating
          ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}
    >
      {updating ? '🔄 업데이트 중...' : '🔄 지금 업데이트'}
    </button>
  );
}

// 플레이스타일 아이콘 및 설명 매핑
const playStyleConfig = {
  '극단적 공격형': {
    icon: '💀',
    description: '최고 딜량과 킬을 추구하는 초공격적 플레이스타일',
    color: 'bg-black text-white',
  },
  '핫드롭 마스터': {
    icon: '🌋',
    description: '극초반 높은 킬수와 딜량으로 핫드롭을 제압하는 스타일',
    color: 'bg-orange-500 text-white',
  },
  '스피드 파이터': {
    icon: '⚡',
    description: '짧은 시간 내에 높은 킬수를 달성하는 빠른 전투 스타일',
    color: 'bg-yellow-500 text-black',
  },
  '초반 어그로꾼': {
    icon: '🔥',
    description: '매우 짧은 생존시간에도 높은 딜량을 뽑아내는 공격적 스타일',
    color: 'bg-orange-600 text-white',
  },
  '빠른 청소부': {
    icon: '🧹',
    description: '초반에 적당한 교전으로 빠르게 정리하는 효율적 스타일',
    color: 'bg-green-500 text-white',
  },
  '초반 돌격형': {
    icon: '🚀',
    description: '게임 시작부터 적극적인 교전을 벌이는 기본 돌격 스타일',
    color: 'bg-red-600 text-white',
  },
  '극단적 수비형': {
    icon: '🛡️',
    description: '교전을 최대한 피하고 안전한 플레이를 선호하는 스타일',
    color: 'bg-gray-600 text-white',
  },
  '후반 존버형': {
    icon: '🏕️',
    description: '초반 교전을 피하고 후반 랭킹에 집중하는 스타일',
    color: 'bg-brown-500 text-white',
  },
  '장거리 정찰러': {
    icon: '🏃',
    description: '넓은 맵 이동과 정찰을 중시하는 플레이스타일',
    color: 'bg-teal-500 text-white',
  },
  '저격 위주': {
    icon: '🎯',
    description: '원거리 저격과 정밀한 교전을 선호하는 스타일',
    color: 'bg-purple-600 text-white',
  },
  '중거리 안정형': {
    icon: '⚖️',
    description: '중거리 교전에서 안정적인 성과를 내는 플레이스타일',
    color: 'bg-indigo-500 text-white',
  },
  '지속 전투형': {
    icon: '🔥',
    description: '긴 교전을 통해 높은 딜량과 킬을 확보하는 스타일',
    color: 'bg-pink-600 text-white',
  },
  '유령 생존자': {
    icon: '👻',
    description: '교전 없이도 높은 순위를 달성하는 신비로운 스타일',
    color: 'bg-slate-700 text-white',
  },
  '도박형 파밍러': {
    icon: '🪂',
    description: '위험한 지역에서 빠른 파밍을 시도하는 모험적 스타일',
    color: 'bg-amber-500 text-black',
  },
  순간광폭형: {
    icon: '⚡',
    description: '짧은 시간에 폭발적인 화력을 집중하는 스타일',
    color: 'bg-violet-600 text-white',
  },
  '치명적 저격수': {
    icon: '🦅',
    description: '높은 킬과 딜량으로 적을 제압하는 정밀 스타일',
    color: 'bg-rose-600 text-white',
  },
  '전략적 어시스트러': {
    icon: '🧠',
    description: '팀워크와 어시스트를 중시하는 협력형 스타일',
    color: 'bg-emerald-600 text-white',
  },
  '고효율 승부사': {
    icon: '📊',
    description: '적은 딜량으로도 많은 킬을 달성하는 효율형 스타일',
    color: 'bg-cyan-600 text-white',
  },
  공격형: {
    icon: '⚔️',
    description: '전반적으로 공격적인 성향을 보이는 플레이스타일',
    color: 'bg-red-400 text-white',
  },
  생존형: {
    icon: '🛡️',
    description: '생존과 안정성을 중시하는 플레이스타일',
    color: 'bg-gray-500 text-white',
  },
  이동형: {
    icon: '🏃‍♂️',
    description: '이동과 포지셔닝을 중시하는 플레이스타일',
    color: 'bg-lime-500 text-black',
  },
  혼합: {
    icon: '🌀',
    description: '다양한 스타일이 혼재하는 복합적 플레이스타일',
    color: 'bg-neutral-600 text-white',
  },
};

// 간단한 툴팁 컴포넌트 (표 밖으로 나가도 잘리지 않음)
const Tooltip = ({ children, content }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute z-[9999] px-4 py-3 text-sm text-white bg-black bg-opacity-95 rounded-lg shadow-xl min-w-[300px] max-w-[500px] break-words whitespace-normal bottom-full mb-2 left-1/2 transform -translate-x-1/2">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-transparent border-t-4 border-t-black"></div>
        </div>
      )}
    </div>
  );
};

// 플레이스타일 배지 컴포넌트
const PlayStyleBadge = ({ style, className = '', showDescription = true }) => {
  const config = playStyleConfig[style] || playStyleConfig['혼합'];

  const badge = (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${config.color} ${className}`}
    >
      <span className="text-sm">{config.icon}</span>
      {style}
    </span>
  );

  if (showDescription) {
    return <Tooltip content={config.description}>{badge}</Tooltip>;
  }

  return badge;
};

export default function ClanAnalytics() {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [showSearchResult, setShowSearchResult] = useState(false);

  // 지역 필터 상태
  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [isKoreanOnly, setIsKoreanOnly] = useState(false);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchAnalytics();
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 리셋
  }, [selectedRegion, isKoreanOnly]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // 쿼리 파라미터 구성
      const params = new URLSearchParams();
      if (selectedRegion !== 'ALL') params.append('region', selectedRegion);
      if (isKoreanOnly) params.append('isKorean', 'true');

      const response = await fetch(`/api/clan-analytics?${params.toString()}`);
      if (!response.ok) throw new Error('분석 데이터를 가져올 수 없습니다');
      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim() || !analyticsData) return;

    const foundClan = analyticsData.rankings.allRankedClans.find(
      (clan) =>
        clan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clan.tag.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (foundClan) {
      setSearchResult(foundClan);
    } else {
      setSearchResult({ notFound: true });
    }
    setShowSearchResult(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const closeSearchResult = () => {
    setShowSearchResult(false);
    setSearchResult(null);
    setSearchQuery('');
  };

  if (loading) {
    return (
      <Layout>
        <div
          className="min-h-screen bg-gray-900 text-white overflow-visible"
          style={{ paddingTop: '0', marginTop: '-6rem' }}
        >
          <div className="pt-24 pb-8 px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-xl">클랜 분석 데이터 로딩 중...</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div
          className="min-h-screen bg-gray-900 text-white overflow-visible"
          style={{ paddingTop: '0', marginTop: '-6rem' }}
        >
          <div className="pt-24 pb-8 px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center text-red-400">
                <h2 className="text-2xl font-bold mb-4">오류 발생</h2>
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const { overview, rankings, distributions, allClans } = analyticsData;

  // 페이지네이션 계산
  const totalPages = Math.ceil(allClans.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClans = allClans.slice(startIndex, endIndex);

  // 페이지 변경 함수
  const handlePageChange = (page) => {
    setCurrentPage(page);
    // 페이지 변경 시 스크롤을 전체 클랜 목록 섹션으로 이동
    const clanListElement = document.getElementById('clan-list-section');
    if (clanListElement) {
      clanListElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 페이지네이션 버튼 생성
  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 10;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // 끝 페이지가 총 페이지보다 작으면 시작 페이지 조정
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // 이전 페이지 버튼
    if (currentPage > 1) {
      buttons.push(
        <button
          key="prev"
          onClick={() => handlePageChange(currentPage - 1)}
          className="px-3 py-2 mx-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
        >
          ←
        </button>
      );
    }

    // 첫 페이지 (시작 페이지가 1이 아닐 때)
    if (startPage > 1) {
      buttons.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className="px-3 py-2 mx-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
        >
          1
        </button>
      );
      if (startPage > 2) {
        buttons.push(
          <span key="dots1" className="px-2 py-2 mx-1 text-gray-400">
            ...
          </span>
        );
      }
    }

    // 페이지 번호 버튼들
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-2 mx-1 rounded-lg transition-colors ${
            currentPage === i
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
        >
          {i}
        </button>
      );
    }

    // 마지막 페이지 (끝 페이지가 총 페이지가 아닐 때)
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(
          <span key="dots2" className="px-2 py-2 mx-1 text-gray-400">
            ...
          </span>
        );
      }
      buttons.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className="px-3 py-2 mx-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
        >
          {totalPages}
        </button>
      );
    }

    // 다음 페이지 버튼
    if (currentPage < totalPages) {
      buttons.push(
        <button
          key="next"
          onClick={() => handlePageChange(currentPage + 1)}
          className="px-3 py-2 mx-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
        >
          →
        </button>
      );
    }

    return buttons;
  };

  return (
    <Layout>
      <div
        className="min-h-screen bg-gray-900 text-white overflow-visible"
        style={{ paddingTop: '0', marginTop: '-6rem' }}
      >
        <div className="pt-24 pb-8 px-8">
          <div className="max-w-6xl mx-auto overflow-visible">
            {/* 헤더 */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2">🏆 클랜 종합 분석</h1>
              <p className="text-gray-400">
                PUBG 클랜들의 통계와 랭킹을 확인하세요
              </p>
            </div>

            {/* 필터 섹션 */}
            <div className="mb-8 bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">🔍 필터 & 검색</h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* 지역 필터 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    🌍 지역 필터
                  </label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ALL">전체 지역</option>
                    <option value="KR">🇰🇷 한국</option>
                    <option value="CN">🇨🇳 중국</option>
                    <option value="JP">🇯🇵 일본</option>
                    <option value="RU">🇷🇺 러시아</option>
                    <option value="EU">🇪🇺 유럽</option>
                    <option value="NA">🇺🇸 북미</option>
                    <option value="SEA">🌏 동남아시아</option>
                    <option value="BR">🇧🇷 브라질</option>
                    <option value="ME">🌍 중동</option>
                    <option value="MIXED">🌐 혼합/국제</option>
                    <option value="UNKNOWN">❓ 미분류</option>
                  </select>
                </div>

                {/* 한국 클랜 전용 필터 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    🇰🇷 한국 클랜 필터
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isKoreanOnly}
                        onChange={(e) => setIsKoreanOnly(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-300">
                        한국 클랜만 표시
                      </span>
                    </label>
                  </div>
                </div>

                {/* 검색 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    🔎 클랜 검색
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="클랜명 또는 태그 입력..."
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleSearch}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                    >
                      검색
                    </button>
                  </div>
                </div>
              </div>

              {/* 현재 필터 상태 표시 */}
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedRegion !== 'ALL' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
                    지역: {selectedRegion}
                    <button
                      onClick={() => setSelectedRegion('ALL')}
                      className="ml-2 text-blue-200 hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                )}
                {isKoreanOnly && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-600 text-white">
                    🇰🇷 한국 클랜만
                    <button
                      onClick={() => setIsKoreanOnly(false)}
                      className="ml-2 text-green-200 hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            </div>

            {/* 검색 결과 모달 */}
            {showSearchResult && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">검색 결과</h3>
                    <button
                      onClick={closeSearchResult}
                      className="text-gray-400 hover:text-white text-2xl"
                    >
                      ×
                    </button>
                  </div>

                  {searchResult?.notFound ? (
                    <div className="text-center py-4">
                      <p className="text-gray-400 mb-2">
                        클랜을 찾을 수 없습니다
                      </p>
                      <p className="text-sm text-gray-500">
                        클랜명이나 태그를 다시 확인해주세요
                      </p>
                    </div>
                  ) : searchResult ? (
                    <div className="space-y-4">
                      <div className="text-center">
                        <div
                          className={`text-3xl font-bold mb-2 ${
                            searchResult.rank === 1
                              ? 'text-yellow-400'
                              : searchResult.rank === 2
                                ? 'text-gray-300'
                                : searchResult.rank === 3
                                  ? 'text-orange-400'
                                  : 'text-white'
                          }`}
                        >
                          #{searchResult.rank}위
                        </div>
                        <h4 className="text-xl font-semibold">
                          {searchResult.name}
                        </h4>
                        <p className="text-gray-400">{searchResult.tag}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-gray-700 rounded p-3">
                          <div className="text-gray-400">평균 점수</div>
                          <div className="text-lg font-bold text-blue-400">
                            {searchResult.avgStats.score}
                          </div>
                        </div>
                        <div className="bg-gray-700 rounded p-3">
                          <div className="text-gray-400">멤버 수</div>
                          <div className="text-lg font-bold text-green-400">
                            {searchResult.apiMemberCount}명
                          </div>
                        </div>
                        <div className="bg-gray-700 rounded p-3">
                          <div className="text-gray-400">평균 데미지</div>
                          <div className="text-lg font-bold text-orange-400">
                            {searchResult.avgStats.damage}
                          </div>
                        </div>
                        <div className="bg-gray-700 rounded p-3">
                          <div className="text-gray-400">승률</div>
                          <div className="text-lg font-bold text-purple-400">
                            {searchResult.avgStats.winRate}%
                          </div>
                        </div>
                      </div>

                      {searchResult.playStyle && (
                        <div className="bg-gray-700 rounded p-3">
                          <div className="text-gray-400 text-sm mb-2">
                            플레이 스타일
                          </div>
                          <PlayStyleBadge
                            style={searchResult.playStyle.primary}
                            className="bg-blue-600 text-white"
                          />
                          {searchResult.playStyle.special && (
                            <span className="ml-2 bg-purple-600 px-2 py-1 rounded text-xs font-semibold text-white">
                              ⭐ {searchResult.playStyle.special}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* 상위 클랜 랭킹 */}
            <div className="mb-8">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    🥇 클랜 랭킹 TOP 10 (평균 점수 기준)
                  </h2>
                  <RankingUpdateStatus />
                </div>
                <ManualUpdateButton />
              </div>
              <div className="bg-gray-800 rounded-lg overflow-visible">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">순위</th>
                      <th className="px-4 py-3 text-left">클랜</th>
                      <th className="px-4 py-3 text-left">
                        <Tooltip
                          content={
                            <div className="text-left">
                              <div className="font-semibold text-yellow-400 mb-1">
                                ⚠️ 지역 분류 정보
                              </div>
                              <div className="text-sm mb-2">
                                자동 분석 기반 추정 지역
                              </div>
                              <div className="text-xs space-y-1">
                                <div>
                                  • 클랜명, 멤버 닉네임 등을 분석하여 추정
                                </div>
                                <div>
                                  • 아직 완전히 통합되지 않은 데이터입니다
                                </div>
                                <div>
                                  • 일부 클랜은 정확하지 않을 수 있습니다
                                </div>
                              </div>
                            </div>
                          }
                        >
                          <span className="cursor-help border-b border-dotted border-gray-400">
                            지역
                          </span>
                        </Tooltip>
                      </th>
                      <th className="px-4 py-3 text-left">레벨</th>
                      <th className="px-4 py-3 text-left">멤버 수</th>
                      <th className="px-4 py-3 text-left">
                        <Tooltip
                          content={
                            <div className="text-left">
                              <div className="font-semibold text-yellow-400 mb-1">
                                MMR (Match Making Rating)
                              </div>
                              <div className="text-sm mb-2">
                                PKGG 사이트 정의 MMR 시스템
                              </div>
                              <div className="text-xs space-y-1">
                                <div>• 킬/데미지/생존시간 종합 평가</div>
                                <div>• 높을수록 실력이 우수함을 의미</div>
                                <div>• 클랜 멤버들의 평균 점수</div>
                              </div>
                            </div>
                          }
                        >
                          <span className="cursor-help border-b border-dotted border-gray-400">
                            평균 점수
                          </span>
                        </Tooltip>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <Tooltip content={MMR_DISCLAIMER}>
                          <span className="cursor-help border-b border-dotted border-gray-400">
                            클랜 MMR
                          </span>
                        </Tooltip>
                      </th>
                      <th className="px-4 py-3 text-left">평균 데미지</th>
                      <th className="px-4 py-3 text-left">승률</th>
                      <th className="px-4 py-3 text-left">플레이 스타일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.topClansByScore.map((clan, index) => (
                      <tr key={clan.id} className="border-t border-gray-700">
                        <td className="px-4 py-3">
                          <span
                            className={`font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-400' : 'text-white'}`}
                          >
                            #{index + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <Link
                              href={`/clan/${encodeURIComponent(clan.name)}`}
                              className="font-semibold hover:text-blue-400 transition-colors cursor-pointer"
                            >
                              {clan.name}
                            </Link>
                            <div className="text-sm text-gray-400">
                              {clan.tag}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {clan.region ? (
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                                clan.region === 'KR'
                                  ? 'bg-blue-600 text-white'
                                  : clan.region === 'CN'
                                    ? 'bg-red-600 text-white'
                                    : clan.region === 'JP'
                                      ? 'bg-purple-600 text-white'
                                      : clan.region === 'EU'
                                        ? 'bg-green-600 text-white'
                                        : clan.region === 'NA'
                                          ? 'bg-orange-600 text-white'
                                          : clan.region === 'MIXED'
                                            ? 'bg-yellow-600 text-black'
                                            : 'bg-gray-600 text-white'
                              }`}
                            >
                              {clan.region === 'KR'
                                ? '🇰🇷 한국'
                                : clan.region === 'CN'
                                  ? '🇨🇳 중국'
                                  : clan.region === 'JP'
                                    ? '🇯🇵 일본'
                                    : clan.region === 'RU'
                                      ? '🇷🇺 러시아'
                                      : clan.region === 'EU'
                                        ? '🇪🇺 유럽'
                                        : clan.region === 'NA'
                                          ? '🇺🇸 북미'
                                          : clan.region === 'SEA'
                                            ? '🌏 동남아'
                                            : clan.region === 'BR'
                                              ? '🇧🇷 브라질'
                                              : clan.region === 'ME'
                                                ? '🌍 중동'
                                                : clan.region === 'MIXED'
                                                  ? '🌐 혼합'
                                                  : '❓ 미분류'}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{clan.level}</td>
                        <td className="px-4 py-3">
                          <span className="text-blue-400">
                            {clan.apiMemberCount}명
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-blue-400">
                          {clan.avgStats.score}
                        </td>
                        <td className="px-4 py-3">
                          {clan.avgStats.avgMMR ? (() => {
                            const tier = getMMRTier(clan.avgStats.avgMMR);
                            return (
                              <Tooltip content={MMR_DISCLAIMER}>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border cursor-help text-xs font-bold ${tier.bgColor} ${tier.borderColor} ${tier.textColor}`}>
                                  {tier.emoji} {clan.avgStats.avgMMR.toLocaleString()}
                                </span>
                              </Tooltip>
                            );
                          })() : '-'}
                        </td>
                        <td className="px-4 py-3">{clan.avgStats.damage}</td>
                        <td className="px-4 py-3">{clan.avgStats.winRate}%</td>
                        <td className="px-4 py-3">
                          {clan.playStyle ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <PlayStyleBadge
                                  style={clan.playStyle.primary}
                                />
                                {clan.playStyle.special && (
                                  <Tooltip
                                    content={`특수 특성: ${clan.playStyle.special}`}
                                  >
                                    <span className="bg-purple-600 px-2 py-1 rounded text-xs font-semibold text-white">
                                      ⭐ {clan.playStyle.special}
                                    </span>
                                  </Tooltip>
                                )}
                              </div>
                              <div className="text-xs text-gray-400">
                                {clan.playStyle.secondary} | 지배율:{' '}
                                {clan.playStyle.dominance}%
                              </div>
                              <div className="text-xs text-gray-300">
                                다양성: {clan.playStyle.variety}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 분포 통계 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* 레벨별 분포 */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">📊 클랜 레벨별 분포</h3>
                <div className="space-y-3">
                  {Object.entries(distributions.byLevel).map(
                    ([level, count]) => (
                      <div
                        key={level}
                        className="flex justify-between items-center"
                      >
                        <span>레벨 {level}</span>
                        <div className="flex items-center">
                          <div className="bg-gray-700 rounded-full h-2 w-24 mr-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{
                                width: `${(count / overview.totalClans) * 100}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm">{count}개</span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* 규모별 분포 */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">👥 클랜 규모별 분포</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>소형 (≤10명)</span>
                    <div className="flex items-center">
                      <div className="bg-gray-700 rounded-full h-2 w-24 mr-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${(distributions.byMemberCount.small / overview.totalClans) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm">
                        {distributions.byMemberCount.small}개
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>중형 (11-30명)</span>
                    <div className="flex items-center">
                      <div className="bg-gray-700 rounded-full h-2 w-24 mr-2">
                        <div
                          className="bg-yellow-500 h-2 rounded-full"
                          style={{
                            width: `${(distributions.byMemberCount.medium / overview.totalClans) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm">
                        {distributions.byMemberCount.medium}개
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>대형 (31명+)</span>
                    <div className="flex items-center">
                      <div className="bg-gray-700 rounded-full h-2 w-24 mr-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{
                            width: `${(distributions.byMemberCount.large / overview.totalClans) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm">
                        {distributions.byMemberCount.large}개
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 전체 클랜 목록 */}
            <div id="clan-list-section" className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">📋 전체 클랜 목록</h2>
                <div className="text-sm text-gray-400">
                  총 {allClans.length}개 클랜 중 {startIndex + 1}-
                  {Math.min(endIndex, allClans.length)}번째 표시
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg overflow-visible">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">순번</th>
                      <th className="px-4 py-3 text-left">클랜명</th>
                      <th className="px-4 py-3 text-left">태그</th>
                      <th className="px-4 py-3 text-left">레벨</th>
                      <th className="px-4 py-3 text-left">멤버 수</th>
                      <th className="px-4 py-3 text-left">
                        <Tooltip
                          content={
                            <div className="text-left">
                              <div className="font-semibold text-yellow-400 mb-1">
                                MMR (Match Making Rating)
                              </div>
                              <div className="text-sm mb-2">
                                PKGG 사이트 정의 MMR 시스템
                              </div>
                              <div className="text-xs space-y-1">
                                <div>• 킬/데미지/생존시간 종합 평가</div>
                                <div>• 높을수록 실력이 우수함을 의미</div>
                                <div>• 클랜 멤버들의 평균 점수</div>
                              </div>
                            </div>
                          }
                        >
                          <span className="cursor-help border-b border-dotted border-gray-400">
                            평균 점수
                          </span>
                        </Tooltip>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <Tooltip content={MMR_DISCLAIMER}>
                          <span className="cursor-help border-b border-dotted border-gray-400">
                            클랜 MMR
                          </span>
                        </Tooltip>
                      </th>
                      <th className="px-4 py-3 text-left">플레이 스타일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentClans.map((clan, index) => (
                      <tr key={clan.id} className="border-t border-gray-700">
                        <td className="px-4 py-3 text-gray-400 font-mono">
                          {startIndex + index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/clan/${encodeURIComponent(clan.name)}`}
                            className="font-semibold hover:text-blue-400 transition-colors cursor-pointer"
                          >
                            {clan.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-gray-700 px-2 py-1 rounded text-sm">
                            {clan.tag}
                          </span>
                        </td>
                        <td className="px-4 py-3">{clan.level}</td>
                        <td className="px-4 py-3">
                          <span className="text-green-400 font-semibold">
                            {clan.apiMemberCount}명
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {clan.avgStats ? (
                            <span className="font-semibold">
                              {clan.avgStats.score}
                            </span>
                          ) : (
                            <span className="text-gray-500">데이터 없음</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {clan.avgStats?.avgMMR ? (() => {
                            const tier = getMMRTier(clan.avgStats.avgMMR);
                            return (
                              <Tooltip content={MMR_DISCLAIMER}>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border cursor-help text-xs font-bold ${tier.bgColor} ${tier.borderColor} ${tier.textColor}`}>
                                  {tier.emoji} {clan.avgStats.avgMMR.toLocaleString()}
                                </span>
                              </Tooltip>
                            );
                          })() : <span className="text-gray-500">-</span>}
                        </td>
                        <td className="px-4 py-3">
                          {clan.playStyle ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <PlayStyleBadge
                                  style={clan.playStyle.primary}
                                />
                                <span className="text-gray-400 text-xs">
                                  {clan.playStyle.secondary}
                                </span>
                                {clan.playStyle.special && (
                                  <Tooltip
                                    content={`특수 특성: ${clan.playStyle.special}`}
                                  >
                                    <span className="bg-purple-600 px-2 py-1 rounded text-xs font-semibold text-white">
                                      ⭐ {clan.playStyle.special}
                                    </span>
                                  </Tooltip>
                                )}
                              </div>
                              <div className="text-xs text-gray-400">
                                다양성: {clan.playStyle.variety} | 지배율:{' '}
                                {clan.playStyle.dominance}%
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">
                              분석 불가
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center items-center">
                  <div className="flex items-center bg-gray-800 rounded-lg p-2">
                    {renderPaginationButtons()}
                  </div>
                </div>
              )}

              {/* 페이지네이션 정보 */}
              {totalPages > 1 && (
                <div className="mt-4 text-center text-sm text-gray-400">
                  페이지 {currentPage} / {totalPages} (전체 {allClans.length}개
                  클랜)
                </div>
              )}
            </div>

            {/* 새로고침 버튼 */}
            <div className="text-center">
              <button
                onClick={fetchAnalytics}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                🔄 데이터 새로고침
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
