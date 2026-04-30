import json
from pathlib import Path

from PIL import Image
from ultralytics import YOLO


def load_yolo(model_name: str) -> YOLO:
    return YOLO(model_name)


def parse_yolo_result(result, task: str = "detect") -> list[dict]:
    detections = []
    masks = result.masks if task == "segment" and result.masks is not None else None

    for i, box in enumerate(result.boxes):
        xyxy = [float(x) for x in box.xyxy.cpu().numpy()[0]]
        conf = float(box.conf.cpu().numpy()[0])
        cls_id = int(box.cls.cpu().numpy()[0])
        cls_name = result.names[cls_id]
        det = {
            "class": cls_name,
            "bbox": xyxy,
            "confidence": round(conf, 4),
        }
        if masks is not None:
            det["mask"] = masks.data[i].cpu().numpy().tolist()
        detections.append(det)
    return detections


def run_baseline(
    image_dir: Path,
    output_dir: Path,
    model_name: str = "yolov8m.pt",
    conf_threshold: float = 0.25,
    limit: int = 0,
    task: str = "detect",
) -> None:
    model = load_yolo(model_name)
    output_dir.mkdir(parents=True, exist_ok=True)

    image_paths = sorted(
        p for p in image_dir.rglob("*")
        if p.suffix.lower() in (".jpg", ".jpeg", ".png") and p.is_file()
    )
    if limit > 0:
        image_paths = image_paths[:limit]

    for img_path in image_paths:
        results = model(img_path, conf=conf_threshold, verbose=False)
        detections = parse_yolo_result(results[0], task=task)

        output = {
            "image_id": img_path.stem,
            "task": task,
            "detections": detections,
        }

        out_path = output_dir / f"{img_path.stem}.json"
        out_path.write_text(json.dumps(output, indent=2))
