import Head from 'next/head'
import { useEffect, useState } from 'react'
import Header from '../components/layout/Header'

const MAPS = [
  {
    internalName: 'Tiger_Main',
    id: 'taego',
    name: '태이고',
    nameEn: 'Taego',
    size: '8×8 km',
    img: 'https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/19581ee.webp',
    color: 'from-red-500 to-rose-600',
    border: 'border-red-500/30',
    accent: '#ef4444',
  },
  {
    internalName: 'Baltic_Main',
    id: 'erangel',
    name: '에란겔',
    nameEn: 'Erangel',
    size: '8×8 km',
    img: 'https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/590dba7.webp',
    color: 'from-green-500 to-emerald-600',
    border: 'border-green-500/30',
    accent: '#22c55e',
  },
  {
    internalName: 'Savage_Main',
    id: 'sanhok',
    name: '사녹',
    nameEn: 'Sanhok',
    size: '4×4 km',
    img: '/maps/sanhok.webp',
    color: 'from-lime-500 to-green-600',
    border: 'border-lime-500/30',
    accent: '#84cc16',
  },
  {
    internalName: 'Desert_Main',
    id: 'miramar',
    name: '미라마',
    nameEn: 'Miramar',
    size: '8×8 km',
    img: 'https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/24a088e.webp',
    color: 'from-yellow-500 to-amber-600',
    border: 'border-yellow-500/30',
    accent: '#eab308',
  },
  {
    internalName: 'Neon_Main',
    id: 'rondo',
    name: '론도',
    nameEn: 'Rondo',
    size: '8×8 km',
    img: '/maps/rondo.jpg',
    color: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-500/30',
    accent: '#10b981',
  },
  {
    internalName: 'Kiki_Main',
    id: 'deston',
    name: '데스턴',
    nameEn: 'Deston',
    size: '8×8 km',
    img: 'https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/e2bdf1e.webp',
    color: 'from-purple-500 to-violet-600',
    border: 'border-purple-500/30',
    accent: '#a855f7',
  },
  {
    internalName: 'DihorOtok_Main',
    id: 'vikendi',
    name: '비켄디',
    nameEn: 'Vikendi',
    size: '6×6 km',
    img: 'https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/d1080a6.webp',
    color: 'from-cyan-400 to-blue-500',
    border: 'border-cyan-400/30',
    accent: '#22d3ee',
  },
  {
    internalName: 'Summerland_Main',
    id: 'karakin',
    name: '카라킨',
    nameEn: 'Karakin',
    size: '2×2 km',
    img: '/maps/karakin.webp',
    color: 'from-orange-500 to-red-500',
    border: 'border-orange-500/30',
    accent: '#f97316',
  },
]

const SHARDS = [
  { key: 'all',   label: '전체' },
  { key: 'steam', label: 'Steam' },
  { key: 'kakao', label: '카카오' },
  { key: 'psn',   label: 'PS' },
]

export default function MapStatsPage() {
  const [shard, setShard]     = useState('all')
  const [stats, setStats]     = useState({})
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/maps/stats?shard=${shard}`)
      .then(r => r.json())
      .then(({ stats: rows = [], total: t = 0 }) => {
        const map = {}
        rows.forEach(r => { map[r.mapName] = r })
        setStats(map)
        setTotal(t)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [shard])

  const sorted = [...MAPS].sort((a, b) => {
    const ca = stats[a.internalName]?.count ?? 0
    const cb = stats[b.internalName]?.count ?? 0
    return cb - ca
  })

  const maxCount = Math.max(...MAPS.map(m => stats[m.internalName]?.count ?? 0), 1)

  return (
    <>
      <Head>
        <title>맵 선호도 통계 | PKGG</title>
        <meta name="description" content="PKGG 유저들이 가장 많이 플레이하는 맵 통계. 에란겔, 미라마, 사녹, 태이고, 데스턴, 론도, 비켄디, 카라킨." />
      </Head>

      <Header />

      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-16">
        {/* 헤더 */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              맵 선호도 통계
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              PKGG 유저들이 가장 많이 플레이한 맵을 분석합니다
            </p>
            {!loading && total > 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                총 {total.toLocaleString()}경기 기반
              </p>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 pt-6">
          {/* 플랫폼 탭 */}
          <div className="flex gap-2 mb-6">
            {SHARDS.map((s) => (
              <button
                key={s.key}
                onClick={() => setShard(s.key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  shard === s.key
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* 맵 카드 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {(loading ? MAPS : sorted).map((map, idx) => {
              const data  = stats[map.internalName]
              const count = data?.count ?? 0
              const pct   = data?.pct ?? 0
              const barW  = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0
              const rank  = !loading && count > 0 ? idx + 1 : null

              return (
                <div
                  key={map.id}
                  className={`bg-white dark:bg-gray-900 rounded-2xl border ${map.border} dark:border-gray-800 overflow-hidden shadow-sm`}
                >
                  {/* 맵 이미지 */}
                  <div className="relative h-36 overflow-hidden">
                    {map.img ? (
                      <img src={map.img} alt={map.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${map.color} opacity-80`} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end px-3 pb-2">
                      <div>
                        <span className="text-white font-bold text-base">{map.name}</span>
                        <span className="text-white/60 text-xs ml-1.5">{map.nameEn}</span>
                      </div>
                      <span className="ml-auto text-white/50 text-xs">{map.size}</span>
                    </div>
                    {rank && (
                      <div
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shadow"
                        style={{ backgroundColor: rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : rank === 3 ? '#d97706' : 'rgba(0,0,0,0.5)' }}
                      >
                        {rank}
                      </div>
                    )}
                  </div>

                  {/* 카드 바디 */}
                  <div className="p-4">
                    {loading ? (
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-3/4" />
                      </div>
                    ) : count === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                        데이터 없음
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {/* 선호도 % */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500 dark:text-gray-400">선호도</span>
                            <span className="font-bold" style={{ color: map.accent }}>{pct}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, backgroundColor: map.accent }}
                            />
                          </div>
                        </div>
                        {/* 플레이 수 */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500 dark:text-gray-400">플레이 수</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-200">
                              {count.toLocaleString()}회
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${barW}%`, backgroundColor: map.accent + 'aa' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 하단 안내 */}
          {!loading && total > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-5 text-center">
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                PKGG에서 검색된 유저들의 최근 경기 기반 통계입니다.
                <span className="text-blue-600 dark:text-blue-400 font-semibold"> 총 {total.toLocaleString()}경기</span> 집계됨.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
