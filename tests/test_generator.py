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
