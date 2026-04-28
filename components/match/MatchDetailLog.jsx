import { useState, useEffect } from 'react'
import MatchMapView from './MatchMapView.jsx'

export default function MatchDetailLog({ match, playerNickname }) {
  const [telemetry, setTelemetry] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!match?.telemetryUrl || !playerNickname) return
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      url: match.telemetryUrl,
      mapName: match.mapName || '',
      nickname: playerNickname,
    })

    fetch(`/api/pubg/match-telemetry?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setTelemetry(data)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [match?.telemetryUrl, playerNickname])

  if (!match) return null

  const killLog = telemetry?.killLog || []
  const weaponStats = telemetry?.weaponStats || {}
  const movePath = telemetry?.movePath || ''
  const movePathCoords = Array.isArray(telemetry?.movePathCoords) && telemetry.movePathCoords.length > 1
    ? telemetry.movePathCoords
    : null

  const getWeaponIcon = (weaponName) => {
    const weapon = weaponName.toLowerCase()
    if (weapon.includes('kar98') || weapon.includes('m24') || weapon.includes('awm') || weapon.includes('slr') || weapon.includes('mini14') || weapon.includes('mk14')) return '🎯'
    if (weapon.includes('m249') || weapon.includes('dp-28') || weapon.includes('mg3')) return '💥'
    if (weapon.includes('s686') || weapon.includes('s1897') || weapon.includes('s12k') || weapon.includes('dbs')) return '💣'
    if (weapon.includes('frag') || weapon.includes('grenade') || weapon.includes('molotov')) return '💥'
    if (weapon.includes('punch') || weapon.includes('melee')) return '👊'
    if (weapon.includes('vehicle') || weapon.includes('car')) return '🚗'
    return '🔫'
  }

  const maxWeaponDmg = Math.max(...Object.values(weaponStats).map(Number), 1)

  // 로딩 중
  if (loading) {
    return (
      <div className="mt-3 flex items-center justify-center py-8 gap-2 text-gray-400 text-sm">
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        🎮 경기 기록 해독 중...
      </div>
    )
  }

  // 텔레메트리 URL 없음
  if (!match.telemetryUrl) {
    return (
      <div className="mt-3 text-center py-6 text-gray-400 text-xs">텔레메트리 데이터 없음</div>
    )
  }

  return (
    <div className="mt-3">
      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
        상세 전투 로그
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          텔레메트리 로드 실패: {error}
        </div>
      )}

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
                  {(match.kills || 0) > 0 ? '텔레메트리 파싱 불가' : '이 경기에서 킬 없음'}
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
          </div>
          <div className="p-3">
            {movePath ? (
              <div className="px-3 py-2.5 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5 flex-shrink-0">📍</span>
                  <span className="font-mono text-xs text-gray-700 leading-relaxed">{movePath}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="text-2xl mb-1.5">🗺️</div>
                <div className="text-xs font-medium text-gray-500">이동 경로 없음</div>
                <div className="text-xs text-gray-400 mt-0.5">텔레메트리 데이터 없음</div>
              </div>
            )}
            {movePathCoords && (
              <div className="mt-2">
                <MatchMapView
                  mapName={match.mapName}
                  movePathCoords={movePathCoords}
                  combatCoords={[]}
                />
              </div>
            )}
          </div>
        </div>

        {/* 무기별 딜량 */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">무기별 딜량</span>
          </div>
          <div className="p-3">
            {Object.keys(weaponStats).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(weaponStats)
                  .sort(([, a], [, b]) => Number(b) - Number(a))
                  .map(([weapon, dmg]) => {
                    const dmgNum = Math.round(Number(dmg) || 0)
                    const pct = Math.round((dmgNum / maxWeaponDmg) * 100)
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
                    )
                  })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="text-2xl mb-1.5">🔫</div>
                <div className="text-xs font-medium text-gray-500">
                  {(match.damage || 0) > 0 ? '무기별 데이터 없음' : '딜량 기록 없음'}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {(match.damage || 0) > 0 ? '텔레메트리 파싱 불가' : '이 경기에서 딜량 없음'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
