import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { useT } from '../utils/i18n'

// PUBG 공식 티어 메타
const TIER_META = {
  Survivor: { label: 'Survivor', color: '#f59e0b', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', icon: '🏆' },
  Master:   { label: 'Master',   color: '#7c3aed', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-700', icon: '👑' },
  Diamond:  { label: 'Diamond',  color: '#0ea5e9', bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-300 dark:border-sky-700', icon: '💎' },
  Platinum: { label: 'Platinum', color: '#06b6d4', bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-300 dark:border-cyan-700', icon: '🔷' },
  Gold:     { label: 'Gold',     color: '#eab308', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-700', icon: '🥇' },
  Silver:   { label: 'Silver',   color: '#94a3b8', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-600', icon: '🥈' },
  Bronze:   { label: 'Bronze',   color: '#b45309', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700', icon: '🥉' },
}

const RANK_BADGE = {
  1: { bg: 'bg-yellow-400', text: 'text-yellow-900', shadow: 'shadow-yellow-300/50', label: '🥇' },
  2: { bg: 'bg-gray-300',   text: 'text-gray-800',   shadow: 'shadow-gray-300/50',   label: '🥈' },
  3: { bg: 'bg-amber-600',  text: 'text-amber-100',  shadow: 'shadow-amber-600/50',  label: '🥉' },
}

function TierBadge({ tier, subTier }) {
  const meta = TIER_META[tier] || { label: tier, bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500', border: 'border-gray-300 dark:border-gray-600', icon: '—' }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${meta.bg} ${meta.text} ${meta.border}`}>
      {meta.icon} {meta.label}{subTier ? ` ${subTier}` : ''}
    </span>
  )
}

function RankCell({ rank }) {
  const badge = RANK_BADGE[rank]
  if (badge) {
    return (
      <div className={`w-8 h-8 rounded-full ${badge.bg} ${badge.text} flex items-center justify-center font-black text-sm shadow-lg ${badge.shadow}`}>
        {rank}
      </div>
    )
  }
  return (
    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 w-8 text-center block">
      {rank}
    </span>
  )
}

export default function LeaderboardPage() {
  const { t } = useT()

  const PLATFORMS = [
    { key: 'pc-as',  label: t('lb.platform.as'), flag: '🌏' },
    { key: 'pc-na',  label: t('lb.platform.na'), flag: '🌎' },
    { key: 'pc-eu',  label: t('lb.platform.eu'), flag: '🌍' },
    { key: 'pc-sea', label: t('lb.platform.sea'), flag: '🌴' },
    { key: 'pc-sa',  label: t('lb.platform.sa'), flag: '🌿' },
  ]
  const MODE_GROUPS = [
    { key: 'squad', label: t('lb.mode.squad'), icon: '🎯' },
    { key: 'duo',   label: t('lb.mode.duo'),   icon: '👥' },
    { key: 'solo',  label: t('lb.mode.solo'),  icon: '👤' },
  ]
  const VIEW_TYPES = [
    { key: 'fpp', label: t('lb.view.fpp') },
    { key: 'tpp', label: t('lb.view.tpp') },
  ]

  const [platform, setPlatform] = useState('pc-as')
  const [modeGroup, setModeGroup] = useState('squad')
  const [viewType, setViewType]   = useState('fpp')
  const [players, setPlayers]     = useState([])
  const [visibleCount, setVisibleCount] = useState(100)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [seasonId, setSeasonId]   = useState('')
  const [myNick, setMyNick]       = useState('')

  const gameMode = viewType === 'fpp' ? `${modeGroup}-fpp` : modeGroup

  useEffect(() => {
    try {
      const recent = JSON.parse(localStorage.getItem('pkgg_recent_searches') || '[]')
      const first = recent[0]
      if (first) setMyNick(typeof first === 'string' ? first : first.nickname || first.nick || '')
    } catch {}
  }, [])

  useEffect(() => {
    setLoading(true)
    setError('')
    setVisibleCount(100)
    fetch(`/api/pubg/leaderboard?platform=${platform}&gameMode=${gameMode}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error || t('common.error'))
        setPlayers(d.players || [])
        setSeasonId(d.seasonId || '')
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [platform, gameMode])

  const myNickStr = typeof myNick === 'string' ? myNick : ''
  const myRank = myNickStr
    ? players.findIndex((p) => p.nickname.toLowerCase() === myNickStr.toLowerCase())
    : -1
  const visiblePlayers = players.slice(0, visibleCount)
  const hasMore = visibleCount < players.length

  return (
    <>
      <Head>
        <title>{t('lb.meta_title')}</title>
        <meta name="description" content={t('lb.meta_desc')} />
        <meta property="og:title" content={t('lb.meta_title')} />
        <meta property="og:description" content={t('lb.meta_desc')} />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />

        <main className="max-w-5xl mx-auto px-4 py-8">

          {/* 헤더 */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">🏆</span>
              <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">{t('lb.title')}</h1>
              {seasonId && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 rounded-full font-semibold">
                  {seasonId.replace('division.bro.official.', '')}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('lb.subtitle')}</p>
          </div>

          {/* 필터 */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 mb-5 flex flex-wrap gap-4">

            {/* 서버 */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{t('lb.server')}</span>
              <div className="flex gap-1.5 flex-wrap">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPlatform(p.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      platform === p.key
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
                    }`}
                  >
                    {p.flag} {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 모드 */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{t('lb.mode')}</span>
              <div className="flex gap-1.5">
                {MODE_GROUPS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setModeGroup(m.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      modeGroup === m.key
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500'
                    }`}
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 시점 */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{t('lb.view')}</span>
              <div className="flex gap-1.5">
                {VIEW_TYPES.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => setViewType(v.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      viewType === v.key
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 내 닉네임 */}
            <div className="flex flex-col gap-1.5 ml-auto">
              <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{t('lb.my_nick_label')}</span>
              <input
                type="text"
                value={myNick}
                onChange={(e) => setMyNick(e.target.value)}
                placeholder={t('lb.nick_placeholder')}
                className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-400 w-36"
              />
            </div>
          </div>

          {/* 내 순위 배너 */}
          {myRank >= 0 && (
            <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-lg">🎯</span>
              <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                {myNick} {t('lb.my_rank_msg')} <span className="text-xl">{myRank + 1}</span>{t('lb.rank_unit')}
              </span>
              <TierBadge tier={players[myRank]?.tier} subTier={players[myRank]?.subTier} />
            </div>
          )}

          {/* 현재 조회 배너 */}
          {(() => {
            const plt  = PLATFORMS.find((p) => p.key === platform)
            const mode = MODE_GROUPS.find((m) => m.key === modeGroup)
            const view = VIEW_TYPES.find((v) => v.key === viewType)
            return (
              <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('lb.current_view')}</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600 text-white text-xs font-bold">
                    {plt?.flag} {plt?.label} {t('lb.server_suffix')}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold">
                    {mode?.icon} {mode?.label}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold">
                    {view?.label}
                  </span>
                </div>
                {!loading && players.length > 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {t('lb.show_total')} {players.length}{t('lb.show_persons')} · {visibleCount}{t('lb.show_visible')}
                  </span>
                )}
              </div>
            )
          })()}

          {/* 테이블 */}
          <div className="overflow-x-auto -mx-1">
          <div className="min-w-[580px] bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">

            {/* 테이블 헤더 */}
            <div className="grid grid-cols-[48px_1fr_120px_80px_68px_80px_68px] gap-x-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              <span className="text-center">{t('lb.col_rank')}</span>
              <span>{t('lb.col_nick')}</span>
              <span className="text-center">{t('lb.col_tier')}</span>
              <span className="text-right">RP</span>
              <span className="text-right">KDA</span>
              <span className="text-right">{t('lb.col_avgdmg')}</span>
              <span className="text-right">{t('lb.col_winrate')}</span>
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400 dark:text-gray-500">{t('lb.loading')}</p>
              </div>
            )}

            {!loading && error && (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <span className="text-3xl">⚠️</span>
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            {!loading && !error && players.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <span className="text-3xl">📭</span>
                <p className="text-sm text-gray-400 dark:text-gray-500">{t('lb.no_data')}</p>
              </div>
            )}

            {!loading && !error && visiblePlayers.map((p, idx) => {
              const isMe = myNickStr && p.nickname.toLowerCase() === myNickStr.toLowerCase()
              const kda  = p.kills > 0 && p.games > 0
                ? (p.kills / Math.max(p.games - p.wins, 1)).toFixed(2)
                : '—'

              return (
                <div
                  key={p.accountId}
                  className={`grid grid-cols-[48px_1fr_120px_80px_68px_80px_68px] gap-x-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 transition-colors
                    ${isMe
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500'
                      : idx % 2 === 0 ? 'hover:bg-gray-50 dark:hover:bg-gray-800/40' : 'bg-gray-50/50 dark:bg-gray-800/20 hover:bg-gray-100/60 dark:hover:bg-gray-800/40'
                    }`}
                >
                  <div className="flex items-center justify-center">
                    <RankCell rank={p.rank} />
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Link
                      href={`/player/steam/${encodeURIComponent(p.nickname)}`}
                      className="font-semibold text-sm text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 truncate transition-colors"
                    >
                      {p.nickname}
                    </Link>
                    {isMe && (
                      <span className="flex-shrink-0 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold">ME</span>
                    )}
                  </div>
                  <div className="flex items-center justify-center">
                    <TierBadge tier={p.tier} subTier={p.subTier} />
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                      {p.rankPoints.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className={`text-sm font-semibold ${
                      parseFloat(kda) >= 5 ? 'text-emerald-600 dark:text-emerald-400'
                      : parseFloat(kda) >= 3 ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-300'
                    }`}>
                      {kda}
                    </span>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className={`text-sm font-semibold ${
                      p.averageDamage >= 500 ? 'text-emerald-600 dark:text-emerald-400'
                      : p.averageDamage >= 300 ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-300'
                    }`}>
                      {p.averageDamage}
                    </span>
                  </div>
                  <div className="flex items-center justify-end">
                    <span className={`text-sm font-semibold ${
                      p.winRatio >= 0.3 ? 'text-emerald-600 dark:text-emerald-400'
                      : p.winRatio >= 0.15 ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-300'
                    }`}>
                      {(p.winRatio * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          </div>

          {/* 더보기 버튼 */}
          {!loading && hasMore && (
            <button
              onClick={() => setVisibleCount((v) => v + 100)}
              className="w-full mt-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm"
            >
              {t('lb.load_more')} ({visibleCount} / {players.length}{t('lb.show_persons')}) ↓
            </button>
          )}

          {!loading && players.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-3 text-center">
              {t('lb.footer_note')}
            </p>
          )}
        </main>

        <Footer />
      </div>
    </>
  )
}
