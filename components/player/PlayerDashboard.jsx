import Link from 'next/link';
import { useState } from 'react';

function StatCard({ title, value, sub, accent = 'blue' }) {
  const accentColors = {
    blue:   'border-blue-400 bg-blue-50',
    green:  'border-green-400 bg-green-50',
    purple: 'border-purple-400 bg-purple-50',
    orange: 'border-orange-400 bg-orange-50',
    pink:   'border-pink-400 bg-pink-50',
    indigo: 'border-indigo-400 bg-indigo-50',
  };
  const textColors = {
    blue:   'text-blue-700',
    green:  'text-green-700',
    purple: 'text-purple-700',
    orange: 'text-orange-700',
    pink:   'text-pink-700',
    indigo: 'text-indigo-700',
  };

  return (
    <div className={`border-l-4 ${accentColors[accent]} rounded-xl p-4 border border-gray-100`}>
      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textColors[accent]}`}>{title}</div>
      <div className="text-base font-bold text-gray-900 leading-snug">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function PlayerDashboard({
  profile,
  summary,
  clanAverage,
  clanMembers,
  clanTier,
  synergyTop,
  clanSynergyStatusList,
  bestSquad,
  seasonStats,
  aboveAvgWithClan,
}) {
  const synergyStatus =
    clanSynergyStatusList && clanSynergyStatusList.length > 0
      ? clanSynergyStatusList.sort((a, b) => (a === '좋음' ? -1 : 1))[0]
      : '-';

  const getSynergyDisplay = (status) => {
    if (status === '좋음') return { emoji: '😊', text: '좋음', color: 'text-emerald-600' };
    if (status === '나쁨') return { emoji: '😞', text: '나쁨', color: 'text-red-500' };
    if (status === '분석 필요') return { emoji: '⏳', text: '분석 필요', color: 'text-amber-500' };
    if (status === '혼자') return { emoji: '🧑‍💼', text: '솔로 클랜', color: 'text-gray-500' };
    return { emoji: '😐', text: '보통', color: 'text-gray-600' };
  };

  const clanName =
    profile.clan && typeof profile.clan === 'object' && 'name' in profile.clan
      ? profile.clan.name
      : (profile.clan ?? '-');

  const clanTag =
    profile.clan && typeof profile.clan === 'object' ? profile.clan.tag : null;

  const clanAverageValue =
    typeof clanAverage === 'number'
      ? clanAverage
      : typeof clanAverage === 'object' && clanAverage !== null
        ? Object.values(clanAverage)[0]
        : null;

  const hasValidClan =
    clanName && clanName !== '-' && clanName !== '무소속' && clanName !== 'N/A';
  const hasClanMembers = clanMembers && clanMembers.length > 0;
  const hasSynergyData = synergyTop && synergyTop.length > 0;
  const showClanAnalysis = hasValidClan;
  const synergyInfo = getSynergyDisplay(synergyStatus);

  return (
    <div>
      {showClanAnalysis ? (
        <div className="space-y-5">
          {/* 클랜 기본 정보 헤더 */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-black flex-shrink-0">
              {clanTag ? clanTag.charAt(0).toUpperCase() : '🏰'}
            </div>
            <div>
              <div className="text-xs text-blue-500 font-semibold uppercase tracking-wide">소속 클랜</div>
              <div className="text-lg font-black text-gray-900">
                {clanTag && <span className="text-blue-600 mr-1">[{clanTag}]</span>}
                {clanName}
              </div>
              {profile.clan?.level && (
                <div className="text-xs text-gray-500">레벨 {profile.clan.level}</div>
              )}
            </div>
            {/* 클랜 시너지 상태 */}
            <div className="ml-auto text-right">
              <div className="text-xs text-gray-400 mb-0.5">클랜 시너지</div>
              <div className={`text-base font-bold ${synergyInfo.color} flex items-center gap-1 justify-end`}>
                <span>{synergyInfo.emoji}</span>
                <span>{synergyInfo.text}</span>
              </div>
            </div>
          </div>

          {/* 스탯 카드 그리드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              title="클랜 내 티어"
              value={profile.clanTier ?? clanTier ?? '-'}
              accent="purple"
            />
            <StatCard
              title="클랜원과 딜량"
              value={clanAverageValue > 0 ? clanAverageValue : '데이터 없음'}
              sub={clanAverageValue > 0 ? '함께할 때 평균' : undefined}
              accent="green"
            />
            <StatCard
              title="클랜원 수"
              value={hasClanMembers ? `${clanMembers.length}명` : '-'}
              sub={hasClanMembers ? '데이터 보유' : '정보 없음'}
              accent="blue"
            />
            <StatCard
              title="시너지 상태"
              value={
                <span className={synergyInfo.color}>
                  {synergyInfo.emoji} {synergyInfo.text}
                </span>
              }
              accent="pink"
            />
          </div>

          {/* 함께한 클랜원 TOP */}
          {hasSynergyData && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                함께한 클랜원 TOP {synergyTop.length}
              </div>
              <div className="flex flex-wrap gap-2">
                {synergyTop.map((p, index) => (
                  <Link key={p.name} href={`/player/steam/${encodeURIComponent(p.name)}`}>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all cursor-pointer shadow-sm">
                      <span className="text-gray-400 text-xs">{index + 1}.</span>
                      {p.name}
                      {p.togetherCount > 0 && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                          {p.togetherCount}회
                        </span>
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 클랜원 목록 (데이터 있을 경우) */}
          {hasClanMembers && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                클랜원 목록
              </div>
              <div className="flex flex-wrap gap-1.5">
                {clanMembers.slice(0, 15).map((m) => (
                  <Link key={m.id || m.nickname} href={`/player/steam/${encodeURIComponent(m.nickname)}`}>
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all border ${
                      m.nickname === profile?.nickname
                        ? 'bg-blue-100 text-blue-700 border-blue-200 font-bold'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}>
                      {m.nickname === profile?.nickname && <span className="mr-1">👤</span>}
                      {m.nickname}
                    </span>
                  </Link>
                ))}
                {clanMembers.length > 15 && (
                  <span className="inline-block px-2.5 py-1 rounded-full text-xs text-gray-400 border border-dashed border-gray-300">
                    +{clanMembers.length - 15}명
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      ) : hasValidClan ? (
        <div className="flex flex-col items-center justify-center py-10 px-6 bg-amber-50 border border-amber-200 rounded-xl text-center">
          <div className="text-4xl mb-3">🏰</div>
          <div className="text-base font-bold text-amber-800 mb-1">클랜: {clanName}</div>
          <div className="text-sm text-amber-600">클랜원 정보가 데이터베이스에 아직 없습니다.</div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 px-6 bg-gray-50 border border-gray-200 rounded-xl text-center">
          <div className="text-4xl mb-3">🏰</div>
          <div className="text-base font-semibold text-gray-600 mb-1">클랜 미소속</div>
          <div className="text-sm text-gray-400">클랜에 소속되어 있지 않습니다.</div>
        </div>
      )}
    </div>
  );
}
