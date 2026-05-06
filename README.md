# Corner-Case-Bench

악천후 및 조명 코너 케이스 환경에서 객체 검출(detection) / 분할(segmentation) 모델의 강건성을 stress-test합니다.

InstructPix2Pix로 합성 코너 케이스(짙은 안개, 폭우, 눈, 강한 역광 등)를 자동 생성하고, YOLOv8 모델이 각 조건에서 얼마나 성능 저하되는지 정량 평가합니다.

## Screenshots

![Overview](./assets/overview.png)
![Compare — Detection](./assets/compare_detection.png)
![Compare — Segmentation](./assets/compare_segmentation.png)
![Gallery](./assets/gallery.png)

## Pipeline

```
Original Images
     |
     v
[Stage 1] Baseline Inference (YOLOv8 / YOLOv8-seg)
     |
     v
[Stage 2] Corner Case Generation (InstructPix2Pix)
     |
     v
[Stage 3] Evaluation (re-inference + metrics comparison)
     |
     v
[Stage 4] Dashboard (Next.js + FastAPI)
```

## Quick Start

### 1. 설치

```bash
pip install -r requirements.txt
cd frontend && npm install
```

### 2. 데이터 준비

BDD100K 이미지를 `data/original/val/` 아래에 둡니다.

### 3. 파이프라인 실행

```bash
# 전체 (detection)
python -m pipeline.run_pipeline --stage all

# 전체 (segmentation)
python -m pipeline.run_pipeline --stage all --task segment

# 단계별 실행
python -m pipeline.run_pipeline --stage baseline
python -m pipeline.run_pipeline --stage generate
python -m pipeline.run_pipeline --stage evaluate
```

옵션:
- `--task detect|segment` — bbox detection 또는 instance segmentation (기본: detect)
- `--stage all|baseline|generate|evaluate` — 특정 단계만 실행
- `--split train|val|test|all` — BDD100K split 선택 (기본: val)
- `--limit N` — 처리할 최대 이미지 수 (0 = 전체)

출력 디렉토리는 task에 따라 자동 분기됩니다 (`_seg` / `_det` suffix).

### 4. 대시보드

```bash
# Backend
uvicorn backend.main:app --port 8000

# Frontend (별도 터미널)
cd frontend && npm run dev
```

http://localhost:3000 접속.

상단 nav의 **Detection / Segmentation 토글**로 모든 페이지의 task 뷰를 전환할 수 있습니다. 토글은 모든 API 호출에 `task=det|seg` 쿼리 파라미터를 부착하며, localStorage로 페이지 간 / 새로고침 후에도 유지됩니다.

#### 페이지 구성

- **Overview** — Safety Score 게이지, vulnerability radar 차트, 조건별 성능 저하, 클래스별 취약성 랭킹, safety alert
- **Compare** — Baseline vs Synthetic 좌우 비교 + overlay (det는 bbox, seg는 mask polygon), 객체별 detection 표 (Detected / MISSED), confidence 분포 히스토그램
- **Gallery** — 조건/심각도 필터 + worst-case 정렬, severity badge (Critical / Warning / OK), FN rate 진행 바

## Conditions

| Condition | 카테고리 | Severity |
|-----------|----------|----------|
| dense_fog | Weather | Extreme |
| heavy_rain | Weather | Extreme |
| snow_blizzard | Weather | Extreme |
| strong_glare | Lighting | Extreme |
| night_dark | Lighting | Extreme |
| dirty_lens | Occlusion | Moderate |

조건은 `configs/prompts.yaml` 에서 변경 가능.

## Metrics

| Metric | 설명 |
|--------|-----|
| IoU | Baseline과 synthetic detection 간 bbox(det) 또는 mask(seg) overlap |
| Confidence Drop | 매칭된 객체에 대한 모델 confidence 감소량 |
| False Negative Rate | Baseline에 있던 객체 중 synthetic에서 놓친 비율 |
| Class Flip Rate | 매칭된 객체 중 클래스가 바뀐 비율 |

Seg는 binary mask IoU, det는 bbox IoU 기반으로 Hungarian matching을 사용해 baseline-synthetic 객체를 1:1 매칭합니다.

## Results

YOLOv8m / YOLOv8m-seg를 BDD100K val 1,000장에서 생성한 **합성 코너 케이스 1,259장**(6 conditions)에 대해 평가했습니다.

### 조건별 성능 저하

| Condition | n | FN% (seg) | FN% (det) | IoU (seg) | IoU (det) | Conf Drop (seg) | 심각도 |
|---|---:|---:|---:|---:|---:|---:|---|
| dense_fog | 200 | **76.7%** | **76.0%** | 0.34 | 0.35 | 0.032 | 치명적 |
| night_dark | 44 | 63.6% | 68.7% | 0.57 | 0.57 | 0.111 | 치명적 |
| strong_glare | 200 | 62.2% | 62.3% | 0.66 | 0.67 | **0.119** | 심각 |
| dirty_lens | 48 | 39.5% | 44.4% | 0.77 | 0.77 | 0.101 | 나쁨 |
| heavy_rain | 567 | 17.9% | 18.1% | 0.88 | 0.88 | 0.030 | 양호 |
| snow_blizzard | 200 | 15.9% | 17.5% | 0.87 | 0.87 | 0.016 | 양호 |

### 가장 취약한 클래스 (miss rate 기준)

| Class | Baseline 개수 | Miss% | 평균 conf drop | Class flip |
|---|---:|---:|---:|---:|
| potted plant | 38 | 78.9% | 0.124 | 0 |
| bench | 18 | 77.8% | -0.097 | 0 |
| stop sign | 102 | 43.1% | 0.028 | 1 |
| traffic light | 1,433 | 42.4% | -0.001 | 0 |
| bus | 214 | 40.2% | 0.025 | 29 |
| person | 803 | 38.9% | 0.043 | 2 |
| car | 8,298 | 36.3% | 0.041 | 75 |
| truck | 777 | 34.1% | 0.036 | **111** |

### 핵심 인사이트

1. **"안 보이는" 실패가 "잘못 보는" 실패보다 압도적.** dense_fog는 IoU 0.34인데 conf drop은 0.03밖에 안 됨 — 모델이 *조용히 76.7% 객체를 놓치는* 중. 자율주행 안전 측면에서 가장 위험한 silent failure.
2. **조명 변화 >> 날씨 변화 (스트레스 강도).** 균일한 밝기 변화(비, 눈)는 모델에 거의 영향 없음 (FN ~17%, IoU ~0.87). 공간적으로 비균일한 조명(역광, 야간, 렌즈 오염)에서 conf drop이 4-7배 큼.
3. **`traffic light`, `bench`에 hallucination 신호.** 두 클래스 모두 conf drop이 *음수* — 악조건에서 오히려 더 자신 있게 detect함. 위험한 false positive 가능성.
4. **차량 종류 혼동이 최다 class-flip 패턴.** truck 111×, car 75×, bus 29× — 코너 케이스에서 car/truck/bus 구분이 뒤섞이므로 downstream 로직에서 차종을 신뢰하면 안 됨.
5. **Seg와 det는 같은 속도로 무너짐.** 모든 condition에서 두 task 간 메트릭 차이 ≤0.02 — segmentation을 추가 운용해도 별도의 robustness 페널티(혹은 이득)는 없음.

**한 줄 결론:** 짙은 안개와 야간이 가장 위험 — *사람만 따로 놓고 봐도 36-39% miss* — 클래스 단위 robustness(작은 정적 객체, 차량 subtype)는 평균 IoU만 봐서는 보이지 않을 만큼 취약함.

## Project Structure

```
Corner_Case/
├── pipeline/
│   ├── run_pipeline.py    # CLI 진입점
│   ├── baseline.py        # YOLOv8 baseline inference
│   ├── generator.py       # InstructPix2Pix corner case 생성
│   └── evaluator.py       # 재추론 + 메트릭 계산
├── backend/
│   └── main.py            # FastAPI REST API
├── frontend/              # Next.js 대시보드 (glassmorphism UI)
├── configs/
│   └── prompts.yaml       # 조건 프롬프트와 모델 설정
├── data/
│   ├── original/                 # 원본 이미지 (BDD100K val)
│   ├── synthetic/                # 생성된 코너 케이스 이미지 (조건별)
│   └── results/
│       ├── baseline_seg/         # YOLOv8-seg 원본 예측 (mask 포함)
│       ├── baseline_det/         # YOLOv8 원본 예측 (bbox)
│       ├── synthetic_seg/        # YOLOv8-seg synthetic 예측
│       ├── synthetic_det/        # YOLOv8 synthetic 예측
│       ├── metrics_seg/          # 이미지별 segmentation 메트릭 (mask IoU 기반)
│       └── metrics_det/          # 이미지별 detection 메트릭 (bbox IoU 기반)
└── tests/
```

## Tech Stack

- **Generation**: InstructPix2Pix (Stable Diffusion)
- **Detection**: YOLOv8m / YOLOv8m-seg (Ultralytics)
- **Backend**: FastAPI + Uvicorn + OpenCV (mask → polygon 변환)
- **Frontend**: Next.js 16, React 19, Recharts, Tailwind CSS 4, Framer Motion
