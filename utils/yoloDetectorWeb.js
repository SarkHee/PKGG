/**
 * yoloDetectorWeb.js — YOLOv8n ONNX Runtime Web 브라우저 감지
 * 서버 전송 없이 클라이언트에서만 처리
 *
 * 사용:
 *   import { loadYolo, detectPersons } from '../utils/yoloDetectorWeb';
 *   await loadYolo('/models/yolov8n.onnx');
 *   const boxes = await detectPersons(canvasOrImageElement, 0.35);
 */

let session = null;
let ort = null;

const MODEL_INPUT_SIZE = 640;
const NUM_CLASSES = 80;
const PERSON_CLASS = 0;

export async function loadYolo(modelPath = '/models/yolov8n.onnx') {
  if (session) return 'already loaded';
  ort = await import('onnxruntime-web');
  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';
  session = await ort.InferenceSession.create(modelPath, {
    executionProviders: ['wasm'],
  });
  return 'loaded';
}

export function isLoaded() {
  return session !== null;
}

/**
 * 이미지/캔버스에서 사람(person) 감지
 * @param {HTMLVideoElement|HTMLCanvasElement|HTMLImageElement} src
 * @param {number} confThreshold 신뢰도 임계값 (기본 0.35)
 * @returns {Array} [{x1,y1,x2,y2,cx,cy,conf}] — 정규화 좌표 0-1
 */
export async function detectPersons(src, confThreshold = 0.35) {
  if (!session || !ort) throw new Error('모델이 로드되지 않았습니다. loadYolo()를 먼저 호출하세요.');

  // 1. 캔버스에 그리기 (640×640으로 리사이즈)
  const canvas = document.createElement('canvas');
  canvas.width = MODEL_INPUT_SIZE;
  canvas.height = MODEL_INPUT_SIZE;
  const ctx = canvas.getContext('2d');

  const srcW = src.videoWidth || src.naturalWidth || src.width;
  const srcH = src.videoHeight || src.naturalHeight || src.height;

  // 비율 유지 letterbox
  const scale = Math.min(MODEL_INPUT_SIZE / srcW, MODEL_INPUT_SIZE / srcH);
  const nw = Math.round(srcW * scale);
  const nh = Math.round(srcH * scale);
  const ox = Math.floor((MODEL_INPUT_SIZE - nw) / 2);
  const oy = Math.floor((MODEL_INPUT_SIZE - nh) / 2);

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  ctx.drawImage(src, ox, oy, nw, nh);

  // 2. 픽셀 데이터 → Float32Array [1,3,640,640] (CHW, 0-1 normalize)
  const imageData = ctx.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  const { data } = imageData;
  const inputTensor = new Float32Array(1 * 3 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE);
  const pixels = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;
  for (let i = 0; i < pixels; i++) {
    inputTensor[i]              = data[i * 4]     / 255; // R
    inputTensor[i + pixels]     = data[i * 4 + 1] / 255; // G
    inputTensor[i + pixels * 2] = data[i * 4 + 2] / 255; // B
  }

  // 3. 추론
  const tensor = new ort.Tensor('float32', inputTensor, [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]);
  const results = await session.run({ images: tensor });

  // 4. 출력 디코딩: [1, 84, 8400] → boxes
  const output = results[Object.keys(results)[0]].data; // Float32Array
  // output shape: [84, 8400] flattened → output[j * 8400 + i]
  const numDet = 8400;

  const boxes = [];
  for (let i = 0; i < numDet; i++) {
    // cx, cy, w, h (0번~3번 행)
    const cx_raw = output[0 * numDet + i];
    const cy_raw = output[1 * numDet + i];
    const w_raw  = output[2 * numDet + i];
    const h_raw  = output[3 * numDet + i];

    // person 클래스 점수 (4 + PERSON_CLASS 번째 행)
    const score = output[(4 + PERSON_CLASS) * numDet + i];

    if (score < confThreshold) continue;

    // letterbox → 원본 좌표로 역변환
    const x1_pad = (cx_raw - w_raw / 2 - ox) / scale / srcW;
    const y1_pad = (cy_raw - h_raw / 2 - oy) / scale / srcH;
    const x2_pad = (cx_raw + w_raw / 2 - ox) / scale / srcW;
    const y2_pad = (cy_raw + h_raw / 2 - oy) / scale / srcH;

    boxes.push({
      x1: Math.max(0, x1_pad),
      y1: Math.max(0, y1_pad),
      x2: Math.min(1, x2_pad),
      y2: Math.min(1, y2_pad),
      cx: (x1_pad + x2_pad) / 2,
      cy: (y1_pad + y2_pad) / 2,
      conf: score,
    });
  }

  // 5. NMS (간단한 greedy NMS)
  boxes.sort((a, b) => b.conf - a.conf);
  const kept = [];
  const suppressed = new Set();
  for (let i = 0; i < boxes.length; i++) {
    if (suppressed.has(i)) continue;
    kept.push(boxes[i]);
    for (let j = i + 1; j < boxes.length; j++) {
      if (iou(boxes[i], boxes[j]) > 0.45) suppressed.add(j);
    }
  }

  return kept;
}

function iou(a, b) {
  const ix1 = Math.max(a.x1, b.x1), iy1 = Math.max(a.y1, b.y1);
  const ix2 = Math.min(a.x2, b.x2), iy2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
  const aArea = (a.x2 - a.x1) * (a.y2 - a.y1);
  const bArea = (b.x2 - b.x1) * (b.y2 - b.y1);
  return inter / (aArea + bArea - inter + 1e-6);
}
