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
# Tripod height for interior listing photography. This is the absolute length
# the whole scale chain is anchored to - see the calibration note in analyse().
ASSUMED_CAM_H = 1.45

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

    # ---- ABSOLUTE-SCALE CALIBRATION ----------------------------------------
    # Metric depth models carry a scale bias on wide-angle interiors, which are
    # well outside their training distribution. Measured here: the fitted floor
    # put the CAMERA 1.78-2.27m above the floor across four frames of one
    # house. Listing photos are shot off a tripod at roughly 1.45m, so depth
    # was long by ~1.4x - and that is precisely the factor by which every
    # render was scored "too big". The model was obeying the guide box; the
    # ruler was wrong.
    #
    # Camera height is the one absolute length we genuinely know about this
    # genre of photograph, so anchor to it and let the depth map keep its
    # (excellent) relative structure.
    implied = abs(d) / np.linalg.norm(n)
    s = ASSUMED_CAM_H / implied
    print("  scale calib        camera read {:.2f}m -> assuming {:.2f}m, depth x{:.3f}".format(
        implied, ASSUMED_CAM_H, s))
    depth = depth * s
    pts = pts * s
    d = d * s

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
        if not (0.32 * OUT_H <= h <= 0.66 * OUT_H):
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
        score = support - 2.4 * thirds - 2.0 * abs(h / OUT_H - 0.52)
        if score > best_score:
            best, best_score = (x, y, h), score

    if best is None:
        raise RuntimeError("no floor spot leaves room for a whole person")
    x, y, h = best
    print("  spot               x={} feet_y={} depth={:.2f}m height={:.0f}px "
          "({:.0%} of frame)".format(x, y, depth[y, x], h, h / OUT_H))
    return x, y, h


# -------------------------------------------------------------------- pose --
# Joint layouts in figure-local coordinates: x is a fraction of figure HEIGHT
# either side of the spine, y runs 0.0 (top of head) to 1.0 (feet).
#
# This is the conditioning signal ControlNet uses (a pose skeleton), handed to
# Gemini in the marker image instead of to Stable Diffusion. Same control, no
# renderer swap - and the renderer is the part that made lighting, shadow and
# occlusion correct, so it is the last thing worth trading away.
#
# Every pose here is deliberately ASYMMETRIC. Symmetry is what reads as robotic:
# level shoulders, both arms doing the same thing, hips square to the lens.
POSES = {
    "walk_look_back": {
        "desc": "caught mid-stride walking further into the room, trailing arm swinging "
                "back, head turned back over the shoulder toward the camera, mouth "
                "slightly open as if mid-sentence",
        "j": {"head": (0.04, 0.05), "neck": (0.02, 0.14), "sL": (-0.09, 0.17), "sR": (0.13, 0.16),
              "eL": (-0.15, 0.31), "eR": (0.19, 0.30), "wL": (-0.12, 0.45), "wR": (0.22, 0.44),
              "hL": (-0.05, 0.50), "hR": (0.07, 0.50), "kL": (-0.13, 0.73), "kR": (0.11, 0.74),
              "aL": (-0.19, 0.97), "aR": (0.14, 0.96)},
    },
    "hand_pocket_angle": {
        "desc": "torso angled about 30 degrees away from the lens with the head turned "
                "back to camera, near hand in the trouser pocket, far arm hanging loose, "
                "weight clearly on the back leg",
        "j": {"head": (-0.03, 0.05), "neck": (-0.01, 0.14), "sL": (-0.13, 0.16), "sR": (0.09, 0.18),
              "eL": (-0.17, 0.32), "eR": (0.13, 0.33), "wL": (-0.13, 0.47), "wR": (0.09, 0.47),
              "hL": (-0.07, 0.51), "hR": (0.05, 0.50), "kL": (-0.08, 0.74), "kR": (0.06, 0.73),
              "aL": (-0.09, 0.97), "aR": (0.04, 0.97)},
    },
    "gesture_to_feature": {
        "desc": "half-turned toward the room's main feature with the near arm raised and "
                "open-palmed toward it, head following the gesture but eyes flicking back "
                "to the camera, other hand relaxed at the side",
        "j": {"head": (0.05, 0.05), "neck": (0.02, 0.14), "sL": (-0.10, 0.17), "sR": (0.12, 0.16),
              "eL": (-0.16, 0.30), "eR": (0.24, 0.22), "wL": (-0.14, 0.46), "wR": (0.34, 0.19),
              "hL": (-0.06, 0.50), "hR": (0.06, 0.51), "kL": (-0.09, 0.74), "kR": (0.08, 0.73),
              "aL": (-0.11, 0.97), "aR": (0.07, 0.97)},
    },
    "mid_sentence": {
        "desc": "standing three-quarters to the lens mid-conversation, both hands raised "
                "waist-high in an unfinished gesture at different heights, shoulders "
                "uneven, caught in a breath of laughter",
        "j": {"head": (-0.04, 0.05), "neck": (-0.01, 0.14), "sL": (-0.12, 0.15), "sR": (0.10, 0.18),
              "eL": (-0.18, 0.30), "eR": (0.17, 0.32), "wL": (-0.09, 0.41), "wR": (0.06, 0.46),
              "hL": (-0.07, 0.50), "hR": (0.05, 0.51), "kL": (-0.10, 0.73), "kR": (0.05, 0.74),
              "aL": (-0.12, 0.96), "aR": (0.04, 0.97)},
    },
}

BONES = [("head", "neck"), ("neck", "sL"), ("neck", "sR"), ("sL", "eL"), ("eL", "wL"),
         ("sR", "eR"), ("eR", "wR"), ("neck", "hL"), ("neck", "hR"), ("hL", "hR"),
         ("hL", "kL"), ("kL", "aL"), ("hR", "kR"), ("kR", "aR")]


def marker(img, x, y, h, pose_key):
    """The room with the target footprint AND a pose skeleton drawn on it.

    Gemini places a person far more reliably from a picture than from a
    sentence - three straight takes ignored 'middle ground' and put him in the
    foreground with his feet off-frame. The skeleton adds posture to that same
    picture, so position, scale and pose all arrive as geometry."""
    from PIL import ImageDraw
    ov = Image.new("RGBA", img.size, (0, 0, 0, 0))
    dr = ImageDraw.Draw(ov)

    half = h * 0.17
    dr.rectangle([x - half, y - h, x + half, y], outline=(255, 0, 0, 190), width=4)
    dr.line([x - half * 1.7, y, x + half * 1.7, y], fill=(255, 0, 0, 220), width=7)

    j = POSES[pose_key]["j"]
    pt = lambda k: (x + j[k][0] * h, y - h + j[k][1] * h)
    for a, b in BONES:
        dr.line([pt(a), pt(b)], fill=(0, 210, 255, 255), width=max(4, int(h * 0.012)))
    for k in j:
        r = h * (0.030 if k == "head" else 0.011)
        cx, cy = pt(k)
        dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(0, 210, 255, 255))

    return Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")


# ---------------------------------------------------------------- wardrobe --
def pick_wardrobe(img, x, y, h, formal):
    """Choose clothing that CONTRASTS with what he'll be standing against.

    A charcoal suit against dark walnut cabinetry disappears; the same suit
    against a white-walled great room pops. Measured off the actual backdrop
    pixels rather than guessed from the room's name."""
    a = np.array(img).astype(np.float32)
    y0, y1 = max(0, int(y - h)), min(a.shape[0], int(y))
    x0, x1 = max(0, int(x - h * 0.55)), min(a.shape[1], int(x + h * 0.55))
    patch = a[y0:y1, x0:x1]
    lum = float((0.299 * patch[..., 0] + 0.587 * patch[..., 1] + 0.114 * patch[..., 2]).mean())
    warm = float(patch[..., 0].mean() - patch[..., 2].mean())   # >0 = warm backdrop
    sat = float(np.abs(patch.max(2) - patch.min(2)).mean())      # busy / colourful?

    if lum > 150:
        tone = ("charcoal", "deep navy")          # dark figure on a light room
    elif lum < 95:
        tone = ("light grey", "soft tan")         # light figure on a dark room
    else:
        tone = ("deep navy", "charcoal")
    pick = tone[0] if warm > 6 else tone[1]       # cool clothes against warm rooms

    if sat > 58:
        note = ("Keep it plain and solid - the room is already colourful, so no pattern "
                "should compete with it.")
    else:
        note = "A subtle texture in the cloth is welcome; the room is visually quiet."

    if formal == "sharp":
        w = ("A sharply tailored {} two-piece suit, crisp white shirt, no tie, top button "
             "open, polished dark leather shoes. Impeccably fitted - this is his best "
             "suit. ".format(pick) + note)
    else:
        w = ("A {} unstructured blazer over a crisp light shirt with the sleeves rolled "
             "once, no tie, well-fitted dark chinos, brown leather loafers. Polished "
             "business casual, not scruffy. ".format(pick) + note)

    print("  backdrop           lum {:.0f} warm {:+.0f} colourfulness {:.0f} -> {} {}".format(
        lum, warm, sat, pick, "suit" if formal == "sharp" else "business casual"))
    return w


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
        "IMAGE 1 is a photograph of a room. IMAGE 2 is the same room with a red box and "
        "a blue stick-figure skeleton drawn on it. IMAGE 3 is a photograph of a "
        "real-estate agent." + NL + NL
        + "Return IMAGE 1 with that agent added to the room, and nothing else changed." + NL + NL
        + "PLACEMENT AND POSE - exact, not suggestions. The blue skeleton in IMAGE 2 is "
          "the agent's body: match its stance limb for limb. Where the skeleton's head, "
          "shoulders, elbows, wrists, hips, knees and ankles sit is where his are. His "
          "FEET rest on the red line and the TOP OF HIS HEAD reaches the top of the red "
          "box - that box is his true size at that distance in the room. The skeleton "
          "and box are guides ONLY: do NOT draw any box, line, dot or skeleton in your "
          "output." + NL + NL
        + "The skeleton is deliberately asymmetric. Keep that asymmetry - uneven "
          "shoulders, the two arms doing different things, hips not square to the lens. "
          "This must read as a candid frame from documentary footage, someone caught "
          "mid-motion. It must NOT read as a catalogue model posing." + NL + NL
        + "WHAT HE IS DOING: " + pose + NL + NL
        + "IDENTITY: the face must match IMAGE 3 exactly - hair colour and texture, face "
          "shape, jawline, skin tone. Do not idealize, smooth or slim him." + NL + NL
        + "WARDROBE: " + wardrobe + NL + NL
        + "Light him with THIS ROOM's light - the same direction, colour temperature "
          "and softness as everything else in frame - and give him a believable "
          "contact shadow on the floor. Anything in the room nearer to the camera "
          "than he is must pass IN FRONT of him."
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
    if not (0.80 <= ratio <= 1.25):
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


# Formality by room: the great room, dining and formal living carry the sharp
# suit; the rooms people actually potter about in get business casual.
SHARP_ROOMS = {"living", "great_room", "dining", "primary_bedroom", "office", "exterior"}


def stage_one(src, pose_key, room_kind, out_name="staged.png", takes=3):
    import requests
    print("geometry...")
    base, f = crop_45(Image.open(src).convert("RGB"))
    base.save(src.with_name("base_" + out_name))
    headshot = Image.open(io.BytesIO(requests.get(HEADSHOT, timeout=60).content)).convert("RGB")

    floor, depth = analyse(base, f)
    x, y, h = pick_spot(floor, depth, f)
    wardrobe = pick_wardrobe(base, x, y, h,
                             "sharp" if room_kind in SHARP_ROOMS else "casual")
    mark = marker(base, x, y, h, pose_key)
    mark.save(src.with_name("marker_" + out_name))
    pose = POSES[pose_key]["desc"]
    print("  pose               {}".format(pose_key))

    for take in range(1, takes + 1):
        print("take {}...".format(take))
        gen = render(base, mark, headshot, pose, wardrobe)
        try:
            out, stats = compose(base, gen, person_mask(gen), floor, depth, f)
        except RuntimeError as e:
            print("  rejected: {}".format(e))
            continue
        out.save(src.with_name(out_name))
        print("OK -> {} {}".format(out_name, json.dumps(stats)))
        return out
    print("all takes rejected")
    return None


def main():
    src = pathlib.Path(sys.argv[1])
    pose_key = sys.argv[2] if len(sys.argv) > 2 else "hand_pocket_angle"
    room_kind = sys.argv[3] if len(sys.argv) > 3 else "living"
    stage_one(src, pose_key, room_kind)


if __name__ == "__main__":
    main()
