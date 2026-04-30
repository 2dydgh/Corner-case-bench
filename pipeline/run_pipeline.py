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
    parser.add_argument("--split", choices=["all", "train", "val", "test"], default="val",
                        help="BDD10K split to use (default: val)")
    parser.add_argument("--limit", type=int, default=0,
                        help="Max images to process (0 = all)")
    parser.add_argument("--task", choices=["detect", "segment"], default="detect",
                        help="Task type: detect (bbox) or segment (mask)")
    args = parser.parse_args()

    config_path = args.config
    with open(config_path) as f:
        config = yaml.safe_load(f)

    conditions = config["conditions"]
    model_cfg = config["model"]
    yolo_cfg = config["yolo"]

    if args.split == "all":
        image_dir = args.data_dir / "original"
    else:
        image_dir = args.data_dir / "original" / args.split
    baseline_dir = args.data_dir / "results" / "baseline"
    synthetic_dir = args.data_dir / "synthetic"

    task = args.task
    model_name = yolo_cfg["model"]
    if task == "segment":
        model_name = model_name.replace(".pt", "-seg.pt")

    if args.stage in ("all", "baseline"):
        print(f"=== Stage 1: Baseline Inference ({task}) ===")
        run_baseline(
            image_dir=image_dir,
            output_dir=baseline_dir,
            model_name=model_name,
            conf_threshold=yolo_cfg["confidence_threshold"],
            limit=args.limit,
            task=task,
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
            limit=args.limit,
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
                model_name=model_name,
                conf_threshold=yolo_cfg["confidence_threshold"],
                task=task,
            )
        print("Evaluation complete.")


if __name__ == "__main__":
    main()
