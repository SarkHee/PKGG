// utils/mapCoords.js — 텔레메트리 mapName → 좌표 범위 / 맵 이미지 매핑
// MAP_MAX 값은 pages/api/pubg/match-telemetry.js에서 검증된 값과 동일

export const MAP_MAX = {
  // 8km 맵
  Baltic_Main: 820000, Desert_Main: 820000, Tiger_Main: 820000,
  Kiki_Main: 820000,   Neon_Main: 820000,
  // 4km 맵
  Savage_Main: 408000,
  // 6km 맵
  DihorOtok_Main: 612000,
  // 소형 맵
  Heaven_Main: 204800,
  Summerland_Main: 102400,
  Chimera_Main: 307200,
}

// mapName → public/maps 이미지 (pages/maps.js MAPS 목록과 동일한 이미지 재사용)
export const MAP_IMAGE = {
  Baltic_Main: '/maps/erangel.jpg',
  Desert_Main: '/maps/miramar.jpg',
  Tiger_Main: '/maps/taego.jpg',
  Kiki_Main: '/maps/deston.jpg',
  Neon_Main: '/maps/rondo.jpg',
  Savage_Main: '/maps/sanhok.jpg',
  DihorOtok_Main: '/maps/vikendi.jpg',
  Summerland_Main: '/maps/karakin.jpg',
  Chimera_Main: '/maps/paramo.jpg',
}

// route-planner.js MAPS의 id → 한글 표시명 (mypage.js 저장된 동선 목록 등에서 재사용)
export const MAP_ID_TO_LABEL = {
  erangel: '에란겔', miramar: '미라마', taego: '태이고', deston: '데스턴',
  rondo: '론도', vikendi: '비켄디', sanhok: '사녹', paramo: '파라모', karakin: '카라킨',
}

export function getMaxCoord(mapName) {
  return MAP_MAX[mapName] || 820000
}

export function getMapImage(mapName) {
  return MAP_IMAGE[mapName] || null
}

// 게임 좌표(x,y) → 정사각형 캔버스 픽셀 좌표 (0~canvasSize)
export function toPixel(x, y, mapName, canvasSize) {
  const max = getMaxCoord(mapName)
  return {
    px: (x / max) * canvasSize,
    py: (y / max) * canvasSize,
  }
}
