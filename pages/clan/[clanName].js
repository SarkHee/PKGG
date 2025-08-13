// pages/clan/[clanName].js
// 클랜 상세 페이지

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';

// 플레이스타일 아이콘 및 설명 매핑
const playStyleConfig = {
  '극단적 공격형': {
    icon: '💀',
    description: '최고 딜량과 킬을 추구하는 초공격적 플레이스타일',
    color: 'bg-black text-white'
  },
  '핫드롭 마스터': {
    icon: '🌋',
    description: '극초반 높은 킬수와 딜량으로 핫드롭을 제압하는 스타일',
    color: 'bg-orange-500 text-white'
  },
  '스피드 파이터': {
    icon: '⚡',
    description: '짧은 시간 내에 높은 킬수를 달성하는 빠른 전투 스타일',
    color: 'bg-yellow-500 text-black'
  },
  '초반 어그로꾼': {
    icon: '🔥',
    description: '매우 짧은 생존시간에도 높은 딜량을 뽑아내는 공격적 스타일',
    color: 'bg-orange-600 text-white'
  },
  '빠른 청소부': {
    icon: '🧹',
    description: '초반에 적당한 교전으로 빠르게 정리하는 효율적 스타일',
    color: 'bg-green-500 text-white'
  },
  '초반 돌격형': {
    icon: '🚀',
    description: '게임 시작부터 적극적인 교전을 벌이는 기본 돌격 스타일',
    color: 'bg-red-600 text-white'
  },
  '극단적 수비형': {
    icon: '🛡️',
    description: '교전을 최대한 피하고 안전한 플레이를 선호하는 스타일',
    color: 'bg-gray-600 text-white'
  },
  '후반 존버형': {
    icon: '🏕️',
    description: '초반 교전을 피하고 후반 랭킹에 집중하는 스타일',
    color: 'bg-brown-500 text-white'
  },
  '장거리 정찰러': {
    icon: '🏃',
    description: '넓은 맵 이동과 정찰을 중시하는 플레이스타일',
    color: 'bg-teal-500 text-white'
  },
  '저격 위주': {
    icon: '🎯',
    description: '원거리 저격과 정밀한 교전을 선호하는 스타일',
    color: 'bg-purple-600 text-white'
  },
  '중거리 안정형': {
    icon: '⚖️',
    description: '중거리 교전에서 안정적인 성과를 내는 플레이스타일',
    color: 'bg-indigo-500 text-white'
  },
  '지속 전투형': {
    icon: '🔥',
    description: '긴 교전을 통해 높은 딜량과 킬을 확보하는 스타일',
    color: 'bg-pink-600 text-white'
  },
  '유령 생존자': {
    icon: '👻',
    description: '교전 없이도 높은 순위를 달성하는 신비로운 스타일',
    color: 'bg-slate-700 text-white'
  },
  '도박형 파밍러': {
    icon: '🪂',
    description: '위험한 지역에서 빠른 파밍을 시도하는 모험적 스타일',
    color: 'bg-amber-500 text-black'
  },
  '순간광폭형': {
    icon: '⚡',
    description: '짧은 시간에 폭발적인 화력을 집중하는 스타일',
    color: 'bg-violet-600 text-white'
  },
  '치명적 저격수': {
    icon: '🦅',
    description: '높은 킬과 딜량으로 적을 제압하는 정밀 스타일',
    color: 'bg-rose-600 text-white'
  },
  '전략적 어시스트러': {
    icon: '🧠',
    description: '팀워크와 어시스트를 중시하는 협력형 스타일',
    color: 'bg-emerald-600 text-white'
  },
  '고효율 승부사': {
    icon: '📊',
    description: '적은 딜량으로도 많은 킬을 달성하는 효율형 스타일',
    color: 'bg-cyan-600 text-white'
  },
  '공격형': {
    icon: '⚔️',
    description: '전반적으로 공격적인 성향을 보이는 플레이스타일',
    color: 'bg-red-400 text-white'
  },
  '생존형': {
    icon: '🛡️',
    description: '생존과 안정성을 중시하는 플레이스타일',
    color: 'bg-gray-500 text-white'
  },
  '이동형': {
    icon: '🏃‍♂️',
    description: '이동과 포지셔닝을 중시하는 플레이스타일',
    color: 'bg-lime-500 text-black'
  },
  '혼합': {
    icon: '🌀',
    description: '다양한 스타일이 혼재하는 복합적 플레이스타일',
    color: 'bg-neutral-600 text-white'
  }
};

// 툴팁 컴포넌트
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
const PlayStyleBadge = ({ style, className = "", showDescription = true }) => {
  const config = playStyleConfig[style] || playStyleConfig['혼합'];
  
  const badge = (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${config.color} ${className}`}>
      <span className="text-sm">{config.icon}</span>
      {style}
    </span>
  );

  if (showDescription) {
    return (
      <Tooltip content={config.description}>
        {badge}
      </Tooltip>
    );
  }

  return badge;
};

// 통계 카드 컴포넌트
const StatCard = ({ icon, title, value, subtitle, color = "text-white" }) => (
  <div className="bg-gray-800 rounded-lg p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-2xl">{icon}</span>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
    <div className="text-sm text-gray-300">{title}</div>
    {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
  </div>
);

export default function ClanDetail() {
  const router = useRouter();
  const { clanName } = router.query;
  
  const [clanData, setClanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!clanName) return;
    fetchClanData();
  }, [clanName]);

  const fetchClanData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/clan/${encodeURIComponent(clanName)}`);
      
      // 응답이 JSON인지 확인
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('서버에서 올바르지 않은 응답을 받았습니다');
      }
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('클랜을 찾을 수 없습니다');
        }
        throw new Error(`클랜 데이터를 가져올 수 없습니다 (${response.status})`);
      }
      
      const data = await response.json();
      setClanData(data);
    } catch (err) {
      console.error('Clan fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-900 text-white" style={{ paddingTop: '0', marginTop: '-5rem' }}>
          <div className="pt-24 pb-8 px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-xl">클랜 정보 로딩 중...</p>
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
        <div className="min-h-screen bg-gray-900 text-white" style={{ paddingTop: '0', marginTop: '-5rem' }}>
          <div className="pt-24 pb-8 px-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center">
                <div className="text-red-400 mb-4">
                  <h2 className="text-2xl font-bold mb-2">오류 발생</h2>
                  <p className="mb-4">{error}</p>
                </div>
                <Link 
                  href="/clan-analytics"
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  ← 클랜 분석으로 돌아가기
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const { clan, ranking, members, stats } = clanData;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-900 text-white" style={{ paddingTop: '0', marginTop: '-5rem' }}>
        <div className="pt-24 pb-8 px-8">
          <div className="max-w-6xl mx-auto">
            
            {/* 뒤로 가기 버튼 */}
            <div className="mb-6">
              <Link 
                href="/clan-analytics"
                className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                클랜 분석으로 돌아가기
              </Link>
            </div>

            {/* 클랜 헤더 */}
            <div className="bg-gray-800 rounded-lg p-6 mb-8">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center">
                <div className="mb-4 lg:mb-0">
                  <div className="flex items-center gap-4 mb-2">
                    <h1 className="text-4xl font-bold">{clan.name}</h1>
                    {ranking && (
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        ranking.overall === 1 ? 'bg-yellow-500 text-black' :
                        ranking.overall <= 3 ? 'bg-gray-400 text-black' :
                        ranking.overall <= 10 ? 'bg-orange-500 text-white' :
                        'bg-blue-600 text-white'
                      }`}>
                        #{ranking.overall}위
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-gray-400">
                    <span className="bg-gray-700 px-3 py-1 rounded text-lg font-mono">{clan.tag}</span>
                    <span>레벨 {clan.level}</span>
                    <span>{clan.apiMemberCount}명</span>
                    {clan.region && (
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                        clan.region === 'KR' ? 'bg-blue-600 text-white' :
                        clan.region === 'CN' ? 'bg-red-600 text-white' :
                        clan.region === 'JP' ? 'bg-purple-600 text-white' :
                        clan.region === 'EU' ? 'bg-green-600 text-white' :
                        clan.region === 'NA' ? 'bg-orange-600 text-white' :
                        clan.region === 'MIXED' ? 'bg-yellow-600 text-black' :
                        'bg-gray-600 text-white'
                      }`}>
                        {clan.region === 'KR' ? '🇰🇷 한국' :
                         clan.region === 'CN' ? '🇨🇳 중국' :
                         clan.region === 'JP' ? '🇯🇵 일본' :
                         clan.region === 'RU' ? '🇷🇺 러시아' :
                         clan.region === 'EU' ? '🇪🇺 유럽' :
                         clan.region === 'NA' ? '🇺🇸 북미' :
                         clan.region === 'SEA' ? '🌏 동남아' :
                         clan.region === 'BR' ? '🇧🇷 브라질' :
                         clan.region === 'ME' ? '🌍 중동' :
                         clan.region === 'MIXED' ? '🌐 혼합' :
                         '❓ 미분류'}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* 플레이 스타일 */}
                {clan.playStyle && (
                  <div className="text-right">
                    <div className="text-sm text-gray-400 mb-2">플레이 스타일</div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 justify-end">
                        <PlayStyleBadge style={clan.playStyle.primary} />
                        {clan.playStyle.special && (
                          <span className="bg-purple-600 px-2 py-1 rounded text-xs font-semibold text-white">
                            ⭐ {clan.playStyle.special}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        부스타일: {clan.playStyle.secondary}
                      </div>
                      <div className="text-xs text-gray-400">
                        지배율: {clan.playStyle.dominance}% | 다양성: {clan.playStyle.variety}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 탭 네비게이션 */}
            <div className="mb-8">
              <div className="border-b border-gray-700">
                <nav className="-mb-px flex space-x-8">
                  {[
                    { id: 'overview', name: '📊 개요', icon: '📊' },
                    { id: 'members', name: '👥 멤버', icon: '👥' },
                    { id: 'stats', name: '📈 통계', icon: '📈' },
                    { id: 'analysis', name: '🔍 분석', icon: '🔍' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      {tab.name}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* 탭 컨텐츠 */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* 핵심 통계 */}
                <div>
                  <h2 className="text-2xl font-bold mb-4">🏆 핵심 통계</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                      icon="🎯"
                      title="평균 MMR"
                      value={stats?.avgScore || 'N/A'}
                      subtitle="클랜 멤버 평균"
                      color="text-blue-400"
                    />
                    <StatCard
                      icon="💥"
                      title="평균 데미지"
                      value={stats?.avgDamage || 'N/A'}
                      subtitle="게임당 평균"
                      color="text-orange-400"
                    />
                    <StatCard
                      icon="👑"
                      title="승률"
                      value={stats?.winRate ? `${stats.winRate}%` : 'N/A'}
                      subtitle="전체 게임 기준"
                      color="text-green-400"
                    />
                    <StatCard
                      icon="🏅"
                      title="전체 순위"
                      value={ranking?.overall ? `#${ranking.overall}` : 'N/A'}
                      subtitle="전체 클랜 중"
                      color="text-purple-400"
                    />
                  </div>
                </div>

                {/* 클랜 정보 */}
                <div>
                  <h2 className="text-2xl font-bold mb-4">ℹ️ 클랜 정보</h2>
                  <div className="bg-gray-800 rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-blue-400">기본 정보</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">클랜 ID:</span>
                            <span className="font-mono">{clan.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">생성일:</span>
                            <span>{clan.createdAt ? new Date(clan.createdAt).toLocaleDateString('ko-KR') : 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">마지막 업데이트:</span>
                            <span>{clan.updatedAt ? new Date(clan.updatedAt).toLocaleDateString('ko-KR') : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-green-400">순위 정보</h3>
                        <div className="space-y-2 text-sm">
                          {ranking && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-400">전체 순위:</span>
                                <span className="font-bold">#{ranking.overall}</span>
                              </div>
                              {ranking.regional && (
                                <div className="flex justify-between">
                                  <span className="text-gray-400">지역 순위:</span>
                                  <span className="font-bold">#{ranking.regional}</span>
                                </div>
                              )}
                              {ranking.byLevel && (
                                <div className="flex justify-between">
                                  <span className="text-gray-400">레벨별 순위:</span>
                                  <span className="font-bold">#{ranking.byLevel}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'members' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">👥 클랜 멤버 ({members?.length || 0}명)</h2>
                </div>
                
                {members && members.length > 0 ? (
                  <div className="bg-gray-800 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left">순위</th>
                          <th className="px-4 py-3 text-left">플레이어명</th>
                          <th className="px-4 py-3 text-left">MMR</th>
                          <th className="px-4 py-3 text-left">K/D</th>
                          <th className="px-4 py-3 text-left">승률</th>
                          <th className="px-4 py-3 text-left">최근 활동</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members
                          .sort((a, b) => (b.stats?.score || 0) - (a.stats?.score || 0))
                          .map((member, index) => (
                          <tr key={member.id} className="border-t border-gray-700">
                            <td className="px-4 py-3">
                              <span className={`font-bold ${
                                index === 0 ? 'text-yellow-400' :
                                index === 1 ? 'text-gray-300' :
                                index === 2 ? 'text-orange-400' : 'text-white'
                              }`}>
                                #{index + 1}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Link 
                                href={`/player/${encodeURIComponent(member.playerName)}`}
                                className="font-semibold hover:text-blue-400 transition-colors"
                              >
                                {member.playerName}
                              </Link>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-blue-400">
                                {member.stats?.score || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {member.stats?.kdRatio || 'N/A'}
                            </td>
                            <td className="px-4 py-3">
                              {member.stats?.winRate ? `${member.stats.winRate}%` : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-400">
                              {member.lastActiveAt ? 
                                new Date(member.lastActiveAt).toLocaleDateString('ko-KR') : 
                                'N/A'
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded-lg p-8 text-center">
                    <p className="text-gray-400">멤버 정보를 불러올 수 없습니다.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold">📈 상세 통계</h2>
                
                {/* 성과 트렌드 */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4">📊 성과 트렌드</h3>
                  <div className="text-center py-8 text-gray-400">
                    <p>성과 트렌드 차트는 향후 업데이트 예정입니다.</p>
                  </div>
                </div>

                {/* 모드별 성과 */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4">🎮 모드별 성과</h3>
                  <div className="text-center py-8 text-gray-400">
                    <p>모드별 성과 분석은 향후 업데이트 예정입니다.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analysis' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold">🔍 심화 분석</h2>
                
                {/* 팀워크 분석 */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4">🤝 팀워크 분석</h3>
                  <div className="text-center py-8 text-gray-400">
                    <p>팀워크 분석 기능은 향후 업데이트 예정입니다.</p>
                  </div>
                </div>

                {/* 비교 분석 */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4">⚖️ 동급 클랜 비교</h3>
                  <div className="text-center py-8 text-gray-400">
                    <p>클랜 비교 분석은 향후 업데이트 예정입니다.</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </Layout>
  );
}
