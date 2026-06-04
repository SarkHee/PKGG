// components/player/DropHeatmap.jsx
// 플레이어 낙하지점 히트맵
import { useEffect, useRef, useState } from 'react'

// PUBG 맵 내부 좌표 → 이미지 상대좌표 변환
// 텔레메트리 좌표: x/y는 게임 월드 단위 (cm 기준, 에란겔 8km = 816,000 단위)
const MAP_META = {
  Baltic_Main:       { name: 'Deston',   img: '/maps/deston.jpg',   size: 816000 },
  Desert_Main:       { name: 'Miramar',  img: '/maps/miramar.jpg',  size: 816000 },
  DihorOtok_Main:    { name: 'Vikendi',  img: '/maps/vikendi.jpg',  size: 612000 },
  Erangel_Main:      { name: 'E란겔',   img: '/maps/erangel.jpg',  size: 816000 },
  Kiki_Main:         { name: 'Karakin',  img: '/maps/karakin.webp', size: 204000 },
  Savage_Main:       { name: 'Sanhok',   img: '/maps/sanhok.webp',  size: 408000 },
  Summerland_Main:   { name: 'Paramo',   img: '/maps/paramo.webp',  size: 306000 },
  Tiger_Main:        { name: 'Taego',    img: '/maps/taego.jpg',    size: 816000 },
  BGSR_Main:         { name: 'Rondo',    img: '/maps/rondo.jpg',    size: 816000 },
}

const CANVAS_SIZE = 320

function worldToCanvas(x, y, mapSize) {
  return [
    (x / mapSize) * CANVAS_SIZE,
    (1 - y / mapSize) * CANVAS_SIZE,
  ]
}

export default function DropHeatmap({ accountId }) {
  const canvasRef  = useRef(null)
  const [stats,    setStats]    = useState([])
  const [mapFilter, setMapFilter] = useState('all')
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!accountId) return
    setLoading(true)
    fetch(`/api/player/landing-stats?accountId=${encodeURIComponent(accountId)}`)
      .then(r => r.json())
      .then(d => setStats(d.stats || []))
      .catch(() => setStats([]))
      .finally(() => setLoading(false))
  }, [accountId])

  // 맵별 그룹화
  const mapGroups = {}
  stats.forEach(s => {
    if (!mapGroups[s.mapName]) mapGroups[s.mapName] = []
    mapGroups[s.mapName].push(s)
  })

  const filtered = mapFilter === 'all' ? stats : stats.filter(s => s.mapName === mapFilter)
  const currentMeta = mapFilter !== 'all' ? MAP_META[mapFilter] : null

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || filtered.length === 0) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    // 배경 맵 이미지 로드
    const meta = currentMeta || MAP_META[filtered[0]?.mapName]
    if (!meta) return

    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE)

      // 위치별 빈도 계산 (grid 4x4 단위로 클러스터링)
      const grid = {}
      const mapSize = meta.size
      filtered.forEach(s => {
        const [cx, cy] = worldToCanvas(s.locationX, s.locationY, mapSize)
        const gx = Math.round(cx / 4) * 4
        const gy = Math.round(cy / 4) * 4
        const key = `${gx},${gy}`
        grid[key] = (grid[key] || 0) + 1
      })

      const maxCount = Math.max(...Object.values(grid))

      Object.entries(grid).forEach(([key, count]) => {
        const [gx, gy] = key.split(',').map(Number)
        const ratio = count / maxCount
        const r = Math.max(3, ratio * 10)
        const alpha = 0.4 + ratio * 0.5

        // 빈도에 따라 색상 변화 (파랑→노랑→빨강)
        let color
        if (ratio > 0.66) color = `rgba(239,68,68,${alpha})`
        else if (ratio > 0.33) color = `rgba(234,179,8,${alpha})`
        else color = `rgba(59,130,246,${alpha})`

        ctx.beginPath()
        ctx.arc(gx, gy, r, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
      })
    }
    img.src = meta.img
  }, [filtered, currentMeta])

  const mapNames = Object.keys(mapGroups)

  if (loading) return (
    <div className="bg-gray-900 rounded-2xl p-4 border border-gray-700/50">
      <div className="text-xs text-gray-500 animate-pulse">낙하지점 데이터 로딩 중...</div>
    </div>
  )

  if (stats.length === 0) return (
    <div className="bg-gray-900 rounded-2xl p-4 border border-gray-700/50 text-center">
      <p className="text-gray-600 text-sm">낙하지점 데이터가 없습니다</p>
      <p className="text-gray-700 text-xs mt-1">경기가 분석되면 자동으로 수집됩니다</p>
    </div>
  )

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-700/50 overflow-hidden">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-white">🪂 낙하지점 히트맵</h3>
          <p className="text-xs text-gray-500 mt-0.5">최근 {stats.length}경기 기준</p>
        </div>
        {/* 맵 필터 */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setMapFilter('all')}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
              mapFilter === 'all' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >전체</button>
          {mapNames.map(mn => (
            <button
              key={mn}
              onClick={() => setMapFilter(mn)}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                mapFilter === mn ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {MAP_META[mn]?.name || mn} ({mapGroups[mn].length})
            </button>
          ))}
        </div>
      </div>

      {/* 캔버스 */}
      <div className="p-4 flex justify-center">
        {filtered.length > 0 ? (
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="rounded-xl border border-gray-700/50"
            style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
          />
        ) : (
          <div className="w-80 h-80 flex items-center justify-center text-gray-600 text-sm border border-gray-700/50 rounded-xl">
            선택한 맵 데이터 없음
          </div>
        )}
      </div>

      {/* 범례 */}
      <div className="px-4 pb-3 flex items-center gap-4 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"/>낮은 빈도</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"/>중간 빈도</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>높은 빈도</span>
      </div>
    </div>
  )
}
