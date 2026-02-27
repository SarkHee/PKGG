// pages/weapon-damage.js
import { useState, useMemo } from 'react';
import Head from 'next/head';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

// ─── 최신 패치 기준 정보 ─────────────────────────────────
const LATEST_PATCH = 'Update 40.1';
const LATEST_PATCH_DATE = '2026.02.04 PC 적용';
const DATA_SOURCE = 'battlegrounds.party 기반';

// ─── 무기 데이터 ────────────────────────────────────────
// changed: true → 최신 패치에서 변경된 항목 (강조 표시)
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
  { name: 'AUG A3',       type: 'AR',  damage: 41, rpm: 730,  magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '5.56mm', dataFrom: 'Update 28.1' },
  { name: 'G36C',         type: 'AR',  damage: 41, rpm: 730,  magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '5.56mm', dataFrom: 'Update 28.1' },
  { name: 'K2',           type: 'AR',  damage: 41, rpm: 720,  magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '5.56mm', dataFrom: 'Update 32.1' },
  { name: 'M416',         type: 'AR',  damage: 40, rpm: 800,  magBase: 30, magExt: 40,  modes: '완전자동',      caliber: '5.56mm', dataFrom: 'Update 28.1' },
  { name: 'FAMAS',        type: 'AR',  damage: 39, rpm: 900,  magBase: 25, magExt: 30,  modes: '3점사',         caliber: '5.56mm', dataFrom: 'Update 28.1' },

  // ── 지정사수소총 (DMR) ──
  { name: 'Mk14 EBR',     type: 'DMR', damage: 61, rpm: 450,  magBase: 10, magExt: 20,  modes: 'Semi / 완전자동', caliber: '7.62mm', dataFrom: 'Update 28.1' },
  { name: 'SLR',          type: 'DMR', damage: 56, rpm: 400,  magBase: 10, magExt: 20,  modes: '반자동',         caliber: '7.62mm', dataFrom: 'Update 40.1', changed: true, changeNote: '수평 반동 약 4% 감소' },
  { name: 'SKS',          type: 'DMR', damage: 53, rpm: 400,  magBase: 10, magExt: 20,  modes: '반자동',         caliber: '7.62mm', dataFrom: 'Update 28.1' },
  { name: 'Mini14',       type: 'DMR', damage: 48, rpm: 600,  magBase: 20, magExt: 30,  modes: '반자동',         caliber: '5.56mm', dataFrom: 'Update 28.1' },
  { name: 'QBU',          type: 'DMR', damage: 48, rpm: 600,  magBase: 10, magExt: 20,  modes: '반자동',         caliber: '5.56mm', dataFrom: 'Update 28.1' },
  { name: 'Mk12',         type: 'DMR', damage: 43, rpm: 600,  magBase: 20, magExt: 30,  modes: '반자동',         caliber: '5.56mm', dataFrom: 'Update 40.1', changed: true, changeNote: '데미지 44 → 43 너프, 수평 반동 약 8% 증가' },
  { name: 'VSS',          type: 'DMR', damage: 43, rpm: 700,  magBase: 10, magExt: 20,  modes: 'Semi / 완전자동', caliber: '9mm',    dataFrom: 'Update 28.1' },

  // ── 저격소총 (SR) ──
  { name: 'Lynx AMR',     type: 'SR',  damage: 118, rpm: 35,  magBase: 5,  magExt: null, modes: '볼트액션', caliber: '.50 BMG',    dataFrom: 'Update 28.1' },
  { name: 'AWM',          type: 'SR',  damage: 105, rpm: 50,  magBase: 5,  magExt: null, modes: '볼트액션', caliber: '.300 Mag',   dataFrom: 'Update 28.1' },
  { name: 'Crossbow',     type: 'SR',  damage: 105, rpm: 25,  magBase: 1,  magExt: null, modes: '단발',     caliber: '볼트',       dataFrom: 'Update 28.1' },
  { name: 'Kar98k',       type: 'SR',  damage: 79,  rpm: 47,  magBase: 5,  magExt: null, modes: '볼트액션', caliber: '7.62mm',     dataFrom: 'Update 28.1' },
  { name: 'Mosin-Nagant', type: 'SR',  damage: 79,  rpm: 50,  magBase: 5,  magExt: null, modes: '볼트액션', caliber: '7.62mm',     dataFrom: 'Update 28.1' },
  { name: 'M24',          type: 'SR',  damage: 75,  rpm: 67,  magBase: 5,  magExt: null, modes: '볼트액션', caliber: '7.62mm',     dataFrom: 'Update 28.1' },
  { name: 'Win94',        type: 'SR',  damage: 66,  rpm: 55,  magBase: 8,  magExt: null, modes: '레버액션', caliber: '.45 ACP',    dataFrom: 'Update 28.1' },

  // ── 기관단총 (SMG) ──
  { name: 'UMP45',        type: 'SMG', damage: 41, rpm: 600,  magBase: 25, magExt: 35,  modes: '완전자동', caliber: '.45 ACP', dataFrom: 'Update 28.1' },
  { name: 'Tommy Gun',    type: 'SMG', damage: 40, rpm: 750,  magBase: 30, magExt: 50,  modes: '완전자동', caliber: '.45 ACP', dataFrom: 'Update 28.1' },
  { name: 'PP-19 Bizon',  type: 'SMG', damage: 36, rpm: 800,  magBase: 53, magExt: null, modes: '완전자동', caliber: '9mm',     dataFrom: 'Update 28.1' },
  { name: 'P90',          type: 'SMG', damage: 35, rpm: 900,  magBase: 40, magExt: 50,  modes: '완전자동', caliber: '5.7mm',   dataFrom: 'Update 28.1' },
  { name: 'MP5K',         type: 'SMG', damage: 33, rpm: 900,  magBase: 20, magExt: 30,  modes: '완전자동', caliber: '9mm',     dataFrom: 'Update 28.1' },
  { name: 'MP9',          type: 'SMG', damage: 31, rpm: 1100, magBase: 20, magExt: 30,  modes: '완전자동', caliber: '9mm',     dataFrom: 'Update 28.1' },
  { name: 'Vector',       type: 'SMG', damage: 31, rpm: 1200, magBase: 13, magExt: 33,  modes: '완전자동', caliber: '.45 ACP', dataFrom: 'Update 28.1' },
  { name: 'Micro UZI',    type: 'SMG', damage: 26, rpm: 1200, magBase: 25, magExt: 35,  modes: '완전자동', caliber: '9mm',     dataFrom: 'Update 28.1' },

  // ── 경기관총 (LMG) ──
  { name: 'DP-28',        type: 'LMG', damage: 52, rpm: 550,  magBase: 47, magExt: null, modes: '완전자동',       caliber: '7.62mm', dataFrom: 'Update 28.1' },
  { name: 'MG3',          type: 'LMG', damage: 42, rpm: 660,  magBase: 75, magExt: null, modes: '완전자동 (660/990)', caliber: '7.62mm', dataFrom: 'Update 28.1' },
  { name: 'M249',         type: 'LMG', damage: 41, rpm: 750,  magBase: 75, magExt: 100, modes: '완전자동',       caliber: '5.56mm', dataFrom: 'Update 28.1' },

  // ── 산탄총 (SGN) — 데미지는 발당 ──
  { name: 'O12',          type: 'SGN', damage: 26, rpm: 180, magBase: 5,  magExt: null, modes: '반자동', caliber: '12게이지 ×12발', dataFrom: 'Update 28.1' },
  { name: 'DBS',          type: 'SGN', damage: 26, rpm: 90,  magBase: 14, magExt: null, modes: '펌프/반자동', caliber: '12게이지 ×9발',  dataFrom: 'Update 28.1' },
  { name: 'S1897',        type: 'SGN', damage: 26, rpm: 90,  magBase: 5,  magExt: null, modes: '펌프액션', caliber: '12게이지 ×9발',  dataFrom: 'Update 28.1' },
  { name: 'S686',         type: 'SGN', damage: 26, rpm: 150, magBase: 2,  magExt: null, modes: '이중 총신', caliber: '12게이지 ×9발', dataFrom: 'Update 28.1' },
  { name: 'S12K',         type: 'SGN', damage: 24, rpm: 200, magBase: 5,  magExt: 8,   modes: '반자동', caliber: '12게이지 ×9발',  dataFrom: 'Update 28.1' },
  { name: 'Sawed-Off',    type: 'SGN', damage: 21, rpm: 150, magBase: 2,  magExt: null, modes: '이중 총신', caliber: '12게이지 ×9발', dataFrom: 'Update 28.1' },

  // ── 권총 (PST) ──
  { name: 'R45',          type: 'PST', damage: 65, rpm: 180,  magBase: 6,  magExt: null, modes: '단발', caliber: '.45 ACP',    dataFrom: 'Update 28.1' },
  { name: 'R1895',        type: 'PST', damage: 64, rpm: 150,  magBase: 7,  magExt: null, modes: '단발', caliber: '7.62mm',     dataFrom: 'Update 28.1' },
  { name: 'Desert Eagle', type: 'PST', damage: 62, rpm: 300,  magBase: 7,  magExt: null, modes: '단발', caliber: '.357 Mag',   dataFrom: 'Update 28.1' },
  { name: 'P1911',        type: 'PST', damage: 42, rpm: 450,  magBase: 7,  magExt: 13,  modes: '단발', caliber: '.45 ACP',    dataFrom: 'Update 28.1' },
  { name: 'P92',          type: 'PST', damage: 34, rpm: 450,  magBase: 15, magExt: 20,  modes: '단발', caliber: '9mm',        dataFrom: 'Update 28.1' },
  { name: 'P18C',         type: 'PST', damage: 23, rpm: 1100, magBase: 17, magExt: 25,  modes: '완전자동', caliber: '9mm',    dataFrom: 'Update 28.1' },
  { name: 'Skorpion',     type: 'PST', damage: 22, rpm: 1100, magBase: 20, magExt: 35,  modes: '완전자동', caliber: '.32 ACP', dataFrom: 'Update 28.1' },
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
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 bg-gray-800 border border-gray-600 rounded-xl text-xs text-gray-200 leading-relaxed opacity-0 group-hover/tip:opacity-100 transition-opacity z-50 shadow-xl whitespace-normal text-left">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-700" />
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

export default function WeaponDamage() {
  const [activeType, setActiveType] = useState('ALL');
  const [sortCol, setSortCol] = useState('damage');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [armorLevel, setArmorLevel] = useState(0);
  const [helmetLevel, setHelmetLevel] = useState(0);

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

  return (
    <>
      <Head>
        <title>무기 데미지 표 | PK.GG</title>
        <meta name="description" content="PUBG 무기별 기본 데미지, 연사속도, 탄창 수치 비교표. 최신 패치 기준으로 업데이트됩니다." />
      </Head>
      <Header />

      <div className="min-h-screen bg-gray-950 text-white">
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
              📊 {DATA_SOURCE}
            </span>
            {changedCount > 0 && (
              <span className="px-3 py-1.5 bg-yellow-900/50 border border-yellow-700/50 rounded-full text-xs text-yellow-300 font-semibold">
                ⚡ 이번 패치 변경 {changedCount}건
              </span>
            )}
          </div>

          {/* 검색 */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="무기명 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-sm px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
                          w.changed
                            ? 'bg-yellow-950/20 hover:bg-yellow-950/30'
                            : i % 2 === 0
                            ? 'hover:bg-gray-800/40'
                            : 'bg-gray-900/40 hover:bg-gray-800/40'
                        }`}
                      >
                        {/* 무기명 */}
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">{w.name}</span>
                            {w.changed && (
                              <span className="px-1.5 py-0.5 bg-yellow-500/20 border border-yellow-500/40 rounded text-yellow-400 text-xs font-bold flex-shrink-0">
                                ⚡
                              </span>
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
                <span className="text-yellow-500">• ⚡: {LATEST_PATCH} 패치 변경 항목</span>
              </div>
            </div>
          </div>

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

          {/* 출처 */}
          <p className="mt-4 text-xs text-gray-600 text-center">
            데이터 출처: battlegrounds.party · PUBG 공식 패치노트 (pubg.com)
          </p>

        </div>
      </div>

      <Footer />
    </>
  );
}
