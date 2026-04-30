# Corner Case Auto-Generation & Stress Test Pipeline

**Date:** 2026-04-28
**Timeline:** 2 weeks
**GPU:** NVIDIA L40S 46GB VRAM

## Overview

자율주행 환경에서 생성형 AI를 활용하여 코너 케이스(악천후, 역광 등)를 자동 생성하고, 객체 인식 모델의 취약점을 정량적으로 분석하는 파이프라인.

### Core Values

- **Data-Centric AI**: 모델 구조 변경 없이 데이터 조작으로 모델 한계를 테스트
- **Zero-Shot Pipeline**: 추가 학습 없이 Pre-trained 모델들을 연결한 자동화 시스템
- **Safety & Reliability**: 자율주행 도메인에서 "AI가 언제 실패하는가"를 정량적으로 측정

## Architecture

4단계 파이프라인 구조:

```
[BDD100K Clear Images] → Stage 1: YOLOv8 Baseline
                              ↓
                         Stage 2: InstructPix2Pix (Rule-based Prompts)
                              ↓
                         Stage 3: Re-inference + Metric Calculation
                              ↓
                         Stage 4: Next.js + FastAPI Dashboard
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Dataset | BDD100K (clear weather filtered) |
| Target Model | YOLOv8 (ultralytics) |
| Image Generation | InstructPix2Pix (HuggingFace Diffusers) |
| Backend | FastAPI |
| Frontend | Next.js |
| Language | Python 3.12 |

## Project Structure

```
Corner_Case/
├── configs/
│   └── prompts.yaml          # Rule-based prompt definitions
├── pipeline/
│   ├── baseline.py           # Stage 1: YOLOv8 baseline inference
│   ├── generator.py          # Stage 2: InstructPix2Pix transformation
│   ├── evaluator.py          # Stage 3: Re-inference + metrics
│   └── run_pipeline.py       # Pipeline orchestrator
├── backend/
│   └── main.py               # FastAPI results API
├── frontend/                 # Next.js dashboard
├── data/
│   ├── original/             # BDD100K clear weather images
│   ├── synthetic/            # Generated adverse weather images
│   └── results/              # JSON results (metrics, bbox)
├── requirements.txt
└── README.md
```

## Stage 1: Baseline Measurement (The Victim)

BDD100K 데이터셋에서 맑은 날씨(clear) 이미지를 필터링하여 YOLOv8 추론을 수행한다.

**Input:** BDD100K clear weather images
**Output:** `results/baseline/{image_id}.json`

```json
{
  "image_id": "img_001",
  "detections": [
    {
      "class": "car",
      "bbox": [x1, y1, x2, y2],
      "confidence": 0.93
    }
  ]
}
```

## Stage 2: Corner Case Generation (The Attacker)

Rule-based 프롬프트를 사용하여 InstructPix2Pix로 원본 이미지의 환경만 변환한다. 객체의 위치와 구조는 유지된다.

**Input:** Original image + prompt from `configs/prompts.yaml`
**Output:** `data/synthetic/{condition}/{image_id}.jpg`

### Prompt Definitions

```yaml
conditions:
  - name: heavy_rain
    prompt: "Make it a heavy rainstorm with water on the road"
    severity: extreme
    category: weather

  - name: dense_fog
    prompt: "Add dense fog reducing visibility to 20 meters"
    severity: extreme
    category: weather

  - name: strong_glare
    prompt: "Add strong sun glare shining directly into the camera"
    severity: extreme
    category: lighting

  - name: night_dark
    prompt: "Make it a dark night scene with only streetlights"
    severity: extreme
    category: lighting

  - name: snow_blizzard
    prompt: "Make it a heavy snowstorm with snow on the road"
    severity: extreme
    category: weather

  - name: dirty_lens
    prompt: "Add mud and water droplets on the camera lens"
    severity: moderate
    category: occlusion
```

### InstructPix2Pix Configuration

- Model: `timbrooks/instruct-pix2pix`
- Image guidance scale: 1.5 (구조 유지 강조)
- Text guidance scale: 7.5
- Inference steps: 50

## Stage 3: Evaluation (The Judge)

합성 이미지에 대해 YOLOv8을 재추론하고, baseline 결과와 비교하여 성능 하락을 정량화한다.

**Input:** Synthetic image + baseline results
**Output:** `results/metrics/{condition}/{image_id}.json`

### Metrics

| Metric | Calculation | Description |
|--------|-------------|-------------|
| IoU Drop | Baseline bbox vs Synthetic bbox IoU | 바운딩 박스 정확도 하락 |
| Confidence Drop | Baseline conf - Synthetic conf | 모델 확신도 하락 |
| False Negative Rate | (Baseline detected but Synthetic missed) / Total baseline | 객체 미탐지 비율 |
| Class Flip Rate | Same object classified differently / Total matched | 오분류 비율 |

### Matching Logic

- Baseline 탐지 결과를 GT로 사용
- IoU >= 0.5 threshold로 1:1 bbox 매칭 (Hungarian algorithm)
- 매칭 실패 시 False Negative 처리

## Stage 4: Dashboard (Visualization)

Next.js + FastAPI 기반 대시보드로 모델 취약점을 시각화한다.

### Pages

**1. Overview**
- Summary cards: 총 이미지 수, 평균 confidence drop, FN rate, 최악 조건
- 조건별 성능 하락 바 차트 (color-coded by severity)
- Safety 경고 배너 (threshold 초과 시)

**2. Compare**
- 원본/합성 이미지 나란히 비교
- Bounding box 오버레이 (원본: green, 합성: yellow/red)
- 개별 객체 메트릭 테이블 (IoU, conf drop, 탐지 상태)

**3. Gallery**
- 조건별 필터링 가능한 이미지 갤러리
- 클래스별 취약점 분석 (차량, 보행자, 자전거 등)
- Worst-case 이미지 자동 정렬

### FastAPI Endpoints

```
GET  /api/summary              # Overview 집계 데이터
GET  /api/results               # 전체 결과 리스트 (필터/페이지네이션)
GET  /api/results/{image_id}    # 개별 이미지 상세 결과
GET  /api/images/{path}         # 이미지 파일 서빙
```

## Data Flow Summary

```
original/img_001.jpg
  → YOLOv8 → results/baseline/img_001.json
  → InstructPix2Pix("heavy rain") → synthetic/heavy_rain/img_001.jpg
      → YOLOv8 → results/synthetic/heavy_rain/img_001.json
          → Compare → results/metrics/heavy_rain/img_001.json
```

## Future Extensions (Out of Scope for MVP)

- VLM Agentic mode: VLM이 원본 분석 후 최적 방해 프롬프트 자동 생성
- Multi-model comparison: YOLOv8 외 다른 모델(RT-DETR 등) 추가 비교
- Adversarial combination: 복합 조건(야간+폭우) 자동 조합 테스트
