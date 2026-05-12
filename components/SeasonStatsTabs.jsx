function StatCell({ label, value, pct, barColor, noBar }) {
  return (
    <div className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl py-2.5 px-1 gap-1">
      <span className={`text-sm font-black leading-none ${barColor ? barColor.text : 'text-gray-700 dark:text-gray-300'}`}>
        {value}
      </span>
      {!noBar && (
        <div className="w-full px-1.5">
          <div className="h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor ? barColor.bar : 'bg-gray-300'}`}
              style={{ width: `${Math.min(Math.max(pct ?? 0, 0), 100)}%` }}
            />
          </div>
        </div>
      )}
      <span className="text-[10px] text-gray-400 font-medium leading-none">{label}</span>
    </div>
  )
}

const C = {
  accent: { bar: 'bg-blue-400', text: 'text-blue-600' },
  gray:   { bar: 'bg-gray-300', text: 'text-gray-700' },
}

export default function SeasonStatsTabs({ seasonStatsBySeason }) {
  const modeGroups = [
    {
      key: 'solo',
      title: '솔로',
      icon: '👤',
      accentBar: 'bg-blue-400',
      accentText: 'text-blue-700',
      accentHeader: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      accentBorder: 'border-blue-200 dark:border-blue-800',
      modes: ['solo-fpp', 'solo', 'ranked-solo-fpp', 'ranked-solo'],
    },
    {
      key: 'duo',
      title: '듀오',
      icon: '👥',
      accentBar: 'bg-blue-400',
      accentText: 'text-blue-700',
      accentHeader: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      accentBorder: 'border-blue-200 dark:border-blue-800',
      modes: ['duo-fpp', 'duo', 'ranked-duo-fpp', 'ranked-duo'],
    },
    {
      key: 'squad',
      title: '스쿼드',
      icon: '🎯',
      accentBar: 'bg-blue-400',
      accentText: 'text-blue-700',
      accentHeader: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      accentBorder: 'border-blue-200 dark:border-blue-800',
      modes: ['squad-fpp', 'squad', 'ranked-squad-fpp', 'ranked-squad', 'normal-squad-fpp', 'normal-squad'],
    },
  ]

  if (!seasonStatsBySeason || Object.keys(seasonStatsBySeason).length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-400 text-sm">
        통계 데이터가 없습니다.
      </div>
    )
  }

  const seasonList = Object.keys(seasonStatsBySeason).sort().reverse()

  seasonList.forEach((season) => {
    if (!seasonStatsBySeason[season]) return
    Object.keys(seasonStatsBySeason[season]).forEach((mode) => {
      const target = mode.includes('solo') ? 'solo' : mode.includes('duo') ? 'duo' : mode.includes('squad') ? 'squad' : null
      if (!target) return
      const g = modeGroups.find((g) => g.key === target)
      if (g && !g.modes.includes(mode)) g.modes.push(mode)
    })
  })

  const allModeStats = {}
  modeGroups.flatMap((g) => g.modes).forEach((mode) => {
    for (const season of seasonList) {
      if (seasonStatsBySeason[season]?.[mode]) {
        allModeStats[mode] = seasonStatsBySeason[season][mode]
        break
      }
    }
  })

  const renderCard = (group) => {
    const availableModes = group.modes.filter((m) => allModeStats[m])
    const hasData = availableModes.length > 0

    let totalRounds = 0, totalWins = 0, totalTop10 = 0, totalDmg = 0
    let totalKills = 0, totalDeaths = 0
    let totalAssists = 0
    let totalSurvivalSum = 0, survRounds = 0
    let totalHSRateSum = 0, hsRounds = 0
    let maxLongestKill = 0

    availableModes.forEach((mode) => {
      const s = allModeStats[mode]
      if (!s) return
      const r = s.rounds ?? s.roundsPlayed ?? 0
      if (r === 0) return

      totalRounds += r
      totalWins   += s.wins ?? 0
      totalTop10  += s.top10s ?? 0
      totalDmg    += (s.avgDamage ?? 0) * r

      // 킬: totalKills 우선, 없으면 kd 역산, 없으면 avgKills
      const kills = s.totalKills ?? (s.kd != null ? s.kd * (r - (s.wins ?? 0)) : (s.avgKills ?? 0) * r)
      totalKills  += kills
      totalDeaths += r - (s.wins ?? 0)

      // 어시스트: 총합 (assists 우선, 없으면 avgAssists * rounds)
      totalAssists += s.assists ?? Math.round((s.avgAssists ?? 0) * r)

      // 생존시간: avgSurvivalTime > 0 인 모드만 합산
      if ((s.avgSurvivalTime ?? 0) > 0) {
        totalSurvivalSum += s.avgSurvivalTime * r
        survRounds       += r
      }

      // 헤드샷 비율: headshotRate (0~100) 사전계산값 우선
      if ((s.headshotRate ?? 0) > 0) {
        totalHSRateSum += s.headshotRate * r
        hsRounds       += r
      }

      const lk = s.longestKill ?? s.maxDistanceKill ?? 0
      if (lk > maxLongestKill) maxLongestKill = lk
    })

    const kdVal    = totalDeaths > 0 ? totalKills / totalDeaths : 0
    const avgDmg   = totalRounds > 0 ? totalDmg / totalRounds : 0
    const winPct   = totalRounds > 0 ? (totalWins  / totalRounds) * 100 : 0
    const top10Pct = totalRounds > 0 ? (totalTop10 / totalRounds) * 100 : 0
    const hsPct    = hsRounds > 0 ? totalHSRateSum / hsRounds : 0
    const survSec  = survRounds > 0 ? totalSurvivalSum / survRounds : 0
    const survText = survSec > 0 ? `${Math.floor(survSec / 60)}분 ${Math.floor(survSec % 60)}초` : '—'
    const lkText   = maxLongestKill > 0 ? `${Math.round(maxLongestKill)}m` : '—'

    const cells = [
      { label: 'K/D',      value: kdVal.toFixed(2),                      pct: (kdVal / 5.0) * 100,   barColor: C.accent },
      { label: '승률',     value: `${winPct.toFixed(1)}%`,               pct: winPct,                barColor: C.gray   },
      { label: 'TOP10',    value: `${top10Pct.toFixed(1)}%`,             pct: top10Pct,              barColor: C.gray   },
      { label: '평균 딜량', value: avgDmg > 0 ? avgDmg.toFixed(0) : '—', pct: (avgDmg / 500) * 100, barColor: C.accent },
      { label: '게임 수',  value: totalRounds > 0 ? String(totalRounds) : '—', noBar: true,          barColor: C.gray   },
      { label: '어시스트', value: totalAssists > 0 ? String(totalAssists) : '—', pct: (totalAssists / Math.max(totalRounds * 3, 1)) * 100, barColor: C.gray },
      { label: '헤드샷',   value: hsPct > 0 ? `${hsPct.toFixed(1)}%` : '—', pct: hsPct,             barColor: C.accent },
      { label: '최장 킬',  value: lkText, noBar: true,                   barColor: C.gray },
      { label: '생존시간', value: survText, noBar: true,                  barColor: C.gray },
    ]

    return (
      <div
        key={group.key}
        className={`rounded-2xl border bg-white dark:bg-gray-900 overflow-hidden shadow-sm ${hasData ? '' : 'opacity-40'} ${group.accentBorder}`}
      >
        <div className={`px-4 py-3 border-b flex items-center justify-between ${group.accentHeader}`}>
          <div className="flex items-center gap-2">
            <div className={`w-1 h-5 ${group.accentBar} rounded-full flex-shrink-0`} />
            <span className={`text-base font-black ${group.accentText}`}>{group.title}</span>
          </div>
          {hasData ? (
            <div className="flex items-center gap-1.5 text-[11px] font-bold">
              <span className="text-green-600">{totalWins}W</span>
              <span className="text-gray-300">·</span>
              <span className="text-blue-500">{totalTop10}T</span>
              <span className="text-gray-300">·</span>
              <span className="text-gray-400">{totalRounds}G</span>
            </div>
          ) : (
            <span className="text-xs text-gray-400">기록 없음</span>
          )}
        </div>

        {hasData ? (
          <div className="p-3 grid grid-cols-3 gap-2">
            {cells.map((cell) => <StatCell key={cell.label} {...cell} />)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <div className="text-3xl mb-2">🎮</div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{group.title} 모드 기록 없음</div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {modeGroups.map((group) => renderCard(group))}
    </div>
  )
}
