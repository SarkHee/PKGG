// utils/weaponMetaFilter.js — 텔레메트리 원본 weaponId → 무기 메타 집계용 정규화/제외 규칙
// weapon-meta-live.js(실시간)와 seasonArchive.js(시즌 아카이브) 양쪽에서 동일 기준으로 사용해야
// 시즌 간 순위/집계가 어긋나지 않는다.
//
// 2026-07 점검: 실제 player_weapon_stats의 distinct weaponId 197개를 전수 조사해서
// 아래 두 문제를 발견하고 고쳤다.
//   1. WeapPan_C(팬 근접무기)는 걸러지는데 WeapPanProjectile_C(던진 팬)는 "_"가 없어 안 걸러짐 →
//      /^WeapPan_/i 는 그대로 두고 /^WeapPanProjectile/i 를 별도 추가.
//   2. Apple/Rhino/Snowball/PG117(보트 변형) 등 그 어떤 패턴에도 안 걸리는 항목 발견 → 추가.
//   3. Duncans_/Julies_/Lunchmeats_ 같은 "인물명이 붙은 스킨 변형" ID가 실제 무기(HK416/Kar98k/AK47/M416)
//      쪽으로 병합되지 않고 별도의 이상한 무기처럼 집계되고 있었음. 이런 스킨 이름은 패치마다 계속 늘어날
//      수 있어 이름을 일일이 블랙리스트/정규식에 추가하는 방식은 지속 불가능하다고 판단해, 대신
//      "실제 무기 화이트리스트"를 만들고 정규화된 ID가 그 무기 이름으로 끝나면(접두사만 다르면)
//      해당 무기로 병합하는 방식(resolveSkinVariant)을 도입했다 — 새 스킨 이름이 나와도 코드 수정 없이
//      자동으로 병합된다.

// 제외 패턴 - 차량/캐릭터/환경/투척류/근접무기
export const EXCLUDE = [
  /^Player(Female|Male)/i,
  /^UltAIPawn/i,
  /^TslGameMode/i,
  /^BP_/i,
  /^Buggy_/i, /^Dacia_/i, /^Uaz_/i, /^Boat_/i, /^PG117/i,
  /^RedZone/i, /^BlackZone/i, /^Bluezonebomb/i,
  /^Buff_/i,
  /^HR_Proj/i, /^ProjGrenade/i, /^ProjMolotov/i, /^ProjC4/i, /^ProjSticky/i,
  /^WeapGrenade/i, /^WeapMolotov/i, /^WeapFlareGun/i, /^WeapFlash/i,
  /^WeapSmoke/i, /^WeapDecoy/i, /^WeapBlue/i, /^WeapStickyGrenade/i,
  /^WeapC4/i, /^WeapMortar/i, /^WeapPanzer/i,
  /^WeapPan_/i, /^WeapPanProjectile/i, /^WeapMachete/i, /^WeapPickaxe/i, /^WeapSickle/i,
  /^WeapCow/i, /^WeapRock/i, /^WeapPackageFlare/i, /^WeapCoverStruct/i,
  /^WeapIntegrated/i, /^WeapTrauma/i, /^WeapTacPack/i,
  /^WeapZipline/i, /^WeapCamoNet/i, /^WeapStunGun/i, /^WeapM79/i,
  /^WeapApple/i, /^WeapSnowball/i, /^WeapRhino/i,
  /^None$/, /^Jerrycan/, /^TslDestructible/, /^Mortar_/, /^PanzerFaust/,
]

const NORMALIZE = {
  vz61Skorpion: 'Skorpion',
  'Mads_QBU88':  'QBU88',
  MadsQBU88:     'QBU88',
  Win1894:       'Win94',
  MosinNagant:   'Mosin',
  FamasG2:       'FAMASG2',
  'SCAR-L':      'SCAR_L',
  Crossbow_1:    'Crossbow',
  CowBar:        'Cowbar',
  // "M416"은 PUBG 커뮤니티에서 부르는 이름일 뿐, 실제 텔레메트리/에셋 이름은 HK416으로 동일한 총이다.
  M416:          'HK416',
  // 2026-07 정정: "Winchester"는 Win94(Winchester Model 1894 라이플, 카라킨 전용)가 아니라
  // S1897 펌프액션 샷건의 텔레메트리 ID다. utils/weaponNameMap.js에 이미 정확한 매핑
  // ('Item_Weapon_Winchester_C': 'S1897')이 있었는데 대조하지 않고 Win94로 잘못 병합했었다.
  // 실제로 WeapWinchester_C 킬은 9개 맵 전역에 퍼져 있고(카라킨 비중 3.3%뿐), 반대로
  // WeapWin94_C 킬은 100% 카라킨에서만 발생 — 완전히 다른 무기라는 근거가 명확했다.
  // DB에 별도의 "WeapS1897_C" ID는 존재하지 않아 Winchester가 이 총의 유일한 텔레메트리 ID다.
  Winchester:    'S1897',
}

// 실제 무기 화이트리스트(정규화 기준 canonical 이름). Duncans_M416 같은 스킨 변형 ID를
// "이 이름으로 끝나는지" 검사해 병합하는 데 쓴다 — 무기 목록 자체를 이걸로 필터링하진 않는다.
export const WEAPON_WHITELIST = [
  'AUG', 'HK416', 'BerylM762', 'ACE32', 'MP5K', 'Mini14', 'Mk12', 'AK47',
  'Win94', 'UMP', 'M249', 'M24', 'Vector', 'Kar98k', 'Saiga12',
  'Berreta686', 'FNFal', 'Dragunov', 'UZI', 'SCAR_L', 'Thompson', 'QBZ95', 'M16A4',
  'VSS', 'SKS', 'P90', 'Groza', 'FAMASG2', 'Mk47Mutant', 'K2', 'MG3', 'AWM', 'L6',
  'Mk14', 'Sawnoff', 'JS9', 'M9', 'DP12', 'MP9', 'G36C', 'DesertEagle', 'G18',
  'Cowbar', 'Crossbow', 'Skorpion', 'NagantM1895', 'QBU88', 'BizonPP19', 'OriginS12',
  'M1911', 'DP28', 'R45', 'Mosin',
]

// 화이트리스트 이름과 raw 스킨 접두사 사이에서 커뮤니티 명칭이 실제 무기 이름과 다른 경우
// (M416 스킨 → 실제로는 HK416). 접미사 매칭 후보에는 넣되, 최종 canonical 이름은 매핑된 값을 쓴다.
// Winchester도 동일한 이유로 여기 있다 — 텔레메트리 ID는 항상 "Winchester"이고 실제 무기는 S1897.
const SUFFIX_ALIAS = { M416: 'HK416', Winchester: 'S1897' }

// 정규화 후에도 화이트리스트에 없는 ID가, 화이트리스트(+별칭) 무기 이름으로 "끝나면"(앞에 접두사가
// 더 있으면) 그 무기의 스킨 변형으로 보고 병합한다. 언더스코어 유무(Duncans_M416 vs DuncansM416)는
// 무시하고 비교. 예: DuncansHK416 → HK416 / Julies_Kar98k → Kar98k / Duncans_M416 → HK416(별칭)
function resolveSkinVariant(id) {
  const compact = id.replace(/_/g, '').toLowerCase()
  const candidates = [
    ...WEAPON_WHITELIST.map((name) => ({ name, canonical: name })),
    ...Object.entries(SUFFIX_ALIAS).map(([name, canonical]) => ({ name, canonical })),
  ]

  let best = null
  for (const { name, canonical } of candidates) {
    const target = name.replace(/_/g, '').toLowerCase()
    if (compact.length > target.length && compact.endsWith(target)) {
      // 여러 이름이 동시에 접미사로 걸리는 경우(거의 없지만) 가장 긴 걸 우선
      if (!best || target.length > best.key.length) best = { key: target, canonical }
    }
  }
  return best?.canonical ?? null
}

export function isExcluded(raw) {
  return EXCLUDE.some(p => p.test(raw))
}

export function normalizeId(raw) {
  const id = raw
    .replace(/^Item_Weapon_/, '')
    .replace(/^Weap/, '')
    .replace(/(_HR)?_C$/, '')
    .replace(/_HR$/, '')

  if (NORMALIZE[id]) return NORMALIZE[id]
  if (WEAPON_WHITELIST.includes(id)) return id

  return resolveSkinVariant(id) ?? id
}
