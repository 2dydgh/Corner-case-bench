import json
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest
from PIL import Image

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

            # create a dummy synthetic image so run_evaluation can find it
            dummy_img = Image.new("RGB", (640, 480), color=(128, 128, 128))
            dummy_img.save(synthetic_img_dir / "test_001.jpg")

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
