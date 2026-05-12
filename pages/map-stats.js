import Head from 'next/head'
import { useState } from 'react'
import Header from '../components/layout/Header'

const MAPS = [
  {
    id: 'erangel',
    name: '에란겔',
    nameEn: 'Erangel',
    size: '8×8 km',
    img: 'https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/590dba7.webp',
    color: 'from-green-500 to-emerald-600',
    border: 'border-green-500/30',
  },
  {
    id: 'miramar',
    name: '미라마',
    nameEn: 'Miramar',
    size: '8×8 km',
    img: 'https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/24a088e.webp',
    color: 'from-yellow-500 to-amber-600',
    border: 'border-yellow-500/30',
  },
  {
    id: 'vikendi',
    name: '비켄디',
    nameEn: 'Vikendi',
    size: '6×6 km',
    img: 'https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/d1080a6.webp',
    color: 'from-cyan-400 to-blue-500',
    border: 'border-cyan-400/30',
  },
  {
    id: 'taego',
    name: '태이고',
    nameEn: 'Taego',
    size: '8×8 km',
    img: 'https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/19581ee.webp',
    color: 'from-red-500 to-rose-600',
    border: 'border-red-500/30',
  },
  {
    id: 'deston',
    name: '데스턴',
    nameEn: 'Deston',
    size: '8×8 km',
    img: 'https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/e2bdf1e.webp',
    color: 'from-purple-500 to-violet-600',
    border: 'border-purple-500/30',
  },
  {
    id: 'rondo',
    name: '론도',
    nameEn: 'Rondo',
    size: '8×8 km',
    img: '/maps/rondo.jpg',
    color: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-500/30',
  },
]

const PLATFORMS = ['전체', 'Steam', '카카오']

export default function MapStatsPage() {
  const [platform, setPlatform] = useState('전체')

  return (
    <>
      <Head>
        <title>맵 선호도 통계 | PKGG</title>
        <meta name="description" content="PUBG 플레이어들이 가장 많이 플레이하는 맵 통계. 에란겔, 미라마, 비켄디, 태이고, 데스턴, 론도." />
      </Head>

      <Header />

      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-16">
        {/* 상단 헤더 */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              맵 선호도 통계
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              PKGG 유저들이 가장 많이 플레이한 맵을 분석합니다
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 pt-6">
          {/* 플랫폼 탭 */}
          <div className="flex gap-2 mb-6">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                  platform === p
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* 맵 카드 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {MAPS.map((map) => (
              <div
                key={map.id}
                className={`bg-white dark:bg-gray-900 rounded-2xl border ${map.border} dark:border-gray-800 overflow-hidden shadow-sm`}
              >
                {/* 맵 이미지 */}
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={map.img}
                    alt={map.name}
                    className="w-full h-full object-cover"
                  />
                  {/* 맵 이름 오버레이 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end px-3 pb-2">
                    <div>
                      <span className="text-white font-bold text-base">{map.name}</span>
                      <span className="text-white/60 text-xs ml-1.5">{map.nameEn}</span>
                    </div>
                    <span className="ml-auto text-white/50 text-xs">{map.size}</span>
                  </div>
                </div>

                {/* 카드 바디 */}
                <div className="p-4">
                  {/* 데이터 수집 중 문구 */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      데이터 수집 중입니다 📊
                    </span>
                  </div>

                  {/* 프로그레스바 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                      <span>선호도</span>
                      <span>0%</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full w-0 bg-gray-300 dark:bg-gray-700 rounded-full" />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
                      <span>플레이 수</span>
                      <span>—</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full w-0 bg-gray-300 dark:bg-gray-700 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 하단 안내 문구 */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-6 text-center">
            <div className="text-2xl mb-3">📊</div>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
              현재 데이터를 수집하고 있어요.<br />
              더 많은 유저가 검색할수록 정확한 통계가 만들어져요 🙌<br />
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                빠른 시일 내에 실제 데이터로 업데이트할게요!
              </span>
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
