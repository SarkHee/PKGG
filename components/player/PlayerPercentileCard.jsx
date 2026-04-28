import { useState, useEffect, useRef } from 'react'

export default function PlayerPercentileCard({ playerStats }) {
  const [percentiles, setPercentiles] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState(false)
  const tooltipRef = useRef(null)

  const avgDamage  = Number(playerStats?.avgDamage  ?? playerStats?.averageDamage ?? 0)
  const avgKills   = Number(playerStats?.avgKills   ?? playerStats?.averageKills  ?? 0)
  const winRate    = Number(playerStats?.winRate    ?? 0)
  const top10Rate  = Number(playerStats?.top10Rate  ?? 0)

  useEffect(() => {
    if (avgDamage <= 0) { setLoading(false); return }
    fetch('/api/pubg/percentile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avgDamage, avgKills, winRate, top10Rate }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.insufficient && !data.error) setPercentiles(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avgDamage, avgKills, winRate, top10Rate])

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-xs text-gray-400 font-medium">🌍 전 세계 유저와 비교 중...</p>
        </div>
        <div className="grid grid-cols-2 gap-2 animate-pulse">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-lg" />)}
        </div>
      </div>
    )
  }

  if (!percentiles) return null

  const ITEMS = [
    { label: '평균 딜량', pct: percentiles.avgDamage,  icon: '💥', value: Math.round(avgDamage) },
    { label: '평균 킬',   pct: percentiles.avgKills,   icon: '🎯', value: avgKills.toFixed(1) },
    { label: '승률',      pct: percentiles.winRate,    icon: '🏆', value: `${winRate.toFixed(1)}%` },
    { label: 'Top 10',   pct: percentiles.top10Rate,  icon: '🛡️', value: `${top10Rate.toFixed(1)}%` },
  ]

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-400 to-blue-500 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">📊</span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white">퍼포먼스 백분위 리포트</span>
              <div className="relative" ref={tooltipRef}>
                <button
                  className="w-4 h-4 rounded-full bg-blue-300 hover:bg-white/60 text-white text-[10px] font-bold flex items-center justify-center leading-none transition-colors"
                  onMouseEnter={() => setTooltip(true)}
                  onMouseLeave={() => setTooltip(false)}
                >
                  ?
                </button>
                {tooltip && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-6 z-50 w-48 bg-gray-900 text-white text-[11px] rounded-lg px-3 py-2 shadow-xl leading-relaxed whitespace-normal pointer-events-none">
                    사이트에 등록된 유저 대비 나의 순위입니다.
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-1.5 overflow-hidden">
                      <div className="w-2 h-2 bg-gray-900 rotate-45 translate-y-1 mx-auto" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="text-[10px] text-blue-100">등록 유저 {percentiles.total.toLocaleString()}명 기준 실제 백분위</div>
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        {ITEMS.map(({ label, pct, icon, value }) => {
          const isTop    = pct <= 20
          const isMid    = pct <= 50
          const barW     = Math.max(3, 100 - pct)
          const barColor = isTop ? 'bg-emerald-400' : isMid ? 'bg-blue-400' : 'bg-gray-300'
          const pctColor = isTop ? 'text-emerald-600' : isMid ? 'text-blue-600' : 'text-gray-400'
          const badge    = isTop ? 'bg-emerald-50 border-emerald-200' : isMid ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'

          return (
            <div key={label} className={`rounded-lg p-3 border ${badge}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">{icon} {label}</span>
                <span className={`text-xs font-bold ${pctColor}`}>상위 {pct}%</span>
              </div>
              <div className="text-lg font-black text-gray-800 mb-2">{value}</div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} rounded-full transition-all duration-700`}
                  style={{ width: `${barW}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
