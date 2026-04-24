import React, { useState } from 'react';
import MatchDetailCard from './MatchDetailCard.jsx';
import { getMapName } from '../../utils/mapUtils';

// 팀원 퍼포먼스 점수 계산 (0~100)
// damage 40점 + kills 40점 + assists 12점 + 생존 8점
function calcPerfScore(t) {
  const dmgPts      = Math.min((t.damage || 0) / 500, 1) * 40;
  const killPts     = Math.min((t.kills || 0), 5) * 8;
  const assistPts   = Math.min((t.assists || 0), 4) * 3;
  const survivePts  = Math.min((t.survivalTime || 0) / 1800, 1) * 8;
  return Math.round(dmgPts + killPts + assistPts + survivePts);
}

function getPerfGrade(score) {
  if (score >= 70) return { grade: 'S', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-300' };
  if (score >= 55) return { grade: 'A', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-300' };
  if (score >= 40) return { grade: 'B', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-300' };
  if (score >= 25) return { grade: 'C', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-gray-300' };
  return               { grade: 'D', color: 'bg-red-50 text-red-400 dark:bg-red-900/20 dark:text-red-400 border border-red-200' };
}

export default function MatchDetailExpandable({ match }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`match-expandable-card${open ? ' open' : ''}`}>
      <div className="match-expandable-header flex items-center justify-between gap-2">
        <div className="flex-1">
          <MatchDetailCard match={match} />
        </div>
        <button
          className={`expand-arrow-btn${open ? ' open' : ''}`}
          aria-label={open ? '상세 닫기' : '상세 열기'}
          onClick={() => setOpen((v) => !v)}
        >
          <span
            style={{
              display: 'inline-block',
              transition: 'transform 0.2s',
              transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            ▶
          </span>
        </button>
      </div>
      {open && (
        <div className="match-expandable-detail bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-t border-gray-200 dark:border-gray-700 p-6 mt-2 rounded-b-lg">
          {/* 경기 기본 정보 */}
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-3 text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
              📊 경기 상세 정보
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600 shadow-sm">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  맵
                </div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {getMapName(match.mapName) || '알 수 없음'}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600 shadow-sm">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  모드
                </div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {match.mode || match.gameMode || '일반'}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600 shadow-sm">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  생존시간
                </div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {Math.floor(
                    (match.survivalTime || match.surviveTime || 0) / 60
                  )}
                  분 {(match.survivalTime || match.surviveTime || 0) % 60}초
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600 shadow-sm">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  경기 ID
                </div>
                <div className="font-mono text-xs text-gray-600 dark:text-gray-400 truncate">
                  {match.matchId ? match.matchId.slice(-8) : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* 팀원 상세 정보 */}
          {match.teammatesDetail && match.teammatesDetail.length > 0 && (
            <div>
              <h4 className="font-bold text-base mb-3 text-purple-700 dark:text-purple-300 flex items-center gap-2">
                👥 팀원 성과
              </h4>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <th className="p-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                        닉네임
                      </th>
                      <th className="p-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                        킬
                      </th>
                      <th className="p-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                        딜량
                      </th>
                      <th className="p-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                        어시스트
                      </th>
                      <th className="p-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                        생존시간
                      </th>
                      <th className="p-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                        퍼포먼스
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {match.teammatesDetail.map((teammate, index) => {
                      const score = calcPerfScore(teammate);
                      const { grade, color } = getPerfGrade(score);
                      return (
                        <tr
                          key={teammate.name || index}
                          className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${teammate.isSelf ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                        >
                          <td className="p-3 font-semibold text-gray-900 dark:text-gray-100">
                            <span className="flex items-center gap-1.5">
                              {teammate.isSelf && <span className="text-blue-500 text-xs font-bold">나</span>}
                              {teammate.name || '알 수 없음'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-1 rounded text-sm font-medium ${
                                (teammate.kills || 0) >= 3
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : (teammate.kills || 0) >= 1
                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                              }`}
                            >
                              {teammate.kills || 0}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono text-gray-700 dark:text-gray-300">
                            {teammate.damage ? Math.round(teammate.damage).toLocaleString() : '0'}
                          </td>
                          <td className="p-3 text-center text-gray-700 dark:text-gray-300">
                            {teammate.assists || 0}
                          </td>
                          <td className="p-3 text-center font-mono text-sm text-gray-600 dark:text-gray-400">
                            {Math.floor((teammate.survivalTime || 0) / 60)}:
                            {String((teammate.survivalTime || 0) % 60).padStart(2, '0')}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`px-2 py-0.5 rounded text-xs font-black ${color}`}>
                                {grade}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono">{score}점</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 팀원 정보가 없는 경우 */}
          {(!match.teammatesDetail || match.teammatesDetail.length === 0) && (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">👥</div>
              <div className="text-gray-500 dark:text-gray-400">
                팀원 정보를 불러올 수 없습니다
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                솔로 모드이거나 데이터가 제한적일 수 있습니다
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
