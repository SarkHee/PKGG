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
      <div className="p-3 flex gap-2.5">
        {/* 프로필 */}
        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-gray-700">
          {streamerImage ? (
            <img src={streamerImage} alt={streamerName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center text-base">🎮</div>
          )}
        </div>
        {/* 텍스트 */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate">
            {streamerName}
            {verified && <span className="ml-1 text-blue-400 text-[10px]">✓</span>}
          </p>
          <p className="text-[11px] text-gray-500 truncate mt-0.5">{title}</p>
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

export default function StreamersPage() {
  const [tab,       setTab]       = useState('all')
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

  // 탭별 필터
  const streamers = data?.streamers || []
  const filtered = tab === 'all'   ? streamers
    : tab === 'drops'              ? streamers.filter((s) => s.hasDrops)
    : streamers.filter((s) => s.platform === tab)

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
          <div className="relative max-w-screen-xl mx-auto px-4 pt-10 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs font-bold text-red-400 tracking-widest uppercase">Live Now</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white">
                  배그 라이브 스트리머
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  치지직 · 트위치에서 지금 배틀그라운드 방송 중인 스트리머
                </p>
              </div>

              {/* 통계 + 갱신 */}
              <div className="flex flex-col items-start sm:items-end gap-1 text-xs">
                {!loading && data && (
                  <div className="flex items-center gap-3 text-gray-400">
                    <span>🟢 치지직 {counts.chzzk ?? 0}명</span>
                    <span>🟣 트위치 {counts.twitch ?? 0}명</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  {updatedLabel && <span>{updatedLabel} 기준</span>}
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

        <div className="max-w-screen-xl mx-auto px-4 pb-20">

          {/* 플랫폼 탭 */}
          <div className="flex gap-2 mb-6 border-b border-gray-800 pb-4">
            {TABS.map((t) => {
              const count = t.key === 'all'   ? streamers.length
                : t.key === 'drops'           ? streamers.filter((s) => s.hasDrops).length
                : (counts[t.key] ?? 0)
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    tab === t.key
                      ? 'bg-white/10 text-white border border-white/15'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/60'
                  }`}
                >
                  {t.key !== 'all' && (
                    <span className={`w-2 h-2 rounded-full ${
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
              <span className="ml-auto flex items-center text-xs text-gray-600">
                TWITCH_CLIENT_ID 설정 후 활성화
              </span>
            )}
          </div>

          {/* 그리드 */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center">
              <div className="text-5xl mb-4">😴</div>
              <p className="text-gray-500 text-sm">
                {tab === 'twitch'
                  ? '트위치 설정이 필요합니다. TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET 환경변수를 추가해주세요.'
                  : '현재 방송 중인 스트리머가 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map((s, i) => (
                <StreamerCard key={`${s.platform}-${s.streamerId}-${i}`} streamer={s} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
