import Head from 'next/head'
import Image from 'next/image'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Layout from '../components/layout/Layout'

const MAPS = [
  {
    id: 'erangel',
    name: '에란겔',
    nameEn: 'Erangel',
    size: '8x8 km',
    terrain: '초원 / 도시 / 해안',
    desc: '배틀그라운드의 첫 번째 맵. 클래식 배틀로얄 환경.',
    img: 'https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/590dba7.webp',
    maxPlayers: 100,
    tag: '클래식',
    tagColor: 'bg-blue-500',
    tagBorder: 'border-blue-500',
  },
  {
    id: 'miramar',
    name: '미라마',
    nameEn: 'Miramar',
    size: '8x8 km',
    terrain: '사막 / 협곡 / 도시',
    desc: '광활한 사막 지형. 장거리 저격전이 두드러지는 맵.',
    img: 'https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/24a088e.webp',
    maxPlayers: 100,
    tag: '사막',
    tagColor: 'bg-yellow-500',
    tagBorder: 'border-yellow-500',
  },
  {
    id: 'vikendi',
    name: '비켄디',
    nameEn: 'Vikendi',
    size: '6x6 km',
    terrain: '설원 / 성 / 마을',
    desc: '눈 덮인 설원 배경. 발자국 추적 기능이 특징.',
    img: 'https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/d1080a6.webp',
    maxPlayers: 100,
    tag: '설원',
    tagColor: 'bg-cyan-400',
    tagBorder: 'border-cyan-400',
  },
  {
    id: 'taego',
    name: '태이고',
    nameEn: 'Taego',
    size: '8x8 km',
    terrain: '산악 / 농촌 / 도시',
    desc: '한국 배경 맵. 자기소생 아이템과 컴파운드 시스템.',
    img: 'https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/19581ee.webp',
    maxPlayers: 100,
    tag: '한국',
    tagColor: 'bg-red-500',
    tagBorder: 'border-red-500',
  },
  {
    id: 'deston',
    name: '데스턴',
    nameEn: 'Deston',
    size: '8x8 km',
    terrain: '습지 / 고층빌딩 / 해안',
    desc: '미래지향적 미국 배경. 고층 빌딩 수직 전투 + 글라이더.',
    img: 'https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/e2bdf1e.webp',
    maxPlayers: 100,
    tag: '미래',
    tagColor: 'bg-purple-500',
    tagBorder: 'border-purple-500',
  },
  {
    id: 'rondo',
    name: '론도',
    nameEn: 'Rondo',
    size: '8x8 km',
    terrain: '산악 / 강 / 설원',
    desc: '중국 서남부 배경. 험준한 산악 지형과 보트 이동.',
    img: '/maps/rondo.jpg',
    maxPlayers: 100,
    tag: '산악',
    tagColor: 'bg-emerald-500',
    tagBorder: 'border-emerald-500',
  },
]

const OVERLAY_TYPES = [
  { key: 'fixed_vehicle', label: '고정 차량', icon: '🚗', color: '#f59e0b' },
  { key: 'spawn_vehicle', label: '스폰 차량', icon: '🚙', color: '#3b82f6' },
  { key: 'boat',          label: '선박',      icon: '🚤', color: '#06b6d4', mapLabels: { vikendi: { label: '곰굴', icon: '🐻' } } },
  { key: 'secret_room',   label: '비밀의 방', icon: '🚪', color: '#a855f7', exclude: ['miramar'], mapLabels: { vikendi: { label: '보안키방', icon: '🔑' } } },
  { key: 'glider',        label: '글라이드',  icon: '🪂', color: '#10b981' },
]

function getOverlayDisplay(type, mapId) {
  const ov = type.mapLabels?.[mapId]
  return { label: ov?.label ?? type.label, icon: ov?.icon ?? type.icon }
}

const HEADER_H = 58

export default function MapsPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.isAdmin

  const [selected, setSelected]             = useState(MAPS[0])
  const [activeOverlays, setActiveOverlays] = useState(new Set())
  const [hoveredMarker, setHoveredMarker]   = useState(null)
  const [transform, setTransform]           = useState({ scale: 1, x: 0, y: 0 })
  const [dragging, setDragging]             = useState(false)

  // 마커 데이터 (DB에서 로드)
  const [dbMarkers, setDbMarkers]     = useState([])
  const [loadingMarkers, setLoading]  = useState(false)

  // 관리자 편집 모드
  const [editMode, setEditMode]         = useState(false)
  const [selectedType, setSelectedType] = useState(OVERLAY_TYPES[0].key)
  const [pendingList, setPendingList]   = useState([])   // [{ x, y }, ...] 미리보기 목록
  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState('')

  const mapRef     = useRef(null)
  const dragRef    = useRef(false)
  const lastPos    = useRef({ x: 0, y: 0 })
  const dragMoved  = useRef(false)

  // 맵 변경 시 마커 로드 + 상태 초기화
  const handleSelect = (map) => {
    setSelected(map)
    setActiveOverlays(new Set())
    setHoveredMarker(null)
    setTransform({ scale: 1, x: 0, y: 0 })
  }

  // DB 마커 불러오기 — 마커 있는 타입은 자동으로 activeOverlays에 추가
  const fetchMarkers = useCallback(async (mapId) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/maps/markers?mapId=${mapId}`)
      const data = await res.json()
      const markers = data.markers || []
      setDbMarkers(markers)
      // 마커가 있는 타입은 자동 ON
      const typesWithMarkers = new Set(markers.map((m) => m.type))
      if (typesWithMarkers.size > 0) setActiveOverlays(typesWithMarkers)
    } catch {
      setDbMarkers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selected) fetchMarkers(selected.id)
  }, [selected, fetchMarkers])

  const toggleOverlay = (key) => {
    if (editMode) {
      // 편집 모드에서 사이드패널 클릭 = 배치할 타입 선택
      setSelectedType(key)
      return
    }
    setActiveOverlays((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // 줌 핸들러 — 편집 모드에서도 확대 허용, scale=1 복귀 시 중앙 고정
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const rect = mapRef.current?.getBoundingClientRect()
    if (!rect) return
    setTransform((prev) => {
      const newScale = Math.min(8, Math.max(1, prev.scale * factor))
      if (newScale === prev.scale) return prev
      // scale=1 이면 중앙으로 복귀
      if (newScale === 1) return { scale: 1, x: 0, y: 0 }
      const ox = e.clientX - rect.left - rect.width / 2
      const oy = e.clientY - rect.top - rect.height / 2
      const r  = newScale / prev.scale
      return { scale: newScale, x: ox + (prev.x - ox) * r, y: oy + (prev.y - oy) * r }
    })
  }, [editMode])

  useEffect(() => {
    const el = mapRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const handleMouseDown = (e) => {
    dragMoved.current = false  // 새 인터랙션 시작마다 초기화
    // scale=1 일 때는 드래그 비활성화 (편집 모드 포함)
    if (transform.scale <= 1) return
    dragRef.current = true
    setDragging(true)
    lastPos.current = { x: e.clientX, y: e.clientY }
    e.preventDefault()
  }

  const handleMouseMove = (e) => {
    if (!dragRef.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
    setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }))
  }

  const handleMouseUp = () => {
    dragRef.current = false
    setDragging(false)
  }

  const resetTransform = () => setTransform({ scale: 1, x: 0, y: 0 })

  // 편집 모드: 맵 클릭 → 미리보기 목록에 추가 (일괄 저장 전까지 DB 저장 안 함)
  const handleMapClick = (e) => {
    if (!editMode || saving) return
    if (e.target.closest('button')) return
    if (dragMoved.current) return

    const rect = mapRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setPendingList((prev) => [...prev, { x, y }])
    setSaveError('')
  }

  // 미리보기 목록 → 일괄 DB 저장
  const confirmSave = async () => {
    if (pendingList.length === 0 || saving) return
    setSaving(true)
    setSaveError('')
    try {
      const results = await Promise.all(
        pendingList.map((pos) =>
          fetch('/api/maps/markers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mapId: selected.id, type: selectedType, x: pos.x, y: pos.y, label: '' }),
          })
        )
      )
      const failed = results.filter((r) => !r.ok)
      if (failed.length > 0) {
        const data = await failed[0].json()
        setSaveError(data.error || '일부 저장 실패')
      } else {
        await fetchMarkers(selected.id)
        setPendingList([])
      }
    } catch {
      setSaveError('네트워크 오류')
    } finally {
      setSaving(false)
    }
  }

  // 마커 삭제
  const deleteMarker = async (id, e) => {
    e.stopPropagation()
    if (!confirm('이 마커를 삭제할까요?')) return
    await fetch(`/api/maps/markers/${id}`, { method: 'DELETE' })
    setDbMarkers((prev) => prev.filter((m) => m.id !== id))
  }

  // 편집 모드 토글
  const toggleEditMode = () => {
    setEditMode((v) => !v)
    setPendingList([])
    setSaveError('')
    setTransform({ scale: 1, x: 0, y: 0 })
  }

  // 표시할 마커: 편집 모드면 전체, 아니면 activeOverlays 필터
  const visibleMarkers = dbMarkers.filter((m) =>
    editMode ? m.type === selectedType : activeOverlays.has(m.type)
  )

  return (
    <Layout>
      <Head>
        <title>맵 정보 — PK.GG</title>
        <meta name="description" content="PUBG 배틀그라운드 맵 정보. 에란겔, 미라마, 비켄디, 태이고, 데스턴, 론도." />
      </Head>

      {/* 다크 배경 전체 커버 */}
      <div className="bg-gray-950" style={{ height: `calc(100vh - ${HEADER_H}px)` }}>
      <div
        className="max-w-screen-2xl mx-auto w-full flex flex-col px-4 py-2 gap-2 h-full"
      >
        {/* 페이지 타이틀 */}
        <div className="flex-shrink-0 flex items-center justify-between py-0.5">
          <div>
            <h1 className="text-lg font-black text-white leading-tight">맵 정보</h1>
          </div>
          {/* 관리자 전용 편집 모드 버튼 */}
          {isAdmin && (
            <button
              onClick={toggleEditMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                editMode
                  ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/30'
                  : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white'
              }`}
            >
              <span>{editMode ? '✏️' : '⚙️'}</span>
              {editMode ? '편집 모드 종료' : '관리자 편집'}
            </button>
          )}
        </div>

        {/* 편집 모드 안내 배너 */}
        {editMode && (
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-900/30 border border-red-700/50 text-xs text-red-300">
            <span className="text-base">✏️</span>
            <span>오른쪽 패널에서 배치할 유형을 선택한 후, 맵을 클릭하여 마커를 추가하세요.</span>
          </div>
        )}

        {/* 맵 선택 카드 */}
        <div className="flex-shrink-0 flex gap-2 overflow-x-auto pb-1 scrollbar-hide justify-center">
          {MAPS.map((map) => {
            const isActive = selected?.id === map.id
            return (
              <button
                key={map.id}
                onClick={() => handleSelect(map)}
                className={`flex-shrink-0 relative rounded-xl overflow-hidden border-2 transition-all duration-200 focus:outline-none ${
                  isActive
                    ? `${map.tagBorder} shadow-lg shadow-black/50 brightness-110`
                    : 'border-gray-700 opacity-50 hover:opacity-80 hover:border-gray-500'
                }`}
                style={{ width: 130, height: 80 }}
              >
                <Image
                  src={map.img}
                  alt={map.name}
                  fill
                  className="object-cover"
                  sizes="130px"
                  unoptimized={map.img.startsWith('https://')}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                {isActive && <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white shadow" />}
                <div className="absolute bottom-2 left-2">
                  <div className="text-white font-bold text-xs leading-tight">{map.name}</div>
                  <div className="text-gray-300 text-[10px]">{map.size}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* 맵 영역 + 오른쪽 사이드 패널 */}
        {selected && (
          <div className="flex-1 min-h-0 flex gap-3 justify-center">

            {/* ── 맵 이미지 영역 — 정사각형 비율 고정 ── */}
            <div
              ref={mapRef}
              className="min-h-0 flex-shrink-0 rounded-2xl overflow-hidden border border-gray-700 bg-gray-950 relative"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onDoubleClick={!editMode ? resetTransform : undefined}
              onClick={handleMapClick}
              style={{
                aspectRatio: '1 / 1',
                cursor: editMode
                  ? dragging ? 'grabbing' : transform.scale > 1 ? 'grab' : 'crosshair'
                  : dragging ? 'grabbing' : transform.scale > 1 ? 'grab' : 'zoom-in',
                userSelect: 'none',
              }}
            >
              {/* 변환 레이어 */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                  transformOrigin: 'center center',
                }}
              >
                <img
                  src={selected.img}
                  alt={selected.name}
                  className="w-full h-full object-contain"
                  draggable={false}
                />

                {/* 마커 — 빨간 점 */}
                {visibleMarkers.map((m) => {
                  const typeInfo = OVERLAY_TYPES.find((t) => t.key === m.type)
                  const { label: typeLabel } = typeInfo ? getOverlayDisplay(typeInfo, selected.id) : {}
                  return (
                    <div
                      key={m.id}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                      style={{ left: `${m.x}%`, top: `${m.y}%` }}
                      onMouseEnter={() => !editMode && setHoveredMarker(m.id)}
                      onMouseLeave={() => setHoveredMarker(null)}
                    >
                      <div className="relative group">
                        <div
                          className="w-2 h-2 rounded-full shadow shadow-black/60 transition-transform hover:scale-150 cursor-pointer"
                          style={{ backgroundColor: typeInfo?.color ? typeInfo.color + 'aa' : '#ef444499' }}
                        />
                        {/* 편집 모드: 삭제 버튼 */}
                        {editMode && (
                          <button
                            onClick={(e) => deleteMarker(m.id, e)}
                            className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-gray-900 border border-red-500 text-red-400 flex items-center justify-center text-[10px] leading-none font-bold hover:bg-red-500 hover:text-white transition-colors"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      {/* 호버 툴팁 (일반 모드) */}
                      {!editMode && hoveredMarker === m.id && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap bg-gray-900 text-white text-xs px-2 py-1 rounded-lg shadow-xl pointer-events-none z-20">
                          {typeLabel ?? typeInfo?.label}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* 줌 레벨 + 초기화 (일반 모드) */}
              {!editMode && (
                <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
                  {transform.scale > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); resetTransform() }}
                      className="bg-gray-900/85 text-white text-[11px] px-2.5 py-1 rounded-lg backdrop-blur-sm hover:bg-gray-700/90 transition-colors"
                    >
                      ↺ 초기화
                    </button>
                  )}
                  <div className="bg-gray-900/85 text-gray-400 text-[11px] px-2.5 py-1 rounded-lg backdrop-blur-sm tabular-nums">
                    {Math.round(transform.scale * 100)}%
                  </div>
                </div>
              )}

              {/* 조작 힌트 */}
              {!editMode && transform.scale === 1 && (
                <div className="absolute bottom-3 left-3 text-[10px] text-gray-600 z-10 pointer-events-none">
                  스크롤로 확대 · 드래그로 이동 · 더블클릭으로 초기화
                </div>
              )}

              {/* 미리보기 점 목록 */}
              {editMode && pendingList.map((pos, i) => (
                <div
                  key={i}
                  className="absolute z-30 pointer-events-none"
                  style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80 shadow animate-pulse" />
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-yellow-300 font-bold leading-none whitespace-nowrap">
                    {i + 1}
                  </div>
                </div>
              ))}

              {/* 편집 모드 저장 바 */}
              {editMode && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
                  {pendingList.length > 0 ? (
                    <>
                      <div className="flex items-center gap-2 bg-gray-900/95 border border-gray-600 rounded-xl px-3 py-2 shadow-xl backdrop-blur-sm">
                        <span className="text-yellow-400 text-xs">●</span>
                        <span className="text-white text-xs font-bold">{pendingList.length}개</span>
                        <span className="text-gray-400 text-xs">선택됨</span>
                        <button
                          onClick={confirmSave}
                          disabled={saving}
                          className="ml-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                        >
                          {saving ? '저장 중…' : `일괄 저장`}
                        </button>
                        <button
                          onClick={() => { setPendingList((p) => p.slice(0, -1)); setSaveError('') }}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors"
                        >
                          ↩ 하나 취소
                        </button>
                        <button
                          onClick={() => { setPendingList([]); setSaveError('') }}
                          className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-500 text-xs rounded-lg transition-colors"
                        >
                          전체 취소
                        </button>
                      </div>
                      {saveError && (
                        <div className="bg-red-900/90 border border-red-700 text-red-300 text-xs px-2 py-1 rounded-lg">
                          {saveError}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-gray-900/80 text-gray-500 text-[11px] px-3 py-1.5 rounded-xl backdrop-blur-sm pointer-events-none">
                      맵을 클릭해 마커를 추가하세요 · 일괄 저장 가능
                    </div>
                  )}
                </div>
              )}

              {/* 로딩 표시 */}
              {loadingMarkers && (
                <div className="absolute top-3 left-3 z-20 bg-gray-900/80 text-gray-400 text-[11px] px-2 py-1 rounded-lg backdrop-blur-sm">
                  로딩 중…
                </div>
              )}
            </div>

            {/* ── 오른쪽 사이드 패널 ── */}
            <div className="flex-shrink-0 w-80 flex flex-col rounded-2xl border border-gray-700 overflow-hidden shadow-lg">

              {/* 맵 기본 정보 */}
              <div className="bg-gray-900 border-b border-gray-700 overflow-hidden flex-shrink-0">
                {/* 썸네일 이미지 + 맵 이름 오버레이 */}
                <div className="relative h-28">
                  <img
                    src={selected.img}
                    alt={selected.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${selected.tagColor}`}>
                      {selected.tag}
                    </span>
                    <div className="text-white font-black text-lg mt-0.5 leading-tight">{selected.name}</div>
                    <div className="text-gray-300 text-[11px]">{selected.nameEn}</div>
                  </div>
                </div>
                {/* 스탯 그리드 */}
                <div className="px-4 py-3 grid grid-cols-2 gap-2">
                  <div className="bg-gray-800 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-gray-500 mb-0.5">맵 크기</div>
                    <div className="text-xs text-white font-bold">{selected.size}</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-gray-500 mb-0.5">최대 인원</div>
                    <div className="text-xs text-white font-bold">{selected.maxPlayers}인</div>
                  </div>
                  <div className="col-span-2 bg-gray-800 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-gray-500 mb-0.5">지형</div>
                    <div className="text-xs text-gray-300 leading-relaxed">{selected.terrain}</div>
                  </div>
                </div>
              </div>

              {/* 표시 옵션 / 편집 타입 선택 */}
              <div className="flex-1 px-4 py-3 bg-gray-800 flex flex-col gap-2 overflow-y-auto">
                <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide mb-0.5">
                  {editMode ? '배치 유형 선택' : '표시 옵션'}
                </div>
                {OVERLAY_TYPES.filter((type) => !type.exclude?.includes(selected.id)).map((type) => {
                  const count = dbMarkers.filter((m) => m.type === type.key).length
                  const isActive = editMode
                    ? selectedType === type.key
                    : activeOverlays.has(type.key)
                  const { label: displayLabel, icon: displayIcon } = getOverlayDisplay(type, selected.id)

                  return (
                    <button
                      key={type.key}
                      onClick={() => toggleOverlay(type.key)}
                      className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        isActive
                          ? 'text-white border-transparent'
                          : 'bg-gray-700 text-gray-400 border-gray-600 hover:bg-gray-600'
                      }`}
                      style={isActive ? { backgroundColor: type.color + 'cc', borderColor: type.color } : {}}
                    >
                      <span className="text-sm">{displayIcon}</span>
                      <span className="flex-1 text-left">{displayLabel}</span>
                      {count > 0
                        ? <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/30' : 'bg-gray-600 text-gray-500'}`}>{count}</span>
                        : <span className="text-[10px] text-gray-600">{editMode ? '' : '준비중'}</span>
                      }
                    </button>
                  )
                })}

                {/* 편집 모드: 마커 총 개수 */}
                {editMode && (
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    총 {dbMarkers.length}개 마커
                  </div>
                )}

                {/* 오차 안내 */}
                {!editMode && (
                  <div className="mt-auto pt-3 flex items-start gap-1.5 text-[11px] text-gray-400 leading-relaxed">
                    <span className="mt-0.5 flex-shrink-0 text-yellow-500/70">⚠</span>
                    <span>마커 위치는 실제와 오차가 있을 수 있습니다.</span>
                  </div>
                )}
              </div>

              {/* 설명 + 출처 */}
              <div className="px-4 py-3 bg-gray-900 border-t border-gray-700">
                <p className="text-xs text-gray-500 leading-relaxed">{selected.desc}</p>
                <a
                  href="https://pubg.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-gray-600 hover:text-gray-400 underline mt-1.5 block"
                >
                  맵 이미지 출처: PUBG 공식
                </a>
              </div>
            </div>

          </div>
        )}
      </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </Layout>
  )
}
