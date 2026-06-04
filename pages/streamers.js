import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Header from '../components/layout/Header'

const PLATFORM_META = {
  chzzk:  { label: '치지직', color: '#00DB72', bg: 'bg-[#00DB72]',        text: 'text-black',     icon: '/icons/chzzk.svg',  fallbackIcon: '🟢' },
  twitch: { label: '트위치', color: '#9146FF', bg: 'bg-[#9146FF]',        text: 'text-white',     icon: '/icons/twitch.svg', fallbackIcon: '🟣' },
  soop:   { label: '숲',     color: '#1A6BFF', bg: 'bg-[#1A6BFF]',        text: 'text-white',     icon: '/icons/soop.svg',   fallbackIcon: '🔵' },
}

const TABS = [
  { key: 'all',    label: '전체' },
  { key: 'drops',  label: '🎁 드랍스' },
  { key: 'chzzk', label: '치지직' },
  { key: 'twitch', label: '트위치' },
]

function fmtViewers(n) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`
  if (n >= 1000)  return `${(n / 1000).toFixed(1)}천`
  return n.toLocaleString()
}

function PlatformBadge({ platform }) {
  const m = PLATFORM_META[platform]
  if (!m) return null
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black ${m.bg} ${m.text}`}>
      <span>{m.fallbackIcon}</span>
      {m.label}
    </span>
  )
}

function StreamerCard({ streamer }) {
  const { platform, streamerName, streamerImage, verified, title, viewers, thumbnail, streamUrl, hasCustomThumb, hasDrops } = streamer
  const [imgErr, setImgErr] = useState(false)
  const [profileErr, setProfileErr] = useState(false)
  const m = PLATFORM_META[platform] || {}
  // 커스텀 썸네일 없으면 프로필 이미지를 썸네일로 쓰므로 contain으로 표시
  const thumbFit = hasCustomThumb ? 'object-cover' : 'object-contain p-4 bg-gray-800/90'

  return (
    <a
      href={streamUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col rounded-2xl overflow-hidden border border-gray-800 bg-gray-900 hover:border-gray-600 transition-all duration-200 hover:shadow-lg hover:shadow-black/40 hover:-translate-y-0.5"
    >
      {/* 썸네일 */}
      <div className="relative w-full aspect-video bg-gray-800 overflow-hidden">
        {thumbnail && !imgErr ? (
          <img
            src={thumbnail}
            alt={title}
            className={`w-full h-full ${thumbFit} ${hasCustomThumb ? 'group-hover:scale-105 transition-transform duration-300' : ''}`}
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-gray-800">
            🎮
          </div>
        )}
        {/* LIVE 뱃지 */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          LIVE
        </div>
        {/* 시청자 수 */}
        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
          👁 {fmtViewers(viewers)}
        </div>
        {/* 드롭스 뱃지 */}
        {hasDrops && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-500/90 text-white text-[10px] font-black px-1.5 py-0.5 rounded backdrop-blur-sm">
            🎁 드랍스
          </div>
        )}
        {/* 플랫폼 뱃지 */}
        <div className="absolute bottom-2 right-2">
          <PlatformBadge platform={platform} />
        </div>
      </div>

      {/* 정보 */}
      <div className="p-2.5 sm:p-3 flex gap-2">
        {/* 프로필 */}
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden flex-shrink-0 border border-gray-700">
          {streamerImage ? (
            <img src={streamerImage} alt={streamerName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center text-sm">🎮</div>
          )}
        </div>
        {/* 텍스트 */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] sm:text-xs font-bold text-white truncate leading-tight">
            {streamerName}
            {verified && <span className="ml-1 text-blue-400 text-[9px]">✓</span>}
          </p>
          <p className="text-[10px] sm:text-[11px] text-gray-500 truncate mt-0.5 leading-tight">{title}</p>
        </div>
      </div>
    </a>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-800 bg-gray-900 animate-pulse">
      <div className="w-full aspect-video bg-gray-800" />
      <div className="p-3 flex gap-2.5">
        <div className="w-9 h-9 rounded-full bg-gray-800 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-800 rounded w-1/2" />
          <div className="h-3 bg-gray-800 rounded w-3/4" />
        </div>
      </div>
    </div>
  )
}

const PAGE_SIZE = 40

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…')
    }
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-8 flex-wrap">
      <button
        onClick={() => onChange(page - 1)} disabled={page === 1}
        className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >←</button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="w-10 h-10 flex items-center justify-center text-gray-600 text-sm">…</span>
        ) : (
          <button
            key={p} onClick={() => onChange(p)}
            className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${
              p === page
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >{p}</button>
        )
      )}

      <button
        onClick={() => onChange(page + 1)} disabled={page === totalPages}
        className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >→</button>
    </div>
  )
}

export default function StreamersPage() {
  const [tab,       setTab]       = useState('all')
  const [page,      setPage]      = useState(1)
  const [query,     setQuery]     = useState('')
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [countdown, setCountdown] = useState(300)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/streamers/all')
      if (res.ok) setData(await res.json())
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchAll()
    const iv = setInterval(() => { fetchAll(); setCountdown(300) }, 300_000)
    const cd = setInterval(() => setCountdown((c) => c <= 1 ? 300 : c - 1), 1000)
    return () => { clearInterval(iv); clearInterval(cd) }
  }, [])

  // 탭 변경 시 페이지·검색 초기화
  const handleTabChange = (key) => { setTab(key); setPage(1); setQuery('') }

  // 탭별 필터 + 검색
  const streamers = data?.streamers || []
  const q = query.trim().toLowerCase()
  const tabFiltered = tab === 'all'   ? streamers
    : tab === 'drops'              ? streamers.filter((s) => s.hasDrops)
    : streamers.filter((s) => s.platform === tab)
  const filtered = q
    ? tabFiltered.filter((s) =>
        s.streamerName?.toLowerCase().includes(q) ||
        s.title?.toLowerCase().includes(q)
      )
    : tabFiltered

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const counts = data?.counts || {}
  const updatedLabel = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null

  return (
    <>
      <Head>
        <title>배그 라이브 스트리머 | PKGG</title>
        <meta name="description" content="치지직·트위치에서 지금 배틀그라운드 방송 중인 스트리머를 실시간으로 확인하세요." />
        <meta property="og:title" content="배그 라이브 스트리머 | PKGG" />
        <meta property="og:description" content="치지직·트위치 배그 라이브 스트리머 실시간 피드" />
      </Head>

      <Header />

      <main className="min-h-screen bg-gray-950 text-gray-100">

        {/* 히어로 */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(239,68,68,0.1) 0%, transparent 60%)' }} />
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="relative max-w-screen-xl mx-auto px-4 pt-6 sm:pt-10 pb-4 sm:pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs font-bold text-red-400 tracking-widest uppercase">Live Now</span>
                </div>
                <h1 className="text-xl sm:text-3xl font-black text-white">
                  배그 라이브 스트리머
                </h1>
                <p className="text-gray-500 text-xs sm:text-sm mt-1">
                  치지직 · 트위치에서 지금 배틀그라운드 방송 중인 스트리머
                </p>
              </div>

              {/* 통계 + 갱신 */}
              <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-1 text-xs">
                {!loading && data && (
                  <div className="flex items-center gap-3 text-gray-400">
                    <span>🟢 치지직 {counts.chzzk ?? 0}명</span>
                    <span>🟣 트위치 {counts.twitch ?? 0}명</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-gray-600 flex-wrap justify-end">
                  {updatedLabel && <span className="hidden sm:inline">{updatedLabel} 기준</span>}
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')} 후 갱신
                  </span>
                  <button
                    onClick={fetchAll}
                    disabled={loading}
                    className="text-blue-500 hover:text-blue-400 disabled:opacity-40 transition-colors"
                    title="지금 갱신"
                  >
                    🔄
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-screen-xl mx-auto px-3 sm:px-4 pb-20">

          {/* 플랫폼 탭 */}
          <div className="flex items-center gap-1.5 sm:gap-2 pt-4 pb-3 border-b border-gray-800 overflow-x-auto scrollbar-none">
            {TABS.map((t) => {
              const count = t.key === 'all'   ? streamers.length
                : t.key === 'drops'           ? streamers.filter((s) => s.hasDrops).length
                : (counts[t.key] ?? 0)
              return (
                <button
                  key={t.key}
                  onClick={() => handleTabChange(t.key)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    tab === t.key
                      ? 'bg-white/10 text-white border border-white/15'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/60'
                  }`}
                >
                  {t.key !== 'all' && (
                    <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0 ${
                      t.key === 'chzzk' ? 'bg-[#00DB72]' :
                      t.key === 'twitch' ? 'bg-[#9146FF]' : 'bg-[#1A6BFF]'
                    }`} />
                  )}
                  {t.label}
                  {!loading && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      tab === t.key ? 'bg-white/15 text-gray-200' : 'bg-gray-800 text-gray-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}

            {/* 트위치 미설정 안내 */}
            {!loading && tab === 'twitch' && counts.twitch === 0 && (
              <span className="flex-shrink-0 flex items-center text-xs text-gray-600">
                환경변수 미설정
              </span>
            )}
          </div>

          {/* 검색창 */}
          <div className="relative flex items-center mt-3 mb-4">
            <svg className="absolute left-3 w-3.5 h-3.5 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1) }}
              placeholder="스트리머명·방송제목 검색"
              className="w-full pl-8 pr-8 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-600"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setPage(1) }}
                className="absolute right-3 text-gray-500 hover:text-gray-300 text-base leading-none"
              >×</button>
            )}
          </div>

          {/* 범위 표시 */}
          {!loading && filtered.length > 0 && (
            <div className="flex items-center justify-between mb-3 text-xs text-gray-600">
              <span>
                총 <span className="text-gray-400 font-bold">{filtered.length}명</span> 방송 중
              </span>
              <span>{safePage} / {totalPages} 페이지</span>
            </div>
          )}

          {/* 그리드 */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center">
              <div className="text-5xl mb-4">{query ? '🔍' : '😴'}</div>
              <p className="text-gray-500 text-sm">
                {query
                  ? `"${query}" 검색 결과가 없습니다.`
                  : tab === 'twitch'
                    ? '트위치 설정이 필요합니다. TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET 환경변수를 추가해주세요.'
                    : '현재 방송 중인 스트리머가 없습니다.'}
              </p>
              {query && (
                <button onClick={() => setQuery('')} className="mt-3 text-xs text-blue-500 hover:text-blue-400">
                  검색 초기화
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {paged.map((s, i) => (
                  <StreamerCard key={`${s.platform}-${s.streamerId}-${i}`} streamer={s} />
                ))}
              </div>
              <Pagination
                page={safePage}
                totalPages={totalPages}
                onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              />
            </>
          )}
        </div>
      </main>
    </>
  )
}
