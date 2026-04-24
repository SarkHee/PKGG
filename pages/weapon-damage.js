// pages/weapon-damage.js
import { useState, useMemo } from 'react';
import Head from 'next/head';
import Header from '../components/layout/Header';

// ─── 최신 패치 기준 정보 ─────────────────────────────────
const LATEST_PATCH = 'Update 41.1';
const LATEST_PATCH_DATE = '2026.04 PC 적용';
const DATA_SOURCE = '공식 패치노트 기반';

// ─── 무기 데이터 ────────────────────────────────────────
// changed: true       → 최신 패치(41.1)에서 변경된 항목 (노란 강조)
// historyNote         → 이전 패치에서의 변경 이력 (ℹ 툴팁으로 표시)
// deletePending: true → Update 42.1(2026년 6월) 삭제 예정 (🗑️ 표시)
const WEAPON_DATA = [
  // ── 돌격소총 (AR) ──
  { name: 'Mk47 Mutant',  type: 'AR',  damage: 49, rpm: 360,  magBase: 20, magExt: 30,  modes: 'Semi / 2점사', caliber: '7.62mm', dataFrom: 'Update 28.1' },
  { name: 'AKM',          type: 'AR',  damage: 47, rpm: 600,  magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '7.62mm', dataFrom: 'Update 28.1' },
  { name: 'Groza',        type: 'AR',  damage: 47, rpm: 700,  magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '7.62mm', dataFrom: 'Update 28.1' },
  { name: 'Beryl M762',   type: 'AR',  damage: 44, rpm: 700,  magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '7.62mm', dataFrom: 'Update 28.1' },
  { name: 'ACE32',        type: 'AR',  damage: 43, rpm: 660,  magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '5.56mm', dataFrom: 'Update 28.1' },
  { name: 'M16A4',        type: 'AR',  damage: 43, rpm: 750,  magBase: 30, magExt: 40,  modes: '단발 / 3점사',  caliber: '5.56mm', dataFrom: 'Update 28.1' },
  { name: 'QBZ',          type: 'AR',  damage: 42, rpm: 750,  magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '5.56mm', dataFrom: 'Update 28.1' },
  { name: 'SCAR-L',       type: 'AR',  damage: 42, rpm: 600,  magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '5.56mm', dataFrom: 'Update 28.1' },
  // AUG A3: U36.1에서 피해량 41→40 너프, U39.1에서 수평 반동 4% 증가
  { name: 'AUG A3',       type: 'AR',  damage: 40, rpm: 730,  magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '5.56mm', dataFrom: 'Update 36.1', historyNote: 'U36.1: 피해량 41→40 너프 · U39.1: 수평 반동 4% 증가' },
  { name: 'G36C',         type: 'AR',  damage: 41, rpm: 730,  magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '5.56mm', dataFrom: 'Update 28.1' },
  { name: 'K2',           type: 'AR',  damage: 41, rpm: 720,  magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '5.56mm', dataFrom: 'Update 32.1' },
  // M416: U39.1에서 수평 반동 5% 감소 (데미지/RPM 변동 없음)
  { name: 'M416',         type: 'AR',  damage: 40, rpm: 800,  magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '5.56mm', dataFrom: 'Update 28.1', historyNote: 'U39.1: 수평 반동 5% 감소' },
  { name: 'FAMAS',        type: 'AR',  damage: 39, rpm: 900,  magBase: 25, magExt: 30,  modes: '3점사',         caliber: '5.56mm', dataFrom: 'Update 28.1' },

  // ── 지정사수소총 (DMR) ──
  // U37.1 DMR 전체 너프: 피해량 ~12% 감소, 발사 속도 ~45% 감소 (Mk14 제외 33% 감소)
  // U37.1에서 VSS는 제외되어 피해량·발사 속도 유지
  { name: 'Mk14 EBR',     type: 'DMR', damage: 61, rpm: 450,  magBase: 10, magExt: 20,  modes: 'Semi / 완전자동', caliber: '7.62mm', dataFrom: 'Update 37.1', historyNote: 'U37.1: 피해량 ~12% 감소, 발사 속도 ~33% 감소' },
  { name: 'SLR',          type: 'DMR', damage: 56, rpm: 400,  magBase: 10, magExt: 20,  modes: '반자동',         caliber: '7.62mm', dataFrom: 'Update 40.1', changed: true, changeNote: '수평 반동 약 4% 추가 감소', historyNote: 'U37.1: 피해량 ~12% 감소, 발사 속도 ~45% 감소 · U39.1: 수직·수평 반동 각 5% 감소' },
  { name: 'SKS',          type: 'DMR', damage: 53, rpm: 400,  magBase: 10, magExt: 20,  modes: '반자동',         caliber: '7.62mm', dataFrom: 'Update 37.1', historyNote: 'U37.1: 피해량 ~12% 감소, 발사 속도 ~45% 감소 · U39.1: 수평 반동 10% 감소' },
  { name: 'Mini14',       type: 'DMR', damage: 48, rpm: 600,  magBase: 20, magExt: 30,  modes: '반자동',         caliber: '5.56mm', dataFrom: 'Update 37.1', historyNote: 'U37.1: 피해량 ~12% 감소, 발사 속도 ~45% 감소' },
  { name: 'QBU',          type: 'DMR', damage: 48, rpm: 600,  magBase: 10, magExt: 20,  modes: '반자동',         caliber: '5.56mm', dataFrom: 'Update 37.1', historyNote: 'U37.1: 피해량 ~12% 감소, 발사 속도 ~45% 감소', deletePending: true, deletePendingNote: 'Update 42.1(2026년 6월)에서 삭제 예정' },
  // 드라구노프: U37.1 피해량 너프 적용, 발사속도 조정은 제외 · U41.1 수직/수평 반동 감소
  { name: 'Dragunov',     type: 'DMR', damage: 56, rpm: 240,  magBase: 10, magExt: 20,  modes: '반자동',         caliber: '7.62mm', dataFrom: 'Update 41.1', changed: true, changeNote: '수직 반동 20% 감소, 수평 반동 15% 감소', historyNote: 'U37.1: 피해량 ~12% 감소 (발사속도 조정 제외)' },
  { name: 'Mk12',         type: 'DMR', damage: 43, rpm: 600,  magBase: 20, magExt: 30,  modes: '반자동',         caliber: '5.56mm', dataFrom: 'Update 40.1', changed: true, changeNote: '피해량 44→43, 수평 반동 8% 증가', historyNote: 'U34.1: 신규 추가 · U37.1: 피해량 ~12% 감소, 발사 속도 ~45% 감소' },
  // VSS: U36.1에서 피해량 43→45 버프, U37.1 DMR 너프 제외, U39.1 반동 조정
  { name: 'VSS',          type: 'DMR', damage: 45, rpm: 700,  magBase: 10, magExt: 20,  modes: 'Semi / 완전자동', caliber: '9mm',    dataFrom: 'Update 36.1', historyNote: 'U36.1: 피해량 43→45 버프 (U37.1 DMR 너프 제외) · U39.1: 수직 반동 10%, 수평 반동 5% 증가' },

  // ── 저격소총 (SR) ──
  { name: 'Lynx AMR',     type: 'SR',  damage: 118, rpm: 35,  magBase: 5,  magExt: null, modes: '볼트액션', caliber: '.50 BMG',    dataFrom: 'Update 28.1' },
  { name: 'AWM',          type: 'SR',  damage: 105, rpm: 50,  magBase: 5,  magExt: null, modes: '볼트액션', caliber: '.300 Mag',   dataFrom: 'Update 28.1' },
  { name: 'Crossbow',     type: 'SR',  damage: 105, rpm: 25,  magBase: 1,  magExt: null, modes: '단발',     caliber: '볼트',       dataFrom: 'Update 28.1' },
  { name: 'Kar98k',       type: 'SR',  damage: 79,  rpm: 47,  magBase: 5,  magExt: null, modes: '볼트액션', caliber: '7.62mm',     dataFrom: 'Update 28.1' },
  { name: 'Mosin-Nagant', type: 'SR',  damage: 79,  rpm: 50,  magBase: 5,  magExt: null, modes: '볼트액션', caliber: '7.62mm',     dataFrom: 'Update 28.1', deletePending: true, deletePendingNote: 'Update 42.1(2026년 6월)에서 삭제 예정' },
  { name: 'M24',          type: 'SR',  damage: 75,  rpm: 67,  magBase: 5,  magExt: null, modes: '볼트액션', caliber: '7.62mm',     dataFrom: 'Update 28.1' },
  { name: 'Win94',        type: 'SR',  damage: 66,  rpm: 55,  magBase: 8,  magExt: null, modes: '레버액션', caliber: '.45 ACP',    dataFrom: 'Update 28.1' },

  // ── 기관단총 (SMG) ──
  { name: 'UMP45',        type: 'SMG', damage: 41, rpm: 600,  magBase: 25, magExt: 35,  modes: '완전자동', caliber: '.45 ACP', dataFrom: 'Update 28.1' },
  { name: 'Tommy Gun',    type: 'SMG', damage: 40, rpm: 750,  magBase: 30, magExt: 50,  modes: '완전자동', caliber: '.45 ACP', dataFrom: 'Update 28.1' },
  { name: 'PP-19 Bizon',  type: 'SMG', damage: 36, rpm: 800,  magBase: 53, magExt: null, modes: '완전자동', caliber: '9mm',     dataFrom: 'Update 28.1', deletePending: true, deletePendingNote: 'Update 42.1(2026년 6월)에서 삭제 예정' },
  { name: 'P90',          type: 'SMG', damage: 35, rpm: 900,  magBase: 40, magExt: 50,  modes: '완전자동', caliber: '5.7mm',   dataFrom: 'Update 28.1' },
  // MP5K: U38.1에서 피해량 34→32 너프
  { name: 'MP5K',         type: 'SMG', damage: 32, rpm: 900,  magBase: 20, magExt: 30,  modes: '완전자동', caliber: '9mm',     dataFrom: 'Update 38.1', historyNote: 'U38.1: 피해량 34→32 너프' },
  { name: 'MP9',          type: 'SMG', damage: 31, rpm: 1100, magBase: 20, magExt: 30,  modes: '완전자동', caliber: '9mm',     dataFrom: 'Update 28.1' },
  { name: 'Vector',       type: 'SMG', damage: 31, rpm: 1200, magBase: 13, magExt: 33,  modes: '완전자동', caliber: '.45 ACP', dataFrom: 'Update 28.1' },
  { name: 'Micro UZI',    type: 'SMG', damage: 26, rpm: 1200, magBase: 25, magExt: 35,  modes: '완전자동', caliber: '9mm',     dataFrom: 'Update 28.1' },

  // ── 경기관총 (LMG) ──
  { name: 'DP-28',        type: 'LMG', damage: 52, rpm: 550,  magBase: 47, magExt: null, modes: '완전자동',          caliber: '7.62mm', dataFrom: 'Update 28.1', deletePending: true, deletePendingNote: 'Update 42.1(2026년 6월)에서 삭제 예정' },
  { name: 'MG3',          type: 'LMG', damage: 42, rpm: 660,  magBase: 75, magExt: null, modes: '완전자동 (660/990)', caliber: '7.62mm', dataFrom: 'Update 28.1' },
  { name: 'M249',         type: 'LMG', damage: 41, rpm: 750,  magBase: 75, magExt: 100,  modes: '완전자동',          caliber: '5.56mm', dataFrom: 'Update 28.1' },

  // ── 산탄총 (SGN) — 데미지는 발당 ──
  { name: 'O12',          type: 'SGN', damage: 26, rpm: 180, magBase: 5,  magExt: null, modes: '반자동',     caliber: '12게이지 ×12발', dataFrom: 'Update 28.1' },
  { name: 'DBS',          type: 'SGN', damage: 26, rpm: 90,  magBase: 14, magExt: null, modes: '펌프/반자동', caliber: '12게이지 ×9발',  dataFrom: 'Update 28.1' },
  { name: 'S1897',        type: 'SGN', damage: 26, rpm: 90,  magBase: 5,  magExt: null, modes: '펌프액션',   caliber: '12게이지 ×9발',  dataFrom: 'Update 28.1' },
  { name: 'S686',         type: 'SGN', damage: 26, rpm: 150, magBase: 2,  magExt: null, modes: '이중 총신',  caliber: '12게이지 ×9발',  dataFrom: 'Update 28.1' },
  { name: 'S12K',         type: 'SGN', damage: 24, rpm: 200, magBase: 5,  magExt: 8,   modes: '반자동',     caliber: '12게이지 ×9발',  dataFrom: 'Update 28.1' },
  { name: 'Sawed-Off',    type: 'SGN', damage: 21, rpm: 150, magBase: 2,  magExt: null, modes: '이중 총신',  caliber: '12게이지 ×9발',  dataFrom: 'Update 28.1' },

  // ── 권총 (PST) ──
  { name: 'R45',          type: 'PST', damage: 65, rpm: 180,  magBase: 6,  magExt: null, modes: '단발',     caliber: '.45 ACP',   dataFrom: 'Update 28.1', deletePending: true, deletePendingNote: 'Update 42.1(2026년 6월)에서 삭제 예정' },
  { name: 'R1895',        type: 'PST', damage: 64, rpm: 150,  magBase: 7,  magExt: null, modes: '단발',     caliber: '7.62mm',    dataFrom: 'Update 28.1' },
  { name: 'Desert Eagle', type: 'PST', damage: 62, rpm: 300,  magBase: 7,  magExt: null, modes: '단발',     caliber: '.357 Mag',  dataFrom: 'Update 28.1' },
  { name: 'P1911',        type: 'PST', damage: 42, rpm: 450,  magBase: 7,  magExt: 13,  modes: '단발',     caliber: '.45 ACP',   dataFrom: 'Update 28.1', deletePending: true, deletePendingNote: 'Update 42.1(2026년 6월)에서 삭제 예정' },
  { name: 'P92',          type: 'PST', damage: 34, rpm: 450,  magBase: 15, magExt: 20,  modes: '단발',     caliber: '9mm',       dataFrom: 'Update 28.1' },
  { name: 'P18C',         type: 'PST', damage: 23, rpm: 1100, magBase: 17, magExt: 25,  modes: '완전자동', caliber: '9mm',       dataFrom: 'Update 28.1' },
  { name: 'Skorpion',     type: 'PST', damage: 22, rpm: 1100, magBase: 20, magExt: 35,  modes: '완전자동', caliber: '.32 ACP',   dataFrom: 'Update 28.1' },
];

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
const HEAD_MULT   = 2.1;                       // 헤드샷 기본 배율
const ARMOR_LABELS = ['없음', 'Lv.1', 'Lv.2', 'Lv.3'];

function calcBodyDmg(base, armorLv)  { return Math.round(base * ARMOR_MULT[armorLv]); }
function calcHeadDmg(base, helmLv)   { return Math.round(base * HEAD_MULT * HELMET_MULT[helmLv]); }
function calcSTK(hp, dmg)            { return dmg <= 0 ? '∞' : Math.ceil(hp / dmg); }

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span className="text-gray-600 ml-1">↕</span>;
  return <span className="text-blue-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

function Tooltip({ text, children }) {
  return (
    <span className="relative group/tip inline-flex items-center">
      {children}
      <span className="pointer-events-none absolute bottom-full left-0 mb-2 w-80 max-w-xs px-3 py-2 bg-gray-800 border border-gray-600 rounded-xl text-xs text-gray-200 leading-relaxed opacity-0 group-hover/tip:opacity-100 transition-opacity z-50 shadow-xl whitespace-normal text-left">
        {text}
        <span className="absolute top-full left-4 border-4 border-transparent border-t-gray-700" />
      </span>
    </span>
  );
}

function ArmorSelector({ label, value, onChange, color }) {
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
      {value > 0 && (
        <span className="text-xs text-gray-500">
          데미지 ×{ARMOR_MULT[value]} ({Math.round((1 - ARMOR_MULT[value]) * 100)}% 감소)
        </span>
      )}
    </div>
  );
}

// ─── 패치 노트 이력 ──────────────────────────────────────
const PATCH_NOTES = [
  {
    version: 'Update 41.1',
    date: '2026.04',
    isLatest: true,
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
        <title>무기 데미지 표 | PKGG</title>
        <meta name="description" content="PUBG 무기별 기본 데미지, 연사속도, 탄창 수치 비교표. 최신 패치 기준으로 업데이트됩니다." />
        <meta property="og:image" content="https://pk.gg/og.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://pk.gg/og.png" />
      </Head>
      <Header />

      <div className="min-h-screen bg-neutral-950 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">

          {/* 헤더 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-1">🔫 무기 데미지 표</h1>
            <p className="text-gray-400 text-sm">기본 데미지 · 연사속도 · 탄창 · DPS 비교 (방어구 미착용 기준)</p>
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
            <span className="px-3 py-1.5 bg-red-950/50 border border-red-800/50 rounded-full text-xs text-red-400 font-semibold">
              🗑️ 삭제 예정 {deletePendingCount}종 (42.1 · 2026년 6월)
            </span>
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

          {/* 방어구 / 헬멧 선택 */}
          <div className="bg-gray-900 border border-gray-700/50 rounded-2xl px-5 py-4 mb-4 flex flex-col gap-3">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">방어구 시뮬레이터</div>
            <ArmorSelector label="🛡️ 방어구" value={armorLevel} onChange={setArmorLevel} color="text-blue-400" />
            <ArmorSelector label="⛑️ 헬멧" value={helmetLevel} onChange={setHelmetLevel} color="text-purple-400" />
          </div>

          {/* 테이블 */}
          <div className="bg-gray-900 rounded-2xl border border-gray-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  {/* 그룹 헤더 */}
                  <tr className="bg-gray-800/40 border-b border-gray-700/50">
                    {compareMode && <th className="px-3 py-1 w-10" />}
                    <th colSpan={2} className="px-4 py-1" />
                    <th colSpan={3} className="px-4 py-1 text-center text-xs text-gray-500 font-medium border-l border-gray-700/50">기본</th>
                    <th colSpan={2} className="px-4 py-1 text-center text-xs text-blue-400 font-semibold border-l border-gray-700/50">
                      🛡️ 몸통 (방어구 {ARMOR_LABELS[armorLevel]})
                    </th>
                    <th colSpan={2} className="px-4 py-1 text-center text-xs text-purple-400 font-semibold border-l border-gray-700/50">
                      ⛑️ 헤드 (헬멧 {ARMOR_LABELS[helmetLevel]})
                    </th>
                    <th colSpan={2} className="px-4 py-1 hidden md:table-cell" />
                  </tr>
                  <tr className="border-b border-gray-700 bg-gray-800/60">
                    {compareMode && <th className="px-3 py-2.5 w-10" />}
                    <th className="text-left px-4 py-2.5 text-gray-400 font-semibold w-36">무기명</th>
                    <th className="text-left px-3 py-2.5 text-gray-400 font-semibold">분류</th>
                    {/* 기본 */}
                    <th
                      className="text-right px-4 py-2.5 text-gray-400 font-semibold cursor-pointer hover:text-white select-none border-l border-gray-700/50"
                      onClick={() => handleSort('damage')}
                    >
                      데미지<SortIcon col="damage" sortCol={sortCol} sortDir={sortDir} />
                    </th>
                    <th
                      className="text-right px-4 py-2.5 text-gray-400 font-semibold cursor-pointer hover:text-white select-none"
                      onClick={() => handleSort('rpm')}
                    >
                      <Tooltip text="분당 발사 수 (Rounds Per Minute) — 숫자가 높을수록 연사 속도가 빠릅니다.">
                        RPM
                      </Tooltip>
                      <SortIcon col="rpm" sortCol={sortCol} sortDir={sortDir} />
                    </th>
                    <th className="text-right px-4 py-2.5 text-gray-400 font-semibold">
                      <Tooltip text="초당 데미지 (Damage Per Second) = 데미지 × RPM ÷ 60. 반동·이동·재장전은 미적용된 이론 최대값입니다.">
                        DPS
                      </Tooltip>
                    </th>
                    {/* 몸통 */}
                    <th className="text-right px-4 py-2.5 text-blue-400/80 font-semibold border-l border-gray-700/50">데미지</th>
                    <th className="text-right px-4 py-2.5 text-blue-400/80 font-semibold">킬샷</th>
                    {/* 헤드 */}
                    <th className="text-right px-4 py-2.5 text-purple-400/80 font-semibold border-l border-gray-700/50">데미지</th>
                    <th className="text-right px-4 py-2.5 text-purple-400/80 font-semibold">킬샷</th>
                    {/* 기타 */}
                    <th className="text-right px-4 py-2.5 text-gray-400 font-semibold hidden md:table-cell border-l border-gray-700/50">탄창</th>
                    <th className="text-left px-4 py-2.5 text-gray-400 font-semibold hidden xl:table-cell">연사방식</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((w, i) => {
                    const dps      = Math.round((w.damage * w.rpm) / 60);
                    const bodyDmg  = calcBodyDmg(w.damage, armorLevel);
                    const headDmg  = calcHeadDmg(w.damage, helmetLevel);
                    const bodySTK  = calcSTK(100, bodyDmg);
                    const headSTK  = calcSTK(100, headDmg);
                    const badge    = TYPE_BADGE[w.type] || TYPE_BADGE.AR;

                    // 킬샷 수 색상 (낮을수록 위험)
                    const stkColor = (n) =>
                      n === 1 ? 'text-red-400 font-bold' :
                      n === 2 ? 'text-orange-400 font-bold' :
                      n <= 4  ? 'text-yellow-400' : 'text-gray-300';

                    return (
                      <tr
                        key={w.name}
                        className={`border-b border-gray-800/80 transition-colors ${
                          compareSet.has(w.name)
                            ? 'bg-emerald-950/20 hover:bg-emerald-950/30'
                            : w.deletePending
                            ? 'bg-red-950/10 hover:bg-red-950/20'
                            : w.changed
                            ? 'bg-yellow-950/20 hover:bg-yellow-950/30'
                            : i % 2 === 0
                            ? 'hover:bg-gray-800/40'
                            : 'bg-gray-900/40 hover:bg-gray-800/40'
                        }`}
                      >
                        {/* 비교 체크박스 */}
                        {compareMode && (
                          <td className="px-3 py-2.5 text-center">
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
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-semibold text-sm ${w.deletePending ? 'text-gray-400 line-through decoration-red-500' : 'text-white'}`}>
                              {w.name}
                            </span>
                            {w.deletePending && (
                              <Tooltip text={w.deletePendingNote || 'Update 42.1(2026년 6월)에서 삭제 예정'}>
                                <span className="px-1.5 py-0.5 bg-red-500/20 border border-red-500/40 rounded text-red-400 text-xs font-bold flex-shrink-0 cursor-help">
                                  🗑️
                                </span>
                              </Tooltip>
                            )}
                            {w.changed && (
                              <Tooltip text={`${LATEST_PATCH}: ${w.changeNote || ''}`}>
                                <span className="px-1.5 py-0.5 bg-yellow-500/20 border border-yellow-500/40 rounded text-yellow-400 text-xs font-bold flex-shrink-0 cursor-help">
                                  ⚡
                                </span>
                              </Tooltip>
                            )}
                            {w.historyNote && (
                              <Tooltip text={w.historyNote}>
                                <span className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded text-blue-400/60 text-xs flex-shrink-0 cursor-help select-none">
                                  ℹ
                                </span>
                              </Tooltip>
                            )}
                          </div>
                        </td>

                        {/* 분류 */}
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                            {w.type}
                          </span>
                        </td>

                        {/* 기본 데미지 */}
                        <td className="px-4 py-2.5 text-right border-l border-gray-700/30">
                          <span className="font-bold text-white">{w.damage}</span>
                          {w.type === 'SGN' && <span className="text-gray-600 text-xs ml-0.5">/발</span>}
                        </td>

                        {/* RPM */}
                        <td className="px-4 py-2.5 text-right text-gray-400 text-sm">{w.rpm.toLocaleString()}</td>

                        {/* DPS */}
                        <td className="px-4 py-2.5 text-right">
                          <span className={`text-sm font-semibold ${
                            dps >= 600 ? 'text-red-400' :
                            dps >= 400 ? 'text-orange-400' :
                            dps >= 250 ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>{dps.toLocaleString()}</span>
                        </td>

                        {/* 몸통 실효 데미지 */}
                        <td className="px-4 py-2.5 text-right border-l border-gray-700/30">
                          <span className={`font-semibold ${armorLevel > 0 ? 'text-blue-300' : 'text-white'}`}>
                            {bodyDmg}
                          </span>
                          {armorLevel > 0 && (
                            <span className="text-gray-600 text-xs ml-1">
                              ({w.damage})
                            </span>
                          )}
                        </td>

                        {/* 몸통 킬샷 */}
                        <td className="px-4 py-2.5 text-right">
                          <span className={`text-lg font-bold ${stkColor(bodySTK)}`}>{bodySTK}</span>
                          <span className="text-gray-600 text-xs ml-0.5">발</span>
                        </td>

                        {/* 헤드 실효 데미지 */}
                        <td className="px-4 py-2.5 text-right border-l border-gray-700/30">
                          <span className={`font-semibold ${helmetLevel > 0 ? 'text-purple-300' : 'text-white'}`}>
                            {headDmg}
                          </span>
                        </td>

                        {/* 헤드 킬샷 */}
                        <td className="px-4 py-2.5 text-right">
                          <span className={`text-lg font-bold ${stkColor(headSTK)}`}>{headSTK}</span>
                          <span className="text-gray-600 text-xs ml-0.5">발</span>
                        </td>

                        {/* 탄창 */}
                        <td className="px-4 py-2.5 text-right text-gray-400 text-sm hidden md:table-cell border-l border-gray-700/30">
                          {w.magBase}
                          {w.magExt && <span className="text-gray-600"> / {w.magExt}</span>}
                        </td>

                        {/* 연사방식 */}
                        <td className="px-4 py-2.5 text-gray-500 text-xs hidden xl:table-cell">{w.modes}</td>
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
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
                <span>• 킬샷: <span className="text-red-400">1발</span> / <span className="text-orange-400">2발</span> / <span className="text-yellow-400">3~4발</span> 색상 구분</span>
                <span>• 헤드샷 배율: ×{HEAD_MULT} (헬멧 없음 기준)</span>
                <span>• 방어구 감소율: Lv.1 30% · Lv.2 40% · Lv.3 55%</span>
                <span>• 산탄총: 펠릿 1발 기준 (탄약란에 발수 표기)</span>
                <span>• DPS = (데미지 × RPM) ÷ 60 / 이동·반동 미적용</span>
                <span className="text-yellow-500">• ⚡: {LATEST_PATCH} 패치 변경 항목 (마우스 올리면 상세 확인)</span>
                <span className="text-blue-400/60">• ℹ: 이전 패치 이력 (마우스 올리면 확인)</span>
                <span className="text-red-400/70">• 🗑️: Update 42.1(2026년 6월) 삭제 예정 총기 (마우스 올리면 확인)</span>
              </div>
            </div>
          </div>

          {/* ── 무기 비교 패널 ── */}
          {compareMode && compareWeapons.length >= 2 && (() => {
            const maxDmg = Math.max(...compareWeapons.map((w) => w.damage));
            const maxRpm = Math.max(...compareWeapons.map((w) => w.rpm));
            const maxDps = Math.max(...compareWeapons.map((w) => Math.round((w.damage * w.rpm) / 60)));
            const maxBody = Math.max(...compareWeapons.map((w) => calcBodyDmg(w.damage, armorLevel)));
            const maxHead = Math.max(...compareWeapons.map((w) => calcHeadDmg(w.damage, helmetLevel)));

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
                    <StatRow label="연사속도 (RPM)" values={compareWeapons.map((w) => w.rpm)} maxV={maxRpm} />
                    <StatRow label="DPS (이론값)" values={compareWeapons.map((w) => Math.round((w.damage * w.rpm) / 60))} maxV={maxDps} />
                  </div>
                  <div>
                    <StatRow label={`몸통 데미지 (방어구 ${ARMOR_LABELS[armorLevel]})`} values={compareWeapons.map((w) => calcBodyDmg(w.damage, armorLevel))} maxV={maxBody} />
                    <StatRow label={`헤드 데미지 (헬멧 ${ARMOR_LABELS[helmetLevel]})`} values={compareWeapons.map((w) => calcHeadDmg(w.damage, helmetLevel))} maxV={maxHead} />
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
