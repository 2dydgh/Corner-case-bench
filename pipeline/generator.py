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
    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if device == "cuda" else torch.float32
    pipe = StableDiffusionInstructPix2PixPipeline.from_pretrained(
        model_name,
        torch_dtype=dtype,
        safety_checker=None,
    )
    pipe.to(device)
    return pipe


def generate_corner_cases(
    image_dir: Path,
    output_dir: Path,
    conditions: list[dict],
    image_guidance_scale: float = 1.5,
    text_guidance_scale: float = 7.5,
    num_inference_steps: int = 50,
    limit: int = 0,
) -> None:
    pipe = load_pix2pix()

    image_paths = sorted(
        p for p in image_dir.rglob("*")
        if p.suffix.lower() in (".jpg", ".jpeg", ".png") and p.is_file()
    )
    if limit > 0:
        image_paths = image_paths[:limit]

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
