import Head from 'next/head'
import Image from 'next/image'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Layout from '../components/layout/Layout'
import { useT } from '../utils/i18n'

const MAPS = [
  {
    id: 'erangel', nameEn: 'Erangel', size: '8×8 km', kmSize: 8,
    img: '/maps/erangel.jpg',
    maxPlayers: 100, tagKey: 'maps.tag.classic',
    tagColor: 'bg-blue-500', tagBorder: 'border-blue-500', mapSize: 'large',
  },
  {
    id: 'miramar', nameEn: 'Miramar', size: '8×8 km', kmSize: 8,
    img: '/maps/miramar.jpg',
    maxPlayers: 100, tagKey: 'maps.tag.desert',
    tagColor: 'bg-yellow-500', tagBorder: 'border-yellow-500', mapSize: 'large',
  },
  {
    id: 'vikendi', nameEn: 'Vikendi', size: '6×6 km', kmSize: 6,
    img: '/maps/vikendi.jpg',
    maxPlayers: 100, tagKey: 'maps.tag.snow',
    tagColor: 'bg-cyan-400', tagBorder: 'border-cyan-400', mapSize: 'large',
  },
  {
    id: 'taego', nameEn: 'Taego', size: '8×8 km', kmSize: 8,
    img: '/maps/taego.jpg',
    maxPlayers: 100, tagKey: 'maps.tag.korea',
    tagColor: 'bg-red-500', tagBorder: 'border-red-500', mapSize: 'large',
  },
  {
    id: 'deston', nameEn: 'Deston', size: '8×8 km', kmSize: 8,
    img: '/maps/deston.jpg',
    maxPlayers: 100, tagKey: 'maps.tag.future',
    tagColor: 'bg-purple-500', tagBorder: 'border-purple-500', mapSize: 'large',
  },
  {
    id: 'rondo', nameEn: 'Rondo', size: '8×8 km', kmSize: 8,
    img: '/maps/rondo.jpg',
    maxPlayers: 100, tagKey: 'maps.tag.mountain',
    tagColor: 'bg-emerald-500', tagBorder: 'border-emerald-500', mapSize: 'large',
  },
  {
    id: 'sanhok', nameEn: 'Sanhok', size: '4×4 km', kmSize: 4,
    img: '/maps/sanhok.jpg',
    maxPlayers: 64, tagKey: 'maps.tag.jungle',
    tagColor: 'bg-lime-500', tagBorder: 'border-lime-500', mapSize: 'small',
  },
  {
    id: 'paramo', nameEn: 'Paramo', size: '3×3 km', kmSize: 3,
    img: '/maps/paramo.jpg',
    maxPlayers: 64, tagKey: 'maps.tag.dynamic',
    tagColor: 'bg-orange-500', tagBorder: 'border-orange-500', mapSize: 'small',
  },
  {
    id: 'karakin', nameEn: 'Karakin', size: '2×2 km', kmSize: 2,
    img: '/maps/karakin.jpg',
    maxPlayers: 64, tagKey: 'maps.tag.small_tag',
    tagColor: 'bg-amber-600', tagBorder: 'border-amber-600', mapSize: 'small',
  },
]


const OVERLAY_TYPE_DEFS = [
  { key: 'fixed_vehicle', labelKey: 'maps.ot.fixed_vehicle', icon: '🚗', color: '#f59e0b' },
  { key: 'spawn_vehicle', labelKey: 'maps.ot.spawn_vehicle', icon: '🚙', color: '#3b82f6' },
  { key: 'boat',          labelKey: 'maps.ot.boat',          icon: '🚤', color: '#06b6d4', mapLabelKeys: { vikendi: { labelKey: 'maps.ot.boat_vikendi', icon: '🐻' } } },
  { key: 'secret_room',   labelKey: 'maps.ot.secret_room',   icon: '🚪', color: '#a855f7', exclude: [], mapLabelKeys: { vikendi: { labelKey: 'maps.ot.secret_room_vikendi', icon: '🔑' } } },
  { key: 'glider',        labelKey: 'maps.ot.glider',        icon: '🪂', color: '#10b981' },
]

const HEADER_H = 58

function getOverlayDisplay(type, mapId) {
  const ov = type.mapLabels?.[mapId]
  return { label: ov?.label ?? type.label, icon: ov?.icon ?? type.icon }
}

export default function MapsPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.isAdmin
  const { t } = useT()

  const OVERLAY_TYPES = OVERLAY_TYPE_DEFS.map((def) => ({
    ...def,
    label: t(def.labelKey),
    mapLabels: def.mapLabelKeys
      ? Object.fromEntries(
          Object.entries(def.mapLabelKeys).map(([mapId, v]) => [mapId, { label: t(v.labelKey), icon: v.icon }])
        )
      : undefined,
  }))

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

  // 편집 모드: 맵 클릭 → 미리보기 목록에 추가
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
        setSaveError(data.error || t('maps.save_fail'))
      } else {
        await fetchMarkers(selected.id)
        setPendingList([])
      }
    } catch {
      setSaveError(t('maps.net_error'))
    } finally {
      setSaving(false)
    }
  }

  // 마커 삭제
  const deleteMarker = async (id, e) => {
    e.stopPropagation()
    if (!confirm(t('maps.delete_confirm'))) return
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
        <title>{t('maps.page_title')} — PK.GG</title>
        <meta name="description" content={t('maps.meta_desc')} />
      </Head>

      {/* 다크 배경 전체 커버 */}
      <div className="bg-gray-950" style={{ height: `calc(100vh - ${HEADER_H}px)` }}>
      <div
        className="max-w-screen-2xl mx-auto w-full flex flex-col px-4 py-2 gap-2 h-full"
      >
        {/* 페이지 타이틀 */}
        <div className="flex-shrink-0 flex items-center justify-between py-0.5">
          <div>
            <h1 className="text-lg font-black text-white leading-tight">{t('maps.page_title')}</h1>
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
              {editMode ? t('maps.edit_exit') : t('maps.admin_edit')}
            </button>
          )}
        </div>

        {/* 편집 모드 안내 배너 */}
        {editMode && (
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-900/30 border border-red-700/50 text-xs text-red-300">
            <span className="text-base">✏️</span>
            <span>{t('maps.edit_banner')}</span>
          </div>
        )}

        {/* 맵 선택 카드 — 대형/소형 분리 */}
        <div className="flex-shrink-0 flex flex-col gap-1.5">
          {/* 대형 맵 행 */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide justify-center">
            {MAPS.filter(m => m.mapSize !== 'small').map((map) => {
              const isActive = selected?.id === map.id
              const mapName = t(`maps.${map.id}.name`)
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
                    alt={mapName}
                    fill
                    className="object-cover"
                    sizes="130px"
                    unoptimized={map.img.startsWith('https://')}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  {isActive && <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white shadow" />}
                  <div className="absolute bottom-2 left-2">
                    <div className="text-white font-bold text-xs leading-tight">{mapName}</div>
                    <div className="text-gray-300 text-[10px]">{map.size}</div>
                  </div>
                </button>
              )
            })}
          </div>
          {/* 소형 맵 행 */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide justify-center items-center">
            <span className="flex-shrink-0 text-[10px] text-gray-600 font-semibold uppercase tracking-wide">{t('maps.small_label')}</span>
            {MAPS.filter(m => m.mapSize === 'small').map((map) => {
              const isActive = selected?.id === map.id
              const mapName = t(`maps.${map.id}.name`)
              return (
                <button
                  key={map.id}
                  onClick={() => handleSelect(map)}
                  className={`flex-shrink-0 relative rounded-xl overflow-hidden border-2 transition-all duration-200 focus:outline-none ${
                    isActive
                      ? `${map.tagBorder} shadow-lg shadow-black/50 brightness-110`
                      : 'border-gray-700 opacity-50 hover:opacity-80 hover:border-gray-500'
                  }`}
                  style={{ width: 100, height: 64 }}
                >
                  <Image
                    src={map.img}
                    alt={mapName}
                    fill
                    className="object-cover"
                    sizes="100px"
                    unoptimized={map.img.startsWith('https://')}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  {isActive && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white shadow" />}
                  <div className="absolute bottom-1.5 left-2">
                    <div className="text-white font-bold text-[11px] leading-tight">{mapName}</div>
                    <div className="text-gray-300 text-[9px]">{map.size}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 모바일 전용: 선택된 맵 기본 정보 */}
        {selected && (
          <div className="sm:hidden flex-shrink-0 flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-900 border border-gray-700">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${selected.tagColor}`}>{t(selected.tagKey)}</span>
            <span className="text-white font-bold text-sm">{t(`maps.${selected.id}.name`)}</span>
            <span className="text-gray-400 text-xs">{selected.size}</span>
            <span className="text-gray-500 text-xs ml-auto">{t('maps.max_players_label')} {selected.maxPlayers}{t('maps.max_players_unit')}</span>
          </div>
        )}

        {/* 맵 영역 + 오른쪽 사이드 패널 */}
        {selected && (
          <div className="flex-1 min-h-0 flex gap-3 justify-center overflow-hidden">

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
                  alt={t(`maps.${selected.id}.name`)}
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
                      {t('maps.reset')}
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
                  {t('maps.controls_hint')}
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
                        <span className="text-white text-xs font-bold">{pendingList.length}</span>
                        <span className="text-gray-400 text-xs">{t('maps.selected')}</span>
                        <button
                          onClick={confirmSave}
                          disabled={saving}
                          className="ml-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                        >
                          {saving ? t('maps.saving') : t('maps.save_all')}
                        </button>
                        <button
                          onClick={() => { setPendingList((p) => p.slice(0, -1)); setSaveError('') }}
                          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors"
                        >
                          {t('maps.undo_one')}
                        </button>
                        <button
                          onClick={() => { setPendingList([]); setSaveError('') }}
                          className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-500 text-xs rounded-lg transition-colors"
                        >
                          {t('maps.cancel_all')}
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
                      {t('maps.edit_click_hint')}
                    </div>
                  )}
                </div>
              )}

              {/* 로딩 표시 */}
              {loadingMarkers && (
                <div className="absolute top-3 left-3 z-20 bg-gray-900/80 text-gray-400 text-[11px] px-2 py-1 rounded-lg backdrop-blur-sm">
                  {t('maps.loading')}
                </div>
              )}
            </div>

            {/* ── 오른쪽 사이드 패널 (모바일에서 숨김) ── */}
            <div className="hidden sm:flex flex-shrink-0 w-80 flex-col rounded-2xl border border-gray-700 overflow-hidden shadow-lg">

              {/* 맵 기본 정보 */}
              <div className="bg-gray-900 border-b border-gray-700 overflow-hidden flex-shrink-0">
                {/* 썸네일 이미지 + 맵 이름 오버레이 */}
                <div className="relative h-28">
                  <img
                    src={selected.img}
                    alt={t(`maps.${selected.id}.name`)}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${selected.tagColor}`}>
                      {t(selected.tagKey)}
                    </span>
                    <div className="text-white font-black text-lg mt-0.5 leading-tight">{t(`maps.${selected.id}.name`)}</div>
                    <div className="text-gray-300 text-[11px]">{selected.nameEn}</div>
                  </div>
                </div>
                {/* 스탯 그리드 */}
                <div className="px-4 py-3 grid grid-cols-2 gap-2">
                  <div className="bg-gray-800 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-gray-500 mb-0.5">{t('maps.map_size')}</div>
                    <div className="text-xs text-white font-bold flex items-center gap-1.5">
                      {selected.size}
                      {selected.mapSize === 'small' && (
                        <span className="px-1 py-0.5 rounded text-[9px] bg-gray-700 text-gray-400 font-normal">{t('maps.small_label')}</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-gray-500 mb-0.5">{t('maps.max_players_label')}</div>
                    <div className="text-xs text-white font-bold">{selected.maxPlayers}{t('maps.max_players_unit')}</div>
                  </div>
                  <div className="col-span-2 bg-gray-800 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-gray-500 mb-0.5">{t('maps.terrain_label')}</div>
                    <div className="text-xs text-gray-300 leading-relaxed">{t(`maps.${selected.id}.terrain`)}</div>
                  </div>
                  <div className="col-span-2 bg-gray-800 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-gray-500 mb-1.5">{t('maps.features_label')}</div>
                    <ul className="space-y-1">
                      {[1, 2, 3].map((n) => (
                        <li key={n} className="flex items-start gap-1.5 text-xs text-gray-300">
                          <span className="mt-0.5 flex-shrink-0 text-gray-600">▸</span>
                          {t(`maps.${selected.id}.feat${n}`)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* 표시 옵션 / 편집 타입 선택 */}
              <div className="flex-1 px-4 py-3 bg-gray-800 flex flex-col gap-2 overflow-y-auto">
                <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide mb-0.5">
                  {editMode ? t('maps.place_type') : t('maps.display_options')}
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
                        : <span className="text-[10px] text-gray-600">{editMode ? '' : t('maps.coming_soon')}</span>
                      }
                    </button>
                  )
                })}

                {/* 편집 모드: 마커 총 개수 */}
                {editMode && (
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    {dbMarkers.length}{t('maps.marker_count')}
                  </div>
                )}

                {/* 오차 안내 */}
                {!editMode && (
                  <div className="mt-auto pt-3 flex items-start gap-1.5 text-[11px] text-gray-400 leading-relaxed">
                    <span className="mt-0.5 flex-shrink-0 text-yellow-500/70">⚠</span>
                    <span>{t('maps.marker_accuracy')}</span>
                  </div>
                )}
              </div>

              {/* 설명 + 출처 */}
              <div className="px-4 py-3 bg-gray-900 border-t border-gray-700">
                <p className="text-xs text-gray-500 leading-relaxed">{t(`maps.${selected.id}.desc`)}</p>
                <a
                  href="https://pubg.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-gray-600 hover:text-gray-400 underline mt-1.5 block"
                >
                  {t('maps.image_source')}
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
