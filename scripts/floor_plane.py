"""Turn a metric depth map into an actual FLOOR MASK and a scale rule.

This replaces the guesswork that put the agent's shoe on a coffee table: a
tabletop is ~0.4m above the floor, so once the floor is a fitted 3D PLANE,
"is this walkable floor?" is a distance test in metres, not a question for a
language model.

Outputs, next to the input image:
  <name>.floor.png     floor mask (white = safe to stand)
  <name>.floorvis.png  overlay for eyeballing

Run: python scripts/floor_plane.py <image_path>
"""
import sys, warnings, pathlib, json
warnings.filterwarnings("ignore")

import numpy as np
from PIL import Image

PERSON_H = 1.78  # metres, the agent's approximate height


def intrinsics(w: int, h: int, hfov_deg: float = 84.0):
    """Real-estate interiors are shot wide; 84 deg horizontal is a fair default
    for the ~16-18mm full-frame equivalent these listings use."""
    f = (w / 2.0) / np.tan(np.radians(hfov_deg) / 2.0)
    return f, w / 2.0, h / 2.0


def unproject(depth, f, cx, cy):
    h, w = depth.shape
    xs, ys = np.meshgrid(np.arange(w), np.arange(h))
    X = (xs - cx) * depth / f
    Y = (ys - cy) * depth / f
    return np.stack([X, Y, depth], axis=-1)


def fit_floor(pts, h, w, iters=600, tol=0.05, seed=0):
    """RANSAC a plane, seeded from the bottom-centre where floor is likeliest.
    Returns (normal, d) for  n . p + d = 0."""
    rng = np.random.default_rng(seed)
    band = pts[int(h * 0.62):, int(w * 0.15):int(w * 0.85)].reshape(-1, 3)
    band = band[np.isfinite(band).all(1)]
    if len(band) < 100:
        raise SystemExit("not enough points to fit a floor")

    best_n, best_d, best_inl = None, None, -1
    for _ in range(iters):
        p = band[rng.choice(len(band), 3, replace=False)]
        n = np.cross(p[1] - p[0], p[2] - p[0])
        norm = np.linalg.norm(n)
        if norm < 1e-8:
            continue
        n = n / norm
        # A floor's normal points mostly along the camera's Y axis (up/down).
        if abs(n[1]) < 0.85:
            continue
        d = -n.dot(p[0])
        inl = int((np.abs(band @ n + d) < tol).sum())
        if inl > best_inl:
            best_n, best_d, best_inl = n, d, inl

    if best_n is None:
        raise SystemExit("no plausible floor plane found")
    print(f"floor plane  normal=({best_n[0]:+.2f},{best_n[1]:+.2f},{best_n[2]:+.2f})  "
          f"inliers={best_inl}/{len(band)} ({100*best_inl/len(band):.0f}% of lower band)")
    return best_n, best_d


def main(path: str):
    src = pathlib.Path(path)
    img = Image.open(src).convert("RGB")
    depth = np.load(src.with_suffix(".depth.npy"))
    w, h = img.size
    f, cx, cy = intrinsics(w, h)

    pts = unproject(depth, f, cx, cy)
    n, d = fit_floor(pts, h, w)

    signed = pts @ n + d
    floor = np.abs(signed) < 0.06

    # Only keep floor in the lower half: a ceiling is also plane-parallel and
    # would otherwise pass the distance test.
    floor[: int(h * 0.45), :] = False

    print(f"floor pixels {100*floor.mean():.1f}% of frame")

    # Height above the floor plane, for reporting what furniture reads as.
    above = signed  # positive = above the floor plane
    for name, (yf, xf) in {
        "frame centre": (0.55, 0.50),
        "lower left  ": (0.85, 0.25),
        "lower right ": (0.85, 0.75),
    }.items():
        y, x = int(h * yf), int(w * xf)
        px_h = f * PERSON_H / depth[y, x]
        print(f"  {name} @({x},{y})  depth {depth[y,x]:5.2f}m  "
              f"{'FLOOR' if floor[y,x] else f'{above[y,x]:+.2f}m off floor'}  "
              f"-> a {PERSON_H}m person here = {px_h:.0f}px tall")

    Image.fromarray((floor * 255).astype(np.uint8)).save(src.with_suffix(".floor.png"))

    ov = np.array(img).copy()
    ov[floor] = (0.45 * ov[floor] + 0.55 * np.array([0, 255, 120])).astype(np.uint8)
    Image.fromarray(ov).save(src.with_suffix(".floorvis.png"))

    json.dump(
        {"f": f, "normal": n.tolist(), "d": float(d), "person_h": PERSON_H},
        open(src.with_suffix(".plane.json"), "w"),
    )
    print("wrote", src.with_suffix(".floorvis.png").name)


if __name__ == "__main__":
    main(sys.argv[1])
