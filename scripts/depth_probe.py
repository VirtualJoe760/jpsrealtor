"""Probe: does a metric depth model give us the floor plane we were guessing at?

The composite pipeline put the agent's shoe on a coffee TABLE because a vision
model was asked "is this walkable floor?" about a 220px crop and said yes. That
is a geometry question being answered by vibes. Depth Anything V2 (metric,
indoor-tuned) answers it with numbers: the floor is the dominant plane, and a
tabletop sits ~0.4m above it as a hard discontinuity.

Run:  python scripts/depth_probe.py <image_path>
Writes depth.npy + depth_vis.png next to the input.
"""
import sys, warnings, pathlib
warnings.filterwarnings("ignore")

import numpy as np
import torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForDepthEstimation

MODEL = "depth-anything/Depth-Anything-V2-Metric-Indoor-Base-hf"


def main(path: str):
    src = pathlib.Path(path)
    img = Image.open(src).convert("RGB")
    dev = "cuda" if torch.cuda.is_available() else "cpu"

    proc = AutoImageProcessor.from_pretrained(MODEL)
    model = AutoModelForDepthEstimation.from_pretrained(MODEL).to(dev).eval()

    inputs = proc(images=img, return_tensors="pt").to(dev)
    with torch.no_grad():
        pred = model(**inputs).predicted_depth

    depth = torch.nn.functional.interpolate(
        pred.unsqueeze(1), size=img.size[::-1], mode="bicubic", align_corners=False
    )[0, 0].cpu().numpy()

    np.save(src.with_suffix(".depth.npy"), depth)

    d = depth
    print(f"image      {img.size[0]}x{img.size[1]}")
    print(f"depth      min {d.min():.2f}m  max {d.max():.2f}m  median {np.median(d):.2f}m")

    # Sanity: depth should increase with height in frame for a floor receding
    # from the camera. Sample a vertical strip and report.
    h, w = d.shape
    col = w // 2
    for frac in (0.55, 0.65, 0.75, 0.85, 0.95):
        y = int(h * frac)
        print(f"  y={frac:.0%} ({y:4d})  depth {d[y, col]:6.2f}m")

    vis = (255 * (d - d.min()) / (d.max() - d.min() + 1e-6)).astype(np.uint8)
    Image.fromarray(vis).save(src.with_suffix(".depthvis.png"))
    print("wrote", src.with_suffix(".depth.npy").name, "and", src.with_suffix(".depthvis.png").name)


if __name__ == "__main__":
    main(sys.argv[1])
