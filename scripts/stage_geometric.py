"""Geometry-gated staging: let the model render the person INTO the real room,
then keep only the person and their shadow.

WHY THIS SHAPE
--------------
Two approaches failed before this one, in opposite directions:

  * Full-frame regeneration  - the model sees the room, so light, contact
    shadow and occlusion all come out right; but it also REPAINTS the room
    (floors changed material, sofas vanished) on another agent's listing.
  * Cut-and-paste composite  - the room is untouchable by construction, but the
    figure is generated blind to the room, so it can never pick up the room's
    colour cast or cast a real shadow. It also had no idea what a floor was,
    and planted a shoe on a coffee table.

This takes the first and removes its only flaw. The model renders the whole
frame; we then keep ONLY the pixels a person-segmentation model calls "person",
paste them onto the untouched original, and transfer the shadow as a
DARKEN-ONLY multiply. The room outside the person is bit-identical because it
is literally the original array. Lighting and occlusion are correct because the
model could see the room when it drew the person.

Depth is what makes it trustworthy rather than lucky: a fitted floor PLANE says
where feet may land, and metric depth says exactly how tall a 1.78m person is
at that distance. Both become numeric accept/reject gates instead of prompts.
"""
import os, sys, io, json, base64, warnings, pathlib
warnings.filterwarnings("ignore")

import numpy as np
import torch
from PIL import Image, ImageFilter

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from floor_plane import intrinsics, unproject, fit_floor, PERSON_H

OUT_W, OUT_H = 1080, 1350
ADE_PERSON = 12  # ADE20K semantic class id for "person"

NL = "\n"


# ---------------------------------------------------------------- geometry --
def crop_45(img):
    """Crop to 4:5 keeping full height, and return the focal length OF THE CROP.

    Focal length must be derived from the ORIGINAL frame and then carried
    through the crop. Assuming the field of view on the already-cropped image
    is the bug that made every candidate person 18% of frame height: cropping
    the sides off a 3:2 photo narrows the horizontal FOV, so the true focal
    length nearly doubled (600 -> ~1124 px) once accounted for."""
    W, H = img.size
    f_orig, _, _ = intrinsics(W, H)          # 84 deg hFOV applies to the ORIGINAL
    cw = min(W, int(round(H * 4 / 5)))
    ch = min(H, int(round(cw * 5 / 4)))
    left = (W - cw) // 2
    top = (H - ch) // 2
    out = img.crop((left, top, left + cw, top + ch)).resize((OUT_W, OUT_H), Image.LANCZOS)
    f_out = f_orig * (OUT_W / cw)
    print("  crop {}x{} -> {}x{}   focal {:.0f}px (orig {:.0f}px)".format(
        cw, ch, OUT_W, OUT_H, f_out, f_orig))
    return out, f_out


def analyse(img, f):
    """Depth -> floor plane -> (floor mask, depth)."""
    from transformers import AutoImageProcessor, AutoModelForDepthEstimation
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    mid = "depth-anything/Depth-Anything-V2-Metric-Indoor-Base-hf"
    proc = AutoImageProcessor.from_pretrained(mid)
    model = AutoModelForDepthEstimation.from_pretrained(mid).to(dev).eval()

    inp = proc(images=img, return_tensors="pt").to(dev)
    with torch.no_grad():
        pred = model(**inp).predicted_depth
    depth = torch.nn.functional.interpolate(
        pred.unsqueeze(1), size=img.size[::-1], mode="bicubic", align_corners=False
    )[0, 0].cpu().numpy()

    w, h = img.size
    pts = unproject(depth, f, w / 2.0, h / 2.0)
    n, d = fit_floor(pts, h, w)
    signed = pts @ n + d
    floor = np.abs(signed) < 0.06
    floor[: int(h * 0.45), :] = False
    return floor, depth


def person_mask(img):
    """Semantic segmentation -> boolean mask of 'person' pixels."""
    from transformers import SegformerImageProcessor, SegformerForSemanticSegmentation
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    mid = "nvidia/segformer-b4-finetuned-ade-512-512"
    proc = SegformerImageProcessor.from_pretrained(mid)
    model = SegformerForSemanticSegmentation.from_pretrained(mid).to(dev).eval()

    inp = proc(images=img, return_tensors="pt").to(dev)
    with torch.no_grad():
        logits = model(**inp).logits
    up = torch.nn.functional.interpolate(
        logits, size=img.size[::-1], mode="bilinear", align_corners=False
    )
    return up.argmax(1)[0].cpu().numpy() == ADE_PERSON


# ------------------------------------------------------------------- spot --
def pick_spot(floor, depth, f):
    """Choose WHERE the agent stands, from geometry rather than from prose.

    Asking in words ("middle ground, right of the coffee table") put him in the
    foreground with his feet off the bottom edge on all three takes. The floor
    mask plus metric depth already contain the answer: every floor pixel has a
    known distance, so it has a known correct person-height in pixels, and we
    can simply reject every spot whose figure would not fit the frame."""
    ys, xs = np.where(floor)
    if len(ys) == 0:
        raise RuntimeError("no floor found")

    best, best_score = None, -1e9
    for i in range(0, len(ys), 7):
        y, x = int(ys[i]), int(xs[i])
        d = depth[y, x]
        if not np.isfinite(d) or d <= 0.5:
            continue
        h = f * PERSON_H / d
        if not (0.34 * OUT_H <= h <= 0.62 * OUT_H):
            continue
        if y - h < 45 or y > OUT_H - 40:
            continue
        half = max(8, int(h * 0.16))
        if x - half < 25 or x + half > OUT_W - 25:
            continue
        # Standing room: the floor must actually be floor around the feet.
        sub = floor[max(0, y - 8):y + 9, x - half:x + half + 1]
        support = sub.mean() if sub.size else 0.0
        if support < 0.75:
            continue
        # Prefer a thirds-ish placement and a comfortable figure height.
        thirds = min(abs(x / OUT_W - 0.34), abs(x / OUT_W - 0.66))
        score = support - 2.4 * thirds - 2.0 * abs(h / OUT_H - 0.46)
        if score > best_score:
            best, best_score = (x, y, h), score

    if best is None:
        raise RuntimeError("no floor spot leaves room for a whole person")
    x, y, h = best
    print("  spot               x={} feet_y={} depth={:.2f}m height={:.0f}px "
          "({:.0%} of frame)".format(x, y, depth[y, x], h, h / OUT_H))
    return x, y, h


def marker(img, x, y, h):
    """A copy of the room with the target footprint drawn on it. Gemini places
    a person far more reliably from a picture than from a sentence."""
    from PIL import ImageDraw
    m = img.copy()
    ov = Image.new("RGBA", m.size, (0, 0, 0, 0))
    dr = ImageDraw.Draw(ov)
    half = h * 0.17
    dr.rectangle([x - half, y - h, x + half, y], outline=(255, 0, 0, 255), width=6)
    dr.line([x - half * 1.7, y, x + half * 1.7, y], fill=(255, 0, 0, 255), width=8)
    m = Image.alpha_composite(m.convert("RGBA"), ov).convert("RGB")
    return m


# ------------------------------------------------------------------ render --
def render(img, mark, headshot, pose, wardrobe):
    """REST rather than the SDK: the installed google-genai predates
    `image_config`, and native 4:5 output matters - resizing a 16:9 return
    would distort the person we just went to trouble to scale correctly."""
    import requests

    def b64(im, fmt="PNG"):
        b = io.BytesIO()
        im.save(b, format=fmt)
        return base64.b64encode(b.getvalue()).decode()

    key = os.environ["GEMINI_API_KEY"]
    url = ("https://generativelanguage.googleapis.com/v1beta/models/"
           "gemini-2.5-flash-image:generateContent")

    prompt = (
        "IMAGE 1 is a photograph of a room. IMAGE 2 is the same room with a red "
        "rectangle drawn on it. IMAGE 3 is a photograph of a real-estate agent." + NL + NL
        + "Return IMAGE 1 with that agent added to the room, and nothing else changed." + NL + NL
        + "PLACEMENT - this is exact, not a suggestion: the agent's FEET rest on the "
          "bottom line of the red rectangle, and the TOP OF THEIR HEAD reaches the top "
          "of that rectangle. That rectangle is their true size and position at that "
          "distance in the room. Do NOT draw the rectangle or any line in your output; "
          "it is a guide only." + NL + NL
        + "IDENTITY: the face must match IMAGE 3 exactly - hair colour and texture, face "
          "shape, jawline, skin tone. Do not idealize, smooth or slim them." + NL
        + "WARDROBE: " + wardrobe + NL
        + "POSE: " + pose + NL
        + "Make it candid, a frame from documentary footage - weight on one hip, "
          "shoulders relaxed and uneven, never squared to the camera, arms never "
          "mirroring each other." + NL + NL
        + "Light them with THIS ROOM's light - the same direction, colour temperature "
          "and softness as everything else in frame - and give them a believable "
          "contact shadow on the floor. Anything in the room nearer to the camera "
          "than they are must pass IN FRONT of them."
    )
    body = {
        "contents": [{"role": "user", "parts": [
            {"inline_data": {"mime_type": "image/png", "data": b64(img)}},
            {"inline_data": {"mime_type": "image/png", "data": b64(mark)}},
            {"inline_data": {"mime_type": "image/png", "data": b64(headshot)}},
            {"text": prompt},
        ]}],
        "generationConfig": {"imageConfig": {"aspectRatio": "4:5", "imageSize": "2K"}},
    }
    r = requests.post(url, params={"key": key}, json=body, timeout=180)
    r.raise_for_status()
    for part in r.json()["candidates"][0]["content"]["parts"]:
        d = part.get("inlineData") or part.get("inline_data")
        if d and d.get("data"):
            raw = base64.b64decode(d["data"])
            return Image.open(io.BytesIO(raw)).convert("RGB").resize(
                (OUT_W, OUT_H), Image.LANCZOS)
    raise RuntimeError("no image returned")


# --------------------------------------------------------------- composite --
def compose(base, gen, pm, floor, depth, f):
    """Keep only the person; transfer their shadow as darken-only."""
    ys, xs = np.where(pm)
    if len(ys) < 500:
        raise RuntimeError("segmentation found no person")
    top, bot, left, right = ys.min(), ys.max(), xs.min(), xs.max()
    fx = int((left + right) / 2)

    # --- GATE 0: were the feet cropped by the frame edge? ---
    # Checked first because it explains the other two: a figure running off the
    # bottom has no visible feet, so "feet on floor" reports 0% and the failure
    # reads as the wrong problem.
    if bot >= OUT_H - 4:
        raise RuntimeError("figure runs off the bottom edge - feet cropped")

    # --- GATE 1: are the feet on the fitted floor plane? ---
    y0 = max(0, bot - 12)
    fys, fxs = np.where(pm[y0:bot + 1, :])
    on_floor = 0
    for yy, xx in zip(fys + y0, fxs):
        on_floor += floor[min(yy + 6, floor.shape[0] - 1), xx]
    frac = on_floor / max(1, len(fys))
    print("  feet-on-floor      {:.0%}".format(frac))
    if frac < 0.30:
        raise RuntimeError("feet are not on the floor plane ({:.0%})".format(frac))

    # --- GATE 2: does their size match the depth at their feet? ---
    fd = float(np.median(depth[max(0, bot - 8):bot + 1, max(0, fx - 8):fx + 9]))
    expect = f * PERSON_H / fd
    actual = bot - top
    ratio = actual / expect
    print("  depth at feet      {:.2f}m -> expect {:.0f}px, got {}px ({:.2f}x)".format(
        fd, expect, actual, ratio))
    if not (0.72 <= ratio <= 1.38):
        raise RuntimeError("scale wrong for that distance ({:.2f}x)".format(ratio))

    b = np.array(base).astype(np.float32)
    g = np.array(gen).astype(np.float32)

    # How much did the room change OUTSIDE the person? Tells us whether the
    # shadow transfer is safe (it assumes the two frames still line up).
    drift = float(np.abs(b[~pm] - g[~pm]).mean())
    print("  room drift         {:.1f}/255 outside the figure".format(drift))

    a = Image.fromarray((pm * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    a = (np.array(a).astype(np.float32) / 255.0)[..., None]
    comp = b * (1 - a) + g * a

    # Shadow: darken-only, near the feet, outside the figure. A multiply can
    # never change the floor's MATERIAL, only its brightness, so this cannot
    # smuggle in a repaint.
    if drift < 42:
        sh = np.zeros((OUT_H, OUT_W), np.float32)
        ry0 = max(0, top + int(0.55 * (bot - top)))
        ry1 = min(OUT_H, bot + 90)
        rx0, rx1 = max(0, left - 130), min(OUT_W, right + 130)
        reg = np.zeros_like(sh, bool)
        reg[ry0:ry1, rx0:rx1] = True
        reg &= ~pm
        rat = np.clip(g.mean(2) / np.maximum(b.mean(2), 1.0), 0, 1)
        sh[reg] = 1.0 - rat[reg]
        sh = np.array(Image.fromarray((np.clip(sh, 0, 1) * 255).astype(np.uint8))
                      .filter(ImageFilter.GaussianBlur(7))).astype(np.float32) / 255.0
        sh = np.clip(sh - 0.06, 0, 1) * 0.9
        comp *= (1.0 - sh)[..., None]
        print("  shadow transferred (max {:.2f})".format(sh.max()))
    else:
        print("  shadow SKIPPED - room drifted too far to trust alignment")

    return (Image.fromarray(np.clip(comp, 0, 255).astype(np.uint8)),
            {"feet_on_floor": round(frac, 3), "scale_ratio": round(ratio, 3),
             "drift": round(drift, 1)})


HEADSHOT = ("https://res.cloudinary.com/duqgao9h8/image/upload/v1774327194/"
            "headshots/head-shot-2026.png")


def main():
    import requests
    src = pathlib.Path(sys.argv[1])
    pose = sys.argv[2] if len(sys.argv) > 2 else "standing, mid-conversation, looking at the camera"
    wardrobe = "Dark grey suit jacket over a light blue collared shirt, no tie."

    print("geometry...")
    base, f = crop_45(Image.open(src).convert("RGB"))
    base.save(src.with_name("base.png"))
    headshot = Image.open(io.BytesIO(requests.get(HEADSHOT, timeout=60).content)).convert("RGB")

    floor, depth = analyse(base, f)
    Image.fromarray((floor * 255).astype(np.uint8)).save(src.with_name("floor_crop.png"))
    x, y, h = pick_spot(floor, depth, f)
    mark = marker(base, x, y, h)
    mark.save(src.with_name("marker.png"))

    for take in range(1, 4):
        print("take {}...".format(take))
        gen = render(base, mark, headshot, pose, wardrobe)
        gen.save(src.with_name("gen{}.png".format(take)))
        try:
            out, stats = compose(base, gen, person_mask(gen), floor, depth, f)
        except RuntimeError as e:
            print("  rejected: {}".format(e))
            continue
        out.save(src.with_name("staged.png"))
        print("OK -> staged.png " + json.dumps(stats))
        return
    print("all takes rejected")


if __name__ == "__main__":
    main()
