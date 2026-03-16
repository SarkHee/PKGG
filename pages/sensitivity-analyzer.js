// pages/sensitivity-analyzer.js — PUBG 감도 분석기 + 슬로우모션 리뷰
import Head from 'next/head';
import { useState, useRef, useCallback, useEffect } from 'react';
import Header from '../components/layout/Header';

// ── PUBG 스코프 FOV 데이터 ──────────────────────────────────────────────────
const SCOPES = [
  { id: 'hip',   label: '일반 조준',   fov: 103, key: 'hip'   },
  { id: 'red',   label: '홀로/레드닷', fov: 78,  key: 'red'   },
  { id: 'x2',    label: '2배율',       fov: 55,  key: 'x2'    },
  { id: 'x3',    label: '3배율',       fov: 40,  key: 'x3'    },
];

const SPEED_OPTIONS = [
  { label: '0.1×', value: 0.1 },
  { label: '0.25×', value: 0.25 },
  { label: '0.5×', value: 0.5 },
  { label: '1×', value: 1 },
];

// 자동 추적 상수
const TMPL_SIZE   = 32;  // 템플릿 크기 (업스케일: 더 많은 특징 포함)
const SEARCH_R    = 80;  // 탐색 반경
const SEARCH_R_INIT = 120; // 초기 3프레임: 큰 반동/이동도 커버
const TMPL_REFRESH  = 5; // 매 N프레임마다 템플릿 갱신 (appearance drift 방지)
const LK_SR       = 180; // LK 탐색 반경 (px)
const LK_MAX_PTS  = 24;  // 최대 추적 특징점 수
const LK_WIN_R    = 10;  // LK 윈도우 반경 (21×21)

// ── PUBG 무기 반동 데이터 ────────────────────────────────────────────────────
// vRecoil: 수직 반동 (높을수록 강함), hRecoil: 수평 흔들림, rpm: 분당 발수
const PUBG_WEAPONS = [
  { id: 'none',   name: '무기 선택 (선택사항)', type: '-',   rpm: 0,    vRecoil: 0,   hRecoil: 0,   diff: '-' },
  { id: 'm416',   name: 'M416',               type: 'AR',  rpm: 750,  vRecoil: 4.2, hRecoil: 1.2, diff: '쉬움' },
  { id: 'scarl',  name: 'SCAR-L',             type: 'AR',  rpm: 600,  vRecoil: 3.8, hRecoil: 1.0, diff: '쉬움' },
  { id: 'qbz',    name: 'QBZ',                type: 'AR',  rpm: 750,  vRecoil: 3.5, hRecoil: 0.8, diff: '쉬움' },
  { id: 'aug',    name: 'AUG A3',             type: 'AR',  rpm: 700,  vRecoil: 3.2, hRecoil: 0.9, diff: '쉬움' },
  { id: 'akm',    name: 'AKM',                type: 'AR',  rpm: 600,  vRecoil: 6.8, hRecoil: 3.5, diff: '어려움' },
  { id: 'groza',  name: 'Groza',              type: 'AR',  rpm: 750,  vRecoil: 5.8, hRecoil: 2.0, diff: '보통' },
  { id: 'beryl',  name: 'Beryl M762',         type: 'AR',  rpm: 700,  vRecoil: 7.5, hRecoil: 4.2, diff: '매우 어려움' },
  { id: 'g36c',   name: 'G36C',               type: 'AR',  rpm: 750,  vRecoil: 3.9, hRecoil: 1.1, diff: '쉬움' },
  { id: 'mk12',   name: 'Mk12',               type: 'DMR', rpm: 468,  vRecoil: 3.5, hRecoil: 0.7, diff: '쉬움' },
  { id: 'slr',    name: 'SLR',                type: 'DMR', rpm: 360,  vRecoil: 5.5, hRecoil: 1.5, diff: '보통' },
  { id: 'mini14', name: 'Mini14',             type: 'DMR', rpm: 468,  vRecoil: 3.0, hRecoil: 0.5, diff: '쉬움' },
  { id: 'ump',    name: 'UMP45',              type: 'SMG', rpm: 600,  vRecoil: 2.8, hRecoil: 0.6, diff: '쉬움' },
  { id: 'vector', name: 'Vector',             type: 'SMG', rpm: 1200, vRecoil: 2.5, hRecoil: 0.4, diff: '쉬움' },
  { id: 'mp5k',   name: 'MP5K',               type: 'SMG', rpm: 900,  vRecoil: 2.2, hRecoil: 0.4, diff: '쉬움' },
  { id: 'bizon',  name: 'PP-19 Bizon',        type: 'SMG', rpm: 750,  vRecoil: 2.6, hRecoil: 0.5, diff: '쉬움' },
];

// ── CAMShift 구현 (컴포넌트 외부, 순수 함수) ──────────────────────────────
// RGB → Hue(0~255) 변환
function rgbToHue(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  if (delta === 0) return 0;
  let hue = 0;
  if (max === r)      hue = 60 * (((g - b) / delta) % 6);
  else if (max === g) hue = 60 * ((b - r) / delta + 2);
  else                hue = 60 * ((r - g) / delta + 4);
  if (hue < 0) hue += 360;
  return Math.floor(hue / 360 * 255);
}

// 대상 박스로부터 Hue 히스토그램(256 bins) 생성
function buildHueHistogram(data, imgW, x0, y0, bw, bh) {
  const bins = new Float32Array(256);
  for (let row = y0; row < y0 + bh; row++) {
    for (let col = x0; col < x0 + bw; col++) {
      const i = (row * imgW + col) * 4;
      bins[rgbToHue(data[i], data[i+1], data[i+2])]++;
    }
  }
  const n = bw * bh || 1;
  for (let i = 0; i < 256; i++) bins[i] /= n;
  return bins;
}

// 프레임에 히스토그램 역투영 → 확률 맵
function backProject(data, imgW, hist, sx, sy, sw, sh) {
  const prob = new Float32Array(sw * sh);
  for (let row = 0; row < sh; row++) {
    for (let col = 0; col < sw; col++) {
      const i = ((sy + row) * imgW + (sx + col)) * 4;
      prob[row * sw + col] = hist[rgbToHue(data[i], data[i+1], data[i+2])];
    }
  }
  return prob;
}

// Mean-shift: 확률 맵에서 무게중심 반복 수렴
function meanShift(prob, probW, probH, cx, cy, ww, wh, maxIter = 10) {
  let wx = cx, wy = cy;
  for (let iter = 0; iter < maxIter; iter++) {
    const x0 = Math.max(0, Math.round(wx - ww / 2));
    const y0 = Math.max(0, Math.round(wy - wh / 2));
    const x1 = Math.min(probW, x0 + ww);
    const y1 = Math.min(probH, y0 + wh);
    let sumX = 0, sumY = 0, sumW = 0;
    for (let r = y0; r < y1; r++) {
      for (let c = x0; c < x1; c++) {
        const w = prob[r * probW + c];
        sumX += c * w; sumY += r * w; sumW += w;
      }
    }
    if (sumW < 1e-6) break;
    const nx = sumX / sumW, ny = sumY / sumW;
    if (Math.abs(nx - wx) < 0.5 && Math.abs(ny - wy) < 0.5) break;
    wx = nx; wy = ny;
  }
  return { x: wx, y: wy };
}

// ── Lucas-Kanade Optical Flow (순수 함수) ─────────────────────────────────
// RGBA → Grayscale Float32Array
function rgbaToGray(data, w, h) {
  const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++)
    g[i] = data[i*4]*0.299 + data[i*4+1]*0.587 + data[i*4+2]*0.114;
  return g;
}

// Scharr 그라디언트 (Sobel보다 정확, 대각 방향에 강함)
function computeGrads(gray, w, h) {
  const Ix = new Float32Array(w * h), Iy = new Float32Array(w * h);
  for (let r = 1; r < h - 1; r++) {
    for (let c = 1; c < w - 1; c++) {
      const i = r * w + c;
      Ix[i] = (-3*gray[(r-1)*w+(c-1)] + 3*gray[(r-1)*w+(c+1)]
               -10*gray[r*w+(c-1)]    + 10*gray[r*w+(c+1)]
               -3*gray[(r+1)*w+(c-1)] + 3*gray[(r+1)*w+(c+1)]) / 32;
      Iy[i] = (-3*gray[(r-1)*w+(c-1)] - 10*gray[(r-1)*w+c] - 3*gray[(r-1)*w+(c+1)]
               +3*gray[(r+1)*w+(c-1)] + 10*gray[(r+1)*w+c] + 3*gray[(r+1)*w+(c+1)]) / 32;
    }
  }
  return { Ix, Iy };
}

// Shi-Tomasi 코너 감지: 박스 내 추적 특징점 추출
function detectCorners(gray, w, h, bx0, by0, bw, bh, maxN, winR, minDist) {
  const { Ix, Iy } = computeGrads(gray, w, h);
  const mg = winR + 1;
  const cands = [];
  const rEnd = Math.min(h - mg, by0 + bh - mg);
  const cEnd = Math.min(w - mg, bx0 + bw - mg);
  for (let r = Math.max(mg, by0 + mg); r < rEnd; r++) {
    for (let c = Math.max(mg, bx0 + mg); c < cEnd; c++) {
      let Sxx = 0, Syy = 0, Sxy = 0;
      for (let dr = -winR; dr <= winR; dr++) {
        for (let dc = -winR; dc <= winR; dc++) {
          const ix = Ix[(r+dr)*w+(c+dc)], iy = Iy[(r+dr)*w+(c+dc)];
          Sxx += ix*ix; Syy += iy*iy; Sxy += ix*iy;
        }
      }
      const tr = Sxx + Syy, det = Sxx*Syy - Sxy*Sxy;
      const minEig = (tr - Math.sqrt(Math.max(0, tr*tr - 4*det))) / 2;
      if (minEig > 1) cands.push({ x: c, y: r, s: minEig });
    }
  }
  cands.sort((a, b) => b.s - a.s);
  const picked = [];
  for (const p of cands) {
    if (picked.length >= maxN) break;
    if (picked.every(q => Math.hypot(q.x-p.x, q.y-p.y) >= minDist)) picked.push(p);
  }
  return picked;
}

// LK 광학 흐름: prevGray → currGray 각 점의 displacement 계산
function lkTrackPts(prevGray, currGray, w, h, points) {
  const { Ix, Iy } = computeGrads(prevGray, w, h);
  const wr = LK_WIN_R;
  return points.map(pt => {
    const px = Math.round(pt.x), py = Math.round(pt.y);
    if (px <= wr || px >= w-wr-1 || py <= wr || py >= h-wr-1)
      return { ...pt, dx: 0, dy: 0, found: false };
    let Sxx = 0, Syy = 0, Sxy = 0;
    for (let dr = -wr; dr <= wr; dr++) {
      for (let dc = -wr; dc <= wr; dc++) {
        const ix = Ix[(py+dr)*w+(px+dc)], iy = Iy[(py+dr)*w+(px+dc)];
        Sxx += ix*ix; Syy += iy*iy; Sxy += ix*iy;
      }
    }
    const det = Sxx*Syy - Sxy*Sxy;
    if (Math.abs(det) < 1e-3) return { ...pt, dx: 0, dy: 0, found: false };
    let dx = 0, dy = 0;
    for (let iter = 0; iter < 20; iter++) {
      let Sxt = 0, Syt = 0;
      for (let dr = -wr; dr <= wr; dr++) {
        for (let dc = -wr; dc <= wr; dc++) {
          const nx = px + dc + dx, ny = py + dr + dy;
          const xi = Math.floor(nx), yi = Math.floor(ny);
          if (xi < 0 || xi >= w-1 || yi < 0 || yi >= h-1) continue;
          const a = nx-xi, b = ny-yi;
          const curr = currGray[yi*w+xi]*(1-a)*(1-b) + currGray[yi*w+xi+1]*a*(1-b)
                     + currGray[(yi+1)*w+xi]*(1-a)*b + currGray[(yi+1)*w+xi+1]*a*b;
          const It = curr - prevGray[(py+dr)*w+(px+dc)];
          Sxt += Ix[(py+dr)*w+(px+dc)] * It;
          Syt += Iy[(py+dr)*w+(px+dc)] * It;
        }
      }
      const ddx = (-Syy*Sxt + Sxy*Syt) / det;
      const ddy = ( Sxy*Sxt - Sxx*Syt) / det;
      dx += ddx; dy += ddy;
      if (Math.abs(ddx)+Math.abs(ddy) < 0.03) break;
    }
    return { x: pt.x+dx, y: pt.y+dy, dx, dy, found: Math.hypot(dx, dy) < LK_SR };
  });
}

// 배열 중앙값 (이상치에 강인)
function medianArr(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m-1]+s[m]) / 2;
}

// Viewspeed 방식: sqrt(tan(fov_scope/2) / tan(fov_base/2))
function calcViewspeedSens(baseSens, baseFov, scopeFov) {
  const toRad = (d) => (d * Math.PI) / 180;
  const ratio = Math.sqrt(Math.tan(toRad(scopeFov / 2)) / Math.tan(toRad(baseFov / 2)));
  return Math.round(baseSens * ratio * 100) / 100;
}

// 킬피드 ROI(우상단) 흰 픽셀 밀도로 사망/기절 텍스트 감지
// PUBG 킬피드: 우측 45%, 상단 18% 영역 / 흰 텍스트+아이콘 → 12% 초과 시 감지
function checkKillFeed(video, tc) {
  const ctx = tc.getContext('2d');
  const W = tc.width, H = tc.height;
  ctx.drawImage(video, 0, 0, W, H);
  const rx = Math.round(W * 0.55), rw = Math.round(W * 0.45);
  const ry = 0,                    rh = Math.round(H * 0.18);
  const data = ctx.getImageData(rx, ry, rw, rh).data;
  let white = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 210 && data[i + 1] > 210 && data[i + 2] > 210) white++;
  }
  return (white / (rw * rh)) > 0.12;
}

export default function SensitivityAnalyzer() {
  // ── 설정 입력 ──────────────────────────────────────────────────────────────
  const [dpi, setDpi] = useState(800);
  const [hipSens, setHipSens] = useState(50);
  const [vertSens, setVertSens] = useState(1.0);
  const [currentScopes, setCurrentScopes] = useState({
    red: 45, x2: 40, x3: 35,
  });

  // ── 무기 선택 ──────────────────────────────────────────────────────────────
  const [selectedWeapon, setSelectedWeapon] = useState('none');

  // ── 체감 질문 ──────────────────────────────────────────────────────────────
  const [feel, setFeel] = useState({ overshoot: null, tracking: null, scope: null });

  // ── 영상 리뷰 (선택) ────────────────────────────────────────────────────────
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // ── 반동 마킹 ─────────────────────────────────────────────────────────────
  // markMode: null | 'crosshair' | 'enemy_drag'
  const [markMode, setMarkMode] = useState(null);
  const [marks, setMarks] = useState([]);           // [{x,y,time,box}] 추적된 적 중심 위치 (normalized)
  const [targetBox, setTargetBox] = useState(null); // {x1,y1,x2,y2} 현재 추적 중인 적 박스 위치
  const [dragStart, setDragStart] = useState(null); // 드래그 시작점 (normalized)
  const [dragCurrent, setDragCurrent] = useState(null); // 드래그 현재점 (normalized)
  // 분석 탭: 'search' = 에임 써치(일반감도), 'recoil' = 반동 제어(스코프)
  const [analysisTab, setAnalysisTab] = useState('search');
  const analysisMode = analysisTab === 'recoil' ? 'scope' : 'hip'; // derived (하위 호환)
  const analysisModeRef = useRef('hip');
  useEffect(() => { analysisModeRef.current = analysisMode; }, [analysisMode]);
  // 킬피드 감지 상태
  const [killDetected, setKillDetected] = useState(false);
  const [killFrameTime, setKillFrameTime] = useState(null);
  const killDetectedRef = useRef(false);
  const [showClipDetail, setShowClipDetail] = useState(false);
  // 크로스헤어 위치 (기본: 화면 중앙)
  const [crosshairPos, setCrosshairPos] = useState({ x: 0.5, y: 0.5 });
  const [crosshairSet, setCrosshairSet] = useState(false);

  // 자동 추적
  const templateRef          = useRef(null);  // ZNCC용 Float32Array (크로스헤어 추적 전용)
  const crosshairTemplateRef = useRef(null);  // 크로스헤어 월드패치 템플릿
  const hueHistRef           = useRef(null);  // CAMShift용 Hue 히스토그램
  const trackCanvasRef       = useRef(null);  // hidden canvas for frame extraction
  const [tracking, setTracking]         = useState(false);
  const [trackProgress, setTrackProgress] = useState(0);
  const [trackFrames, setTrackFrames]   = useState(20);
  const [crosshairTrack, setCrosshairTrack] = useState([]);

  // LK Optical Flow 추적
  const lkAbsPtsRef   = useRef([]);   // 추적 특징점 (image-absolute px)
  const lkPrevGrayRef = useRef(null); // 이전 프레임 grayscale (Float32Array)
  const lkPrevRegRef  = useRef(null); // 이전 프레임 추출 영역 {sx,sy,sw,sh}

  // COCO-SSD 자동 감지
  const tfModelRef          = useRef(null);   // 모델 인스턴스
  const [modelLoading, setModelLoading] = useState(false);
  const [autoDetections, setAutoDetections] = useState([]); // [{x1,y1,x2,y2,score}]

  // canvas 다시 그리기
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // 드래그 중 프리뷰 박스 (노란 점선)
    if (dragStart && dragCurrent) {
      const bx = Math.min(dragStart.x, dragCurrent.x) * W;
      const by = Math.min(dragStart.y, dragCurrent.y) * H;
      const bw = Math.abs(dragCurrent.x - dragStart.x) * W;
      const bh = Math.abs(dragCurrent.y - dragStart.y) * H;
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(250,204,21,0.08)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('드래그 → 적 영역', bx + 4, by - 4);
    }

    // 적 추적 박스 (추적 완료 후 현재 위치, 주황)
    if (targetBox) {
      const bx = targetBox.x1 * W, by = targetBox.y1 * H;
      const bw = (targetBox.x2 - targetBox.x1) * W;
      const bh = (targetBox.y2 - targetBox.y1) * H;
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(249,115,22,0.1)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('적', bx + 4, by + 13);
      // 중심점 십자
      const cx = (targetBox.x1 + targetBox.x2) / 2 * W;
      const cy = (targetBox.y1 + targetBox.y2) / 2 * H;
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8); ctx.stroke();
    }

    // 크로스헤어 위치 표시 (얇게)
    {
      const cpx = crosshairPos.x * W, cpy = crosshairPos.y * H;
      ctx.strokeStyle = 'rgba(34,197,94,0.75)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cpx - 6, cpy); ctx.lineTo(cpx + 6, cpy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cpx, cpy - 6); ctx.lineTo(cpx, cpy + 6); ctx.stroke();
      ctx.beginPath(); ctx.arc(cpx, cpy, 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#22c55e';
      ctx.font = '8px sans-serif';
      ctx.fillText(crosshairSet ? '✓' : '·', cpx + 5, cpy - 3);
    }

    // 크로스헤어 월드패치 이동 경로 (보라색)
    crosshairTrack.forEach((m, i) => {
      if (i === 0) return;
      const prev = crosshairTrack[i - 1];
      const x1 = prev.x * W, y1 = prev.y * H;
      const px = m.x * W, py = m.y * H;
      const len = Math.hypot(px - x1, py - y1);
      if (len > 0.5) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(px, py);
        ctx.strokeStyle = 'rgba(168,85,247,0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(168,85,247,${0.4 + 0.6 * i / crosshairTrack.length})`;
      ctx.fill();
    });
    if (crosshairTrack.length > 0) {
      const last = crosshairTrack[crosshairTrack.length - 1];
      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('크로스헤어 이동', last.x * W + 6, last.y * H - 3);
    }

    // 적 중심 이동 궤적 (주황 연결선)
    marks.forEach((m, i) => {
      if (i === 0) return;
      const prev = marks[i - 1];
      const x1 = prev.x * W, y1 = prev.y * H;
      const px = m.x * W, py = m.y * H;
      const len = Math.hypot(px - x1, py - y1);
      if (len > 1) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(px, py);
        ctx.strokeStyle = 'rgba(249,115,22,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      // 프레임 인덱스 점
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(249,115,22,${0.4 + 0.6 * i / marks.length})`;
      ctx.fill();
    });
    // 적 중심 최초 위치 (초록 큰 점)
    if (marks.length > 0) {
      const fp = marks[0];
      ctx.beginPath();
      ctx.arc(fp.x * W, fp.y * H, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('적 발견', fp.x * W + 8, fp.y * H - 4);
    }

    // COCO-SSD 자동 감지 후보 박스 (클릭으로 선택)
    autoDetections.forEach((d, idx) => {
      const bx = d.x1 * W, by = d.y1 * H;
      const bw = (d.x2 - d.x1) * W, bh = (d.y2 - d.y1) * H;
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(168,85,247,0.12)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`사람${idx + 1} ${Math.round(d.score * 100)}%  ← 클릭해서 선택`, bx + 4, by - 4);
    });
  }, [marks, targetBox, dragStart, dragCurrent, crosshairPos, crosshairSet, crosshairTrack, autoDetections]);

  useEffect(() => { redrawCanvas(); }, [redrawCanvas]);

  // canvas 좌표 → normalized (0~1)
  const toNorm = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  }, []);

  // 마우스 이벤트 — enemy_drag: 드래그로 적 영역 박스 선택
  const handleCanvasMouseDown = useCallback((e) => {
    if (markMode === 'enemy_drag' && !tracking) {
      const pos = toNorm(e);
      setDragStart(pos);
      setDragCurrent(pos);
    }
    if (markMode === 'crosshair') {
      // crosshair는 mouseUp에서 처리
    }
  }, [markMode, tracking, toNorm]);

  // 지정 위치의 grayscale 템플릿 캡처 → refObj.current에 저장
  const captureGrayTemplate = useCallback((normX, normY, refObj) => {
    const video = videoRef.current;
    const tc = trackCanvasRef.current;
    if (!video || !tc) return;
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const px = Math.round(normX * vw);
    const py = Math.round(normY * vh);
    tc.width = TMPL_SIZE; tc.height = TMPL_SIZE;
    const ctx = tc.getContext('2d');
    ctx.drawImage(video,
      px - TMPL_SIZE / 2, py - TMPL_SIZE / 2, TMPL_SIZE, TMPL_SIZE,
      0, 0, TMPL_SIZE, TMPL_SIZE);
    const d = ctx.getImageData(0, 0, TMPL_SIZE, TMPL_SIZE).data;
    const gray = new Float32Array(TMPL_SIZE * TMPL_SIZE);
    for (let i = 0; i < gray.length; i++)
      gray[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
    refObj.current = gray;
  }, []);

  // 하위호환용 래퍼
  const captureTemplate = useCallback((normX, normY) => {
    captureGrayTemplate(normX, normY, templateRef);
  }, [captureGrayTemplate]);

  // CAMShift용 Hue 히스토그램 캡처 (박스 영역 전체)
  const captureHueHistogram = useCallback((normX1, normY1, normX2, normY2) => {
    const video = videoRef.current;
    const tc = trackCanvasRef.current;
    if (!video || !tc) return;
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const px = Math.round(normX1 * vw), py = Math.round(normY1 * vh);
    const pw = Math.max(4, Math.round((normX2 - normX1) * vw));
    const ph = Math.max(4, Math.round((normY2 - normY1) * vh));
    tc.width = pw; tc.height = ph;
    const ctx = tc.getContext('2d');
    ctx.drawImage(video, px, py, pw, ph, 0, 0, pw, ph);
    const d = ctx.getImageData(0, 0, pw, ph).data;
    hueHistRef.current = buildHueHistogram(d, pw, 0, 0, pw, ph);
  }, []);

  // ── LK 초기화: 박스 내 특징점 추출 + 이전 프레임 grayscale 저장 ──────────
  const initLKPoints = useCallback((normX1, normY1, normX2, normY2) => {
    const video = videoRef.current, tc = trackCanvasRef.current;
    if (!video || !tc) return;
    const vw = video.videoWidth || 1280, vh = video.videoHeight || 720;
    const absCx = Math.round((normX1 + normX2) / 2 * vw);
    const absCy = Math.round((normY1 + normY2) / 2 * vh);
    const sx = Math.max(0, absCx - LK_SR), sy = Math.max(0, absCy - LK_SR);
    const sw = Math.min(vw - sx, LK_SR * 2), sh = Math.min(vh - sy, LK_SR * 2);
    if (sw < 16 || sh < 16) return;
    tc.width = sw; tc.height = sh;
    const ctx = tc.getContext('2d');
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    const gray = rgbaToGray(ctx.getImageData(0, 0, sw, sh).data, sw, sh);
    // 박스를 로컬 좌표로 변환
    const bx0 = Math.max(0, Math.round(normX1 * vw) - sx);
    const by0 = Math.max(0, Math.round(normY1 * vh) - sy);
    const bw  = Math.max(8, Math.round((normX2 - normX1) * vw));
    const bh  = Math.max(8, Math.round((normY2 - normY1) * vh));
    const corners = detectCorners(gray, sw, sh, bx0, by0, bw, bh, LK_MAX_PTS, 3, 7);
    if (corners.length < 3) return; // 특징점 부족 → LK 비활성
    // 절대 좌표로 저장
    lkAbsPtsRef.current  = corners.map(p => ({ x: p.x + sx, y: p.y + sy }));
    lkPrevGrayRef.current = gray;
    lkPrevRegRef.current  = { sx, sy, sw, sh };
  }, []);

  // ── LK 한 프레임 추적 → 새 normalized 위치 반환 ────────────────────────
  const lkFind = useCallback((normLastX, normLastY) => {
    const pts     = lkAbsPtsRef.current;
    const prevGray = lkPrevGrayRef.current;
    const prevReg  = lkPrevRegRef.current;
    if (!pts.length || !prevGray || !prevReg) return null;
    const video = videoRef.current, tc = trackCanvasRef.current;
    if (!video || !tc) return null;
    const vw = video.videoWidth || 1280, vh = video.videoHeight || 720;
    const { sx, sy, sw, sh } = prevReg;
    // 현재 프레임을 이전 프레임과 동일한 영역에서 추출
    tc.width = sw; tc.height = sh;
    const ctx = tc.getContext('2d');
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    const currGray = rgbaToGray(ctx.getImageData(0, 0, sw, sh).data, sw, sh);
    // 절대 좌표 → 로컬 좌표 (prevReg 기준)
    const localPts = pts.map(p => ({ x: p.x - sx, y: p.y - sy }));
    // LK 추적
    const results = lkTrackPts(prevGray, currGray, sw, sh, localPts);
    const found   = results.filter(r => r.found);
    if (found.length < 3) { lkAbsPtsRef.current = []; return null; }
    // 중앙값 displacement
    const mdx = medianArr(found.map(r => r.dx));
    const mdy = medianArr(found.map(r => r.dy));
    const newAbsX = normLastX * vw + mdx;
    const newAbsY = normLastY * vh + mdy;
    // 절대 좌표 업데이트
    lkAbsPtsRef.current = pts.map((p, i) =>
      results[i]?.found ? { x: p.x + results[i].dx, y: p.y + results[i].dy } : p
    );
    // 다음 프레임용 prevGray를 새 위치 중심으로 추출
    const nsx = Math.max(0, Math.round(newAbsX) - LK_SR);
    const nsy = Math.max(0, Math.round(newAbsY) - LK_SR);
    const nsw = Math.min(vw - nsx, LK_SR * 2), nsh = Math.min(vh - nsy, LK_SR * 2);
    if (nsw >= 16 && nsh >= 16) {
      tc.width = nsw; tc.height = nsh;
      ctx.drawImage(video, nsx, nsy, nsw, nsh, 0, 0, nsw, nsh);
      lkPrevGrayRef.current = rgbaToGray(ctx.getImageData(0, 0, nsw, nsh).data, nsw, nsh);
      lkPrevRegRef.current  = { sx: nsx, sy: nsy, sw: nsw, sh: nsh };
    }
    return { x: newAbsX / vw, y: newAbsY / vh };
  }, []);

  // CAMShift 추적: 현재 프레임에서 히스토그램 역투영 → mean-shift로 새 중심 계산
  const camShiftFind = useCallback((normLastX, normLastY, normBoxW, normBoxH) => {
    const video = videoRef.current;
    const tc = trackCanvasRef.current;
    if (!hueHistRef.current || !video || !tc) return null;
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const bw = Math.max(4, Math.round(normBoxW * vw));
    const bh = Math.max(4, Math.round(normBoxH * vh));
    const sr = Math.max(bw, bh) + SEARCH_R;
    const lastPx = Math.round(normLastX * vw);
    const lastPy = Math.round(normLastY * vh);
    const sx = Math.max(0, lastPx - sr);
    const sy = Math.max(0, lastPy - sr);
    const sw = Math.min(vw - sx, sr * 2);
    const sh = Math.min(vh - sy, sr * 2);
    if (sw < 4 || sh < 4) return null;
    tc.width = sw; tc.height = sh;
    const ctx = tc.getContext('2d');
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    const d = ctx.getImageData(0, 0, sw, sh).data;
    const prob = backProject(d, sw, hueHistRef.current, 0, 0, sw, sh);
    // 탐색 창의 초기 중심: lastPos를 로컬 좌표로 변환
    const localCx = lastPx - sx;
    const localCy = lastPy - sy;
    const result = meanShift(prob, sw, sh, localCx, localCy, bw, bh);
    return { x: (sx + result.x) / vw, y: (sy + result.y) / vh };
  }, []);

  // COCO-SSD 모델 로드 (최초 1회)
  const loadTFModel = useCallback(async () => {
    if (tfModelRef.current) return tfModelRef.current;
    setModelLoading(true);
    try {
      const [tf, cocoSsd] = await Promise.all([
        import('@tensorflow/tfjs'),
        import('@tensorflow-models/coco-ssd'),
      ]);
      await tf.ready();
      const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      tfModelRef.current = model;
    } catch(e) {
      console.error('TF 모델 로드 실패', e);
    }
    setModelLoading(false);
    return tfModelRef.current;
  }, []);

  // COCO-SSD 자동 적 감지
  const autoDetectEnemy = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    const model = tfModelRef.current || await loadTFModel();
    if (!model) return;
    const predictions = await model.detect(video);
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const persons = predictions
      .filter(p => p.class === 'person' && p.score > 0.25)
      .map(p => ({
        x1: p.bbox[0] / vw, y1: p.bbox[1] / vh,
        x2: (p.bbox[0] + p.bbox[2]) / vw, y2: (p.bbox[1] + p.bbox[3]) / vh,
        score: p.score,
      }));
    setAutoDetections(persons);
    // 감지된 사람이 1명이면 자동 선택
    if (persons.length === 1) {
      const p = persons[0];
      const cx = (p.x1 + p.x2) / 2, cy = (p.y1 + p.y2) / 2;
      setTargetBox({ x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2 });
      captureTemplate(cx, cy);
      captureHueHistogram(p.x1, p.y1, p.x2, p.y2);
      initLKPoints(p.x1, p.y1, p.x2, p.y2);
      captureGrayTemplate(crosshairPos.x, crosshairPos.y, crosshairTemplateRef);
      setCrosshairTrack([]);
      const firstMark = [{ x: cx, y: cy, time: video.currentTime, box: { x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2 } }];
      setMarks(firstMark);
      setAutoDetections([]);
      autoTrackRef.current?.(firstMark, crosshairPos);
    }
  }, [loadTFModel, captureTemplate, captureHueHistogram, initLKPoints, captureGrayTemplate, crosshairPos]);

  // ZNCC 템플릿 매칭 — 밝기 변화(총구 화염 등)에 강인
  // tmpl: Float32Array, searchRadius: SEARCH_R | SEARCH_R_INIT
  const findBestMatchWith = useCallback((tmpl, normLastX, normLastY, searchRadius = SEARCH_R) => {
    const video = videoRef.current;
    const tc = trackCanvasRef.current;
    if (!tmpl || !video || !tc) return null;
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const lastPx = Math.round(normLastX * vw);
    const lastPy = Math.round(normLastY * vh);
    const sw = searchRadius * 2 + TMPL_SIZE;
    const sh = searchRadius * 2 + TMPL_SIZE;
    const sx = Math.max(0, lastPx - searchRadius - TMPL_SIZE / 2);
    const sy = Math.max(0, lastPy - searchRadius - TMPL_SIZE / 2);
    tc.width = sw; tc.height = sh;
    const ctx = tc.getContext('2d');
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
    const d = ctx.getImageData(0, 0, sw, sh).data;
    const frame = new Float32Array(sw * sh);
    for (let i = 0; i < frame.length; i++)
      frame[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;

    // 템플릿 평균 · 표준편차 (1회 계산)
    const N = TMPL_SIZE * TMPL_SIZE;
    let tmplMean = 0;
    for (let i = 0; i < N; i++) tmplMean += tmpl[i];
    tmplMean /= N;
    let tmplVar = 0;
    for (let i = 0; i < N; i++) tmplVar += (tmpl[i] - tmplMean) ** 2;
    const tmplStd = Math.sqrt(tmplVar / N);
    if (tmplStd < 1) return { x: normLastX, y: normLastY }; // 무채색 템플릿 → 원위치 반환

    let best = -Infinity, bdx = searchRadius, bdy = searchRadius;
    for (let dy = 0; dy <= searchRadius * 2; dy++) {
      for (let dx = 0; dx <= searchRadius * 2; dx++) {
        // 패치 평균
        let pMean = 0;
        for (let ty = 0; ty < TMPL_SIZE; ty++)
          for (let tx = 0; tx < TMPL_SIZE; tx++)
            pMean += frame[(dy + ty) * sw + (dx + tx)];
        pMean /= N;
        // 패치 분산 + 교차상관
        let pVar = 0, cross = 0;
        for (let ty = 0; ty < TMPL_SIZE; ty++) {
          for (let tx = 0; tx < TMPL_SIZE; tx++) {
            const fp = frame[(dy + ty) * sw + (dx + tx)] - pMean;
            const tp = tmpl[ty * TMPL_SIZE + tx] - tmplMean;
            pVar += fp * fp;
            cross += fp * tp;
          }
        }
        const pStd = Math.sqrt(pVar / N);
        if (pStd < 1) continue;
        const zncc = cross / (tmplStd * pStd * N);
        if (zncc > best) { best = zncc; bdx = dx; bdy = dy; }
      }
    }
    return { x: (sx + bdx + TMPL_SIZE / 2) / vw, y: (sy + bdy + TMPL_SIZE / 2) / vh };
  }, []);

  // 자동 추적: LK(1순위) → CAMShift(2순위) → ZNCC(3순위) + 크로스헤어 ZNCC
  const autoTrackRef = useRef(null);
  const autoTrack = useCallback(async (startMarks, initCrosshairPos) => {
    if (startMarks.length === 0) return;
    const hasLK   = lkAbsPtsRef.current.length >= 3;
    const hasHist = !!hueHistRef.current;
    const hasZncc = !!templateRef.current;
    if (!hasLK && !hasHist && !hasZncc) return;
    setTracking(true);
    setTrackProgress(0);
    setKillDetected(false);
    setKillFrameTime(null);
    setShowClipDetail(false);
    killDetectedRef.current = false;
    const video = videoRef.current;
    const frameStep = 1 / 30;
    let lastEnemyX = startMarks[startMarks.length - 1].x;
    let lastEnemyY = startMarks[startMarks.length - 1].y;
    const initBox = startMarks[0].box ?? { x1: lastEnemyX - 0.05, y1: lastEnemyY - 0.08, x2: lastEnemyX + 0.05, y2: lastEnemyY + 0.08 };
    let boxW = initBox.x2 - initBox.x1;
    let boxH = initBox.y2 - initBox.y1;
    const hasCrosshairTmpl = !!crosshairTemplateRef.current;
    const isScopeMode = analysisModeRef.current === 'scope';
    // 스코프 모드: 크로스헤어는 항상 화면 중앙. 일반 모드: 사용자 지정 위치에서 시작
    let lastCrossX = isScopeMode ? 0.5 : (initCrosshairPos?.x ?? 0.5);
    let lastCrossY = isScopeMode ? 0.5 : (initCrosshairPos?.y ?? 0.5);
    const newMarks = [...startMarks];
    // 스코프 모드에서는 템플릿 없어도 중앙 고정 트랙 생성
    const newCrossTrack = (hasCrosshairTmpl || isScopeMode)
      ? [{ x: lastCrossX, y: lastCrossY, time: startMarks[0].time }]
      : [];

    for (let i = 0; i < trackFrames; i++) {
      const nextTime = startMarks[0].time + frameStep * (i + 1);
      if (nextTime >= video.duration) break;
      await new Promise(res => {
        video.currentTime = nextTime;
        video.addEventListener('seeked', res, { once: true });
      });

      // ① LK Optical Flow (주 추적 — 조명·색상 무관)
      let enemyMatch = null;
      if (lkAbsPtsRef.current.length >= 3) {
        enemyMatch = lkFind(lastEnemyX, lastEnemyY);
      }
      // ② CAMShift fallback (색상 히스토그램)
      if (!enemyMatch && hasHist) {
        enemyMatch = camShiftFind(lastEnemyX, lastEnemyY, boxW, boxH);
      }
      // ③ ZNCC fallback (템플릿 매칭)
      if (!enemyMatch && hasZncc) {
        const sr = i < 3 ? SEARCH_R_INIT : SEARCH_R;
        enemyMatch = findBestMatchWith(templateRef.current, lastEnemyX, lastEnemyY, sr);
      }
      if (!enemyMatch) break;

      lastEnemyX = enemyMatch.x; lastEnemyY = enemyMatch.y;
      newMarks.push({ x: enemyMatch.x, y: enemyMatch.y, time: nextTime });
      setMarks([...newMarks]);
      setTargetBox({
        x1: enemyMatch.x - boxW / 2,
        y1: enemyMatch.y - boxH / 2,
        x2: enemyMatch.x + boxW / 2,
        y2: enemyMatch.y + boxH / 2,
      });

      // 매 TMPL_REFRESH 프레임마다 모든 추적기 갱신
      if (i > 0 && i % TMPL_REFRESH === 0) {
        initLKPoints(
          enemyMatch.x - boxW / 2, enemyMatch.y - boxH / 2,
          enemyMatch.x + boxW / 2, enemyMatch.y + boxH / 2
        );
        captureHueHistogram(
          enemyMatch.x - boxW / 2, enemyMatch.y - boxH / 2,
          enemyMatch.x + boxW / 2, enemyMatch.y + boxH / 2
        );
        if (hasZncc) captureGrayTemplate(lastEnemyX, lastEnemyY, templateRef);
      }

      // 크로스헤어 추적
      if (analysisModeRef.current === 'scope') {
        // 스코프 모드: 조준선은 항상 화면 정중앙 고정 (HUD 요소라 이동 없음)
        // ZNCC 를 쓰면 주변시 흔들림에 오인식 → 중앙 고정이 물리적으로 정확한 모델
        lastCrossX = 0.5; lastCrossY = 0.5;
        newCrossTrack.push({ x: 0.5, y: 0.5, time: nextTime });
        setCrosshairTrack([...newCrossTrack]);
      } else if (hasCrosshairTmpl) {
        // 일반 감도 모드: ZNCC 로 크로스헤어 월드패치 추적
        const crossMatch = findBestMatchWith(crosshairTemplateRef.current, lastCrossX, lastCrossY, SEARCH_R);
        if (crossMatch) {
          lastCrossX = crossMatch.x; lastCrossY = crossMatch.y;
          newCrossTrack.push({ x: crossMatch.x, y: crossMatch.y, time: nextTime });
          setCrosshairTrack([...newCrossTrack]);
        }
      }
      setTrackProgress(i + 1);

      // 반동 분석 탭: 킬피드 ROI에서 사망/기절 감지 → 자동 종료
      if (analysisModeRef.current === 'scope' && !killDetectedRef.current) {
        if (checkKillFeed(video, trackCanvasRef.current)) {
          killDetectedRef.current = true;
          setKillDetected(true);
          setKillFrameTime(nextTime);
          break;
        }
      }
    }
    setTracking(false);
  }, [trackFrames, lkFind, initLKPoints, camShiftFind, findBestMatchWith, captureHueHistogram, captureGrayTemplate,
      setKillDetected, setKillFrameTime, setShowClipDetail]);
  autoTrackRef.current = autoTrack;

  const handleCanvasMouseMove = useCallback((e) => {
    if (markMode === 'enemy_drag' && dragStart && !tracking) {
      setDragCurrent(toNorm(e));
    }
  }, [markMode, dragStart, tracking, toNorm]);

  const handleCanvasMouseUp = useCallback((e) => {
    const pos = toNorm(e);

    // COCO-SSD 감지 후보 클릭 선택
    if (autoDetections.length > 1) {
      const hit = autoDetections.find(d =>
        pos.x >= d.x1 && pos.x <= d.x2 && pos.y >= d.y1 && pos.y <= d.y2
      );
      if (hit) {
        const cx = (hit.x1 + hit.x2) / 2, cy = (hit.y1 + hit.y2) / 2;
        setTargetBox({ x1: hit.x1, y1: hit.y1, x2: hit.x2, y2: hit.y2 });
        captureTemplate(cx, cy);
        captureHueHistogram(hit.x1, hit.y1, hit.x2, hit.y2);
        initLKPoints(hit.x1, hit.y1, hit.x2, hit.y2);
        captureGrayTemplate(crosshairPos.x, crosshairPos.y, crosshairTemplateRef);
        setCrosshairTrack([]);
        const firstMark = [{ x: cx, y: cy, time: videoRef.current?.currentTime ?? 0, box: hit }];
        setMarks(firstMark);
        setAutoDetections([]);
        autoTrackRef.current?.(firstMark, crosshairPos);
        return;
      }
    }

    // 크로스헤어 위치 지정 모드
    if (markMode === 'crosshair') {
      setCrosshairPos(pos);
      setCrosshairSet(true);
      setMarkMode(null);
      return;
    }

    // 드래그 적 영역 확정
    if (markMode === 'enemy_drag' && dragStart && !tracking) {
      const x1 = Math.min(dragStart.x, pos.x);
      const y1 = Math.min(dragStart.y, pos.y);
      const x2 = Math.max(dragStart.x, pos.x);
      const y2 = Math.max(dragStart.y, pos.y);
      const minSize = 0.02;
      if (x2 - x1 < minSize || y2 - y1 < minSize) {
        // 드래그 범위가 너무 작으면 무시
        setDragStart(null); setDragCurrent(null);
        return;
      }
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const time = videoRef.current?.currentTime ?? 0;
      const box = { x1, y1, x2, y2 };
      setTargetBox(box);
      setDragStart(null); setDragCurrent(null);
      // 박스 중심 ZNCC 템플릿 + CAMShift 히스토그램 동시 캡처
      captureTemplate(cx, cy);
      captureHueHistogram(x1, y1, x2, y2);
      initLKPoints(x1, y1, x2, y2);
      captureGrayTemplate(crosshairPos.x, crosshairPos.y, crosshairTemplateRef);
      setCrosshairTrack([]);
      const firstMark = [{ x: cx, y: cy, time, box }];
      setMarks(firstMark);
      setMarkMode(null);
      autoTrackRef.current?.(firstMark, crosshairPos);
    }
  }, [markMode, dragStart, tracking, toNorm, captureTemplate, captureHueHistogram, initLKPoints, captureGrayTemplate, crosshairPos, setCrosshairPos, setCrosshairSet]);

  // 발사 순서별 색상 (초록 → 노랑 → 빨강)
  const shotColor = (i, total) => {
    const t = total <= 1 ? 0 : i / (total - 1);
    const hue = Math.round(120 - t * 120);
    return `hsl(${hue},100%,55%)`;
  };

  const analyzeRecoil = () => {
    if (marks.length < 2) return null;
    const W = 1280, H = 720;
    // 첫 마킹 = 적 최초 발견 위치 (드래그 박스의 중심)
    const enemyInitX = marks[0].x;
    const enemyInitY = marks[0].y;
    // 적 중심 기준점 (현재 targetBox 기반)
    const refX = enemyInitX;
    const refY = enemyInitY;

    // ── 일반감도 접근 분석 ────────────────────────────────────────────────────
    // 적 발견 시점의 크로스헤어 위치 vs 적 중심 거리 = 일반감도로 이동해야 할 거리
    const crossInitX = crosshairPos.x;
    const crossInitY = crosshairPos.y;
    const hipApproachDist = Math.hypot((enemyInitX - crossInitX) * W, (enemyInitY - crossInitY) * H);
    // 크로스헤어가 적 방향으로 얼마나 이동했는가 (첫 프레임 → 마지막 프레임 크로스헤어 위치)
    const crossFinalX = crosshairTrack.length > 0 ? crosshairTrack[crosshairTrack.length - 1].x : crossInitX;
    const crossFinalY = crosshairTrack.length > 0 ? crosshairTrack[crosshairTrack.length - 1].y : crossInitY;
    // 목표 방향 벡터 (적 방향)
    const toEnemyX = (enemyInitX - crossInitX) * W;
    const toEnemyY = (enemyInitY - crossInitY) * H;
    const toEnemyLen = Math.hypot(toEnemyX, toEnemyY) || 1;
    // 크로스헤어가 적 방향으로 이동한 성분 (내적)
    const crossMovedX = (crossFinalX - crossInitX) * W;
    const crossMovedY = (crossFinalY - crossInitY) * H;
    const hipProjection = (crossMovedX * toEnemyX + crossMovedY * toEnemyY) / toEnemyLen;
    // 넘침 계산: projection > hipApproachDist 이면 overshoot
    const hipOvershootPx = hipProjection - hipApproachDist; // + = 과보정, - = 미달
    const hipOvershootPct = hipApproachDist > 0 ? Math.round((hipProjection / hipApproachDist) * 100) : 100;
    // 이상적 감도 비율: 과보정 비율 기반 역산
    // 현재 감도로 hipProjection 이동, 이상은 hipApproachDist 이동
    // 비율: idealSens = hipSens * (hipApproachDist / hipProjection)
    const hipSensRatio = hipProjection > 5 ? hipApproachDist / hipProjection : 1;
    const hipIdealSens = Math.max(1, Math.min(100, Math.round(hipSens * hipSensRatio * 10) / 10));
    const hipIdealEdpi = Math.round(dpi * hipIdealSens / 100);

    // 각 마킹의 적 기준 절대 편차 (px)
    const shots = marks.map((m, i) => ({
      idx: i,
      rx: (m.x - refX) * W,   // + = 오른쪽
      ry: (m.y - refY) * H,   // + = 아래 (반동 = 위로 튐 → ry 감소)
      time: m.time,
    }));

    // 연속 벡터
    const vectors = marks.slice(1).map((m, i) => ({
      dx: (m.x - marks[i].x) * W,
      dy: (m.y - marks[i].y) * H,
      pxLen: Math.hypot((m.x - marks[i].x) * W, (m.y - marks[i].y) * H),
    }));

    const avgDx = vectors.reduce((s, v) => s + v.dx, 0) / vectors.length;
    const avgDy = vectors.reduce((s, v) => s + v.dy, 0) / vectors.length;
    const totalDist = Math.sqrt(vectors.reduce((s, v) => s + v.dx ** 2 + v.dy ** 2, 0) / vectors.length);
    const dyMean = vectors.reduce((s, v) => s + v.dy, 0) / vectors.length;
    const dyVar = vectors.reduce((s, v) => s + (v.dy - dyMean) ** 2, 0) / vectors.length;
    const consistency = Math.max(0, Math.round((1 - Math.sqrt(dyVar) / (totalDist + 0.001)) * 100));

    // 크로스헤어 분석 (사용자 지정 위치 또는 화면 중앙)
    const crosshairDists = marks.map(m =>
      Math.hypot((m.x - crosshairPos.x) * W, (m.y - crosshairPos.y) * H)
    );
    const avgCrossDist = crosshairDists.reduce((s, v) => s + v, 0) / crosshairDists.length;
    const minCrossDist = Math.min(...crosshairDists);
    const minCrossFrame = crosshairDists.indexOf(minCrossDist);
    const THRESH = W * 0.05; // 64px = 화면의 5%
    const trackAcc = Math.round(crosshairDists.filter(d => d < THRESH).length / crosshairDists.length * 100);
    // 써치 분석: 첫 프레임 초기 오차 + 적이 조준점(화면 중앙)에 도달하는 프레임
    const initialOffsetPx = crosshairDists[0] ?? 0;
    const initialOffsetPct = Math.round((initialOffsetPx / W) * 100);
    const aimCompletionFrame = crosshairDists.findIndex(d => d < THRESH);
    const aimMs = aimCompletionFrame >= 0 ? Math.round(aimCompletionFrame * (1000 / 30)) : null;
    // 과보정: 최소 거리 이후 다시 40px 이상 멀어지면 과보정
    const afterMin = crosshairDists.slice(minCrossFrame);
    const crossOvershoot = minCrossDist < 40 && afterMin.length > 2 && afterMin[afterMin.length - 1] > minCrossDist + 40;

    // ── 크로스헤어 월드패치 이동 분석 (반동 실측) ──────────────────────────
    // crosshairTrack[i] = 크로스헤어 위치의 게임 월드 패치가 프레임 i에서 이동한 위치
    // 이동 방향 = 플레이어가 보정하지 못한 반동 방향
    const hasCrossTrack = crosshairTrack.length >= 2;
    let crossRecoilVecs = [];       // 프레임간 크로스헤어 패치 이동 벡터
    let crossTotalDriftY = 0;       // 수직 총 드리프트 (px, + = 아래로 밀림 = 반동 위)
    let crossTotalDriftX = 0;       // 수평 총 드리프트
    let crossAvgDriftPx  = 0;       // 평균 프레임당 드리프트 크기
    let crossCompRate    = 0;       // 보정률 (0~100%, 높을수록 보정 잘 됨)
    let crossSensHint    = null;    // 감도 힌트: 'too_high' | 'good' | 'too_low'
    let crossIdealEdpi   = null;    // 크로스헤어 추적 기반 이상 eDPI
    let crossIdealHip    = null;

    if (hasCrossTrack) {
      crossRecoilVecs = crosshairTrack.slice(1).map((m, i) => ({
        dx: (m.x - crosshairTrack[i].x) * W,
        dy: (m.y - crosshairTrack[i].y) * H,
      }));
      crossTotalDriftY = crossRecoilVecs.reduce((s, v) => s + v.dy, 0);
      crossTotalDriftX = crossRecoilVecs.reduce((s, v) => s + v.dx, 0);
      const crossDriftLens = crossRecoilVecs.map(v => Math.hypot(v.dx, v.dy));
      crossAvgDriftPx = crossDriftLens.reduce((s, v) => s + v, 0) / crossDriftLens.length;

      // 보정률: 크로스헤어가 초기 위치에서 벗어나지 않은 비율
      // 완전 보정 = 0 드리프트, 보정 없음 = 최대 드리프트
      // 기준: 평균 드리프트 < 5px/frame → 잘 보정됨
      const MAX_DRIFT_GOOD = 5;
      crossCompRate = Math.max(0, Math.round((1 - crossAvgDriftPx / (MAX_DRIFT_GOOD + crossAvgDriftPx)) * 100));

      // 감도 힌트: 보정 패턴에서 eDPI 적합성 판단
      // 드리프트가 크고 방향이 일관됨 → 플레이어가 보정 중이지만 모자람 → 보정 속도 부족 → eDPI 낮을 수도
      // 드리프트가 불규칙하게 큼 → 과보정/과조정 → eDPI 너무 높을 수도
      const currentEdpiVal = dpi * (hipSens / 100);
      const driftStdY = Math.sqrt(
        crossRecoilVecs.reduce((s, v) => s + (v.dy - crossTotalDriftY / crossRecoilVecs.length) ** 2, 0) /
        crossRecoilVecs.length
      );
      // 드리프트 일관성: 낮으면 과보정(너무 높은 감도), 높으면 보정 방향이 일관
      const driftConsistency = Math.max(0, 1 - driftStdY / (Math.abs(crossTotalDriftY / crossRecoilVecs.length) + 1));

      if (crossAvgDriftPx < 2) {
        crossSensHint = 'perfect'; // 거의 완벽한 보정
      } else if (driftConsistency > 0.6 && crossTotalDriftY > 0) {
        // 일관되게 아래로 밀림 = 반동을 충분히 당기지 못함 = 보정량 부족
        // 이 반동을 보정하려면 cm/sec 증가 필요
        crossSensHint = 'need_more_correction';
      } else if (driftConsistency < 0.3 && crossAvgDriftPx > 4) {
        // 불규칙한 큰 드리프트 = 과보정 진동 → 감도 낮춰야 미세조정 가능
        crossSensHint = 'too_high';
      } else {
        crossSensHint = 'good';
      }

      // 크로스헤어 드리프트 기반 이상 eDPI 계산
      // 목표: 평균 드리프트를 2px/frame으로 줄이려면 얼마의 마우스 이동이 필요한가
      // 현재 eDPI로 1px 보정 = 25.4/eDPI mm, 30fps 기준 cm/sec
      // 이상 eDPI: 드리프트 px/frame → 2cm/sec 마우스 이동으로 보정
      if (crossAvgDriftPx > 1) {
        const neededCmSec = 2; // 목표 보정 속도 cm/sec
        crossIdealEdpi = Math.round(crossAvgDriftPx * 25.4 * 30 / (neededCmSec * 10));
        crossIdealHip = Math.round(crossIdealEdpi / dpi * 100 * 10) / 10;
      } else {
        crossIdealEdpi = currentEdpiVal;
        crossIdealHip = hipSens;
      }
    }

    // ── 감도 연동 분석 (기존 적 추적 기반) ─────────────────────────────────
    // 반동 px → 보정에 필요한 마우스 이동량 계산
    const recoilPxPerFrame = Math.abs(avgDy) * H;   // px/frame (수직 반동만)
    const currentEdpi = dpi * (hipSens / 100);
    // 1px 보정 = 25.4 / eDPI mm 이동 필요
    const mmPerFrame = recoilPxPerFrame * 25.4 / Math.max(currentEdpi, 1);
    const cmPerSec   = mmPerFrame * 30 / 10;  // 30fps 기준 cm/sec
    // 이상 범위: 1~4 cm/sec 의 마우스 이동이 반동 보정에 최적
    let sensEval = 'good';
    if (recoilPxPerFrame < 1) {
      sensEval = 'stable';    // 반동 거의 없음 — 분석 불필요
    } else if (cmPerSec < 0.8) {
      sensEval = 'too_high';  // 감도 너무 높음 — 조금만 움직여도 큰 이동 → 정밀 보정 어려움
    } else if (cmPerSec <= 4) {
      sensEval = 'good';      // 적절
    } else {
      sensEval = 'too_low';   // 감도 너무 낮음 — 보정에 손목을 많이 써야 함
    }
    // 이상적 eDPI: cmPerSec ≈ 2 (중간값) 기준 역산
    const idealEdpi = recoilPxPerFrame > 1 ? Math.round(recoilPxPerFrame * 25.4 * 30 / (2 * 10)) : currentEdpi;
    const idealHipSens = Math.round(idealEdpi / dpi * 100 * 10) / 10;

    return {
      avgDx, avgDy, vectors, consistency, totalDist, shots,
      crosshairDists, avgCrossDist, minCrossDist, minCrossFrame, trackAcc, crossOvershoot,
      recoilPxPerFrame, mmPerFrame, cmPerSec, sensEval, idealEdpi, idealHipSens, currentEdpi,
      // 일반감도 접근 분석
      hipApproachDist, hipProjection, hipOvershootPx, hipOvershootPct, hipIdealSens, hipIdealEdpi,
      // 크로스헤어 추적 기반 (더 정밀)
      hasCrossTrack, crossRecoilVecs, crossTotalDriftY, crossTotalDriftX,
      crossAvgDriftPx, crossCompRate, crossSensHint, crossIdealEdpi, crossIdealHip,
      // 써치 분석 지표
      initialOffsetPx, initialOffsetPct, aimCompletionFrame, aimMs,
    };
  };

  // ── 영상 파일 처리 ─────────────────────────────────────────────────────────
  const handleVideoFile = useCallback((file) => {
    if (!file?.type.startsWith('video/')) return;
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoOpen(true);
  }, []);

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (playing) {
      vid.pause();
    } else {
      vid.play().catch(() => { vid.muted = true; vid.play().catch(() => {}); });
    }
  };

  const handleSpeedChange = (v) => {
    setSpeed(v);
    if (videoRef.current) videoRef.current.playbackRate = v;
  };

  // ── 감도 계산 (Viewspeed) ──────────────────────────────────────────────────
  const calcSens = useCallback((baseSens, scopeFov) => {
    const baseFov = SCOPES[0].fov; // 103
    return calcViewspeedSens(baseSens, baseFov, scopeFov);
  }, []);

  // 체감 기반 보정 배율
  const getFeelMultiplier = () => {
    let m = 1;
    if (feel.overshoot === 'yes') m *= 0.88;   // 과보정 → 낮춤
    if (feel.overshoot === 'no')  m *= 1.1;    // 너무 느림 → 높임
    if (feel.tracking === 'slow') m *= 1.08;
    if (feel.tracking === 'fast') m *= 0.92;
    return m;
  };

  const fmt = (t) => {
    const m = Math.floor(t / 60);
    const s = (t % 60).toFixed(1).padStart(4, '0');
    return `${m}:${s}`;
  };

  return (
    <>
      <Head>
        <title>감도 분석기 — PK.GG</title>
        <meta name="description" content="PUBG 감도 설정을 분석하고 스코프별 최적 감도를 추천합니다." />
      </Head>
      <div className="min-h-screen bg-gray-950 text-white">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* hidden canvas for template matching */}
          <canvas ref={trackCanvasRef} style={{ display: 'none' }} />

          {/* 타이틀 */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-1.5 text-blue-400 text-sm mb-3">
              🎯 스코프별 최적 감도 자동 계산
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">감도 분석기</h1>
            <p className="text-gray-400 text-sm">DPI와 현재 감도를 입력하면 스코프별 최적 감도를 추천합니다. 연습 영상도 슬로우모션으로 복기할 수 있어요.</p>
          </div>

          {/* ── 영상 리뷰 섹션 ── */}
          <div className="bg-gray-800 rounded-xl mb-5 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">🎬 연습 영상 슬로우모션 리뷰</span>
                <span className="text-xs text-gray-400">(선택)</span>
              </div>
              <div className="flex items-center gap-2">
                {!videoUrl && (
                  <button
                    onClick={() => document.getElementById('videoFileInput').click()}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                  >
                    영상 불러오기
                  </button>
                )}
                {videoUrl && (
                  <button
                    onClick={() => setVideoOpen(o => !o)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                  >
                    {videoOpen ? '닫기 ✕' : '⛶ 전체화면으로 분석'}
                  </button>
                )}
                <input id="videoFileInput" type="file" accept="video/*" className="hidden"
                  onChange={(e) => handleVideoFile(e.target.files[0])} />
              </div>
            </div>
            {videoUrl && !videoOpen && (
              <div className="px-4 pb-3">
                <p className="text-xs text-gray-500">영상 로드 완료 — 버튼을 클릭해 전체화면으로 분석하세요.</p>
              </div>
            )}
          </div>

          {/* ── 영상 전체화면 오버레이 ── */}
          {videoUrl && videoOpen && (() => {
            const r = marks.length >= 2 ? analyzeRecoil() : null;
            const PW = 200, PH = 360;
            let pathPoints = [];
            let scatterScale = 50;
            if (r) {
              const maxR = Math.max(10, ...r.shots.map(s => Math.max(Math.abs(s.rx), Math.abs(s.ry))));
              scatterScale = maxR * 1.4;
              // 조준점을 SVG 중앙에 배치
              pathPoints = r.shots.map(s => ({
                x: PW/2 + (s.rx / scatterScale) * (PW/2 - 16),
                y: PH/2 + (s.ry / scatterScale) * (PH/2 - 16),
                rx: s.rx, ry: s.ry, idx: s.idx,
              }));
            }
            const SP = 160;
            const maxCrossDist = r ? Math.max(...r.crosshairDists, 10) : 1;
            return (
              <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#030712', display: 'flex', flexDirection: 'column' }}>
                {/* 상단 바 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: '#111827', borderBottom: '1px solid #374151', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>🎬 연습 영상 리뷰</span>
                    {marks.length > 0 && <span style={{ fontSize: 12, color: '#f97316', fontWeight: 700 }}>발사 #{marks.length} 추적됨</span>}
                    {r && <span style={{ fontSize: 12, color: r.trackAcc >= 70 ? '#4ade80' : r.trackAcc >= 40 ? '#facc15' : '#f87171', fontWeight: 700 }}>추적 정확도 {r.trackAcc}%</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => { setVideoUrl(null); setVideoOpen(false); setMarks([]); setTargetBox(null); templateRef.current = null; crosshairTemplateRef.current = null; setCrosshairTrack([]); }}
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: '#374151', color: '#9ca3af', border: 'none', cursor: 'pointer' }}
                    >영상 삭제</button>
                    <button
                      onClick={() => setVideoOpen(false)}
                      style={{ fontSize: 12, padding: '5px 14px', borderRadius: 6, background: '#374151', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >✕ 닫기</button>
                  </div>
                </div>

                {/* 본문 */}
                <div style={{ flex: 1, display: 'flex', gap: 10, padding: 10, overflow: 'hidden', minHeight: 0 }}>

                  {/* ── 왼쪽: 영상 플레이어 (크게) ── */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                    <div style={{ flex: 1, position: 'relative', background: '#000', borderRadius: 10, overflow: 'hidden', minHeight: 0 }}>
                      <video
                        key={videoUrl}
                        ref={videoRef}
                        src={videoUrl}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        playsInline
                        preload="auto"
                        onLoadedMetadata={(e) => setDuration(e.target.duration)}
                        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                        onPlay={() => setPlaying(true)}
                        onPause={() => setPlaying(false)}
                        onEnded={() => setPlaying(false)}
                      />
                      <canvas
                        ref={canvasRef}
                        width={1280}
                        height={720}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: (markMode === 'enemy_drag' || markMode === 'crosshair') ? 'crosshair' : 'default' }}
                      />
                      {marks.length > 0 && (
                        <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.85)', borderRadius: 5, padding: '3px 10px', fontSize: 13, fontWeight: 700, color: '#f97316', pointerEvents: 'none' }}>
                          발사 #{marks.length}
                        </div>
                      )}
                      <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.7)', borderRadius: 4, padding: '2px 10px', fontSize: 12, fontFamily: 'monospace', color: '#fff', pointerEvents: 'none' }}>
                        {fmt(currentTime)} / {fmt(duration)} &nbsp;|&nbsp; {speed}×
                      </div>
                      {markMode === 'enemy_drag' && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(234,88,12,0.95)', padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#fff', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          🟥 적 몸통을 드래그해서 박스를 그려주세요
                          <span style={{ fontSize: 18 }}>↕</span>
                        </div>
                      )}
                      {markMode === 'crosshair' && (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(22,163,74,0.95)', padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#fff', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          📍 크로스헤어 위치를 클릭하세요
                          <span style={{ fontSize: 18 }}>↓</span>
                        </div>
                      )}
                    </div>
                    {/* 시크바 */}
                    <input type="range" min="0" max={duration || 1} step="0.033"
                      value={currentTime}
                      onChange={(e) => { if (videoRef.current) videoRef.current.currentTime = Number(e.target.value); }}
                      style={{ width: '100%', accentColor: '#3b82f6', height: 4 }} />
                    {/* 재생 컨트롤 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <button onClick={() => { if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = Math.max(0, currentTime - 1/30); }}}
                        style={{ padding: '5px 10px', background: '#374151', borderRadius: 6, fontSize: 12, color: '#fff', border: 'none', cursor: 'pointer' }}>⏮ 1f</button>
                      <button onClick={togglePlay}
                        style={{ padding: '5px 20px', background: '#3b82f6', borderRadius: 6, fontSize: 14, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                        {playing ? '⏸' : '▶'}
                      </button>
                      <button onClick={() => { if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = Math.min(duration, currentTime + 1/30); }}}
                        style={{ padding: '5px 10px', background: '#374151', borderRadius: 6, fontSize: 12, color: '#fff', border: 'none', cursor: 'pointer' }}>1f ⏭</button>
                      <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                        {SPEED_OPTIONS.map(s => (
                          <button key={s.value} onClick={() => handleSpeedChange(s.value)}
                            style={{ padding: '5px 10px', borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer', background: speed === s.value ? '#3b82f6' : '#374151', color: speed === s.value ? '#fff' : '#9ca3af' }}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── 오른쪽: 컨트롤 + 분석 패널 ── */}
                  <div style={{ width: 296, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flexShrink: 0 }}>

                    {/* ── 분석 탭 선택기 ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, flexShrink: 0 }}>
                      {[
                        { id: 'search', icon: '📍', label: '에임 써치', sub: '일반감도', color: '#059669', bg: 'rgba(5,150,105,0.15)', border: '#05966955' },
                        { id: 'recoil', icon: '💥', label: '반동 제어', sub: '스코프감도', color: '#7c3aed', bg: 'rgba(124,58,237,0.15)', border: '#7c3aed55' },
                      ].map(tp => (
                        <button key={tp.id} onClick={() => {
                          setAnalysisTab(tp.id);
                          setMarks([]); setTargetBox(null);
                          templateRef.current = null; crosshairTemplateRef.current = null;
                          setCrosshairTrack([]); setTrackProgress(0);
                          setKillDetected(false); setKillFrameTime(null); setShowClipDetail(false);
                        }}
                          style={{
                            padding: '8px 6px', borderRadius: 8, border: `1px solid ${analysisTab === tp.id ? tp.border : '#374151'}`,
                            background: analysisTab === tp.id ? tp.bg : '#111827',
                            cursor: 'pointer', textAlign: 'center',
                          }}>
                          <div style={{ fontSize: 16 }}>{tp.icon}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: analysisTab === tp.id ? tp.color : '#9ca3af', marginTop: 2 }}>{tp.label}</div>
                          <div style={{ fontSize: 9, color: analysisTab === tp.id ? tp.color : '#6b7280', opacity: 0.8 }}>{tp.sub}</div>
                        </button>
                      ))}
                    </div>

                    {/* ── 감도 설정 (최상단) ── */}
                    <div style={{ background: '#111827', borderRadius: 10, padding: 12, flexShrink: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 10 }}>⚙️ 감도 설정</p>

                      {/* DPI */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af', marginBottom: 3 }}>
                          <span>마우스 DPI</span>
                        </div>
                        <input type="number" value={dpi} min="100" max="16000" step="100"
                          onChange={e => setDpi(Number(e.target.value))}
                          style={{ width: '100%', background: '#1e293b', border: '1px solid #374151', borderRadius: 6, padding: '5px 8px', fontSize: 12, color: '#e2e8f0', boxSizing: 'border-box' }} />
                      </div>

                      {/* 일반 감도 */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af', marginBottom: 3 }}>
                          <span>일반 감도</span>
                          <span style={{ color: '#3b82f6', fontWeight: 700 }}>{hipSens} <span style={{ color: '#475569', fontSize: 9 }}>eDPI {Math.round(dpi * hipSens / 100)}</span></span>
                        </div>
                        <input type="range" min="1" max="100" step="1" value={hipSens}
                          onChange={e => setHipSens(Number(e.target.value))}
                          style={{ width: '100%', accentColor: '#3b82f6' }} />
                      </div>

                      {/* 수직 감도 배율 */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af', marginBottom: 3 }}>
                          <span>수직 감도 배율</span>
                          <span style={{ color: '#a78bfa', fontWeight: 700 }}>{vertSens.toFixed(2)}×</span>
                        </div>
                        <input type="range" min="0.5" max="2.0" step="0.05" value={vertSens}
                          onChange={e => setVertSens(Number(e.target.value))}
                          style={{ width: '100%', accentColor: '#a855f7' }} />
                      </div>

                      {/* 스코프 감도 */}
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', marginBottom: 5 }}>스코프 감도</p>
                      {SCOPES.slice(1).map(s => (
                        <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                          <span style={{ fontSize: 10, color: '#6b7280', width: 64, flexShrink: 0 }}>{s.label}</span>
                          <input type="range" min="1" max="100" step="1"
                            value={currentScopes[s.key] || 0}
                            onChange={e => setCurrentScopes(prev => ({ ...prev, [s.key]: Number(e.target.value) }))}
                            style={{ flex: 1, accentColor: '#3b82f6' }} />
                          <span style={{ fontSize: 10, color: '#e2e8f0', width: 20, textAlign: 'right', flexShrink: 0 }}>{currentScopes[s.key]}</span>
                        </div>
                      ))}

                      {/* 체감 질문 */}
                      <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', marginTop: 8, marginBottom: 5 }}>체감 (선택)</p>
                      <div style={{ marginBottom: 6 }}>
                        <p style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>조준 시 자주 지나치나요?</p>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[['yes','지나침'],['no','느린느낌'],['fine','적당']].map(([v, l]) => (
                            <button key={v} onClick={() => setFeel(f => ({ ...f, overshoot: v }))}
                              style={{ flex: 1, padding: '4px 0', borderRadius: 5, fontSize: 10, border: `1px solid ${feel.overshoot === v ? '#3b82f6' : '#374151'}`, background: feel.overshoot === v ? '#1d4ed8' : '#1e293b', color: feel.overshoot === v ? '#fff' : '#6b7280', cursor: 'pointer' }}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>이동 타겟 추적 느낌은?</p>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[['fast','너무 빠름'],['slow','너무 느림'],['ok','좋음']].map(([v, l]) => (
                            <button key={v} onClick={() => setFeel(f => ({ ...f, tracking: v }))}
                              style={{ flex: 1, padding: '4px 0', borderRadius: 5, fontSize: 10, border: `1px solid ${feel.tracking === v ? '#3b82f6' : '#374151'}`, background: feel.tracking === v ? '#1d4ed8' : '#1e293b', color: feel.tracking === v ? '#fff' : '#6b7280', cursor: 'pointer' }}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ── 스코프 추천 결과 (항상 실시간 계산) ── */}
                    {(() => {
                      const mult = getFeelMultiplier();
                      const adjHip = Math.round(hipSens * mult * 10) / 10;
                      const adjEdpi = dpi * (adjHip / 100);
                      const rec = {};
                      SCOPES.slice(1).forEach(s => { rec[s.key] = calcSens(adjHip, s.fov); });
                      const ana = {};
                      SCOPES.slice(1).forEach(s => {
                        const ideal = calcSens(hipSens, s.fov);
                        const cur = currentScopes[s.key] || 0;
                        const diff = Math.round((cur - ideal) * 10) / 10;
                        ana[s.key] = { ideal: Math.round(ideal * 10) / 10, current: cur, diff, status: Math.abs(diff) < 3 ? 'good' : diff > 0 ? 'high' : 'low' };
                      });
                      return (
                        <div style={{ background: '#111827', borderRadius: 10, padding: 12, flexShrink: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 8 }}>📐 스코프별 추천 감도</p>
                          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                            <div style={{ flex: 1, background: '#1e293b', borderRadius: 7, padding: '7px 0', textAlign: 'center' }}>
                              <p style={{ fontSize: 9, color: '#6b7280' }}>추천 일반감도</p>
                              <p style={{ fontSize: 16, fontWeight: 900, color: '#60a5fa' }}>{adjHip}</p>
                              <p style={{ fontSize: 9, color: '#475569' }}>eDPI {Math.round(adjEdpi)}</p>
                            </div>
                            <div style={{ flex: 1, background: '#1e293b', borderRadius: 7, padding: '7px 0', textAlign: 'center' }}>
                              <p style={{ fontSize: 9, color: '#6b7280' }}>수직 배율</p>
                              <p style={{ fontSize: 16, fontWeight: 900, color: '#a78bfa' }}>{vertSens.toFixed(2)}×</p>
                            </div>
                          </div>
                          {SCOPES.slice(1).map(s => {
                            const r2 = ana[s.key];
                            return (
                              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                                <span style={{ fontSize: 10, color: '#6b7280', width: 64, flexShrink: 0 }}>{s.label}</span>
                                <span style={{ fontSize: 10, color: '#475569', width: 20, textAlign: 'right' }}>{r2.current}</span>
                                <span style={{ fontSize: 12, color: r2.status === 'good' ? '#4ade80' : r2.status === 'high' ? '#fb923c' : '#60a5fa' }}>
                                  {r2.status === 'good' ? '✓' : r2.status === 'high' ? '▼' : '▲'}
                                </span>
                                <span style={{ fontSize: 13, fontWeight: 900, color: '#60a5fa', flex: 1 }}>{rec[s.key]}</span>
                                {r2.status !== 'good' && (
                                  <span style={{ fontSize: 9, color: r2.status === 'high' ? '#fb923c' : '#60a5fa' }}>
                                    {r2.diff > 0 ? '+' : ''}{r2.diff}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          <button
                            onClick={() => {
                              const lines = [`DPI: ${dpi}`, `일반 감도: ${adjHip}`, `수직 감도: ${vertSens.toFixed(2)}×`, '---'];
                              SCOPES.slice(1).forEach(s => { lines.push(`${s.label}: ${rec[s.key]}`); });
                              navigator.clipboard.writeText(lines.join('\n'));
                            }}
                            style={{ width: '100%', marginTop: 8, padding: '6px 0', borderRadius: 6, fontSize: 11, background: '#374151', color: '#9ca3af', border: 'none', cursor: 'pointer' }}>
                            📋 설정값 복사
                          </button>
                        </div>
                      );
                    })()}

                    {/* 무기 선택 — 반동 탭만 표시 */}
                    {analysisTab === 'recoil' && <div style={{ background: '#111827', borderRadius: 10, padding: 12, flexShrink: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 6 }}>🔫 무기 선택 (선택사항)</p>
                      <p style={{ fontSize: 10, color: '#6b7280', marginBottom: 6 }}>무기별 반동 데이터와 비교해 제어 점수를 측정합니다.</p>
                      <select
                        value={selectedWeapon}
                        onChange={e => setSelectedWeapon(e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: 6, background: '#1e293b', color: '#e2e8f0', border: '1px solid #374151', fontSize: 12, cursor: 'pointer' }}
                      >
                        {PUBG_WEAPONS.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name}{w.type !== '-' ? ` (${w.type})` : ''}
                          </option>
                        ))}
                      </select>
                      {selectedWeapon !== 'none' && (() => {
                        const wep = PUBG_WEAPONS.find(w => w.id === selectedWeapon);
                        return (
                          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            <div style={{ flex: 1, background: '#0f172a', borderRadius: 5, padding: '4px 6px', textAlign: 'center' }}>
                              <p style={{ fontSize: 9, color: '#6b7280' }}>RPM</p>
                              <p style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{wep.rpm}</p>
                            </div>
                            <div style={{ flex: 1, background: '#0f172a', borderRadius: 5, padding: '4px 6px', textAlign: 'center' }}>
                              <p style={{ fontSize: 9, color: '#6b7280' }}>수직반동</p>
                              <p style={{ fontSize: 12, fontWeight: 700, color: '#fb923c' }}>{wep.vRecoil}</p>
                            </div>
                            <div style={{ flex: 1, background: '#0f172a', borderRadius: 5, padding: '4px 6px', textAlign: 'center' }}>
                              <p style={{ fontSize: 9, color: '#6b7280' }}>난이도</p>
                              <p style={{ fontSize: 12, fontWeight: 700, color: wep.diff === '매우 어려움' ? '#f87171' : wep.diff === '어려움' ? '#fb923c' : wep.diff === '보통' ? '#facc15' : '#4ade80' }}>{wep.diff}</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>}

                  {/* 크로스헤어 위치 지정 — 숨김 (항상 화면 중앙 0.5,0.5) */}
                  {false && /* 크로스헤어 위치 */
                    <div style={{ background: '#111827', borderRadius: 10, padding: 12, flexShrink: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 6 }}>① 크로스헤어 위치</p>
                      <p style={{ fontSize: 10, color: '#6b7280', marginBottom: 8 }}>
                        크로스헤어 위치를 지정하면 해당 영역의 이동을 추적해 <span style={{ color: '#a78bfa', fontWeight: 700 }}>정밀 감도 분석</span>이 가능합니다.
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ fontSize: 11 }}>
                          {crosshairSet
                            ? <span style={{ color: '#4ade80' }}>✓ 직접 지정 ({Math.round(crosshairPos.x * 100)}%, {Math.round(crosshairPos.y * 100)}%)</span>
                            : <span style={{ color: '#9ca3af' }}>화면 중앙 (기본값)</span>
                          }
                        </div>
                        {crosshairSet && (
                          <button
                            onClick={() => { setCrosshairPos({ x: 0.5, y: 0.5 }); setCrosshairSet(false); }}
                            style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#374151', color: '#9ca3af', border: 'none', cursor: 'pointer' }}
                          >초기화</button>
                        )}
                      </div>
                      <button
                        onClick={() => { setMarkMode('crosshair'); if (videoRef.current) videoRef.current.pause(); }}
                        style={{ width: '100%', padding: '7px 0', borderRadius: 7, fontSize: 12, fontWeight: 700, background: markMode === 'crosshair' ? '#16a34a' : '#374151', color: '#fff', border: 'none', cursor: 'pointer' }}
                      >
                        {markMode === 'crosshair' ? '🎯 영상에서 크로스헤어를 클릭하세요' : '📍 크로스헤어 위치 직접 지정'}
                      </button>
                    </div>}

                    {/* 추적 컨트롤 */}
                    <div style={{ background: '#111827', borderRadius: 10, padding: 12, flexShrink: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: analysisTab === 'search' ? '#4ade80' : '#a78bfa' }}>
                          {analysisTab === 'search' ? '② 적 드래그 (첫 발견 프레임)' : '② 적 드래그 (사격 시작 프레임)'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>추적 프레임</span>
                        {[10, 20, 30, 50].map(n => (
                          <button key={n} onClick={() => setTrackFrames(n)}
                            style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, border: 'none', cursor: 'pointer', background: trackFrames === n ? '#3b82f6' : '#374151', color: trackFrames === n ? '#fff' : '#9ca3af' }}>{n}</button>
                        ))}
                      </div>
                      {tracking ? (
                        <div>
                          <p style={{ fontSize: 11, color: '#f97316', fontWeight: 700, marginBottom: 4 }}>
                            🔍 추적 중... {trackProgress}/{trackFrames}{crosshairSet ? ' + 크로스헤어' : ''}
                          </p>
                          <div style={{ width: '100%', background: '#374151', borderRadius: 99, height: 5 }}>
                            <div style={{ background: '#f97316', height: '100%', borderRadius: 99, width: `${(trackProgress / trackFrames) * 100}%`, transition: 'width 0.2s' }} />
                          </div>
                        </div>
                      ) : marks.length === 0 ? (
                        <div>
                          <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 3 }}>
                            {analysisMode === 'hip'
                              ? '① 적을 처음 발견한 프레임에서 일시정지'
                              : '① 스코프로 조준 시작 프레임에서 일시정지'}
                          </p>
                          <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
                            ② 버튼 클릭 → <span style={{ color: '#fb923c', fontWeight: 700 }}>적 몸통 드래그</span>로 박스 선택
                          </p>
                          <button
                            onClick={() => { setMarkMode('enemy_drag'); if (videoRef.current) videoRef.current.pause(); }}
                            style={{ width: '100%', padding: '9px 0', borderRadius: 7, fontSize: 13, fontWeight: 700,
                              background: analysisMode === 'hip' ? '#065f46' : '#4c1d95',
                              border: `1px solid ${analysisMode === 'hip' ? '#059669' : '#7c3aed'}`,
                              color: '#fff', cursor: 'pointer' }}>
                            {analysisMode === 'hip' ? '🟩 적 드래그 선택 (일반감도 분석)' : '🟪 적 드래그 선택 (스코프 반동 분석)'}
                          </button>
                          <button
                            onClick={autoDetectEnemy}
                            disabled={modelLoading}
                            style={{ width: '100%', marginTop: 6, padding: '7px 0', borderRadius: 7, fontSize: 12, fontWeight: 700,
                              background: modelLoading ? '#1e293b' : '#1e1040',
                              border: '1px solid #7c3aed55',
                              color: modelLoading ? '#6b7280' : '#c4b5fd',
                              cursor: modelLoading ? 'default' : 'pointer' }}>
                            {modelLoading ? '⏳ AI 모델 로딩 중...' : '🤖 자동 감지 (AI)'}
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p style={{ fontSize: 10, color: '#4ade80', marginBottom: 6 }}>✓ {marks.length}프레임 추적됨</p>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => { setMarks([]); setTargetBox(null); templateRef.current = null; crosshairTemplateRef.current = null; setCrosshairTrack([]); setTrackProgress(0); }}
                              style={{ flex: 1, padding: '7px 0', borderRadius: 6, fontSize: 12, background: '#374151', color: '#f87171', border: 'none', cursor: 'pointer' }}>초기화</button>
                            <button onClick={() => autoTrack(marks, crosshairPos)}
                              style={{ flex: 1, padding: '7px 0', borderRadius: 6, fontSize: 12, fontWeight: 700, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}>↺ 재추적</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── 에임 써치 결과 (search 탭) ── */}
                    {r && analysisTab === 'search' && (
                      <div style={{ background: 'linear-gradient(135deg,#052e16,#0f1827)', border: '1px solid #05966966', borderRadius: 10, padding: 12 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', marginBottom: 10 }}>📍 에임 써치 분석 결과</p>

                        {/* 초기 오차 */}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>
                            <span>초기 오차 (적 ↔ 화면 중앙)</span>
                            <span style={{ fontWeight: 700, color: r.initialOffsetPx < 64 ? '#4ade80' : r.initialOffsetPx < 150 ? '#facc15' : '#f87171' }}>
                              {Math.round(r.initialOffsetPx)}px ({r.initialOffsetPct}%)
                            </span>
                          </div>
                          <div style={{ width: '100%', background: '#1e293b', borderRadius: 99, height: 8 }}>
                            <div style={{ height: '100%', borderRadius: 99, width: `${Math.min(100, (r.initialOffsetPx / 400) * 100)}%`,
                              background: r.initialOffsetPx < 64 ? '#22c55e' : r.initialOffsetPx < 150 ? '#eab308' : '#ef4444', transition: 'width 0.4s' }}/>
                          </div>
                          <p style={{ fontSize: 9, color: '#475569', marginTop: 3 }}>
                            {r.initialOffsetPx < 64 ? '✓ 적 등장 위치 예측 우수 — 크로스헤어 배치 좋음'
                              : r.initialOffsetPx < 150 ? '△ 보통 — 크로스헤어 배치 연습 권장'
                              : '✕ 크로스헤어가 적과 많이 떨어짐 — 예측 필요'}
                          </p>
                        </div>

                        {/* 조준 완료 프레임 */}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af', marginBottom: 2 }}>
                            <span>조준 완료까지</span>
                            <span style={{ fontWeight: 700, color: r.aimCompletionFrame >= 0 ? (r.aimMs < 200 ? '#4ade80' : r.aimMs < 400 ? '#facc15' : '#f87171') : '#6b7280' }}>
                              {r.aimCompletionFrame >= 0 ? `${r.aimCompletionFrame}프레임 (${r.aimMs}ms)` : '미완료'}
                            </span>
                          </div>
                          <p style={{ fontSize: 9, color: '#475569' }}>
                            {r.aimCompletionFrame >= 0
                              ? (r.aimMs < 200 ? '✓ 빠른 조준 (200ms 이내)'
                                : r.aimMs < 400 ? '△ 보통 (200~400ms)'
                                : '↓ 느린 조준 — 감도 조정 권장')
                              : '추적 구간 내 조준 미완료'}
                          </p>
                        </div>

                        {/* 일반감도 eDPI 추천 */}
                        {Math.abs(r.hipOvershootPx) > 5 && (
                          <div style={{ background: '#0f172a', borderRadius: 7, padding: '8px 10px' }}>
                            <p style={{ fontSize: 10, color: '#86efac', marginBottom: 5 }}>추천 일반감도</p>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                              <div>
                                <p style={{ fontSize: 9, color: '#6b7280' }}>현재</p>
                                <p style={{ fontSize: 14, fontWeight: 900, color: '#6b7280' }}>{hipSens}</p>
                              </div>
                              <div style={{ fontSize: 14, color: '#374151', marginBottom: 1 }}>→</div>
                              <div>
                                <p style={{ fontSize: 9, color: '#059669' }}>추천</p>
                                <p style={{ fontSize: 18, fontWeight: 900, color: '#4ade80' }}>{r.hipIdealSens}</p>
                              </div>
                              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                <p style={{ fontSize: 9, color: '#6b7280' }}>추천 eDPI</p>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>{r.hipIdealEdpi}</p>
                              </div>
                            </div>
                            <p style={{ fontSize: 9, color: '#374151', marginTop: 3 }}>
                              {r.hipOvershootPx > 5 ? '과보정 감지 — 감도를 낮추세요' : '미달 — 감도를 높이세요'}
                            </p>
                          </div>
                        )}
                        {Math.abs(r.hipOvershootPx) <= 5 && (
                          <div style={{ background: 'rgba(34,197,94,0.08)', borderRadius: 6, padding: '6px 10px' }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#4ade80' }}>✓ 일반감도 이동 정확도 우수</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── 반동 분석 탭: 킬피드 감지 상태 ── */}
                    {analysisTab === 'recoil' && marks.length >= 2 && (
                      <div style={{ background: killDetected ? 'rgba(239,68,68,0.08)' : 'rgba(124,58,237,0.08)',
                        border: `1px solid ${killDetected ? '#ef444433' : '#7c3aed33'}`, borderRadius: 10, padding: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: killDetected ? '#f87171' : '#a78bfa' }}>
                              {killDetected ? '💀 사망/기절 감지됨' : '🔍 킬피드 감지 중...'}
                            </p>
                            {killDetected && killFrameTime !== null && (
                              <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                                감지 시각 {killFrameTime.toFixed(2)}s · 추적 {marks.length}프레임
                              </p>
                            )}
                          </div>
                          {killDetected && (
                            <button onClick={() => setShowClipDetail(v => !v)}
                              style={{ padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                                background: showClipDetail ? '#7c3aed' : '#4c1d95',
                                border: '1px solid #7c3aed55', color: '#e9d5ff', cursor: 'pointer' }}>
                              {showClipDetail ? '▲ 닫기' : '▼ 상세 보기'}
                            </button>
                          )}
                        </div>

                        {/* 클립 상세보기 */}
                        {showClipDetail && killDetected && r && (
                          <div style={{ marginTop: 10, borderTop: '1px solid #7c3aed33', paddingTop: 10 }}>

                            {/* 프레임별 이탈 차트 */}
                            <p style={{ fontSize: 10, fontWeight: 700, color: '#c4b5fd', marginBottom: 6 }}>프레임별 크로스헤어 이탈 (px)</p>
                            <svg width="100%" height="60" viewBox={`0 0 ${Math.max(r.crosshairDists.length - 1, 1)} 200`}
                              preserveAspectRatio="none" style={{ background: '#0f172a', borderRadius: 5, display: 'block', marginBottom: 4 }}>
                              {/* 5% 기준선 (64px) */}
                              <line x1={0} y1={136} x2={r.crosshairDists.length - 1} y2={136} stroke="#374151" strokeWidth="2" strokeDasharray="4,4"/>
                              {/* 킬 감지 수직선 */}
                              {killDetected && (
                                <line x1={r.crosshairDists.length - 1} y1={0} x2={r.crosshairDists.length - 1} y2={200}
                                  stroke="#f87171" strokeWidth="1.5" strokeDasharray="3,3"/>
                              )}
                              <polyline
                                points={r.crosshairDists.map((d, i) => `${i},${Math.max(0, 200 - d * 0.8)}`).join(' ')}
                                fill="none" stroke="#a78bfa" strokeWidth="2.5"/>
                            </svg>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#475569', marginBottom: 8 }}>
                              <span>시작</span><span>점선=64px 기준 / 빨강=킬</span><span>종료</span>
                            </div>

                            {/* 핵심 지표 */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                              {[
                                { label: '반동 보정률', value: `${r.crossCompRate}%`, color: r.crossCompRate >= 70 ? '#4ade80' : r.crossCompRate >= 40 ? '#facc15' : '#f87171' },
                                { label: '추적 유지율', value: `${r.trackAcc}%`, color: r.trackAcc >= 70 ? '#4ade80' : r.trackAcc >= 40 ? '#facc15' : '#f87171' },
                                { label: '수직 드리프트', value: `${r.crossTotalDriftY > 0 ? '↓' : '↑'}${Math.abs(r.crossTotalDriftY).toFixed(0)}px`, color: Math.abs(r.crossTotalDriftY) < 30 ? '#4ade80' : '#fb923c' },
                                { label: '수평 흔들림', value: `${Math.abs(r.crossTotalDriftX).toFixed(0)}px`, color: Math.abs(r.crossTotalDriftX) < 20 ? '#4ade80' : '#fb923c' },
                                { label: '평균 이탈', value: `${r.crossAvgDriftPx.toFixed(1)}px/f`, color: r.crossAvgDriftPx < 3 ? '#4ade80' : r.crossAvgDriftPx < 6 ? '#facc15' : '#f87171' },
                                { label: '일관성', value: `${r.consistency}%`, color: r.consistency >= 70 ? '#4ade80' : r.consistency >= 40 ? '#facc15' : '#f87171' },
                              ].map(it => (
                                <div key={it.label} style={{ background: '#0f172a', borderRadius: 6, padding: '5px 8px' }}>
                                  <p style={{ fontSize: 9, color: '#6b7280', marginBottom: 2 }}>{it.label}</p>
                                  <p style={{ fontSize: 13, fontWeight: 900, color: it.color }}>{it.value}</p>
                                </div>
                              ))}
                            </div>

                            {/* 감도 힌트 */}
                            {r.crossSensHint && (
                              <div style={{ marginTop: 8, background: '#1e1040', borderRadius: 6, padding: '7px 9px' }}>
                                <p style={{ fontSize: 10, fontWeight: 700, color: '#c4b5fd', marginBottom: 2 }}>
                                  {r.crossSensHint === 'perfect' ? '✓ 반동 보정 거의 완벽'
                                    : r.crossSensHint === 'too_high' ? '⚠ 과보정 진동 — 감도 낮추기'
                                    : r.crossSensHint === 'need_more_correction' ? '↓ 반동 아래로 밀림 — 더 당기거나 감도 올리기'
                                    : '📊 감도 적합'}
                                </p>
                                {r.crossIdealEdpi && r.crossIdealEdpi !== Math.round(r.currentEdpi) && (
                                  <p style={{ fontSize: 10, color: '#a78bfa' }}>
                                    추천 eDPI <strong>{r.crossIdealEdpi}</strong> · 감도 <strong>{Math.min(100, Math.max(1, r.crossIdealHip))}</strong>
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── 무기 반동 제어 점수 (반동 탭) ── */}
                    {r && analysisTab === 'recoil' && selectedWeapon !== 'none' && (() => {
                      const wep = PUBG_WEAPONS.find(w => w.id === selectedWeapon);
                      if (!wep) return null;
                      // 제어 점수: 일관성 + 크로스헤어 보정률 기반, 무기 난이도로 스케일
                      const diffMult = 1 + wep.vRecoil / 15; // 어려운 무기일수록 같은 성능 = 높은 점수
                      const baseScore = r.hasCrossTrack
                        ? (r.consistency * 0.5 + r.crossCompRate * 0.5)
                        : r.consistency;
                      const rawScore = Math.min(100, Math.round(baseScore * diffMult));
                      const scoreColor = rawScore >= 75 ? '#4ade80' : rawScore >= 50 ? '#facc15' : rawScore >= 30 ? '#fb923c' : '#f87171';
                      const scoreLabel = rawScore >= 75 ? '우수' : rawScore >= 50 ? '보통' : rawScore >= 30 ? '미숙' : '부족';
                      // 수직반동 대비 실측 비교
                      const recoilRatio = wep.vRecoil > 0 ? Math.min(2, r.recoilPxPerFrame / (wep.vRecoil * 2)) : 0;
                      const controlPct = Math.max(0, Math.round((1 - recoilRatio) * 100));
                      return (
                        <div style={{ background: 'linear-gradient(135deg,#1a0a2e,#0f172a)', border: '1px solid #7c3aed55', borderRadius: 10, padding: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#c4b5fd' }}>🎮 {wep.name} 반동 제어 점수</p>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: 22, fontWeight: 900, color: scoreColor }}>{rawScore}</span>
                              <span style={{ fontSize: 10, color: '#6b7280' }}>/100</span>
                            </div>
                          </div>
                          {/* 점수 바 */}
                          <div style={{ width: '100%', background: '#1e293b', borderRadius: 99, height: 8, marginBottom: 6 }}>
                            <div style={{ height: '100%', borderRadius: 99, width: `${rawScore}%`, background: scoreColor, transition: 'width 0.5s' }}/>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 8 }}>
                            <span style={{ color: '#6b7280' }}>난이도 {wep.diff} 기준 보정</span>
                            <span style={{ fontWeight: 700, color: scoreColor }}>{scoreLabel}</span>
                          </div>
                          {/* 세부 비교 */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                            <div style={{ background: '#0f172a', borderRadius: 6, padding: '5px 8px' }}>
                              <p style={{ fontSize: 9, color: '#6b7280', marginBottom: 2 }}>반동 일관성</p>
                              <p style={{ fontSize: 13, fontWeight: 900, color: r.consistency >= 70 ? '#4ade80' : r.consistency >= 40 ? '#facc15' : '#f87171' }}>{r.consistency}%</p>
                            </div>
                            <div style={{ background: '#0f172a', borderRadius: 6, padding: '5px 8px' }}>
                              <p style={{ fontSize: 9, color: '#6b7280', marginBottom: 2 }}>수직 제어율</p>
                              <p style={{ fontSize: 13, fontWeight: 900, color: controlPct >= 60 ? '#4ade80' : controlPct >= 30 ? '#facc15' : '#f87171' }}>{controlPct}%</p>
                            </div>
                          </div>
                          <p style={{ fontSize: 9, color: '#4c1d95', marginTop: 6 }}>
                            {wep.name} 수직반동 {wep.vRecoil} · 측정 {r.recoilPxPerFrame.toFixed(1)}px/f · RPM {wep.rpm}
                          </p>
                        </div>
                      );
                    })()}

                    {/* 반동 경로 SVG (반동 탭) */}
                    {r && analysisTab === 'recoil' && (
                      <div style={{ background: '#111827', borderRadius: 10, padding: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>반동 경로</p>
                          <div style={{ display: 'flex', gap: 8, fontSize: 10 }}>
                            <span style={{ color: '#22c55e' }}>● 1발</span>
                            <span style={{ color: '#eab308' }}>● 중간</span>
                            <span style={{ color: '#ef4444' }}>● 끝</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <svg width={PW} height={PH} style={{ background: '#0f172a', borderRadius: 8 }}>
                            {/* 격자 (중앙 기준) */}
                            {[-2,-1,0,1,2].map(i => (
                              <line key={`v${i}`} x1={PW/2 + i*(PW/2-16)/2} y1={8} x2={PW/2 + i*(PW/2-16)/2} y2={PH-8} stroke="#1e293b" strokeWidth={i===0?1.5:0.5}/>
                            ))}
                            {[-2,-1,0,1,2].map(i => (
                              <line key={`h${i}`} x1={8} y1={PH/2 + i*(PH/2-16)/2} x2={PW-8} y2={PH/2 + i*(PH/2-16)/2} stroke="#1e293b" strokeWidth={i===0?1.5:0.5}/>
                            ))}
                            {/* 조준점 (중앙) */}
                            <line x1={PW/2-9} y1={PH/2} x2={PW/2+9} y2={PH/2} stroke="#22c55e" strokeWidth="1.5"/>
                            <line x1={PW/2} y1={PH/2-9} x2={PW/2} y2={PH/2+9} stroke="#22c55e" strokeWidth="1.5"/>
                            <text x={PW/2+11} y={PH/2+4} fill="#22c55e" fontSize="8" fontWeight="bold">조준점</text>
                            {/* 경로 선 */}
                            {pathPoints.slice(1).map((pt, i) => (
                              <line key={i}
                                x1={pathPoints[i].x} y1={pathPoints[i].y}
                                x2={pt.x} y2={pt.y}
                                stroke={shotColor(i, pathPoints.length)}
                                strokeWidth="1.5" strokeOpacity="0.85"
                              />
                            ))}
                            {/* 발사 점 */}
                            {pathPoints.map((pt, i) => (
                              <g key={i}>
                                <circle cx={pt.x} cy={pt.y} r="5" fill={shotColor(i, pathPoints.length)} stroke="#0f172a" strokeWidth="1"/>
                                <text x={pt.x} y={pt.y+3} textAnchor="middle" fill="#fff" fontSize="6" fontWeight="bold">{i+1}</text>
                              </g>
                            ))}
                            <text x={PW/2} y={PH-2} textAnchor="middle" fill="#334155" fontSize="7">← 좌 / 우 →</text>
                            <text x={5} y={14} fill="#334155" fontSize="7">↑위</text>
                            <text x={5} y={PH-4} fill="#334155" fontSize="7">↓아래</text>
                          </svg>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginTop: 6 }}>
                          <div style={{ background: '#1e293b', borderRadius: 6, padding: '5px 0', textAlign: 'center' }}>
                            <p style={{ fontSize: 9, color: '#6b7280' }}>총 발수</p>
                            <p style={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>{marks.length}</p>
                          </div>
                          <div style={{ background: '#1e293b', borderRadius: 6, padding: '5px 0', textAlign: 'center' }}>
                            <p style={{ fontSize: 9, color: '#6b7280' }}>일관성</p>
                            <p style={{ fontSize: 13, fontWeight: 900, color: r.consistency >= 70 ? '#4ade80' : r.consistency >= 40 ? '#facc15' : '#f87171' }}>{r.consistency}%</p>
                          </div>
                          <div style={{ background: '#1e293b', borderRadius: 6, padding: '5px 0', textAlign: 'center' }}>
                            <p style={{ fontSize: 9, color: '#6b7280' }}>평균수직</p>
                            <p style={{ fontSize: 13, fontWeight: 900, color: r.avgDy < -0.002 ? '#fb923c' : '#d1d5db' }}>{Math.abs(r.avgDy * 720).toFixed(0)}px</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 크로스헤어 도달 분석 (반동 탭) */}
                    {r && analysisTab === 'recoil' && (
                      <div style={{ background: '#111827', borderRadius: 10, padding: 12 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 8 }}>🎯 크로스헤어 분석</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: '#9ca3af' }}>추적 정확도</span>
                            <span style={{ fontWeight: 700, color: r.trackAcc >= 70 ? '#4ade80' : r.trackAcc >= 40 ? '#facc15' : '#f87171' }}>{r.trackAcc}%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: '#9ca3af' }}>평균 이격거리</span>
                            <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{Math.round(r.avgCrossDist)}px</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: '#9ca3af' }}>최소 이격거리</span>
                            <span style={{ fontWeight: 700, color: r.minCrossDist < 30 ? '#4ade80' : '#e2e8f0' }}>{Math.round(r.minCrossDist)}px</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: '#9ca3af' }}>과보정 감지</span>
                            <span style={{ fontWeight: 700, color: r.crossOvershoot ? '#f87171' : '#4ade80' }}>{r.crossOvershoot ? '⚠ 감지됨' : '정상 ✓'}</span>
                          </div>
                          {/* 프레임별 이격거리 그래프 */}
                          <div style={{ marginTop: 2 }}>
                            <p style={{ fontSize: 10, color: '#6b7280', marginBottom: 3 }}>프레임별 크로스헤어 이격거리</p>
                            <svg width="100%" height="50" viewBox={`0 0 ${Math.max(r.crosshairDists.length - 1, 1)} ${maxCrossDist + 10}`} preserveAspectRatio="none" style={{ background: '#0f172a', borderRadius: 5, display: 'block' }}>
                              {/* 5% 기준선 */}
                              <line x1={0} y1={maxCrossDist + 10 - 64} x2={r.crosshairDists.length - 1} y2={maxCrossDist + 10 - 64} stroke="#374151" strokeWidth="1.5" strokeDasharray="3,3"/>
                              {/* 거리 그래프 */}
                              <polyline
                                points={r.crosshairDists.map((d, i) => `${i},${maxCrossDist + 10 - d}`).join(' ')}
                                fill="none" stroke="#60a5fa" strokeWidth="2"
                              />
                            </svg>
                            <p style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>아래 = 크로스헤어가 적에 가까움 / 점선 = 5% 기준</p>
                          </div>
                          {/* 코칭 메시지 */}
                          <div style={{ borderTop: '1px solid #1e293b', paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {r.trackAcc >= 70 && <p style={{ fontSize: 10, color: '#4ade80' }}>· 추적 정확도 우수 ✓</p>}
                            {r.trackAcc < 70 && r.trackAcc >= 40 && <p style={{ fontSize: 10, color: '#facc15' }}>· 추적 개선 필요 — 감도 조정 권장</p>}
                            {r.trackAcc < 40 && <p style={{ fontSize: 10, color: '#f87171' }}>· 추적 정확도 낮음 — 감도 낮춰 안정화</p>}
                            {r.crossOvershoot && <p style={{ fontSize: 10, color: '#fb923c' }}>· 과보정 발생 — 감도 낮추기 권장</p>}
                            {r.avgDy < -0.003 && <p style={{ fontSize: 10, color: '#fb923c' }}>· 마우스를 아래로 당겨 수직 반동 보정</p>}
                            {r.avgDy >= -0.003 && <p style={{ fontSize: 10, color: '#4ade80' }}>· 수직 반동 제어 양호 ✓</p>}
                            {Math.abs(r.avgDx) > 0.003 && <p style={{ fontSize: 10, color: '#fde047' }}>· {r.avgDx > 0 ? '좌측' : '우측'}으로 수평 보정 필요</p>}
                            {r.consistency < 50 && <p style={{ fontSize: 10, color: '#f87171' }}>· 패턴 불규칙 — 감도 낮춰 안정화</p>}
                            {r.consistency >= 70 && <p style={{ fontSize: 10, color: '#4ade80' }}>· 반동 일관성 우수 ✓</p>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 감도 연동 추천 */}
                    {r && r.sensEval !== 'stable' && (
                      <div style={{ background: '#111827', borderRadius: 10, padding: 12 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 8 }}>📐 감도 기반 추천</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {/* 현재 eDPI */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: '#9ca3af' }}>현재 eDPI</span>
                            <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{Math.round(r.currentEdpi)}</span>
                          </div>
                          {/* 반동 크기 */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: '#9ca3af' }}>평균 수직 반동</span>
                            <span style={{ fontWeight: 700, color: '#fb923c' }}>{r.recoilPxPerFrame.toFixed(1)}px/f</span>
                          </div>
                          {/* 보정에 필요한 마우스 이동량 */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ color: '#9ca3af' }}>반동 보정 이동량</span>
                            <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{r.cmPerSec.toFixed(1)} cm/초</span>
                          </div>
                          {/* 판정 */}
                          <div style={{
                            padding: '8px 10px', borderRadius: 7, marginTop: 2,
                            background: r.sensEval === 'good' ? 'rgba(34,197,94,0.1)' : r.sensEval === 'too_high' ? 'rgba(239,68,68,0.1)' : 'rgba(251,146,60,0.1)',
                            border: `1px solid ${r.sensEval === 'good' ? '#22c55e33' : r.sensEval === 'too_high' ? '#ef444433' : '#fb923c33'}`,
                          }}>
                            {r.sensEval === 'good' && (
                              <>
                                <p style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', marginBottom: 3 }}>✓ 현재 감도 적절</p>
                                <p style={{ fontSize: 10, color: '#86efac' }}>초당 {r.cmPerSec.toFixed(1)}cm 마우스 이동으로 반동 보정 가능. 현재 eDPI({Math.round(r.currentEdpi)})가 이 반동 패턴에 잘 맞습니다.</p>
                              </>
                            )}
                            {r.sensEval === 'too_high' && (
                              <>
                                <p style={{ fontSize: 11, fontWeight: 700, color: '#f87171', marginBottom: 3 }}>⚠ 감도 너무 높음</p>
                                <p style={{ fontSize: 10, color: '#fca5a5' }}>보정에 {r.cmPerSec.toFixed(1)}cm/초만 필요해 미세 조정이 어렵습니다. 정밀한 반동 제어가 힘들 수 있습니다.</p>
                              </>
                            )}
                            {r.sensEval === 'too_low' && (
                              <>
                                <p style={{ fontSize: 11, fontWeight: 700, color: '#fb923c', marginBottom: 3 }}>⚠ 감도 너무 낮음</p>
                                <p style={{ fontSize: 10, color: '#fdba74' }}>반동 보정에 초당 {r.cmPerSec.toFixed(1)}cm 이동이 필요해 손목에 부담이 큽니다.</p>
                              </>
                            )}
                          </div>
                          {/* 이상적 감도 제안 */}
                          {r.sensEval !== 'good' && (
                            <div style={{ background: '#1e293b', borderRadius: 7, padding: '8px 10px', marginTop: 2 }}>
                              <p style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>이 반동 패턴에 권장하는 감도</p>
                              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                                <div>
                                  <p style={{ fontSize: 9, color: '#6b7280' }}>eDPI</p>
                                  <p style={{ fontSize: 15, fontWeight: 900, color: '#60a5fa' }}>{r.idealEdpi}</p>
                                </div>
                                <div>
                                  <p style={{ fontSize: 9, color: '#6b7280' }}>일반 감도 (DPI {dpi} 기준)</p>
                                  <p style={{ fontSize: 15, fontWeight: 900, color: '#60a5fa' }}>{Math.min(100, Math.max(1, r.idealHipSens))}</p>
                                </div>
                              </div>
                              <p style={{ fontSize: 9, color: '#475569', marginTop: 4 }}>기준: 반동 보정에 초당 2cm 마우스 이동 (권장 범위 1~4cm)</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── 크로스헤어 추적 기반 정밀 감도 패널 (반동 탭) ── */}
                    {r && analysisTab === 'recoil' && r.hasCrossTrack && (
                      <div style={{ background: 'linear-gradient(135deg,#1e1040,#0f1827)', border: '1px solid #7c3aed44', borderRadius: 10, padding: 12 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#c4b5fd', marginBottom: 8 }}>🎯 크로스헤어 추적 정밀 분석</p>
                        <p style={{ fontSize: 10, color: '#6b7280', marginBottom: 8 }}>
                          크로스헤어 위치의 게임 월드 패치 이동량 = 플레이어가 보정하지 못한 실제 반동
                        </p>

                        {/* 보정률 게이지 */}
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                            <span style={{ color: '#9ca3af' }}>반동 보정률</span>
                            <span style={{ fontWeight: 700, color: r.crossCompRate >= 70 ? '#4ade80' : r.crossCompRate >= 40 ? '#facc15' : '#f87171' }}>
                              {r.crossCompRate}%
                            </span>
                          </div>
                          <div style={{ width: '100%', background: '#1e293b', borderRadius: 99, height: 7 }}>
                            <div style={{
                              height: '100%', borderRadius: 99, transition: 'width 0.5s',
                              width: `${r.crossCompRate}%`,
                              background: r.crossCompRate >= 70 ? '#22c55e' : r.crossCompRate >= 40 ? '#eab308' : '#ef4444',
                            }}/>
                          </div>
                        </div>

                        {/* 드리프트 수치 */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 8 }}>
                          <div style={{ background: '#0f172a', borderRadius: 6, padding: '6px 8px' }}>
                            <p style={{ fontSize: 9, color: '#6b7280', marginBottom: 2 }}>평균 드리프트</p>
                            <p style={{ fontSize: 14, fontWeight: 900, color: r.crossAvgDriftPx < 3 ? '#4ade80' : r.crossAvgDriftPx < 6 ? '#facc15' : '#f87171' }}>
                              {r.crossAvgDriftPx.toFixed(1)}<span style={{ fontSize: 9, color: '#6b7280', fontWeight: 400 }}> px/f</span>
                            </p>
                          </div>
                          <div style={{ background: '#0f172a', borderRadius: 6, padding: '6px 8px' }}>
                            <p style={{ fontSize: 9, color: '#6b7280', marginBottom: 2 }}>수직 총 드리프트</p>
                            <p style={{ fontSize: 14, fontWeight: 900, color: r.crossTotalDriftY > 5 ? '#fb923c' : r.crossTotalDriftY < -5 ? '#60a5fa' : '#4ade80' }}>
                              {r.crossTotalDriftY > 0 ? '↓' : r.crossTotalDriftY < 0 ? '↑' : '·'}{Math.abs(r.crossTotalDriftY).toFixed(0)}<span style={{ fontSize: 9, color: '#6b7280', fontWeight: 400 }}> px</span>
                            </p>
                          </div>
                        </div>

                        {/* 감도 힌트 메시지 */}
                        <div style={{
                          borderRadius: 7, padding: '7px 10px', marginBottom: 8,
                          background: r.crossSensHint === 'perfect' ? 'rgba(34,197,94,0.1)'
                            : r.crossSensHint === 'too_high' ? 'rgba(239,68,68,0.1)'
                            : r.crossSensHint === 'need_more_correction' ? 'rgba(251,146,60,0.1)'
                            : 'rgba(59,130,246,0.1)',
                          border: `1px solid ${r.crossSensHint === 'perfect' ? '#22c55e33' : r.crossSensHint === 'too_high' ? '#ef444433' : r.crossSensHint === 'need_more_correction' ? '#fb923c33' : '#3b82f633'}`,
                        }}>
                          {r.crossSensHint === 'perfect' && (
                            <>
                              <p style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', marginBottom: 2 }}>✓ 반동 보정 거의 완벽</p>
                              <p style={{ fontSize: 10, color: '#86efac' }}>크로스헤어가 거의 제자리를 유지. 현재 감도가 이 반동 패턴에 잘 맞습니다.</p>
                            </>
                          )}
                          {r.crossSensHint === 'too_high' && (
                            <>
                              <p style={{ fontSize: 11, fontWeight: 700, color: '#f87171', marginBottom: 2 }}>⚠ 과보정 진동 감지 → 감도 낮추기 권장</p>
                              <p style={{ fontSize: 10, color: '#fca5a5' }}>크로스헤어가 불규칙하게 튀고 있습니다. 감도를 낮춰 미세 조정을 용이하게 하세요.</p>
                            </>
                          )}
                          {r.crossSensHint === 'need_more_correction' && (
                            <>
                              <p style={{ fontSize: 11, fontWeight: 700, color: '#fb923c', marginBottom: 2 }}>↓ 반동이 아래로 밀림 → 더 많이 당겨야 함</p>
                              <p style={{ fontSize: 10, color: '#fdba74' }}>크로스헤어가 일관되게 하강합니다. 마우스를 더 빠르게 당기거나 감도를 조정하세요.</p>
                            </>
                          )}
                          {r.crossSensHint === 'good' && (
                            <>
                              <p style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', marginBottom: 2 }}>📊 감도 적합</p>
                              <p style={{ fontSize: 10, color: '#93c5fd' }}>드리프트 패턴이 안정적. 반동 제어 연습으로 정확도를 높이세요.</p>
                            </>
                          )}
                        </div>

                        {/* 정밀 eDPI 추천 */}
                        {r.crossIdealEdpi && r.crossIdealEdpi !== r.currentEdpi && (
                          <div style={{ background: '#1e1040', border: '1px solid #7c3aed55', borderRadius: 7, padding: '8px 10px' }}>
                            <p style={{ fontSize: 10, color: '#c4b5fd', marginBottom: 4 }}>🔬 크로스헤어 추적 기반 정밀 추천 감도</p>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                              <div>
                                <p style={{ fontSize: 9, color: '#7c3aed' }}>추천 eDPI</p>
                                <p style={{ fontSize: 16, fontWeight: 900, color: '#a78bfa' }}>{r.crossIdealEdpi}</p>
                              </div>
                              <div>
                                <p style={{ fontSize: 9, color: '#7c3aed' }}>일반 감도 (DPI {dpi})</p>
                                <p style={{ fontSize: 16, fontWeight: 900, color: '#a78bfa' }}>{Math.min(100, Math.max(1, r.crossIdealHip))}</p>
                              </div>
                              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                <p style={{ fontSize: 9, color: '#7c3aed' }}>현재 eDPI</p>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#6b7280' }}>{Math.round(r.currentEdpi)}</p>
                              </div>
                            </div>
                            <p style={{ fontSize: 9, color: '#4c1d95', marginTop: 4 }}>기준: 크로스헤어 드리프트를 2cm/sec 마우스 이동으로 보정 가능한 eDPI</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 탄착 분포 (반동 탭) */}
                    {r && analysisTab === 'recoil' && (
                      <div style={{ background: '#111827', borderRadius: 10, padding: 12 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 8 }}>탄착 분포</p>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <svg width={SP} height={SP} style={{ background: '#0f172a', borderRadius: 8 }}>
                            <line x1={SP/2} y1={0} x2={SP/2} y2={SP} stroke="#1e293b" strokeWidth="1"/>
                            <line x1={0} y1={SP/2} x2={SP} y2={SP/2} stroke="#1e293b" strokeWidth="1"/>
                            <circle cx={SP/2} cy={SP/2} r={SP/2-8} fill="none" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4,4"/>
                            <circle cx={SP/2} cy={SP/2} r={(SP/2-8)/2} fill="none" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="4,4"/>
                            <circle cx={SP/2} cy={SP/2} r="7" fill="rgba(249,115,22,0.2)" stroke="#f97316" strokeWidth="1.5"/>
                            <line x1={SP/2-6} y1={SP/2} x2={SP/2+6} y2={SP/2} stroke="#f97316" strokeWidth="1.5"/>
                            <line x1={SP/2} y1={SP/2-6} x2={SP/2} y2={SP/2+6} stroke="#f97316" strokeWidth="1.5"/>
                            {r.shots.map((s, i) => {
                              const sx = SP/2 + (s.rx / scatterScale) * (SP/2 - 12);
                              const sy = SP/2 + (s.ry / scatterScale) * (SP/2 - 12);
                              return (
                                <g key={i}>
                                  {i > 0 && (
                                    <line
                                      x1={SP/2+(r.shots[i-1].rx/scatterScale)*(SP/2-12)}
                                      y1={SP/2+(r.shots[i-1].ry/scatterScale)*(SP/2-12)}
                                      x2={sx} y2={sy}
                                      stroke={shotColor(i, r.shots.length)} strokeWidth="1" strokeOpacity="0.4"
                                    />
                                  )}
                                  <circle cx={sx} cy={sy} r="4" fill={shotColor(i, r.shots.length)} stroke="#0f172a" strokeWidth="1"/>
                                  <text x={sx+5} y={sy+3} fill="#fff" fontSize="6">{i+1}</text>
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                        <p style={{ fontSize: 10, color: '#6b7280', textAlign: 'center', marginTop: 4 }}>십자 = 적 중심 / 점 = 탄착</p>
                      </div>
                    )}

                    {/* 발사별 수치 테이블 (반동 탭) */}
                    {r && analysisTab === 'recoil' && (
                      <div style={{ background: '#111827', borderRadius: 10, padding: 12 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 6 }}>발사 수치</p>
                        <div style={{ maxHeight: 140, overflowY: 'auto' }}>
                          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ color: '#6b7280', borderBottom: '1px solid #374151' }}>
                                <th style={{ textAlign: 'left', paddingBottom: 4 }}>#</th>
                                <th style={{ textAlign: 'right', paddingBottom: 4 }}>수직</th>
                                <th style={{ textAlign: 'right', paddingBottom: 4 }}>수평</th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.shots.map((s, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                                  <td style={{ padding: '2px 0', color: shotColor(i, r.shots.length) }}>발사{i+1}</td>
                                  <td style={{ textAlign: 'right', padding: '2px 0', color: s.ry < 0 ? '#fb923c' : s.ry > 0 ? '#60a5fa' : '#6b7280' }}>
                                    {s.ry < 0 ? '↑' : s.ry > 0 ? '↓' : '·'}{Math.abs(s.ry).toFixed(0)}px
                                  </td>
                                  <td style={{ textAlign: 'right', padding: '2px 0', color: Math.abs(s.rx) > 3 ? '#fbbf24' : '#6b7280' }}>
                                    {s.rx > 0 ? '→' : s.rx < 0 ? '←' : '·'}{Math.abs(s.rx).toFixed(0)}px
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}


                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── 영상 없을 때: 업로드 유도 영역 ── */}
          {!videoUrl && (
            <div
              className="border-2 border-dashed border-gray-600 rounded-2xl flex flex-col items-center justify-center py-16 px-6 cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all"
              onClick={() => document.getElementById('videoFileInput2').click()}
              onDrop={(e) => { e.preventDefault(); handleVideoFile(e.dataTransfer.files[0]); }}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="text-5xl mb-4">🎬</div>
              <p className="text-lg font-bold text-white mb-1">연습 영상 업로드</p>
              <p className="text-sm text-gray-400 mb-4 text-center">
                영상을 드래그하거나 클릭해서 선택하세요<br />
                업로드 후 영상 안에서 감도·무기·적 추적을 바로 설정할 수 있어요
              </p>
              <div className="flex gap-3 text-xs text-gray-500">
                <span>MP4 · MOV · AVI · MKV</span>
                <span>·</span>
                <span>서버 전송 없음 (브라우저 내 처리)</span>
              </div>
              <input id="videoFileInput2" type="file" accept="video/*" className="hidden"
                onChange={(e) => handleVideoFile(e.target.files[0])} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
