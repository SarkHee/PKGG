import { useState, useEffect, useCallback } from 'react'

const TODAY = new Date().toISOString().slice(0, 10)
const STORAGE_KEY       = `pkgg_daily_goals_${TODAY}`        // 수동 체크 상태
const CACHE_KEY         = `pkgg_today_stats_${TODAY}`        // 오늘 스탯 캐시
const CACHE_TTL_MS      = 5 * 60 * 1000                      // 5분

function buildGoals(stats) {
  if (!stats) return []
  const dmg   = Math.round(stats.avgDamage  || 0)
  const kills = Number((stats.avgKills || 0).toFixed(1))
  const win   = Number((stats.winRate  || 0).toFixed(1))
  const top10 = Number((stats.top10Rate|| 0).toFixed(1))
  const goals = []

  if (dmg > 0) {
    const target = Math.round(dmg * 1.3 / 10) * 10
    goals.push({ id: 'damage', icon: '💥', label: '딜량 목표', desc: `1경기 ${target.toLocaleString()} 딜 달성`, target })
  }
  if (kills > 0) {
    const target = Math.max(1, Math.round((kills + 1) * 10) / 10)
    goals.push({ id: 'kills', icon: '🎯', label: '킬 목표', desc: `1경기 ${target} 킬 이상 달성`, target })
  }
  if (win < 30) {
    goals.push({ id: 'win', icon: '🏆', label: '오늘 1승', desc: '오늘 적어도 1번 치킨 먹기', target: 1 })
  } else {
    goals.push({ id: 'win', icon: '🏆', label: '연승 도전', desc: `현재 승률 ${win}% — 2연승 달성`, target: 2 })
  }
  if (top10 < 40) {
    goals.push({ id: 'top10', icon: '🛡️', label: 'Top 10 생존', desc: '오늘 Top 10에 2번 들기', target: 2 })
  } else {
    goals.push({ id: 'top10', icon: '🛡️', label: 'Top 5 도전', desc: '오늘 Top 5에 1번 들기', target: 1 })
  }
  return goals
}

// 오늘 스탯으로 목표 달성 여부 판정
function autoCheck(goals, todayStats) {
  if (!todayStats || todayStats.matchCount === 0) return {}
  const result = {}
  for (const g of goals) {
    if (g.id === 'damage') result[g.id] = todayStats.bestDamage >= g.target
    else if (g.id === 'kills') result[g.id] = todayStats.bestKills >= g.target
    else if (g.id === 'win') result[g.id] = todayStats.wins >= g.target
    else if (g.id === 'top10') result[g.id] = todayStats.top10s >= g.target
  }
  return result
}

export default function DailyGoalsWidget({ stats, pubgNickname, shard = 'steam' }) {
  const [manualChecked, setManualChecked] = useState({})
  const [todayStats, setTodayStats]       = useState(null)  // { matchCount, bestKills, bestDamage, wins, top10s }
  const [loading, setLoading]             = useState(false)
  const [lastFetch, setLastFetch]         = useState(null)

  // 수동 체크 복원
  useEffect(() => {
    try { setManualChecked(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')) } catch {}
  }, [])

  // 오늘 스탯 fetch (캐시 5분)
  const fetchTodayStats = useCallback(async (force = false) => {
    if (!pubgNickname) return
    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
        if (cached && Date.now() - cached._ts < CACHE_TTL_MS) {
          setTodayStats(cached)
          setLastFetch(new Date(cached._ts))
          return
        }
      } catch {}
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/pubg/today-stats?nickname=${encodeURIComponent(pubgNickname)}&shard=${shard}`)
      if (!res.ok) return
      const data = await res.json()
      const withTs = { ...data, _ts: Date.now() }
      setTodayStats(withTs)
      setLastFetch(new Date())
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(withTs)) } catch {}
    } catch {}
    finally { setLoading(false) }
  }, [pubgNickname, shard])

  // 마운트 시 자동 fetch
  useEffect(() => { fetchTodayStats() }, [fetchTodayStats])

  const goals = buildGoals(stats)
  const auto  = autoCheck(goals, todayStats)

  // 자동 달성 또는 수동 체크 중 하나라도 true면 체크
  const isChecked = (id) => auto[id] || !!manualChecked[id]

  const toggle = (id) => {
    // 자동 달성된 항목은 수동 해제 불가
    if (auto[id]) return
    const next = { ...manualChecked, [id]: !manualChecked[id] }
    setManualChecked(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }

  const doneCount = goals.filter(g => isChecked(g.id)).length

  if (!stats || goals.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center text-xs text-gray-500">
        닉네임 연동 후 일일 목표가 추천됩니다
      </div>
    )
  }

  const fetchTime = lastFetch
    ? lastFetch.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm">📅</span>
          <span className="text-sm font-bold text-gray-100">오늘의 목표</span>
          {todayStats?.matchCount > 0 && (
            <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">
              오늘 {todayStats.matchCount}판 기준
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{doneCount}/{goals.length} 완료</span>
          {pubgNickname && (
            <button
              onClick={() => fetchTodayStats(true)}
              disabled={loading}
              className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40"
              title={fetchTime ? `마지막 갱신: ${fetchTime}` : '새로고침'}
            >
              {loading ? '⏳' : '↻'}
            </button>
          )}
        </div>
      </div>

      {/* 마지막 갱신 시각 */}
      {fetchTime && (
        <p className="text-[10px] text-gray-600 mb-2">{fetchTime} 기준 자동 체크</p>
      )}

      {/* 진행 바 */}
      <div className="h-1.5 bg-white/10 rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
          style={{ width: `${goals.length > 0 ? (doneCount / goals.length) * 100 : 0}%` }}
        />
      </div>

      <div className="flex flex-col gap-2">
        {goals.map(g => {
          const checked   = isChecked(g.id)
          const autoHit   = !!auto[g.id]
          // 오늘 스탯 진행도 표시용
          let progress = null
          if (todayStats?.matchCount > 0) {
            if (g.id === 'damage') progress = `최고 ${todayStats.bestDamage.toLocaleString()} 딜`
            else if (g.id === 'kills') progress = `최고 ${todayStats.bestKills} 킬`
            else if (g.id === 'win') progress = `${todayStats.wins}승`
            else if (g.id === 'top10') progress = `Top10 ${todayStats.top10s}회`
          }

          return (
            <button
              key={g.id}
              onClick={() => toggle(g.id)}
              className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl border transition-all
                ${checked
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                }
                ${autoHit ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <span className="text-base flex-shrink-0">{g.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={`text-xs font-semibold leading-tight ${checked ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                    {g.label}
                  </p>
                  {autoHit && (
                    <span className="text-[9px] font-bold text-green-400 bg-green-500/20 px-1 rounded">자동</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{g.desc}</p>
                {progress && !checked && (
                  <p className="text-[10px] text-blue-400 leading-tight mt-0.5">{progress}</p>
                )}
              </div>
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all
                ${checked ? 'bg-green-500 border-green-500' : 'border-gray-600'}`}>
                {checked && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {doneCount === goals.length && goals.length > 0 && (
        <p className="text-center text-xs text-yellow-400 font-bold mt-3">🎉 오늘 목표 모두 달성!</p>
      )}
    </div>
  )
}
