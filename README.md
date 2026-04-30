# Corner-Case-Bench

Stress-test object detection and segmentation models against adverse weather and lighting conditions.

Automatically generates synthetic corner cases (fog, rain, snow, glare, etc.) using InstructPix2Pix and quantitatively evaluates YOLOv8 model degradation under each condition.

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

### 1. Install

```bash
pip install -r requirements.txt
cd frontend && npm install
```

### 2. Prepare Data

Place BDD100K images under `data/original/val/`.

### 3. Run Pipeline

```bash
# Full pipeline (detection)
python -m pipeline.run_pipeline --stage all

# Full pipeline (segmentation)
python -m pipeline.run_pipeline --stage all --task segment

# Run stages individually
python -m pipeline.run_pipeline --stage baseline
python -m pipeline.run_pipeline --stage generate
python -m pipeline.run_pipeline --stage evaluate
```

Options:
- `--task detect|segment` — bbox detection or instance segmentation (default: detect)
- `--stage all|baseline|generate|evaluate` — run specific stage
- `--split train|val|test|all` — BDD100K split (default: val)
- `--limit N` — max images to process (0 = all)

### 4. Dashboard

```bash
# Backend
uvicorn backend.main:app --port 8000

# Frontend (separate terminal)
cd frontend && npm run dev
```

Open http://localhost:3000

#### Dashboard Pages

- **Overview** — Safety Score gauge, vulnerability radar chart, condition-wise performance degradation, class vulnerability ranking, safety alerts
- **Compare** — Before/After interactive slider, per-object detection table (Detected vs MISSED), confidence distribution histogram
- **Gallery** — Filterable image grid with severity badges (Critical/Warning/OK), FN rate progress bars, worst-case sorting

## Conditions

| Condition | Category | Severity |
|-----------|----------|----------|
| dense_fog | Weather | Extreme |
| heavy_rain | Weather | Extreme |
| snow_blizzard | Weather | Extreme |
| strong_glare | Lighting | Extreme |
| night_dark | Lighting | Extreme |
| dirty_lens | Occlusion | Moderate |

Conditions are configurable via `configs/prompts.yaml`.

## Metrics

| Metric | Description |
|--------|-------------|
| IoU | Bounding box / mask overlap between baseline and synthetic detections |
| Confidence Drop | Decrease in model confidence score |
| False Negative Rate | Proportion of baseline objects missed in synthetic images |
| Class Flip Rate | Proportion of matched objects with changed class labels |

## Project Structure

```
Corner_Case/
├── pipeline/
│   ├── run_pipeline.py    # CLI entry point
│   ├── baseline.py        # YOLOv8 baseline inference
│   ├── generator.py       # InstructPix2Pix corner case generation
│   └── evaluator.py       # Re-inference and metrics computation
├── backend/
│   └── main.py            # FastAPI REST API
├── frontend/              # Next.js dashboard (glassmorphism UI)
├── configs/
│   └── prompts.yaml       # Condition prompts and model config
├── data/
│   ├── original/          # Source images
│   ├── synthetic/         # Generated corner case images
│   └── results/           # Baseline, synthetic results, and metrics
└── tests/
```

## Tech Stack

- **Generation**: InstructPix2Pix (Stable Diffusion)
- **Detection**: YOLOv8m / YOLOv8m-seg (Ultralytics)
- **Backend**: FastAPI + Uvicorn
- **Frontend**: Next.js 16, React 19, Recharts, Tailwind CSS 4, Framer Motion
