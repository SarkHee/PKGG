export default function MatchTeammateStats({ teammatesDetail, shard = 'steam' }) {
  if (!Array.isArray(teammatesDetail) || teammatesDetail.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-gray-400 text-sm bg-gray-50 rounded-xl border border-gray-200">
        팀원 데이터가 없습니다
      </div>
    );
  }

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
      <div className="overflow-hidden rounded-xl border border-gray-200">
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
            </tr>
          </thead>
          <tbody>
            {teammatesDetail.map((t) => (
              <tr
                key={t.name}
                className={`border-b border-gray-100 last:border-0 transition-colors ${
                  t.isSelf
                    ? 'bg-blue-50'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                {/* 닉네임 */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {t.isSelf ? (
                      <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                        나
                      </span>
                    ) : (
                      <span className="w-5 h-5 bg-gray-200 rounded-full flex-shrink-0" />
                    )}
                    <div className="flex items-center gap-1.5 min-w-0">
                      {t.clanTag && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-indigo-50 text-indigo-500 border border-indigo-100 font-medium flex-shrink-0">
                          [{t.clanTag}]
                        </span>
                      )}
                      {t.isSelf ? (
                        <span className="font-semibold truncate text-blue-700">{t.name}</span>
                      ) : (
                        <a
                          href={`/player/${shard}/${encodeURIComponent(t.name)}`}
                          className="font-semibold truncate text-gray-800 hover:text-blue-600 hover:underline transition-colors"
                        >
                          {t.name}
                        </a>
                      )}
                    </div>
                  </div>
                </td>
                {/* 킬 */}
                <td className="px-3 py-3 text-center">
                  <span className={getKillColor(t.kills || 0)}>
                    {t.kills || 0}
                  </span>
                </td>
                {/* 어시스트 */}
                <td className="px-3 py-3 text-center text-gray-500">
                  {t.assists || 0}
                </td>
                {/* 딜량 + 프로그레스 바 */}
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <span className={`min-w-[42px] text-right text-sm ${getDmgColor(t.damage || 0)}`}>
                      {Math.round(t.damage || 0)}
                    </span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (t.damage || 0) >= 400 ? 'bg-blue-500' : (t.damage || 0) >= 200 ? 'bg-orange-400' : 'bg-gray-300'
                        }`}
                        style={{ width: `${Math.round(((t.damage || 0) / maxDamage) * 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
                {/* 기절 */}
                <td className="px-3 py-3 text-center text-gray-500">
                  {t.dbnos || 0}
                </td>
                {/* 생존 */}
                <td className="px-3 py-3 text-center text-gray-600">
                  {formatSurvivalTime(t.survivalTime)}
                </td>
                {/* 등수 */}
                <td className="px-3 py-3 text-center">
                  {getRankDisplay(t.rank)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
