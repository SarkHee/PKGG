// pages/route-planner.js — 배그 동선 계획 도구 (Canvas 기반)
import Head from 'next/head'
import { useState, useRef, useEffect, useCallback } from 'react'
import Header from '../components/layout/Header'
import { toPng } from 'html-to-image'

// ── 맵 데이터 ──────────────────────────────────────────────────────────────
const MAPS = [
  { id: 'erangel', name: '에란겔', img: '/maps/erangel.jpg', kmSize: 8 },
  { id: 'miramar', name: '미라마', img: '/maps/miramar.jpg', kmSize: 8 },
  { id: 'taego',   name: '태이고', img: '/maps/taego.jpg',   kmSize: 8 },
  { id: 'deston',  name: '데스턴', img: '/maps/deston.jpg',  kmSize: 8 },
  { id: 'rondo',   name: '론도',   img: '/maps/rondo.jpg',   kmSize: 8 },
  { id: 'vikendi', name: '비켄디', img: '/maps/vikendi.jpg', kmSize: 6 },
  { id: 'sanhok',  name: '사녹',   img: '/maps/sanhok.jpg',  kmSize: 4 },
  { id: 'paramo',  name: '파라모', img: '/maps/paramo.jpg',  kmSize: 3 },
  { id: 'karakin', name: '카라킨', img: '/maps/karakin.jpg', kmSize: 2 },
]
const COLORS = ['#ef4444','#3b82f6','#22c55e','#eab308','#f97316','#a855f7','#ec4899','#ffffff']

// ── 유틸 ───────────────────────────────────────────────────────────────────
const meterDist = (p1, p2, km) => {
  const dx = (p2.x - p1.x) / 100 * km
  const dy = (p2.y - p1.y) / 100 * km
  return Math.round(Math.sqrt(dx * dx + dy * dy) * 1000)
}
const distLabel = (p1, p2, km) => `${meterDist(p1, p2, km).toLocaleString()}m`

// ── Canvas 좌표 변환 (% → 화면 물리 픽셀) ──────────────────────────────────
// Canvas는 transform div 밖에 위치 → 직접 좌표 변환 필요
function toPx(x, y, W, H, T, dpr) {
  const px = x / 100 * W
  const py = y / 100 * H
  const cx = W / 2, cy = H / 2
  return [
    (cx + T.scale * (px - cx) + T.x) * dpr,
    (cy + T.scale * (py - cy) + T.y) * dpr,
  ]
}

// ── 격자 드로잉 ────────────────────────────────────────────────────────────
function drawGrid(ctx, kmSize, W, H, T, dpr) {
  const cols = kmSize, rows = kmSize
  const sub  = 10  // 100m 단위

  // 특정 % 위치의 화면 X 좌표
  const screenX = (pct) => {
    const px = pct / 100 * W
    return (W / 2 + T.scale * (px - W / 2) + T.x) * dpr
  }
  const screenY = (pct) => {
    const py = pct / 100 * H
    return (H / 2 + T.scale * (py - H / 2) + T.y) * dpr
  }

  // 100m 소격자
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth   = 0.7 * dpr
  for (let c = 1; c < cols * sub; c++) {
    if (c % sub === 0) continue
    const x = screenX(c / (cols * sub) * 100)
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H * dpr); ctx.stroke()
  }
  for (let r = 1; r < rows * sub; r++) {
    if (r % sub === 0) continue
    const y = screenY(r / (rows * sub) * 100)
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W * dpr, y); ctx.stroke()
  }

  // 1km 대격자
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth   = 1.5 * dpr
  for (let c = 0; c <= cols; c++) {
    const x = screenX(c / cols * 100)
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H * dpr); ctx.stroke()
  }
  for (let r = 0; r <= rows; r++) {
    const y = screenY(r / rows * 100)
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W * dpr, y); ctx.stroke()
  }

  // 격자 라벨 (A1, B2...)
  const fs = 13 * dpr
  ctx.font         = `bold ${fs}px monospace`
  ctx.fillStyle    = 'rgba(255,255,255,0.75)'
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'top'
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const [lx, ly] = toPx(c / cols * 100 + 0.5, r / rows * 100 + 0.5, W, H, T, dpr)
      ctx.fillText(`${String.fromCharCode(65 + c)}${r + 1}`, lx - ctx.measureText('A1').width / 2, ly - fs / 2)
    }
  }
}

// ── 경로 드로잉 ────────────────────────────────────────────────────────────
function drawRoutes(ctx, routes, activeId, kmSize, W, H, T, dpr) {
  routes.forEach(route => {
    const isActive = route.id === activeId
    const pts      = route.points
    if (pts.length === 0) return

    // 연결선
    if (pts.length >= 2) {
      ctx.save()
      ctx.strokeStyle = route.color
      ctx.lineWidth   = (isActive ? 2.5 : 1.5) * dpr
      ctx.globalAlpha = isActive ? 0.9 : 0.4
      ctx.setLineDash([8 * dpr, 4 * dpr])
      ctx.beginPath()
      const [x0, y0] = toPx(pts[0].x, pts[0].y, W, H, T, dpr)
      ctx.moveTo(x0, y0)
      pts.slice(1).forEach(p => {
        const [xi, yi] = toPx(p.x, p.y, W, H, T, dpr)
        ctx.lineTo(xi, yi)
      })
      ctx.stroke()
      ctx.restore()
    }

    // 거리 라벨 (활성 경로만)
    if (isActive && pts.length >= 2) {
      pts.slice(1).forEach((pt, i) => {
        const p1  = pts[i]
        const mx  = (p1.x + pt.x) / 2
        const my  = (p1.y + pt.y) / 2
        const [cx, cy] = toPx(mx, my, W, H, T, dpr)
        const label = distLabel(p1, pt, kmSize)
        const fs = 11 * dpr
        ctx.save()
        ctx.font         = `bold ${fs}px sans-serif`
        ctx.textAlign    = 'center'
        ctx.textBaseline = 'middle'
        const tw = ctx.measureText(label).width
        ctx.fillStyle = 'rgba(0,0,0,0.78)'
        ctx.fillRect(cx - tw / 2 - 6 * dpr, cy - fs / 2 - 3 * dpr, tw + 12 * dpr, fs + 6 * dpr)
        ctx.fillStyle = 'white'
        ctx.fillText(label, cx, cy)
        ctx.restore()
      })
    }

    // 웨이포인트 원
    pts.forEach((pt, i) => {
      const [cx, cy] = toPx(pt.x, pt.y, W, H, T, dpr)
      const r = (isActive ? 8 : 5) * dpr
      ctx.save()
      ctx.globalAlpha = isActive ? 0.92 : 0.45
      ctx.fillStyle   = route.color
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = 1
      ctx.fillStyle   = 'white'
      ctx.font        = `bold ${8 * dpr}px sans-serif`
      ctx.textAlign   = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(i + 1, cx, cy)
      if (pt.label) {
        const fs = 10 * dpr
        ctx.font          = `bold ${fs}px sans-serif`
        ctx.strokeStyle   = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3 * dpr
        ctx.textBaseline  = 'alphabetic'
        ctx.strokeText(pt.label, cx, cy - r - 5 * dpr)
        ctx.fillStyle     = 'white'
        ctx.fillText(pt.label, cx, cy - r - 5 * dpr)
      }
      ctx.restore()
    })
  })
}

// ── 마커 드로잉 ────────────────────────────────────────────────────────────
function drawMarkers(ctx, markers, kmSize, W, H, T, dpr) {
  markers.forEach(mk => {
    const [cx, cy] = toPx(mk.x, mk.y, W, H, T, dpr)
    const r = 8 * dpr

    // 반경 원
    if (mk.radiusKm > 0) {
      // 반경을 km → % → 화면 픽셀로 변환
      const rPct  = mk.radiusKm / kmSize * 100
      const [ex]  = toPx(mk.x + rPct, mk.y, W, H, T, dpr)
      const rPx   = Math.abs(ex - cx)
      ctx.save()
      ctx.strokeStyle = mk.color; ctx.lineWidth = 1.5 * dpr
      ctx.setLineDash([5 * dpr, 3 * dpr]); ctx.globalAlpha = 0.55
      ctx.beginPath(); ctx.arc(cx, cy, rPx, 0, Math.PI * 2); ctx.stroke()
      ctx.setLineDash([])
      ctx.font = `bold ${10 * dpr}px sans-serif`
      ctx.fillStyle = mk.color; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
      ctx.fillText(`r: ${mk.radiusKm}km`, cx + rPx + 5 * dpr, cy)
      ctx.restore()
    }

    // 핀 모양
    ctx.save()
    ctx.fillStyle = mk.color
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath()
    ctx.moveTo(cx, cy + r + 8 * dpr)
    ctx.lineTo(cx - 4 * dpr, cy + r)
    ctx.lineTo(cx + 4 * dpr, cy + r)
    ctx.closePath(); ctx.fill()
    if (mk.label) {
      const fs = 10 * dpr
      ctx.font = `bold ${fs}px sans-serif`
      ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3 * dpr
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
      ctx.strokeText(mk.label, cx, cy - r - 5 * dpr)
      ctx.fillStyle = 'white'
      ctx.fillText(mk.label, cx, cy - r - 5 * dpr)
    }
    ctx.restore()
  })
}

// ── 거리 측정 드로잉 ───────────────────────────────────────────────────────
function drawMeasurements(ctx, measurements, pending, kmSize, W, H, T, dpr) {
  measurements.forEach(m => {
    const [x1, y1] = toPx(m.p1.x, m.p1.y, W, H, T, dpr)
    const [x2, y2] = toPx(m.p2.x, m.p2.y, W, H, T, dpr)
    ctx.save()
    ctx.strokeStyle = m.color; ctx.lineWidth = 2 * dpr
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
    ctx.fillStyle = m.color
    for (const [cx, cy] of [[x1, y1], [x2, y2]]) {
      ctx.beginPath(); ctx.arc(cx, cy, 5 * dpr, 0, Math.PI * 2); ctx.fill()
    }
    if (m.distLabel) {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
      const fs = 12 * dpr
      ctx.font = `bold ${fs}px sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      const tw = ctx.measureText(m.distLabel).width
      ctx.fillStyle = 'rgba(0,0,0,0.85)'
      ctx.fillRect(mx - tw / 2 - 8 * dpr, my - fs / 2 - 4 * dpr, tw + 16 * dpr, fs + 8 * dpr)
      ctx.fillStyle = '#fde047'
      ctx.fillText(m.distLabel, mx, my)
    }
    ctx.restore()
  })

  if (pending) {
    const [cx, cy] = toPx(pending.x, pending.y, W, H, T, dpr)
    ctx.save()
    ctx.fillStyle = pending.color; ctx.globalAlpha = 0.85
    ctx.beginPath(); ctx.arc(cx, cy, 7 * dpr, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = pending.color; ctx.lineWidth = 1.5 * dpr; ctx.globalAlpha = 0.4
    ctx.beginPath(); ctx.arc(cx, cy, 14 * dpr, 0, Math.PI * 2); ctx.stroke()
    ctx.restore()
  }
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────
export default function RoutePlanner() {
  const [selectedMap,    setSelectedMap]    = useState(MAPS[0])
  const [tool,           setTool]           = useState('route')
  const [showGrid,       setShowGrid]       = useState(false)
  const [activeColor,    setActiveColor]    = useState('#ef4444')
  const [markerRadius,   setMarkerRadius]   = useState('')
  const [nextLabel,      setNextLabel]      = useState('')

  const [routes,         setRoutes]         = useState([{ id: 0, color: '#ef4444', label: 'A팀', points: [] }])
  const [activeRoute,    setActiveRoute]    = useState(0)
  const [markers,        setMarkers]        = useState([])
  const [measurements,   setMeasurements]   = useState([])
  const [pendingMeasure, setPendingMeasure] = useState(null)

  const [transform,      setTransform]      = useState({ scale: 1, x: 0, y: 0 })
  const [dragging,       setDragging]       = useState(false)

  const mapRef    = useRef(null)
  const canvasRef = useRef(null)
  const dragRef   = useRef(false)
  const lastPos   = useRef({ x: 0, y: 0 })
  const dragMoved = useRef(false)

  // ── Canvas 크기를 컨테이너에 맞게 설정 ──
  useEffect(() => {
    const resize = () => {
      const canvas    = canvasRef.current
      const container = mapRef.current
      if (!canvas || !container) return
      const dpr  = window.devicePixelRatio || 1
      const rect = container.getBoundingClientRect()
      canvas.width  = Math.round(rect.width  * dpr)
      canvas.height = Math.round(rect.height * dpr)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  // ── Canvas 드로우 ──
  const draw = useCallback(() => {
    const canvas    = canvasRef.current
    const container = mapRef.current
    if (!canvas || !container) return
    const dpr  = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    const W    = rect.width, H = rect.height
    const ctx  = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (showGrid)
      drawGrid(ctx, selectedMap.kmSize, W, H, transform, dpr)
    drawRoutes(ctx, routes, activeRoute, selectedMap.kmSize, W, H, transform, dpr)
    drawMarkers(ctx, markers, selectedMap.kmSize, W, H, transform, dpr)
    drawMeasurements(ctx, measurements, pendingMeasure, selectedMap.kmSize, W, H, transform, dpr)
  }, [showGrid, routes, activeRoute, markers, measurements, pendingMeasure, transform, selectedMap])

  useEffect(() => { draw() }, [draw])

  // ── 줌 휠 (마우스 위치 기준) ──
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const rect = mapRef.current?.getBoundingClientRect()
    if (!rect) return
    const delta = e.deltaY > 0 ? -0.15 : 0.15
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const cx = rect.width / 2, cy = rect.height / 2
    setTransform(prev => {
      const newScale = Math.max(1, Math.min(8, prev.scale + delta))
      if (newScale === prev.scale) return prev
      if (newScale === 1) return { scale: 1, x: 0, y: 0 }
      const factor = newScale / prev.scale
      const newX   = (mx - cx) * (1 - factor) + prev.x * factor
      const newY   = (my - cy) * (1 - factor) + prev.y * factor
      const maxX   = rect.width  * (newScale - 1) / 2
      const maxY   = rect.height * (newScale - 1) / 2
      return {
        scale: newScale,
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY)),
      }
    })
  }, [])
  useEffect(() => {
    const el = mapRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // ── 드래그 ──
  const handleMouseDown = (e) => {
    dragMoved.current = false
    if (transform.scale <= 1) return
    dragRef.current = true; setDragging(true)
    lastPos.current = { x: e.clientX, y: e.clientY }
    e.preventDefault()
  }
  const handleMouseMove = (e) => {
    if (!dragRef.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
    setTransform(p => {
      const rect = mapRef.current?.getBoundingClientRect()
      if (!rect) return p
      const maxX = rect.width  * (p.scale - 1) / 2
      const maxY = rect.height * (p.scale - 1) / 2
      return {
        ...p,
        x: Math.max(-maxX, Math.min(maxX, p.x + dx)),
        y: Math.max(-maxY, Math.min(maxY, p.y + dy)),
      }
    })
  }
  const handleMouseUp = () => { dragRef.current = false; setDragging(false) }

  // ── 이미지 좌표 변환 (클릭 → 맵 %) ──
  const getImgCoords = (e) => {
    const rect = mapRef.current?.getBoundingClientRect()
    if (!rect) return null
    const cx = rect.width / 2, cy = rect.height / 2
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top
    const ix = cx + (sx - cx - transform.x) / transform.scale
    const iy = cy + (sy - cy - transform.y) / transform.scale
    return {
      x: Math.max(0, Math.min(100, (ix / rect.width)  * 100)),
      y: Math.max(0, Math.min(100, (iy / rect.height) * 100)),
    }
  }

  // ── 맵 클릭 ──
  const handleMapClick = (e) => {
    if (e.target.closest('button')) return
    if (dragMoved.current) return
    const pt = getImgCoords(e)
    if (!pt) return

    if (tool === 'route') {
      setRoutes(prev => prev.map(r =>
        r.id === activeRoute
          ? { ...r, points: [...r.points, { ...pt, label: nextLabel.trim() }] }
          : r
      ))
      setNextLabel('')
    } else if (tool === 'measure') {
      if (!pendingMeasure) {
        setPendingMeasure({ ...pt, color: activeColor })
      } else {
        setMeasurements(prev => [...prev, {
          id: Date.now(), p1: pendingMeasure, p2: pt,
          color: activeColor,
          distLabel: distLabel(pendingMeasure, pt, selectedMap.kmSize),
        }])
        setPendingMeasure(null)
      }
    } else if (tool === 'marker') {
      const r = parseFloat(markerRadius)
      setMarkers(prev => [...prev, {
        id: Date.now(), ...pt, color: activeColor,
        label: nextLabel.trim(),
        radiusKm: isNaN(r) ? 0 : r,
      }])
      setNextLabel('')
    }
  }

  const undo = () => {
    if (tool === 'route') {
      setRoutes(prev => prev.map(r =>
        r.id === activeRoute ? { ...r, points: r.points.slice(0, -1) } : r
      ))
    } else if (tool === 'measure') {
      if (pendingMeasure) setPendingMeasure(null)
      else setMeasurements(prev => prev.slice(0, -1))
    } else if (tool === 'marker') {
      setMarkers(prev => prev.slice(0, -1))
    }
  }

  const clearAll = () => {
    setRoutes([{ id: 0, color: '#ef4444', label: 'A팀', points: [] }])
    setActiveRoute(0); setMarkers([]); setMeasurements([]); setPendingMeasure(null)
  }

  const saveImage = async () => {
    if (!mapRef.current) return
    try {
      const url = await toPng(mapRef.current, { cacheBust: true })
      const a = document.createElement('a')
      a.href = url; a.download = `pubg-route-${selectedMap.id}.png`; a.click()
    } catch (err) { console.error(err) }
  }

  const currentRoute = routes.find(r => r.id === activeRoute)
  const totalDist = currentRoute?.points.length >= 2
    ? (() => {
        let m = 0
        currentRoute.points.slice(1).forEach((pt, i) => {
          m += meterDist(currentRoute.points[i], pt, selectedMap.kmSize)
        })
        return `${m.toLocaleString()}m`
      })()
    : null

  return (
    <>
      <Head>
        <title>동선 계획 | PKGG</title>
        <meta name="description" content="배틀그라운드 맵 위에 동선·거리측정·마커를 계획하세요." />
      </Head>
      <Header />

      <main className="min-h-screen bg-gray-950 text-gray-100">
        <div className="max-w-screen-xl mx-auto px-4 py-5">

          <div className="mb-4">
            <h1 className="text-2xl font-black text-white">🗺️ 동선 계획</h1>
            <p className="text-gray-500 text-sm mt-0.5">맵 위를 클릭해 동선·거리·마커를 계획하세요</p>
          </div>

          {/* 맵 선택 */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            {MAPS.map(m => (
              <button key={m.id}
                onClick={() => { setSelectedMap(m); setTransform({ scale: 1, x: 0, y: 0 }) }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  selectedMap.id === m.id
                    ? 'bg-white/10 text-white border-white/20'
                    : 'text-gray-500 border-gray-700 hover:text-gray-300 hover:border-gray-500'
                }`}
              >{m.name} <span className="text-gray-600 font-normal">{m.kmSize}km</span></button>
            ))}
          </div>

          <div className="flex gap-4 flex-col lg:flex-row">

            {/* ── 맵 영역 ── */}
            <div className="flex-1 min-w-0">
              <div
                ref={mapRef}
                className="relative rounded-2xl overflow-hidden border border-gray-700 bg-gray-950"
                style={{
                  aspectRatio: '1/1',
                  cursor: dragging ? 'grabbing' : 'crosshair',
                  userSelect: 'none',
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDoubleClick={() => setTransform({ scale: 1, x: 0, y: 0 })}
                onClick={handleMapClick}
              >
                {/* 맵 이미지 (transform 적용) */}
                <div style={{
                  position: 'absolute', inset: 0,
                  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                  transformOrigin: 'center center',
                }}>
                  <img src={selectedMap.img} alt={selectedMap.name}
                    className="w-full h-full object-contain" draggable={false} />
                </div>

                {/* Canvas — transform 밖에 위치 → 선명한 렌더링 */}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 pointer-events-none"
                  style={{ width: '100%', height: '100%' }}
                />

                {/* HUD */}
                {pendingMeasure && (
                  <div className="absolute top-3 left-3 z-10 bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 text-xs px-3 py-1 rounded-lg backdrop-blur-sm">
                    두 번째 점을 클릭하세요
                  </div>
                )}
                <div className="absolute bottom-3 right-3 z-10 flex gap-2">
                  {transform.scale > 1 && (
                    <button onClick={e => { e.stopPropagation(); setTransform({ scale: 1, x: 0, y: 0 }) }}
                      className="bg-gray-900/85 text-white text-[11px] px-2.5 py-1 rounded-lg backdrop-blur-sm hover:bg-gray-700"
                    >초기화</button>
                  )}
                  <div className="bg-gray-900/85 text-gray-400 text-[11px] px-2.5 py-1 rounded-lg backdrop-blur-sm tabular-nums">
                    {Math.round(transform.scale * 100)}%
                  </div>
                </div>
                {transform.scale === 1 && (
                  <div className="absolute bottom-3 left-3 text-[10px] text-gray-600 pointer-events-none">
                    스크롤: 줌 · 더블클릭: 초기화
                  </div>
                )}
              </div>
            </div>

            {/* ── 툴바 패널 ── */}
            <div className="w-full lg:w-64 flex flex-col gap-3">

              {/* 도구 선택 */}
              <div className="bg-gray-900 rounded-2xl border border-gray-700/50 p-3">
                <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-2">도구</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { key: 'route',   icon: '📍', label: '동선' },
                    { key: 'measure', icon: '📏', label: '거리측정' },
                    { key: 'marker',  icon: '🔵', label: '마커' },
                  ].map(t => (
                    <button key={t.key}
                      onClick={() => { setTool(t.key); setPendingMeasure(null) }}
                      className={`flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        tool === t.key
                          ? 'bg-white/10 text-white border-white/20'
                          : 'text-gray-500 border-gray-800 hover:text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      <span className="text-base">{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
                {/* 격자 토글 */}
                <button onClick={() => setShowGrid(v => !v)}
                  className={`mt-2 w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    showGrid
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                      : 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <span>⊞ 격자 (1km / 100m)</span>
                  <span className={`w-7 h-4 rounded-full relative transition-all ${showGrid ? 'bg-blue-500' : 'bg-gray-700'}`}>
                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${showGrid ? 'left-3.5' : 'left-0.5'}`}/>
                  </span>
                </button>
              </div>

              {/* 색상 */}
              <div className="bg-gray-900 rounded-2xl border border-gray-700/50 p-3">
                <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-2">색상</div>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setActiveColor(c)}
                      className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ backgroundColor: c, borderColor: activeColor === c ? 'white' : 'transparent' }}
                    />
                  ))}
                </div>
              </div>

              {/* 도구별 설정 */}
              <div className="bg-gray-900 rounded-2xl border border-gray-700/50 p-3">
                <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  {tool === 'measure' ? '거리측정 안내' : '설정'}
                </div>
                {tool !== 'measure' && (
                  <input type="text" value={nextLabel} onChange={e => setNextLabel(e.target.value)}
                    placeholder={tool === 'route' ? '포인트 라벨 (선택)' : '마커 라벨 (선택)'}
                    maxLength={12}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 mb-2"
                  />
                )}
                {tool === 'marker' && (
                  <>
                    <input type="number" value={markerRadius} onChange={e => setMarkerRadius(e.target.value)}
                      placeholder="반경 km (선택)" min="0" step="0.1"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[10px] text-gray-600 mt-1">반경 입력 시 원 표시 (박격포 계산용)</p>
                  </>
                )}
                {tool === 'measure' && (
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <p className={pendingMeasure ? 'text-green-400' : ''}>① 첫 번째 점 클릭</p>
                    <p className={pendingMeasure ? 'text-yellow-400' : ''}>② 두 번째 점 클릭 → 거리 표시</p>
                    {measurements.length > 0 && <p className="text-gray-600">{measurements.length}개 측정됨</p>}
                  </div>
                )}
              </div>

              {/* 경로 목록 (동선 모드) */}
              {tool === 'route' && (
                <div className="bg-gray-900 rounded-2xl border border-gray-700/50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">경로 목록</div>
                    <button onClick={() => {
                      const id = Date.now()
                      const c  = COLORS[routes.length % COLORS.length]
                      setRoutes(p => [...p, { id, color: c, label: `${String.fromCharCode(65 + routes.length)}팀`, points: [] }])
                      setActiveRoute(id); setActiveColor(c)
                    }} className="text-xs text-blue-400 hover:text-blue-300 font-bold">+ 추가</button>
                  </div>
                  <div className="space-y-1">
                    {routes.map(r => (
                      <div key={r.id} onClick={() => setActiveRoute(r.id)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl cursor-pointer transition-all ${
                          activeRoute === r.id ? 'bg-white/8 border border-white/10' : 'hover:bg-gray-800/60'
                        }`}
                      >
                        <div className="w-3 h-3 rounded-full flex-shrink-0 cursor-pointer"
                          style={{ backgroundColor: r.color }}
                          onClick={e => {
                            e.stopPropagation()
                            const idx = COLORS.indexOf(r.color)
                            const nc  = COLORS[(idx + 1) % COLORS.length]
                            setRoutes(p => p.map(x => x.id === r.id ? { ...x, color: nc } : x))
                          }}
                        />
                        <span className="text-xs text-gray-300 flex-1">{r.label}</span>
                        <span className="text-[10px] text-gray-600">{r.points.length}pt</span>
                        {routes.length > 1 && (
                          <button onClick={e => {
                            e.stopPropagation()
                            setRoutes(p => {
                              const next = p.filter(x => x.id !== r.id)
                              if (activeRoute === r.id) setActiveRoute(next[0]?.id ?? 0)
                              return next
                            })
                          }} className="text-gray-600 hover:text-red-400 text-xs">×</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 총 거리 */}
              {totalDist && tool === 'route' && (
                <div className="bg-blue-950/30 border border-blue-800/40 rounded-2xl p-3">
                  <div className="text-[10px] text-blue-400 font-semibold mb-0.5">총 이동 거리</div>
                  <div className="text-xl font-black text-white">{totalDist}</div>
                  <div className="text-[10px] text-gray-600">{currentRoute?.points.length}개 포인트</div>
                </div>
              )}

              {/* 액션 */}
              <div className="bg-gray-900 rounded-2xl border border-gray-700/50 p-3 space-y-1.5">
                <button onClick={undo}
                  className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-xl transition-colors"
                >↩ 되돌리기</button>
                <button onClick={clearAll}
                  className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-500 text-xs rounded-xl transition-colors"
                >🗑 전체 초기화</button>
                <button onClick={saveImage}
                  className="w-full py-2 bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded-xl transition-colors"
                >💾 이미지 저장</button>
              </div>

              <div className="text-[10px] text-gray-700 space-y-0.5 px-1">
                <p>• 스크롤: 확대/축소 (마우스 위치 기준)</p>
                <p>• 확대 후 드래그: 이동</p>
                <p>• 더블클릭: 줌 초기화</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
