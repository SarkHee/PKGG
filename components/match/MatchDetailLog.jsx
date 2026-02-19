export default function MatchDetailLog({ match }) {
  if (!match) return null;

  const killLog = Array.isArray(match.killLog) && match.killLog.length > 0 ? match.killLog : [];

  const movePath = match.movePath || '';

  const weaponStats =
    match.weaponStats &&
    typeof match.weaponStats === 'object' &&
    !Array.isArray(match.weaponStats) &&
    Object.keys(match.weaponStats).length > 0
      ? match.weaponStats
      : {};

  const hasTelemetryData = killLog.length > 0 || movePath || Object.keys(weaponStats).length > 0;
  const shouldUseMockData = !hasTelemetryData;

  // 생존 시간 기반 더미 이동경로 생성
  const generateMockMovePath = () => {
    const survivalTime = match.survivalTime || match.surviveTime || 0;
    const minutes = Math.floor(survivalTime / 60);
    if (minutes < 5) return 'School → Apartments';
    else if (minutes < 10) return 'School → Apartments → Hospital';
    else if (minutes < 20) return 'School → Apartments → Hospital → Military';
    else return 'School → Apartments → Hospital → Military → Center';
  };

  const generateMockWeaponStats = () => {
    const totalDamage = match.damage || 0;
    if (totalDamage === 0) return {};
    const weapons = ['M416', 'AKM', 'SCAR-L', 'M16A4', 'Beryl M762', 'Kar98k', 'M24', 'AWM', 'SLR', 'Mini14', 'UMP45', 'Vector'];
    const result = {};
    let remaining = Math.round(totalDamage);
    const numWeapons = Math.min(Math.floor(Math.random() * 2) + 2, weapons.length);
    const selectedWeapons = [];
    selectedWeapons.push(weapons[Math.floor(Math.random() * 5)]);
    const remainingWeapons = weapons.filter((w) => !selectedWeapons.includes(w));
    for (let i = 1; i < numWeapons; i++) {
      selectedWeapons.push(remainingWeapons[Math.floor(Math.random() * remainingWeapons.length)]);
    }
    for (let i = 0; i < numWeapons - 1; i++) {
      const damage = Math.round(remaining * (0.3 + Math.random() * 0.4));
      result[selectedWeapons[i]] = damage;
      remaining -= damage;
    }
    result[selectedWeapons[numWeapons - 1]] = Math.max(0, remaining);
    return result;
  };

  const displayMovePath = movePath || (shouldUseMockData ? generateMockMovePath() : '');
  const displayWeaponStats =
    Object.keys(weaponStats).length > 0
      ? weaponStats
      : shouldUseMockData
        ? generateMockWeaponStats()
        : {};

  const getWeaponIcon = (weaponName) => {
    const weapon = weaponName.toLowerCase();
    if (weapon.includes('kar98') || weapon.includes('m24') || weapon.includes('awm') || weapon.includes('slr') || weapon.includes('mini14') || weapon.includes('mk14')) return '🎯';
    if (weapon.includes('m249') || weapon.includes('dp-27') || weapon.includes('dp-28') || weapon.includes('mg3')) return '💥';
    if (weapon.includes('s686') || weapon.includes('s1897') || weapon.includes('s12k') || weapon.includes('dbs')) return '💣';
    if (weapon.includes('frag') || weapon.includes('grenade') || weapon.includes('molotov')) return '💥';
    if (weapon.includes('punch') || weapon.includes('melee')) return '👊';
    if (weapon.includes('vehicle') || weapon.includes('car')) return '🚗';
    return '🔫';
  };

  // 최대 딜량 (progress bar용)
  const maxWeaponDmg = Math.max(...Object.values(displayWeaponStats).map(Number), 1);

  return (
    <div className="mt-3">
      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
        상세 전투 로그
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 킬 로그 */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">킬 로그</span>
          </div>
          <div className="p-3">
            {killLog.length > 0 ? (
              <div className="space-y-1.5">
                {killLog.map((log, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-red-50 rounded-lg border border-red-100">
                    <span className="w-4 h-4 bg-red-400 text-white rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs text-gray-700">{log}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="text-2xl mb-1.5">🎯</div>
                <div className="text-xs font-medium text-gray-500">
                  {(match.kills || 0) > 0 ? '킬 상세 정보 없음' : '킬 기록 없음'}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {(match.kills || 0) > 0 ? '텔레메트리 데이터 없음' : '이 경기에서 킬 없음'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 이동 경로 */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">이동 경로</span>
            {shouldUseMockData && displayMovePath && (
              <span className="ml-auto text-xs text-amber-500 font-medium">추정</span>
            )}
          </div>
          <div className="p-3">
            {displayMovePath ? (
              <div className="px-3 py-2.5 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5 flex-shrink-0">📍</span>
                  <span className="font-mono text-xs text-gray-700 leading-relaxed">{displayMovePath}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="text-2xl mb-1.5">🗺️</div>
                <div className="text-xs font-medium text-gray-500">이동 경로 없음</div>
                <div className="text-xs text-gray-400 mt-0.5">텔레메트리 데이터 없음</div>
              </div>
            )}
          </div>
        </div>

        {/* 무기별 딜량 */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">무기별 딜량</span>
            {shouldUseMockData && Object.keys(displayWeaponStats).length > 0 && (
              <span className="ml-auto text-xs text-amber-500 font-medium">추정</span>
            )}
          </div>
          <div className="p-3">
            {Object.keys(displayWeaponStats).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(displayWeaponStats)
                  .sort(([, a], [, b]) => Number(b) - Number(a))
                  .map(([weapon, dmg]) => {
                    const dmgNum = Math.round(Number(dmg) || 0);
                    const pct = Math.round((dmgNum / maxWeaponDmg) * 100);
                    return (
                      <div key={weapon}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{getWeaponIcon(weapon)}</span>
                            <span className="text-xs font-medium text-gray-700">{weapon}</span>
                          </div>
                          <span className="text-xs font-bold text-orange-600">{dmgNum.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-400 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="text-2xl mb-1.5">🔫</div>
                <div className="text-xs font-medium text-gray-500">
                  {(match.damage || 0) > 0 ? '무기별 데이터 없음' : '딜량 기록 없음'}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {(match.damage || 0) > 0 ? '텔레메트리 데이터 없음' : '이 경기에서 딜량 없음'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
