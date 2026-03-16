"""
detector.py — YOLOv8 기반 PUBG 적 감지 모듈

설치:
    pip install ultralytics

모델 선택:
    1. 기본 (COCO person): YOLO('yolov8n.pt')  — 즉시 사용, 정확도 보통
    2. 커스텀 PUBG:        YOLO('models/pubg_best.pt') — fine-tuned, 정확도 높음

fine-tune 방법:
    from ultralytics import YOLO
    model = YOLO('yolov8n.pt')
    model.train(data='pubg_dataset/data.yaml', epochs=50, imgsz=640)
    # → runs/detect/train/weights/best.pt → models/pubg_best.pt 로 복사
"""
from pathlib import Path

try:
    from ultralytics import YOLO
    import numpy as np
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False


class EnemyDetector:
    """
    YOLOv8로 현재 프레임에서 적(사람) 감지.
    여러 명 감지 시 전체 반환 → UI에서 선택.
    """
    MODEL_PATH_CUSTOM = Path(__file__).parent / 'models' / 'pubg_best.pt'
    MODEL_PATH_DEFAULT = 'yolov8n.pt'   # ultralytics가 자동 다운로드

    def __init__(self):
        self.model = None
        self.available = YOLO_AVAILABLE
        self.model_type = None  # 'custom' | 'default' | None

    def load(self, custom_path: str = None) -> str:
        """
        모델 로드. 성공 시 설명 문자열 반환, 실패 시 오류 메시지 반환.
        custom_path: .pt 파일 경로 (None이면 자동 선택)
        """
        if not YOLO_AVAILABLE:
            return "❌ ultralytics 없음 — pip install ultralytics"

        # 경로 우선순위: custom_path > models/pubg_best.pt > yolov8n.pt
        paths_to_try = []
        if custom_path:
            paths_to_try.append(('custom', Path(custom_path)))
        if self.MODEL_PATH_CUSTOM.exists():
            paths_to_try.append(('pubg', self.MODEL_PATH_CUSTOM))
        paths_to_try.append(('default', self.MODEL_PATH_DEFAULT))

        for model_type, path in paths_to_try:
            try:
                self.model = YOLO(str(path))
                self.model_type = model_type
                name = path if isinstance(path, str) else path.name
                return f"✅ 모델 로드: {name} ({model_type})"
            except Exception as e:
                continue

        return "❌ 모델 로드 실패"

    def is_loaded(self) -> bool:
        return self.model is not None

    def detect(self, frame_bgr, conf=0.35, iou=0.45):
        """
        프레임에서 적 감지.

        Returns:
            list of dict:
                {
                  'x1': float,  # normalized 0-1
                  'y1': float,
                  'x2': float,
                  'y2': float,
                  'cx': float,  # 중심 x (normalized)
                  'cy': float,  # 중심 y (normalized)
                  'conf': float,
                  'cls': str,   # 클래스명
                }
        """
        if self.model is None:
            return []

        h, w = frame_bgr.shape[:2]
        results = self.model(frame_bgr, conf=conf, iou=iou, verbose=False)[0]
        boxes = []

        for box in results.boxes:
            cls_id = int(box.cls[0])
            cls_name = results.names[cls_id]
            # COCO person=0, PUBG custom은 'enemy'/'player' 등
            if self.model_type == 'default' and cls_name != 'person':
                continue  # COCO 모델은 person만

            x1, y1, x2, y2 = box.xyxy[0].tolist()
            boxes.append({
                'x1': x1 / w, 'y1': y1 / h,
                'x2': x2 / w, 'y2': y2 / h,
                'cx': (x1 + x2) / 2 / w,
                'cy': (y1 + y2) / 2 / h,
                'conf': float(box.conf[0]),
                'cls': cls_name,
                'px_x1': int(x1), 'px_y1': int(y1),
                'px_x2': int(x2), 'px_y2': int(y2),
            })

        # 신뢰도 내림차순 정렬
        boxes.sort(key=lambda b: b['conf'], reverse=True)
        return boxes

    def nearest_to_center(self, detections):
        """
        화면 중앙(조준점)에 가장 가까운 적 반환.
        빠른 추적 자동화에 사용.
        """
        if not detections:
            return None
        # 중앙 = (0.5, 0.5)
        return min(detections, key=lambda b: (b['cx'] - 0.5)**2 + (b['cy'] - 0.5)**2)
