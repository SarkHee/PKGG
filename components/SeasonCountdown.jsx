// 시즌 종료 카운트다운 위젯
// 매 시즌마다 SEASON_NO와 END_DATE를 수동 업데이트 (약 2개월 주기)
const SEASON_NO = 41
const END_DATE  = '2026-06-10'   // ← 다음 시즌 때 여기만 수정

function calcDaysLeft() {
  const end  = new Date(END_DATE + 'T00:00:00+09:00') // KST 기준
  const diff = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

export default function SeasonCountdown({ compact = false }) {
  const days = calcDaysLeft()
  const urgent = days <= 7
  const soon   = days <= 14 && days > 7

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
        urgent ? 'bg-red-950/60 border-red-600/50 text-red-300'
        : soon  ? 'bg-amber-950/60 border-amber-600/50 text-amber-300'
        : 'bg-gray-800/60 border-gray-600/40 text-gray-300'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${urgent ? 'bg-red-400 animate-pulse' : soon ? 'bg-amber-400' : 'bg-gray-500'}`} />
        시즌 {SEASON_NO} D-{days}
      </span>
    )
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border px-5 py-4 ${
      urgent
        ? 'bg-gradient-to-r from-red-950/70 to-gray-900/80 border-red-700/50'
        : soon
        ? 'bg-gradient-to-r from-amber-950/60 to-gray-900/80 border-amber-700/40'
        : 'bg-gradient-to-r from-gray-900/80 to-gray-800/60 border-gray-700/50'
    }`}>
      {/* 배경 글로우 */}
      <div className={`absolute inset-0 pointer-events-none ${
        urgent ? 'bg-red-500/5' : soon ? 'bg-amber-500/5' : 'bg-blue-500/3'
      }`} />

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        {/* D-N 숫자 */}
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl sm:text-3xl font-black tabular-nums leading-none ${
            urgent ? 'text-red-400' : soon ? 'text-amber-400' : 'text-white'
          }`}>
            D-{days}
          </span>
          {urgent && (
            <span className="text-xs font-bold text-red-400 animate-pulse">마감 임박!</span>
          )}
        </div>

        {/* 텍스트 */}
        <div className="flex flex-col gap-0.5">
          <div className="text-sm font-bold text-white/90">
            시즌 {SEASON_NO} 종료까지
          </div>
          <div className="text-xs text-gray-500">
            예상 종료일: {END_DATE} · 공식 일정과 다를 수 있어요
          </div>
        </div>

        {/* 진행 바 (28일 기준) */}
        <div className="sm:ml-auto flex flex-col items-end gap-1 min-w-[80px]">
          <div className="w-full sm:w-20 h-1.5 bg-gray-700/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                urgent ? 'bg-red-500' : soon ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(2, ((28 - days) / 28) * 100))}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-600 tabular-nums">{days}일 남음</span>
        </div>
      </div>
    </div>
  )
}
