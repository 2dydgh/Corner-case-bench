# Corner Case Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** BDD100K 이미지에 InstructPix2Pix로 악천후를 합성하고, YOLOv8 성능 하락을 정량 분석하여 Next.js 대시보드로 시각화하는 파이프라인을 구축한다.

**Architecture:** 4단계 파이프라인 (Baseline → Generation → Evaluation → Dashboard). Python pipeline 모듈이 Stage 1~3을 처리하고, FastAPI가 결과를 서빙하며, Next.js가 시각화한다.

**Tech Stack:** Python 3.12, ultralytics (YOLOv8), diffusers (InstructPix2Pix), FastAPI, Next.js, scipy (Hungarian matching)

**Spec:** `Corner_Case/docs/specs/2026-04-28-corner-case-pipeline-design.md`

---

## File Structure

```
Corner_Case/
├── configs/
│   └── prompts.yaml                # 6 rule-based corner case prompts
├── pipeline/
│   ├── __init__.py
│   ├── baseline.py                 # YOLOv8 inference, saves baseline JSON
│   ├── generator.py                # InstructPix2Pix image transformation
│   ├── evaluator.py                # Re-inference + metric calculation (IoU, conf, FN, class flip)
│   └── run_pipeline.py             # CLI orchestrator for full pipeline
├── backend/
│   ├── __init__.py
│   └── main.py                     # FastAPI: /api/summary, /api/results, /api/images
├── frontend/                       # Next.js app
│   ├── src/
│   │   └── app/
│   │       ├── layout.tsx
│   │       ├── page.tsx            # Overview page
│   │       ├── compare/
│   │       │   └── page.tsx        # Compare page
│   │       ├── gallery/
│   │       │   └── page.tsx        # Gallery page
│   │       └── components/
│   │           ├── SummaryCards.tsx
│   │           ├── ConditionChart.tsx
│   │           ├── ImageCompare.tsx
│   │           └── MetricsTable.tsx
│   ├── package.json
│   ├── next.config.ts
│   └── tailwind.config.ts
├── tests/
│   ├── __init__.py
│   ├── test_baseline.py
│   ├── test_generator.py
│   └── test_evaluator.py
├── data/
│   ├── original/
│   ├── synthetic/
│   └── results/
│       ├── baseline/
│       ├── synthetic/
│       └── metrics/
├── requirements.txt
└── README.md
```

---

## Task 1: Project Setup & Configuration

**Files:**
- Create: `Corner_Case/requirements.txt`
- Create: `Corner_Case/configs/prompts.yaml`
- Create: `Corner_Case/pipeline/__init__.py`
- Create: `Corner_Case/tests/__init__.py`

- [ ] **Step 1: Create requirements.txt**

```txt
ultralytics>=8.2.0
diffusers>=0.27.0
transformers>=4.40.0
accelerate>=0.30.0
safetensors>=0.4.0
torch>=2.2.0
torchvision>=0.17.0
Pillow>=10.0.0
pyyaml>=6.0
scipy>=1.12.0
fastapi>=0.111.0
uvicorn>=0.30.0
pytest>=8.0.0
```

- [ ] **Step 2: Create prompts.yaml**

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

model:
  name: "timbrooks/instruct-pix2pix"
  image_guidance_scale: 1.5
  text_guidance_scale: 7.5
  num_inference_steps: 50

yolo:
  model: "yolov8m.pt"
  confidence_threshold: 0.25
  iou_threshold: 0.5
```

- [ ] **Step 3: Create __init__.py files**

```python
# Corner_Case/pipeline/__init__.py
# Corner_Case/tests/__init__.py
# Both empty
```

- [ ] **Step 4: Create data directories**

Run:
```bash
mkdir -p Corner_Case/data/{original,synthetic,results/{baseline,synthetic,metrics}}
```

- [ ] **Step 5: Install dependencies**

Run:
```bash
cd Corner_Case && pip install -r requirements.txt
```

- [ ] **Step 6: Commit**

```bash
git add Corner_Case/requirements.txt Corner_Case/configs/prompts.yaml \
  Corner_Case/pipeline/__init__.py Corner_Case/tests/__init__.py
git commit -m "feat: project setup with dependencies and prompt configs"
```

---

## Task 2: Stage 1 — Baseline Inference (YOLOv8)

**Files:**
- Create: `Corner_Case/tests/test_baseline.py`
- Create: `Corner_Case/pipeline/baseline.py`

- [ ] **Step 1: Write failing tests**

```python
# Corner_Case/tests/test_baseline.py
import json
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
from PIL import Image

from pipeline.baseline import run_baseline, parse_yolo_result


class TestParseYoloResult:
    def test_parses_detection_to_dict(self):
        """YOLOv8 result 객체를 표준 dict로 변환"""
        mock_box = MagicMock()
        mock_box.xyxy = MagicMock()
        mock_box.xyxy.cpu().numpy.return_value = [[100.0, 200.0, 300.0, 400.0]]
        mock_box.conf = MagicMock()
        mock_box.conf.cpu().numpy.return_value = [0.92]
        mock_box.cls = MagicMock()
        mock_box.cls.cpu().numpy.return_value = [2.0]

        mock_result = MagicMock()
        mock_result.boxes = [mock_box]
        mock_result.names = {2: "car"}

        parsed = parse_yolo_result(mock_result)

        assert len(parsed) == 1
        assert parsed[0]["class"] == "car"
        assert parsed[0]["bbox"] == [100.0, 200.0, 300.0, 400.0]
        assert parsed[0]["confidence"] == pytest.approx(0.92, abs=0.01)

    def test_empty_detections(self):
        """탐지 결과가 없을 때 빈 리스트 반환"""
        mock_result = MagicMock()
        mock_result.boxes = []

        parsed = parse_yolo_result(mock_result)
        assert parsed == []


class TestRunBaseline:
    def test_saves_result_json(self):
        """추론 결과를 JSON 파일로 저장"""
        with tempfile.TemporaryDirectory() as tmpdir:
            img_dir = Path(tmpdir) / "original"
            out_dir = Path(tmpdir) / "results" / "baseline"
            img_dir.mkdir(parents=True)
            out_dir.mkdir(parents=True)

            # 테스트 이미지 생성
            img = Image.new("RGB", (640, 480), color="blue")
            img_path = img_dir / "test_001.jpg"
            img.save(img_path)

            mock_det = {
                "class": "car",
                "bbox": [100.0, 200.0, 300.0, 400.0],
                "confidence": 0.91,
            }

            with patch("pipeline.baseline.load_yolo") as mock_load:
                mock_model = MagicMock()
                mock_result = MagicMock()
                mock_result.boxes = [MagicMock()]
                mock_model.return_value = [mock_result]
                mock_load.return_value = mock_model

                with patch("pipeline.baseline.parse_yolo_result", return_value=[mock_det]):
                    run_baseline(
                        image_dir=img_dir,
                        output_dir=out_dir,
                        model_name="yolov8m.pt",
                        conf_threshold=0.25,
                    )

            result_path = out_dir / "test_001.json"
            assert result_path.exists()

            data = json.loads(result_path.read_text())
            assert data["image_id"] == "test_001"
            assert len(data["detections"]) == 1
            assert data["detections"][0]["class"] == "car"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd Corner_Case && python -m pytest tests/test_baseline.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'pipeline.baseline'`

- [ ] **Step 3: Implement baseline.py**

```python
# Corner_Case/pipeline/baseline.py
import json
from pathlib import Path

from PIL import Image
from ultralytics import YOLO


def load_yolo(model_name: str) -> YOLO:
    return YOLO(model_name)


def parse_yolo_result(result) -> list[dict]:
    detections = []
    for box in result.boxes:
        xyxy = box.xyxy.cpu().numpy()[0].tolist()
        conf = float(box.conf.cpu().numpy()[0])
        cls_id = int(box.cls.cpu().numpy()[0])
        cls_name = result.names[cls_id]
        detections.append({
            "class": cls_name,
            "bbox": xyxy,
            "confidence": round(conf, 4),
        })
    return detections


def run_baseline(
    image_dir: Path,
    output_dir: Path,
    model_name: str = "yolov8m.pt",
    conf_threshold: float = 0.25,
) -> None:
    model = load_yolo(model_name)
    output_dir.mkdir(parents=True, exist_ok=True)

    image_paths = sorted(
        p for p in image_dir.iterdir()
        if p.suffix.lower() in (".jpg", ".jpeg", ".png")
    )

    for img_path in image_paths:
        results = model(img_path, conf=conf_threshold, verbose=False)
        detections = parse_yolo_result(results[0])

        output = {
            "image_id": img_path.stem,
            "detections": detections,
        }

        out_path = output_dir / f"{img_path.stem}.json"
        out_path.write_text(json.dumps(output, indent=2))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd Corner_Case && python -m pytest tests/test_baseline.py -v`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add Corner_Case/pipeline/baseline.py Corner_Case/tests/test_baseline.py
git commit -m "feat: stage 1 baseline YOLOv8 inference module"
```

---

## Task 3: Stage 2 — Corner Case Generation (InstructPix2Pix)

**Files:**
- Create: `Corner_Case/tests/test_generator.py`
- Create: `Corner_Case/pipeline/generator.py`

- [ ] **Step 1: Write failing tests**

```python
# Corner_Case/tests/test_generator.py
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
import yaml
from PIL import Image

from pipeline.generator import load_prompts, generate_corner_cases


class TestLoadPrompts:
    def test_loads_conditions_from_yaml(self):
        """YAML에서 프롬프트 조건 목록을 로드"""
        with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
            yaml.dump({
                "conditions": [
                    {"name": "rain", "prompt": "Make it rainy", "severity": "extreme", "category": "weather"},
                ]
            }, f)
            f.flush()

            conditions = load_prompts(Path(f.name))
            assert len(conditions) == 1
            assert conditions[0]["name"] == "rain"
            assert conditions[0]["prompt"] == "Make it rainy"

    def test_raises_on_missing_file(self):
        """존재하지 않는 파일이면 FileNotFoundError"""
        with pytest.raises(FileNotFoundError):
            load_prompts(Path("/nonexistent/prompts.yaml"))


class TestGenerateCornerCases:
    def test_generates_and_saves_image(self):
        """InstructPix2Pix로 이미지를 변환하고 저장"""
        with tempfile.TemporaryDirectory() as tmpdir:
            img_dir = Path(tmpdir) / "original"
            out_dir = Path(tmpdir) / "synthetic"
            img_dir.mkdir()

            img = Image.new("RGB", (256, 256), color="green")
            img.save(img_dir / "test_001.jpg")

            conditions = [
                {"name": "rain", "prompt": "Make it rainy", "severity": "extreme", "category": "weather"},
            ]

            fake_output = Image.new("RGB", (256, 256), color="gray")

            with patch("pipeline.generator.load_pix2pix") as mock_load:
                mock_pipe = MagicMock()
                mock_pipe.return_value.images = [fake_output]
                mock_load.return_value = mock_pipe

                generate_corner_cases(
                    image_dir=img_dir,
                    output_dir=out_dir,
                    conditions=conditions,
                    image_guidance_scale=1.5,
                    text_guidance_scale=7.5,
                    num_inference_steps=50,
                )

            result_path = out_dir / "rain" / "test_001.jpg"
            assert result_path.exists()

            saved_img = Image.open(result_path)
            assert saved_img.size == (256, 256)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd Corner_Case && python -m pytest tests/test_generator.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'pipeline.generator'`

- [ ] **Step 3: Implement generator.py**

```python
# Corner_Case/pipeline/generator.py
from pathlib import Path

import torch
import yaml
from diffusers import StableDiffusionInstructPix2PixPipeline
from PIL import Image


def load_prompts(config_path: Path) -> list[dict]:
    if not config_path.exists():
        raise FileNotFoundError(f"Config not found: {config_path}")
    with open(config_path) as f:
        config = yaml.safe_load(f)
    return config["conditions"]


def load_pix2pix(model_name: str = "timbrooks/instruct-pix2pix") -> StableDiffusionInstructPix2PixPipeline:
    pipe = StableDiffusionInstructPix2PixPipeline.from_pretrained(
        model_name,
        torch_dtype=torch.float16,
        safety_checker=None,
    )
    pipe.to("cuda")
    return pipe


def generate_corner_cases(
    image_dir: Path,
    output_dir: Path,
    conditions: list[dict],
    image_guidance_scale: float = 1.5,
    text_guidance_scale: float = 7.5,
    num_inference_steps: int = 50,
) -> None:
    pipe = load_pix2pix()

    image_paths = sorted(
        p for p in image_dir.iterdir()
        if p.suffix.lower() in (".jpg", ".jpeg", ".png")
    )

    for condition in conditions:
        cond_dir = output_dir / condition["name"]
        cond_dir.mkdir(parents=True, exist_ok=True)

        for img_path in image_paths:
            original = Image.open(img_path).convert("RGB")

            result = pipe(
                prompt=condition["prompt"],
                image=original,
                image_guidance_scale=image_guidance_scale,
                guidance_scale=text_guidance_scale,
                num_inference_steps=num_inference_steps,
            )

            generated = result.images[0]
            save_path = cond_dir / f"{img_path.stem}.jpg"
            generated.save(save_path, quality=95)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd Corner_Case && python -m pytest tests/test_generator.py -v`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add Corner_Case/pipeline/generator.py Corner_Case/tests/test_generator.py
git commit -m "feat: stage 2 InstructPix2Pix corner case generator"
```

---

## Task 4: Stage 3 — Evaluation & Metrics

**Files:**
- Create: `Corner_Case/tests/test_evaluator.py`
- Create: `Corner_Case/pipeline/evaluator.py`

- [ ] **Step 1: Write failing tests**

```python
# Corner_Case/tests/test_evaluator.py
import json
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from pipeline.evaluator import (
    compute_iou,
    match_detections,
    compute_metrics,
    run_evaluation,
)


class TestComputeIou:
    def test_perfect_overlap(self):
        """동일한 박스는 IoU 1.0"""
        iou = compute_iou([0, 0, 100, 100], [0, 0, 100, 100])
        assert iou == pytest.approx(1.0)

    def test_no_overlap(self):
        """겹치지 않는 박스는 IoU 0.0"""
        iou = compute_iou([0, 0, 50, 50], [100, 100, 200, 200])
        assert iou == pytest.approx(0.0)

    def test_partial_overlap(self):
        """부분 겹침 IoU 계산"""
        iou = compute_iou([0, 0, 100, 100], [50, 50, 150, 150])
        # intersection = 50*50 = 2500, union = 10000+10000-2500 = 17500
        assert iou == pytest.approx(2500 / 17500, abs=0.01)


class TestMatchDetections:
    def test_matches_by_iou(self):
        """IoU >= 0.5인 탐지를 1:1 매칭"""
        baseline = [
            {"class": "car", "bbox": [0, 0, 100, 100], "confidence": 0.9},
        ]
        synthetic = [
            {"class": "car", "bbox": [10, 10, 110, 110], "confidence": 0.7},
        ]

        matched, missed = match_detections(baseline, synthetic, iou_threshold=0.5)
        assert len(matched) == 1
        assert len(missed) == 0
        assert matched[0]["baseline"]["class"] == "car"
        assert matched[0]["synthetic"]["class"] == "car"
        assert matched[0]["iou"] > 0.5

    def test_unmatched_becomes_false_negative(self):
        """매칭 실패한 baseline 탐지는 FN"""
        baseline = [
            {"class": "person", "bbox": [0, 0, 50, 100], "confidence": 0.85},
        ]
        synthetic = []

        matched, missed = match_detections(baseline, synthetic, iou_threshold=0.5)
        assert len(matched) == 0
        assert len(missed) == 1
        assert missed[0]["class"] == "person"


class TestComputeMetrics:
    def test_computes_all_metrics(self):
        """IoU drop, conf drop, FN rate, class flip rate 계산"""
        matched = [
            {
                "baseline": {"class": "car", "bbox": [0, 0, 100, 100], "confidence": 0.92},
                "synthetic": {"class": "car", "bbox": [10, 10, 110, 110], "confidence": 0.60},
                "iou": 0.68,
            },
        ]
        missed = [
            {"class": "person", "bbox": [200, 200, 250, 350], "confidence": 0.88},
        ]

        metrics = compute_metrics(matched, missed)

        assert metrics["avg_iou"] == pytest.approx(0.68, abs=0.01)
        assert metrics["avg_confidence_drop"] == pytest.approx(0.32, abs=0.01)
        assert metrics["false_negative_rate"] == pytest.approx(0.5, abs=0.01)
        assert metrics["class_flip_rate"] == pytest.approx(0.0)
        assert metrics["total_baseline"] == 2
        assert metrics["total_missed"] == 1

    def test_class_flip_detected(self):
        """같은 객체가 다른 클래스로 분류되면 class flip"""
        matched = [
            {
                "baseline": {"class": "car", "bbox": [0, 0, 100, 100], "confidence": 0.9},
                "synthetic": {"class": "truck", "bbox": [5, 5, 105, 105], "confidence": 0.6},
                "iou": 0.82,
            },
        ]
        missed = []

        metrics = compute_metrics(matched, missed)
        assert metrics["class_flip_rate"] == pytest.approx(1.0)


class TestRunEvaluation:
    def test_saves_metrics_json(self):
        """평가 결과를 JSON 파일로 저장"""
        with tempfile.TemporaryDirectory() as tmpdir:
            baseline_dir = Path(tmpdir) / "results" / "baseline"
            synthetic_img_dir = Path(tmpdir) / "synthetic" / "rain"
            synthetic_result_dir = Path(tmpdir) / "results" / "synthetic" / "rain"
            metrics_dir = Path(tmpdir) / "results" / "metrics" / "rain"
            baseline_dir.mkdir(parents=True)
            synthetic_img_dir.mkdir(parents=True)

            # baseline result
            baseline_data = {
                "image_id": "test_001",
                "detections": [
                    {"class": "car", "bbox": [0, 0, 100, 100], "confidence": 0.91},
                ],
            }
            (baseline_dir / "test_001.json").write_text(json.dumps(baseline_data))

            # synthetic result (from re-inference)
            synthetic_data = {
                "image_id": "test_001",
                "detections": [
                    {"class": "car", "bbox": [10, 10, 110, 110], "confidence": 0.55},
                ],
            }

            with patch("pipeline.evaluator.run_inference_on_image", return_value=synthetic_data["detections"]):
                run_evaluation(
                    condition_name="rain",
                    baseline_dir=baseline_dir,
                    synthetic_img_dir=synthetic_img_dir,
                    synthetic_result_dir=synthetic_result_dir,
                    metrics_dir=metrics_dir,
                    model_name="yolov8m.pt",
                    conf_threshold=0.25,
                )

            metrics_path = metrics_dir / "test_001.json"
            assert metrics_path.exists()

            data = json.loads(metrics_path.read_text())
            assert "avg_iou" in data
            assert "avg_confidence_drop" in data
            assert "false_negative_rate" in data
            assert "class_flip_rate" in data
            assert data["condition"] == "rain"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd Corner_Case && python -m pytest tests/test_evaluator.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'pipeline.evaluator'`

- [ ] **Step 3: Implement evaluator.py**

```python
# Corner_Case/pipeline/evaluator.py
import json
from pathlib import Path

import numpy as np
from scipy.optimize import linear_sum_assignment

from pipeline.baseline import load_yolo, parse_yolo_result


def compute_iou(box_a: list[float], box_b: list[float]) -> float:
    x1 = max(box_a[0], box_b[0])
    y1 = max(box_a[1], box_b[1])
    x2 = min(box_a[2], box_b[2])
    y2 = min(box_a[3], box_b[3])

    intersection = max(0, x2 - x1) * max(0, y2 - y1)
    area_a = (box_a[2] - box_a[0]) * (box_a[3] - box_a[1])
    area_b = (box_b[2] - box_b[0]) * (box_b[3] - box_b[1])
    union = area_a + area_b - intersection

    if union == 0:
        return 0.0
    return intersection / union


def match_detections(
    baseline: list[dict],
    synthetic: list[dict],
    iou_threshold: float = 0.5,
) -> tuple[list[dict], list[dict]]:
    if not baseline:
        return [], []
    if not synthetic:
        return [], list(baseline)

    n_base = len(baseline)
    n_synth = len(synthetic)
    cost_matrix = np.zeros((n_base, n_synth))

    for i, b in enumerate(baseline):
        for j, s in enumerate(synthetic):
            iou = compute_iou(b["bbox"], s["bbox"])
            cost_matrix[i, j] = -iou  # negative for minimization

    row_idx, col_idx = linear_sum_assignment(cost_matrix)

    matched = []
    matched_base_indices = set()

    for r, c in zip(row_idx, col_idx):
        iou = -cost_matrix[r, c]
        if iou >= iou_threshold:
            matched.append({
                "baseline": baseline[r],
                "synthetic": synthetic[c],
                "iou": round(iou, 4),
            })
            matched_base_indices.add(r)

    missed = [baseline[i] for i in range(n_base) if i not in matched_base_indices]
    return matched, missed


def compute_metrics(matched: list[dict], missed: list[dict]) -> dict:
    total_baseline = len(matched) + len(missed)

    if not matched and not missed:
        return {
            "avg_iou": 0.0,
            "avg_confidence_drop": 0.0,
            "false_negative_rate": 0.0,
            "class_flip_rate": 0.0,
            "total_baseline": 0,
            "total_matched": 0,
            "total_missed": 0,
        }

    avg_iou = np.mean([m["iou"] for m in matched]).item() if matched else 0.0
    avg_conf_drop = (
        np.mean([m["baseline"]["confidence"] - m["synthetic"]["confidence"] for m in matched]).item()
        if matched else 0.0
    )
    fn_rate = len(missed) / total_baseline if total_baseline > 0 else 0.0
    class_flips = sum(1 for m in matched if m["baseline"]["class"] != m["synthetic"]["class"])
    class_flip_rate = class_flips / len(matched) if matched else 0.0

    return {
        "avg_iou": round(avg_iou, 4),
        "avg_confidence_drop": round(avg_conf_drop, 4),
        "false_negative_rate": round(fn_rate, 4),
        "class_flip_rate": round(class_flip_rate, 4),
        "total_baseline": total_baseline,
        "total_matched": len(matched),
        "total_missed": len(missed),
    }


def run_inference_on_image(model, img_path: Path, conf_threshold: float) -> list[dict]:
    results = model(img_path, conf=conf_threshold, verbose=False)
    return parse_yolo_result(results[0])


def run_evaluation(
    condition_name: str,
    baseline_dir: Path,
    synthetic_img_dir: Path,
    synthetic_result_dir: Path,
    metrics_dir: Path,
    model_name: str = "yolov8m.pt",
    conf_threshold: float = 0.25,
) -> None:
    model = load_yolo(model_name)
    synthetic_result_dir.mkdir(parents=True, exist_ok=True)
    metrics_dir.mkdir(parents=True, exist_ok=True)

    for baseline_json in sorted(baseline_dir.glob("*.json")):
        image_id = baseline_json.stem
        baseline_data = json.loads(baseline_json.read_text())

        # Find synthetic image
        synth_img = None
        for ext in (".jpg", ".jpeg", ".png"):
            candidate = synthetic_img_dir / f"{image_id}{ext}"
            if candidate.exists():
                synth_img = candidate
                break

        if synth_img is None:
            continue

        # Re-inference on synthetic
        synth_detections = run_inference_on_image(model, synth_img, conf_threshold)
        synth_result = {"image_id": image_id, "detections": synth_detections}
        (synthetic_result_dir / f"{image_id}.json").write_text(json.dumps(synth_result, indent=2))

        # Compare
        matched, missed = match_detections(baseline_data["detections"], synth_detections)
        metrics = compute_metrics(matched, missed)
        metrics["image_id"] = image_id
        metrics["condition"] = condition_name
        metrics["matched_details"] = matched
        metrics["missed_details"] = [
            {"class": m["class"], "bbox": m["bbox"], "confidence": m["confidence"]}
            for m in missed
        ]

        (metrics_dir / f"{image_id}.json").write_text(json.dumps(metrics, indent=2))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd Corner_Case && python -m pytest tests/test_evaluator.py -v`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add Corner_Case/pipeline/evaluator.py Corner_Case/tests/test_evaluator.py
git commit -m "feat: stage 3 evaluation with IoU matching and metrics"
```

---

## Task 5: Pipeline Orchestrator (CLI)

**Files:**
- Create: `Corner_Case/pipeline/run_pipeline.py`

- [ ] **Step 1: Implement run_pipeline.py**

```python
# Corner_Case/pipeline/run_pipeline.py
import argparse
from pathlib import Path

import yaml

from pipeline.baseline import run_baseline
from pipeline.generator import generate_corner_cases, load_prompts
from pipeline.evaluator import run_evaluation


def main():
    parser = argparse.ArgumentParser(description="Corner Case Stress Test Pipeline")
    parser.add_argument("--data-dir", type=Path, default=Path("data"), help="Base data directory")
    parser.add_argument("--config", type=Path, default=Path("configs/prompts.yaml"), help="Prompts config")
    parser.add_argument("--stage", choices=["all", "baseline", "generate", "evaluate"], default="all")
    args = parser.parse_args()

    config_path = args.config
    with open(config_path) as f:
        config = yaml.safe_load(f)

    conditions = config["conditions"]
    model_cfg = config["model"]
    yolo_cfg = config["yolo"]

    image_dir = args.data_dir / "original"
    baseline_dir = args.data_dir / "results" / "baseline"
    synthetic_dir = args.data_dir / "synthetic"

    if args.stage in ("all", "baseline"):
        print("=== Stage 1: Baseline Inference ===")
        run_baseline(
            image_dir=image_dir,
            output_dir=baseline_dir,
            model_name=yolo_cfg["model"],
            conf_threshold=yolo_cfg["confidence_threshold"],
        )
        print(f"Baseline results saved to {baseline_dir}")

    if args.stage in ("all", "generate"):
        print("=== Stage 2: Corner Case Generation ===")
        generate_corner_cases(
            image_dir=image_dir,
            output_dir=synthetic_dir,
            conditions=conditions,
            image_guidance_scale=model_cfg["image_guidance_scale"],
            text_guidance_scale=model_cfg["text_guidance_scale"],
            num_inference_steps=model_cfg["num_inference_steps"],
        )
        print(f"Synthetic images saved to {synthetic_dir}")

    if args.stage in ("all", "evaluate"):
        print("=== Stage 3: Evaluation ===")
        for condition in conditions:
            cond_name = condition["name"]
            print(f"  Evaluating condition: {cond_name}")
            run_evaluation(
                condition_name=cond_name,
                baseline_dir=baseline_dir,
                synthetic_img_dir=synthetic_dir / cond_name,
                synthetic_result_dir=args.data_dir / "results" / "synthetic" / cond_name,
                metrics_dir=args.data_dir / "results" / "metrics" / cond_name,
                model_name=yolo_cfg["model"],
                conf_threshold=yolo_cfg["confidence_threshold"],
            )
        print("Evaluation complete.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Test CLI help works**

Run: `cd Corner_Case && python -m pipeline.run_pipeline --help`
Expected: Shows argument help (--data-dir, --config, --stage)

- [ ] **Step 3: Commit**

```bash
git add Corner_Case/pipeline/run_pipeline.py
git commit -m "feat: pipeline CLI orchestrator with stage selection"
```

---

## Task 6: FastAPI Backend

**Files:**
- Create: `Corner_Case/backend/__init__.py`
- Create: `Corner_Case/backend/main.py`

- [ ] **Step 1: Create backend __init__.py**

```python
# Corner_Case/backend/__init__.py
# empty
```

- [ ] **Step 2: Implement FastAPI backend**

```python
# Corner_Case/backend/main.py
import json
from pathlib import Path

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

app = FastAPI(title="Corner Case Stress Test API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent.parent / "data"


@app.get("/api/summary")
def get_summary():
    metrics_root = DATA_DIR / "results" / "metrics"
    if not metrics_root.exists():
        return {"conditions": [], "total_images": 0}

    summary = {}
    for cond_dir in sorted(metrics_root.iterdir()):
        if not cond_dir.is_dir():
            continue
        cond_name = cond_dir.name
        metrics_files = list(cond_dir.glob("*.json"))

        if not metrics_files:
            continue

        all_metrics = [json.loads(f.read_text()) for f in metrics_files]

        n = len(all_metrics)
        avg_iou = sum(m["avg_iou"] for m in all_metrics) / n
        avg_conf_drop = sum(m["avg_confidence_drop"] for m in all_metrics) / n
        avg_fn_rate = sum(m["false_negative_rate"] for m in all_metrics) / n
        avg_class_flip = sum(m["class_flip_rate"] for m in all_metrics) / n

        summary[cond_name] = {
            "condition": cond_name,
            "num_images": n,
            "avg_iou": round(avg_iou, 4),
            "avg_confidence_drop": round(avg_conf_drop, 4),
            "avg_false_negative_rate": round(avg_fn_rate, 4),
            "avg_class_flip_rate": round(avg_class_flip, 4),
        }

    # Find worst condition
    worst = max(summary.values(), key=lambda x: x["avg_confidence_drop"]) if summary else None

    return {
        "conditions": list(summary.values()),
        "total_images": sum(s["num_images"] for s in summary.values()),
        "worst_condition": worst["condition"] if worst else None,
        "worst_conf_drop": worst["avg_confidence_drop"] if worst else 0,
    }


@app.get("/api/results")
def get_results(
    condition: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    metrics_root = DATA_DIR / "results" / "metrics"
    if not metrics_root.exists():
        return {"results": [], "total": 0, "page": page}

    all_results = []
    target_dirs = [metrics_root / condition] if condition else sorted(metrics_root.iterdir())

    for cond_dir in target_dirs:
        if not cond_dir.is_dir():
            continue
        for f in sorted(cond_dir.glob("*.json")):
            data = json.loads(f.read_text())
            all_results.append(data)

    total = len(all_results)
    start = (page - 1) * per_page
    end = start + per_page

    return {
        "results": all_results[start:end],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@app.get("/api/results/{image_id}")
def get_result_detail(image_id: str, condition: str = Query(...)):
    metrics_path = DATA_DIR / "results" / "metrics" / condition / f"{image_id}.json"
    baseline_path = DATA_DIR / "results" / "baseline" / f"{image_id}.json"

    if not metrics_path.exists():
        return {"error": "Not found"}

    metrics = json.loads(metrics_path.read_text())
    baseline = json.loads(baseline_path.read_text()) if baseline_path.exists() else None

    return {
        "metrics": metrics,
        "baseline": baseline,
    }


@app.get("/api/images/{path:path}")
def serve_image(path: str):
    file_path = DATA_DIR / path
    if not file_path.exists() or not file_path.is_file():
        return {"error": "Image not found"}
    return FileResponse(file_path)
```

- [ ] **Step 3: Test server starts**

Run: `cd Corner_Case && python -c "from backend.main import app; print('FastAPI app created:', app.title)"`
Expected: `FastAPI app created: Corner Case Stress Test API`

- [ ] **Step 4: Commit**

```bash
git add Corner_Case/backend/__init__.py Corner_Case/backend/main.py
git commit -m "feat: FastAPI backend with summary, results, and image endpoints"
```

---

## Task 7: Next.js Frontend — Project Setup

**Files:**
- Create: `Corner_Case/frontend/` (via create-next-app)

- [ ] **Step 1: Create Next.js project**

Run:
```bash
cd Corner_Case && npx create-next-app@latest frontend \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --no-turbopack
```

- [ ] **Step 2: Install additional dependencies**

Run:
```bash
cd Corner_Case/frontend && npm install recharts
```

- [ ] **Step 3: Configure next.config.ts for API proxy**

```typescript
// Corner_Case/frontend/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 4: Commit**

```bash
git add Corner_Case/frontend/
git commit -m "feat: next.js frontend scaffold with tailwind and recharts"
```

---

## Task 8: Frontend — Layout & Navigation

**Files:**
- Modify: `Corner_Case/frontend/src/app/layout.tsx`
- Modify: `Corner_Case/frontend/src/app/globals.css`

- [ ] **Step 1: Update globals.css for dark theme**

```css
/* Corner_Case/frontend/src/app/globals.css */
@import "tailwindcss";

:root {
  --background: #0f172a;
  --foreground: #e2e8f0;
  --card: #1e293b;
  --card-border: #334155;
  --muted: #94a3b8;
  --danger: #ef4444;
  --warning: #f59e0b;
  --success: #22c55e;
  --primary: #3b82f6;
}

body {
  background: var(--background);
  color: var(--foreground);
}
```

- [ ] **Step 2: Update layout.tsx with navigation**

```tsx
// Corner_Case/frontend/src/app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Corner Case Analyzer",
  description: "Autonomous driving model stress test dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <nav className="bg-[var(--card)] border-b border-[var(--card-border)] px-6 py-3 flex items-center justify-between">
          <span className="font-bold text-lg">Corner Case Analyzer</span>
          <div className="flex gap-6 text-sm text-[var(--muted)]">
            <Link href="/" className="hover:text-white transition-colors">Overview</Link>
            <Link href="/compare" className="hover:text-white transition-colors">Compare</Link>
            <Link href="/gallery" className="hover:text-white transition-colors">Gallery</Link>
          </div>
        </nav>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add Corner_Case/frontend/src/app/layout.tsx Corner_Case/frontend/src/app/globals.css
git commit -m "feat: dark theme layout with navigation"
```

---

## Task 9: Frontend — Summary Cards & Condition Chart Components

**Files:**
- Create: `Corner_Case/frontend/src/app/components/SummaryCards.tsx`
- Create: `Corner_Case/frontend/src/app/components/ConditionChart.tsx`

- [ ] **Step 1: Create SummaryCards component**

```tsx
// Corner_Case/frontend/src/app/components/SummaryCards.tsx
"use client";

interface SummaryData {
  total_images: number;
  worst_condition: string | null;
  worst_conf_drop: number;
  conditions: {
    condition: string;
    avg_confidence_drop: number;
    avg_false_negative_rate: number;
  }[];
}

export default function SummaryCards({ data }: { data: SummaryData }) {
  const avgConfDrop =
    data.conditions.length > 0
      ? data.conditions.reduce((s, c) => s + c.avg_confidence_drop, 0) / data.conditions.length
      : 0;
  const avgFnRate =
    data.conditions.length > 0
      ? data.conditions.reduce((s, c) => s + c.avg_false_negative_rate, 0) / data.conditions.length
      : 0;

  const cards = [
    { label: "Total Images", value: data.total_images.toString(), color: "text-white" },
    { label: "Avg Conf Drop", value: `${(avgConfDrop * 100).toFixed(1)}%`, color: "text-red-400" },
    { label: "Avg FN Rate", value: `${(avgFnRate * 100).toFixed(1)}%`, color: "text-yellow-400" },
    { label: "Worst Condition", value: data.worst_condition ?? "N/A", color: "text-orange-400" },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-[var(--card)] rounded-lg p-4 text-center">
          <div className="text-xs uppercase text-[var(--muted)]">{card.label}</div>
          <div className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create ConditionChart component**

```tsx
// Corner_Case/frontend/src/app/components/ConditionChart.tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ConditionData {
  condition: string;
  avg_confidence_drop: number;
}

export default function ConditionChart({ conditions }: { conditions: ConditionData[] }) {
  const sorted = [...conditions].sort((a, b) => b.avg_confidence_drop - a.avg_confidence_drop);

  const chartData = sorted.map((c) => ({
    name: c.condition.replace(/_/g, " "),
    drop: Math.round(c.avg_confidence_drop * 100),
  }));

  const getColor = (drop: number) => {
    if (drop >= 40) return "#ef4444";
    if (drop >= 25) return "#f59e0b";
    return "#22c55e";
  };

  return (
    <div className="bg-[var(--card)] rounded-lg p-4">
      <h3 className="text-sm font-bold mb-4">Performance Drop by Condition (%)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
          <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} width={80} />
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
            labelStyle={{ color: "#e2e8f0" }}
            formatter={(value: number) => [`${value}%`, "Conf Drop"]}
          />
          <Bar dataKey="drop" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={getColor(entry.drop)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add Corner_Case/frontend/src/app/components/
git commit -m "feat: SummaryCards and ConditionChart components"
```

---

## Task 10: Frontend — Overview Page

**Files:**
- Modify: `Corner_Case/frontend/src/app/page.tsx`

- [ ] **Step 1: Implement Overview page**

```tsx
// Corner_Case/frontend/src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import SummaryCards from "./components/SummaryCards";
import ConditionChart from "./components/ConditionChart";

interface SummaryResponse {
  total_images: number;
  worst_condition: string | null;
  worst_conf_drop: number;
  conditions: {
    condition: string;
    num_images: number;
    avg_iou: number;
    avg_confidence_drop: number;
    avg_false_negative_rate: number;
    avg_class_flip_rate: number;
  }[];
}

export default function OverviewPage() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/summary")
      .then((res) => res.json())
      .then(setSummary)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-400">Error: {error}</p>;
  if (!summary) return <p className="text-[var(--muted)]">Loading...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Overview</h1>
      <SummaryCards data={summary} />
      <ConditionChart conditions={summary.conditions} />

      {summary.worst_conf_drop > 0.3 && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
          <div className="text-red-400 font-bold text-sm">WARNING</div>
          <p className="text-red-300 text-sm mt-1">
            Model shows <strong>{(summary.worst_conf_drop * 100).toFixed(1)}% confidence drop</strong> under{" "}
            <strong>{summary.worst_condition?.replace(/_/g, " ")}</strong> conditions. Safety-critical threshold
            exceeded.
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify dev server runs**

Run: `cd Corner_Case/frontend && npm run dev`
Expected: Server starts on http://localhost:3000, Overview page renders

- [ ] **Step 3: Commit**

```bash
git add Corner_Case/frontend/src/app/page.tsx
git commit -m "feat: overview page with summary cards, chart, and warning"
```

---

## Task 11: Frontend — Image Compare Components

**Files:**
- Create: `Corner_Case/frontend/src/app/components/ImageCompare.tsx`
- Create: `Corner_Case/frontend/src/app/components/MetricsTable.tsx`

- [ ] **Step 1: Create ImageCompare component**

```tsx
// Corner_Case/frontend/src/app/components/ImageCompare.tsx
"use client";

interface ImageCompareProps {
  imageId: string;
  condition: string;
}

export default function ImageCompare({ imageId, condition }: ImageCompareProps) {
  const originalSrc = `/api/images/original/${imageId}.jpg`;
  const syntheticSrc = `/api/images/synthetic/${condition}/${imageId}.jpg`;

  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <div className="text-xs text-center text-blue-400 mb-2 uppercase">Original</div>
        <div className="bg-[var(--card)] rounded-lg overflow-hidden">
          <img src={originalSrc} alt="Original" className="w-full h-auto" />
        </div>
      </div>
      <div className="flex-1">
        <div className="text-xs text-center text-red-400 mb-2 uppercase">
          Synthetic ({condition.replace(/_/g, " ")})
        </div>
        <div className="bg-[var(--card)] rounded-lg overflow-hidden">
          <img src={syntheticSrc} alt="Synthetic" className="w-full h-auto" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create MetricsTable component**

```tsx
// Corner_Case/frontend/src/app/components/MetricsTable.tsx
"use client";

interface MatchDetail {
  baseline: { class: string; confidence: number };
  synthetic: { class: string; confidence: number };
  iou: number;
}

interface MissedDetail {
  class: string;
  confidence: number;
}

interface MetricsTableProps {
  matched: MatchDetail[];
  missed: MissedDetail[];
}

export default function MetricsTable({ matched, missed }: MetricsTableProps) {
  return (
    <div className="bg-[#0f172a] rounded-lg p-4 text-sm">
      <div className="grid grid-cols-5 gap-2 text-[var(--muted)] font-bold text-xs mb-2">
        <span>Object</span>
        <span>IoU</span>
        <span>Conf Drop</span>
        <span>Class</span>
        <span>Status</span>
      </div>
      {matched.map((m, i) => (
        <div key={`m-${i}`} className="grid grid-cols-5 gap-2 mb-1">
          <span>{m.baseline.class}</span>
          <span>{m.iou.toFixed(2)}</span>
          <span className="text-yellow-400">
            -{(m.baseline.confidence - m.synthetic.confidence).toFixed(2)}
          </span>
          <span className={m.baseline.class !== m.synthetic.class ? "text-orange-400" : ""}>
            {m.baseline.class !== m.synthetic.class ? `→ ${m.synthetic.class}` : "OK"}
          </span>
          <span className="text-green-400">Detected</span>
        </div>
      ))}
      {missed.map((m, i) => (
        <div key={`f-${i}`} className="grid grid-cols-5 gap-2 mb-1">
          <span>{m.class}</span>
          <span>-</span>
          <span>-</span>
          <span>-</span>
          <span className="text-red-400">MISSED</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add Corner_Case/frontend/src/app/components/ImageCompare.tsx \
  Corner_Case/frontend/src/app/components/MetricsTable.tsx
git commit -m "feat: ImageCompare and MetricsTable components"
```

---

## Task 12: Frontend — Compare Page

**Files:**
- Create: `Corner_Case/frontend/src/app/compare/page.tsx`

- [ ] **Step 1: Implement Compare page**

```tsx
// Corner_Case/frontend/src/app/compare/page.tsx
"use client";

import { useEffect, useState } from "react";
import ImageCompare from "../components/ImageCompare";
import MetricsTable from "../components/MetricsTable";

interface ResultItem {
  image_id: string;
  condition: string;
  avg_iou: number;
  avg_confidence_drop: number;
  false_negative_rate: number;
  matched_details: {
    baseline: { class: string; confidence: number };
    synthetic: { class: string; confidence: number };
    iou: number;
  }[];
  missed_details: { class: string; confidence: number }[];
}

export default function ComparePage() {
  const [results, setResults] = useState<ResultItem[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [selectedCondition, setSelectedCondition] = useState<string>("");
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    fetch("/api/summary")
      .then((res) => res.json())
      .then((data) => {
        const conds = data.conditions?.map((c: { condition: string }) => c.condition) ?? [];
        setConditions(conds);
        if (conds.length > 0) setSelectedCondition(conds[0]);
      });
  }, []);

  useEffect(() => {
    if (!selectedCondition) return;
    fetch(`/api/results?condition=${selectedCondition}`)
      .then((res) => res.json())
      .then((data) => {
        setResults(data.results ?? []);
        setSelectedIdx(0);
      });
  }, [selectedCondition]);

  const current = results[selectedIdx];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">Compare</h1>
        <select
          value={selectedCondition}
          onChange={(e) => setSelectedCondition(e.target.value)}
          className="bg-[var(--card)] border border-[var(--card-border)] rounded px-3 py-1 text-sm"
        >
          {conditions.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setSelectedIdx(Math.max(0, selectedIdx - 1))}
            disabled={selectedIdx === 0}
            className="bg-[var(--card)] px-3 py-1 rounded text-sm disabled:opacity-30"
          >
            Prev
          </button>
          <span className="text-sm text-[var(--muted)]">
            {results.length > 0 ? `${selectedIdx + 1} / ${results.length}` : "0 / 0"}
          </span>
          <button
            onClick={() => setSelectedIdx(Math.min(results.length - 1, selectedIdx + 1))}
            disabled={selectedIdx >= results.length - 1}
            className="bg-[var(--card)] px-3 py-1 rounded text-sm disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </div>

      {current && (
        <>
          <ImageCompare imageId={current.image_id} condition={current.condition} />
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-[var(--card)] rounded-lg p-3">
              <div className="text-xs text-[var(--muted)]">Avg IoU</div>
              <div className="text-lg font-bold">{current.avg_iou.toFixed(2)}</div>
            </div>
            <div className="bg-[var(--card)] rounded-lg p-3">
              <div className="text-xs text-[var(--muted)]">Conf Drop</div>
              <div className="text-lg font-bold text-red-400">
                -{(current.avg_confidence_drop * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-[var(--card)] rounded-lg p-3">
              <div className="text-xs text-[var(--muted)]">FN Rate</div>
              <div className="text-lg font-bold text-yellow-400">
                {(current.false_negative_rate * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          <MetricsTable matched={current.matched_details} missed={current.missed_details} />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Corner_Case/frontend/src/app/compare/
git commit -m "feat: compare page with image side-by-side and per-object metrics"
```

---

## Task 13: Frontend — Gallery Page

**Files:**
- Create: `Corner_Case/frontend/src/app/gallery/page.tsx`

- [ ] **Step 1: Implement Gallery page**

```tsx
// Corner_Case/frontend/src/app/gallery/page.tsx
"use client";

import { useEffect, useState } from "react";

interface GalleryItem {
  image_id: string;
  condition: string;
  avg_confidence_drop: number;
  false_negative_rate: number;
  total_missed: number;
  total_baseline: number;
}

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"conf_drop" | "fn_rate">("conf_drop");

  useEffect(() => {
    fetch("/api/summary")
      .then((res) => res.json())
      .then((data) => {
        const conds = data.conditions?.map((c: { condition: string }) => c.condition) ?? [];
        setConditions(conds);
      });
  }, []);

  useEffect(() => {
    const url = filter === "all" ? "/api/results?per_page=100" : `/api/results?condition=${filter}&per_page=100`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => setItems(data.results ?? []));
  }, [filter]);

  const sorted = [...items].sort((a, b) =>
    sortBy === "conf_drop"
      ? b.avg_confidence_drop - a.avg_confidence_drop
      : b.false_negative_rate - a.false_negative_rate
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">Gallery</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-[var(--card)] border border-[var(--card-border)] rounded px-3 py-1 text-sm"
        >
          <option value="all">All Conditions</option>
          {conditions.map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "conf_drop" | "fn_rate")}
          className="bg-[var(--card)] border border-[var(--card-border)] rounded px-3 py-1 text-sm"
        >
          <option value="conf_drop">Sort: Worst Conf Drop</option>
          <option value="fn_rate">Sort: Worst FN Rate</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {sorted.map((item) => (
          <div
            key={`${item.condition}-${item.image_id}`}
            className="bg-[var(--card)] rounded-lg overflow-hidden"
          >
            <div className="relative">
              <img
                src={`/api/images/synthetic/${item.condition}/${item.image_id}.jpg`}
                alt={`${item.condition} ${item.image_id}`}
                className="w-full h-40 object-cover"
              />
              <span className="absolute top-2 left-2 bg-black/70 text-xs px-2 py-1 rounded">
                {item.condition.replace(/_/g, " ")}
              </span>
            </div>
            <div className="p-3 text-xs">
              <div className="flex justify-between mb-1">
                <span className="text-[var(--muted)]">{item.image_id}</span>
                <span className="text-red-400 font-bold">
                  -{(item.avg_confidence_drop * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">
                  Missed: {item.total_missed}/{item.total_baseline}
                </span>
                <span className={item.false_negative_rate > 0.3 ? "text-red-400" : "text-yellow-400"}>
                  FN {(item.false_negative_rate * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add Corner_Case/frontend/src/app/gallery/
git commit -m "feat: gallery page with filtering and worst-case sorting"
```

---

## Task 14: README & Final Integration

**Files:**
- Create: `Corner_Case/README.md`

- [ ] **Step 1: Create README**

```markdown
# Corner Case Auto-Generation & Stress Test Pipeline

자율주행 환경에서 생성형 AI(InstructPix2Pix)를 활용하여 코너 케이스(악천후, 역광 등)를 자동 생성하고,
YOLOv8 객체 인식 모델의 취약점을 정량적으로 분석하는 파이프라인.

## Quick Start

### 1. Install Dependencies

```bash
cd Corner_Case
pip install -r requirements.txt
```

### 2. Prepare Data

BDD100K clear weather 이미지를 `data/original/`에 배치합니다.

### 3. Run Pipeline

```bash
# 전체 파이프라인 실행
python -m pipeline.run_pipeline --stage all

# 단계별 실행
python -m pipeline.run_pipeline --stage baseline
python -m pipeline.run_pipeline --stage generate
python -m pipeline.run_pipeline --stage evaluate
```

### 4. Start Dashboard

```bash
# Backend
cd Corner_Case && uvicorn backend.main:app --reload --port 8000

# Frontend (별도 터미널)
cd Corner_Case/frontend && npm run dev
```

http://localhost:3000 에서 대시보드 확인.

## Architecture

```
Stage 1 (Baseline) → Stage 2 (Generation) → Stage 3 (Evaluation) → Stage 4 (Dashboard)
YOLOv8 inference     InstructPix2Pix         Re-inference + Metrics   Next.js + FastAPI
```

## Metrics

| Metric | Description |
|--------|-------------|
| IoU Drop | 바운딩 박스 정확도 하락 |
| Confidence Drop | 모델 확신도 하락 |
| False Negative Rate | 객체 미탐지 비율 |
| Class Flip Rate | 오분류 비율 |

## Tech Stack

Python 3.12 | YOLOv8 | InstructPix2Pix | FastAPI | Next.js | Tailwind CSS
```

- [ ] **Step 2: Run full test suite**

Run: `cd Corner_Case && python -m pytest tests/ -v`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add Corner_Case/README.md
git commit -m "docs: README with quick start guide and architecture overview"
```
