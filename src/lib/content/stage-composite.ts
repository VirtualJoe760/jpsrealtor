/**
 * Composite staging — the agent is generated ALONE and pasted onto the
 * UNTOUCHED original photo. The room cannot change because the room is never
 * given to an image model at all.
 *
 * WHY THIS EXISTS
 * ---------------
 * Full-frame regeneration (gemini-2.5-flash-image editing the room photo)
 * repaints the frame: floors changed material, sofas vanished, pot racks
 * disappeared — on a listing that belongs to ANOTHER AGENT, which makes it a
 * compliance problem, not a taste problem. A QC gate catches most of it, but
 * catching is the wrong shape: on one listing 9 of 13 takes were rejected.
 *
 * True mask inpainting (Imagen capability models) gives the guarantee
 * structurally, but as of 2026-07-27 the Imagen publisher models return
 * NOT_FOUND project-wide here while Gemini works on the same surface —
 * catalog entitlement, not auth (403s became 404s once IAM was granted).
 * Retest: scripts/probe-imagen.md. This module provides the same guarantee
 * a mask would, using only models that work today:
 *
 *   1. LOOK    gemini-2.5-flash returns a floor-anchored box for where the
 *              person belongs in THIS frame (it can see rugs and furniture).
 *   2. FIGURE  gemini-2.5-flash-image generates ONLY the person, full body,
 *              on a solid chroma green, with the room photo supplied purely
 *              as a lighting reference.
 *   3. KEY     sharp removes the green (distance keying + despill), feathers
 *              the edge.
 *   4. PLANT   the cutout is scaled so its feet sit on the box's floor line
 *              and composited onto the ORIGINAL pixels, plus a soft contact
 *              shadow ellipse under the feet.
 *
 * The QC verifier still runs afterwards, but its room checks pass by
 * construction; what it still catches is figure defects (hands, limbs).
 */
import sharp from "sharp";
import { GoogleGenAI } from "@google/genai";
import { removeBackground } from "@imgly/background-removal-node";

export interface CompositeResult {
  /** Final 4:5 PNG buffer, room pixels identical to the source outside the figure. */
  png: Buffer;
  /** Where the figure was planted, in output-image coordinates. */
  box: { x: number; y: number; w: number; h: number };
  /** The placement sentence used, for the record / regeneration. */
  placement: string;
}

const OUT_W = 1080;
const OUT_H = 1350;

/** Chroma green nothing in a listing photo plausibly contains. */
const KEY_R = 0, KEY_G = 255, KEY_B = 64;

async function fetchBuf(url: string): Promise<Buffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${r.status}: ${url.slice(0, 80)}`);
  return Buffer.from(await r.arrayBuffer());
}

/**
 * Ask the vision model WHERE the person stands in this frame.
 * Returns a normalized (0-1000) box whose BOTTOM edge is the floor contact
 * line — that anchor is what makes scale believable.
 */
async function findFloorBox(
  ai: GoogleGenAI,
  photo: Buffer,
  placement: string
): Promise<{ ymin: number; xmin: number; ymax: number; xmax: number; lighting: string }> {
  const res: any = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { data: photo.toString("base64"), mimeType: "image/jpeg" } },
          {
            text:
              `A real-estate agent will be composited into this photo: ${placement}\n\n` +
              `Return ONLY JSON: {"box_2d":[ymin,xmin,ymax,xmax]} with coordinates normalized to 0-1000.\n` +
              `The box is where the FULL STANDING PERSON goes: bottom edge ON the floor exactly where their feet touch, ` +
              `top edge at head height for a person of realistic scale at that depth in the room. ` +
              `The box must sit on visible open floor and must not cover the room's main feature.`,
          },
        ],
      },
    ],
  });
  const text: string = res?.candidates?.[0]?.content?.parts?.find((p: any) => p?.text)?.text || "";
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no box from vision model");
  const j = JSON.parse(m[0]);
  // Models drift on the field name and sometimes nest the array one level
  // deeper; accept the common shapes rather than failing on `.map` of
  // undefined (which is exactly how the first run after adding `lighting`
  // died — the model returned {"box":[...]} that day).
  const rawBox = j.box_2d ?? j.box ?? j.bounding_box ?? (Array.isArray(j) ? j : null);
  const flat = Array.isArray(rawBox) && Array.isArray(rawBox[0]) ? rawBox[0] : rawBox;
  if (!Array.isArray(flat) || flat.length !== 4) {
    throw new Error(`vision box unusable: ${text.slice(0, 120)}`);
  }
  const [ymin, xmin, ymax, xmax] = flat.map(Number);
  if (!(ymax > ymin && xmax > xmin)) throw new Error("degenerate box");
  return { ymin, xmin, ymax, xmax, lighting: String(j.lighting || "soft neutral indoor light") };
}

/** Generate the figure alone on chroma green, lit like the reference room. */
async function generateFigure(
  ai: GoogleGenAI,
  lighting: string,
  headshot: Buffer,
  direction: string,
  wardrobe: string
): Promise<Buffer> {
  const res: any = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { data: headshot.toString("base64"), mimeType: "image/png" } },
          {
            text:
              `Generate ONE full-body photograph of the person from the attached image, standing, head to feet, ` +
              `on a COMPLETELY FLAT, VIVID MAGENTA background (RGB 255,0,255). Nothing else in the frame: no floor, ` +
              `no shadow on the background, no props, no text.\n\n` +
              `LIGHTING: ${lighting}\n\n` +
              `POSE: ${direction}\n` +
              `Make it CANDID — a frame pulled from documentary footage, not a catalog shot: weight clearly on one hip, shoulders relaxed and slightly uneven, caught mid-moment (mid-step, mid-turn, or a breath into a laugh). Never perfectly symmetrical, never squared to the camera, arms never mirroring each other.\n\n` +
              `IDENTITY: match the face exactly — hair colour and texture, face shape, jawline, skin tone. Do not ` +
              `idealize, smooth or slim them.\nWARDROBE: ${wardrobe}\n\n` +
              `The person must be fully inside the frame with margin on all sides, feet fully visible.`,
          },
        ],
      },
    ],
    config: { imageConfig: { aspectRatio: "3:4", imageSize: "1K" } },
  });
  const img = (res?.candidates?.[0]?.content?.parts || []).find((p: any) => p?.inlineData?.data);
  if (!img) throw new Error("no figure returned");
  return Buffer.from(img.inlineData.data, "base64");
}

/**
 * Separate figure from backdrop by FLOOD-FILLING from the borders.
 *
 * Background is defined as "whatever is colour-connected to the image edge",
 * not "whatever is near some key colour". Both colour-distance attempts failed
 * in opposite directions on live runs: keyed against the REQUESTED green, the
 * model's off-green backdrop survived as a translucent slab; keyed against a
 * CORNER SAMPLE, backdrop tones inside the figure (grey suit vs grey-green
 * wall) got eaten and the composite was a disembodied face. Connectivity
 * sidesteps colour entirely — the person is never connected to the border, so
 * the person can never be keyed away, whatever colours the model chose.
 */
async function keyGreen(figure: Buffer): Promise<{ cutout: Buffer; trim: sharp.Region }> {
  const { data, info } = await sharp(figure).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = data;
  const W = info.width, H = info.height, N = W * H;

  // MAGENTA membership by channel relationship, not distance-to-anything.
  // Green failed twice in different directions: the model returned off-green
  // or pale backdrops, and every distance metric then overlapped either the
  // backdrop (translucent slab) or the figure (holes in a white shirt and
  // face highlights). Magenta shares no channel signature with skin, a white
  // shirt, or a grey suit: backdrop pixels have red and blue FAR above green.
  const isBackdrop = (i4: number) => {
    const r = px[i4], g = px[i4 + 1], b = px[i4 + 2];
    return r - g > 55 && b - g > 55;
  };

  const bg = new Uint8Array(N); // 1 = background
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    const idx = y * W + x;
    if (!bg[idx]) { bg[idx] = 1; stack.push(idx); }
  };
  // Seed from the TOP edge and the upper sides only. The bottom edge is where
  // feet land when the model under-margins, and a seed ON the figure lets the
  // fill climb a colour-uniform suit and delete the whole person — measured:
  // 0.1% of pixels survived. Backdrop below is still reached via the sides.
  for (let x = 0; x < W; x++) push(x, 0);
  for (let y = 0; y < Math.floor(H * 0.6); y++) { push(0, y); push(W - 1, y); }

  while (stack.length) {
    const idx = stack.pop()!;
    const x = idx % W, y = (idx / W) | 0;
    const neighbours = [
      x > 0 ? idx - 1 : -1,
      x < W - 1 ? idx + 1 : -1,
      y > 0 ? idx - W : -1,
      y < H - 1 ? idx + W : -1,
    ];
    for (const n of neighbours) {
      if (n >= 0 && !bg[n] && isBackdrop(n * 4)) { bg[n] = 1; stack.push(n); }
    }
  }

  // Sweep: any magenta-family pixel is backdrop even if the flood never
  // reached it (enclosed slivers, SHADED prop remnants that the strict flood
  // test keeps). Wider threshold is safe here: nothing on the figure — navy,
  // grey, skin, lips — has BOTH red and blue clearly above green.
  for (let idx = 0; idx < N; idx++) {
    const i4 = idx * 4;
    if (!bg[idx] && px[i4] - px[i4 + 1] > 35 && px[i4 + 2] - px[i4 + 1] > 35) bg[idx] = 1;
  }

  let minX = W, minY = H, maxX = 0, maxY = 0, kept = 0;
  for (let idx = 0; idx < N; idx++) {
    const i4 = idx * 4;
    if (bg[idx]) {
      px[i4 + 3] = 0;
    } else {
      kept++;
      const x = idx % W, y = (idx / W) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      // Soften the one-pixel rim so the cutout doesn't look razor-cut.
      const nbrs = [idx - 1, idx + 1, idx - W, idx + W];
      if (nbrs.some((n) => n >= 0 && n < N && bg[n])) {
        px[i4 + 3] = 160;
        // Despill: a magenta-lit rim reads as a purple halo once composited.
        const g0 = px[i4 + 1];
        if (px[i4] > g0) px[i4] = Math.round((px[i4] + g0) / 2);
        if (px[i4 + 2] > g0) px[i4 + 2] = Math.round((px[i4 + 2] + g0) / 2);
      }
    }
  }
  // Sanity: a full-body figure should occupy a meaningful share of the frame.
  if (kept < N * 0.04) throw new Error(`keying kept only ${((kept / N) * 100).toFixed(1)}% — backdrop separation failed`);
  if (kept > N * 0.65) throw new Error(`keying kept ${((kept / N) * 100).toFixed(1)}% — backdrop not removed`);

  const cutout = await sharp(px, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  return {
    cutout,
    trim: { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
  };
}

export type Wardrobe = "business_professional" | "business_casual";

// Reviewer's rule: business casual or business professional, nothing more
// casual — no shorts, whatever the scene. Poolside gets business casual.
const WARDROBE_TEXT: Record<Wardrobe, string> = {
  business_professional:
    "Dark grey suit jacket over a light blue collared shirt, no tie — exactly the look in the reference headshot.",
  business_casual:
    "Light blue collared shirt with sleeves rolled once, no jacket, dark tailored chinos, brown leather loafers. Polished but relaxed.",
};

export async function stageByComposite(opts: {
  photoUrl: string;
  headshotUrl: string;
  placement: string;
  poseDirection: string;
  /** Scene-appropriate outfit; defaults to the suit. Poolside in a suit reads wrong. */
  wardrobe?: Wardrobe;
}): Promise<CompositeResult> {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const [photo, headshot] = await Promise.all([fetchBuf(opts.photoUrl), fetchBuf(opts.headshotUrl)]);

  // Base: crop the ORIGINAL to 4:5 around attention, once, deterministically.
  // These are the only pixels the room will ever have.
  const base = await sharp(photo).resize(OUT_W, OUT_H, { fit: "cover", position: "attention" }).toBuffer();

  // 1. Where do the feet go — measured on the SAME crop the figure lands on.
  // Validate the floor line: in an interior photo the walkable floor is in the
  // lower part of the frame. A hallucinated box once planted the agent on top
  // of the upper cabinets, feet at 41% of frame height.
  // The floor box is the one stage the vision model gets wrong in ways
  // geometry can't cheaply catch — it has planted feet on upper cabinets
  // (ymax 41%) and then on a countertop (ymax 61%, past the old 55% gate).
  // So VERIFY the answer with the model itself: crop a patch around the
  // proposed feet point and ask, cold, whether that surface is walkable
  // floor. A fresh call with no stake in the earlier answer says "counter"
  // when it's a counter.
  let box = await findFloorBox(ai, base, opts.placement);
  for (let attempt = 1; ; attempt++) {
    const feetX = Math.round(((box.xmin + box.xmax) / 2 / 1000) * OUT_W);
    const feetY = Math.round((box.ymax / 1000) * OUT_H);
    const half = 110;
    const left = Math.min(Math.max(0, feetX - half), OUT_W - half * 2);
    const top = Math.min(Math.max(0, feetY - half), OUT_H - half * 2);
    const patch = await sharp(base).extract({ left, top, width: half * 2, height: half * 2 }).toBuffer();
    const check: any = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [
        { inlineData: { data: patch.toString("base64"), mimeType: "image/png" } },
        { text: `The exact CENTER of this crop is a proposed spot for a person's feet. Is the surface at the center WALKABLE FLOOR (wood, tile, carpet, rug, deck)? Answer ONLY JSON: {"floor":true|false,"surface":"<what it is>"}` },
      ]}],
    });
    const ct = check?.candidates?.[0]?.content?.parts?.find((q: any) => q?.text)?.text || "";
    const cj = (() => { try { return JSON.parse((ct.match(/\{[\s\S]*\}/) || ["{}"])[0]); } catch { return {}; } })();
    if (cj.floor === true) break;
    if (attempt >= 3) throw new Error(`no walkable floor point found in 3 tries (last surface: ${cj.surface || "unknown"})`);
    box = await findFloorBox(
      ai, base,
      opts.placement + ` PREVIOUS ATTEMPT WAS WRONG: the feet landed on ${cj.surface || "a counter"}, not floor. Choose a spot on the visible WALKABLE FLOOR (wood/tile/rug at ground level), lower in the frame.`
    );
  }


  // 2-4. Figure -> key -> plant -> residue gate, retaken as a UNIT: every
  // stage can fail for take-level reasons (gradient backdrop, clipped feet,
  // shaded prop), and a failure at any of them means "roll again", not "die".
  let lastErr = "";
  for (let take = 1; take <= 3; take++) {
    try {
      return await attemptComposite(ai, base, headshot, box, opts, WARDROBE_TEXT[opts.wardrobe || "business_professional"]);
    } catch (e: any) { lastErr = e.message; }
  }
  throw new Error("composite failed after 3 takes: " + lastErr);
}

async function attemptComposite(
  ai: GoogleGenAI,
  base: Buffer,
  headshot: Buffer,
  box: { ymin: number; xmin: number; ymax: number; xmax: number; lighting: string },
  opts: { placement: string; poseDirection: string },
  wardrobe: string
): Promise<CompositeResult> {
  // CONTACT POSES ARE NOT COMPOSITABLE. "Resting", "leaning", "seated" make
  // the figure model fabricate the furniture being touched — measured twice: a
  // magenta countertop, then a mauve island, both fused to an otherwise
  // perfect figure. Those poses need real furniture pixels, which only the
  // edit path has. Refuse loudly so the caller routes them there.
  if (/(rest|lean|seat|sitting|perch)/i.test(opts.poseDirection)) {
    throw new Error("contact pose — route to the edit path (composite fabricates support furniture)");
  }
  // poseDirection must be pure posture/expression (the POSTURE_VARIATIONS
  // vocabulary). Location language lives in `placement` and is used ONLY for
  // the floor box — the figure model draws any furniture it hears about.
  const bodyOnlyPose = opts.poseDirection
    .replace(/(at|behind|beside|near|on|against)s+(thes+)?(kitchens+)?(counter(top)?|island|rail(ing)?|bar|table|sofa|couch|chair|fireplace|mantel|desk|bed|lounger|deck)[^.,;]*/gi, "")
    .replace(/s{2,}/g, " ")
    .trim() || "standing relaxed, weight on one leg, hands at their sides";
  const figureRaw = await generateFigure(ai, box.lighting, headshot, bodyOnlyPose, wardrobe);
  // Purpose-built person matting first (hair-accurate, backdrop-agnostic);
  // the flood-fill keyer stays as fallback if the model can't load.
  let cutout: Buffer, trim: sharp.Region;
  try {
    const blob = await removeBackground(new Blob([figureRaw]), { output: { format: "image/png" } });
    const matted = Buffer.from(await blob.arrayBuffer());
    const { data: md, info: mi } = await sharp(matted).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let minX = mi.width, minY = mi.height, maxX = 0, maxY = 0, kept = 0;
    for (let idx = 0; idx < mi.width * mi.height; idx++) {
      if (md[idx * 4 + 3] > 24) {
        kept++;
        const x = idx % mi.width, y = (idx / mi.width) | 0;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    if (kept < mi.width * mi.height * 0.04) throw new Error("matting kept too little");
    cutout = matted;
    trim = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
  } catch {
    ({ cutout, trim } = await keyGreen(figureRaw));
  }
  // A lone standing figure is tall and narrow. Width approaching height means
  // the model attached furniture the keying couldn't remove (measured: a mauve
  // island fused to the figure at w/h 1.1). Bad take — roll again.
  if (trim.width / trim.height > 0.62) {
    throw new Error(`figure too wide (w/h ${(trim.width / trim.height).toFixed(2)}) — likely attached furniture`);
  }

  // 4. Plant: scale so figure height matches the box, feet on the box bottom.
  const boxPx = {
    x: Math.round((box.xmin / 1000) * OUT_W),
    y: Math.round((box.ymin / 1000) * OUT_H),
    w: Math.round(((box.xmax - box.xmin) / 1000) * OUT_W),
    h: Math.round(((box.ymax - box.ymin) / 1000) * OUT_H),
  };
  // HEIGHT FROM DEPTH, not from the vision box. The feet line encodes
  // distance — feet lower in frame means closer to camera means taller in
  // frame. The box height both over-shot (a ten-foot agent) and under-shot
  // ("a little short" in review); this mapping is monotonic and stable:
  // feet at 62% of frame height → ~0.38·H, feet at the bottom edge → ~0.62·H.
  const feetFrac = (boxPx.y + boxPx.h) / OUT_H;
  const t = Math.min(Math.max((feetFrac - 0.62) / 0.38, 0), 1);
  const depthH = Math.round(OUT_H * (0.38 + 0.24 * t));
  const scale = depthH / trim.height;
  const figW = Math.max(1, Math.round(trim.width * scale));
  const figH = Math.max(1, Math.round(trim.height * scale));
  const left = Math.min(Math.max(0, boxPx.x + Math.round((boxPx.w - figW) / 2)), OUT_W - figW);
  const top = Math.min(Math.max(0, boxPx.y + boxPx.h - figH), OUT_H - figH);
  // (feet stay at boxPx.y + boxPx.h regardless of the clamp above)

  const figure = await sharp(cutout).extract(trim).resize(figW, figH).png().toBuffer();

  // Soft contact shadow: an ellipse under the feet, blurred. Cheap, but its
  // absence is what makes composites float.
  const shW = Math.round(figW * 0.9), shH = Math.max(8, Math.round(figH * 0.05));
  const shadow = await sharp(
    Buffer.from(
      `<svg width="${shW}" height="${shH * 3}"><ellipse cx="${shW / 2}" cy="${shH * 1.5}" rx="${shW / 2}" ry="${shH}" fill="black" fill-opacity="0.35"/></svg>`
    )
  ).blur(6).png().toBuffer();

  const png = await sharp(base)
    .composite([
      { input: shadow, left: left + Math.round((figW - shW) / 2), top: top + figH - shH * 2 },
      { input: figure, left, top },
    ])
    .png()
    .toBuffer();

  // Residue check: magenta anywhere in the finished image means the key missed
  // a prop or blob. Listing photos contain no vivid magenta, so any hit is ours.
  {
    const { data: fin, info: fi } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    let magenta = 0;
    for (let i = 0; i < fin.length; i += fi.channels) {
      if (fin[i] - fin[i + 1] > 55 && fin[i + 2] - fin[i + 1] > 55) magenta++;
    }
    if (magenta > 400) throw new Error("magenta residue in composite (" + magenta + " px) — bad take");
  }

  return { png, box: { x: left, y: top, w: figW, h: figH }, placement: opts.placement };
}
