#!/usr/bin/env python3
"""PUBG 반동 분석기 v2.0
  - 영상 프레임 탐색 (슬라이더 + 프레임 이동)
  - 적 위치 수동 클릭 마킹
  - [NEW] YOLOv8 자동 적 감지 — 다중 적 클릭 선택
  - 반동 패턴 분석 + 산점도 차트
  - DPI/감도 입력 → 스코프별 추천

의존성: pip install opencv-python Pillow matplotlib numpy ultralytics
"""
import sys, math, tkinter as tk
from tkinter import filedialog, messagebox
from pathlib import Path
from detector import EnemyDetector

# ── 선택 라이브러리 체크 ──────────────────────────────────────────────────────
try:
    import cv2
    import numpy as np
    from PIL import Image, ImageTk
except ImportError as e:
    import tkinter as _tk
    r = _tk.Tk(); r.withdraw()
    messagebox.showerror("라이브러리 누락",
        f"{e}\n\n터미널에서 실행:\n  pip install opencv-python Pillow matplotlib numpy")
    sys.exit(1)

try:
    import matplotlib
    matplotlib.use('TkAgg')
    import matplotlib.pyplot as plt
    from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
    MPL = True
except ImportError:
    MPL = False

# ── 색상 ─────────────────────────────────────────────────────────────────────
BG      = '#0f172a'
SURFACE = '#1e293b'
BORDER  = '#334155'
ACCENT  = '#3b82f6'
ORANGE  = '#f97316'
GREEN   = '#22c55e'
RED     = '#ef4444'
TEXT    = '#f1f5f9'
DIM     = '#94a3b8'

# ── PUBG 스코프 FOV ───────────────────────────────────────────────────────────
SCOPES = [
    ('홀로/레드닷', 78),
    ('2배율',       55),
    ('3배율',       40),
    ('6배율',       20),
    ('8배율',       15),
    ('15배율',       8),
]

def viewspeed_sens(base_sens, base_fov, scope_fov):
    r = math.radians
    ratio = math.sqrt(math.tan(r(scope_fov/2)) / math.tan(r(base_fov/2)))
    return round(base_sens * ratio * 10) / 10


class PUBGAnalyzer:
    def __init__(self, root):
        self.root = root
        self.root.title("PUBG 감도 분석기 v1.0")
        self.root.geometry("1300x820")
        self.root.configure(bg=BG)
        self.root.minsize(900, 600)

        # ── 영상 상태 ──
        self.cap = None
        self.total_frames = 0
        self.fps = 30.0
        self.frame_w = 1920
        self.frame_h = 1080
        self.current_frame_idx = 0
        self.current_frame_data = None

        # ── 마킹 ──
        self.marks = []       # [(frame_idx, norm_x, norm_y)]
        self.mark_mode = False

        # ── YOLO 감지 ──
        self.detector = EnemyDetector()
        self.detections = []        # 현재 프레임 감지 결과 [{...}]
        self.select_mode = False    # 감지 박스 클릭으로 적 선택 중

        # ── 설정 ──
        self.dpi_var  = tk.IntVar(value=800)
        self.sens_var = tk.DoubleVar(value=50)

        self._build_ui()

    # ══════════════════════════════ UI 구성 ════════════════════════════════════

    def _build_ui(self):
        # ── 상단 툴바 ──
        tb = tk.Frame(self.root, bg=SURFACE, height=52)
        tb.pack(fill='x')
        tb.pack_propagate(False)

        tk.Label(tb, text="🎯  PUBG 감도 분석기", bg=SURFACE, fg=TEXT,
                 font=('Helvetica', 14, 'bold')).pack(side='left', padx=16, pady=10)

        self._btn(tb, "📂 영상 열기",  self.open_video).pack(side='left', padx=4, pady=8)
        self._btn(tb, "📊 분석 실행",  self.run_analysis, ACCENT).pack(side='left', padx=4, pady=8)

        tk.Label(tb, text="DPI", bg=SURFACE, fg=DIM, font=('Helvetica', 10)).pack(side='left', padx=(20,3))
        tk.Entry(tb, textvariable=self.dpi_var, width=6, bg=BORDER, fg=TEXT,
                 insertbackground=TEXT, font=('Helvetica', 11), relief='flat').pack(side='left')

        tk.Label(tb, text="일반감도", bg=SURFACE, fg=DIM, font=('Helvetica', 10)).pack(side='left', padx=(14,3))
        tk.Entry(tb, textvariable=self.sens_var, width=5, bg=BORDER, fg=TEXT,
                 insertbackground=TEXT, font=('Helvetica', 11), relief='flat').pack(side='left')

        # ── 메인 분할 패널 ──
        pane = tk.PanedWindow(self.root, orient='horizontal', bg=BG,
                              sashwidth=5, sashrelief='flat', sashpad=2)
        pane.pack(fill='both', expand=True)

        # 왼쪽 (영상 + 컨트롤)
        left = tk.Frame(pane, bg=BG)
        pane.add(left, width=870)

        # 캔버스
        self.canvas = tk.Canvas(left, bg='black', cursor='crosshair', bd=0, highlightthickness=0)
        self.canvas.pack(fill='both', expand=True, padx=8, pady=(8,4))
        self.canvas.bind('<Button-1>', self._on_canvas_click)
        self.canvas.bind('<Configure>', lambda e: self._refresh_frame())

        # 시크 슬라이더
        self.seek_var = tk.IntVar(value=0)
        seek = tk.Scale(left, from_=0, to=100, orient='horizontal',
                        variable=self.seek_var, command=self._on_seek,
                        bg=SURFACE, fg=TEXT, troughcolor=BORDER, activebackground=ACCENT,
                        highlightthickness=0, sliderrelief='flat', showvalue=False, length=600)
        seek.pack(fill='x', padx=8)

        # 버튼 행
        br = tk.Frame(left, bg=SURFACE)
        br.pack(fill='x', padx=8, pady=4)

        self._btn(br, "⏮ -5",   lambda: self._step(-5)).pack(side='left', padx=2, pady=4)
        self._btn(br, "⏮ -1",   lambda: self._step(-1)).pack(side='left', padx=2, pady=4)
        self._btn(br, "+1 ⏭",   lambda: self._step(1)).pack(side='left', padx=2, pady=4)
        self._btn(br, "+5 ⏭",   lambda: self._step(5)).pack(side='left', padx=2, pady=4)
        self._btn(br, "+30",     lambda: self._step(30)).pack(side='left', padx=2, pady=4)

        self.mark_btn = self._btn(br, "🎯 적 위치 마킹 ON", self._toggle_mark, '#7c3aed')
        self.mark_btn.pack(side='left', padx=(20,2), pady=4)
        self._btn(br, "↩ 취소",  self._undo_mark).pack(side='left', padx=2, pady=4)
        self._btn(br, "🗑 초기화", self._clear_marks, '#7f1d1d').pack(side='left', padx=2, pady=4)

        # YOLO 버튼 행
        yr = tk.Frame(left, bg=SURFACE)
        yr.pack(fill='x', padx=8, pady=(0,4))

        tk.Label(yr, text="AI 자동 감지 (YOLOv8)", bg=SURFACE, fg=DIM,
                 font=('Helvetica', 9)).pack(side='left', padx=(4,8))
        self._btn(yr, "🤖 모델 로드",   self._load_model, '#1e3a5f').pack(side='left', padx=2)
        self.detect_btn = self._btn(yr, "🔍 이 프레임 감지", self._detect_frame, '#1e3a5f')
        self.detect_btn.pack(side='left', padx=2)
        self._btn(yr, "⚡ 전체 자동 마킹", self._auto_mark_all, '#4c1d95').pack(side='left', padx=2)
        self.model_label = tk.Label(yr, text="모델: 미로드", bg=SURFACE, fg=DIM,
                                     font=('Courier', 9))
        self.model_label.pack(side='left', padx=8)

        self.frame_label = tk.Label(left, text="영상을 열어주세요",
                                     bg=SURFACE, fg=DIM, font=('Courier', 9))
        self.frame_label.pack(padx=8, pady=2, anchor='w')

        # 오른쪽 (결과 패널)
        right = tk.Frame(pane, bg=SURFACE)
        pane.add(right, width=400)

        tk.Label(right, text="반동 분석", bg=SURFACE, fg=TEXT,
                 font=('Helvetica', 13, 'bold')).pack(pady=(14,2), padx=14, anchor='w')

        tk.Label(right, text="마킹 목록  (프레임 | 적 x,y 좌표)", bg=SURFACE, fg=DIM,
                 font=('Helvetica', 9)).pack(padx=14, anchor='w')

        lb_f = tk.Frame(right, bg=BORDER, pady=1)
        lb_f.pack(fill='x', padx=14, pady=(2,8))
        self.listbox = tk.Listbox(lb_f, bg='#0f172a', fg=TEXT, font=('Courier', 9),
                                   height=7, selectbackground=ACCENT, bd=0,
                                   highlightthickness=0)
        self.listbox.pack(fill='x', padx=1, pady=1)

        # 결과 텍스트
        self.result_txt = tk.Text(right, bg='#0f172a', fg=TEXT, font=('Courier', 9),
                                   height=10, wrap='word', bd=0, highlightthickness=0,
                                   state='disabled')
        self.result_txt.pack(fill='x', padx=14, pady=(0,4))

        # 산점도 차트
        if MPL:
            self.fig, self.ax = plt.subplots(figsize=(3.6, 3.2), facecolor=SURFACE)
            self.chart = FigureCanvasTkAgg(self.fig, master=right)
            self.chart.get_tk_widget().pack(fill='x', padx=14, pady=4)

        self.status_var = tk.StringVar(value="영상을 열어서 시작하세요.")
        tk.Label(right, textvariable=self.status_var, bg=SURFACE, fg=DIM,
                 font=('Helvetica', 9), wraplength=370, justify='left').pack(padx=14, pady=4)

    # ══════════════════════════════ 영상 제어 ══════════════════════════════════

    def open_video(self):
        path = filedialog.askopenfilename(
            title="PUBG 영상 선택",
            filetypes=[("영상", "*.mp4 *.avi *.mov *.mkv *.webm *.wmv"), ("전체", "*.*")]
        )
        if not path:
            return
        if self.cap:
            self.cap.release()
        cap = cv2.VideoCapture(path)
        if not cap.isOpened():
            messagebox.showerror("오류", "영상을 열 수 없습니다.")
            return
        self.cap = cap
        self.total_frames = max(1, int(cap.get(cv2.CAP_PROP_FRAME_COUNT)))
        self.fps  = cap.get(cv2.CAP_PROP_FPS) or 30.0
        self.frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.seek_var.set(0)
        tk.Scale.configure(self.root.nametowidget(self.root.winfo_children()[1]
            .winfo_children()[0].winfo_children()[0]), to=self.total_frames-1) \
            if False else None  # 슬라이더 to 직접 업데이트
        for w in self.root.winfo_children():
            for w2 in getattr(w, 'winfo_children', lambda: [])():
                if isinstance(w2, tk.Scale):
                    w2.configure(to=self.total_frames-1)
        self._clear_marks()
        self._goto_frame(0)
        name = Path(path).name
        self.status_var.set(f"📹 {name}\n{self.total_frames}프레임 | {self.fps:.1f}fps | {self.frame_w}×{self.frame_h}")

    def _goto_frame(self, idx):
        if not self.cap:
            return
        idx = max(0, min(idx, self.total_frames - 1))
        self.cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = self.cap.read()
        if ret:
            self.current_frame_idx = idx
            self.current_frame_data = frame
            self.seek_var.set(idx)
            sec = idx / self.fps
            self.frame_label.configure(
                text=f"프레임 {idx:05d} / {self.total_frames-1}   |   {sec:.2f}s   |   마킹 {len(self.marks)}개")
            self._refresh_frame()

    def _refresh_frame(self):
        if self.current_frame_data is None:
            return
        frame = self.current_frame_data.copy()
        h, w = frame.shape[:2]

        # 조준점 (화면 정중앙)
        cx, cy = w // 2, h // 2
        cv2.line(frame, (cx-25, cy), (cx+25, cy), (80, 255, 80), 2)
        cv2.line(frame, (cx, cy-25), (cx, cy+25), (80, 255, 80), 2)
        cv2.circle(frame, (cx, cy), 5, (80,255,80), -1)
        cv2.putText(frame, "CROSSHAIR", (cx+8, cy-8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (80,255,80), 1)

        # YOLO 감지 박스 오버레이 (선택 대기 중)
        if self.select_mode and self.detections:
            for di, det in enumerate(self.detections):
                px1 = int(det['x1'] * w); py1 = int(det['y1'] * h)
                px2 = int(det['x2'] * w); py2 = int(det['y2'] * h)
                # 박스 색상: 신뢰도 높을수록 밝게
                alpha = min(1.0, det['conf'] * 1.4)
                r_col = int(255 * alpha); g_col = int(100 * alpha)
                cv2.rectangle(frame, (px1, py1), (px2, py2), (r_col, g_col, 30), 2)
                label = f"#{di+1} {det['cls']} {det['conf']:.2f}"
                cv2.putText(frame, label, (px1+4, py1+18),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,100), 1)
            # 안내 텍스트
            cv2.putText(frame, "클릭으로 추적할 적 선택 (ESC=취소)",
                        (10, h-20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255,220,50), 2)

        # 마킹 오버레이
        for i, (fi, nx, ny) in enumerate(self.marks):
            px, py = int(nx * w), int(ny * h)
            is_cur = (fi == self.current_frame_idx)
            col = (50, 180, 255) if is_cur else (30, 100, 255)
            cv2.circle(frame, (px, py), 10, col, 2)
            cv2.putText(frame, str(i+1), (px+12, py-4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,255), 1)
            if i > 0:
                prev_fi, px0n, py0n = self.marks[i-1]
                px0, py0 = int(px0n*w), int(py0n*h)
                cv2.arrowedLine(frame, (px0, py0), (px, py),
                                (59, 130, 246), 2, tipLength=0.25)

        # 캔버스에 맞게 리사이즈
        cw = max(1, self.canvas.winfo_width())
        ch = max(1, self.canvas.winfo_height())
        scale = min(cw / w, ch / h)
        nw, nh = int(w * scale), int(h * scale)
        ox, oy = (cw - nw) // 2, (ch - nh) // 2

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img = Image.fromarray(rgb).resize((nw, nh), Image.LANCZOS)
        photo = ImageTk.PhotoImage(img)
        self.canvas.delete('all')
        self.canvas.create_image(ox, oy, anchor='nw', image=photo)
        self.canvas._photo = photo  # GC 방지
        self.canvas._meta = (ox, oy, nw, nh, w, h)

    def _step(self, delta):
        self._goto_frame(self.current_frame_idx + delta)

    def _on_seek(self, val):
        self._goto_frame(int(val))

    # ══════════════════════════════ 마킹 ══════════════════════════════════════

    def _toggle_mark(self):
        self.mark_mode = not self.mark_mode
        if self.mark_mode:
            self.mark_btn.configure(text="🟡 마킹 중 — 적 위치 클릭", bg='#b45309')
            self.status_var.set("🎯 마킹 모드 ON\n프레임을 멈추고 적이 있는 위치를 클릭하세요")
        else:
            self.mark_btn.configure(text="🎯 적 위치 마킹 ON", bg='#7c3aed')
            self.status_var.set("마킹 완료. [분석 실행] 버튼을 눌러주세요.")

    def _on_canvas_click(self, event):
        meta = getattr(self.canvas, '_meta', None)
        if not meta:
            return
        ox, oy, nw, nh, ow, oh = meta
        rx, ry = event.x - ox, event.y - oy
        if rx < 0 or ry < 0 or rx > nw or ry > nh:
            return
        nx, ny = rx / nw, ry / nh

        # ── YOLO 선택 모드: 클릭한 박스 안의 적을 마킹 ──
        if self.select_mode and self.detections:
            clicked = None
            for det in self.detections:
                if det['x1'] <= nx <= det['x2'] and det['y1'] <= ny <= det['y2']:
                    clicked = det
                    break
            if clicked:
                # 선택된 적의 중심을 마킹
                self.marks.append((self.current_frame_idx, clicked['cx'], clicked['cy']))
                self.select_mode = False
                self.detections = []
                self._update_list()
                self._refresh_frame()
                self.status_var.set(f"✅ 적 선택됨 (신뢰도 {clicked['conf']:.2f}) | 마킹 {len(self.marks)}개")
            else:
                self.status_var.set("⚠ 박스 안을 클릭하세요. ESC로 취소.")
            return

        # ── 수동 마킹 모드 ──
        if not self.mark_mode:
            return
        self.marks.append((self.current_frame_idx, nx, ny))
        self._update_list()
        self._refresh_frame()
        self.frame_label.configure(
            text=f"프레임 {self.current_frame_idx:05d}   |   마킹 {len(self.marks)}개 추가됨")

    # ══════════════════════════════ YOLO 자동 감지 ════════════════════════════

    def _load_model(self):
        """모델 로드 (커스텀 .pt 선택 or 기본 yolov8n)"""
        choice = messagebox.askyesno(
            "모델 선택",
            "커스텀 PUBG 모델(.pt)을 선택하시겠습니까?\n\n"
            "[예] 파일 선택\n[아니오] 기본 YOLOv8n (COCO person) 자동 다운로드"
        )
        custom_path = None
        if choice:
            custom_path = filedialog.askopenfilename(
                title="YOLO 모델 파일 선택 (.pt)",
                filetypes=[("PyTorch 모델", "*.pt"), ("전체", "*.*")]
            )
            if not custom_path:
                return

        self.status_var.set("⏳ 모델 로드 중...")
        self.root.update()
        msg = self.detector.load(custom_path)
        self.model_label.configure(text=f"모델: {msg[:40]}")
        self.status_var.set(msg)

    def _detect_frame(self):
        """현재 프레임에서 적 감지 → 여럿이면 선택 대기"""
        if not self.detector.is_loaded():
            messagebox.showinfo("모델 없음", "먼저 [🤖 모델 로드]를 눌러주세요.")
            return
        if self.current_frame_data is None:
            return

        self.status_var.set("⏳ 감지 중...")
        self.root.update()

        dets = self.detector.detect(self.current_frame_data, conf=0.3)

        if not dets:
            self.status_var.set("⚠ 이 프레임에서 적을 감지하지 못했습니다.")
            return

        if len(dets) == 1:
            # 하나만 감지 → 바로 마킹
            det = dets[0]
            self.marks.append((self.current_frame_idx, det['cx'], det['cy']))
            self._update_list()
            self._refresh_frame()
            self.status_var.set(f"✅ 자동 마킹: {det['cls']} (conf {det['conf']:.2f})")
        else:
            # 여럿 감지 → 선택 모드
            self.detections = dets
            self.select_mode = True
            self._refresh_frame()
            self.status_var.set(
                f"🔢 {len(dets)}명 감지됨 — 추적할 적 박스를 클릭하세요 (ESC=가장 가까운 적 자동 선택)"
            )
            # ESC → 가장 가까운 적 자동 선택
            self.root.bind('<Escape>', self._auto_select_nearest)

    def _auto_select_nearest(self, event=None):
        """ESC 누르면 조준점에 가장 가까운 적 자동 선택"""
        self.root.unbind('<Escape>')
        if not self.detections:
            return
        det = self.detector.nearest_to_center(self.detections)
        self.marks.append((self.current_frame_idx, det['cx'], det['cy']))
        self.select_mode = False
        self.detections = []
        self._update_list()
        self._refresh_frame()
        self.status_var.set(f"✅ 가장 가까운 적 자동 선택 | 마킹 {len(self.marks)}개")

    def _auto_mark_all(self):
        """
        전체 자동 마킹:
        현재 프레임부터 +N 프레임 간격으로 자동 감지 → 가장 가까운 적 마킹.
        총기 사격 구간에서 여러 프레임 자동 처리.
        """
        if not self.detector.is_loaded():
            messagebox.showinfo("모델 없음", "먼저 [🤖 모델 로드]를 눌러주세요.")
            return
        if self.cap is None:
            return

        # 설정 다이얼로그
        dlg = tk.Toplevel(self.root)
        dlg.title("자동 마킹 설정")
        dlg.configure(bg=SURFACE)
        dlg.geometry("320x200")
        dlg.resizable(False, False)

        tk.Label(dlg, text="시작 프레임", bg=SURFACE, fg=TEXT,
                 font=('Helvetica', 10)).grid(row=0, column=0, padx=16, pady=8, sticky='w')
        start_var = tk.IntVar(value=self.current_frame_idx)
        tk.Entry(dlg, textvariable=start_var, width=10, bg=BORDER, fg=TEXT,
                 insertbackground=TEXT).grid(row=0, column=1, padx=8)

        tk.Label(dlg, text="끝 프레임", bg=SURFACE, fg=TEXT,
                 font=('Helvetica', 10)).grid(row=1, column=0, padx=16, pady=8, sticky='w')
        end_var = tk.IntVar(value=min(self.current_frame_idx + 90, self.total_frames - 1))
        tk.Entry(dlg, textvariable=end_var, width=10, bg=BORDER, fg=TEXT,
                 insertbackground=TEXT).grid(row=1, column=1, padx=8)

        tk.Label(dlg, text="프레임 간격", bg=SURFACE, fg=TEXT,
                 font=('Helvetica', 10)).grid(row=2, column=0, padx=16, pady=8, sticky='w')
        step_var = tk.IntVar(value=3)
        tk.Entry(dlg, textvariable=step_var, width=10, bg=BORDER, fg=TEXT,
                 insertbackground=TEXT).grid(row=2, column=1, padx=8)

        tk.Label(dlg, text="(간격 3 = 30fps 기준 0.1초마다 감지)",
                 bg=SURFACE, fg=DIM, font=('Helvetica', 8)).grid(
                 row=3, column=0, columnspan=2, padx=16)

        def run():
            dlg.destroy()
            start = start_var.get()
            end   = end_var.get()
            step  = max(1, step_var.get())
            count = 0

            for fi in range(start, end + 1, step):
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, fi)
                ret, frame = self.cap.read()
                if not ret:
                    break
                dets = self.detector.detect(frame, conf=0.35)
                if dets:
                    det = self.detector.nearest_to_center(dets)
                    self.marks.append((fi, det['cx'], det['cy']))
                    count += 1
                self.status_var.set(f"⏳ 자동 감지 중... 프레임 {fi}/{end} | 마킹 {count}개")
                self.root.update()

            # 현재 프레임으로 복귀
            self._goto_frame(self.current_frame_idx)
            self._update_list()
            self.status_var.set(f"✅ 자동 마킹 완료: {count}개 마킹됨 (총 {len(self.marks)}개)")

        self._btn(dlg, "▶ 자동 마킹 시작", run, ACCENT).grid(
            row=4, column=0, columnspan=2, pady=12)

    def _undo_mark(self):
        if self.marks:
            self.marks.pop()
            self._update_list()
            self._refresh_frame()

    def _clear_marks(self):
        self.marks.clear()
        self._update_list()
        if self.current_frame_data is not None:
            self._refresh_frame()

    def _update_list(self):
        self.listbox.delete(0, 'end')
        for i, (fi, nx, ny) in enumerate(self.marks):
            t = fi / self.fps
            self.listbox.insert('end',
                f"  {i+1:02d}.  f{fi:05d} ({t:.2f}s)   x={nx:.3f}  y={ny:.3f}")

    # ══════════════════════════════ 분석 ════════════════════════════════════════

    def run_analysis(self):
        if len(self.marks) < 2:
            messagebox.showwarning("마킹 부족", "최소 2개 이상 적 위치를 마킹해주세요.")
            return

        W, H = self.frame_w, self.frame_h
        # PUBG 조준점 = 항상 화면 중앙 (0.5, 0.5)
        # 적 위치 변화 = 반동의 역방향
        # dy > 0: 적이 화면 아래로 → 조준이 위로 튀는 중 → 마우스 아래로 당김 필요
        vectors = []
        for i in range(1, len(self.marks)):
            fi0, x0, y0 = self.marks[i-1]
            fi1, x1, y1 = self.marks[i]
            dx = (x1 - x0) * W
            dy = (y1 - y0) * H
            vectors.append({'dx': dx, 'dy': dy, 'dist': math.hypot(dx, dy)})

        avg_dx = sum(v['dx'] for v in vectors) / len(vectors)
        avg_dy = sum(v['dy'] for v in vectors) / len(vectors)

        dy_vals  = [v['dy'] for v in vectors]
        dy_mean  = sum(dy_vals) / len(dy_vals)
        dy_var   = sum((v - dy_mean)**2 for v in dy_vals) / len(dy_vals)
        avg_dist = math.sqrt(sum(v['dist']**2 for v in vectors) / len(vectors))
        consistency = max(0, round((1 - math.sqrt(dy_var) / (avg_dist + 0.001)) * 100))

        dpi   = self.dpi_var.get()
        sens  = float(self.sens_var.get())
        edpi  = dpi * sens / 100

        # 스코프 추천 (Viewspeed)
        scope_lines = []
        for name, fov in SCOPES:
            rec = viewspeed_sens(sens, 103, fov)
            scope_lines.append(f"    {name:<12} → {rec}")

        vert_txt  = "위로 튀는 반동 ↑" if avg_dy > 3 else ("아래 드롭 ↓" if avg_dy < -3 else "수직 안정 ✓")
        horiz_txt = "우측 편향 →"      if avg_dx > 3 else ("← 좌측 편향"  if avg_dx < -3 else "수평 안정 ✓")

        lines = [
            "════════ 반동 패턴 분석 결과 ════════",
            f"마킹 수    : {len(self.marks)}개",
            f"eDPI       : {round(edpi)}",
            "",
            "【반동 방향】",
            f"  수직 : {vert_txt}  (avg {avg_dy:+.1f}px)",
            f"  수평 : {horiz_txt}  (avg {avg_dx:+.1f}px)",
            f"  일관성: {consistency}%",
            "",
            "【구간별 이동】",
        ]
        for i, v in enumerate(vectors):
            vert = "↑" if v['dy'] > 3 else ("↓" if v['dy'] < -3 else "·")
            horiz = "→" if v['dx'] > 3 else ("←" if v['dx'] < -3 else "·")
            lines.append(f"  {i+1}→{i+2}: {vert}{horiz}  dy={v['dy']:+.1f}  dx={v['dx']:+.1f}  ({v['dist']:.0f}px)")
        lines += [
            "",
            "【스코프별 추천 감도 (Viewspeed)】",
            *scope_lines,
            "",
            "【코칭】",
        ]
        if avg_dy > 5:
            lines.append("  💡 마우스를 더 아래로 당기는 연습 필요")
        if abs(avg_dx) > 4:
            lines.append(f"  💡 {'좌측' if avg_dx>0 else '우측'}으로 보정하세요")
        if consistency < 50:
            lines.append("  💡 패턴 불규칙 — 감도를 낮춰 안정화")
        if consistency >= 70 and avg_dy <= 5 and abs(avg_dx) <= 4:
            lines.append("  ✅ 반동 제어가 안정적입니다!")

        txt = '\n'.join(lines)
        self.result_txt.configure(state='normal')
        self.result_txt.delete('1.0', 'end')
        self.result_txt.insert('end', txt)
        self.result_txt.configure(state='disabled')

        # 산점도
        if MPL:
            xs = [(m[1] - 0.5) * W for m in self.marks]
            ys = [(m[2] - 0.5) * H for m in self.marks]
            self._draw_chart(xs, ys)

    def _draw_chart(self, xs, ys):
        self.ax.clear()
        self.ax.set_facecolor('#0f172a')
        self.fig.patch.set_facecolor(SURFACE)
        self.ax.set_title('적 위치 분포 (조준점 중심)', color=TEXT, fontsize=9, pad=6)
        self.ax.axhline(0, color=BORDER, lw=0.8)
        self.ax.axvline(0, color=BORDER, lw=0.8)
        # 조준점
        self.ax.plot(0, 0, 'P', color=GREEN, markersize=10, zorder=10, label='조준점')
        # 적 경로
        n = len(xs)
        for i in range(n):
            col = GREEN if i == 0 else (RED if i == n-1 else ACCENT)
            self.ax.scatter(xs[i], ys[i], color=col, s=40, zorder=5)
            self.ax.annotate(str(i+1), (xs[i]+2, ys[i]-2), color=TEXT, fontsize=7)
            if i > 0:
                self.ax.annotate('', xy=(xs[i], ys[i]), xytext=(xs[i-1], ys[i-1]),
                                 arrowprops=dict(arrowstyle='->', color=ACCENT, lw=1.2))
        self.ax.invert_yaxis()
        self.ax.tick_params(colors=DIM, labelsize=7)
        for sp in self.ax.spines.values():
            sp.set_edgecolor(BORDER)
        self.ax.set_xlabel('수평 편차 (px)', color=DIM, fontsize=8)
        self.ax.set_ylabel('수직 편차 (px)', color=DIM, fontsize=8)
        self.ax.legend(fontsize=7, facecolor=SURFACE, labelcolor=TEXT, framealpha=0.8)
        self.fig.tight_layout(pad=1.2)
        self.chart.draw()

    # ══════════════════════════════ 유틸 ════════════════════════════════════════

    def _btn(self, parent, text, cmd, bg=BORDER):
        return tk.Button(parent, text=text, command=cmd, bg=bg, fg=TEXT,
                         activebackground=ACCENT, activeforeground='white',
                         relief='flat', padx=9, pady=4, cursor='hand2',
                         font=('Helvetica', 10, 'bold'))


if __name__ == '__main__':
    root = tk.Tk()
    app = PUBGAnalyzer(root)
    root.mainloop()
