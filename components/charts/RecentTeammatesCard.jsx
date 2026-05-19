import React from 'react'

/**
 * 최근 경기 기준 자주 함께한 팀원 목록
 * props: matches (recentMatches), myNickname
 * 클랜 여부 무관하게 모든 팀원 집계
 */
export default function RecentTeammatesCard({ matches, myNickname }) {
  const teamMap = {}

  ;(matches || []).forEach((match) => {
    if (!Array.isArray(match.teammatesDetail)) return

    const myRank = match.rank || match.placement || match.winPlace || 0
    const isWin = match.win === true || match.win === 1 || myRank === 1
    const myDamage = match.damage ?? 0

    match.teammatesDetail.forEach((t) => {
      if (!t.name || t.isSelf || t.name === myNickname) return

      if (!teamMap[t.name]) {
        teamMap[t.name] = { games: 0, wins: 0, damageSum: 0, rankSum: 0, rankCount: 0 }
      }
      teamMap[t.name].games += 1
      teamMap[t.name].wins += isWin ? 1 : 0
      teamMap[t.name].damageSum += myDamage
      if (myRank > 0) {
        teamMap[t.name].rankSum += myRank
        teamMap[t.name].rankCount += 1
      }
    })
  })

  const teammates = Object.entries(teamMap)
    .map(([name, s]) => ({
      name,
      games: s.games,
      winRate: s.games ? (s.wins / s.games) * 100 : 0,
      avgDamage: s.games ? s.damageSum / s.games : 0,
      avgRank: s.rankCount ? s.rankSum / s.rankCount : null,
    }))
    .sort((a, b) => b.games - a.games || b.winRate - a.winRate)
    .slice(0, 5)

  const matchCount = (matches || []).filter(
    (m) => Array.isArray(m.teammatesDetail) && m.teammatesDetail.length > 0
  ).length

  if (matchCount === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        팀원 정보가 없습니다. 실시간 데이터 조회 시 표시됩니다.
      </div>
    )
  }

  if (teammates.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        최근 경기에서 함께한 팀원 정보가 없습니다.
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-base text-indigo-600 dark:text-indigo-400">
          최근 함께한 플레이어
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          최근 {matchCount}경기 기준
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {teammates.map((user, index) => (
          <div
            key={user.name}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 shadow-sm flex items-center gap-3"
          >
            {/* 순위 번호 */}
            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
              {index + 1}
            </div>

            {/* 이름 + 함께한 판수 */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                {user.name}
              </div>
              <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                함께한 경기 {user.games}회
              </div>
            </div>

            {/* 스탯 3개 */}
            <div className="flex gap-4 text-center flex-shrink-0">
              <div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">승률</div>
                <div className={`text-sm font-bold ${user.winRate >= 50 ? 'text-emerald-500' : user.winRate >= 25 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {user.winRate.toFixed(0)}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">내 딜량</div>
                <div className="text-sm font-bold text-gray-800 dark:text-gray-100">
                  {user.avgDamage.toFixed(0)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">평균 등수</div>
                <div className="text-sm font-bold text-gray-800 dark:text-gray-100">
                  {user.avgRank !== null ? user.avgRank.toFixed(1) : '—'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">
        함께한 경기 수 순으로 정렬 · 내 딜량은 해당 경기에서의 본인 딜량 평균
      </div>
    </div>
  )
}
