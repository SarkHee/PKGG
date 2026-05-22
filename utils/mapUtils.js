// utils/mapUtils.js — PUBG API 맵 코드 → 표시명/이미지 변환

const MAP_INFO = {
  // PUBG API 원본 코드
  Baltic_Main:     { name: '에란겔', img: '/maps/erangel.jpg' },
  Desert_Main:     { name: '미라마', img: '/maps/miramar.jpg' },
  DihorOtok_Main:  { name: '비켄디', img: '/maps/vikendi.jpg' },
  Tiger_Main:      { name: '태이고', img: '/maps/taego.jpg' },
  Kiki_Main:       { name: '데스턴', img: '/maps/deston.jpg' },
  Neon_Main:       { name: '론도',   img: '/maps/rondo.jpg' },
  Savage_Main:     { name: '사녹',   img: '/maps/sanhok.webp' },
  Summerland_Main: { name: '카라킨', img: '/maps/karakin.webp' },
  Chimera_Main:    { name: '파라모', img: '/maps/paramo.webp' },
  Heaven_Main:     { name: '헤이븐', img: null },
  Range_Main:      { name: '훈련장', img: null },
  // 영문명 하위 호환
  Erangel:  { name: '에란겔', img: '/maps/erangel.jpg' },
  Miramar:  { name: '미라마', img: '/maps/miramar.jpg' },
  Vikendi:  { name: '비켄디', img: '/maps/vikendi.jpg' },
  Taego:    { name: '태이고', img: '/maps/taego.jpg' },
  Deston:   { name: '데스턴', img: '/maps/deston.jpg' },
  Rondo:    { name: '론도',   img: '/maps/rondo.jpg' },
  Sanhok:   { name: '사녹',   img: '/maps/sanhok.webp' },
  Karakin:  { name: '카라킨', img: '/maps/karakin.webp' },
  Paramo:   { name: '파라모', img: '/maps/paramo.webp' },
}

export function getMapInfo(rawName) {
  if (!rawName) return { name: '알 수 없음', img: null }
  return (
    MAP_INFO[rawName] ||
    MAP_INFO[rawName.replace(/_Main$/i, '')] ||
    { name: rawName, img: null }  // 완전히 알 수 없는 맵 → 이름만 표시
  )
}

export function getMapName(rawName) {
  return getMapInfo(rawName).name
}

export function getMapImg(rawName) {
  return getMapInfo(rawName).img
}
