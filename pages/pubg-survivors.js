import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Header from '../components/layout/Header';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const CW = 800, CH = 560;
const WW = 3200, WH = 3200;
const MAX_TIME = 20 * 60; // 20분 (초)
const XP_ATTRACT = 80;

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b));
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const dist = (a, b) => Math.sqrt(dist2(a, b));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, tk) => a + (b - a) * tk;

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
};

// ── Attachments ─────────────────────────────────────────────────
const ADEFS = {
  comp:       { name:'보정기',       icon:'⚙️',  desc:'확산↓30% · 연사↑15%' },
  extMag:     { name:'확장탄창',     icon:'📦',  desc:'발사체 +1개' },
  scope8x:    { name:'8배율 조준경', icon:'🔭',  desc:'사거리+200 · 피해+15%' },
  suppressor: { name:'소음기',       icon:'🔇',  desc:'명중 시 독 효과 추가' },
  energyDrink:{ name:'에너지 드링크',icon:'🧃',  desc:'이동속도+20% · HP재생' },
  vestLv3:    { name:'Lv3 방어구',   icon:'🛡️',  desc:'받는 피해 -40%' },
};

// ── Evolutions (weapon + attachment → evolution) ─────────────────
const EVOS = {
  'm416+comp':      { name:'전술 M416',   icon:'⚡', desc:'십자 패턴 자동 사격', color:'#60c0ff' },
  'akm+extMag':     { name:'AKM 풀오토',  icon:'🔥', desc:'3점사 + 화염 피해',   color:'#ff8040' },
  'kar98+scope8x':  { name:'고스트 샷',   icon:'👻', desc:'초고속 관통탄',        color:'#c0a0ff' },
  'ump+suppressor': { name:'사일런트 스톰',icon:'🌪️', desc:'독구름 분열탄',        color:'#80ff80' },
  'dp28+comp':      { name:'터렛 모드',   icon:'🏰', desc:'360° 전방향 사격',     color:'#ffd700' },
  's686+extMag':    { name:'프래그 캐논', icon:'💣', desc:'폭발 산탄',            color:'#ff4040' },
  'xbow+scope8x':   { name:'정밀 사냥꾼', icon:'🦅', desc:'추적 화살',            color:'#40ffd0' },
};

// ── Enemy types ──────────────────────────────────────────────────
const ETYPES = {
  basic:   { hp:60,   spd:1.2,  dmg:8,   xp:10,  sz:13, col:'#8a3a2a', name:'무장 플레이어' },
  vested:  { hp:150,  spd:0.95, dmg:15,  xp:25,  sz:16, col:'#2a508a', name:'방탄조끼 착용' },
  armored: { hp:350,  spd:0.65, dmg:25,  xp:50,  sz:18, col:'#1a1a50', name:'풀장비 플레이어' },
  vehicle: { hp:500,  spd:2.4,  dmg:55,  xp:80,  sz:28, col:'#c8b030', name:'UAZ 차량' },
  boss:    { hp:3000, spd:0.45, dmg:40,  xp:300, sz:28, col:'#5a0a0a', name:'BOSS', boss:true },
};

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

// ═══════════════════════════════════════════════════════════════
// DRAWING
// ═══════════════════════════════════════════════════════════════
function drawWorld(ctx, cam, world) {
  // Tiled grass
  const tw = 64, th = 64;
  const sx = Math.floor(cam.x / tw) * tw;
  const sy = Math.floor(cam.y / th) * th;
  const grassC = ['#3a5f28','#3d6530','#405e2a','#3c622d','#3b6131'];
  for (let gy = sy; gy < cam.y + CH + th; gy += th) {
    for (let gx = sx; gx < cam.x + CW + tw; gx += tw) {
      const vi = ((gx / tw | 0) + (gy / th | 0)) % 5;
      ctx.fillStyle = grassC[vi];
      ctx.fillRect(gx - cam.x, gy - cam.y, tw + 1, th + 1);
    }
  }
  // Trees
  for (const tr of world.trees) {
    const tx = tr.x - cam.x, ty = tr.y - cam.y;
    if (tx < -30 || tx > CW + 30 || ty < -30 || ty > CH + 30) continue;
    ctx.fillStyle = '#2a4a1a';
    ctx.beginPath(); ctx.arc(tx, ty, tr.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1e3a12';
    ctx.beginPath(); ctx.arc(tx - 2, ty - 2, tr.r * 0.6, 0, Math.PI * 2); ctx.fill();
  }
  // Buildings
  for (const b of world.buildings) {
    const bx = b.x - cam.x, by = b.y - cam.y;
    if (bx > CW || bx + b.w < 0 || by > CH || by + b.h < 0) continue;
    ctx.fillStyle = '#4a4035'; ctx.fillRect(bx, by, b.w, b.h);
    ctx.fillStyle = '#2e2820'; ctx.fillRect(bx, by, b.w, 5); ctx.fillRect(bx, by, 5, b.h);
    ctx.fillStyle = '#5a5040'; ctx.fillRect(bx + b.w - 5, by, 5, b.h);
    // Windows
    ctx.fillStyle = '#1a1a2a';
    for (let wy = by + 10; wy < by + b.h - 15; wy += 24) {
      for (let wx = bx + 10; wx < bx + b.w - 15; wx += 22) {
        ctx.fillRect(wx, wy, 10, 10);
      }
    }
  }
}

function drawZone(ctx, cam, zone) {
  // Blue tint outside zone
  const zx = zone.cx - cam.x, zy = zone.cy - cam.y;
  ctx.save();
  ctx.fillStyle = 'rgba(0,80,200,0.18)';
  ctx.fillRect(0, 0, CW, CH);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(zx, zy, zone.r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Zone border glow
  ctx.save();
  ctx.shadowColor = 'rgba(60,160,255,0.8)'; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.arc(zx, zy, zone.r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(60,160,255,0.9)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
}

function drawPixelChar(ctx, x, y, color, sz, dir, gun) {
  // Top-down pixel character
  const s = sz;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(x, y + s * 0.6, s * 0.65, s * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  // Body
  ctx.fillStyle = color;
  ctx.fillRect(x - s * 0.5 | 0, y - s * 0.5 | 0, s | 0, s | 0);
  // Head
  ctx.fillStyle = '#d4a882';
  const hs = s * 0.45 | 0;
  ctx.fillRect(x - hs / 2 | 0, y - hs / 2 | 0, hs, hs);
  // Gun barrel (points in dir)
  if (gun) {
    ctx.fillStyle = '#666';
    const gx = x + Math.cos(dir) * s * 0.3 | 0;
    const gy = y + Math.sin(dir) * s * 0.3 | 0;
    ctx.save(); ctx.translate(gx, gy); ctx.rotate(dir);
    ctx.fillRect(0, -2, s * 0.85 | 0, 4);
    ctx.restore();
  }
}

function drawPlayer(ctx, p, cam) {
  const x = p.x - cam.x | 0, y = p.y - cam.y | 0;
  // Helm
  ctx.fillStyle = '#2a4a2a';
  ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
  drawPixelChar(ctx, x, y, '#4a7a3a', 22, p.aimAngle, true);
  // Helmet overlay
  ctx.strokeStyle = '#1a3a1a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.stroke();
  // HP bar
  const bw = 44, bh = 5;
  ctx.fillStyle = '#222'; ctx.fillRect(x - bw/2, y - 24, bw, bh);
  ctx.fillStyle = p.hp > p.maxHp * 0.5 ? '#44dd66' : p.hp > p.maxHp * 0.25 ? '#ffaa00' : '#ff4444';
  ctx.fillRect(x - bw/2, y - 24, bw * (p.hp / p.maxHp), bh);
  // Invuln flash
  if (p.invulnTime > 0 && Math.floor(p.invulnTime / 4) % 2 === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
  }
}

function drawEnemy(ctx, e, cam) {
  const x = e.x - cam.x | 0, y = e.y - cam.y | 0;
  if (x < -50 || x > CW + 50 || y < -50 || y > CH + 50) return;
  const dir = Math.atan2(e.targY - e.y, e.targX - e.x);
  drawPixelChar(ctx, x, y, e.col, e.sz * 1.4, dir, !e.vehicle);
  // Vehicle body override
  if (e.vehicle) {
    ctx.fillStyle = e.col;
    ctx.fillRect(x - e.sz, y - e.sz * 0.6, e.sz * 2, e.sz * 1.2);
    ctx.fillStyle = '#888'; ctx.fillRect(x - e.sz * 0.6, y - e.sz * 0.55, e.sz * 1.2, e.sz * 1.1);
  }
  if (e.boss) {
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, e.sz + 5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
    ctx.fillText('BOSS', x, y - e.sz - 8);
  }
  // Poison tint
  if (e.poisoned > 0) {
    ctx.fillStyle = 'rgba(80,220,80,0.3)';
    ctx.beginPath(); ctx.arc(x, y, e.sz + 2, 0, Math.PI * 2); ctx.fill();
  }
  // HP bar
  const bw = e.sz * 2.2, bh = 4;
  ctx.fillStyle = '#222'; ctx.fillRect(x - bw/2, y - e.sz - 12, bw, bh);
  ctx.fillStyle = e.boss ? '#ff4444' : '#ff8844';
  ctx.fillRect(x - bw/2, y - e.sz - 12, bw * Math.max(0, e.hp / e.maxHp), bh);
}

function drawBullet(ctx, b, cam) {
  const x = b.x - cam.x, y = b.y - cam.y;
  if (x < -20 || x > CW + 20 || y < -20 || y > CH + 20) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(b.dy, b.dx));
  // Trail
  ctx.fillStyle = b.poison ? 'rgba(80,220,80,0.4)' : 'rgba(255,220,60,0.35)';
  ctx.fillRect(-12, -1.5, 10, 3);
  // Bullet
  ctx.fillStyle = b.poison ? '#80ff80' : '#ffe44d';
  ctx.fillRect(-3, -2.5, 10, 5);
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
  ctx.globalAlpha = p.life / p.maxLife;
  ctx.fillStyle = p.color;
  ctx.fillRect(x - p.sz/2, y - p.sz/2, p.sz, p.sz);
  ctx.globalAlpha = 1;
}

function drawMinimap(ctx, state) {
  const mw = 120, mh = 120, mx = CW - mw - 8, my = 8;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
  ctx.strokeRect(mx, my, mw, mh);
  // Zone circle on minimap
  const zx = mx + (state.zone.cx / WW) * mw;
  const zy = my + (state.zone.cy / WH) * mh;
  const zr = (state.zone.r / WW) * mw;
  ctx.strokeStyle = 'rgba(60,160,255,0.7)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(zx, zy, zr, 0, Math.PI * 2); ctx.stroke();
  // Enemies
  for (const e of state.enemies) {
    const ex = mx + (e.x / WW) * mw, ey = my + (e.y / WH) * mh;
    ctx.fillStyle = e.boss ? '#ff4444' : '#ff8844';
    ctx.fillRect(ex - 1, ey - 1, 2, 2);
  }
  // Player
  const px = mx + (state.player.x / WW) * mw, py = my + (state.player.y / WH) * mh;
  ctx.fillStyle = '#44ff88';
  ctx.fillRect(px - 2, py - 2, 4, 4);
}

// ═══════════════════════════════════════════════════════════════
// GAME LOGIC
// ═══════════════════════════════════════════════════════════════
function initGame() {
  const world = generateWorld();
  const px = WW / 2, py = WH / 2;
  return {
    phase: 'menu',
    world,
    player: {
      x: px, y: py, hp: 150, maxHp: 150, speed: 3.0,
      xp: 0, xpNext: 60, level: 1,
      weapons: [{ ...WDEFS.m416, id: 'm416', level: 1, shootTimer: 0, extraProj: 0 }],
      attachments: [], evolutions: [],
      healRegen: 0, dmgReduce: 0, invulnTime: 0, aimAngle: 0,
    },
    enemies: [], bullets: [], xpOrbs: [], particles: [],
    camera: { x: px - CW/2, y: py - CH/2 },
    zone: { cx: WW/2, cy: WH/2, r: 1300, targetR: 200, shrinkRate: 0.06, damage: 10 },
    keys: { up:false, down:false, left:false, right:false },
    time: 0, elapsed: 0,
    spawnTimer: 0, bossTimes: new Set([60, 180, 300, 480, 600, 780, 900, 1080, 1200]),
    bossAlert: 0, // frames to show boss alert
    levelupChoices: [], evoKey: null,
    phase2: null, // sub-phase for evo display
    score: 0, kills: 0,
    _eid: 0, _bid: 0,
    gameOver: false, won: false,
  };
}

function spawnEnemy(state, etype) {
  const p = state.player;
  const angle = Math.random() * Math.PI * 2;
  const r = 520 + Math.random() * 80;
  const ex = clamp(p.x + Math.cos(angle) * r, 30, WW - 30);
  const ey = clamp(p.y + Math.sin(angle) * r, 30, WH - 30);
  const def = ETYPES[etype];
  // 플레이어 레벨 + 시간 복합 강화
  const lvl = state.player.level;
  const hpScale  = 1 + state.elapsed / 320 + lvl * 0.12;
  const dmgScale = 1 + state.elapsed / 500 + lvl * 0.07;
  const spdScale = 1 + Math.min(lvl * 0.04, 0.6);
  state.enemies.push({
    id: ++state._eid, type: etype,
    x: ex, y: ey, targX: p.x, targY: p.y,
    hp: def.hp * hpScale, maxHp: def.hp * hpScale,
    spd: def.spd * spdScale,
    dmg: Math.ceil(def.dmg * dmgScale),
    xp: Math.ceil(def.xp * (1 + lvl * 0.05)),
    sz: def.sz + (etype === 'boss' ? Math.min(lvl, 12) : 0),
    col: def.col, boss: def.boss || false,
    vehicle: etype === 'vehicle', poisoned: 0, knockback: null,
  });
}

function getSpawnType(elapsed) {
  const r = Math.random();
  if (elapsed < 60) return 'basic';
  if (elapsed < 180) return r < 0.25 ? 'vested' : 'basic';
  if (elapsed < 360) {
    if (r < 0.08) return 'armored';
    if (r < 0.3)  return 'vested';
    return 'basic';
  }
  if (elapsed < 600) {
    if (r < 0.07) return 'vehicle';
    if (r < 0.18) return 'armored';
    if (r < 0.45) return 'vested';
    return 'basic';
  }
  if (r < 0.1) return 'vehicle';
  if (r < 0.25) return 'armored';
  if (r < 0.5)  return 'vested';
  return 'basic';
}

function shootWeapon(state, w) {
  const p = state.player;
  if (state.enemies.length === 0) return;
  // Find nearest enemy in range
  let nearest = null, nd2 = (w.range + (w.extraRange || 0)) ** 2;
  for (const e of state.enemies) {
    const d2 = dist2(p, e);
    if (d2 < nd2) { nd2 = d2; nearest = e; }
  }
  if (!nearest) return;
  p.aimAngle = Math.atan2(nearest.y - p.y, nearest.x - p.x);
  const baseAngle = p.aimAngle;
  const projCount = (w.proj || 1) + (w.extraProj || 0);
  for (let i = 0; i < projCount; i++) {
    let angle = baseAngle + (Math.random() - 0.5) * (w.spread || 0) * 2;
    if (w.crossFire) {
      if (i === 1) angle = baseAngle + Math.PI / 2;
      else if (i === 2) angle = baseAngle - Math.PI / 2;
      else if (i === 3) angle = baseAngle + Math.PI;
    }
    if (w.melee) {
      // Area melee
      for (const e of state.enemies) {
        if (dist(p, e) <= w.range + 10) {
          e.hp -= w.dmg * (1 + w.level * 0.15);
          e.knockback = { dx: (e.x - p.x) / Math.max(1, dist(p, e)) * 6, dy: (e.y - p.y) / Math.max(1, dist(p, e)) * 6, t: 12 };
        }
      }
      // Melee spark particles
      for (let k = 0; k < 5; k++) {
        const a = baseAngle + (Math.random() - 0.5) * 1.5;
        state.particles.push({ x: p.x + Math.cos(a) * 40, y: p.y + Math.sin(a) * 40, dx: Math.cos(a) * 2, dy: Math.sin(a) * 2, life: 12, maxLife: 12, color: '#ffdd00', sz: 5 });
      }
      return;
    }
    // Add rotating fire bullets for DP-28 evo
    if (w.rotatingFire) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        state.bullets.push({ id: ++state._bid, x: p.x, y: p.y, dx: Math.cos(a) * 10, dy: Math.sin(a) * 10, dmg: w.dmg * 0.55, range: 240, traveled: 0, pierce: false, homing: null, poison: false, explosive: false });
      }
    }
    state.bullets.push({
      id: ++state._bid, x: p.x, y: p.y,
      dx: Math.cos(angle) * (w.spd || 12), dy: Math.sin(angle) * (w.spd || 12),
      dmg: w.dmg, range: w.range + (w.extraRange || 0), traveled: 0,
      pierce: w.pierce || false,
      homing: w.homing ? nearest : null,
      poison: w.poison || state.player.attachments.includes('suppressor'),
      explosive: w.explosive || false,
    });
  }
}

function checkEvolution(state) {
  const wids = state.player.weapons.map(w => w.id);
  const aids = state.player.attachments;
  for (const key of Object.keys(EVOS)) {
    const [wid, aid] = key.split('+');
    if (wids.includes(wid) && aids.includes(aid) && !state.player.evolutions.includes(key)) {
      return key;
    }
  }
  return null;
}

function applyEvolution(state, key) {
  const evo = EVOS[key];
  state.player.evolutions.push(key);
  const [wid] = key.split('+');
  const w = state.player.weapons.find(w => w.id === wid);
  if (!w) return;
  w.evolved = key;
  w.dmg = Math.floor(w.dmg * 1.85);
  w.range += 120;
  w.rof = Math.floor(w.rof * 0.72);
  if (key === 'dp28+comp')     w.rotatingFire = true;
  if (key === 's686+extMag')   w.explosive = true;
  if (key === 'xbow+scope8x')  w.homing = true;
  if (key === 'm416+comp')     { w.crossFire = true; w.proj = 4; }
  if (key === 'akm+extMag')    { w.fireMode = 'burst'; }
  if (key === 'kar98+scope8x') { w.spd = 22; w.range += 200; }
  if (key === 'ump+suppressor'){ w.proj = 3; w.spread *= 0.5; }
}

function getLevelupChoices(state) {
  const p = state.player;
  const wids = p.weapons.map(w => w.id);
  const pool = [];
  // New weapon (max 4)
  if (p.weapons.length < 4) {
    for (const [id, def] of Object.entries(WDEFS)) {
      if (!wids.includes(id)) pool.push({ type: 'weapon', id, label: def.name, sub: def.desc, icon: def.icon, rare: false });
    }
  }
  // Weapon upgrade
  for (const w of p.weapons) {
    if (w.level < 3) pool.push({ type: 'upgrade', wid: w.id, label: `${w.name} 강화`, sub: `레벨 ${w.level} → ${w.level + 1} (+35% 피해)`, icon: '⬆️', rare: false });
  }
  // New attachment (max 4)
  if (p.attachments.length < 4) {
    for (const [id, def] of Object.entries(ADEFS)) {
      if (!p.attachments.includes(id)) pool.push({ type: 'att', id, label: def.name, sub: def.desc, icon: def.icon, rare: true });
    }
  }
  // Heal option always available
  pool.push({ type: 'heal', label: '구급 처치', sub: 'HP +40 즉시 회복', icon: '💊', rare: false });
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

function applyChoice(state, choice) {
  const p = state.player;
  if (choice.type === 'weapon') {
    p.weapons.push({ ...WDEFS[choice.id], id: choice.id, level: 1, shootTimer: 0, extraProj: 0, extraRange: 0 });
  } else if (choice.type === 'upgrade') {
    const w = p.weapons.find(w => w.id === choice.wid);
    if (w) { w.level++; w.dmg = Math.floor(w.dmg * 1.35); if (w.level === 3) { w.rof = Math.floor(w.rof * 0.88); w.range += 50; } }
  } else if (choice.type === 'att') {
    p.attachments.push(choice.id);
    if (choice.id === 'energyDrink') { p.speed = Math.min(p.speed * 1.2, 6); p.healRegen = 3; }
    if (choice.id === 'vestLv3')    { p.dmgReduce = 0.4; }
    if (choice.id === 'extMag')     { p.weapons.forEach(w => { w.extraProj = (w.extraProj || 0) + 1; }); }
    if (choice.id === 'comp')       { p.weapons.forEach(w => { w.spread = (w.spread || 0) * 0.7; w.rof = Math.floor(w.rof * 0.85); }); }
    if (choice.id === 'scope8x')    { p.weapons.forEach(w => { w.extraRange = (w.extraRange || 0) + 200; w.dmg = Math.floor(w.dmg * 1.15); }); }
  } else if (choice.type === 'heal') {
    p.hp = Math.min(p.maxHp, p.hp + 40);
  }
  return checkEvolution(state);
}

function updateGame(state) {
  if (state.phase !== 'playing') return;
  const p = state.player;

  // Movement
  let dx = 0, dy = 0;
  if (state.keys.left || state.keys.a) dx -= 1;
  if (state.keys.right || state.keys.d) dx += 1;
  if (state.keys.up || state.keys.w) dy -= 1;
  if (state.keys.down || state.keys.s) dy += 1;
  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    p.x = clamp(p.x + dx / len * p.speed, 20, WW - 20);
    p.y = clamp(p.y + dy / len * p.speed, 20, WH - 20);
  }

  // Camera
  state.camera.x = clamp(p.x - CW / 2, 0, WW - CW);
  state.camera.y = clamp(p.y - CH / 2, 0, WH - CH);

  // Time
  state.time++;
  state.elapsed = state.time / 60;
  if (state.elapsed >= MAX_TIME) { state.won = true; state.phase = 'result'; return; }

  // HP regen
  if (p.healRegen > 0) p.hp = Math.min(p.maxHp, p.hp + p.healRegen / 60);
  if (p.invulnTime > 0) p.invulnTime--;

  // Zone shrink
  const zone = state.zone;
  if (zone.r > zone.targetR) zone.r -= zone.shrinkRate;
  if (dist(p, { x: zone.cx, y: zone.cy }) > zone.r) p.hp -= zone.damage / 60;

  // Spawn enemies — 레벨이 오를수록 간격 단축, 한 번에 더 많이
  state.spawnTimer++;
  const spawnInterval = Math.max(20, 150 - state.elapsed * 0.2 - p.level * 3);
  const batchSize = 2 + Math.floor(state.elapsed / 35) + Math.floor(p.level / 3);
  if (state.spawnTimer >= spawnInterval) {
    state.spawnTimer = 0;
    for (let i = 0; i < batchSize; i++) spawnEnemy(state, getSpawnType(state.elapsed));
  }
  // Boss spawns — 시간 기반
  const curSec = Math.floor(state.elapsed);
  if (state.bossTimes.has(curSec) && state.time % 60 === 0) {
    state.bossTimes.delete(curSec);
    spawnEnemy(state, 'boss');
    state.bossAlert = 180; // 3초 경고
  }
  // 레벨 5마다 추가 보스 (레벨업 보스)
  if (p.level > 1 && p.level % 5 === 0 && state._lastBossLevel !== p.level) {
    state._lastBossLevel = p.level;
    spawnEnemy(state, 'boss');
    state.bossAlert = 180;
  }
  if (state.bossAlert > 0) state.bossAlert--;

  // Update enemies
  const deadIds = new Set();
  for (const e of state.enemies) {
    if (e.hp <= 0) {
      for (let k = 0; k < Math.ceil(e.xp / 10); k++) {
        state.xpOrbs.push({ x: e.x + rand(-18, 18), y: e.y + rand(-18, 18), value: 10 });
      }
      // Death particles
      for (let k = 0; k < 8; k++) {
        const a = Math.random() * Math.PI * 2;
        state.particles.push({ x: e.x, y: e.y, dx: Math.cos(a) * rand(1, 3), dy: Math.sin(a) * rand(1, 3), life: 20, maxLife: 20, color: e.boss ? '#ff4444' : '#ff9944', sz: rand(4, 9) | 0 });
      }
      state.kills++; state.score += e.xp;
      deadIds.add(e.id); continue;
    }
    // Knockback
    if (e.knockback) {
      e.x += e.knockback.dx; e.y += e.knockback.dy; e.knockback.t--;
      if (e.knockback.t <= 0) e.knockback = null;
    } else {
      e.targX = p.x; e.targY = p.y;
      const d = dist(e, p);
      if (d > 1) { e.x += (p.x - e.x) / d * e.spd; e.y += (p.y - e.y) / d * e.spd; }
    }
    // Poison
    if (e.poisoned > 0) { e.hp -= 6 / 60; e.poisoned--; }
    // Damage player
    const hitR = e.sz + 13;
    if (dist(e, p) < hitR && p.invulnTime <= 0) {
      p.hp -= e.dmg * (1 - (p.dmgReduce || 0));
      p.invulnTime = 45;
      if (p.hp <= 0) { state.phase = 'result'; state.gameOver = true; return; }
    }
    e.x = clamp(e.x, 10, WW - 10); e.y = clamp(e.y, 10, WH - 10);
  }
  state.enemies = state.enemies.filter(e => !deadIds.has(e.id));
  if (state.enemies.length > 400) state.enemies = state.enemies.slice(-400);

  // Update bullets
  const deadBullets = new Set();
  for (const b of state.bullets) {
    if (b.homing) {
      const tgt = state.enemies.find(e => e.id === b.homing.id) || state.enemies[0];
      if (tgt) { const ba = Math.atan2(tgt.y - b.y, tgt.x - b.x); b.dx = lerp(b.dx, Math.cos(ba) * 9, 0.12); b.dy = lerp(b.dy, Math.sin(ba) * 9, 0.12); }
    }
    b.x += b.dx; b.y += b.dy; b.traveled += Math.hypot(b.dx, b.dy);
    if (b.traveled > b.range || b.x < 0 || b.x > WW || b.y < 0 || b.y > WH) { deadBullets.add(b.id); continue; }
    for (const e of state.enemies) {
      if (dist(b, e) < e.sz + 3) {
        e.hp -= b.dmg;
        if (b.poison) e.poisoned = 180;
        if (b.explosive) { for (const e2 of state.enemies) { if (dist(b, e2) < 85) e2.hp -= b.dmg * 0.45; } }
        if (!b.pierce) { deadBullets.add(b.id); break; }
      }
    }
  }
  state.bullets = state.bullets.filter(b => !deadBullets.has(b.id));
  if (state.bullets.length > 400) state.bullets = state.bullets.slice(-400);

  // Weapons shoot
  for (const w of p.weapons) {
    w.shootTimer = (w.shootTimer || 0) + 1;
    const rofFrames = (w.rof / 1000) * 60;
    if (w.shootTimer >= rofFrames) { w.shootTimer = 0; shootWeapon(state, w); }
  }

  // XP collect
  const deadOrbs = new Set();
  for (let i = 0; i < state.xpOrbs.length; i++) {
    if (dist(p, state.xpOrbs[i]) < XP_ATTRACT) { p.xp += state.xpOrbs[i].value; deadOrbs.add(i); }
  }
  state.xpOrbs = state.xpOrbs.filter((_, i) => !deadOrbs.has(i));
  if (state.xpOrbs.length > 600) state.xpOrbs = state.xpOrbs.slice(-600);

  // Particles
  for (const pt of state.particles) { pt.x += pt.dx; pt.y += pt.dy; pt.life--; }
  state.particles = state.particles.filter(pt => pt.life > 0);

  // Level up check
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
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const [uiState, setUiState] = useState({ phase: 'menu', levelupChoices: [], evoKey: null, player: null, elapsed: 0, score: 0, kills: 0, won: false });

  const startGame = () => {
    stateRef.current = initGame();
    stateRef.current.phase = 'playing';
    setUiState(s => ({ ...s, phase: 'playing' }));
  };

  const handleChoice = (choice) => {
    const state = stateRef.current;
    if (!state) return;
    const evoKey = applyChoice(state, choice);
    if (evoKey) {
      state.evoKey = evoKey;
      state.phase = 'evo';
      setUiState(s => ({ ...s, phase: 'evo', evoKey }));
    } else {
      state.phase = 'playing';
      setUiState(s => ({ ...s, phase: 'playing', evoKey: null }));
    }
  };

  const handleEvoConfirm = () => {
    const state = stateRef.current;
    if (!state || !state.evoKey) return;
    applyEvolution(state, state.evoKey);
    state.evoKey = null;
    state.phase = 'playing';
    setUiState(s => ({ ...s, phase: 'playing', evoKey: null }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const loop = () => {
      const state = stateRef.current;
      if (state && state.phase === 'playing') {
        updateGame(state);
        // Draw
        ctx.clearRect(0, 0, CW, CH);
        const cam = state.camera;
        drawWorld(ctx, cam, state.world);
        // XP orbs
        for (const orb of state.xpOrbs) drawXPOrb(ctx, orb, cam);
        // Bullets
        for (const b of state.bullets) drawBullet(ctx, b, cam);
        // Enemies
        for (const e of state.enemies) drawEnemy(ctx, e, cam);
        // Player
        drawPlayer(ctx, state.player, cam);
        // Particles
        for (const pt of state.particles) drawParticle(ctx, pt, cam);
        // Zone
        drawZone(ctx, cam, state.zone);
        // Minimap
        drawMinimap(ctx, state);

        // Check phase changes
        if (state.phase !== 'playing') {
          setUiState({
            phase: state.phase,
            levelupChoices: state.levelupChoices || [],
            evoKey: state.evoKey || null,
            player: { ...state.player },
            elapsed: state.elapsed,
            score: state.score,
            kills: state.kills,
            won: state.won || false,
          });
        }
        // HUD update every 30 frames
        if (state.time % 30 === 0) {
          setUiState(s => ({
            ...s,
            player: { ...state.player, weapons: state.player.weapons.map(w => ({ ...w })), attachments: [...state.player.attachments] },
            elapsed: state.elapsed,
            score: state.score,
            kills: state.kills,
            enemyCount: state.enemies.length,
            bossAlert: state.bossAlert > 0,
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
      if (k === 'arrowleft' || k === 'a') state.keys.left = down;
      if (k === 'arrowright' || k === 'd') state.keys.right = down;
      if (k === 'arrowup' || k === 'w') state.keys.up = down;
      if (k === 'arrowdown' || k === 's') state.keys.down = down;
    };
    window.addEventListener('keydown', e => onKey(e, true));
    window.addEventListener('keyup', e => onKey(e, false));

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', e => onKey(e, true));
      window.removeEventListener('keyup', e => onKey(e, false));
    };
  }, []);

  const fmtTime = (sec) => `${Math.floor(sec / 60)}:${(Math.floor(sec) % 60).toString().padStart(2, '0')}`;
  const p = uiState.player;

  return (
    <>
      <Head>
        <title>PUBG 서바이버 - PK.GG</title>
        <meta name="description" content="PUBG 테마 뱀파이어 서바이벌 게임" />
      </Head>
      <div className="min-h-screen bg-gray-950 text-white">
        <Header />
        <div className="flex flex-col items-center pt-4 pb-8 px-4">
          <h1 className="text-2xl font-bold mb-2 text-yellow-400">PUBG 서바이버</h1>
          <p className="text-gray-400 text-sm mb-4">PUBG 무기로 20분 생존하라</p>

          {/* Game Canvas */}
          <div className="relative" style={{ width: CW, height: CH }}>
            <canvas ref={canvasRef} width={CW} height={CH} className="block rounded-lg border border-gray-700" style={{ imageRendering: 'pixelated' }} />

            {/* HUD overlay */}
            {uiState.phase === 'playing' && p && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Top bar */}
                <div className="absolute top-2 left-2 right-32">
                  {/* HP bar */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-red-400 w-6">HP</span>
                    <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(p.hp / p.maxHp) * 100}%`, background: p.hp > p.maxHp * 0.5 ? '#44dd66' : p.hp > p.maxHp * 0.25 ? '#ffaa00' : '#ff4444' }} />
                    </div>
                    <span className="text-xs text-gray-300 w-20">{Math.ceil(p.hp)}/{p.maxHp}</span>
                  </div>
                  {/* XP bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-teal-400 w-6">XP</span>
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                      <div className="h-full bg-teal-400 rounded-full" style={{ width: `${(p.xp / p.xpNext) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-20">Lv.{p.level}</span>
                  </div>
                </div>
                {/* Timer + Score */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 text-center">
                  <div className="text-yellow-400 font-mono font-bold text-lg">{fmtTime(uiState.elapsed)} / 20:00</div>
                  <div className="text-gray-300 text-xs">💀 {uiState.kills} | ⭐ {uiState.score.toLocaleString()}</div>
                </div>
                {/* Weapons bar */}
                <div className="absolute bottom-2 left-2 flex gap-2">
                  {p.weapons.map((w, i) => {
                    const evoKey = p.evolutions.find(k => k.startsWith(w.id + '+'));
                    const evo = evoKey ? EVOS[evoKey] : null;
                    return (
                      <div key={i} className={`flex flex-col items-center px-2 py-1 rounded border text-xs ${evo ? 'border-yellow-400 bg-yellow-900/40' : 'border-gray-600 bg-gray-900/70'}`}>
                        <span className="text-base">{evo ? evo.icon : w.icon}</span>
                        <span className="text-white font-bold">{evo ? evo.name : w.name}</span>
                        <span className="text-gray-400">Lv.{w.level}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Attachments */}
                <div className="absolute bottom-2 right-2 flex gap-1">
                  {p.attachments.map((aid, i) => (
                    <div key={i} className="w-8 h-8 flex items-center justify-center bg-gray-800/80 border border-gray-600 rounded text-sm" title={ADEFS[aid]?.name}>
                      {ADEFS[aid]?.icon}
                    </div>
                  ))}
                </div>
                {/* Enemy count */}
                <div className="absolute top-2 right-36 text-xs text-gray-400 text-right">
                  <div>적 {uiState.enemyCount ?? 0}마리</div>
                </div>
                {/* Boss alert */}
                {uiState.bossAlert && (
                  <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none animate-bounce">
                    <div className="bg-red-950/90 border-2 border-red-500 rounded-xl px-8 py-4 shadow-2xl">
                      <div className="text-4xl mb-1">💀</div>
                      <div className="text-red-400 text-xl font-black tracking-wider">BOSS 출현!</div>
                      <div className="text-red-300 text-sm mt-1">강력한 적이 나타났다</div>
                    </div>
                  </div>
                )}
                {/* Zone warning */}
                {stateRef.current && (() => {
                  const st = stateRef.current;
                  const dz = dist(st.player, { x: st.zone.cx, y: st.zone.cy });
                  return dz > st.zone.r ? (
                    <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-blue-900/80 border border-blue-400 rounded px-3 py-1 text-blue-300 text-sm font-bold animate-pulse">
                      ⚠️ 블루존 피해
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Menu Screen */}
            {uiState.phase === 'menu' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/90 rounded-lg">
                <div className="text-5xl mb-4">🎮</div>
                <h2 className="text-3xl font-bold text-yellow-400 mb-2">PUBG 서바이버</h2>
                <p className="text-gray-300 mb-2 text-center max-w-md">뱀파이어 서바이벌 × PUBG</p>
                <div className="text-gray-400 text-sm mb-6 text-center space-y-1">
                  <p>WASD / 방향키로 이동 · 자동 사격</p>
                  <p>무기 + 부착물 조합 → 진화 무기</p>
                  <p>블루존 안에서 20분 생존하면 승리!</p>
                </div>
                {/* Combination preview */}
                <div className="mb-6 grid grid-cols-4 gap-2">
                  {Object.entries(EVOS).slice(0, 4).map(([key, evo]) => {
                    const [wid, aid] = key.split('+');
                    return (
                      <div key={key} className="bg-gray-800 border border-yellow-600/40 rounded p-2 text-center text-xs">
                        <div className="text-base">{WDEFS[wid]?.icon} + {ADEFS[aid]?.icon}</div>
                        <div className="text-yellow-300 font-bold">{evo.icon} {evo.name}</div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={startGame} className="px-10 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg text-lg transition-colors">
                  게임 시작
                </button>
              </div>
            )}

            {/* Level Up Screen */}
            {uiState.phase === 'levelup' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/90 rounded-lg">
                <div className="text-yellow-400 text-2xl font-bold mb-1">⬆️ 레벨 업!</div>
                <p className="text-gray-400 text-sm mb-5">업그레이드를 선택하세요</p>
                <div className="flex gap-4">
                  {uiState.levelupChoices.map((ch, i) => (
                    <button key={i} onClick={() => handleChoice(ch)}
                      className={`w-44 p-4 rounded-xl border-2 text-left transition-all hover:scale-105 ${ch.rare ? 'border-purple-400 bg-purple-900/40 hover:bg-purple-800/60' : 'border-gray-500 bg-gray-800/80 hover:bg-gray-700/80'}`}>
                      <div className="text-2xl mb-2">{ch.icon}</div>
                      <div className={`font-bold text-sm mb-1 ${ch.rare ? 'text-purple-300' : 'text-white'}`}>{ch.label}</div>
                      <div className="text-gray-400 text-xs">{ch.sub}</div>
                      {ch.rare && <div className="text-purple-400 text-xs mt-1">✨ 부착물</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Evolution Screen */}
            {uiState.phase === 'evo' && uiState.evoKey && (() => {
              const evo = EVOS[uiState.evoKey];
              const [wid, aid] = uiState.evoKey.split('+');
              return (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/95 rounded-lg">
                  <div className="text-5xl mb-3 animate-bounce">{evo.icon}</div>
                  <div className="text-yellow-400 text-xl font-bold mb-1">진화 가능!</div>
                  <div className="text-white text-2xl font-bold mb-2">{evo.name}</div>
                  <div className="text-gray-400 mb-1 text-sm">{WDEFS[wid]?.name} + {ADEFS[aid]?.name}</div>
                  <div className="bg-gray-800 border border-yellow-500 rounded-lg px-6 py-3 mb-6 text-center">
                    <p className="text-yellow-300 font-bold">{evo.desc}</p>
                    <p className="text-gray-400 text-xs mt-1">피해 +85% · 사거리 +120</p>
                  </div>
                  <button onClick={handleEvoConfirm} className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg text-lg">
                    진화 시키기!
                  </button>
                </div>
              );
            })()}

            {/* Result Screen */}
            {uiState.phase === 'result' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/95 rounded-lg">
                <div className="text-5xl mb-3">{uiState.won ? '🏆' : '💀'}</div>
                <div className={`text-2xl font-bold mb-4 ${uiState.won ? 'text-yellow-400' : 'text-red-400'}`}>
                  {uiState.won ? '치킨 드셨나요? 🍗' : '게임 오버'}
                </div>
                <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 mb-6 w-72 space-y-3">
                  <div className="flex justify-between"><span className="text-gray-400">생존 시간</span><span className="text-white font-bold">{fmtTime(uiState.elapsed)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">킬 수</span><span className="text-white font-bold">{uiState.kills}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">점수</span><span className="text-yellow-400 font-bold">{uiState.score.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">레벨</span><span className="text-white font-bold">{p?.level || 1}</span></div>
                  {p && p.evolutions.length > 0 && (
                    <div>
                      <div className="text-gray-400 text-sm mb-1">진화한 무기</div>
                      <div className="flex gap-2 flex-wrap">
                        {p.evolutions.map(key => <span key={key} className="text-xs bg-yellow-900/40 border border-yellow-600 rounded px-2 py-0.5 text-yellow-300">{EVOS[key]?.icon} {EVOS[key]?.name}</span>)}
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={startGame} className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg">
                  다시 하기
                </button>
              </div>
            )}
          </div>

          {/* Combination Guide */}
          <div className="mt-6 w-full max-w-3xl">
            <h3 className="text-lg font-bold text-yellow-400 mb-3">무기 진화 조합표</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(EVOS).map(([key, evo]) => {
                const [wid, aid] = key.split('+');
                return (
                  <div key={key} className="bg-gray-900 border border-gray-700 hover:border-yellow-600/50 rounded-lg p-3 transition-colors">
                    <div className="flex items-center gap-1 mb-2 text-sm">
                      <span className="bg-gray-800 rounded px-1.5 py-0.5">{WDEFS[wid]?.icon} {WDEFS[wid]?.name}</span>
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
          </div>
        </div>
      </div>
    </>
  );
}
