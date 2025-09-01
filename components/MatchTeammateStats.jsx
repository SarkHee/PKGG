
export default function MatchTeammateStats({ teammatesDetail }) {
  if (!Array.isArray(teammatesDetail) || teammatesDetail.length === 0) {
    return <div className="text-gray-500 text-sm py-2">팀원 데이터 없음</div>;
  }

  // 생존시간을 분:초 형식으로 변환하는 함수
  const formatSurvivalTime = (seconds) => {
    if (!seconds || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mb-4">
      <div className="font-bold text-base mb-3 text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
        👥 팀원별 상세 스탯
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200">닉네임</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-200">킬</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-200">어시</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-200">딜량</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-200">기절</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-200">생존</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-200">등수</th>
            </tr>
          </thead>
          <tbody>
            {teammatesDetail.map((t, index) => (
              <tr 
                key={t.name} 
                className={`border-t border-gray-200 dark:border-gray-600 ${
                  t.isSelf ? 'bg-indigo-50 dark:bg-indigo-900/20 font-semibold' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {t.isSelf && <span className="text-indigo-600 dark:text-indigo-400">👤</span>}
                    <span className={t.isSelf ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-gray-100'}>
                      {t.name}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{t.kills || 0}</td>
                <td className="px-3 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{t.assists || 0}</td>
                <td className="px-3 py-2 text-center font-medium text-orange-600 dark:text-orange-400">
                  {Math.round(t.damage || 0)}
                </td>
                <td className="px-3 py-2 text-center font-medium text-gray-900 dark:text-gray-100">{t.dbnos || 0}</td>
                <td className="px-3 py-2 text-center font-medium text-blue-600 dark:text-blue-400">
                  {formatSurvivalTime(t.survivalTime)}
                </td>
                <td className="px-3 py-2 text-center font-bold text-gray-700 dark:text-gray-300">#{t.rank || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
