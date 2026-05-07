import json
from pathlib import Path

import numpy as np
from scipy.optimize import linear_sum_assignment

from pipeline.baseline import load_yolo, parse_yolo_result


def compute_mask_iou(mask_a: np.ndarray, mask_b: np.ndarray) -> float:
    intersection = np.logical_and(mask_a, mask_b).sum()
    union = np.logical_or(mask_a, mask_b).sum()
    if union == 0:
        return 0.0
    return float(intersection / union)


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
    task: str = "detect",
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
            if task == "segment" and "mask" in b and "mask" in s:
                iou = compute_mask_iou(
                    np.array(b["mask"]) > 0.5,
                    np.array(s["mask"]) > 0.5,
                )
            else:
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


def run_inference_on_image(model, img_path: Path, conf_threshold: float, task: str = "detect") -> list[dict]:
    results = model(img_path, conf=conf_threshold, verbose=False)
    return parse_yolo_result(results[0], task=task)


def run_evaluation(
    condition_name: str,
    baseline_dir: Path,
    synthetic_img_dir: Path,
    synthetic_result_dir: Path,
    metrics_dir: Path,
    model_name: str = "yolov8m.pt",
    conf_threshold: float = 0.25,
    task: str = "detect",
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
        synth_detections = run_inference_on_image(model, synth_img, conf_threshold, task=task)
        synth_result = {"image_id": image_id, "task": task, "detections": synth_detections}
        (synthetic_result_dir / f"{image_id}.json").write_text(json.dumps(synth_result, indent=2))

        # Compare
        matched, missed = match_detections(baseline_data["detections"], synth_detections, task=task)
        metrics = compute_metrics(matched, missed)
        metrics["image_id"] = image_id
        metrics["condition"] = condition_name
        metrics["task"] = task
        metrics["matched_details"] = [
            {
                "baseline": {k: v for k, v in m["baseline"].items() if k != "mask"},
                "synthetic": {k: v for k, v in m["synthetic"].items() if k != "mask"},
                "iou": m["iou"],
            }
            for m in matched
        ]
        metrics["missed_details"] = [
            {"class": m["class"], "bbox": m["bbox"], "confidence": m["confidence"]}
            for m in missed
        ]

        (metrics_dir / f"{image_id}.json").write_text(json.dumps(metrics, indent=2))
