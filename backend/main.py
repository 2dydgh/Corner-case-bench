import json
from pathlib import Path
from typing import Literal

import cv2
import numpy as np
from PIL import Image
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

Task = Literal["seg", "det"]
TASK_DIRS: dict[Task, dict[str, str]] = {
    "seg": {"metrics": "metrics_seg", "baseline": "baseline_seg", "synthetic": "synthetic_seg"},
    "det": {"metrics": "metrics_det", "baseline": "baseline_det", "synthetic": "synthetic_det"},
}


def _dirs(task: Task) -> dict[str, Path]:
    suffix = TASK_DIRS[task]
    return {key: DATA_DIR / "results" / sub for key, sub in suffix.items()}


def _mask_to_polygons(mask_arr: list, img_w: int, img_h: int) -> list[list[list[float]]]:
    mask = np.array(mask_arr, dtype=np.uint8)
    mask_h, mask_w = mask.shape
    scale = min(mask_w / img_w, mask_h / img_h)
    pad_x = (mask_w - img_w * scale) / 2
    pad_y = (mask_h - img_h * scale) / 2

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    polygons = []
    for c in contours:
        if cv2.contourArea(c) < 20:
            continue
        eps = 0.002 * cv2.arcLength(c, True)
        simplified = cv2.approxPolyDP(c, eps, True)
        pts = [
            [round((p[0][0] - pad_x) / scale, 1), round((p[0][1] - pad_y) / scale, 1)]
            for p in simplified
        ]
        if len(pts) >= 3:
            polygons.append(pts)
    return polygons


def _strip_and_polygonize(detections: list[dict], img_w: int, img_h: int, task: Task) -> list[dict]:
    out = []
    for det in detections:
        clean = {"class": det["class"], "bbox": det["bbox"], "confidence": det["confidence"]}
        if task == "seg" and "mask" in det:
            clean["polygons"] = _mask_to_polygons(det["mask"], img_w, img_h)
        out.append(clean)
    return out


@app.get("/api/summary")
def get_summary(task: Task = Query("seg")):
    metrics_root = _dirs(task)["metrics"]
    if not metrics_root.exists():
        return {"conditions": [], "total_images": 0}

    summary = {}
    class_stats: dict[str, dict] = {}

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

        for m in all_metrics:
            for det in m.get("matched_details", []):
                cls = det["baseline"]["class"]
                if cls not in class_stats:
                    class_stats[cls] = {"total_baseline": 0, "total_missed": 0, "conf_drops": []}
                class_stats[cls]["total_baseline"] += 1
                drop = det["baseline"]["confidence"] - det["synthetic"]["confidence"]
                class_stats[cls]["conf_drops"].append(drop)
            for det in m.get("missed_details", []):
                cls = det["class"]
                if cls not in class_stats:
                    class_stats[cls] = {"total_baseline": 0, "total_missed": 0, "conf_drops": []}
                class_stats[cls]["total_baseline"] += 1
                class_stats[cls]["total_missed"] += 1

    worst = max(summary.values(), key=lambda x: x["avg_confidence_drop"]) if summary else None

    class_stats_list = [
        {
            "className": cls,
            "totalBaseline": s["total_baseline"],
            "totalMissed": s["total_missed"],
            "avgConfDrop": round(sum(s["conf_drops"]) / len(s["conf_drops"]), 4) if s["conf_drops"] else 0,
        }
        for cls, s in class_stats.items()
    ]

    return {
        "conditions": list(summary.values()),
        "total_images": sum(s["num_images"] for s in summary.values()),
        "worst_condition": worst["condition"] if worst else None,
        "worst_conf_drop": worst["avg_confidence_drop"] if worst else 0,
        "class_stats": class_stats_list,
    }


@app.get("/api/results")
def get_results(
    condition: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    task: Task = Query("seg"),
):
    metrics_root = _dirs(task)["metrics"]
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
def get_result_detail(
    image_id: str,
    condition: str = Query(...),
    task: Task = Query("seg"),
):
    dirs = _dirs(task)
    metrics_path = dirs["metrics"] / condition / f"{image_id}.json"
    baseline_path = dirs["baseline"] / f"{image_id}.json"
    synthetic_path = dirs["synthetic"] / condition / f"{image_id}.json"
    original_img = DATA_DIR / "original" / "val" / f"{image_id}.jpg"

    if not metrics_path.exists():
        return {"error": "Not found"}

    metrics = json.loads(metrics_path.read_text())

    img_w, img_h = (1280, 720)
    if original_img.exists():
        with Image.open(original_img) as im:
            img_w, img_h = im.size

    baseline = None
    if baseline_path.exists():
        raw = json.loads(baseline_path.read_text())
        baseline = {
            "image_id": raw.get("image_id"),
            "detections": _strip_and_polygonize(raw.get("detections", []), img_w, img_h, task),
        }

    synthetic = None
    if synthetic_path.exists():
        raw = json.loads(synthetic_path.read_text())
        synthetic = {
            "image_id": raw.get("image_id"),
            "detections": _strip_and_polygonize(raw.get("detections", []), img_w, img_h, task),
        }

    return {
        "metrics": metrics,
        "baseline": baseline,
        "synthetic": synthetic,
        "image_size": {"width": img_w, "height": img_h},
    }


@app.get("/api/images/{path:path}")
def serve_image(path: str):
    file_path = DATA_DIR / path
    if not file_path.exists() or not file_path.is_file():
        return {"error": "Image not found"}
    return FileResponse(file_path)
