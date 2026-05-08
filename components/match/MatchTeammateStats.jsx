function calcPerfScore(t) {
  const dmgPts     = Math.min((t.damage || 0) / 500, 1) * 40
  const killPts    = Math.min((t.kills || 0), 5) * 8
  const assistPts  = Math.min((t.assists || 0), 4) * 3
  const survivePts = Math.min((t.survivalTime || 0) / 1800, 1) * 8
  return Math.round(dmgPts + killPts + assistPts + survivePts)
}

function getPerfGrade(score) {
  if (score >= 70) return { grade: 'S', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-300' }
  if (score >= 55) return { grade: 'A', color: 'text-green-600',  bg: 'bg-green-50 border-green-300' }
  if (score >= 40) return { grade: 'B', color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-300' }
  if (score >= 25) return { grade: 'C', color: 'text-gray-500',   bg: 'bg-gray-100 border-gray-300' }
  return               { grade: 'D', color: 'text-red-400',    bg: 'bg-red-50 border-red-200' }
}

export default function MatchTeammateStats({ teammatesDetail, shard = 'steam' }) {
  if (!Array.isArray(teammatesDetail) || teammatesDetail.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-gray-400 text-sm bg-gray-50 rounded-xl border border-gray-200">
        팀원 데이터가 없습니다
      </div>
    );
  }

  // 에이스: 퍼포먼스 점수 최고인 팀원 (최소 B등급 이상)
  const scores = teammatesDetail.map((t) => calcPerfScore(t))
  const maxScore = Math.max(...scores)
  const aceIdx = maxScore >= 40 ? scores.indexOf(maxScore) : -1

  const formatSurvivalTime = (seconds) => {
    if (!seconds || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getDmgColor = (dmg) => {
    if (dmg >= 400) return 'text-blue-600 font-black';
    if (dmg >= 200) return 'text-orange-500 font-bold';
    return 'text-gray-500';
  };

  const getKillColor = (kills) => {
    if (kills >= 5) return 'text-red-500 font-black';
    if (kills >= 3) return 'text-orange-500 font-bold';
    if (kills >= 1) return 'text-gray-700 font-semibold';
    return 'text-gray-400';
  };

  const getRankDisplay = (rank) => {
    if (rank === 1) return <span className="text-yellow-500 font-black">🥇</span>;
    if (rank === 2) return <span className="text-gray-400 font-black">🥈</span>;
    if (rank === 3) return <span className="text-amber-600 font-black">🥉</span>;
    return <span className="text-gray-500 font-bold">#{rank}</span>;
  };

  // 최대 딜량 구하기 (progress bar용)
  const maxDamage = Math.max(...teammatesDetail.map(t => t.damage || 0), 1);

  return (
    <div className="mb-4">
      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
        팀원별 상세 스탯
      </div>

      {/* ── 모바일 카드 레이아웃 (sm 미만) ── */}
      <div className="sm:hidden flex flex-col gap-2">
        {teammatesDetail.map((t, idx) => {
          const score = scores[idx]
          const { grade, color, bg } = getPerfGrade(score)
          const isAce = idx === aceIdx
          return (
            <div
              key={t.name}
              className={`rounded-xl border p-3 ${t.isSelf ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
            >
              {/* 1행: 아바타 + 닉네임 + 뱃지 + 등수 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {t.isSelf ? (
                    <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0">나</span>
                  ) : (
                    <span className="w-6 h-6 bg-gray-200 rounded-full flex-shrink-0" />
                  )}
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    {isAce && <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-yellow-400 text-white">에이스</span>}
                    {t.clanTag && <span className="text-[10px] text-indigo-500 font-medium">[{t.clanTag}]</span>}
                    {t.isSelf ? (
                      <span className="font-bold text-sm text-blue-700 truncate">{t.name}</span>
                    ) : (
                      <a href={`/player/${shard}/${encodeURIComponent(t.name)}`} className="font-bold text-sm text-gray-800 hover:text-blue-600 truncate">
                        {t.name}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getRankDisplay(t.rank)}
                  <div className="flex flex-col items-center">
                    <span className={`px-1.5 py-0.5 rounded border text-xs font-black ${bg} ${color}`}>{grade}</span>
                    <span className="text-[10px] text-gray-400">{score}점</span>
                  </div>
                </div>
              </div>

              {/* 2행: 킬·어시·기절·생존 */}
              <div className="grid grid-cols-4 gap-1 mb-2">
                <div className="text-center bg-gray-50 rounded py-1">
                  <div className={`text-sm font-black ${getKillColor(t.kills || 0)}`}>{t.kills || 0}</div>
                  <div className="text-[10px] text-gray-400">킬</div>
                </div>
                <div className="text-center bg-gray-50 rounded py-1">
                  <div className="text-sm font-bold text-gray-600">{t.assists || 0}</div>
                  <div className="text-[10px] text-gray-400">어시</div>
                </div>
                <div className="text-center bg-gray-50 rounded py-1">
                  <div className="text-sm font-bold text-gray-500">{t.dbnos || 0}</div>
                  <div className="text-[10px] text-gray-400">기절</div>
                </div>
                <div className="text-center bg-gray-50 rounded py-1">
                  <div className="text-sm font-bold text-gray-600">{formatSurvivalTime(t.survivalTime)}</div>
                  <div className="text-[10px] text-gray-400">생존</div>
                </div>
              </div>

              {/* 3행: 딜량 프로그레스 바 */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 w-6">딜</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${(t.damage || 0) >= 400 ? 'bg-blue-500' : (t.damage || 0) >= 200 ? 'bg-orange-400' : 'bg-gray-300'}`}
                    style={{ width: `${Math.round(((t.damage || 0) / maxDamage) * 100)}%` }}
                  />
                </div>
                <span className={`text-xs w-10 text-right ${getDmgColor(t.damage || 0)}`}>{Math.round(t.damage || 0)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── PC 테이블 레이아웃 (sm 이상) ── */}
      <div className="hidden sm:block overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">닉네임</th>
              <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">킬</th>
              <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">어시</th>
              <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">딜량</th>
              <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">기절</th>
              <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">생존</th>
              <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">등수</th>
              <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">퍼포먼스</th>
            </tr>
          </thead>
          <tbody>
            {teammatesDetail.map((t, idx) => {
              const score = scores[idx]
              const { grade, color, bg } = getPerfGrade(score)
              const isAce = idx === aceIdx
              return (
                <tr key={t.name} className={`border-b border-gray-100 last:border-0 transition-colors ${t.isSelf ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {t.isSelf ? (
                        <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0">나</span>
                      ) : (
                        <span className="w-5 h-5 bg-gray-200 rounded-full flex-shrink-0" />
                      )}
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        {isAce && <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-yellow-400 text-white flex-shrink-0">에이스</span>}
                        {t.clanTag && <span className="px-1.5 py-0.5 rounded text-xs bg-indigo-50 text-indigo-500 border border-indigo-100 font-medium flex-shrink-0">[{t.clanTag}]</span>}
                        {t.isSelf ? (
                          <span className="font-semibold truncate text-blue-700">{t.name}</span>
                        ) : (
                          <a href={`/player/${shard}/${encodeURIComponent(t.name)}`} className="font-semibold truncate text-gray-800 hover:text-blue-600 hover:underline transition-colors">{t.name}</a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center"><span className={getKillColor(t.kills || 0)}>{t.kills || 0}</span></td>
                  <td className="px-3 py-3 text-center text-gray-500">{t.assists || 0}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <span className={`min-w-[42px] text-right text-sm ${getDmgColor(t.damage || 0)}`}>{Math.round(t.damage || 0)}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${(t.damage || 0) >= 400 ? 'bg-blue-500' : (t.damage || 0) >= 200 ? 'bg-orange-400' : 'bg-gray-300'}`} style={{ width: `${Math.round(((t.damage || 0) / maxDamage) * 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center text-gray-500">{t.dbnos || 0}</td>
                  <td className="px-3 py-3 text-center text-gray-600">{formatSurvivalTime(t.survivalTime)}</td>
                  <td className="px-3 py-3 text-center">{getRankDisplay(t.rank)}</td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`px-2 py-0.5 rounded border text-xs font-black ${bg} ${color}`}>{grade}</span>
                      <span className="text-[10px] text-gray-400">{score}점</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
