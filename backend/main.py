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
