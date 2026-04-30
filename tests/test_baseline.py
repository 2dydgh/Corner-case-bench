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
