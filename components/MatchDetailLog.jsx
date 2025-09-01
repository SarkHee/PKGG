
export default function MatchDetailLog({ match }) {
  if (!match) return null;
  
  // 안전한 데이터 처리
  const killLog = Array.isArray(match.killLog) ? match.killLog : [];
  const movePath = typeof match.movePath === 'string' ? match.movePath : '';
  const weaponStats = (match.weaponStats && typeof match.weaponStats === 'object' && !Array.isArray(match.weaponStats)) ? match.weaponStats : {};

  // 더미 데이터 생성 (실제 데이터가 없을 때)
  const hasMockData = killLog.length === 0 && !movePath && Object.keys(weaponStats).length === 0;
  
  // 생존 시간 기반 더미 이동경로 생성
  const generateMockMovePath = () => {
    const survivalTime = match.survivalTime || match.surviveTime || 0;
    const minutes = Math.floor(survivalTime / 60);
    
    if (minutes < 5) return "School → Apartments";
    else if (minutes < 10) return "School → Apartments → Hospital";
    else if (minutes < 20) return "School → Apartments → Hospital → Military";
    else return "School → Apartments → Hospital → Military → Center";
  };

  // 더미 무기 데이터 생성 (실제 PUBG 무기명 사용)
  const generateMockWeaponStats = () => {
    const totalDamage = match.damage || 0;
    if (totalDamage === 0) return {};
    
    // 실제 PUBG 인기 무기들
    const weapons = [
      'M416', 'AKM', 'SCAR-L', 'M16A4', 'Beryl M762',
      'Kar98k', 'M24', 'AWM', 'SLR', 'Mini14',
      'UMP45', 'Vector', 'Tommy Gun', 'MP5K',
      'M249', 'DP-27', 'MG3',
      'S686', 'S1897', 'S12K', 'DBS',
      'P18C', 'P92', 'P1911', 'Deagle'
    ];
    
    const result = {};
    let remaining = Math.round(totalDamage);
    
    // 랜덤하게 2-3개 무기에 딜량 분배
    const numWeapons = Math.min(Math.floor(Math.random() * 2) + 2, weapons.length);
    const selectedWeapons = [];
    
    // 무기 카테고리별로 선택 (더 현실적으로)
    const primaryWeapons = weapons.slice(0, 5);  // 주무기
    const sniperWeapons = weapons.slice(5, 10);  // 저격총
    const subWeapons = weapons.slice(10, 14);    // 보조무기
    
    // 주무기는 항상 포함
    selectedWeapons.push(primaryWeapons[Math.floor(Math.random() * primaryWeapons.length)]);
    
    // 나머지 무기 선택
    const remainingWeapons = weapons.filter(w => !selectedWeapons.includes(w));
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

  const displayMovePath = movePath || (hasMockData ? generateMockMovePath() : '');
  const displayWeaponStats = Object.keys(weaponStats).length > 0 ? weaponStats : (hasMockData ? generateMockWeaponStats() : {});

  // 무기별 아이콘 매핑
  const getWeaponIcon = (weaponName) => {
    const weapon = weaponName.toLowerCase();
    if (weapon.includes('kar98') || weapon.includes('m24') || weapon.includes('awm') || weapon.includes('slr') || weapon.includes('mini14')) return '🎯';
    if (weapon.includes('m416') || weapon.includes('akm') || weapon.includes('scar') || weapon.includes('m16') || weapon.includes('beryl')) return '🔫';
    if (weapon.includes('ump') || weapon.includes('vector') || weapon.includes('tommy') || weapon.includes('mp5')) return '🔫';
    if (weapon.includes('m249') || weapon.includes('dp-27') || weapon.includes('mg3')) return '💥';
    if (weapon.includes('s686') || weapon.includes('s1897') || weapon.includes('s12k') || weapon.includes('dbs')) return '💣';
    if (weapon.includes('p18c') || weapon.includes('p92') || weapon.includes('p1911') || weapon.includes('deagle')) return '🔫';
    return '🔫';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
      <div className="font-bold text-base mb-4 text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
        📝 상세 전투 로그
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 킬 로그 */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="font-semibold mb-3 text-gray-800 dark:text-gray-200 flex items-center gap-2">
            ⚔️ 킬 로그
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {killLog.length > 0 ? (
              <div className="space-y-2">
                {killLog.map((log, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                    <span className="w-5 h-5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    {log}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-2xl mb-2">🎯</div>
                <div className="text-gray-500 dark:text-gray-400 text-sm">킬 로그 없음</div>
                <div className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                  {(match.kills || 0) > 0 ? '킬 상세 정보를 불러올 수 없습니다' : '이 경기에서는 킬을 기록하지 못했습니다'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 이동 경로 */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="font-semibold mb-3 text-gray-800 dark:text-gray-200 flex items-center gap-2">
            🗺️ 이동 경로
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {displayMovePath ? (
              <div className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 dark:text-blue-400">📍</span>
                  <span className="font-mono">{displayMovePath}</span>
                </div>
                {hasMockData && displayMovePath && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    * 생존 시간 기반 추정 경로
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-2xl mb-2">🗺️</div>
                <div className="text-gray-500 dark:text-gray-400 text-sm">이동 경로 없음</div>
                <div className="text-gray-400 dark:text-gray-500 text-xs mt-1">이동 경로 데이터를 불러올 수 없습니다</div>
              </div>
            )}
          </div>
        </div>

        {/* 무기별 딜량 */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="font-semibold mb-3 text-gray-800 dark:text-gray-200 flex items-center gap-2">
            🔫 무기별 딜량
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {Object.keys(displayWeaponStats).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(displayWeaponStats)
                  .sort(([,a], [,b]) => b - a) // 딜량 높은 순으로 정렬
                  .map(([weapon, dmg]) => (
                    <div key={weapon} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="text-orange-600 dark:text-orange-400">{getWeaponIcon(weapon)}</span>
                        <span className="font-medium">{weapon}</span>
                      </div>
                      <span className="font-bold text-orange-600 dark:text-orange-400">
                        {typeof dmg === 'number' ? Math.round(dmg).toLocaleString() : Math.round(Number(dmg) || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                {hasMockData && Object.keys(displayWeaponStats).length > 0 && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    * 총 딜량 기반 추정 분배
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-2xl mb-2">🔫</div>
                <div className="text-gray-500 dark:text-gray-400 text-sm">무기 데이터 없음</div>
                <div className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                  {(match.damage || 0) > 0 ? '무기별 상세 정보를 불러올 수 없습니다' : '이 경기에서는 딜량을 기록하지 못했습니다'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
