// utils/weaponMetaFilter.js — 텔레메트리 원본 weaponId → 무기 메타 집계용 정규화/제외 규칙
// weapon-meta-live.js(실시간)와 seasonArchive.js(시즌 아카이브) 양쪽에서 동일 기준으로 사용해야
// 시즌 간 순위/집계가 어긋나지 않는다.

// 제외 패턴 - 차량/캐릭터/환경/투척류/근접무기
export const EXCLUDE = [
  /^Player(Female|Male)/i,
  /^UltAIPawn/i,
  /^TslGameMode/i,
  /^BP_/i,
  /^Buggy_/i, /^Dacia_/i, /^Uaz_/i, /^Boat_/i,
  /^RedZone/i, /^Bluezonebomb/i,
  /^Buff_/i,
  /^HR_Proj/i, /^ProjGrenade/i, /^ProjMolotov/i, /^ProjC4/i, /^ProjSticky/i,
  /^WeapGrenade/i, /^WeapMolotov/i, /^WeapFlareGun/i, /^WeapFlash/i,
  /^WeapSmoke/i, /^WeapDecoy/i, /^WeapBlue/i, /^WeapStickyGrenade/i,
  /^WeapC4/i, /^WeapMortar/i, /^WeapPanzer/i,
  /^WeapPan_/i, /^WeapMachete/i, /^WeapPickaxe/i, /^WeapSickle/i,
  /^WeapCow/i, /^WeapRock/i, /^WeapPackageFlare/i, /^WeapCoverStruct/i,
  /^WeapIntegrated/i, /^WeapTrauma/i, /^WeapTacPack/i,
  /^WeapZipline/i, /^WeapCamoNet/i, /^WeapStunGun/i, /^WeapM79/i,
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
  return NORMALIZE[id] ?? id
}
