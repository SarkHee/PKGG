// pages/weapon-damage.js
import { useState, useMemo, useRef, useCallback } from 'react';
import Head from 'next/head';
import Header from '../components/layout/Header';

// ─── 최신 패치 기준 정보 ─────────────────────────────────
const LATEST_PATCH = 'Update 42.1';
const LATEST_PATCH_DATE = '2026.06 PC 적용';
const DATA_SOURCE = '공식 패치노트 기반';

// ─── 무기 데이터 ────────────────────────────────────────
// changed: true       → 최신 패치(42.1)에서 변경된 항목 (노란 강조)
// historyNote         → 이전 패치에서의 변경 이력 (ℹ 툴팁으로 표시)
// Update 42.1: QBU, Mosin-Nagant, PP-19 Bizon, DP-28, R45, P1911 삭제 완료 (배열에서 제거)
// dps: 사전 계산된 실전 DPS (null = 미표기)
// boltAction: true → RPM "볼트액션", DPS "—" 표시
// rpmUnknown: true → RPM "?", DPS "—" 표시
// rpm2: 연사력 2단계 (MG3, DBS)
// dps2: 2단계 연사력 기준 DPS (MG3)
// pelletDmg: true → damage는 펠렛당 피해량 (SGN, O12 제외)
// burstDps: true → DPS가 연속 2발 합산값 (S686, Sawed-Off)
// headMult: 무기별 실측 헤드샷 배율 (없으면 HEAD_MULT=2.1 공통값 사용) — 현재 Dragunov만 2.8
// headshotNote → 헤드샷 원콤 조건 등 특이사항 (Mannequin 컴포넌트에 표시)
// bulletSpeed: 탄속 (m/s). null = 데이터 미제공 → 테이블·시뮬레이션 모두 '-' 표시
const WEAPON_DATA = [
  // ── 돌격소총 (AR) ──
  { name: 'Mk47 Mutant', type: 'AR', damage: 49, rpm: 800,  dps: 637,   magBase: 20, magExt: 30,  modes: 'Semi / 2점사', caliber: '7.62mm', dataFrom: 'Update 28.1', bulletSpeed: null },
  { name: 'AKM',         type: 'AR', damage: 48, rpm: 600,  dps: 480,   magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '7.62mm', dataFrom: 'Update 28.1', bulletSpeed: 715 },
  { name: 'Groza',       type: 'AR', damage: 47, rpm: 750,  dps: 564,   magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '7.62mm', dataFrom: 'Update 28.1', bulletSpeed: 715 },
  { name: 'Beryl M762',  type: 'AR', damage: 44, rpm: 700,  dps: 484,   magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '7.62mm', dataFrom: 'Update 28.1', bulletSpeed: 740 },
  { name: 'M16A4',       type: 'AR', damage: 43, rpm: 800,  dps: 559,   magBase: 30, magExt: 40,  modes: '단발 / 3점사',  caliber: '5.56mm', dataFrom: 'Update 28.1', bulletSpeed: 910 },
  { name: 'ACE32',       type: 'AR', damage: 43, rpm: 680,  dps: 473,   magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '5.56mm', dataFrom: 'Update 28.1', bulletSpeed: 720 },
  { name: 'QBZ',         type: 'AR', damage: 42, rpm: 650,  dps: 420,   magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '5.56mm', dataFrom: 'Update 28.1', bulletSpeed: 930 },
  { name: 'SCAR-L',      type: 'AR', damage: 42, rpm: 650,  dps: 420,   magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '5.56mm', dataFrom: 'Update 28.1', bulletSpeed: 870 },
  { name: 'AUG A3',      type: 'AR', damage: 40, rpm: 720,  dps: 480,   magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '5.56mm', dataFrom: 'Update 36.1', historyNote: 'U36.1: 피해량 41→40 너프 · U39.1: 수평 반동 4% 증가', bulletSpeed: 890 },
  { name: 'G36C',        type: 'AR', damage: 41, rpm: 700,  dps: 451,   magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '5.56mm', dataFrom: 'Update 28.1', bulletSpeed: 870 },
  { name: 'K2',          type: 'AR', damage: 41, rpm: 700,  dps: 451,   magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '5.56mm', dataFrom: 'Update 32.1', bulletSpeed: 880 },
  { name: 'M416',        type: 'AR', damage: 40, rpm: 700,  dps: 440,   magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '5.56mm', dataFrom: 'Update 28.1', historyNote: 'U39.1: 수평 반동 5% 감소', bulletSpeed: 880 },
  { name: 'FAMAS',       type: 'AR', damage: 39, rpm: 900,  dps: 585,   magBase: 25, magExt: 30,  modes: '3점사',         caliber: '5.56mm', dataFrom: 'Update 28.1', bulletSpeed: 925 },

  // ── 지정사수소총 (DMR) ──
  { name: 'Mk14 EBR', type: 'DMR', damage: 54, rpm: 400, dps: 340.2,  magBase: 10, magExt: 20, modes: 'Semi / 완전자동', caliber: '7.62mm', dataFrom: 'Update 37.1', historyNote: 'U37.1: 피해량 ~12% 감소, 발사 속도 ~33% 감소', bulletSpeed: 853 },
  { name: 'Dragunov', type: 'DMR', damage: 53, rpm: 180, dps: 166.95, magBase: 10, magExt: 20, modes: '반자동',          caliber: '7.62mm', dataFrom: 'Update 41.1', changeNote: '수직 반동 20% 감소, 수평 반동 15% 감소', historyNote: 'U37.1: 피해량 ~12% 감소 (발사속도 조정 제외)', headMult: 2.8, headshotNote: '원콤 가능: 노뚝(148.4), 1레벨 헬멧(103.88)', bulletSpeed: 830 },
  { name: 'SLR',      type: 'DMR', damage: 49, rpm: 330, dps: 257.25, magBase: 10, magExt: 20, modes: '반자동',          caliber: '7.62mm', dataFrom: 'Update 42.1', changed: true, changeNote: '수평 반동 10% 감소, 탄속 840→870m/s', historyNote: 'U37.1: 피해량 ~12% 감소, 발사 속도 ~45% 감소 · U39.1: 수직·수평 반동 각 5% 감소 · U42.1: 수평 반동 10% 감소, 탄속 840→870m/s', bulletSpeed: 870 },
  { name: 'SKS',      type: 'DMR', damage: 47, rpm: 330, dps: 246.75, magBase: 10, magExt: 20, modes: '반자동',          caliber: '7.62mm', dataFrom: 'Update 37.1', historyNote: 'U37.1: 피해량 ~12% 감소, 발사 속도 ~45% 감소 · U39.1: 수평 반동 10% 감소', bulletSpeed: 800 },
  { name: 'VSS',      type: 'DMR', damage: 45, rpm: 700, dps: 519.75, magBase: 10, magExt: 20, modes: 'Semi / 완전자동', caliber: '9mm',    dataFrom: 'Update 36.1', historyNote: 'U36.1: 피해량 43→45 버프 (U37.1 DMR 너프 제외) · U39.1: 수직 반동 10%, 수평 반동 5% 증가', bulletSpeed: 430 },
  { name: 'Mk12',     type: 'DMR', damage: 43, rpm: 330, dps: 225.75, magBase: 20, magExt: 30, modes: '반자동',          caliber: '5.56mm', dataFrom: 'Update 40.1', changed: true, changeNote: '피해량 44→43, 수평 반동 8% 증가', historyNote: 'U34.1: 신규 추가 · U37.1: 피해량 ~12% 감소, 발사 속도 ~45% 감소', bulletSpeed: 900 },
  { name: 'Mini14',   type: 'DMR', damage: 42, rpm: 330, dps: 220.5,  magBase: 20, magExt: 30, modes: '반자동',          caliber: '5.56mm', dataFrom: 'Update 37.1', historyNote: 'U37.1: 피해량 ~12% 감소, 발사 속도 ~45% 감소', bulletSpeed: 990 },

  // ── 저격소총 (SR) ──
  // 볼트액션 SR: 연사력 공식 자료 없음 — DPS 미표기
  { name: 'Lynx AMR',     type: 'SR', damage: 118, rpm: 86,   dps: 306.8, magBase: 5, magExt: null, modes: '볼트액션', caliber: '.50 BMG',  dataFrom: 'Update 28.1', bulletSpeed: 1200 },
  { name: 'AWM',          type: 'SR', damage: 105, rpm: null,  dps: null,  magBase: 5, magExt: null, modes: '볼트액션', caliber: '.300 Mag', dataFrom: 'Update 28.1', boltAction: true, bulletSpeed: 990 },
  { name: 'Crossbow',     type: 'SR', damage: 105, rpm: null,  dps: null,  magBase: 1, magExt: null, modes: '단발',     caliber: '볼트',     dataFrom: 'Update 28.1', boltAction: true, bulletSpeed: 180 },
  { name: 'Kar98k',       type: 'SR', damage: 79,  rpm: null,  dps: null,  magBase: 5, magExt: null, modes: '볼트액션', caliber: '7.62mm',   dataFrom: 'Update 28.1', boltAction: true, bulletSpeed: 785 },
  { name: 'M24',          type: 'SR', damage: 75,  rpm: null,  dps: null,  magBase: 5, magExt: null, modes: '볼트액션', caliber: '7.62mm',   dataFrom: 'Update 28.1', boltAction: true, bulletSpeed: 815 },
  { name: 'Win94',        type: 'SR', damage: 66,  rpm: 100,   dps: 171.6, magBase: 8, magExt: null, modes: '레버액션', caliber: '.45 ACP',  dataFrom: 'Update 28.1', bulletSpeed: 760 },

  // ── 기관단총 (SMG) ──
  { name: 'UMP',        type: 'SMG', damage: 42, rpm: 670,  dps: 485.1, magBase: 25, magExt: 35,  modes: '완전자동', caliber: '.45 ACP', dataFrom: 'Update 28.1', bulletSpeed: 360 },
  { name: 'Tommy Gun',  type: 'SMG', damage: 40, rpm: 750,  dps: 504,   magBase: 30, magExt: 50,  modes: '완전자동', caliber: '.45 ACP', dataFrom: 'Update 28.1', bulletSpeed: 280 },
  { name: 'P90',        type: 'SMG', damage: 35, rpm: 1000, dps: 560,   magBase: 40, magExt: 50,  modes: '완전자동', caliber: '5.7mm',   dataFrom: 'Update 28.1', bulletSpeed: 715 },
  { name: 'MP5K',       type: 'SMG', damage: 32, rpm: 900,  dps: 504,   magBase: 20, magExt: 30,  modes: '완전자동', caliber: '9mm',     dataFrom: 'Update 38.1', historyNote: 'U38.1: 피해량 34→32 너프', bulletSpeed: 380 },
  { name: 'JS9',        type: 'SMG', damage: 32, rpm: 900,  dps: 504,   magBase: 20, magExt: 30,  modes: '완전자동', caliber: '9mm',     dataFrom: 'Update 41.1', bulletSpeed: 400 },
  { name: 'Vector',     type: 'SMG', damage: 31, rpm: 1100, dps: 585.9, magBase: 13, magExt: 33,  modes: '완전자동', caliber: '.45 ACP', dataFrom: 'Update 28.1', bulletSpeed: 380 },
  { name: 'MP9',        type: 'SMG', damage: 31, rpm: 1000, dps: 520.8, magBase: 20, magExt: 30,  modes: '완전자동', caliber: '9mm',     dataFrom: 'Update 28.1', bulletSpeed: 380 },
  { name: 'Micro UZI',  type: 'SMG', damage: 26, rpm: 1250, dps: 546,   magBase: 25, magExt: 35,  modes: '완전자동', caliber: '9mm',     dataFrom: 'Update 28.1', bulletSpeed: 350 },

  // ── 경기관총 (LMG) ──
  { name: 'MG3',   type: 'LMG', damage: 44.1, rpm: 660,  dps: 485.1, rpm2: 990, dps2: 727.65, magBase: 75, magExt: null, modes: '완전자동 (660/990RPM)', caliber: '7.62mm', dataFrom: 'Update 28.1', historyNote: '연사력 2단계: 660RPM(저속) / 990RPM(고속) 전환 가능', bulletSpeed: 820 },
  { name: 'M249',  type: 'LMG', damage: 41, rpm: 800,  dps: 559.65,magBase: 75, magExt: 100,  modes: '완전자동',           caliber: '5.56mm', dataFrom: 'Update 28.1', bulletSpeed: 915 },
  { name: 'RPD',   type: 'LMG', damage: 43, rpm: 750,  dps: 537.5, magBase: 50, magExt: 110,  modes: '완전자동',           caliber: '7.62mm', dataFrom: 'Update 42.3', historyNote: 'U42.3: 신규 추가 (2026.08.12)', bulletSpeed: 735 },

  // ── 산탄총 (SGN) ──
  // O12: 단일 피해량 100 (펠렛 보정 없음) — 탄속 데이터 미제공
  { name: 'O12',      type: 'SGN', damage: 100, rpm: 480, dps: 720, magBase: 5,  magExt: null, modes: '반자동',    caliber: '12게이지',      dataFrom: 'Update 28.1', bulletSpeed: null },
  // 나머지 SG: 펠렛당 피해량 × 9 × 90% 보정 적용 (pelletDmg: true)
  { name: 'DBS',      type: 'SGN', damage: 28,  rpm: 480, dps: 756, rpm2: 133, magBase: 14, magExt: null, modes: '펌프/반자동', caliber: '12게이지 ×9펠렛', dataFrom: 'Update 28.1', pelletDmg: true, historyNote: '◎○ 480RPM / ○○ 133RPM (두 가지 연사 간격)', bulletSpeed: 360 },
  { name: 'S12K',     type: 'SGN', damage: 24,  rpm: 240, dps: 864, magBase: 5,  magExt: 8,   modes: '반자동',    caliber: '12게이지 ×9펠렛', dataFrom: 'Update 28.1', pelletDmg: true, bulletSpeed: null },
  { name: 'S686',     type: 'SGN', damage: 26,  rpm: 300, dps: 468, magBase: 2,  magExt: null, modes: '이중 총신', caliber: '12게이지 ×9펠렛', dataFrom: 'Update 28.1', pelletDmg: true, burstDps: true, bulletSpeed: 360 },
  { name: 'S1897',    type: 'SGN', damage: 26,  rpm: 109, dps: 425, magBase: 5,  magExt: null, modes: '펌프액션',  caliber: '12게이지 ×9펠렛', dataFrom: 'Update 28.1', pelletDmg: true, bulletSpeed: 360 },
  { name: 'Sawed-Off',type: 'SGN', damage: 21,  rpm: 240, dps: 378, magBase: 2,  magExt: null, modes: '이중 총신', caliber: '12게이지 ×9펠렛', dataFrom: 'Update 28.1', pelletDmg: true, burstDps: true, bulletSpeed: 360 },

  // ── 권총 (PST) ──
  { name: 'R1895',        type: 'PST', damage: 64, rpm: 300,  dps: 320,  magBase: 7,  magExt: null, modes: '단발',     caliber: '7.62mm',   dataFrom: 'Update 28.1', bulletSpeed: 330 },
  { name: 'Desert Eagle', type: 'PST', damage: 62, rpm: null, dps: null,  magBase: 7,  magExt: null, modes: '단발',     caliber: '.357 Mag', dataFrom: 'Update 28.1', rpmUnknown: true, bulletSpeed: 450 },
  { name: 'P92',          type: 'PST', damage: 34, rpm: 600,  dps: 340,  magBase: 15, magExt: 20,  modes: '단발',     caliber: '9mm',      dataFrom: 'Update 28.1', bulletSpeed: 380 },
  { name: 'P18C',         type: 'PST', damage: 23, rpm: 1100, dps: 414,  magBase: 17, magExt: 25,  modes: '완전자동', caliber: '9mm',      dataFrom: 'Update 28.1', bulletSpeed: 375 },
  { name: 'Skorpion',     type: 'PST', damage: 22, rpm: 850,  dps: 308,  magBase: 20, magExt: 35,  modes: '완전자동', caliber: '.32 ACP',  dataFrom: 'Update 28.1', bulletSpeed: 350 },
];

// ─── 무기 이미지 매핑 ──────────────────────────────────
const WEAPON_IMG = {
  // AR
  'Mk47 Mutant': '/weapons/Item_Weapon_Mk47Mutant_C.png',
  'AKM':         '/weapons/Item_Weapon_AK47_C.png',
  'Groza':       '/weapons/Item_Weapon_Groza_C.png',
  'Beryl M762':  '/weapons/Item_Weapon_BerylM762_C.png',
  'M16A4':       '/weapons/Item_Weapon_M16A4_C.png',
  'ACE32':       '/weapons/Item_Weapon_ACE32_C.png',
  'QBZ':         '/weapons/Item_Weapon_QBZ95_C.png',
  'SCAR-L':      '/weapons/Item_Weapon_SCAR-L_C.png',
  'AUG A3':      '/weapons/Item_Weapon_AUG_C.png',
  'G36C':        '/weapons/Item_Weapon_G36C_C.png',
  'K2':          '/weapons/Item_Weapon_K2_C.png',
  'M416':        '/weapons/Item_Weapon_HK416_C.png',
  'FAMAS':       '/weapons/Item_Weapon_FAMASG2_C.png',
  // DMR
  'Mk14 EBR':    '/weapons/Item_Weapon_Mk14_C.png',
  'Dragunov':    '/weapons/Item_Weapon_Dragunov_C.png',
  'SLR':         '/weapons/Item_Weapon_SLR_C.png',
  'SKS':         '/weapons/Item_Weapon_SKS_C.png',
  'VSS':         '/weapons/Item_Weapon_VSS_C.png',
  'Mk12':        '/weapons/Item_Weapon_Mk12_C.png',
  'Mini14':      '/weapons/Item_Weapon_Mini14_C.png',
  // SR
  'Lynx AMR':    '/weapons/Item_Weapon_L6_C.png',
  'AWM':         '/weapons/Item_Weapon_AWM_C.png',
  'Crossbow':    '/weapons/Item_Weapon_Crossbow_C.png',
  'Kar98k':      '/weapons/Item_Weapon_Kar98k_C.png',
  'M24':         '/weapons/Item_Weapon_M24_C.png',
  'Win94':       '/weapons/Item_Weapon_Win1894_C.png',
  // SMG
  'UMP':         '/weapons/Item_Weapon_UMP_C.png',
  'Tommy Gun':   '/weapons/Item_Weapon_Thompson_C.png',
  'P90':         '/weapons/Item_Weapon_P90_C.png',
  'MP5K':        '/weapons/Item_Weapon_MP5K_C.png',
  'JS9':         '/weapons/Item_Weapon_JS9_C.png',
  'Vector':      '/weapons/Item_Weapon_Vector_C.png',
  'MP9':         '/weapons/Item_Weapon_MP9_C.png',
  'Micro UZI':   '/weapons/Item_Weapon_UZI_C.png',
  // LMG
  'MG3':         '/weapons/Item_Weapon_MG3_C.png',
  'M249':        '/weapons/Item_Weapon_M249_C.png',
  'RPD':         '/weapons/Item_Weapon_RPD_C.png',
  // SGN
  'O12':         '/weapons/Item_Weapon_OriginS12_C.png',
  'DBS':         '/weapons/Item_Weapon_DP12_C.png',
  'S12K':        '/weapons/Item_Weapon_Saiga12_C.png',
  'S686':        '/weapons/Item_Weapon_Berreta686_C.png',
  'S1897':       '/weapons/Item_Weapon_S1897_C.png',
  'Sawed-Off':   '/weapons/Item_Weapon_Sawnoff_C.png',
  // PST
  'R1895':        '/weapons/Item_Weapon_NagantM1895_C.png',
  'Desert Eagle': '/weapons/Item_Weapon_DesertEagle_C.png',
  'P92':          '/weapons/Item_Weapon_M9_C.png',
  'P18C':         '/weapons/Item_Weapon_G18_C.png',
  'Skorpion':     '/weapons/Item_Weapon_Skorpion_C.png',
};

const TYPE_TABS = [
  { key: 'ALL', label: '전체',       icon: '🔫' },
  { key: 'AR',  label: '돌격소총',   icon: '⚔️' },
  { key: 'DMR', label: '지정사수',   icon: '🎯' },
  { key: 'SR',  label: '저격소총',   icon: '🔭' },
  { key: 'SMG', label: '기관단총',   icon: '⚡' },
  { key: 'LMG', label: '경기관총',   icon: '🔥' },
  { key: 'SGN', label: '산탄총',     icon: '💥' },
  { key: 'PST', label: '권총',       icon: '🔰' },
];

const TYPE_BADGE = {
  AR:  { bg: 'bg-blue-900/60',   text: 'text-blue-300',   border: 'border-blue-700/50' },
  DMR: { bg: 'bg-purple-900/60', text: 'text-purple-300', border: 'border-purple-700/50' },
  SR:  { bg: 'bg-amber-900/60',  text: 'text-amber-300',  border: 'border-amber-700/50' },
  SMG: { bg: 'bg-cyan-900/60',   text: 'text-cyan-300',   border: 'border-cyan-700/50' },
  LMG: { bg: 'bg-orange-900/60', text: 'text-orange-300', border: 'border-orange-700/50' },
  SGN: { bg: 'bg-red-900/60',    text: 'text-red-300',    border: 'border-red-700/50' },
  PST: { bg: 'bg-green-900/60',  text: 'text-green-300',  border: 'border-green-700/50' },
};

// ─── 방어구 계산 상수 ──────────────────────────────────
// 레벨 0(없음) ~ 3까지 데미지 잔존 배율
const ARMOR_MULT  = [1.0, 0.70, 0.60, 0.45]; // 방어구
const HELMET_MULT = [1.0, 0.70, 0.60, 0.45]; // 헬멧
const HEAD_MULT   = 2.1;                       // 헤드샷 기본 배율 (SMG 기준 fallback)

// 무기 타입별 부위 피해 배율
const TYPE_MULT = {
  AR:  { head: 2.35, body: 1.00, limb: 0.90 },
  LMG: { head: 2.35, body: 1.05, limb: 0.90 },
  DMR: { head: 2.35, body: 1.05, limb: 0.95 },
  SR:  { head: 2.50, body: 1.30, limb: 0.90 },
  SG:  { head: 1.50, body: 0.90, limb: 1.20 },
  SMG: { head: 2.10, body: 1.05, limb: 1.30 },
  PST: { head: 2.35, body: 1.00, limb: 1.05 },
  CRS: { head: 1.50, body: 1.40, limb: 1.20 },
  MEL: { head: 1.50, body: 1.00, limb: 1.20 },
}
const ARMOR_LABELS = ['없음', 'Lv.1', 'Lv.2', 'Lv.3'];

function calcBodyDmg(base, armorLv)  { return Math.round(base * ARMOR_MULT[armorLv]); }
// headMult가 있으면(무기별 실측 헤드샷 배율) 우선 사용, 없으면 전체 공통 HEAD_MULT
function calcHeadDmg(base, helmLv, headMult = HEAD_MULT) { return Math.round(base * headMult * HELMET_MULT[helmLv]); }
function calcSTK(hp, dmg)            { return dmg <= 0 ? '∞' : Math.ceil(hp / dmg); }
const LIMB_MULT = 0.65;
function calcLimbDmg(base, armorLv)  { return Math.round(base * LIMB_MULT * ARMOR_MULT[armorLv]); }

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span className="text-gray-600 ml-1">↕</span>;
  return <span className="text-blue-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

function Tooltip({ text, children }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)

  const show = useCallback(() => {
    const r = ref.current?.getBoundingClientRect()
    if (r) setPos({ x: r.left + r.width / 2, y: r.top })
  }, [])
  const hide = useCallback(() => setPos(null), [])

  return (
    <span ref={ref} className="inline-flex items-center" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {pos && (
        <span
          className="fixed z-[9999] w-72 px-3 py-2 bg-gray-800 border border-gray-600 rounded-xl text-xs text-gray-200 leading-relaxed shadow-xl whitespace-normal text-left pointer-events-none"
          style={{ left: pos.x, top: pos.y - 8, transform: 'translate(-50%, -100%)' }}
        >
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-600" />
        </span>
      )}
    </span>
  )
}

function ArmorSelector({ label, value, onChange, color, showPct = true }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-semibold w-14 text-right ${color}`}>{label}</span>
      <div className="flex gap-1">
        {ARMOR_LABELS.map((lbl, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
              value === i
                ? i === 0
                  ? 'bg-gray-600 border-gray-500 text-white'
                  : i === 1
                  ? 'bg-blue-700 border-blue-600 text-white'
                  : i === 2
                  ? 'bg-purple-700 border-purple-600 text-white'
                  : 'bg-amber-700 border-amber-600 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>
      {showPct && value > 0 && (
        <span className="text-xs text-gray-500">
          데미지 ×{ARMOR_MULT[value]} ({Math.round((1 - ARMOR_MULT[value]) * 100)}% 감소)
        </span>
      )}
    </div>
  );
}

// ─── 마네킹 피해 시뮬레이션 ─────────────────────────────
function Mannequin({ weapon, armorLevel, helmetLevel }) {
  if (!weapon) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-600">
        <svg viewBox="0 0 110 185" className="w-28 h-44 opacity-15">
          <ellipse cx="55" cy="20" rx="15" ry="18" fill="#6b7280" />
          <rect x="49" y="37" width="12" height="8" fill="#6b7280" />
          <rect x="28" y="45" width="54" height="55" rx="5" fill="#6b7280" />
          <rect x="8"  y="45" width="18" height="53" rx="7" fill="#6b7280" />
          <rect x="84" y="45" width="18" height="53" rx="7" fill="#6b7280" />
          <rect x="29" y="102" width="22" height="65" rx="7" fill="#6b7280" />
          <rect x="59" y="102" width="22" height="65" rx="7" fill="#6b7280" />
        </svg>
        <p className="text-xs mt-3">무기를 선택하세요</p>
      </div>
    );
  }

  const baseDmg = weapon.pelletDmg ? Math.round(weapon.damage * 9 * 0.9) : weapon.damage;
  const bodyDmg = Math.round(baseDmg * ARMOR_MULT[armorLevel]);
  // headMult가 있으면(무기별 실측 헤드샷 배율) 우선 사용, 없으면 전체 공통 HEAD_MULT
  const headDmg = Math.round(baseDmg * (weapon.headMult ?? HEAD_MULT) * HELMET_MULT[helmetLevel]);
  const limbDmg = Math.round(baseDmg * LIMB_MULT * ARMOR_MULT[armorLevel]);
  const bodySTK = calcSTK(100, bodyDmg);
  const headSTK = calcSTK(100, headDmg);
  const limbSTK = calcSTK(100, limbDmg);

  const zoneFill = (stk) =>
    stk === 1 ? '#dc2626' :
    stk === 2 ? '#ea580c' :
    stk <= 4  ? '#ca8a04' :
    stk <= 6  ? '#374151' : '#1f2937';

  const stkColor = (stk) =>
    stk === 1 ? 'text-red-400 font-bold' :
    stk === 2 ? 'text-orange-400 font-bold' :
    stk <= 4  ? 'text-yellow-400' : 'text-gray-400';

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 110 185" className="w-36 h-52 drop-shadow-lg">
        <ellipse cx="55" cy="20" rx="15" ry="18" fill={zoneFill(headSTK)} opacity="0.9" />
        <rect x="49" y="37" width="12" height="8" fill={zoneFill(bodySTK)} opacity="0.9" />
        <rect x="28" y="45" width="54" height="55" rx="5" fill={zoneFill(bodySTK)} opacity="0.9" />
        <rect x="8"  y="45" width="18" height="53" rx="7" fill={zoneFill(limbSTK)} opacity="0.9" />
        <rect x="84" y="45" width="18" height="53" rx="7" fill={zoneFill(limbSTK)} opacity="0.9" />
        <rect x="29" y="102" width="22" height="65" rx="7" fill={zoneFill(limbSTK)} opacity="0.9" />
        <rect x="59" y="102" width="22" height="65" rx="7" fill={zoneFill(limbSTK)} opacity="0.9" />
        <text x="55" y="24"  textAnchor="middle" fill="white" fontSize="9"  fontWeight="bold">{headDmg}</text>
        <text x="55" y="76"  textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">{bodyDmg}</text>
        <text x="17" y="74"  textAnchor="middle" fill="white" fontSize="7.5">{limbDmg}</text>
        <text x="93" y="74"  textAnchor="middle" fill="white" fontSize="7.5">{limbDmg}</text>
        <text x="40" y="138" textAnchor="middle" fill="white" fontSize="7.5">{limbDmg}</text>
        <text x="70" y="138" textAnchor="middle" fill="white" fontSize="7.5">{limbDmg}</text>
      </svg>

      <div className="w-full space-y-1.5">
        {[
          { icon: '⛑️', label: '헤드샷', dmg: headDmg, stk: headSTK, note: helmetLevel > 0 ? `헬멧 Lv.${helmetLevel}` : '헬멧 없음' },
          { icon: '🛡️', label: '몸통',   dmg: bodyDmg, stk: bodySTK, note: armorLevel > 0 ? `방어구 Lv.${armorLevel}` : '방어구 없음' },
          { icon: '💪', label: '사지',   dmg: limbDmg, stk: limbSTK, note: '근사치 ×0.65' },
        ].map(({ icon, label, dmg, stk, note }) => (
          <div key={label} className="flex items-center gap-2 bg-gray-800/60 rounded-xl px-3 py-2">
            <span className="text-sm w-5 flex-shrink-0">{icon}</span>
            <div className="flex-1 flex items-baseline gap-1.5 min-w-0">
              <span className="text-xs text-gray-300 font-medium">{label}</span>
              <span className="text-[10px] text-gray-600 truncate">{note}</span>
            </div>
            <span className="font-bold text-white text-sm w-8 text-right flex-shrink-0">{dmg}</span>
            <span className={`text-xs ${stkColor(stk)} w-12 text-right flex-shrink-0`}>{stk}발 킬</span>
          </div>
        ))}
        {weapon.headshotNote && (
          <div className="text-[10px] text-red-400 font-medium px-1 pt-0.5">
            💀 {weapon.headshotNote}
          </div>
        )}
      </div>

      <div className="flex gap-3 text-[10px] text-gray-600">
        <span>■ <span className="text-red-500">1발</span></span>
        <span>■ <span className="text-orange-500">2발</span></span>
        <span>■ <span className="text-yellow-600">3~4발</span></span>
        <span>■ <span className="text-gray-500">5발+</span></span>
      </div>

      {weapon.pelletDmg && (
        <p className="text-[10px] text-gray-600 text-center">9펠렛 전탄 명중 기준</p>
      )}
    </div>
  );
}

function WeaponDetailPanel({ weapon, armorLevel, helmetLevel, onArmorChange, onHelmetChange }) {
  const badge = weapon ? (TYPE_BADGE[weapon.type] || TYPE_BADGE.AR) : null;

  return (
    <div className="bg-gray-900 border border-gray-700/50 rounded-2xl overflow-hidden">
      {/* 무기 정보 */}
      <div className="px-5 py-4 border-b border-gray-700/50 bg-gray-800/40">
        {weapon ? (
          <>
            {WEAPON_IMG[weapon.name] && (
              <div className="flex justify-center mb-3">
                <img
                  src={WEAPON_IMG[weapon.name]}
                  alt={weapon.name}
                  className="h-16 object-contain drop-shadow-lg"
                  draggable={false}
                />
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-white text-base">{weapon.name}</h3>
              {weapon.deletePending && <span className="text-red-400 text-xs font-semibold">🗑️ 삭제예정</span>}
              {weapon.changed && <span className="text-yellow-400 text-xs font-semibold">⚡ {LATEST_PATCH}</span>}
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                {weapon.type}
              </span>
              <span className="text-xs text-gray-400">{weapon.caliber}</span>
              <span className="text-xs text-gray-500">{weapon.modes}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 text-gray-500">
            <span className="text-2xl">👆</span>
            <div>
              <p className="text-sm font-medium text-gray-400">무기를 클릭하세요</p>
              <p className="text-xs text-gray-600 mt-0.5">좌측 목록에서 선택하면 피해 시뮬레이션이 표시됩니다</p>
            </div>
          </div>
        )}
      </div>

      {/* 스탯 요약 */}
      {weapon && (
        <div className="px-5 py-3 border-b border-gray-700/50">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: '기본 데미지', value: `${weapon.damage}${weapon.pelletDmg ? '/펠렛' : ''}` },
              {
                label: 'RPM',
                value: weapon.boltAction ? '볼트액션' :
                  weapon.rpmUnknown ? '미확인' :
                  weapon.rpm2 ? `${weapon.rpm}/${weapon.rpm2}` :
                  weapon.rpm?.toLocaleString() ?? '—',
              },
              {
                label: 'DPS',
                value: (weapon.boltAction || weapon.rpmUnknown) ? '—' :
                  weapon.dps2 ? `${weapon.dps}/${weapon.dps2}` :
                  weapon.dps != null ? (Number.isInteger(weapon.dps) ? String(weapon.dps) : weapon.dps.toFixed(1)) : '—',
              },
              { label: '탄창', value: `${weapon.magBase}${weapon.magExt ? ` / ${weapon.magExt}` : ''}` },
              { label: '탄속', value: weapon.bulletSpeed != null ? `${weapon.bulletSpeed} m/s` : '-' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-800/60 rounded-xl px-3 py-2.5 text-center">
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</div>
                <div className="font-bold text-white text-sm mt-0.5">{value}</div>
              </div>
            ))}
          </div>
          {weapon.changed && weapon.changeNote && (
            <div className="mt-2 text-xs text-yellow-300/80 bg-yellow-950/40 rounded-lg px-3 py-2">
              ⚡ {weapon.changeNote}
            </div>
          )}
        </div>
      )}

      {/* 방어구 설정 */}
      <div className="px-5 py-3 border-b border-gray-700/50">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">방어구 설정</div>
        <div className="space-y-2">
          <ArmorSelector label="🛡️ 방어구" value={armorLevel} onChange={onArmorChange} color="text-blue-400" showPct={false} />
          <ArmorSelector label="⛑️ 헬멧" value={helmetLevel} onChange={onHelmetChange} color="text-purple-400" showPct={false} />
        </div>

        {/* 부위별 피해 배율 (선택된 무기 타입 기준, 헤드샷은 무기별 headMult 우선) */}
        {weapon && (() => {
          const m = TYPE_MULT[weapon.type] || TYPE_MULT.AR
          const headVal = weapon.headMult ?? m.head
          return (
            <div className="mt-3 pt-3 border-t border-gray-700/40">
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">부위별 피해 배율 ({weapon.type})</div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: '💀 헤드샷', val: headVal, color: 'text-red-400' },
                  { label: '🛡 몸통',   val: m.body, color: m.body >= 1.1 ? 'text-orange-400' : 'text-gray-300' },
                  { label: '💪 팔다리', val: m.limb, color: m.limb >= 1.1 ? 'text-orange-400' : 'text-gray-500' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-gray-800/60 rounded-xl px-2 py-2 text-center">
                    <div className="text-[9px] text-gray-500 mb-1">{label}</div>
                    <div className={`text-sm font-bold ${color}`}>×{val.toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-700 mt-2">※ 방어구는 팔다리를 보호하지 않음</p>
            </div>
          )
        })()}
      </div>

      {/* 마네킹 */}
      <div className="px-5 py-5 border-b border-gray-700/50">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">피해 시뮬레이션</div>
        <Mannequin weapon={weapon} armorLevel={armorLevel} helmetLevel={helmetLevel} />
      </div>

      {/* 세부 부위별 실제 데미지 */}
      {weapon && (() => {
        const m       = TYPE_MULT[weapon.type] || TYPE_MULT.AR
        const headVal = weapon.headMult ?? m.head
        const base = weapon.pelletDmg ? Math.round(weapon.damage * 9 * 0.9) : weapon.damage
        const ar   = ARMOR_MULT[armorLevel]
        const hr   = HELMET_MULT[helmetLevel]

        const zones = [
          { zone: '머리',  dmg: Math.round(base * headVal * hr),        armor: '헬멧 적용' },
          { zone: '목',    dmg: Math.round(base * 0.75),                armor: '방어구 없음' },
          { zone: '가슴',  dmg: Math.round(base * m.body * 1.10 * ar), armor: '방어구 적용' },
          { zone: '상체',  dmg: Math.round(base * m.body * 1.00 * ar), armor: '방어구 적용' },
          { zone: '복부',  dmg: Math.round(base * m.body * 0.90 * ar), armor: '방어구 적용' },
          { zone: '허리',  dmg: Math.round(base * m.body * 0.90 * ar), armor: '방어구 적용' },
          { zone: '팔',    dmg: Math.round(base * m.limb * 0.60),       armor: '방어구 없음' },
          { zone: '다리',  dmg: Math.round(base * m.limb * 0.60),       armor: '방어구 없음' },
          { zone: '손·발', dmg: Math.round(base * m.limb * 0.50),       armor: '방어구 없음' },
        ]
        const maxDmg = Math.max(...zones.map(z => z.dmg))

        const dmgColor = (dmg) => {
          const stk = Math.ceil(100 / dmg)
          return stk === 1 ? 'text-red-400' : stk === 2 ? 'text-orange-400' : stk <= 4 ? 'text-yellow-400' : 'text-gray-400'
        }
        const barColor = (dmg) => {
          const stk = Math.ceil(100 / dmg)
          return stk === 1 ? 'bg-red-500' : stk === 2 ? 'bg-orange-500' : stk <= 4 ? 'bg-yellow-500' : 'bg-gray-600'
        }

        return (
          <div className="px-5 py-4 border-b border-gray-700/50">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">세부 부위 피해량</div>
            <div className="space-y-1.5">
              {zones.map(({ zone, dmg, armor }) => (
                <div key={zone} className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400 w-9 flex-shrink-0">{zone}</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor(dmg)} rounded-full transition-all`}
                      style={{ width: `${Math.round((dmg / maxDmg) * 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold ${dmgColor(dmg)} w-8 text-right flex-shrink-0`}>{dmg}</span>
                  <span className="text-[9px] text-gray-700 w-14 flex-shrink-0">{armor}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1 text-[10px] text-gray-700">
              <p>• 방어구는 팔다리 부위를 보호하지 않습니다</p>
              <p>• 목 부위는 기본 피해의 75%로 차감된 피해를 받습니다</p>
            </div>
          </div>
        )
      })()}
    </div>
  );
}

// ─── 패치 노트 이력 ──────────────────────────────────────
const PATCH_NOTES = [
  {
    version: 'Update 42.3',
    date: '2026.08',
    isLatest: true,
    sections: [
      {
        title: '신규 무기',
        items: [
          { weapon: 'RPD', changes: ['LMG 신규 추가 · 7.62mm · 완전자동', '기본 탄창 50발 / 확장 시 110발', '부착물: AR/LMG 탄창·개머리판, 최대 6배율 스코프 (총구·손잡이 부착 불가)', '월드 스폰, 전 맵 등장'] },
        ],
      },
    ],
  },
  {
    version: 'Update 42.1',
    date: '2026.06',
    isLatest: false,
    sections: [
      {
        title: '무기 밸런스',
        items: [
          { weapon: 'SLR', changes: ['수평 반동 10% 감소', '탄속 840 → 870m/s'] },
        ],
      },
      {
        title: '총기 삭제',
        items: [
          { weapon: '삭제 완료 6종', changes: ['QBU (DMR)', '모신 나강 (SR)', 'PP-19 Bizon (SMG)', 'DP-28 (LMG)', 'R45 (PST)', 'P1911 (PST)'] },
        ],
      },
    ],
  },
  {
    version: 'Update 41.1',
    date: '2026.04',
    isLatest: false,
    sections: [
      {
        title: '신규 부착물',
        items: [
          { weapon: '하이브리드 스코프', changes: ['신규 스코프 추가', '1배율 ↔ 4배율 즉시 전환 가능', '조준기 상태 변경 키로 배율 전환', '근거리·중거리 유연한 대응 가능'] },
          { weapon: '틸티드 그립 (신규 손잡이)', changes: ['수직 반동 제어 +12%', '수평 반동 제어 +6%', '사격 시 시야 흔들림 제어 +25%'] },
        ],
      },
      {
        title: '부착물 밸런스 조정',
        items: [
          { weapon: '앵글 손잡이', changes: ['전장에서 삭제됨', '수평 반동 제어 역할이 하프 그립으로 통합됨'] },
          { weapon: '하프 그립', changes: ['수평 반동 제어 +8% → +16% (버프)'] },
        ],
      },
      {
        title: '무기 밸런스',
        items: [
          { weapon: 'Dragunov', changes: ['수직 반동 20% 감소', '수평 반동 15% 감소'] },
        ],
      },
      {
        title: '삭제 예정 안내 (Update 42.1 · 2026년 6월)',
        items: [
          { weapon: '삭제 대상 6종', changes: ['모신 나강 (SR)', 'R45 (PST)', 'DP-28 (LMG)', 'PP-19 Bizon (SMG)', 'P1911 (PST)', 'QBU (DMR)', '사유: 사용률 저조 및 부주류 총기 정리'] },
        ],
      },
    ],
  },
  {
    version: 'Update 40.1',
    date: '2026.02.04',
    isLatest: false,
    sections: [
      {
        title: '무기 밸런스',
        items: [
          { weapon: 'Mk12',  changes: ['피해량 44 → 43', '수평 반동 약 8% 증가'] },
          { weapon: 'SLR',   changes: ['수평 반동 약 4% 감소'] },
        ],
      },
    ],
  },
  {
    version: 'Update 39.1',
    date: null,
    sections: [
      {
        title: '무기 밸런스',
        items: [
          { weapon: 'VSS',  changes: ['수직 반동 10% 증가', '수평 반동 5% 증가', '격발음 증가, 더 멀리서도 들을 수 있게 변경'] },
          { weapon: 'SLR',  changes: ['수직 반동 5% 감소', '수평 반동 5% 감소'] },
          { weapon: 'SKS',  changes: ['수평 반동 10% 감소', '거리별 탄속 감소율 완화'] },
          { weapon: 'AUG',  changes: ['수평 반동 4% 증가'] },
          { weapon: 'M416', changes: ['수평 반동 5% 감소'] },
        ],
      },
    ],
  },
  {
    version: 'Update 38.1',
    date: null,
    sections: [
      {
        title: '비조준 사격 조정 (SMG — P90 제외)',
        items: [
          { weapon: '전체 SMG (P90 제외)', changes: ['비조준 사격 정확도 57% 감소', '사격 지속 시 정확도 51.5% 감소'] },
          { weapon: 'P90',   changes: ['비조준 사격 정확도 28.5% 감소', '사격 지속 시 정확도 25.75% 감소'] },
        ],
      },
      {
        title: '무기 밸런스',
        items: [
          { weapon: 'MP5K', changes: ['피해량 34 → 32'] },
        ],
      },
    ],
  },
  {
    version: 'Update 37.1',
    date: null,
    sections: [
      {
        title: 'DMR 전체 밸런스 조정',
        items: [
          { weapon: 'DMR 전체', changes: ['피해량 약 12% 감소', '발사 속도 약 45% 감소 (드라구노프, Mk14 제외)', 'Mk14: 발사 속도 약 33% 감소', 'VSS: 피해량·발사 속도 변동 없음'] },
        ],
      },
    ],
  },
  {
    version: 'Update 36.1',
    date: null,
    sections: [
      {
        title: '무기 밸런스',
        items: [
          { weapon: 'AUG',  changes: ['피해량 41 → 40', '저지력 50% 감소'] },
          { weapon: 'VSS',  changes: ['피해량 43 → 45', '탄속 330m/s → 430m/s', '피해량 감소 시작 거리 0m → 50m', '영점 조준 간격 25m → 100m, 최대 영점 거리 300m'] },
        ],
      },
      {
        title: '부착물',
        items: [
          { weapon: '제동기', changes: ['수직 반동 제어 +8% → +10%'] },
        ],
      },
    ],
  },
  {
    version: 'Update 35.1',
    date: null,
    sections: [
      {
        title: '저지력 시스템 신규 도입',
        items: [
          { weapon: 'SR (저격소총)',  changes: ['가장 강력한 저지력 적용'] },
          { weapon: 'SG (산탄총)',    changes: ['강한 저지력 적용'] },
          { weapon: 'SMG (기관단총)', changes: ['산탄총보다 소폭 약한 강한 저지력 · VSS는 SMG와 동일'] },
          { weapon: 'AR / LMG / DMR', changes: ['낮은 저지력 적용', '7.62mm > 5.56mm 저지력'] },
          { weapon: '권총 · 석궁 등', changes: ['매우 낮은 기본 저지력 적용'] },
        ],
      },
    ],
  },
  {
    version: 'Update 34.1',
    date: null,
    sections: [
      {
        title: '신규 무기',
        items: [
          { weapon: 'Mk12', changes: ['DMR 신규 추가 · 5.56mm · 반자동'] },
        ],
      },
    ],
  },
];

export default function WeaponDamage() {
  const [activeType, setActiveType] = useState('ALL');
  const [sortCol, setSortCol] = useState('damage');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [armorLevel, setArmorLevel] = useState(0);
  const [helmetLevel, setHelmetLevel] = useState(0);
  const [openPatches, setOpenPatches]   = useState(['Update 41.1']);
  const [compareMode, setCompareMode]   = useState(false);
  const [compareSet, setCompareSet]     = useState(new Set());
  const [selectedWeapon, setSelectedWeapon] = useState(null);

  const toggleCompare = (name) => {
    setCompareSet((prev) => {
      const next = new Set(prev);
      if (next.has(name)) { next.delete(name); }
      else if (next.size < 3) { next.add(name); }
      return next;
    });
  };

  // 비교 모드 해제 시 선택 초기화
  const exitCompare = () => { setCompareMode(false); setCompareSet(new Set()); };

  const compareWeapons = WEAPON_DATA.filter((w) => compareSet.has(w.name));

  const togglePatch = (v) =>
    setOpenPatches((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(() => {
    let list = WEAPON_DATA;
    if (activeType !== 'ALL') list = list.filter((w) => w.type === activeType);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((w) => w.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const av = a[sortCol] ?? 0;
      const bv = b[sortCol] ?? 0;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [activeType, sortCol, sortDir, search]);

  // 최신 패치 변경 무기 수
  const changedCount = filtered.filter((w) => w.changed).length;
  const deletePendingCount = WEAPON_DATA.filter((w) => w.deletePending).length;

  return (
    <>
      <Head>
        <title>배그 무기 데미지 표 - PUBG 총기 데미지·DPS·방어구별 피해량 비교 | PKGG</title>
        <meta name="description" content="배틀그라운드 전 무기 데미지, DPS, 방어구별 피해량 완벽 정리" />
        <meta name="keywords" content="배그 무기 데미지, 배그 총기 데미지, PUBG 무기 데미지표, 배틀그라운드 무기 순위, 배그 DPS, PUBG 헤드샷 배율, 배그 탄속" />
        <meta property="og:title" content="배그 무기 데미지 표 최신판 | PKGG" />
        <meta property="og:description" content="배틀그라운드 전 무기 데미지, DPS, 방어구별 피해량 완벽 정리" />
        <meta property="og:url" content="https://pkgg.vercel.app/weapon-damage" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://pkgg.vercel.app/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="배그 무기 데미지 표 최신판 | PKGG" />
        <meta name="twitter:description" content="배틀그라운드 전 무기 데미지, DPS, 방어구별 피해량 완벽 정리" />
        <meta name="twitter:image" content="https://pkgg.vercel.app/og-image.png" />
        <link rel="canonical" href="https://pkgg.vercel.app/weapon-damage" />
      </Head>
      <Header />

      <div className="min-h-screen bg-neutral-950 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">

          {/* 헤더 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">🔫 무기 데미지 표</h1>
            <p className="text-sm text-gray-400 mb-1">
              PUBG(배틀그라운드) {WEAPON_DATA.length}종 무기의 데미지, DPS, 헤드샷 배율, 탄속을 최신 42.1 패치 기준으로 정리했습니다.
              AR·DMR·저격소총·SMG 등 총기별 데미지를 방어구 레벨별로 비교해보세요.
            </p>
            <p className="text-gray-400 text-sm">기본 데미지 · 연사속도 · 탄창 · DPS 비교 (방어구 미착용 기준)</p>
            <p className="text-sm text-gray-600 mt-1">데이터 검수 도움: 배틀그라운드 공식 카페 - <a href="https://www.youtube.com/@1067mm" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white underline underline-offset-2 transition-colors">광원효과</a>님</p>
          </div>

          {/* 데이터 기준 뱃지 */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/50 border border-blue-700/50 rounded-full text-xs font-semibold text-blue-300">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              {LATEST_PATCH} 기준
            </span>
            <span className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full text-xs text-gray-400">
              📅 {LATEST_PATCH_DATE}
            </span>
            <span className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full text-xs text-gray-400">
              📋 {DATA_SOURCE}
            </span>
            {changedCount > 0 && (
              <span className="px-3 py-1.5 bg-yellow-900/50 border border-yellow-700/50 rounded-full text-xs text-yellow-300 font-semibold">
                ⚡ 이번 패치 변경 {changedCount}건
              </span>
            )}
            {deletePendingCount > 0 && (
              <span className="px-3 py-1.5 bg-red-950/50 border border-red-800/50 rounded-full text-xs text-red-400 font-semibold">
                🗑️ 삭제 예정 {deletePendingCount}종
              </span>
            )}
          </div>

          {/* 검색 + 비교 모드 버튼 */}
          <div className="mb-4 flex flex-wrap gap-2 items-center">
            <input
              type="text"
              placeholder="무기명 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-sm px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => compareMode ? exitCompare() : setCompareMode(true)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all border ${
                compareMode
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
              }`}
            >
              🆚 {compareMode ? `비교 모드 (${compareSet.size}/3)` : '비교 모드'}
            </button>
            {compareMode && compareSet.size > 0 && (
              <button
                onClick={() => setCompareSet(new Set())}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1"
              >
                선택 초기화
              </button>
            )}
          </div>

          {/* 타입 필터 탭 */}
          <div className="flex flex-wrap gap-2 mb-6">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveType(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  activeType === tab.key
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={`text-xs ${activeType === tab.key ? 'text-blue-200' : 'text-gray-500'}`}>
                  {tab.key === 'ALL'
                    ? WEAPON_DATA.length
                    : WEAPON_DATA.filter((w) => w.type === tab.key).length}
                </span>
              </button>
            ))}
          </div>

          {/* ── 2-컬럼 레이아웃: 무기 목록 + 상세 패널 ── */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">

            {/* LEFT: 무기 목록 */}
            <div className="lg:flex-1 min-w-0">

              {/* ── 모바일 카드 목록 (sm 미만) ── */}
              <div className="sm:hidden space-y-2">
                {filtered.length === 0 && (
                  <div className="py-12 text-center text-gray-500">
                    <div className="text-4xl mb-3">🔍</div>
                    <p>검색 결과가 없습니다</p>
                  </div>
                )}
                {filtered.map((w) => {
                  const dpsVal = (w.boltAction || w.rpmUnknown) ? null : (w.dps ?? null);
                  const dpsStr = dpsVal == null ? null : (Number.isInteger(dpsVal) ? dpsVal.toLocaleString() : dpsVal.toFixed(1));
                  const badge  = TYPE_BADGE[w.type] || TYPE_BADGE.AR;
                  const imgSrc = WEAPON_IMG[w.name];
                  const isSelected = selectedWeapon?.name === w.name;
                  return (
                    <div
                      key={w.name}
                      onClick={() => setSelectedWeapon(isSelected ? null : w)}
                      className={`rounded-xl border px-3 py-2.5 cursor-pointer transition-all ${
                        isSelected ? 'bg-blue-950/50 border-blue-500/60' :
                        w.deletePending ? 'bg-red-950/10 border-red-800/30' :
                        w.changed ? 'bg-yellow-950/20 border-yellow-700/30' :
                        'bg-gray-900 border-gray-700/50'
                      }`}
                    >
                      {/* 1행: 이미지 + 이름 + 분류 */}
                      <div className="flex items-center gap-2 mb-1.5">
                        {imgSrc && <img src={imgSrc} alt={w.name} className="w-10 h-6 object-contain opacity-85 flex-shrink-0" />}
                        <span className={`font-bold text-sm flex-1 min-w-0 truncate ${w.deletePending ? 'text-gray-400 line-through decoration-red-500' : isSelected ? 'text-blue-300' : 'text-white'}`}>
                          {w.name}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {w.deletePending && <span className="text-red-400 text-xs">🗑️</span>}
                          {w.changed && <span className="text-yellow-400 text-xs">⚡</span>}
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>{w.type}</span>
                        </div>
                      </div>
                      {/* 2행: 핵심 스탯 3개 */}
                      <div className="grid grid-cols-3 gap-1 text-center">
                        <div className="bg-gray-800/60 rounded-lg py-1.5">
                          <div className="text-[10px] text-gray-500 mb-0.5">데미지</div>
                          <div className="text-sm font-black text-white">{w.damage}{w.pelletDmg && <span className="text-[9px] text-gray-500 ml-0.5">/펠렛</span>}</div>
                        </div>
                        <div className="bg-gray-800/60 rounded-lg py-1.5">
                          <div className="text-[10px] text-gray-500 mb-0.5">RPM</div>
                          <div className="text-sm font-bold text-gray-300">
                            {w.boltAction ? <span className="text-[10px] text-gray-500">볼트</span> : w.rpmUnknown ? '?' : w.rpm}
                          </div>
                        </div>
                        <div className="bg-gray-800/60 rounded-lg py-1.5">
                          <div className="text-[10px] text-gray-500 mb-0.5">DPS</div>
                          <div className={`text-sm font-bold ${
                            dpsVal == null ? 'text-gray-600' :
                            dpsVal >= 600 ? 'text-red-400' :
                            dpsVal >= 400 ? 'text-orange-400' :
                            dpsVal >= 250 ? 'text-yellow-400' : 'text-green-400'
                          }`}>{dpsStr ?? '—'}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── 데스크탑 테이블 (sm 이상) ── */}
              <div className="hidden sm:block bg-gray-900 rounded-2xl border border-gray-700/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                  <tr className="border-b border-gray-700 bg-gray-800/60">
                    {compareMode && <th className="px-3 py-3 w-10" />}
                    <th className="text-left px-4 py-3 text-gray-400 font-semibold">무기명</th>
                    <th className="text-left px-3 py-3 text-gray-400 font-semibold">분류</th>
                    <th
                      className="text-right px-4 py-3 text-gray-400 font-semibold cursor-pointer hover:text-white select-none"
                      onClick={() => handleSort('damage')}
                    >
                      데미지<SortIcon col="damage" sortCol={sortCol} sortDir={sortDir} />
                    </th>
                    <th
                      className="text-right px-4 py-3 text-gray-400 font-semibold cursor-pointer hover:text-white select-none"
                      onClick={() => handleSort('rpm')}
                    >
                      <Tooltip text="분당 발사 수 (RPM)">RPM</Tooltip>
                      <SortIcon col="rpm" sortCol={sortCol} sortDir={sortDir} />
                    </th>
                    <th className="text-right px-4 py-3 text-gray-400 font-semibold">
                      <Tooltip text="초당 데미지 (DPS) — 이론 최대값">DPS</Tooltip>
                    </th>
                    <th className="text-right px-4 py-3 text-gray-400 font-semibold hidden md:table-cell">
                      <Tooltip text="탄속 (m/s) — 데이터 미제공 시 '-' 표시">탄속</Tooltip>
                    </th>
                    <th className="text-right px-4 py-3 text-gray-400 font-semibold hidden md:table-cell">탄창</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((w, i) => {
                    const dpsVal = (w.boltAction || w.rpmUnknown) ? null : (w.dps ?? null);
                    const dpsStr = dpsVal == null ? null : (Number.isInteger(dpsVal) ? dpsVal.toLocaleString() : dpsVal.toFixed(1));
                    const badge  = TYPE_BADGE[w.type] || TYPE_BADGE.AR;
                    const isSelected = selectedWeapon?.name === w.name;
                    const imgSrc = WEAPON_IMG[w.name];

                    return (
                      <tr
                        key={w.name}
                        onClick={() => setSelectedWeapon(isSelected ? null : w)}
                        className={`border-b border-gray-800/80 transition-colors cursor-pointer select-none ${
                          isSelected
                            ? 'bg-blue-950/40 border-l-2 border-l-blue-500'
                            : compareSet.has(w.name)
                            ? 'bg-emerald-950/20 hover:bg-emerald-950/30'
                            : w.deletePending
                            ? 'bg-red-950/10 hover:bg-red-950/20'
                            : w.changed
                            ? 'bg-yellow-950/20 hover:bg-yellow-950/30'
                            : i % 2 === 0
                            ? 'hover:bg-gray-800/40'
                            : 'bg-gray-900/30 hover:bg-gray-800/40'
                        }`}
                      >
                        {compareMode && (
                          <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={compareSet.has(w.name)}
                              onChange={() => toggleCompare(w.name)}
                              disabled={!compareSet.has(w.name) && compareSet.size >= 3}
                              className="w-4 h-4 accent-emerald-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                            />
                          </td>
                        )}
                        {/* 무기명 */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            {imgSrc && (
                              <img
                                src={imgSrc}
                                alt={w.name}
                                className="w-10 h-6 object-contain flex-shrink-0 opacity-85"
                                draggable={false}
                              />
                            )}
                            <span className={`font-semibold text-sm ${
                              w.deletePending ? 'text-gray-400 line-through decoration-red-500' :
                              isSelected ? 'text-blue-300' : 'text-white'
                            }`}>
                              {w.name}
                            </span>
                            {w.deletePending && (
                              <Tooltip text={w.deletePendingNote || 'Update 42.1 삭제 예정'}>
                                <span className="text-red-400 text-xs cursor-help">🗑️</span>
                              </Tooltip>
                            )}
                            {w.changed && (
                              <Tooltip text={`${LATEST_PATCH}: ${w.changeNote || ''}`}>
                                <span className="text-yellow-400 text-xs cursor-help">⚡</span>
                              </Tooltip>
                            )}
                            {w.historyNote && (
                              <Tooltip text={w.historyNote}>
                                <span className="text-blue-400/60 text-xs cursor-help select-none">ℹ</span>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                        {/* 분류 */}
                        <td className="px-3 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                            {w.type}
                          </span>
                        </td>
                        {/* 데미지 */}
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-white">{w.damage}</span>
                          {w.pelletDmg && (
                            <Tooltip text="펠렛당 피해량 · 9펠렛 × 90% 보정">
                              <span className="text-gray-600 text-xs ml-0.5 cursor-help">/펠렛</span>
                            </Tooltip>
                          )}
                        </td>
                        {/* RPM */}
                        <td className="px-4 py-3 text-right text-gray-400 text-sm">
                          {w.boltAction ? (
                            <span className="text-gray-600 text-xs">볼트액션</span>
                          ) : w.rpmUnknown ? (
                            <span className="text-gray-600 text-xs">?</span>
                          ) : w.rpm2 ? (
                            <Tooltip text={`연사력 2단계: ${w.rpm} / ${w.rpm2} RPM`}>
                              <span className="cursor-help text-xs">{w.rpm}<span className="text-gray-600">/</span>{w.rpm2}</span>
                            </Tooltip>
                          ) : w.rpm?.toLocaleString()}
                        </td>
                        {/* DPS */}
                        <td className="px-4 py-3 text-right">
                          {dpsStr == null ? (
                            <span className="text-gray-700">—</span>
                          ) : w.dps2 ? (
                            <Tooltip text={`저속 ${dpsStr} / 고속 ${w.dps2}`}>
                              <span className="text-orange-400 font-semibold cursor-help text-sm">{dpsStr}</span>
                            </Tooltip>
                          ) : w.burstDps ? (
                            <Tooltip text="이중 총신 2발 합산">
                              <span className="text-yellow-400 font-semibold cursor-help text-sm">{dpsStr}</span>
                            </Tooltip>
                          ) : (
                            <span className={`text-sm font-semibold ${
                              (w.dps ?? 0) >= 600 ? 'text-red-400' :
                              (w.dps ?? 0) >= 400 ? 'text-orange-400' :
                              (w.dps ?? 0) >= 250 ? 'text-yellow-400' :
                              'text-green-400'
                            }`}>{dpsStr}</span>
                          )}
                        </td>
                        {/* 탄속 */}
                        <td className="px-4 py-3 text-right text-gray-400 text-sm hidden md:table-cell">
                          {w.bulletSpeed != null ? `${w.bulletSpeed}` : <span className="text-gray-700">-</span>}
                        </td>
                        {/* 탄창 */}
                        <td className="px-4 py-3 text-right text-gray-400 text-sm hidden md:table-cell">
                          {w.magBase}{w.magExt && <span className="text-gray-600">/{w.magExt}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
              <div className="py-16 text-center text-gray-500">
                <div className="text-4xl mb-3">🔍</div>
                <p>검색 결과가 없습니다</p>
              </div>
            )}

            {/* 테이블 하단 주석 */}
            <div className="px-4 py-3 bg-gray-800/40 border-t border-gray-700/50">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span>• 무기 클릭 → 우측 패널에서 상세 확인</span>
                <span>• 헤드샷 배율 ×{HEAD_MULT} · 사지 ×0.65(근사치)</span>
                <span className="text-yellow-500">• ⚡ {LATEST_PATCH} 변경</span>
                <span className="text-blue-400/60">• ℹ 이전 패치 이력</span>
                <span className="text-red-400/70">• 🗑️ 42.1 삭제 예정</span>
              </div>
            </div>
          </div>
            </div>

            {/* RIGHT: 상세 패널 (sticky) */}
            <div className="lg:w-80 xl:w-96 flex-shrink-0 w-full">
              <div className="sticky top-4">
                <WeaponDetailPanel
                  weapon={selectedWeapon}
                  armorLevel={armorLevel}
                  helmetLevel={helmetLevel}
                  onArmorChange={setArmorLevel}
                  onHelmetChange={setHelmetLevel}
                />
              </div>
            </div>

          </div>

          {/* ── 무기 비교 패널 ── */}
          {compareMode && compareWeapons.length >= 2 && (() => {
            const maxDmg = Math.max(...compareWeapons.map((w) => w.damage));
            const maxRpm = Math.max(...compareWeapons.map((w) => w.rpm ?? 0));
            const maxDps = Math.max(...compareWeapons.map((w) => w.dps ?? 0));
            const maxBody = Math.max(...compareWeapons.map((w) => calcBodyDmg(w.damage, armorLevel)));
            const maxHead = Math.max(...compareWeapons.map((w) => calcHeadDmg(w.damage, helmetLevel, w.headMult)));

            const COLORS = ['text-emerald-400', 'text-blue-400', 'text-purple-400'];
            const BAR_COLORS = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500'];

            const StatRow = ({ label, values, maxV, unit = '' }) => (
              <div className="mb-3">
                <div className="text-xs text-gray-500 mb-1.5 font-semibold">{label}</div>
                {values.map((val, i) => {
                  const pct = maxV > 0 ? (val / maxV) * 100 : 0;
                  const isMax = val === Math.max(...values);
                  return (
                    <div key={i} className="flex items-center gap-2 mb-1">
                      <span className={`text-[11px] w-28 truncate flex-shrink-0 ${COLORS[i]}`}>
                        {compareWeapons[i].name}
                      </span>
                      <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${BAR_COLORS[i]} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold w-12 text-right ${isMax ? COLORS[i] : 'text-gray-400'}`}>
                        {val}{unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            );

            return (
              <div className="mt-4 bg-gray-900 border border-emerald-500/30 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    🆚 무기 비교 — {compareWeapons.map((w) => w.name).join(' vs ')}
                  </h3>
                  <button onClick={() => setCompareSet(new Set())} className="text-xs text-gray-600 hover:text-gray-400">
                    비우기
                  </button>
                </div>

                {/* 비교 범례 */}
                <div className="flex gap-4 mb-4 flex-wrap">
                  {compareWeapons.map((w, i) => (
                    <div key={w.name} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded-full ${BAR_COLORS[i]}`} />
                      <span className={`text-xs font-semibold ${COLORS[i]}`}>{w.name}</span>
                      <span className="text-[10px] text-gray-600">{w.type} · {w.caliber}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div>
                    <StatRow label="기본 데미지" values={compareWeapons.map((w) => w.damage)} maxV={maxDmg} />
                    <StatRow label="연사속도 (RPM)" values={compareWeapons.map((w) => w.rpm ?? 0)} maxV={maxRpm} />
                    <StatRow label="DPS" values={compareWeapons.map((w) => w.dps ?? 0)} maxV={maxDps} />
                  </div>
                  <div>
                    <StatRow label={`몸통 데미지 (방어구 ${ARMOR_LABELS[armorLevel]})`} values={compareWeapons.map((w) => calcBodyDmg(w.damage, armorLevel))} maxV={maxBody} />
                    <StatRow label={`헤드 데미지 (헬멧 ${ARMOR_LABELS[helmetLevel]})`} values={compareWeapons.map((w) => calcHeadDmg(w.damage, helmetLevel, w.headMult))} maxV={maxHead} />
                    <div className="mb-3">
                      <div className="text-xs text-gray-500 mb-1.5 font-semibold">몸통 킬샷 수</div>
                      {compareWeapons.map((w, i) => {
                        const stk = calcSTK(100, calcBodyDmg(w.damage, armorLevel));
                        const isMin = stk === Math.min(...compareWeapons.map((x) => calcSTK(100, calcBodyDmg(x.damage, armorLevel))));
                        return (
                          <div key={i} className="flex items-center gap-2 mb-1">
                            <span className={`text-[11px] w-28 truncate ${COLORS[i]}`}>{w.name}</span>
                            <span className={`text-sm font-black ${isMin ? 'text-red-400' : 'text-gray-300'}`}>{stk}발</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 패치 변경 요약 */}
          {WEAPON_DATA.filter((w) => w.changed).length > 0 && (
            <div className="mt-6 bg-yellow-950/30 border border-yellow-800/50 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-yellow-400 mb-3 flex items-center gap-2">
                ⚡ {LATEST_PATCH} 무기 변경 사항
                <span className="text-xs font-normal text-yellow-600">({LATEST_PATCH_DATE})</span>
              </h2>
              <div className="space-y-2">
                {WEAPON_DATA.filter((w) => w.changed).map((w) => (
                  <div key={w.name} className="flex items-start gap-3 text-sm">
                    <span className="font-semibold text-white w-28 flex-shrink-0">{w.name}</span>
                    <span className="text-yellow-300/80">{w.changeNote}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 패치 노트 히스토리 아코디언 ── */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-lg">📜</span>
              <h2 className="text-base font-bold text-white">건플레이 패치 노트 이력</h2>
              <span className="text-xs text-neutral-500 px-2.5 py-1">
                공식 패치 중 건플레이 관련 내용만 발췌
              </span>
            </div>
            <div className="space-y-1.5">
              {PATCH_NOTES.map((patch) => {
                const isOpen = openPatches.includes(patch.version);
                return (
                  <div
                    key={patch.version}
                    className={`rounded-xl overflow-hidden border transition-all ${
                      patch.isLatest
                        ? isOpen ? 'border-yellow-700/50 bg-yellow-950/40' : 'border-yellow-800/40'
                        : isOpen ? 'border-neutral-600 bg-neutral-800' : 'border-neutral-700'
                    }`}
                  >
                    {/* 헤더 */}
                    <button
                      onClick={() => togglePatch(patch.version)}
                      className="w-full flex items-center justify-between px-5 py-3.5 text-left"
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* 버전 번호 */}
                        <span className={`font-semibold text-sm ${
                          patch.isLatest ? 'text-yellow-300' : isOpen ? 'text-white' : 'text-gray-300'
                        }`}>
                          {patch.version}
                        </span>
                        {/* 최신 뱃지 */}
                        {patch.isLatest && (
                          <span className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-600/40 rounded-md text-yellow-400 text-xs font-semibold">
                            LATEST
                          </span>
                        )}
                        {/* 날짜 */}
                        {patch.date && (
                          <span className="text-xs text-neutral-500">{patch.date}</span>
                        )}
                        {/* 항목 수 */}
                        <span className={`text-xs ${
                          patch.isLatest ? 'text-yellow-600' : isOpen ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {patch.sections.reduce((acc, s) => acc + s.items.length, 0)}개 항목
                        </span>
                      </div>
                      {/* 펼침 화살표 */}
                      <svg
                        className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                          isOpen
                            ? (patch.isLatest ? 'text-yellow-500 rotate-180' : 'text-gray-400 rotate-180')
                            : (patch.isLatest ? 'text-yellow-700' : 'text-gray-500')
                        }`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* 내용 */}
                    {isOpen && (
                      <div className={`px-5 pb-5 space-y-4 border-t ${
                        patch.isLatest ? 'border-yellow-800/30' : 'border-neutral-600'
                      }`}>
                        {patch.sections.map((section, si) => (
                          <div key={si} className="pt-4">
                            {/* 섹션 타이틀 */}
                            <p className={`text-xs font-semibold mb-3 uppercase tracking-wider ${
                              patch.isLatest ? 'text-yellow-600' : 'text-gray-400'
                            }`}>
                              {section.title}
                            </p>
                            {/* 무기별 변경 항목 */}
                            <div className="space-y-2">
                              {section.items.map((item, ii) => (
                                <div key={ii} className={`flex gap-4 px-3 py-2.5 rounded-lg ${
                                  patch.isLatest
                                    ? 'bg-yellow-950/40 border border-yellow-900/40'
                                    : 'bg-neutral-700 border border-neutral-600'
                                }`}>
                                  <span className={`text-sm font-semibold w-36 flex-shrink-0 ${
                                    patch.isLatest ? 'text-yellow-200' : 'text-gray-200'
                                  }`}>
                                    {item.weapon}
                                  </span>
                                  <ul className="space-y-1 flex-1">
                                    {item.changes.map((c, ci) => (
                                      <li key={ci} className="text-sm text-gray-400 flex items-start gap-2">
                                        <span className={`mt-[5px] w-1 h-1 rounded-full flex-shrink-0 ${
                                          patch.isLatest ? 'bg-yellow-500' : 'bg-gray-500'
                                        }`} />
                                        {c}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 출처 */}
          <p className="mt-4 text-xs text-gray-600 text-center">
            데이터 출처: PUBG 공식 패치노트 (pubg.com)
          </p>

        </div>
      </div>

    </>
  );
}
