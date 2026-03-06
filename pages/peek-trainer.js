// pages/peek-trainer.js — PUBG 피킹 트레이너 (정면 뷰)
import Head from 'next/head';
import { useState, useRef, useEffect, useCallback } from 'react';
import Header from '../components/layout/Header';

const CW = 1200, CH = 520;
const CSS = { display: 'block', width: '100%', height: 'auto' };
const GAME_SECS = 20;
const PEEK_DELAY_MS = 200;

// ── 지형 상수 ───────────────────────────────────────
const GROUND_Y = 430;

// 양쪽 엄폐물 벽 (정면 뷰)
const L_WALL = { x: 295, y: 95, w: 155, h: 335 };
const R_WALL = { x: 750, y: 95, w: 155, h: 335 };

// 플레이어 위치
const P_HOME   = { x: 600,  y: 305 };  // 벽 사이 중앙
const P_LEAN_L = { x: 248,  y: 298 };  // 왼쪽 벽 밖으로 피킹
const P_LEAN_R = { x: 952,  y: 298 };  // 오른쪽 벽 밖으로 피킹

// 캐릭터 크기
const P_HEAD_R = 22;
const P_BODY_W = 32, P_BODY_H = 72;

// 적 스폰 위치 (벽 바깥)
const E_ZONES = {
  left:  { cx: 110, cy: 305 },   // 왼쪽 멀리
  right: { cx: 1090, cy: 305 },  // 오른쪽 멀리
};
const E_HEAD_R = 25;
const E_BODY_W = 34, E_BODY_H = 76;

function lerp(a, b, t) { return a + (b - a) * Math.min(1, Math.max(0, t)); }

// ── 배경 ────────────────────────────────────────────
function drawBg(ctx) {
  // 하늘
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#080f1e');
  sky.addColorStop(1, '#101e3a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CW, GROUND_Y);

  // 격자선 (공간감)
  ctx.strokeStyle = 'rgba(80,120,180,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= CW; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GROUND_Y); ctx.stroke(); }
  for (let y = 0; y <= GROUND_Y; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke(); }

  // 지면
  const grd = ctx.createLinearGradient(0, GROUND_Y, 0, CH);
  grd.addColorStop(0, '#1a2a10');
  grd.addColorStop(1, '#0a1408');
  ctx.fillStyle = grd;
  ctx.fillRect(0, GROUND_Y, CW, CH - GROUND_Y);

  // 지면 라인
  ctx.strokeStyle = '#2a4a1a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(CW, GROUND_Y); ctx.stroke();
}

// ── 벽 그리기 ────────────────────────────────────────
function drawWall(ctx, wall, hint) {
  const { x, y, w, h } = wall;

  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x + 8, y + 8, w, h);

  // 본체 (그라디언트로 입체감)
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, '#4a5a6a');
  grad.addColorStop(0.4, '#3a4a58');
  grad.addColorStop(1, '#2a3848');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // 상단 캡
  ctx.fillStyle = '#5a6a7a';
  ctx.fillRect(x, y, w, 10);

  // 벽돌 텍스처
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 1;
  for (let hy = y + 22; hy < y + h; hy += 22) {
    ctx.beginPath(); ctx.moveTo(x, hy); ctx.lineTo(x + w, hy); ctx.stroke();
  }
  for (let row = 0; row < Math.ceil(h / 22); row++) {
    const off = row % 2 === 0 ? 0 : 46;
    for (let vx = x + off; vx < x + w; vx += 92) {
      ctx.beginPath(); ctx.moveTo(vx, y + row * 22); ctx.lineTo(vx, Math.min(y + (row + 1) * 22, y + h)); ctx.stroke();
    }
  }

  // 피킹 힌트 텍스트
  if (hint) {
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = hint.side === 'left' ? 'right' : 'left';
    ctx.fillStyle = 'rgba(150,200,255,0.5)';
    const hx = hint.side === 'left' ? x - 8 : x + w + 8;
    ctx.fillText(hint.text, hx, y + h / 2 + 5);
  }
}

// ── 플레이어 캐릭터 (정면 뷰, 피킹 방향으로 기울어짐) ──
function drawPlayer(ctx, cx, cy, leanDir) {
  const lean = leanDir === 'left' ? -1 : leanDir === 'right' ? 1 : 0;
  const headShift = lean * 28;   // 머리가 기울어지는 정도
  const bodyTilt  = lean * 10;   // 몸 기울기 (px)

  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx + 4, cy + P_BODY_H / 2 + 8, 22, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // 몸통 (기울어짐)
  ctx.save();
  ctx.translate(cx + bodyTilt, cy);
  ctx.fillStyle = '#2b6cb0';
  ctx.beginPath();
  ctx.roundRect(-P_BODY_W / 2, -P_BODY_H / 2, P_BODY_W, P_BODY_H, 4);
  ctx.fill();
  // 방탄복 라인
  ctx.fillStyle = '#1a4a80';
  ctx.fillRect(-P_BODY_W / 2, -P_BODY_H / 2 + 14, P_BODY_W, 5);
  ctx.fillRect(-P_BODY_W / 2, -P_BODY_H / 2 + 26, P_BODY_W, 5);
  ctx.restore();

  // 머리 (더 많이 기울어짐 = 피킹 느낌)
  const headX = cx + headShift;
  const headY = cy - P_BODY_H / 2 - P_HEAD_R + 4;
  ctx.fillStyle = '#3182ce';
  ctx.beginPath(); ctx.arc(headX, headY, P_HEAD_R, 0, Math.PI * 2); ctx.fill();
  // 헬멧
  ctx.fillStyle = '#2b6cb0';
  ctx.beginPath(); ctx.arc(headX, headY, P_HEAD_R, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = '#63b3ed'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(headX, headY, P_HEAD_R, 0, Math.PI * 2); ctx.stroke();

  // 총 (피킹 방향으로 뻗음)
  if (lean !== 0) {
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(headX + lean * P_HEAD_R, headY + 4);
    ctx.lineTo(headX + lean * (P_HEAD_R + 52), headY + 4);
    ctx.stroke();
    // 총구
    ctx.strokeStyle = '#2d3a50';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(headX + lean * (P_HEAD_R + 38), headY + 4);
    ctx.lineTo(headX + lean * (P_HEAD_R + 60), headY + 4);
    ctx.stroke();
  }

  // 'P' 라벨
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText('P', headX, headY + 4);
}

// ── 적 캐릭터 ─────────────────────────────────────────
function drawEnemy(ctx, cx, cy, alpha = 1) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;

  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx + 4, cy + E_BODY_H / 2 + 8, 24, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // 몸통
  ctx.fillStyle = '#9b2c2c';
  ctx.beginPath();
  ctx.roundRect(cx - E_BODY_W / 2, cy - E_BODY_H / 2, E_BODY_W, E_BODY_H, 4);
  ctx.fill();
  ctx.fillStyle = '#7a1e1e';
  ctx.fillRect(cx - E_BODY_W / 2, cy - E_BODY_H / 2 + 14, E_BODY_W, 5);
  ctx.fillRect(cx - E_BODY_W / 2, cy - E_BODY_H / 2 + 26, E_BODY_W, 5);

  // 머리
  const headY = cy - E_BODY_H / 2 - E_HEAD_R + 4;
  ctx.fillStyle = '#c53030';
  ctx.beginPath(); ctx.arc(cx, headY, E_HEAD_R, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#9b2c2c';
  ctx.beginPath(); ctx.arc(cx, headY, E_HEAD_R, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = '#fc8181'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, headY, E_HEAD_R, 0, Math.PI * 2); ctx.stroke();

  // 'E' 라벨
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText('E', cx, headY + 5);

  ctx.restore();
}

// ── 조준선 (에임 라인) ─────────────────────────────────
function drawAimLine(ctx, fromX, fromY, toX, toY) {
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 10]);
  ctx.shadowBlur = 8; ctx.shadowColor = '#ffd700';
  ctx.beginPath(); ctx.moveTo(fromX, fromY); ctx.lineTo(toX, toY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  // 크로스헤어 (적 위치)
  ctx.strokeStyle = 'rgba(255,215,0,0.8)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 5]);
  ctx.beginPath(); ctx.moveTo(toX - 18, toY); ctx.lineTo(toX + 18, toY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(toX, toY - 18); ctx.lineTo(toX, toY + 18); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(toX, toY, 13, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// ── 방향 큐 (화면 엣지 펄스) ──────────────────────────
function drawDirCue(ctx, dir, alpha) {
  const isLeft = dir === 'left';
  const x = isLeft ? 28 : CW - 28;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fc8181';
  ctx.shadowBlur = 16; ctx.shadowColor = '#fc4444';
  ctx.fillText(isLeft ? '◄' : '►', x, CH / 2 - 20);
  ctx.font = 'bold 14px monospace';
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fbb';
  ctx.fillText(isLeft ? 'Q' : 'E', x, CH / 2 + 10);
  ctx.restore();
}

// ── 히트박스 계산 ─────────────────────────────────────
function getEnemyHitboxes(zone) {
  const headY = zone.cy - E_BODY_H / 2 - E_HEAD_R + 4;
  return {
    head: { cx: zone.cx, cy: headY, r: E_HEAD_R + 8 },
    body: { x: zone.cx - E_BODY_W / 2 - 5, y: zone.cy - E_BODY_H / 2, w: E_BODY_W + 10, h: E_BODY_H },
  };
}

// ══════════════════════════════════════════════════════
export default function PeekTrainer() {
  const canvasRef  = useRef(null);
  const gsRef      = useRef(null);
  const rafRef     = useRef(null);
  const timerRef   = useRef(null);
  const [screen, setScreen]   = useState('menu');
  const [results, setResults] = useState(null);

  // ── 라운드 종료 ──────────────────────────────────
  const endRound = useCallback((result, reactionMs) => {
    const s = gsRef.current;
    if (!s || s.phase === 'round_end' || s.gameOver) return;
    s.phase = 'round_end';
    s.roundResult = result;
    s.flashAlpha = 1;
    s.flashGood = result === 'headshot' || result === 'hit';
    let pts = 0;
    if (result === 'headshot') pts = 150 + Math.max(0, Math.round(80 * (1 - reactionMs / 600)));
    else if (result === 'hit')      pts = 80  + Math.max(0, Math.round(40 * (1 - reactionMs / 600)));
    else if (result === 'got_shot') pts = -50;
    else if (result === 'wrong_key') pts = -20;
    s.score += pts;
    s.rounds.push({ result, reactionMs, pts });
  }, []);

  // ── 라운드 스폰 ──────────────────────────────────
  const spawnRound = useCallback(() => {
    const s = gsRef.current;
    if (!s || s.gameOver) return;
    s.phase = 'wait';
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const s2 = gsRef.current;
      if (!s2 || s2.gameOver) return;
      s2.enemyDir = Math.random() < 0.5 ? 'left' : 'right';
      s2.phase = 'enemy_visible';
      s2.enemyPeekAt = performance.now();
      s2.enemyShootAt = s2.enemyPeekAt + 500 + Math.random() * 600;
    }, 1000 + Math.random() * 1500);
  }, []);

  // ── 라운드 리셋 ──────────────────────────────────
  const resetRound = useCallback(() => {
    const s = gsRef.current;
    if (!s || s.gameOver) return;
    s.phase = 'idle';
    s.playerDir = null;
    s.roundResult = null;
    s.roundResetAt = 0;
    spawnRound();
  }, [spawnRound]);

  // ── 게임 시작 ────────────────────────────────────
  const startGame = useCallback(() => {
    clearTimeout(timerRef.current);
    gsRef.current = {
      phase: 'idle',
      px: P_HOME.x, py: P_HOME.y,
      playerDir: null,
      enemyDir: null,
      enemyPeekAt: 0, enemyShootAt: 0,
      pulseT: 0,
      roundResult: null, roundResetAt: 0,
      score: 0, rounds: [],
      gameOver: false,
      startedAt: performance.now(),
      flashAlpha: 0, flashGood: false,
    };
    setScreen('playing');
    setTimeout(() => { if (gsRef.current) spawnRound(); }, 500);
  }, [spawnRound]);

  // ── 키보드 ───────────────────────────────────────
  useEffect(() => {
    if (screen !== 'playing') return;
    function onKey(e) {
      const s = gsRef.current;
      if (!s || s.gameOver || s.phase !== 'enemy_visible') return;
      let dir = null;
      if (e.code === 'KeyQ') dir = 'left';
      else if (e.code === 'KeyE') dir = 'right';
      else return;
      e.preventDefault();
      s.playerDir = dir;
      if (dir === s.enemyDir) {
        s.phase = 'player_peeking';
        setTimeout(() => {
          if (gsRef.current && gsRef.current.phase === 'player_peeking')
            gsRef.current.phase = 'player_visible';
        }, PEEK_DELAY_MS);
      } else {
        endRound('wrong_key', 0);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, endRound]);

  // ── 캔버스 클릭 (사격) ───────────────────────────
  const handleClick = useCallback((e) => {
    const s = gsRef.current;
    if (!s || s.gameOver || s.phase !== 'player_visible') return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (CW / rect.width);
    const cy = (e.clientY - rect.top)  * (CH / rect.height);
    const zone = E_ZONES[s.enemyDir];
    const boxes = getEnemyHitboxes(zone);
    const reactionMs = Math.round(performance.now() - s.enemyPeekAt);
    const dHead = Math.hypot(cx - boxes.head.cx, cy - boxes.head.cy);
    const inBody = cx >= boxes.body.x && cx <= boxes.body.x + boxes.body.w &&
                   cy >= boxes.body.y && cy <= boxes.body.y + boxes.body.h;
    if (dHead < boxes.head.r) endRound('headshot', reactionMs);
    else if (inBody)          endRound('hit',      reactionMs);
    else                      endRound('miss',     reactionMs);
  }, [endRound]);

  // ── 렌더 루프 ────────────────────────────────────
  useEffect(() => {
    if (screen !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let lastT = performance.now();

    function render(now) {
      const s = gsRef.current;
      if (!s) return;
      const dt = Math.min((now - lastT) / 1000, 0.1);
      lastT = now;
      const timeLeft = Math.max(0, GAME_SECS - (now - s.startedAt) / 1000);

      // 게임 오버
      if (timeLeft <= 0 && !s.gameOver) {
        s.gameOver = true;
        clearTimeout(timerRef.current);
        const hits = s.rounds.filter(r => r.result === 'headshot' || r.result === 'hit');
        const hs   = s.rounds.filter(r => r.result === 'headshot');
        const times = hits.map(r => r.reactionMs).filter(t => t > 0 && t < 3000);
        const avgReaction = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
        const hsRate = s.rounds.length ? Math.round(hs.length / s.rounds.length * 100) : 0;
        setResults({ score: s.score, avgReaction, hsRate, rounds: s.rounds, hits: hits.length });
        setScreen('results');
        return;
      }

      // 라운드 자동 리셋
      if (s.phase === 'round_end' && !s.roundResetAt) s.roundResetAt = now + 950;
      if (s.phase === 'round_end' && s.roundResetAt && now >= s.roundResetAt) resetRound();

      // 피격 타임아웃
      if (s.phase === 'player_visible' && now >= s.enemyShootAt) endRound('got_shot', 0);

      // 플레이어 위치 애니메이션
      const target = s.playerDir === 'left' ? P_LEAN_L
                   : s.playerDir === 'right' ? P_LEAN_R
                   : P_HOME;
      s.px = lerp(s.px, target.x, Math.min(1, dt * 14));
      s.py = lerp(s.py, target.y, Math.min(1, dt * 14));

      s.pulseT = (s.pulseT + dt * 3.5) % (Math.PI * 2);
      if (s.flashAlpha > 0) s.flashAlpha = Math.max(0, s.flashAlpha - dt * 2.5);

      // ══ DRAW ══
      drawBg(ctx);

      // 왼쪽 벽
      drawWall(ctx, L_WALL, { side: 'left', text: 'Q ←' });
      // 오른쪽 벽
      drawWall(ctx, R_WALL, { side: 'right', text: '→ E' });

      // 방향 큐 (적 등장 시 깜빡임)
      if ((s.phase === 'enemy_visible' || s.phase === 'player_peeking') && s.enemyDir) {
        const pa = 0.4 + 0.6 * Math.sin(s.pulseT);
        drawDirCue(ctx, s.enemyDir, pa);
      }

      // 적 캐릭터 (올바른 방향으로 피킹했을 때만 보임)
      const enemyVisible = s.playerDir === s.enemyDir &&
        (s.phase === 'player_visible' || s.phase === 'player_peeking' || s.phase === 'round_end');
      if (s.enemyDir) {
        const z = E_ZONES[s.enemyDir];
        drawEnemy(ctx, z.cx, z.cy, enemyVisible ? 1 : 0);
      }

      // 조준선 (에임 라인 - 피킹 성공 시)
      if (s.phase === 'player_visible' && enemyVisible && s.enemyDir) {
        const z = E_ZONES[s.enemyDir];
        const gunTipX = s.px + (s.playerDir === 'left' ? -(P_HEAD_R + 52) : (P_HEAD_R + 52));
        const gunTipY = s.py - P_BODY_H / 2 - P_HEAD_R + 8;
        const enemyHeadY = z.cy - E_BODY_H / 2 - E_HEAD_R + 4;
        drawAimLine(ctx, gunTipX, gunTipY, z.cx, enemyHeadY);
      }

      // 플레이어 캐릭터
      drawPlayer(ctx, s.px, s.py, s.playerDir);

      // 플래시 오버레이
      if (s.flashAlpha > 0) {
        ctx.fillStyle = s.flashGood
          ? `rgba(56,161,105,${s.flashAlpha * 0.35})`
          : `rgba(220,38,38,${s.flashAlpha * 0.42})`;
        ctx.fillRect(0, 0, CW, CH);
      }

      // 라운드 결과 텍스트
      if (s.roundResult && s.phase === 'round_end') {
        const cfg = {
          headshot:  { text: 'HEADSHOT!',   color: '#ffd700' },
          hit:       { text: 'HIT!',         color: '#68d391' },
          miss:      { text: 'MISS',         color: '#a0aec0' },
          got_shot:  { text: 'GOT SHOT!',    color: '#fc4444' },
          wrong_key: { text: 'WRONG KEY!',   color: '#f6ad55' },
        }[s.roundResult];
        if (cfg) {
          ctx.font = 'bold 54px monospace';
          ctx.textAlign = 'center';
          ctx.shadowBlur = 22; ctx.shadowColor = cfg.color;
          ctx.fillStyle = cfg.color;
          ctx.fillText(cfg.text, CW / 2, 90);
          ctx.shadowBlur = 0;
          const last = s.rounds[s.rounds.length - 1];
          if (last) {
            ctx.font = 'bold 26px monospace';
            ctx.fillStyle = last.pts >= 0 ? '#68d391' : '#fc8181';
            ctx.fillText((last.pts >= 0 ? '+' : '') + last.pts + 'pt', CW / 2, 130);
          }
          if (s.roundResult === 'wrong_key') {
            ctx.font = '16px monospace';
            ctx.fillStyle = '#f6ad55';
            ctx.fillText(
              s.enemyDir === 'left' ? '← 왼쪽! Q 키가 맞습니다' : '→ 오른쪽! E 키가 맞습니다',
              CW / 2, 158
            );
          }
        }
      }

      // 하단 힌트
      ctx.shadowBlur = 0;
      const centerX = CW / 2;
      if (s.phase === 'wait' || s.phase === 'idle') {
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(160,174,192,0.4)';
        ctx.fillText('적이 나타나길 기다리세요...', centerX, CH - 8);
      } else if (s.phase === 'enemy_visible') {
        ctx.font = 'bold 23px monospace';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 12; ctx.shadowColor = '#ffd700';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(s.enemyDir === 'left' ? '← Q 키로 피킹!' : 'E 키로 피킹! →', centerX, CH - 8);
        ctx.shadowBlur = 0;
      } else if (s.phase === 'player_peeking') {
        ctx.font = '18px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(150,200,255,0.6)';
        ctx.fillText('피킹 중... 0.2초 후 사격 가능', centerX, CH - 8);
      } else if (s.phase === 'player_visible') {
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10; ctx.shadowColor = '#68d391';
        ctx.fillStyle = '#68d391';
        ctx.fillText('클릭으로 사격!', centerX, CH - 8);
        ctx.shadowBlur = 0;
      }

      // 타이머
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = timeLeft <= 5 ? '#fc8181' : '#e2e8f0';
      ctx.shadowBlur = timeLeft <= 5 ? 8 : 0; ctx.shadowColor = '#fc8181';
      ctx.fillText(Math.ceil(timeLeft) + 's', centerX, 42);
      ctx.shadowBlur = 0;

      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('SCORE: ' + s.score, CW - 16, 42);

      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(160,174,192,0.55)';
      ctx.font = '14px monospace';
      ctx.fillText('ROUNDS: ' + s.rounds.length, 16, 42);

      rafRef.current = requestAnimationFrame(render);
    }

    rafRef.current = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(rafRef.current); clearTimeout(timerRef.current); };
  }, [screen, endRound, resetRound]);

  // ── 메뉴 ─────────────────────────────────────────
  if (screen === 'menu') return (
    <>
      <Head><title>피킹 트레이너 | PKGG</title></Head>
      <Header />
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-8 px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h1 className="text-4xl font-bold mb-2">피킹 트레이너</h1>
          <p className="text-gray-400">벽 뒤에서 최소한의 노출로 먼저 맞추는 교전 기술 훈련</p>
        </div>

        {/* 다이어그램 */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-lg w-full">
          <div className="font-mono text-sm text-center mb-5">
            <div className="flex items-center justify-center gap-4 text-gray-300">
              <div className="text-center">
                <div className="text-red-400 text-2xl mb-1">E</div>
                <div className="text-gray-600 text-xs">적</div>
              </div>
              <div className="text-gray-600">←←←</div>
              <div className="bg-gray-700 border-2 border-gray-500 rounded px-3 py-4 text-xs text-gray-400">
                벽<br/>█<br/>█
              </div>
              <div className="text-center">
                <div className="text-blue-400 text-2xl mb-1">P</div>
                <div className="text-gray-600 text-xs">나</div>
              </div>
              <div className="bg-gray-700 border-2 border-gray-500 rounded px-3 py-4 text-xs text-gray-400">
                벽<br/>█<br/>█
              </div>
              <div className="text-gray-600">→→→</div>
              <div className="text-center">
                <div className="text-red-400 text-2xl mb-1">E</div>
                <div className="text-gray-600 text-xs">적</div>
              </div>
            </div>
            <div className="flex justify-between mt-3 text-blue-400 text-sm px-8">
              <span>← Q 피킹</span>
              <span>E 피킹 →</span>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex gap-2 items-start"><span className="text-yellow-400 mt-0.5">①</span><span>적이 왼쪽 또는 오른쪽에 등장합니다</span></div>
            <div className="flex gap-2 items-start"><span className="text-yellow-400 mt-0.5">②</span>
              <span>방향 표시(◄ ►)를 보고
                <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-xs mx-1">Q</kbd>
                왼쪽 피킹 또는
                <kbd className="bg-gray-700 px-1.5 py-0.5 rounded text-xs mx-1">E</kbd>
                오른쪽 피킹
              </span>
            </div>
            <div className="flex gap-2 items-start"><span className="text-yellow-400 mt-0.5">③</span><span><strong className="text-white">0.2초</strong> — 캐릭터가 기울어지며 노출 → 에임 라인이 적을 향함</span></div>
            <div className="flex gap-2 items-start"><span className="text-yellow-400 mt-0.5">④</span><span><strong className="text-white">클릭</strong>으로 사격! 헤드샷 노려보세요</span></div>
            <div className="flex gap-2 items-start"><span className="text-red-400 mt-0.5">✗</span><span>잘못된 방향 키 -20pt · 너무 느리면 피격 -50pt</span></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-lg w-full text-center text-xs">
          <div className="bg-gray-900 border border-yellow-500/30 rounded-xl p-3">
            <div className="text-yellow-400 font-bold text-xl">+150~230</div>
            <div className="text-gray-400 mt-1">헤드샷</div>
          </div>
          <div className="bg-gray-900 border border-green-500/30 rounded-xl p-3">
            <div className="text-green-400 font-bold text-xl">+80~120</div>
            <div className="text-gray-400 mt-1">바디샷</div>
          </div>
          <div className="bg-gray-900 border border-red-500/30 rounded-xl p-3">
            <div className="text-red-400 font-bold text-xl">-20 / -50</div>
            <div className="text-gray-400 mt-1">오피킹 / 피격</div>
          </div>
        </div>

        <button onClick={startGame}
          className="px-12 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-xl font-bold transition hover:scale-105 active:scale-95">
          게임 시작 (20초)
        </button>
      </div>
    </>
  );

  // ── 결과 ─────────────────────────────────────────
  if (screen === 'results' && results) {
    const { score, avgReaction, hsRate, rounds, hits } = results;
    const grade = score >= 2000 ? { label: 'MASTER',  cls: 'text-purple-400' }
      : score >= 1300           ? { label: 'DIAMOND', cls: 'text-blue-400' }
      : score >= 700            ? { label: 'GOLD',    cls: 'text-yellow-400' }
      : score >= 300            ? { label: 'SILVER',  cls: 'text-gray-300' }
      :                           { label: 'BRONZE',  cls: 'text-orange-400' };
    const rLabel = { headshot:'헤드샷', hit:'바디샷', miss:'미스', got_shot:'피격', wrong_key:'오피킹' };
    const rColor = { headshot:'text-yellow-400', hit:'text-green-400', miss:'text-gray-500', got_shot:'text-red-400', wrong_key:'text-orange-400' };

    return (
      <>
        <Head><title>피킹 트레이너 결과 | PKGG</title></Head>
        <Header />
        <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-7 px-4 py-10">
          <div className="text-center">
            <div className={`text-4xl font-black ${grade.cls}`}>{grade.label}</div>
            <p className="text-gray-500 text-sm mt-1">총 {rounds.length}라운드 · 명중 {hits}회</p>
          </div>
          <div className="grid grid-cols-3 gap-5 max-w-xl w-full">
            {[
              { val: score,                     unit: '',   label: 'Score',      cls: 'text-yellow-400', border: 'border-yellow-500/40' },
              { val: avgReaction || '-',         unit: 'ms', label: '평균 반응속도', cls: 'text-blue-400',   border: 'border-blue-500/40' },
              { val: hsRate + '%',               unit: '',   label: '헤드샷률',    cls: 'text-orange-400', border: 'border-orange-500/40' },
            ].map(({ val, unit, label, cls, border }) => (
              <div key={label} className={`bg-gray-900 border ${border} rounded-xl p-5 text-center`}>
                <div className={`text-3xl font-bold ${cls}`}>{val}<span className="text-lg">{unit}</span></div>
                <div className="text-gray-400 text-xs mt-1">{label}</div>
              </div>
            ))}
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 w-full max-w-md">
            <div className="text-xs text-gray-500 mb-2 px-1">라운드 기록</div>
            <div className="max-h-44 overflow-y-auto space-y-1">
              {rounds.map((r, i) => (
                <div key={i} className="flex justify-between text-sm bg-gray-800/50 rounded px-3 py-1">
                  <span className="text-gray-500 w-5">{i + 1}.</span>
                  <span className={`flex-1 ${rColor[r.result]}`}>{rLabel[r.result]}</span>
                  <span className="text-gray-500 w-16 text-right">{r.reactionMs > 0 ? r.reactionMs + 'ms' : '—'}</span>
                  <span className={`w-14 text-right font-mono ${r.pts >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {r.pts >= 0 ? '+' : ''}{r.pts}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={startGame} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition">다시 하기</button>
            <button onClick={() => setScreen('menu')} className="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold transition">메뉴로</button>
          </div>
        </div>
      </>
    );
  }

  // ── 플레이 화면 ───────────────────────────────────
  return (
    <>
      <Head><title>피킹 트레이너 | PKGG</title></Head>
      <Header />
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-3 px-4">
        <canvas
          ref={canvasRef}
          width={CW} height={CH}
          style={CSS}
          onClick={handleClick}
          className="rounded-xl cursor-crosshair w-full max-w-5xl border border-gray-800"
        />
        <p className="text-gray-600 text-xs">
          <kbd className="bg-gray-800 px-1.5 py-0.5 rounded">Q</kbd> 왼쪽 피킹 &nbsp;|&nbsp;
          <kbd className="bg-gray-800 px-1.5 py-0.5 rounded">E</kbd> 오른쪽 피킹 &nbsp;|&nbsp;
          마우스 클릭 = 사격
        </p>
      </div>
    </>
  );
}
