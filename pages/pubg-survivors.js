import { useEffect, useRef, useState, useCallback } from 'react';
import Head from 'next/head';
import Header from '../components/layout/Header';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const CW = 1060, CH = 700;
const WW = 2000, WH = 2000;
const MAX_TIME = 20 * 60;
const XP_ATTRACT_BASE = 80;
const MAX_WEAPON_LEVEL = 5;
const AIRDROP_INTERVAL_MIN = 50 * 60; // 50초
const AIRDROP_INTERVAL_MAX = 80 * 60; // 80초
const AIRDROP_COLLECT_R = 42;
const AIRDROP_EXPIRE = 120 * 60;      // 2분

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b));
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const dist = (a, b) => Math.sqrt(dist2(a, b));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, tk) => a + (b - a) * tk;

// ── 최적화: 공간 분할 그리드 (총알-적 충돌 O(n²) → O(n)) ──
const GRID_CELL = 80;
const _enemyGrid = new Map(); // 매 프레임 재사용

// ── Characters ───────────────────────────────────────────────
const CHARS = {
  operator:  {
    name:'Operator',  title:'오퍼레이터', weapon:'m416',
    desc:'균형잡힌 밀리터리 전투원',
    passive:'AR 탄 퍼짐 -15% · 재장전 속도 +20%',
    startHp:150, startSpd:3.0, dmgMult:1.0,
    color:'#4a7a3a', helmetC:'#2a4a2a', accentC:'#88cc66',
    icon:'⚔️', weakDesc:'특화 없음',
  },
  berserker: {
    name:'Berserker', title:'버서커',     weapon:'akm',
    desc:'분노로 강해지는 광전사',
    passive:'공격력 +25% · HP 50% 이하 시 추가 +50%',
    startHp:130, startSpd:3.2, dmgMult:1.25,
    color:'#8a2a1a', helmetC:'#5a1010', accentC:'#e05030',
    icon:'🔥', weakDesc:'체력 불안정',
  },
  runner:    {
    name:'Runner',    title:'러너',       weapon:'ump',
    desc:'초고속 기동 전문 전투원',
    passive:'이동속도 +25% · XP 흡수 범위 +50%',
    startHp:110, startSpd:3.8, dmgMult:0.9,
    color:'#1a3a8a', helmetC:'#0a2050', accentC:'#4060e0',
    icon:'⚡', weakDesc:'체력 낮음',
  },
  marksman:  {
    name:'Marksman',  title:'마크스맨',   weapon:'dp28',
    desc:'정밀 사격으로 적을 제압',
    passive:'크리티컬 확률 +20% · 사거리 +15%',
    startHp:140, startSpd:2.8, dmgMult:1.1,
    color:'#6a4a1a', helmetC:'#3a2810', accentC:'#c09040',
    icon:'🎯', weakDesc:'기동력 낮음',
  },
  sniper:    {
    name:'Sniper',    title:'스나이퍼',   weapon:'kar98',
    desc:'장거리 저격 절대 전문가',
    passive:'저격 피해 +100% · 관통 효과',
    startHp:120, startSpd:2.5, dmgMult:1.15,
    color:'#1a3a4a', helmetC:'#0a2030', accentC:'#3090c0',
    icon:'🔭', weakDesc:'이동 느림',
  },
  breacher:  {
    name:'Breacher',  title:'브리처',     weapon:'s686',
    desc:'근접 돌파 전문 전투원',
    passive:'샷건 피해 +40% · 최대 HP +30',
    startHp:180, startSpd:2.6, dmgMult:1.2,
    color:'#6a1a6a', helmetC:'#4a0a4a', accentC:'#b040b0',
    icon:'💣', weakDesc:'사거리 짧음',
  },
  ghost:     {
    name:'Ghost',     title:'고스트',     weapon:'xbow',
    desc:'독과 암살로 조용히 처리',
    passive:'독 지속 2배 · 독 피해 2배',
    startHp:100, startSpd:3.3, dmgMult:1.15,
    color:'#1a3a3a', helmetC:'#0a2020', accentC:'#40c0b0',
    icon:'👻', weakDesc:'체력 낮음',
  },
  gunner:    {
    name:'Gunner',    title:'건너',       weapon:'dp28',
    desc:'지속 화력으로 적을 제압',
    passive:'연사속도 +30% · 발사체 +1개',
    startHp:160, startSpd:2.4, dmgMult:1.1,
    color:'#4a4a10', helmetC:'#2a2a08', accentC:'#a0a030',
    icon:'🏰', weakDesc:'이동 느림',
  },
};

// ── Weapons ─────────────────────────────────────────────────────
const WDEFS = {
  m416:  { name:'M416',    icon:'🔫', dmg:22,  rof:130,  range:340, spread:0.15, spd:13, proj:1, color:'#b0b0b0', desc:'균형잡힌 돌격소총' },
  akm:   { name:'AKM',     icon:'🔫', dmg:48,  rof:270,  range:285, spread:0.26, spd:11, proj:1, color:'#a07040', desc:'고화력 돌격소총' },
  kar98: { name:'Kar98k',  icon:'🎯', dmg:100, rof:1700, range:520, spread:0.04, spd:16, proj:1, color:'#806040', desc:'볼트액션 저격총', pierce:true },
  ump:   { name:'UMP45',   icon:'🔫', dmg:35,  rof:165,  range:200, spread:0.30, spd:10, proj:1, color:'#808080', desc:'소음 기관단총' },
  dp28:  { name:'DP-28',   icon:'🔫', dmg:52,  rof:215,  range:315, spread:0.20, spd:11, proj:1, color:'#607060', desc:'경기관총' },
  s686:  { name:'S686',    icon:'💥', dmg:22,  rof:900,  range:135, spread:0.45, spd:9,  proj:6, color:'#505050', desc:'더블배럴 샷건' },
  xbow:  { name:'석궁',    icon:'🏹', dmg:120, rof:1400, range:440, spread:0.02, spd:8,  proj:1, color:'#604020', desc:'조용하고 치명적', poison:true },
  pan:   { name:'프라이팬',icon:'🍳', dmg:90,  rof:700,  range:58,  spread:0,    spd:0,  proj:1, color:'#888888', desc:'근접 마지막 수단', melee:true },
  frag:  { name:'수류탄',  icon:'💣', dmg:110, rof:4000, range:320, spread:0.10, spd:5,  proj:1, color:'#40b040', desc:'4초마다 폭발 범위 피해', explosive:true, isGrenade:true },
};

// ── Airdrop Weapons (전설급) ─────────────────────────────────────
const AIRDROP_WEAPONS = {
  awm:   { name:'AWM',   icon:'☠️', dmg:250, rof:2400, range:650, spread:0.02, spd:20, proj:1, color:'#c0a0ff', desc:'전설의 원샷 저격총', pierce:true, legendary:true },
  groza: { name:'Groza', icon:'⚡', dmg:42,  rof:100,  range:310, spread:0.16, spd:14, proj:1, color:'#ff6040', desc:'최고급 돌격소총', legendary:true },
  mk14:  { name:'MK14',  icon:'🎯', dmg:80,  rof:380,  range:490, spread:0.05, spd:16, proj:1, color:'#80c0ff', desc:'전설 지정사수 소총', pierce:true, legendary:true },
  m249:  { name:'M249',  icon:'🔥', dmg:40,  rof:90,   range:330, spread:0.20, spd:13, proj:2, color:'#ffa040', desc:'전설 분대지원화기', legendary:true },
  p90:   { name:'P90',   icon:'🌀', dmg:32,  rof:110,  range:250, spread:0.18, spd:13, proj:1, color:'#60d0ff', desc:'전설 기관단총', legendary:true },
};

// ── Regular Attachments ─────────────────────────────────────────
const ADEFS = {
  comp:        { name:'보정기',        icon:'⚙️',  desc:'확산↓30% · 연사↑15%' },
  extMag:      { name:'확장탄창',      icon:'📦',  desc:'발사체 +1개' },
  scope8x:     { name:'8배율 조준경',  icon:'🔭',  desc:'사거리+200 · 피해+15%' },
  suppressor:  { name:'소음기',        icon:'🔇',  desc:'명중 시 독 효과 추가' },
  energyDrink: { name:'에너지 드링크', icon:'🧃',  desc:'이동속도+20% · HP재생' },
  vestLv3:     { name:'Lv3 방어구',    icon:'🛡️',  desc:'받는 피해 -40%' },
};

// ── Airdrop Special Items (사기급) ──────────────────────────────
const AIRDROP_ITEMS = {
  drumMag:    { name:'드럼 탄창',     icon:'🥁',  desc:'모든 무기 발사체 +2개', legendary:true },
  thermal:    { name:'열화상 조준경', icon:'🌡️',  desc:'사거리 +400 · 피해 +30%', legendary:true },
  ghillie:    { name:'길리 슈트',     icon:'🌿',  desc:'피해 감소 -30% · 스텔스 효과', legendary:true },
  adrenaline: { name:'아드레날린',    icon:'💉',  desc:'이동속도 +40% · HP재생 +8/s', legendary:true },
  bzArmor:    { name:'블루존 방어구', icon:'🔵',  desc:'블루존 피해 완전 무효', legendary:true },
};

// ── Regular Evolutions ─────────────────────────────────────────
const EVOS = {
  'm416+comp':      { name:'전술 M416',   icon:'⚡', desc:'십자 패턴 자동 사격', color:'#60c0ff' },
  'akm+extMag':     { name:'AKM 풀오토',  icon:'🔥', desc:'3점사 + 화염 피해',   color:'#ff8040' },
  'kar98+scope8x':  { name:'고스트 샷',   icon:'👻', desc:'초고속 관통탄',        color:'#c0a0ff' },
  'ump+suppressor': { name:'사일런트 스톰',icon:'🌪️', desc:'독구름 분열탄',        color:'#80ff80' },
  'dp28+comp':      { name:'터렛 모드',   icon:'🏰', desc:'360° 전방향 사격',     color:'#ffd700' },
  's686+extMag':    { name:'프래그 캐논', icon:'💣', desc:'폭발 산탄',            color:'#ff4040' },
  'xbow+scope8x':   { name:'정밀 사냥꾼', icon:'🦅', desc:'추적 화살',            color:'#40ffd0' },
};

// ── Airdrop Evolutions (전설급 조합) ─────────────────────────────
const AIRDROP_EVOS = {
  'awm+thermal':    { name:'레일건',       icon:'☄️',  desc:'맵 전체 관통 저격', color:'#ff00ff', legendary:true },
  'groza+drumMag':  { name:'폭풍 돌격',    icon:'🌪️',  desc:'6발 탄막 자동사격', color:'#ff6600', legendary:true },
  'mk14+thermal':   { name:'정밀 레이저',  icon:'🔴',  desc:'100% 크리티컬+관통', color:'#00ffff', legendary:true },
  'm249+drumMag':   { name:'화력 진압',    icon:'💥',  desc:'4발 탄막 무한 사격', color:'#ff4400', legendary:true },
  'p90+adrenaline': { name:'초음속 사격',  icon:'⚡',  desc:'이동+발사 동시 +50%', color:'#40ff80', legendary:true },
  'awm+ghillie':    { name:'팬텀 샷',      icon:'💀',  desc:'투명 상태 저격',     color:'#8800ff', legendary:true },
  's686+drumMag':   { name:'지옥의 문',    icon:'🌋',  desc:'8발 폭발 산탄',      color:'#ff2200', legendary:true },
};

// ── Enemy types ──────────────────────────────────────────────────
const ETYPES = {
  basic:    { hp:60,    spd:1.2,  dmg:8,   xp:10,  sz:13, col:'#8a3a2a', name:'무장 플레이어' },
  vested:   { hp:150,   spd:0.95, dmg:15,  xp:25,  sz:16, col:'#2a508a', name:'방탄조끼 착용' },
  armored:  { hp:350,   spd:0.65, dmg:25,  xp:50,  sz:18, col:'#1a1a50', name:'풀장비 플레이어' },
  vehicle:  { hp:500,   spd:2.4,  dmg:55,  xp:80,  sz:28, col:'#c8b030', name:'UAZ 차량' },
  boss:     { hp:3000,  spd:0.45, dmg:40,  xp:300, sz:28, col:'#5a0a0a', name:'BOSS', boss:true },
  eliteBoss:{ hp:9000,  spd:0.55, dmg:70,  xp:800, sz:36, col:'#1a0a30', name:'ELITE BOSS', boss:true, elite:true },
  megaBoss: { hp:22000, spd:0.60, dmg:100, xp:2000,sz:44, col:'#000000', name:'MEGA BOSS',  boss:true, mega:true },
};

// ── Phase scaling (0=early … 3=late) ─────────────────────────
function getPhase(elapsed) {
  if (elapsed < 300) return 0;   // 0~5분: 초반
  if (elapsed < 600) return 1;   // 5~10분: 중반
  if (elapsed < 900) return 2;   // 10~15분: 후반
  return 3;                       // 15~20분: 최후반
}
const PHASE_HP  = [1.0, 2.2, 4.5, 8.0];
const PHASE_DMG = [1.0, 1.4, 2.0, 2.8];
const PHASE_SPD = [1.0, 1.1, 1.22, 1.38];

// ── World decorations ────────────────────────────────────────────
function generateWorld() {
  const buildings = [];
  const px = WW / 2, py = WH / 2;
  for (let i = 0; i < 70; i++) {
    let bx, by, bw, bh, tries = 0;
    do {
      bw = randInt(3, 6) * 40; bh = randInt(3, 6) * 40;
      bx = randInt(60, WW - 60 - bw); by = randInt(60, WH - 60 - bh);
      tries++;
    } while (tries < 30 && Math.hypot(bx + bw/2 - px, by + bh/2 - py) < 280);
    buildings.push({ x: bx, y: by, w: bw, h: bh });
  }
  const trees = [];
  for (let i = 0; i < 200; i++) {
    trees.push({ x: randInt(20, WW - 20), y: randInt(20, WH - 20), r: randInt(10, 18) });
  }
  return { buildings, trees };
}

// ─── Upgrade scaling per level ────────────────────────────────
// Returns { dmgMult, rofMult, rangeAdd, projAdd }
function upgradeBonusForLevel(newLevel) {
  if (newLevel === 2) return { dmgMult:1.35, rofMult:1.00, rangeAdd:0,   projAdd:0 };
  if (newLevel === 3) return { dmgMult:1.35, rofMult:0.88, rangeAdd:50,  projAdd:0 };
  if (newLevel === 4) return { dmgMult:1.40, rofMult:0.85, rangeAdd:80,  projAdd:1 };
  if (newLevel === 5) return { dmgMult:1.45, rofMult:0.80, rangeAdd:100, projAdd:0, legendary:true };
  return { dmgMult:1.0, rofMult:1.0, rangeAdd:0, projAdd:0 };
}

function upgradeLabelSub(w) {
  const next = w.level + 1;
  if (next === 2) return `Lv1→2  피해 +35%`;
  if (next === 3) return `Lv2→3  피해 +35% · 연사↑ · 사거리↑`;
  if (next === 4) return `Lv3→4  피해 +40% · 발사체 +1 ✨`;
  if (next === 5) return `Lv4→5  피해 +45% ⭐ 전설 강화`;
  return '';
}

// ── Character image cache ────────────────────────────────────────
const CHAR_IMGS = {};
let MAP_CANVAS = null; // 절차적 생성 맵 캐시
// ── 건물 충돌 그리드 ──────────────────────────────────────────
const COLL_CELL = 16; // 16px 격자
let _collisionGrid = null;
let _collGridW = 0, _collGridH = 0;
function getImg(charId, type) {
  const key = `${charId}_${type}`;
  if (!CHAR_IMGS[key]) {
    const img = new Image();
    img.src = `/characters/${key}.png`;
    CHAR_IMGS[key] = img;
  }
  return CHAR_IMGS[key];
}
function imgReady(img) { return img && img.complete && img.naturalWidth > 0; }
// 스프라이트 이미지 (몬스터·보스·맵·보급상자)
// name 끝에 확장자 포함 가능: 'map_jpg' → map.jpg, 나머지 → .png
function getSpriteImg(name) {
  if (!CHAR_IMGS[name]) {
    const img = new Image();
    img.src = name === 'map_jpg'  ? '/characters/map.jpg'
           : name === 'map2_jpg' ? '/characters/map2.jpg'
           : `/characters/${name}.png`;
    CHAR_IMGS[name] = img;
  }
  return CHAR_IMGS[name];
}
// 발 아래 그림자 타원
function drawGroundShadow(ctx, x, y, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.38;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, y + h * 0.38, w * 0.38, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// 각도 보간 (방향 튐 방지)
function lerpAngle(a, b, t) {
  let d = b - a;
  while (d >  Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

// 비율 유지하며 maxSize 안에 맞춰 drawImage (shadow 옵션)
function drawImgContain(ctx, img, cx, cy, maxSize, shadowColor, shadowBlur) {
  const ratio = img.naturalWidth / img.naturalHeight;
  let w, h;
  if (ratio >= 1) { w = maxSize; h = maxSize / ratio; }
  else             { h = maxSize; w = maxSize * ratio; }
  if (shadowColor) {
    ctx.save();
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur  = shadowBlur || 10;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  }
  return { w, h };
}

// ═══════════════════════════════════════════════════════════════
// 절차적 픽셀아트 맵 생성
// ═══════════════════════════════════════════════════════════════
function generateProceduralMap() {
  const canvas = document.createElement('canvas');
  canvas.width = WW; canvas.height = WH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // 시드 기반 PRNG (맵 고정)
  let seed = 20240901;
  const sr = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };
  const si = (a, b) => Math.floor(sr() * (b - a)) + a;
  const sc = (arr) => arr[Math.floor(sr() * arr.length)];

  // 팔레트 (기존 map.jpg + 캐릭터 색상 기준)
  const GRASS  = ['#4a5c28','#526430','#3e5224','#4f6430','#566b33','#3d5225','#496128','#4b5e2c'];
  const GRASS2 = ['#2d3e18','#303f18','#2a3a14','#354520']; // 짙은 풀
  const DIRT   = ['#7a6545','#8b7355','#826d4a','#7d6840','#906050','#7e6448'];
  const DIRT2  = ['#c4a96f','#b09860','#a88a55','#bfaa7a']; // 밝은 흙
  const STONE  = ['#6b6b5a','#7a7a6a','#5a5a4a','#636358'];

  // ── 1. 베이스 타일 지형 (32px 타일) ──────────────────────────
  const TS = 32;
  const cols = Math.ceil(WW / TS) + 1, rows = Math.ceil(WH / TS) + 1;
  // 노이즈 그리드
  const noise = Array.from({length: rows + 2}, () =>
    Array.from({length: cols + 2}, () => sr()));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const n = noise[r][c];
      let color;
      if (n < 0.07)      color = sc(GRASS2);
      else if (n < 0.72) color = sc(GRASS);
      else if (n < 0.88) color = sc(DIRT);
      else               color = sc(DIRT2);
      ctx.fillStyle = color;
      ctx.fillRect(c * TS, r * TS, TS + 1, TS + 1);
    }
  }

  // ── 2. 흙길 (가로 + 세로) ──────────────────────────────────
  const drawRoad = (horizontal) => {
    const RW = 72;
    const STEPS = horizontal ? WW : WH;
    for (let i = 0; i < STEPS; i += 4) {
      const wave = Math.sin(i / 280) * 28 + Math.sin(i / 90) * 8;
      const base = horizontal ? 920 : 1020;
      for (let d = -RW / 2; d < RW / 2; d += 4) {
        const cx = horizontal ? i : base + wave + d;
        const cy = horizontal ? base + wave + d : i;
        const edgeFade = 1 - Math.abs(d) / (RW / 2);
        if (sr() < edgeFade * 0.92) {
          ctx.fillStyle = sr() > 0.6 ? sc(DIRT) : sc(DIRT2);
          ctx.fillRect(cx, cy, 4, 4);
        }
      }
    }
  };
  drawRoad(true);
  drawRoad(false);

  // ── 3. 건물 잔해 ───────────────────────────────────────────
  const ruins = [
    {x:160,  y:180,  w:130, h:90},  {x:510,  y:140,  w:90,  h:70},
    {x:1390, y:280,  w:110, h:95},  {x:1710, y:480,  w:70,  h:60},
    {x:280,  y:1490, w:150, h:85},  {x:1580, y:1390, w:100, h:75},
    {x:820,  y:680,  w:80,  h:65},  {x:1210, y:790,  w:85,  h:70},
    {x:90,   y:880,  w:110, h:85},  {x:1790, y:1190, w:120, h:80},
    {x:990,  y:1580, w:95,  h:85},  {x:480,  y:1790, w:85,  h:65},
    {x:650,  y:460,  w:75,  h:60},  {x:1350, y:1100, w:90,  h:70},
  ];
  for (const ru of ruins) {
    // 바닥
    ctx.fillStyle = '#9a8a70'; ctx.fillRect(ru.x, ru.y, ru.w, ru.h);
    // 바닥 타일 변주
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = sr() > 0.5 ? '#8a7a60' : '#b0a080';
      const fx = ru.x + si(0, ru.w - 16), fy = ru.y + si(0, ru.h - 16);
      ctx.fillRect(fx, fy, 16, 16);
    }
    // 외벽
    ctx.strokeStyle = '#3e2e1a'; ctx.lineWidth = 5;
    ctx.strokeRect(ru.x, ru.y, ru.w, ru.h);
    // 내벽 잔해
    ctx.strokeStyle = '#5a4a30'; ctx.lineWidth = 2;
    ctx.strokeRect(ru.x + 8, ru.y + 8, ru.w - 16, ru.h - 16);
    // 잔해 덩어리
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = sr() > 0.5 ? '#5a4a30' : '#7a6a50';
      const bx = ru.x + 8 + si(0, ru.w - 24), by = ru.y + 8 + si(0, ru.h - 24);
      const bs = si(6, 16);
      ctx.fillRect(bx, by, bs, bs);
    }
    // 창문 흔적
    ctx.fillStyle = '#2a1e0e';
    if (ru.w > 80) {
      ctx.fillRect(ru.x + 14, ru.y + 12, 18, 14);
      ctx.fillRect(ru.x + ru.w - 30, ru.y + 12, 18, 14);
    }
  }

  // ── 4. 바위 무리 ──────────────────────────────────────────
  for (let i = 0; i < 38; i++) {
    const rx = si(80, WW - 80), ry = si(80, WH - 80);
    const sz = si(18, 38);
    ctx.fillStyle = sc(STONE);
    ctx.fillRect(rx - sz / 2, ry - sz / 3, sz, sz * 0.7);
    ctx.fillStyle = '#909080';
    ctx.fillRect(rx - sz / 2 + 4, ry - sz / 3, sz / 2, 6);
    ctx.fillStyle = '#3e3e30';
    ctx.fillRect(rx - sz / 2, ry - sz / 3 + sz * 0.5, sz, sz * 0.22);
  }

  // ── 5. 나무 군집 (픽셀아트 레이어드) ─────────────────────
  const clusters = [
    {cx:140, cy:380, n:14}, {cx:390, cy:580, n:11}, {cx:1820, cy:190, n:16},
    {cx:1620, cy:690, n:9},  {cx:180, cy:1220, n:13}, {cx:1820, cy:1610, n:11},
    {cx:710, cy:1820, n:13}, {cx:1420, cy:1610, n:9},  {cx:590, cy:290, n:11},
    {cx:1220, cy:390, n:10}, {cx:1720, cy:990, n:12}, {cx:90,  cy:1720, n:11},
    {cx:820, cy:1320, n:9},  {cx:1510, cy:90,  n:10}, {cx:330, cy:800, n:8},
    {cx:1080, cy:240, n:9},  {cx:60,  cy:550, n:7},   {cx:1950, cy:800, n:8},
  ];
  for (const tc of clusters) {
    for (let i = 0; i < tc.n; i++) {
      const tx = tc.cx + si(-90, 90), ty = tc.cy + si(-90, 90);
      const tr = si(15, 26);
      // 그림자
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath(); ctx.ellipse(tx + 5, ty + 7, tr * 0.95, tr * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      // 줄기
      ctx.fillStyle = '#3a2a18';
      ctx.fillRect(tx - 3, ty, 6, 12);
      ctx.fillStyle = '#2a1e10';
      ctx.fillRect(tx - 2, ty + 10, 4, 5);
      // 잎 (3단 픽셀아트)
      const fc1 = sr() > 0.5 ? '#1e3810' : '#253d18';
      const fc2 = sr() > 0.5 ? '#2a4a18' : '#1a3010';
      const fc3 = sr() > 0.5 ? '#2d5220' : '#1e4015';
      ctx.fillStyle = fc1;
      ctx.fillRect(tx - tr, ty - tr * 0.5, tr * 2, tr + 2);
      ctx.fillStyle = fc2;
      ctx.fillRect(tx - tr * 0.78, ty - tr * 1.15, tr * 1.56, tr * 0.85);
      ctx.fillStyle = fc3;
      ctx.fillRect(tx - tr * 0.42, ty - tr * 1.65, tr * 0.84, tr * 0.65);
      // 하이라이트
      ctx.fillStyle = 'rgba(90,130,50,0.35)';
      ctx.fillRect(tx - tr * 0.32, ty - tr * 1.55, tr * 0.5, tr * 0.32);
    }
  }

  // ── 6. 고사목 (앙상한 나무) ──────────────────────────────
  for (let i = 0; i < 30; i++) {
    const tx = si(120, WW - 120), ty = si(120, WH - 120);
    ctx.strokeStyle = '#4a3820'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(tx, ty + 14); ctx.lineTo(tx, ty - 22); ctx.stroke();
    ctx.strokeStyle = '#5a4830'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, ty - 10); ctx.lineTo(tx - 15, ty - 24);
    ctx.moveTo(tx, ty - 15); ctx.lineTo(tx + 13, ty - 26);
    ctx.moveTo(tx, ty - 5);  ctx.lineTo(tx - 9,  ty - 15);
    ctx.moveTo(tx, ty - 18); ctx.lineTo(tx + 8,  ty - 26);
    ctx.stroke();
  }

  // ── 7. 풀 디테일 ────────────────────────────────────────
  for (let i = 0; i < 350; i++) {
    const gx = si(0, WW), gy = si(0, WH);
    ctx.fillStyle = sr() > 0.5 ? '#5a7030' : '#4a6028';
    ctx.fillRect(gx, gy, 4, 8);
    ctx.fillRect(gx + 4, gy + 2, 4, 6);
    ctx.fillRect(gx - 4, gy + 1, 4, 7);
  }

  // ── 8. 가장자리 어둡게 (비네팅) ─────────────────────────
  const vgH = ctx.createLinearGradient(0, 0, 0, WH);
  vgH.addColorStop(0,   'rgba(0,0,0,0.35)');
  vgH.addColorStop(0.08,'rgba(0,0,0,0)');
  vgH.addColorStop(0.92,'rgba(0,0,0,0)');
  vgH.addColorStop(1,   'rgba(0,0,0,0.35)');
  ctx.fillStyle = vgH; ctx.fillRect(0, 0, WW, WH);
  const vgV = ctx.createLinearGradient(0, 0, WW, 0);
  vgV.addColorStop(0,   'rgba(0,0,0,0.35)');
  vgV.addColorStop(0.06,'rgba(0,0,0,0)');
  vgV.addColorStop(0.94,'rgba(0,0,0,0)');
  vgV.addColorStop(1,   'rgba(0,0,0,0.35)');
  ctx.fillStyle = vgV; ctx.fillRect(0, 0, WW, WH);

  return canvas;
}

// ── 건물 충돌 그리드 생성 (이미지 밝기 기반) ────────────────────
function buildCollisionGrid(imgEl) {
  const iw = imgEl.naturalWidth, ih = imgEl.naturalHeight;
  if (!iw || !ih) return null;
  const cols = Math.ceil(WW / COLL_CELL);
  const rows = Math.ceil(WH / COLL_CELL);
  _collGridW = cols; _collGridH = rows;
  const oc = new OffscreenCanvas(iw, ih);
  const oc2d = oc.getContext('2d');
  oc2d.drawImage(imgEl, 0, 0);
  const imgData = oc2d.getImageData(0, 0, iw, ih).data;
  const scaleX = iw / WW, scaleY = ih / WH;
  const grid = new Uint8Array(cols * rows);

  // 3×3 다중 샘플 — 9개 중 5개 이상 어두워야 건물로 판정
  // 임계값 45: 건물 벽(매우 어두움)만 차단, 도로/바닥/그림자 제외
  const THRESHOLD = 45;
  const SAMPLE_STEP = Math.max(1, Math.floor(COLL_CELL / 3));
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const baseX = Math.floor(col * COLL_CELL * scaleX);
      const baseY = Math.floor(row * COLL_CELL * scaleY);
      let darkCount = 0;
      for (let sy = 0; sy < 3; sy++) {
        for (let sx = 0; sx < 3; sx++) {
          const px = Math.min(iw - 1, baseX + sx * SAMPLE_STEP);
          const py = Math.min(ih - 1, baseY + sy * SAMPLE_STEP);
          const idx = (py * iw + px) * 4;
          const r = imgData[idx], g = imgData[idx+1], b = imgData[idx+2];
          // 건물 벽: 모든 채널이 낮고(어두움) + 녹색 채널이 지배적이지 않음(풀 제외)
          const brightness = r * 0.299 + g * 0.587 + b * 0.114;
          const isWall = brightness < THRESHOLD && g < r * 1.4; // 녹색 계열(풀/나무) 제외
          if (isWall) darkCount++;
        }
      }
      // 5/9 이상 어두운 샘플 → 건물 벽
      grid[row * cols + col] = darkCount >= 5 ? 1 : 0;
    }
  }
  return grid;
}

function isBlocked(x, y) {
  if (!_collisionGrid) return false;
  const col = (x / COLL_CELL) | 0;
  const row = (y / COLL_CELL) | 0;
  if (col < 0 || col >= _collGridW || row < 0 || row >= _collGridH) return false;
  return _collisionGrid[row * _collGridW + col] === 1;
}

// ═══════════════════════════════════════════════════════════════
// DRAWING
// ═══════════════════════════════════════════════════════════════
function drawWorld(ctx, cam, world) {
  const mapImg = getSpriteImg('map2_jpg');
  if (imgReady(mapImg)) {
    // 충돌 그리드 최초 1회 빌드
    if (!_collisionGrid) _collisionGrid = buildCollisionGrid(mapImg);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const scaleX = mapImg.naturalWidth / WW;
    const scaleY = mapImg.naturalHeight / WH;
    ctx.drawImage(mapImg, cam.x * scaleX, cam.y * scaleY, CW * scaleX, CH * scaleY, 0, 0, CW, CH);
    ctx.imageSmoothingEnabled = false;
  } else {
    // 로딩 전 fallback
    if (!MAP_CANVAS) MAP_CANVAS = generateProceduralMap();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(MAP_CANVAS, cam.x, cam.y, CW, CH, 0, 0, CW, CH);
  }

  // 충돌 나무 반투명 오버레이 (게임 오브젝트)
  for (const tr of world.trees) {
    const tx = tr.x - cam.x, ty = tr.y - cam.y;
    if (tx < -40 || tx > CW + 40 || ty < -40 || ty > CH + 40) continue;
    ctx.fillStyle = 'rgba(20,50,10,0.35)';
    ctx.beginPath(); ctx.arc(tx, ty, tr.r, 0, Math.PI * 2); ctx.fill();
  }
}

function drawZone(ctx, cam, zone) {
  const zx = zone.cx - cam.x, zy = zone.cy - cam.y;
  // 블루존 외부: 은은한 푸른 오버레이 (outside only)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, CW, CH);
  ctx.arc(zx, zy, zone.r, 0, Math.PI * 2, true); // 원 안쪽을 제외 (even-odd)
  ctx.fillStyle = 'rgba(0,60,180,0.28)';
  ctx.fill('evenodd');
  ctx.restore();
  // 블루존 경계선 글로우
  ctx.save();
  ctx.shadowColor = 'rgba(80,160,255,0.9)'; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(zx, zy, zone.r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(80,180,255,0.95)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
}

function drawPixelChar(ctx, x, y, color, accentC, sz, dir, gun) {
  const s = sz;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(x, y + s * 0.6, s * 0.65, s * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(x - s * 0.5 | 0, y - s * 0.5 | 0, s | 0, s | 0);
  ctx.fillStyle = accentC;
  ctx.fillRect(x - s * 0.5 | 0, y - s * 0.15 | 0, s | 0, 3);
  ctx.fillStyle = '#d4a882';
  const hs = s * 0.45 | 0;
  ctx.fillRect(x - hs / 2 | 0, y - hs / 2 | 0, hs, hs);
  if (gun) {
    ctx.fillStyle = '#888';
    const gx = x + Math.cos(dir) * s * 0.3 | 0;
    const gy = y + Math.sin(dir) * s * 0.3 | 0;
    ctx.save(); ctx.translate(gx, gy); ctx.rotate(dir);
    ctx.fillRect(0, -2, s * 0.85 | 0, 4);
    ctx.restore();
  }
}

function drawPlayer(ctx, p, cam) {
  const x = p.x - cam.x | 0, y = p.y - cam.y | 0;
  const SZ = 72;

  // 버서커 분노 글로우
  if (p._rageActive) {
    ctx.save();
    ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(255,60,0,0.15)';
    ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  if (p.charId === 'ghost') { ctx.save(); ctx.globalAlpha = 0.72; }

  // 합쳐진 캐릭터 이미지
  const charImg = getSpriteImg(p.charId);
  if (imgReady(charImg)) {
    drawGroundShadow(ctx, x, y, SZ, SZ);
    drawImgContain(ctx, charImg, x, y, SZ, 'rgba(0,0,0,0.85)', 12);
  } else {
    // fallback: 픽셀아트
    const charC = p.charColor || '#4a7a3a';
    const helmetC = p.charHelmetC || '#2a4a2a';
    const accentC = p.charAccentC || '#88cc66';
    ctx.fillStyle = helmetC;
    ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
    drawPixelChar(ctx, x, y, charC, accentC, 22, p.aimAngle, true);
  }

  if (p.charId === 'ghost') ctx.restore();

  // HP 바
  const bw = 64, bh = 6;
  ctx.fillStyle = '#111'; ctx.fillRect(x - bw / 2, y - 42, bw, bh);
  ctx.fillStyle = p.hp > p.maxHp * 0.5 ? '#44dd66' : p.hp > p.maxHp * 0.25 ? '#ffaa00' : '#ff4444';
  ctx.fillRect(x - bw / 2, y - 42, bw * (p.hp / p.maxHp), bh);

  // 무적 플래시
  if (p.invulnTime > 0 && Math.floor(p.invulnTime / 4) % 2 === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill();
  }
}

function drawEnemy(ctx, e, cam) {
  const x = e.x - cam.x | 0, y = e.y - cam.y | 0;
  if (x < -50 || x > CW + 50 || y < -50 || y > CH + 50) return;
  const dir = Math.atan2(e.targY - e.y, e.targX - e.x);

  // 몬스터 이미지 사용
  const mImg = e.monsterImg ? getSpriteImg(e.monsterImg) : null;
  if (imgReady(mImg)) {
    const sz = e.sz * 5.5;
    drawGroundShadow(ctx, x, y, sz, sz);
    const glowColor = e.mega ? 'rgba(180,0,255,0.7)' : e.elite ? 'rgba(255,40,80,0.6)' : 'rgba(0,0,0,0.8)';
    drawImgContain(ctx, mImg, x, y, sz, glowColor, e.boss ? 18 : 10);
  } else {
    // fallback: 픽셀아트
    drawPixelChar(ctx, x, y, e.col, '#666666', e.sz * 1.4, dir, !e.vehicle);
    if (e.vehicle) {
      ctx.fillStyle = e.col;
      ctx.fillRect(x - e.sz, y - e.sz * 0.6, e.sz * 2, e.sz * 1.2);
      ctx.fillStyle = '#888'; ctx.fillRect(x - e.sz * 0.6, y - e.sz * 0.55, e.sz * 1.2, e.sz * 1.1);
    }
  }

  if (e.boss) {
    // 보스 종류별 링 색상
    const ringColor = e.mega ? '#ff00ff' : e.elite ? '#ff4488' : '#FFD700';
    const ringWidth = e.mega ? 4 : e.elite ? 3 : 2;
    // 외곽 발광링
    ctx.save();
    ctx.shadowColor = ringColor; ctx.shadowBlur = e.mega ? 24 : e.elite ? 16 : 10;
    ctx.strokeStyle = ringColor; ctx.lineWidth = ringWidth;
    ctx.beginPath(); ctx.arc(x, y, e.sz + 5, 0, Math.PI * 2); ctx.stroke();
    if (e.mega || e.elite) {
      ctx.strokeStyle = ringColor + '55'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(x, y, e.sz + 12, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    // 이름 라벨
    ctx.fillStyle = ringColor;
    ctx.font = `bold ${e.mega ? 12 : e.elite ? 11 : 10}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(e.mega ? '💀 MEGA BOSS' : e.elite ? '⚡ ELITE BOSS' : 'BOSS', x, y - e.sz - 10);
  }
  if (e.poisoned > 0) {
    ctx.fillStyle = 'rgba(80,220,80,0.3)';
    ctx.beginPath(); ctx.arc(x, y, e.sz + 2, 0, Math.PI * 2); ctx.fill();
  }
  const bw = e.sz * 2.2, bh = 4;
  ctx.fillStyle = '#222'; ctx.fillRect(x - bw/2, y - e.sz - 12, bw, bh);
  ctx.fillStyle = e.boss ? '#ff4444' : '#ff8844';
  ctx.fillRect(x - bw/2, y - e.sz - 12, bw * Math.max(0, e.hp / e.maxHp), bh);
}

function drawBullet(ctx, b, cam) {
  const x = b.x - cam.x, y = b.y - cam.y;
  if (x < -20 || x > CW + 20 || y < -20 || y > CH + 20) return;
  ctx.save();
  ctx.translate(x, y);

  if (b.isGrenade) {
    // 수류탄: 회전하는 초록 원형
    ctx.rotate(b.traveled * 0.12);
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#3a9a3a'; ctx.fill();
    ctx.strokeStyle = '#80ff60'; ctx.lineWidth = 2; ctx.stroke();
    // 핀 표시
    ctx.fillStyle = '#ffdd44';
    ctx.fillRect(-2, -9, 4, 5);
    ctx.restore(); return;
  }

  ctx.rotate(Math.atan2(b.dy, b.dx));
  const level = Math.min(5, Math.max(1, b.weaponLevel || 1));
  const bulletImg = b.charId ? getImg(b.charId, `bullet${level}`) : null;
  if (imgReady(bulletImg)) {
    drawImgContain(ctx, bulletImg, 0, 0, 28);
  } else {
    // fallback
    ctx.fillStyle = b.legendary ? 'rgba(255,100,255,0.5)' : b.poison ? 'rgba(80,220,80,0.4)' : 'rgba(255,220,60,0.35)';
    ctx.fillRect(-14, -2, 12, 4);
    ctx.fillStyle = b.legendary ? '#ff88ff' : b.poison ? '#80ff80' : '#ffe44d';
    ctx.fillRect(-4, -3, 12, 6);
  }
  ctx.restore();
}

function drawXPOrb(ctx, orb, cam) {
  const x = orb.x - cam.x, y = orb.y - cam.y;
  if (x < -12 || x > CW + 12 || y < -12 || y > CH + 12) return;
  ctx.fillStyle = 'rgba(68,240,184,0.25)';
  ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#44f0b8';
  ctx.fillRect(x - 4 | 0, y - 4 | 0, 8, 8);
  ctx.fillStyle = 'rgba(200,255,240,0.8)';
  ctx.fillRect(x - 2 | 0, y - 2 | 0, 3, 3);
}

function drawParticle(ctx, p, cam) {
  const x = p.x - cam.x, y = p.y - cam.y;
  if (x < -10 || x > CW + 10 || y < -10 || y > CH + 10) return;
  ctx.globalAlpha = p.life / p.maxLife;
  ctx.fillStyle = p.color;
  ctx.fillRect(x - p.sz/2, y - p.sz/2, p.sz, p.sz);
  ctx.globalAlpha = 1;
}

// ── Airdrop drawing ──────────────────────────────────────────
function drawAirdrop(ctx, drop, cam, time) {
  const x = drop.x - cam.x | 0, y = drop.y - cam.y | 0;
  if (x < -80 || x > CW + 80 || y < -80 || y > CH + 80) return;

  // Parachute descent phase (first 4 seconds)
  if (drop.falling > 0) {
    // Smoke trail
    ctx.fillStyle = 'rgba(255,80,0,0.35)';
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      ctx.arc(x, y - i * 14, 4 + i, 0, Math.PI * 2);
      ctx.fill();
    }
    // Parachute canopy
    ctx.fillStyle = 'rgba(255,200,0,0.85)';
    ctx.beginPath();
    ctx.arc(x, y - 42, 22, Math.PI, 0);
    ctx.fill();
    // Cords
    ctx.strokeStyle = '#cc9900'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 20, y - 42); ctx.lineTo(x - 8, y - 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 20, y - 42); ctx.lineTo(x + 8, y - 10); ctx.stroke();
    // 낙하 중 상자 이미지 (작게)
    const crateImgFall = getSpriteImg('airdrop');
    if (imgReady(crateImgFall)) {
      drawImgContain(ctx, crateImgFall, x, y - 4, 44);
    } else {
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(x - 10, y - 14, 20, 16);
    }
    return;
  }

  // 착지한 상자
  const pulse = Math.sin(time * 0.08) * 0.5 + 0.5;
  const crateImg = getSpriteImg('airdrop');

  // 골드 글로우
  ctx.save();
  ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 18 + pulse * 10;
  ctx.fillStyle = `rgba(255,200,0,${0.06 + pulse * 0.06})`;
  ctx.beginPath(); ctx.arc(x, y, 34, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // 상자 이미지
  if (imgReady(crateImg)) {
    drawImgContain(ctx, crateImg, x, y, 72);
  } else {
    ctx.fillStyle = '#8B6914'; ctx.fillRect(x - 18, y - 16, 36, 28);
    ctx.fillStyle = '#a07820'; ctx.fillRect(x - 18, y - 16, 36, 8);
  }

  // 라벨·화살표
  ctx.fillStyle = `rgba(255,230,0,${0.85 + pulse * 0.15})`;
  ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('보급품', x, y - 30);
  ctx.fillStyle = `rgba(255,200,0,${pulse})`;
  ctx.font = '13px sans-serif';
  ctx.fillText('▼', x, y - 40 + pulse * 4);
}

function drawMinimap(ctx, state) {
  const mw = 120, mh = 120, mx = CW - mw - 8, my = 8;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
  ctx.strokeRect(mx, my, mw, mh);
  const zx = mx + (state.zone.cx / WW) * mw;
  const zy = my + (state.zone.cy / WH) * mh;
  const zr = (state.zone.r / WW) * mw;
  ctx.strokeStyle = 'rgba(60,160,255,0.7)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(zx, zy, zr, 0, Math.PI * 2); ctx.stroke();
  // Airdrops on minimap
  for (const drop of state.airdrops) {
    const ax = mx + (drop.x / WW) * mw, ay = my + (drop.y / WH) * mh;
    const blink = Math.sin(state.time * 0.15) > 0;
    if (blink) {
      ctx.fillStyle = '#ffd700';
      // Diamond shape
      ctx.beginPath();
      ctx.moveTo(ax, ay - 4); ctx.lineTo(ax + 4, ay);
      ctx.lineTo(ax, ay + 4); ctx.lineTo(ax - 4, ay);
      ctx.closePath(); ctx.fill();
    }
  }
  for (const e of state.enemies) {
    const ex = mx + (e.x / WW) * mw, ey = my + (e.y / WH) * mh;
    ctx.fillStyle = e.boss ? '#ff4444' : '#ff8844';
    ctx.fillRect(ex - 1, ey - 1, 2, 2);
  }
  const px = mx + (state.player.x / WW) * mw, py = my + (state.player.y / WH) * mh;
  ctx.fillStyle = '#44ff88';
  ctx.fillRect(px - 2, py - 2, 4, 4);
}

// ═══════════════════════════════════════════════════════════════
// AIRDROP LOGIC
// ═══════════════════════════════════════════════════════════════
function generateAirdropContents() {
  // 1~2 items per crate
  const items = [];
  const rng = Math.random();
  if (rng < 0.45) {
    // Legendary weapon + special item
    const wKeys = Object.keys(AIRDROP_WEAPONS);
    const iKeys = Object.keys(AIRDROP_ITEMS);
    items.push({ kind:'weapon', id: wKeys[randInt(0, wKeys.length)], def: null });
    items.push({ kind:'item',   id: iKeys[randInt(0, iKeys.length)], def: null });
  } else if (rng < 0.72) {
    // 2 legendary weapons
    const wKeys = Object.keys(AIRDROP_WEAPONS);
    const shuffled = [...wKeys].sort(() => Math.random() - 0.5);
    items.push({ kind:'weapon', id: shuffled[0], def: null });
    items.push({ kind:'weapon', id: shuffled[1], def: null });
  } else {
    // 2 special items (rarest)
    const iKeys = Object.keys(AIRDROP_ITEMS);
    const shuffled = [...iKeys].sort(() => Math.random() - 0.5);
    items.push({ kind:'item', id: shuffled[0], def: null });
    items.push({ kind:'item', id: shuffled[1], def: null });
  }
  // Attach defs
  items.forEach(it => {
    it.def = it.kind === 'weapon' ? AIRDROP_WEAPONS[it.id] : AIRDROP_ITEMS[it.id];
  });
  return items;
}

function spawnAirdrop(state) {
  if (state.airdrops.length >= 3) return;
  // Spawn within zone, not too close to player
  const zone = state.zone;
  let ax, ay, tries = 0;
  do {
    const angle = Math.random() * Math.PI * 2;
    const r = rand(zone.r * 0.2, zone.r * 0.7);
    ax = clamp(zone.cx + Math.cos(angle) * r, 100, WW - 100);
    ay = clamp(zone.cy + Math.sin(angle) * r, 100, WH - 100);
    tries++;
  } while (tries < 20 && dist({ x: ax, y: ay }, state.player) < 400);

  state.airdrops.push({
    id: ++state._dropId,
    x: ax, y: ay,
    contents: generateAirdropContents(),
    falling: 240,  // 4 seconds of falling animation
    age: 0,
  });
  state.lastAirdropPos = { x: ax, y: ay };
  state.notifications.push({ id: ++state._nid, icon: '📦', title: '보급품 투하중!', sub: '미니맵 금색 마커 확인', color: '#d97706', time: 210 });
}

// ═══════════════════════════════════════════════════════════════
// GAME LOGIC
// ═══════════════════════════════════════════════════════════════
function initGame(charId = 'operator') {
  const char = CHARS[charId] || CHARS.operator;
  const world = generateWorld();
  const px = WW / 2, py = WH / 2;

  const startWDef = WDEFS[char.weapon];
  const startWeapon = {
    ...startWDef,
    id: char.weapon,
    level: 1,
    shootTimer: 0,
    extraProj: 0,
    extraRange: 0,
    dmg: Math.floor(startWDef.dmg * char.dmgMult),
  };

  if (charId === 'gunner')   { startWeapon.extraProj = 1; startWeapon.rof = Math.floor(startWeapon.rof * 0.70); }
  if (charId === 'sniper')   { startWeapon.pierce = true; startWeapon.extraRange = 100; }
  if (charId === 'marksman') { startWeapon.extraRange = 50; }
  if (charId === 'operator') { startWeapon.spread = startWDef.spread * 0.85; startWeapon.rof = Math.floor(startWDef.rof * 0.80); }
  if (charId === 'breacher') { startWeapon.spread = startWDef.spread * 0.85; }

  const nextAirdrop = randInt(AIRDROP_INTERVAL_MIN, AIRDROP_INTERVAL_MAX);

  return {
    phase: 'menu',
    charId,
    world,
    player: {
      x: px, y: py,
      hp: char.startHp,
      maxHp: char.startHp + (charId === 'breacher' ? 30 : 0),
      speed: char.startSpd,
      xp: 0, xpNext: 60, level: 1,
      weapons: [startWeapon],
      attachments: [],         // regular attachments
      airdropItems: [],        // legendary items
      airdropWeapons: [],      // legendary weapon ids held
      evolutions: [],
      healRegen: charId === 'runner' ? 1.5 : 0,
      dmgReduce: 0,
      bzImmune: false,         // bluezone immune flag
      skipCount: 2,            // 레벨업 건너뛰기 횟수
      invulnTime: 0, aimAngle: 0, _aimDisplay: 0,
      charId,
      charColor: char.color,
      charHelmetC: char.helmetC,
      charAccentC: char.accentC,
      dmgMult: char.dmgMult,
      _rageActive: false,
    },
    enemies: [], bullets: [], xpOrbs: [], particles: [],
    airdrops: [],
    airdropTimer: nextAirdrop,
    camera: { x: px - CW/2, y: py - CH/2 },
    zone: { cx: WW/2, cy: WH/2, r: 1300, targetR: 200, shrinkRate: 0.06, damage: 10 },
    keys: { up:false, down:false, left:false, right:false },
    time: 0, elapsed: 0,
    spawnTimer: 0,
    // 보스 출현 시간표 (초): 초반~중반 일반BOSS, 후반 elite, 최후반 mega
    bossTimes: new Set([60, 180, 300, 480, 600, 780, 900, 1080, 1200]),
    eliteBossTimes: new Set([600, 780, 960, 1080]),
    megaBossTimes:  new Set([900, 1080, 1200]),
    levelupChoices: [], evoKey: null,
    score: 0, kills: 0,
    _eid: 0, _bid: 0, _dropId: 0, _nid: 0,
    gameOver: false, won: false,
    pickupLog: [],
    notifications: [], // [{ id, icon, title, sub, color, time }]
  };
}

function spawnEnemy(state, etype) {
  const p = state.player;
  const angle = Math.random() * Math.PI * 2;
  const r = 520 + Math.random() * 80;
  const ex = clamp(p.x + Math.cos(angle) * r, 30, WW - 30);
  const ey = clamp(p.y + Math.sin(angle) * r, 30, WH - 30);
  const def = ETYPES[etype];
  const lvl   = state.player.level;
  const phase = getPhase(state.elapsed);

  // 10분 이후: 수 고정 대신 HP 급상승
  const lateHpBoost = state.elapsed >= 600 ? 1 + (state.elapsed - 600) / 60 * 0.35 : 1;
  const baseHp  = (1 + state.elapsed / 280 + lvl * 0.15) * lateHpBoost;
  const baseDmg = 1 + state.elapsed / 420 + lvl * 0.09;
  const baseSpd = 1 + Math.min(lvl * 0.05, 0.8);

  // 페이즈 배수 (후반 급상승)
  const hpScale  = baseHp  * PHASE_HP[phase];
  const dmgScale = baseDmg * PHASE_DMG[phase];
  const spdScale = baseSpd * PHASE_SPD[phase];

  const isBossType = def.boss;
  // 보스는 페이즈별 추가 HP 배율 (후반 보스 극단적으로 강하게)
  const bossHpBonus = isBossType ? (1 + phase * phase * 0.8) : 1;
  const bossDmgBonus = isBossType ? (1 + phase * 0.4) : 1;

  state.enemies.push({
    id: ++state._eid, type: etype,
    x: ex, y: ey, targX: p.x, targY: p.y,
    hp:    def.hp  * hpScale  * bossHpBonus,
    maxHp: def.hp  * hpScale  * bossHpBonus,
    spd:   def.spd * spdScale,
    dmg:   Math.ceil(def.dmg * dmgScale * bossDmgBonus),
    xp:    Math.ceil(def.xp  * (1 + lvl * 0.06 + phase * 0.3)),
    sz:    def.sz + (isBossType ? Math.min(lvl * 1.2, 18) : 0),
    col:   def.col,
    boss:  isBossType,
    elite: def.elite || false,
    mega:  def.mega  || false,
    vehicle: etype === 'vehicle', poisoned: 0, knockback: null,
    phase,
    monsterImg: (() => {
      if (def.boss) return 'boss';
      if (etype === 'vehicle') return 'monster_fast';
      if (etype === 'basic')   return `monster${Math.min(3, 1 + phase)}`;
      if (etype === 'vested')  return `monster${Math.min(5, 3 + phase)}`;
      if (etype === 'armored') return `monster${Math.min(8, 5 + phase)}`;
      return 'monster1';
    })(),
  });
}

function getSpawnType(elapsed) {
  const r = Math.random();
  // 0~1분: 기초
  if (elapsed < 60)  return 'basic';
  // 1~3분
  if (elapsed < 180) return r < 0.28 ? 'vested' : 'basic';
  // 3~6분
  if (elapsed < 360) {
    if (r < 0.10) return 'armored';
    if (r < 0.35) return 'vested';
    return 'basic';
  }
  // 6~10분: 중반 — 차량/장갑병 증가
  if (elapsed < 600) {
    if (r < 0.10) return 'vehicle';
    if (r < 0.28) return 'armored';
    if (r < 0.55) return 'vested';
    return 'basic';
  }
  // 10~15분: 후반 — 거의 장갑/차량
  if (elapsed < 900) {
    if (r < 0.18) return 'vehicle';
    if (r < 0.55) return 'armored';
    if (r < 0.82) return 'vested';
    return 'basic';
  }
  // 15~20분: 최후반 — 압도적 밀도
  if (r < 0.25) return 'vehicle';
  if (r < 0.70) return 'armored';
  if (r < 0.92) return 'vested';
  return 'basic';
}

let _cachedNearest = null; // 프레임당 1회 캐싱
let _cachedNearestFrame = -1;
function getNearest(state) {
  if (_cachedNearestFrame === state.time) return _cachedNearest;
  const p = state.player;
  let nearest = null, nd2 = Infinity;
  for (const e of state.enemies) {
    const d2 = dist2(p, e);
    if (d2 < nd2) { nd2 = d2; nearest = e; }
  }
  _cachedNearest = nearest;
  _cachedNearestFrame = state.time;
  return nearest;
}

function shootWeapon(state, w) {
  const p = state.player;
  if (state.enemies.length === 0) return;
  const critBonus = p.charId === 'marksman' ? (p.extraRange || 0) : 0;
  const maxRange = (w.range + (w.extraRange || 0) + critBonus);
  // 캐싱된 nearest 사용, 사거리 초과면 null
  const candidate = getNearest(state);
  const nearest = (candidate && dist2(p, candidate) <= maxRange * maxRange) ? candidate : null;
  if (!nearest) return;
  p.aimAngle = Math.atan2(nearest.y - p.y, nearest.x - p.x);
  p._aimDisplay = lerpAngle(p._aimDisplay, p.aimAngle, 0.18);
  const baseAngle = p.aimAngle;
  const projCount = (w.proj || 1) + (w.extraProj || 0);

  const rageMult  = (p.charId === 'berserker' && p._rageActive) ? 1.5 : 1;
  const critMult  = (p.charId === 'marksman' && Math.random() < 0.20) ? 2.0 : 1.0;
  const finalDmg  = w.dmg * rageMult * critMult;
  const isLegendary = !!w.legendary;

  for (let i = 0; i < projCount; i++) {
    let angle = baseAngle + (Math.random() - 0.5) * (w.spread || 0) * 2;
    if (w.crossFire) {
      if (i === 1) angle = baseAngle + Math.PI / 2;
      else if (i === 2) angle = baseAngle - Math.PI / 2;
      else if (i === 3) angle = baseAngle + Math.PI;
    }
    if (w.melee) {
      for (const e of state.enemies) {
        if (dist(p, e) <= w.range + 10) {
          e.hp -= finalDmg * (1 + w.level * 0.15);
          e.knockback = { dx: (e.x - p.x) / Math.max(1, dist(p, e)) * 6, dy: (e.y - p.y) / Math.max(1, dist(p, e)) * 6, t: 12 };
        }
      }
      for (let k = 0; k < 5; k++) {
        const a = baseAngle + (Math.random() - 0.5) * 1.5;
        state.particles.push({ x: p.x + Math.cos(a) * 40, y: p.y + Math.sin(a) * 40, dx: Math.cos(a) * 2, dy: Math.sin(a) * 2, life: 12, maxLife: 12, color: '#ffdd00', sz: 5 });
      }
      return;
    }
    if (w.rotatingFire) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / (w.rotatingFire === 'dense' ? 3 : 4)) {
        state.bullets.push({ id: ++state._bid, x: p.x, y: p.y, dx: Math.cos(a) * 10, dy: Math.sin(a) * 10, dmg: finalDmg * 0.55, range: 240, traveled: 0, pierce: false, homing: null, poison: false, explosive: false, legendary: isLegendary, charId: p.charId, weaponLevel: w.level || 1 });
      }
    }
    const isPoison = w.poison || p.attachments.includes('suppressor');
    state.bullets.push({
      id: ++state._bid, x: p.x, y: p.y,
      dx: Math.cos(angle) * (w.spd || 12), dy: Math.sin(angle) * (w.spd || 12),
      dmg: finalDmg,
      range: w.range + (w.extraRange || 0),
      traveled: 0,
      pierce: w.pierce || false,
      homing: w.homing ? nearest : null,
      poison: isPoison,
      explosive: w.explosive || false,
      isGrenade: w.isGrenade || false,
      ghostPoison: p.charId === 'ghost',
      legendary: isLegendary,
      charId: p.charId,
      weaponLevel: w.level || 1,
    });
  }
}

function checkEvolution(state) {
  const wids = [...state.player.weapons.map(w => w.id), ...state.player.airdropWeapons];
  const aids = [...state.player.attachments, ...state.player.airdropItems];
  // Regular evos
  for (const key of Object.keys(EVOS)) {
    const [wid, aid] = key.split('+');
    if (wids.includes(wid) && aids.includes(aid) && !state.player.evolutions.includes(key)) {
      return { key, legendary: false };
    }
  }
  // Airdrop legendary evos
  for (const key of Object.keys(AIRDROP_EVOS)) {
    const [wid, aid] = key.split('+');
    if (wids.includes(wid) && aids.includes(aid) && !state.player.evolutions.includes(key)) {
      return { key, legendary: true };
    }
  }
  return null;
}

function applyEvolution(state, key, legendary) {
  state.player.evolutions.push(key);
  const [wid] = key.split('+');
  // Find in regular or airdrop weapons
  const w = state.player.weapons.find(w => w.id === wid);
  if (!w) return;
  w.evolved = key;
  w.legendary = w.legendary || legendary;
  w.dmg  = Math.floor(w.dmg * (legendary ? 2.2 : 1.85));
  w.range += legendary ? 180 : 120;
  w.rof  = Math.floor(w.rof * (legendary ? 0.65 : 0.72));

  // Regular evo effects
  if (key === 'dp28+comp')     w.rotatingFire = true;
  if (key === 's686+extMag')   w.explosive = true;
  if (key === 'xbow+scope8x')  w.homing = true;
  if (key === 'm416+comp')     { w.crossFire = true; w.proj = 4; }
  if (key === 'akm+extMag')    { w.fireMode = 'burst'; }
  if (key === 'kar98+scope8x') { w.spd = 22; w.range += 200; }
  if (key === 'ump+suppressor'){ w.proj = 3; w.spread *= 0.5; }

  // Legendary evo effects
  if (key === 'awm+thermal')    { w.pierce = true; w.spd = 28; w.range += 300; }
  if (key === 'groza+drumMag')  { w.proj = 6; w.spread = 0.35; w.rof = Math.floor(w.rof * 0.6); }
  if (key === 'mk14+thermal')   { w.pierce = true; w.critAlways = true; }
  if (key === 'm249+drumMag')   { w.rotatingFire = 'dense'; w.proj = 4; w.rof = Math.floor(w.rof * 0.5); }
  if (key === 'p90+adrenaline') { state.player.speed = Math.min(state.player.speed * 1.5, 8); w.rof = Math.floor(w.rof * 0.5); }
  if (key === 'awm+ghillie')    { w.pierce = true; state.player.charId = 'ghost'; /* stealth flag */ }
  if (key === 's686+drumMag')   { w.explosive = true; w.proj = 8; w.extraProj = 2; }
}

function getLevelupChoices(state) {
  const p = state.player;
  const wids = p.weapons.map(w => w.id);
  const pool = [];
  if (p.weapons.length < 4) {
    for (const [id, def] of Object.entries(WDEFS)) {
      if (!wids.includes(id)) pool.push({ type: 'weapon', id, label: def.name, sub: def.desc, icon: def.icon, rare: false });
    }
  }
  for (const w of p.weapons) {
    if (w.level < MAX_WEAPON_LEVEL) {
      pool.push({
        type: 'upgrade', wid: w.id,
        label: `${w.name} 강화 ${w.level}→${w.level + 1}`,
        sub: upgradeLabelSub(w),
        icon: w.level >= 4 ? '⭐' : '⬆️',
        rare: w.level >= 3,
      });
    }
  }
  if (p.attachments.length < 4) {
    for (const [id, def] of Object.entries(ADEFS)) {
      if (!p.attachments.includes(id)) pool.push({ type: 'att', id, label: def.name, sub: def.desc, icon: def.icon, rare: true });
    }
  }
  pool.push({ type: 'heal', label: '구급 처치', sub: 'HP +40 즉시 회복', icon: '💊', rare: false });
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

function applyChoice(state, choice) {
  const p = state.player;
  if (choice.type === 'weapon') {
    const wdef = WDEFS[choice.id];
    const newW = { ...wdef, id: choice.id, level: 1, shootTimer: 0, extraProj: 0, extraRange: 0, dmg: Math.floor(wdef.dmg * p.dmgMult) };
    if (p.charId === 'gunner') { newW.extraProj = 1; newW.rof = Math.floor(newW.rof * 0.70); }
    if (p.charId === 'sniper' && choice.id === 'kar98') { newW.pierce = true; newW.extraRange = 100; }
    p.weapons.push(newW);
  } else if (choice.type === 'upgrade') {
    const w = p.weapons.find(w => w.id === choice.wid);
    if (w && w.level < MAX_WEAPON_LEVEL) {
      const bonus = upgradeBonusForLevel(w.level + 1);
      w.level++;
      w.dmg       = Math.floor(w.dmg * bonus.dmgMult);
      w.rof       = Math.floor(w.rof * bonus.rofMult);
      w.range    += bonus.rangeAdd;
      w.extraProj = (w.extraProj || 0) + bonus.projAdd;
      if (bonus.legendary) { w.legendary = true; w.spread = (w.spread || 0) * 0.6; }
    }
  } else if (choice.type === 'att') {
    p.attachments.push(choice.id);
    if (choice.id === 'energyDrink') { p.speed = Math.min(p.speed * 1.2, 6); p.healRegen = Math.max(p.healRegen, 3); }
    if (choice.id === 'vestLv3')     { p.dmgReduce = Math.min(0.6, (p.dmgReduce || 0) + 0.4); }
    if (choice.id === 'extMag')      { p.weapons.forEach(w => { w.extraProj = (w.extraProj || 0) + 1; }); }
    if (choice.id === 'comp')        { p.weapons.forEach(w => { w.spread = (w.spread || 0) * 0.7; w.rof = Math.floor(w.rof * 0.85); }); }
    if (choice.id === 'scope8x')     { p.weapons.forEach(w => { w.extraRange = (w.extraRange || 0) + 200; w.dmg = Math.floor(w.dmg * 1.15); }); }
  } else if (choice.type === 'heal') {
    p.hp = Math.min(p.maxHp, p.hp + 40);
  }
  return checkEvolution(state);
}

// ── Apply airdrop item to player ─────────────────────────────
function applyAirdropItem(state, item) {
  const p = state.player;
  if (item.kind === 'weapon') {
    // Add legendary weapon (up to 4 total)
    if (p.weapons.length < 4) {
      const wdef = AIRDROP_WEAPONS[item.id];
      const newW = {
        ...wdef,
        id: item.id,
        level: 1,
        shootTimer: 0,
        extraProj: p.charId === 'gunner' ? 1 : 0,
        extraRange: 0,
        dmg: Math.floor(wdef.dmg * p.dmgMult),
        legendary: true,
      };
      p.weapons.push(newW);
      p.airdropWeapons.push(item.id);
    }
  } else {
    // Legendary item
    if (!p.airdropItems.includes(item.id)) {
      p.airdropItems.push(item.id);
      if (item.id === 'drumMag')    { p.weapons.forEach(w => { w.extraProj = (w.extraProj || 0) + 2; }); }
      if (item.id === 'thermal')    { p.weapons.forEach(w => { w.extraRange = (w.extraRange || 0) + 400; w.dmg = Math.floor(w.dmg * 1.30); }); }
      if (item.id === 'ghillie')    { p.dmgReduce = Math.min(0.75, (p.dmgReduce || 0) + 0.30); }
      if (item.id === 'adrenaline') { p.speed = Math.min(p.speed * 1.4, 8); p.healRegen = Math.max(p.healRegen, 8); }
      if (item.id === 'bzArmor')    { p.bzImmune = true; }
    }
  }
}

function updateGame(state) {
  if (state.phase !== 'playing') return;
  const p = state.player;

  p._rageActive = (p.charId === 'berserker' && p.hp < p.maxHp * 0.5);

  let dx = 0, dy = 0;
  if (state.keys.left)  dx -= 1;
  if (state.keys.right) dx += 1;
  if (state.keys.up)    dy -= 1;
  if (state.keys.down)  dy += 1;
  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    const mx = dx / len * p.speed, my = dy / len * p.speed;
    const PR = 14; // 플레이어 충돌 반경
    const nx = clamp(p.x + mx, 20, WW - 20);
    const ny = clamp(p.y + my, 20, WH - 20);
    // 충돌 슬라이딩: XY 동시 → X만 → Y만 순으로 시도
    const cXY = isBlocked(nx, ny-PR)||isBlocked(nx, ny+PR)||isBlocked(nx-PR, ny)||isBlocked(nx+PR, ny);
    if (!cXY) {
      p.x = nx; p.y = ny;
    } else {
      const cX = isBlocked(nx, p.y-PR)||isBlocked(nx, p.y+PR)||isBlocked(nx-PR, p.y)||isBlocked(nx+PR, p.y);
      if (!cX) p.x = nx;
      const cY = isBlocked(p.x, ny-PR)||isBlocked(p.x, ny+PR)||isBlocked(p.x-PR, ny)||isBlocked(p.x+PR, ny);
      if (!cY) p.y = ny;
    }
  }

  state.camera.x = clamp(p.x - CW / 2, 0, WW - CW);
  state.camera.y = clamp(p.y - CH / 2, 0, WH - CH);

  state.time++;
  state.elapsed = state.time / 60;
  if (state.elapsed >= MAX_TIME) { state.won = true; state.phase = 'result'; return; }

  if (p.healRegen > 0) p.hp = Math.min(p.maxHp, p.hp + p.healRegen / 60);
  if (p.invulnTime > 0) p.invulnTime--;

  // 블루존 (sqrt 없이 거리² 비교)
  const zone = state.zone;
  if (zone.r > zone.targetR) zone.r -= zone.shrinkRate;
  if (!p.bzImmune) {
    const zdx = p.x - zone.cx, zdy = p.y - zone.cy;
    if (zdx * zdx + zdy * zdy > zone.r * zone.r) p.hp -= zone.damage / 60;
  }

  // ── Airdrop timer ──
  state.airdropTimer--;
  if (state.airdropTimer <= 0) {
    spawnAirdrop(state);
    state.airdropTimer = randInt(AIRDROP_INTERVAL_MIN, AIRDROP_INTERVAL_MAX);
  }
  // 알림 인플레이스 감소 (매 프레임 객체 생성 제거)
  for (let i = state.notifications.length - 1; i >= 0; i--) {
    if (--state.notifications[i].time <= 0) state.notifications.splice(i, 1);
  }

  // ── Update airdrops (dist², in-place splice) ──
  const acR2 = AIRDROP_COLLECT_R * AIRDROP_COLLECT_R;
  for (let i = state.airdrops.length - 1; i >= 0; i--) {
    const drop = state.airdrops[i];
    drop.age++;
    if (drop.falling > 0) drop.falling--;
    if (drop.falling === 0 && !drop.collected) {
      const ddx = p.x - drop.x, ddy = p.y - drop.y;
      if (ddx * ddx + ddy * ddy < acR2) {
        const log = drop.contents.map(it => it.def ? `${it.def.icon} ${it.def.name}` : '').join(', ');
        drop.contents.forEach(it => applyAirdropItem(state, it));
        const evoResult = checkEvolution(state);
        if (evoResult) { state.evoKey = evoResult.key; state.evoLegendary = evoResult.legendary; state.phase = 'evo'; }
        drop.collected = true;
        state.pickupLog.push({ text: `📦 보급품 획득! ${log}`, time: state.time });
      }
    }
    if (drop.collected || drop.age >= AIRDROP_EXPIRE) state.airdrops.splice(i, 1);
  }
  for (let i = state.pickupLog.length - 1; i >= 0; i--) { if (state.time - state.pickupLog[i].time >= 300) state.pickupLog.splice(i, 1); }

  // ── Spawn enemies ──
  // 10분 이후: 적 수 고정 + HP만 상승 (렉 방지)
  const ENEMY_CAP = state.elapsed < 600 ? 120 : 100;
  state.spawnTimer++;
  const phase = getPhase(state.elapsed);
  let spawnInterval, batchSize;
  if (state.elapsed >= 600) {
    // 10분+: 스폰 속도/수 고정, 빠진 만큼만 보충
    spawnInterval = 40;
    batchSize = 3;
  } else {
    const phaseSpawnMult = [1.0, 1.4][Math.min(1, phase)];
    spawnInterval = Math.max(22, Math.round((150 - state.elapsed * 0.16 - p.level * 2) / phaseSpawnMult));
    batchSize = Math.min(6, 1 + Math.floor(state.elapsed / 80) + Math.floor(p.level / 5));
  }
  if (state.spawnTimer >= spawnInterval && state.enemies.length < ENEMY_CAP) {
    state.spawnTimer = 0;
    const canSpawn = ENEMY_CAP - state.enemies.length;
    for (let i = 0; i < Math.min(batchSize, canSpawn); i++) spawnEnemy(state, getSpawnType(state.elapsed));
  }

  // ── Boss spawns ──
  const curSec = Math.floor(state.elapsed);
  if (state.time % 60 === 0) {
    if (state.megaBossTimes.has(curSec)) {
      state.megaBossTimes.delete(curSec);
      spawnEnemy(state, 'megaBoss');
      state.notifications.push({ id: ++state._nid, icon: '☠️', title: 'MEGA BOSS 출현!', sub: '극도로 강력한 보스가 나타났다!', color: '#7c3aed', time: 300 });
    } else if (state.eliteBossTimes.has(curSec)) {
      state.eliteBossTimes.delete(curSec);
      spawnEnemy(state, 'eliteBoss');
      state.notifications.push({ id: ++state._nid, icon: '💀', title: 'ELITE BOSS 출현!', sub: '강화된 보스가 나타났다', color: '#dc2626', time: 240 });
    } else if (state.bossTimes.has(curSec)) {
      state.bossTimes.delete(curSec);
      spawnEnemy(state, 'boss');
      state.notifications.push({ id: ++state._nid, icon: '⚠️', title: 'BOSS 출현!', sub: '강력한 적이 나타났다', color: '#ea580c', time: 180 });
    }
  }
  if (p.level > 1 && p.level % 5 === 0 && state._lastBossLevel !== p.level) {
    state._lastBossLevel = p.level;
    const btype = phase >= 3 ? 'megaBoss' : phase >= 2 ? 'eliteBoss' : 'boss';
    spawnEnemy(state, btype);
    const bicons = { boss:'⚠️', eliteBoss:'💀', megaBoss:'☠️' };
    const bnames = { boss:'BOSS', eliteBoss:'ELITE BOSS', megaBoss:'MEGA BOSS' };
    const bcolors = { boss:'#ea580c', eliteBoss:'#dc2626', megaBoss:'#7c3aed' };
    state.notifications.push({ id: ++state._nid, icon: bicons[btype], title: `${bnames[btype]} 출현!`, sub: `레벨 ${p.level} 달성 보스`, color: bcolors[btype], time: 210 });
  }

  const xpAttract = XP_ATTRACT_BASE + (p.charId === 'runner' ? 40 : 0);
  const xpA2 = xpAttract * xpAttract;

  // ── 적 업데이트 (swap-remove + dist² 재사용) ──
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const e = state.enemies[i];
    if (e.hp <= 0) {
      // XP오브: 최대 2개 (보스 3개)
      const orbCount = e.boss ? 3 : Math.min(2, Math.ceil(e.xp / 20));
      const orbVal = Math.ceil(e.xp / orbCount);
      for (let k = 0; k < orbCount; k++)
        state.xpOrbs.push({ x: e.x + rand(-14, 14), y: e.y + rand(-14, 14), value: orbVal });
      // 파티클: 보스 4개, 일반 2개
      const ptCount = e.boss ? 4 : 2;
      for (let k = 0; k < ptCount; k++) {
        const a = Math.random() * Math.PI * 2;
        state.particles.push({ x: e.x, y: e.y, dx: Math.cos(a) * rand(1.5, 3.5), dy: Math.sin(a) * rand(1.5, 3.5), life: 14, maxLife: 14, color: e.boss ? '#ff4444' : '#ff9944', sz: (rand(3, 7) | 0) });
      }
      state.kills++; state.score += e.xp;
      state.enemies[i] = state.enemies[state.enemies.length - 1]; state.enemies.pop(); continue;
    }
    if (e.knockback) {
      e.x += e.knockback.dx; e.y += e.knockback.dy; e.knockback.t--;
      if (e.knockback.t <= 0) e.knockback = null;
    } else {
      const ddx = p.x - e.x, ddy = p.y - e.y;
      const d2 = ddx * ddx + ddy * ddy;
      if (d2 > 1) { const d = Math.sqrt(d2); e.x += ddx / d * e.spd; e.y += ddy / d * e.spd; }
      // 타격 판정 (동일 d2 재사용)
      const hitR = e.sz + 13;
      if (d2 < hitR * hitR && p.invulnTime <= 0) {
        p.hp -= e.dmg * (1 - (p.dmgReduce || 0));
        p.invulnTime = 45;
        if (p.hp <= 0) { state.phase = 'result'; state.gameOver = true; return; }
      }
    }
    if (e.poisoned > 0) { e.hp -= 6 / 60; e.poisoned--; }
    e.x = clamp(e.x, 10, WW - 10); e.y = clamp(e.y, 10, WH - 10);
  }
  if (state.enemies.length > 300) state.enemies.length = 300;

  // ── 공간 분할 그리드 빌드 (총알-적 O(n²) → O(n)) ──
  _enemyGrid.clear();
  for (const e of state.enemies) {
    const key = ((e.x / GRID_CELL) | 0) * 10000 + ((e.y / GRID_CELL) | 0);
    let cell = _enemyGrid.get(key);
    if (!cell) { cell = []; _enemyGrid.set(key, cell); }
    cell.push(e);
  }

  // ── 총알 업데이트 (공간 분할 + swap-remove) ──
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    if (b.homing) {
      const tgt = state.enemies.find(e => e.id === b.homing.id) || state.enemies[0];
      if (tgt) { const ba = Math.atan2(tgt.y - b.y, tgt.x - b.x); b.dx = lerp(b.dx, Math.cos(ba) * 9, 0.12); b.dy = lerp(b.dy, Math.sin(ba) * 9, 0.12); }
    }
    b.x += b.dx; b.y += b.dy; b.traveled += Math.hypot(b.dx, b.dy);
    if (b.traveled > b.range || b.x < 0 || b.x > WW || b.y < 0 || b.y > WH) {
      if (b.isGrenade) {
        // 수류탄 사거리 도달 → grid 기반 폭발
        const gbcx=(b.x/GRID_CELL)|0,gbcy=(b.y/GRID_CELL)|0;
        for (let gcx=gbcx-2;gcx<=gbcx+2;gcx++) for (let gcy=gbcy-2;gcy<=gbcy+2;gcy++) {
          const gcell=_enemyGrid.get(gcx*10000+gcy); if (!gcell) continue;
          for (const e2 of gcell) { const edx=b.x-e2.x,edy=b.y-e2.y; if (edx*edx+edy*edy<7225) e2.hp-=b.dmg; }
        }
        for (let k = 0; k < 8; k++) { const a = Math.random()*Math.PI*2, spd = rand(2,5); state.particles.push({ x:b.x, y:b.y, dx:Math.cos(a)*spd, dy:Math.sin(a)*spd, life:18, maxLife:18, color: k%2===0?'#ff8800':'#ffdd00', sz: rand(3,6) }); }
      }
      state.bullets[i] = state.bullets[state.bullets.length - 1]; state.bullets.pop(); continue;
    }
    const bcx = (b.x / GRID_CELL) | 0, bcy = (b.y / GRID_CELL) | 0;
    let dead = false;
    outer: for (let cx = bcx - 1; cx <= bcx + 1; cx++) {
      for (let cy = bcy - 1; cy <= bcy + 1; cy++) {
        const cell = _enemyGrid.get(cx * 10000 + cy);
        if (!cell) continue;
        for (const e of cell) {
          const r = e.sz + 3, bdx = b.x - e.x, bdy = b.y - e.y;
          if (bdx * bdx + bdy * bdy < r * r) {
            e.hp -= b.dmg;
            if (b.poison) e.poisoned = b.ghostPoison ? 360 : 180;
            if (b.explosive) {
              const blastR2 = 7225; // 85px 반경
              // 공간 분할 그리드로 AOE 탐색 (O(n) → O(근방))
              const ebcx = (b.x / GRID_CELL) | 0, ebcy = (b.y / GRID_CELL) | 0;
              for (let ecx2 = ebcx-2; ecx2 <= ebcx+2; ecx2++) for (let ecy2 = ebcy-2; ecy2 <= ebcy+2; ecy2++) {
                const ecell = _enemyGrid.get(ecx2*10000+ecy2); if (!ecell) continue;
                for (const e2 of ecell) { const edx=b.x-e2.x,edy=b.y-e2.y; if (edx*edx+edy*edy<blastR2) e2.hp-=b.dmg*0.45; }
              }
              if (b.isGrenade) {
                for (let k = 0; k < 18; k++) { const a = Math.random()*Math.PI*2, spd = rand(2,6); state.particles.push({ x:b.x, y:b.y, dx:Math.cos(a)*spd, dy:Math.sin(a)*spd, life:22, maxLife:22, color: k%3===0?'#ff8800':k%3===1?'#ffdd00':'#ff4400', sz: rand(3,7) }); }
              }
            }
            if (!b.pierce) { dead = true; break outer; }
          }
        }
      }
    }
    if (dead) { state.bullets[i] = state.bullets[state.bullets.length - 1]; state.bullets.pop(); }
  }
  if (state.bullets.length > 180) state.bullets.length = 180;

  for (const w of p.weapons) {
    w.shootTimer = (w.shootTimer || 0) + 1;
    const rofFrames = (w.rof / 1000) * 60;
    if (w.shootTimer >= rofFrames) { w.shootTimer = 0; shootWeapon(state, w); }
  }

  // ── XP 오브 수집 (dist², swap-remove) ──
  for (let i = state.xpOrbs.length - 1; i >= 0; i--) {
    const orb = state.xpOrbs[i];
    const odx = p.x - orb.x, ody = p.y - orb.y;
    if (odx * odx + ody * ody < xpA2) {
      p.xp += orb.value;
      state.xpOrbs[i] = state.xpOrbs[state.xpOrbs.length - 1]; state.xpOrbs.pop();
    }
  }
  if (state.xpOrbs.length > 220) state.xpOrbs.length = 220;

  // ── 파티클 (swap-remove) ──
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const pt = state.particles[i]; pt.x += pt.dx; pt.y += pt.dy;
    if (--pt.life <= 0) { state.particles[i] = state.particles[state.particles.length - 1]; state.particles.pop(); }
  }
  if (state.particles.length > 100) state.particles.length = 100;

  if (p.xp >= p.xpNext) {
    p.xp -= p.xpNext; p.xpNext = Math.floor(p.xpNext * 1.28);
    p.level++; p.hp = Math.min(p.maxHp, p.hp + 25);
    state.levelupChoices = getLevelupChoices(state);
    state.phase = 'levelup';
  }
}

// ═══════════════════════════════════════════════════════════════
// REACT COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function PubgSurvivors() {
  const canvasRef  = useRef(null);
  const stateRef   = useRef(null);
  const rafRef     = useRef(null);
  const joystickRef = useRef({ active: false, id: null, sx: 0, sy: 0, cx: 0, cy: 0 });
  const [joyPos, setJoyPos] = useState(null); // {sx,sy,cx,cy} for visual
  const [scale, setScale]   = useState(1);
  const [selectedChar, setSelectedChar] = useState(null);
  const [showSysGuide, setShowSysGuide] = useState(false);
  const [sysGuideTab, setSysGuideTab] = useState('evo');
  const [uiState, setUiState] = useState({
    phase: 'charSelect', levelupChoices: [], evoKey: null, evoLegendary: false,
    player: null, elapsed: 0, score: 0, kills: 0, won: false,
    notifications: [], pickupLog: [],
  });

  const startGame = (charId) => {
    const game = initGame(charId);
    game.phase = 'playing';
    stateRef.current = game;
    setUiState(s => ({ ...s, phase: 'playing' }));
  };

  const handleCharSelect = (charId) => {
    setSelectedChar(charId);
    startGame(charId);
  };

  const handleRestart = () => {
    stateRef.current = null;
    _collisionGrid = null; // 재시작 시 충돌 그리드 재빌드
    setSelectedChar(null);
    setUiState({ phase: 'charSelect', levelupChoices: [], evoKey: null, evoLegendary: false, player: null, elapsed: 0, score: 0, kills: 0, won: false, notifications: [], pickupLog: [] });
  };

  const handleChoice = (choice) => {
    const state = stateRef.current;
    if (!state) return;
    const evoResult = applyChoice(state, choice);
    if (evoResult) {
      state.evoKey = evoResult.key;
      state.evoLegendary = evoResult.legendary;
      state.phase = 'evo';
      setUiState(s => ({ ...s, phase: 'evo', evoKey: evoResult.key, evoLegendary: evoResult.legendary }));
    } else {
      state.phase = 'playing';
      setUiState(s => ({ ...s, phase: 'playing', evoKey: null }));
    }
  };

  const handleEvoConfirm = () => {
    const state = stateRef.current;
    if (!state || !state.evoKey) return;
    applyEvolution(state, state.evoKey, state.evoLegendary);
    state.evoKey = null;
    state.phase = 'playing';
    setUiState(s => ({ ...s, phase: 'playing', evoKey: null }));
  };

  const handleSkip = () => {
    const state = stateRef.current;
    if (!state || state.player.skipCount <= 0) return;
    state.player.skipCount--;
    state.phase = 'playing';
    setUiState(s => ({ ...s, phase: 'playing' }));
  };

  // ── 모바일 scale (화면 크기에 맞게 canvas 축소) ──────────────
  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth - 16;
      const vh = window.innerHeight - 130; // 헤더/여백
      const s = Math.min(1, vw / CW, vh / CH);
      setScale(Math.round(s * 100) / 100);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  // ── 터치 조이스틱 ──────────────────────────────────────────
  const handleTouchStart = useCallback((e) => {
    const state = stateRef.current;
    if (!state || state.phase !== 'playing') return;
    for (const t of e.changedTouches) {
      const rect = e.currentTarget.getBoundingClientRect();
      const tx = (t.clientX - rect.left) / scale;
      const ty = (t.clientY - rect.top)  / scale;
      if (tx < CW / 2 && !joystickRef.current.active) {
        joystickRef.current = { active: true, id: t.identifier, sx: tx, sy: ty, cx: tx, cy: ty };
        setJoyPos({ sx: tx, sy: ty, cx: tx, cy: ty });
      }
    }
  }, [scale]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    const state = stateRef.current;
    if (!state || state.phase !== 'playing') return;
    const jk = joystickRef.current;
    for (const t of e.changedTouches) {
      if (t.identifier !== jk.id) continue;
      const rect = e.currentTarget.getBoundingClientRect();
      jk.cx = (t.clientX - rect.left) / scale;
      jk.cy = (t.clientY - rect.top)  / scale;
      const ddx = jk.cx - jk.sx, ddy = jk.cy - jk.sy;
      const DEAD = 10;
      state.keys.left  = ddx < -DEAD;
      state.keys.right = ddx >  DEAD;
      state.keys.up    = ddy < -DEAD;
      state.keys.down  = ddy >  DEAD;
      setJoyPos({ sx: jk.sx, sy: jk.sy, cx: jk.cx, cy: jk.cy });
    }
  }, [scale]);

  const handleTouchEnd = useCallback((e) => {
    const jk = joystickRef.current;
    for (const t of e.changedTouches) {
      if (t.identifier !== jk.id) continue;
      joystickRef.current = { active: false, id: null, sx: 0, sy: 0, cx: 0, cy: 0 };
      setJoyPos(null);
      const state = stateRef.current;
      if (state) state.keys.left = state.keys.right = state.keys.up = state.keys.down = false;
    }
  }, []);

  // 키보드에서 접근하기 위한 stable ref
  const handleChoiceRef = useRef(null);
  const handleEvoRef = useRef(null);
  const handleSkipRef = useRef(null);
  handleChoiceRef.current = handleChoice;
  handleEvoRef.current = handleEvoConfirm;
  handleSkipRef.current = handleSkip;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const loop = () => {
      const state = stateRef.current;
      if (state && state.phase === 'playing') {
        updateGame(state);
        ctx.clearRect(0, 0, CW, CH);
        const cam = state.camera;
        drawWorld(ctx, cam, state.world);
        for (const orb of state.xpOrbs) drawXPOrb(ctx, orb, cam);
        // Draw airdrops (behind bullets)
        for (const drop of state.airdrops) drawAirdrop(ctx, drop, cam, state.time);
        for (const b of state.bullets) drawBullet(ctx, b, cam);
        for (const e of state.enemies) drawEnemy(ctx, e, cam);
        drawPlayer(ctx, state.player, cam);
        for (const pt of state.particles) drawParticle(ctx, pt, cam);
        drawZone(ctx, cam, state.zone);
        drawMinimap(ctx, state);

        if (state.phase !== 'playing') {
          setUiState({
            phase: state.phase,
            levelupChoices: state.levelupChoices || [],
            evoKey: state.evoKey || null,
            evoLegendary: state.evoLegendary || false,
            player: { ...state.player },
            elapsed: state.elapsed,
            score: state.score,
            kills: state.kills,
            won: state.won || false,
            notifications: [...state.notifications],
            pickupLog: [...state.pickupLog],
          });
        }
        if (state.time % 30 === 0) {
          setUiState(s => ({
            ...s,
            player: {
              ...state.player,
              weapons: state.player.weapons.map(w => ({ ...w })),
              attachments: [...state.player.attachments],
              airdropItems: [...state.player.airdropItems],
            },
            elapsed: state.elapsed,
            score: state.score,
            kills: state.kills,
            enemyCount: state.enemies.length,
            rageActive: state.player._rageActive,
            notifications: [...state.notifications],
            pickupLog: [...state.pickupLog],
          }));
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    const GAME_KEYS = ['arrowleft','arrowright','arrowup','arrowdown','a','d','w','s',' '];
    const onKey = (e, down) => {
      const state = stateRef.current;
      if (!state) return;
      const k = e.key.toLowerCase();
      if (GAME_KEYS.includes(k) && state.phase === 'playing') e.preventDefault();
      if (k === 'arrowleft'  || k === 'a') state.keys.left  = down;
      if (k === 'arrowright' || k === 'd') state.keys.right = down;
      if (k === 'arrowup'    || k === 'w') state.keys.up    = down;
      if (k === 'arrowdown'  || k === 's') state.keys.down  = down;
      // 레벨업 키보드 선택
      if (down && state.phase === 'levelup') {
        e.preventDefault();
        const choices = state.levelupChoices || [];
        if (k === '1' && choices[0]) handleChoiceRef.current(choices[0]);
        if (k === '2' && choices[1]) handleChoiceRef.current(choices[1]);
        if (k === '3' && choices[2]) handleChoiceRef.current(choices[2]);
        if (k === 'z' && state.player.skipCount > 0) handleSkipRef.current();
      }
      // 진화 확인
      if (down && state.phase === 'evo' && (k === 'enter' || k === ' ')) {
        e.preventDefault();
        handleEvoRef.current();
      }
    };
    const kd = (e) => onKey(e, true);
    const ku = (e) => onKey(e, false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, []);

  const fmtTime = (sec) => `${Math.floor(sec / 60)}:${(Math.floor(sec) % 60).toString().padStart(2, '0')}`;
  const p = uiState.player;

  const StatBar = ({ label, value, max, color }) => (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-gray-400 w-7 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>PUBG 서바이버 - PK.GG</title>
        <meta name="description" content="PUBG 테마 뱀파이어 서바이벌 게임" />
      </Head>
      <div className="min-h-screen bg-gray-950 text-white">
        <Header />
        <div className="flex flex-col items-center pt-4 pb-8 px-4">
          <h1 className="text-2xl font-bold mb-1 text-yellow-400">PUBG 서바이버</h1>
          <p className="text-gray-400 text-sm mb-4">PUBG 무기로 20분 생존하라</p>

          {/* 모바일 scale 래퍼 */}
          <div style={{ width: CW * scale, height: CH * scale, overflow: 'hidden' }}>
          <div style={{ width: CW, height: CH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <div className="relative" style={{ width: CW, height: CH }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}>
            <canvas ref={canvasRef} width={CW} height={CH}
              className="block rounded-lg border border-gray-700"
              style={{ imageRendering: 'pixelated', touchAction: 'none' }} />

            {/* 터치 조이스틱 오버레이 */}
            {joyPos && uiState.phase === 'playing' && (
              <svg className="absolute inset-0 pointer-events-none" width={CW} height={CH}>
                {/* 외곽 원 */}
                <circle cx={joyPos.sx} cy={joyPos.sy} r={52}
                  fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.25)" strokeWidth="2"/>
                {/* 내부 dot */}
                <circle
                  cx={Math.min(joyPos.sx+52, Math.max(joyPos.sx-52, joyPos.cx))}
                  cy={Math.min(joyPos.sy+52, Math.max(joyPos.sy-52, joyPos.cy))}
                  r={22} fill="rgba(255,255,255,0.35)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"/>
              </svg>
            )}

            {/* ── Character Select ── */}
            {uiState.phase === 'charSelect' && (
              <div className="absolute inset-0 flex flex-col items-center bg-gray-950/97 rounded-lg overflow-y-auto py-5">
                <div className="text-yellow-400 text-2xl font-black tracking-wider mb-1">⚔ 캐릭터 선택</div>
                <p className="text-gray-400 text-sm mb-4">플레이 스타일에 맞는 캐릭터를 선택하세요</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-4">
                  {Object.entries(CHARS).map(([id, ch]) => (
                    <button key={id} onClick={() => handleCharSelect(id)}
                      className="flex flex-col items-start p-3 rounded-xl border-2 border-gray-700 hover:border-yellow-400 bg-gray-800/60 hover:bg-gray-700/60 transition-all hover:scale-105">
                      <div className="w-full flex items-center justify-between mb-2">
                        <div className="w-12 h-12 rounded-lg overflow-hidden border flex items-center justify-center text-3xl"
                          style={{ borderColor: ch.accentC + '60', backgroundColor: ch.color + '30' }}>
                          <img src={`/characters/${id}.png`} alt={ch.name}
                            className="w-full h-full object-contain"
                            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }}
                          />
                          <span style={{ display:'none' }}>{ch.icon}</span>
                        </div>
                        <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                          style={{ borderColor: ch.accentC, backgroundColor: ch.color + '40', color: ch.accentC }}>
                          {ch.name.slice(0, 2)}
                        </div>
                      </div>
                      <div className="text-white font-bold text-sm leading-tight">{ch.name}</div>
                      <div className="text-xs mb-1" style={{ color: ch.accentC }}>{ch.title}</div>
                      <div className="text-gray-400 text-[10px] mb-2 leading-snug">{ch.desc}</div>
                      <div className="w-full space-y-1">
                        <StatBar label="HP"  value={ch.startHp}  max={180}  color="#ef4444" />
                        <StatBar label="SPD" value={ch.startSpd} max={3.8}  color="#60a5fa" />
                        <StatBar label="DMG" value={ch.dmgMult}  max={1.25} color="#fb923c" />
                      </div>
                      <div className="mt-2 flex items-center gap-1 bg-gray-900/60 rounded px-1.5 py-0.5 w-full">
                        <span className="text-xs">{WDEFS[ch.weapon]?.icon}</span>
                        <span className="text-[10px] text-gray-300">{WDEFS[ch.weapon]?.name}</span>
                      </div>
                      <div className="mt-1.5 text-[9px] leading-snug" style={{ color: ch.accentC + 'cc' }}>✦ {ch.passive}</div>
                      <div className="mt-0.5 text-[9px] text-gray-500">⚠ {ch.weakDesc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── HUD (playing) ── */}
            {uiState.phase === 'playing' && p && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-2 left-2 right-32">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-red-400 w-6">HP</span>
                    <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(p.hp / p.maxHp) * 100}%`, background: p.hp > p.maxHp * 0.5 ? '#44dd66' : p.hp > p.maxHp * 0.25 ? '#ffaa00' : '#ff4444' }} />
                    </div>
                    <span className="text-xs text-gray-300 w-20">{Math.ceil(p.hp)}/{p.maxHp}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-teal-400 w-6">XP</span>
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                      <div className="h-full bg-teal-400 rounded-full" style={{ width: `${(p.xp / p.xpNext) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-20">Lv.{p.level}</span>
                  </div>
                </div>

                {/* Timer + char */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 text-center">
                  <div className="text-yellow-400 font-mono font-bold text-lg">{fmtTime(uiState.elapsed)} / 20:00</div>
                  <div className="text-gray-300 text-xs">💀 {uiState.kills} | ⭐ {uiState.score?.toLocaleString()}</div>
                  {p.charId && CHARS[p.charId] && (
                    <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5 border"
                      style={{ borderColor: CHARS[p.charId].accentC + '80', color: CHARS[p.charId].accentC, backgroundColor: CHARS[p.charId].color + '30' }}>
                      {CHARS[p.charId].icon} {CHARS[p.charId].name}
                    </div>
                  )}
                </div>

                {/* Berserker rage */}
                {uiState.rageActive && (
                  <div className="absolute top-14 left-1/2 -translate-x-1/2 text-[11px] font-bold text-orange-400 bg-orange-950/80 border border-orange-700 rounded px-2 py-0.5 animate-pulse">
                    🔥 RAGE ACTIVE — 피해 +50%
                  </div>
                )}

                {/* Card news notifications (top-right, below minimap ~128px) */}
                <div className="absolute right-2 flex flex-col gap-1.5 pointer-events-none" style={{ top: 134, width: 168 }}>
                  {(uiState.notifications || []).map(n => (
                    <div key={n.id} className="flex items-start gap-2 rounded-lg px-2.5 py-2 shadow-lg bg-gray-950/90 border-l-4" style={{ borderColor: n.color }}>
                      <span className="text-lg leading-none mt-0.5">{n.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white leading-tight">{n.title}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{n.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pickup log */}
                <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
                  {uiState.pickupLog?.slice(-2).map((log, i) => (
                    <div key={i} className="text-xs text-yellow-300 bg-yellow-950/80 border border-yellow-600/50 rounded px-3 py-1">
                      {log.text}
                    </div>
                  ))}
                </div>

                {/* Weapons bar */}
                <div className="absolute bottom-2 left-2 flex gap-2">
                  {p.weapons.map((w, i) => {
                    const evoKey = p.evolutions.find(k => k.startsWith(w.id + '+'));
                    const evo = evoKey ? (EVOS[evoKey] || AIRDROP_EVOS[evoKey]) : null;
                    const isLegendary = w.legendary || (evo && AIRDROP_EVOS[evoKey]);
                    return (
                      <div key={i} className={`flex flex-col items-center px-2 py-1 rounded border text-xs ${evo ? (isLegendary ? 'border-purple-400 bg-purple-900/50' : 'border-yellow-400 bg-yellow-900/40') : (w.legendary ? 'border-purple-500/70 bg-purple-950/50' : 'border-gray-600 bg-gray-900/70')}`}>
                        <span className="text-base">{evo ? evo.icon : w.icon}</span>
                        <span className={`font-bold ${isLegendary ? 'text-purple-300' : 'text-white'}`}>{evo ? evo.name : w.name}</span>
                        <span className={`text-[10px] ${w.level >= 5 ? 'text-yellow-400' : w.level >= 4 ? 'text-orange-400' : 'text-gray-400'}`}>Lv.{w.level}{w.level >= 5 ? '⭐' : ''}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Attachments + legendary items */}
                <div className="absolute bottom-2 right-2 flex gap-1">
                  {p.attachments.map((aid, i) => (
                    <div key={`att-${i}`} className="w-8 h-8 flex items-center justify-center bg-gray-800/80 border border-gray-600 rounded text-sm" title={ADEFS[aid]?.name}>
                      {ADEFS[aid]?.icon}
                    </div>
                  ))}
                  {p.airdropItems?.map((iid, i) => (
                    <div key={`air-${i}`} className="w-8 h-8 flex items-center justify-center bg-yellow-900/60 border border-yellow-500 rounded text-sm" title={AIRDROP_ITEMS[iid]?.name}>
                      {AIRDROP_ITEMS[iid]?.icon}
                    </div>
                  ))}
                </div>

                {/* Enemy count */}
                <div className="absolute top-2 right-36 text-xs text-gray-400 text-right">
                  <div>적 {uiState.enemyCount ?? 0}마리</div>
                </div>


                {/* Zone warning */}
                {stateRef.current && (() => {
                  const st = stateRef.current;
                  const dz = dist(st.player, { x: st.zone.cx, y: st.zone.cy });
                  return dz > st.zone.r ? (
                    <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-blue-900/80 border border-blue-400 rounded px-3 py-1 text-blue-300 text-sm font-bold animate-pulse">
                      ⚠️ 블루존 피해{st.player.bzImmune ? ' (면역)' : ''}
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* ── Level Up ── */}
            {uiState.phase === 'levelup' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/90 rounded-lg">
                <div className="text-yellow-400 text-2xl font-bold mb-1">⬆️ 레벨 업!</div>
                <p className="text-gray-400 text-sm mb-5">업그레이드를 선택하세요 <span className="text-gray-600 text-xs">(키보드 1 / 2 / 3)</span></p>
                <div className="flex flex-col sm:flex-row gap-3">
                  {uiState.levelupChoices.map((ch, i) => (
                    <button key={i} onClick={() => handleChoice(ch)}
                      className={`w-48 p-4 rounded-xl border-2 text-left transition-all hover:scale-105 ${
                        ch.rare && ch.type === 'upgrade' ? 'border-orange-400 bg-orange-900/40 hover:bg-orange-800/60'
                        : ch.rare ? 'border-purple-400 bg-purple-900/40 hover:bg-purple-800/60'
                        : 'border-gray-500 bg-gray-800/80 hover:bg-gray-700/80'
                      }`}>
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-2xl">{ch.icon}</span>
                        <span className="text-xs font-bold bg-gray-700 text-gray-300 rounded px-1.5 py-0.5">{i + 1}</span>
                      </div>
                      <div className={`font-bold text-sm mb-1 ${ch.rare && ch.type === 'upgrade' ? 'text-orange-300' : ch.rare ? 'text-purple-300' : 'text-white'}`}>{ch.label}</div>
                      <div className="text-gray-400 text-xs leading-snug">{ch.sub}</div>
                      {ch.rare && ch.type !== 'upgrade' && <div className="text-purple-400 text-xs mt-1">✨ 부착물</div>}
                      {ch.rare && ch.type === 'upgrade' && <div className="text-orange-400 text-xs mt-1">🔥 강화</div>}
                    </button>
                  ))}
                </div>
                {/* 건너뛰기 */}
                <div className="mt-5 flex flex-col items-center gap-1">
                  <button
                    onClick={handleSkip}
                    disabled={!uiState.player || uiState.player.skipCount <= 0}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                      uiState.player?.skipCount > 0
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                        : 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-50'
                    }`}>
                    건너뛰기 <span className="text-xs ml-1 text-gray-400">[Z] — 남은 횟수: {uiState.player?.skipCount ?? 2}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── Evolution ── */}
            {uiState.phase === 'evo' && uiState.evoKey && (() => {
              const evo = EVOS[uiState.evoKey] || AIRDROP_EVOS[uiState.evoKey];
              const [wid, aid] = uiState.evoKey.split('+');
              const isLegendary = uiState.evoLegendary;
              return (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/95 rounded-lg">
                  <div className="text-5xl mb-3 animate-bounce">{evo.icon}</div>
                  <div className={`text-xl font-bold mb-1 ${isLegendary ? 'text-purple-400' : 'text-yellow-400'}`}>
                    {isLegendary ? '🌟 전설 진화!' : '진화 가능!'}
                  </div>
                  <div className={`text-2xl font-bold mb-2 ${isLegendary ? 'text-purple-200' : 'text-white'}`}>{evo.name}</div>
                  <div className="text-gray-400 mb-1 text-sm">
                    {(WDEFS[wid] || AIRDROP_WEAPONS[wid])?.name} + {(ADEFS[aid] || AIRDROP_ITEMS[aid])?.name}
                  </div>
                  <div className={`border rounded-lg px-6 py-3 mb-6 text-center ${isLegendary ? 'bg-purple-950/60 border-purple-500' : 'bg-gray-800 border-yellow-500'}`}>
                    <p className={`font-bold ${isLegendary ? 'text-purple-300' : 'text-yellow-300'}`}>{evo.desc}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      피해 {isLegendary ? '+120%' : '+85%'} · 사거리 {isLegendary ? '+180' : '+120'}
                    </p>
                    {isLegendary && <p className="text-purple-400 text-xs mt-1">★ 전설급 특수 효과 적용</p>}
                  </div>
                  <button onClick={handleEvoConfirm}
                    className={`px-8 py-3 font-bold rounded-lg text-lg ${isLegendary ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-yellow-500 hover:bg-yellow-400 text-black'}`}>
                    진화 시키기!
                  </button>
                </div>
              );
            })()}

            {/* ── Result ── */}
            {uiState.phase === 'result' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/95 rounded-lg">
                <div className="text-5xl mb-3">{uiState.won ? '🏆' : '💀'}</div>
                {selectedChar && CHARS[selectedChar] && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-lg border"
                    style={{ borderColor: CHARS[selectedChar].accentC + '60', backgroundColor: CHARS[selectedChar].color + '25' }}>
                    <span className="text-xl">{CHARS[selectedChar].icon}</span>
                    <div>
                      <div className="text-white font-bold text-sm">{CHARS[selectedChar].name}</div>
                      <div className="text-xs" style={{ color: CHARS[selectedChar].accentC }}>{CHARS[selectedChar].title}</div>
                    </div>
                  </div>
                )}
                <div className={`text-2xl font-bold mb-4 ${uiState.won ? 'text-yellow-400' : 'text-red-400'}`}>
                  {uiState.won ? '치킨 드셨나요? 🍗' : '게임 오버'}
                </div>
                <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 mb-4 w-72 space-y-3">
                  <div className="flex justify-between"><span className="text-gray-400">생존 시간</span><span className="text-white font-bold">{fmtTime(uiState.elapsed)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">킬 수</span><span className="text-white font-bold">{uiState.kills}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">점수</span><span className="text-yellow-400 font-bold">{uiState.score?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">레벨</span><span className="text-white font-bold">{p?.level || 1}</span></div>
                  {p && p.evolutions.length > 0 && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">진화한 무기</div>
                      <div className="flex gap-1.5 flex-wrap">
                        {p.evolutions.map(key => {
                          const evo = EVOS[key] || AIRDROP_EVOS[key];
                          const isLeg = !!AIRDROP_EVOS[key];
                          return <span key={key} className={`text-xs rounded px-2 py-0.5 ${isLeg ? 'bg-purple-900/40 border border-purple-500 text-purple-300' : 'bg-yellow-900/40 border border-yellow-600 text-yellow-300'}`}>{evo?.icon} {evo?.name}</span>;
                        })}
                      </div>
                    </div>
                  )}
                  {p && p.airdropItems?.length > 0 && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">획득 보급품</div>
                      <div className="flex gap-1.5 flex-wrap">
                        {p.airdropItems.map(iid => (
                          <span key={iid} className="text-xs bg-yellow-900/40 border border-yellow-600/50 rounded px-2 py-0.5 text-yellow-300">
                            {AIRDROP_ITEMS[iid]?.icon} {AIRDROP_ITEMS[iid]?.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => selectedChar && startGame(selectedChar)}
                    className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg">
                    같은 캐릭터로
                  </button>
                  <button onClick={handleRestart}
                    className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg">
                    캐릭터 재선택
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── 시스템 가이드 (접이식 카드) ── */}
          <div className="mt-6 w-full max-w-3xl">
            <button
              onClick={() => setShowSysGuide(v => !v)}
              className="w-full flex items-center justify-between px-5 py-3 rounded-xl border border-gray-600 bg-gray-800/80 hover:bg-gray-700/80 hover:border-yellow-500 transition-all group"
            >
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 text-lg">📖</span>
                <span className="text-white font-bold text-base">시스템 가이드</span>
                <span className="text-gray-400 text-xs">일반 진화 · 보급품 · 전설 진화 · 5단계 강화</span>
              </div>
              <span className="text-gray-400 group-hover:text-yellow-400 transition-colors text-sm font-bold">
                {showSysGuide ? '▲ 접기' : '▼ 펼치기'}
              </span>
            </button>

            {showSysGuide && (
              <div className="mt-2 rounded-xl border border-gray-700 bg-gray-900/95 overflow-hidden">
                {/* 탭 */}
                <div className="flex border-b border-gray-700">
                  {[
                    { key: 'evo',     label: '일반 진화',          icon: '⚡' },
                    { key: 'airdrop', label: '보급품 시스템',       icon: '📦' },
                    { key: 'legend',  label: '전설 진화',           icon: '🌟' },
                    { key: 'upgrade', label: '5단계 강화',          icon: '🔥' },
                  ].map(tab => (
                    <button key={tab.key} onClick={() => setSysGuideTab(tab.key)}
                      className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${sysGuideTab === tab.key ? 'bg-gray-800 text-yellow-400 border-b-2 border-yellow-500' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}>
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                {/* 탭 내용 */}
                <div className="p-4">

                  {/* 일반 진화 조합 */}
                  {sysGuideTab === 'evo' && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {Object.entries(EVOS).map(([key, evo]) => {
                        const [wid, aid] = key.split('+');
                        return (
                          <div key={key} className="bg-gray-800 border border-gray-700 hover:border-yellow-600/50 rounded-lg p-3 transition-colors">
                            <div className="flex items-center gap-1 mb-2 text-xs">
                              <span className="bg-gray-700 rounded px-1.5 py-0.5">{WDEFS[wid]?.icon} {WDEFS[wid]?.name}</span>
                              <span className="text-gray-500">+</span>
                              <span className="bg-purple-900/50 rounded px-1.5 py-0.5">{ADEFS[aid]?.icon} {ADEFS[aid]?.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-lg">{evo.icon}</span>
                              <div>
                                <div className="text-yellow-300 font-bold text-sm">{evo.name}</div>
                                <div className="text-gray-400 text-xs">{evo.desc}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 보급품 시스템 */}
                  {sysGuideTab === 'airdrop' && (
                    <div>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center bg-gray-800 rounded-lg p-3">
                          <div className="text-yellow-400 font-bold text-sm mb-1">투하 주기</div>
                          <div className="text-gray-300 text-xs">50~80초마다 1개</div>
                          <div className="text-gray-400 text-xs">동시 최대 3개</div>
                        </div>
                        <div className="text-center bg-gray-800 rounded-lg p-3">
                          <div className="text-yellow-400 font-bold text-sm mb-1">획득 방법</div>
                          <div className="text-gray-300 text-xs">크레이트에 접근</div>
                          <div className="text-gray-400 text-xs">자동 수집</div>
                        </div>
                        <div className="text-center bg-gray-800 rounded-lg p-3">
                          <div className="text-yellow-400 font-bold text-sm mb-1">유효 시간</div>
                          <div className="text-gray-300 text-xs">착지 후 2분</div>
                          <div className="text-gray-400 text-xs">미니맵 금색 ◈</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-800 rounded-lg p-3">
                          <div className="text-purple-300 text-xs font-bold mb-2">전설 무기</div>
                          <div className="space-y-1.5">
                            {Object.entries(AIRDROP_WEAPONS).map(([id, w]) => (
                              <div key={id} className="flex items-center gap-1.5 text-xs">
                                <span>{w.icon}</span>
                                <span className="text-purple-200 font-semibold">{w.name}</span>
                                <span className="text-gray-400 text-[10px]">{w.desc}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-3">
                          <div className="text-yellow-300 text-xs font-bold mb-2">사기급 아이템</div>
                          <div className="space-y-1.5">
                            {Object.entries(AIRDROP_ITEMS).map(([id, it]) => (
                              <div key={id} className="flex items-center gap-1.5 text-xs">
                                <span>{it.icon}</span>
                                <span className="text-yellow-200 font-semibold">{it.name}</span>
                                <span className="text-gray-400 text-[10px]">{it.desc}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 전설 진화 조합 (보급품 전용) */}
                  {sysGuideTab === 'legend' && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {Object.entries(AIRDROP_EVOS).map(([key, evo]) => {
                        const [wid, aid] = key.split('+');
                        const wDef  = AIRDROP_WEAPONS[wid]  || WDEFS[wid];
                        const aiDef = AIRDROP_ITEMS[aid]     || ADEFS[aid];
                        return (
                          <div key={key} className="bg-gray-800 border border-purple-600/40 hover:border-purple-400 rounded-lg p-3 transition-colors">
                            <div className="flex items-center gap-1 mb-2 text-xs">
                              <span className="bg-purple-950/60 rounded px-1.5 py-0.5 text-purple-200">{wDef?.icon} {wDef?.name}</span>
                              <span className="text-gray-500">+</span>
                              <span className="bg-yellow-950/60 rounded px-1.5 py-0.5 text-yellow-200">{aiDef?.icon} {aiDef?.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-lg">{evo.icon}</span>
                              <div>
                                <div className="text-purple-300 font-bold text-sm">{evo.name}</div>
                                <div className="text-gray-400 text-xs">{evo.desc}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 5단계 강화 시스템 */}
                  {sysGuideTab === 'upgrade' && (
                    <div className="grid grid-cols-5 gap-2">
                      {[1,2,3,4,5].map(lv => {
                        const b = upgradeBonusForLevel(lv);
                        return (
                          <div key={lv} className={`rounded-lg p-3 border text-center ${lv === 5 ? 'border-yellow-500 bg-yellow-950/40' : lv >= 4 ? 'border-orange-600/50 bg-orange-950/30' : 'border-gray-700 bg-gray-800/80'}`}>
                            <div className={`font-bold text-sm mb-1 ${lv === 5 ? 'text-yellow-400' : lv >= 4 ? 'text-orange-400' : 'text-white'}`}>
                              Lv.{lv}{lv === 5 ? ' ⭐' : ''}
                            </div>
                            {lv === 1 ? <div className="text-gray-400 text-xs">기본</div> : (
                              <div className="text-xs space-y-0.5">
                                <div className="text-green-400">피해 +{Math.round((b.dmgMult - 1) * 100)}%</div>
                                {b.rofMult < 1 && <div className="text-blue-400">연사 +{Math.round((1 - b.rofMult) * 100)}%</div>}
                                {b.rangeAdd > 0 && <div className="text-teal-400">사거리 +{b.rangeAdd}</div>}
                                {b.projAdd > 0 && <div className="text-purple-400">탄환 +{b.projAdd}</div>}
                                {b.legendary && <div className="text-yellow-400 font-bold">전설 효과!</div>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>{/* relative */}
          </div>{/* scale inner */}
          </div>{/* scale outer */}
        </div>
      </div>
    </>
  );
}
