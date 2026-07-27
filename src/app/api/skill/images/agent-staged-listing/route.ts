// src/app/api/skill/images/agent-staged-listing/route.ts
//
// POST → generate AI-composed marketing images of the agent inside a
// listing's photos using Gemini 2.5 Flash Image (the model commonly
// nicknamed "Nano Banana").
//
// Flow:
//   1. Fetch the agent's headshot from agentProfile.headshot
//   2. Fetch up to {count} listing photos via the existing photos route
//   3. For each photo, send (listing photo, headshot, prompt) to Gemini
//   4. Receive a generated image with the agent composed into the scene
//   5. Upload each to Cloudinary at 4:5 portrait (IG carousel-optimal)
//   6. Return Cloudinary URLs for the agent to review before posting
//
// Auth: crt_live_ token with `landing_pages:write` (reused; the underlying
// action — generating real-estate marketing content — sits in the same
// risk tier as drafting an LP). Rate tier: write.
//
// Cost: ~$0.04/image at current Gemini pricing. A 10-image carousel
// costs ~$0.40 and takes ~30s end-to-end depending on parallelism.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import { GoogleGenAI } from "@google/genai";
import { v2 as cloudinary } from "cloudinary";

// This route makes up to MAX_PHOTOS Gemini image-generation calls plus a
// Cloudinary upload each. Without an explicit budget it inherits Vercel's
// short default and returns 504 before Gemini finishes -- which it did, on a
// 4-photo request, while the tool advertised "~30 seconds for 10 photos".
// The work is inherently slow; the timeout has to say so.
export const maxDuration = 300;

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_PHOTOS = 10;
const DEFAULT_PHOTOS = 5;

// WHY THIS PROMPT IS SO PRESCRIPTIVE
// ---------------------------------
// The source headshot is a studio head-and-shoulders cutout. Given a loose
// instruction, the model COMPOSITES that cutout rather than re-rendering the
// person into the room: every output came back with the identical three-quarter
// stance and the same palm-up gesture, lit with the studio's flat frontal light
// regardless of whether the scene was noon or dusk, cropped mid-thigh so there
// were no feet to anchor scale — which is why the agent floated at arbitrary
// size, sometimes half the frame, sometimes standing on a roof.
//
// Each clause below counters a specific observed failure. Do not soften them
// into "position them realistically" — that is what produced the sticker look.
// PRESERVATION IS THE FIRST REQUIREMENT, NOT THE LAST.
//
// The previous prompt caused the damage it was trying to prevent. It opened
// with "re-render ... generate the person afresh", which frames the whole task
// as generation; it asked for "portrait orientation" from a landscape source,
// which forces the model to reframe and therefore to invent; and it asked for
// "a subtle warm grade and slight contrast lift", which is an explicit
// instruction to modify every pixel. Measured result on Ridge Road: terracotta
// saltillo tile came back as hardwood, a pot rack vanished, rugs and sofas were
// replaced. All while the prompt also said "change nothing about the property".
//
// This version states the constraint first, in the language of EDITING, and
// gives the model an explicit out (return the image unchanged) so it is never
// cornered into repainting the room to satisfy the request.
const BASE_PROMPT = `You are EDITING an existing photograph. You are not creating a new one.

Return the FIRST image with exactly ONE change: a person has been added to the scene.

EVERYTHING ELSE MUST BE IDENTICAL TO THE INPUT PHOTOGRAPH. This is the most important requirement and overrides every other instruction:
- Do NOT change the framing, the crop, or the camera position. Same viewpoint, same composition.
- Do NOT change the FLOORING. Tile stays tile, wood stays wood, and the exact colour and pattern stay the same.
- Do NOT change, move, add, remove or restyle ANY furniture, rug, cushion, artwork or decor.
- Do NOT change any fixture: lights, fans, pot racks, hardware, cabinetry, counters, backsplash, railings.
- Do NOT change walls, ceilings, windows, doors, stairs, or any architecture.
- Do NOT re-light, re-colour, re-grade, sharpen, or "improve" the photograph in any way.
- Do NOT tidy, stage, declutter or redecorate. If something looks worn or oddly placed, leave it exactly as it is.

Every pixel that is not the added person, their shadow, or what their body occludes must match the input exactly.

IF YOU CANNOT ADD THE PERSON WITHOUT ALTERING THE ROOM, RETURN THE PHOTOGRAPH UNCHANGED. An unchanged photo is a correct answer. An altered room is not.

THE PERSON TO ADD — take their face and identity from the SECOND image:
- Full body, head to feet, both feet visibly in contact with the floor. Never cropped at the waist, never floating.
- Realistic adult height, about 5'10". Check them against real references already in the frame: door openings, counter height, chair backs.
- Standing IN the space, correctly occluded by anything in front of them. Not a foreground overlay.
- Lit by the room's own light — same direction, colour temperature and softness as the scene — with a believable contact shadow on the floor.
- Eye level consistent with the photograph's existing perspective.
- Match the face exactly: hair colour and texture, face shape, jawline, skin tone. Do not idealize, smooth or slim them.
- Dark grey suit jacket over a light blue collared shirt, no tie.

No text, watermarks or graphics.`;

// Per-photo direction. Sending one identical prompt to every photo produced
// four slides of the same man in the same pose, which reads as a template
// rather than a walkthrough. scripts/data/carousels/*.js always carried `pose`
// and `expression` per room; this restores that for the hosted path by cycling
// distinct staging directions across the batch.
const POSE_VARIATIONS: string[] = [
  "Standing a few steps into the room, body angled toward the camera, one hand gesturing openly toward the room's main feature. Warm, welcoming expression.",
  "Walking through the space, caught mid-stride and looking off toward a window or focal point rather than at the camera. Relaxed, candid, not posed.",
  "Standing further back near a wall or doorway with hands relaxed at their sides or one in a pocket, looking at the camera with a calm, confident half-smile.",
  "Standing beside a key feature — an island, fireplace, or railing — with one hand resting lightly on it, turned three-quarters to the camera.",
  "Standing near the far side of the room looking back toward the camera, giving a clear sense of the room's depth and scale.",
];

/**
 * Compose the per-photo instruction.
 *
 * `placement` is a specific, photo-aware direction decided by looking at THAT
 * frame — "standing on the rug between the orange armchair and the coffee
 * table, facing the camera". It names objects that are actually visible, which
 * both anchors the person somewhere real and gives the model concrete
 * geometry instead of a generic pose it has to invent a spot for.
 *
 * The POSE_VARIATIONS rotation is only the fallback for callers that did not
 * look first. It cycles so a batch does not repeat one stance, but it cannot
 * know what is in the frame.
 */
function promptForIndex(base: string, placement: string | undefined, i: number): string {
  const direction = placement?.trim() || POSE_VARIATIONS[i % POSE_VARIATIONS.length];
  return `${base}\n\nWHERE TO PUT THEM IN THIS SPECIFIC PHOTOGRAPH: ${direction}`;
}

const DEFAULT_PROMPT = BASE_PROMPT;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function bad(error: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error, message, details }, { status, headers: NO_STORE });
}

// Hosts we serve legitimate agent headshots from. Cloudinary is where the
// Settings → Profile uploader stores headshots (folder jpsrealtor/headshots);
// lh3.googleusercontent.com covers Google-auth profile photos.
const HEADSHOT_HOST_ALLOWLIST = new Set([
  "res.cloudinary.com",
  "lh3.googleusercontent.com",
]);

// SSRF guard for the caller-supplied headshotUrl. Only https URLs whose
// hostname is on the allowlist are permitted, and we defensively reject
// internal/private/link-local targets (in case the allowlist ever grows to
// cover a host that resolves internally, or a literal IP slips through).
function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, ""); // strip IPv6 brackets
  if (
    h === "localhost" ||
    h === "0.0.0.0" ||
    h === "::1" ||
    h === "::" ||
    h.endsWith(".localhost") ||
    h.endsWith(".internal") ||
    h.endsWith(".local")
  ) {
    return true;
  }
  // IPv4-mapped IPv6 (e.g. ::ffff:169.254.169.254) — pull out the v4 tail.
  const mapped = h.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  const ipv4 = mapped ? mapped[1] : (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(h) ? h : null);
  if (ipv4) {
    const o = ipv4.split(".").map(Number);
    if (o.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    if (o[0] === 127) return true;                                   // 127.0.0.0/8 loopback
    if (o[0] === 10) return true;                                    // 10.0.0.0/8 private
    if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return true;       // 172.16.0.0/12 private
    if (o[0] === 192 && o[1] === 168) return true;                   // 192.168.0.0/16 private
    if (o[0] === 169 && o[1] === 254) return true;                   // 169.254.0.0/16 link-local (cloud metadata)
    if (o[0] === 0) return true;                                     // 0.0.0.0/8
    return true; // any bare IP literal is not an expected headshot host
  }
  // Bare IPv6 literals (anything with a colon that wasn't a mapped v4) — block.
  if (h.includes(":")) return true;
  return false;
}

function validateHeadshotUrl(raw: string): { ok: true; url: string } | { ok: false; message: string } {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, message: "headshotUrl is not a valid URL." };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, message: "headshotUrl must be an https URL." };
  }
  if (isBlockedHostname(parsed.hostname)) {
    return { ok: false, message: "headshotUrl points at a disallowed (internal/private) host." };
  }
  if (!HEADSHOT_HOST_ALLOWLIST.has(parsed.hostname.toLowerCase())) {
    return {
      ok: false,
      message: `headshotUrl host is not allowed. Allowed image hosts: ${[...HEADSHOT_HOST_ALLOWLIST].join(", ")}.`,
    };
  }
  return { ok: true, url: parsed.toString() };
}

async function fetchAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Image fetch failed (${r.status}): ${url}`);
  const buf = await r.arrayBuffer();
  const contentType = r.headers.get("content-type") || "";
  const mimeType =
    contentType.startsWith("image/") ? contentType :
    url.toLowerCase().endsWith(".png") ? "image/png" :
    "image/jpeg";
  return { base64: Buffer.from(buf).toString("base64"), mimeType };
}

export async function POST(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "landing_pages:write");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rl = skillRateLimit(auth, "write");
  if (rl) return rl;

  if (!process.env.GEMINI_API_KEY) {
    return bad("gemini_not_configured", "GEMINI_API_KEY not set in env.", 500);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("invalid_json", "Body must be JSON.");
  }

  const listingKey = String(body.listingKey || "").trim();
  if (!listingKey) return bad("validation_failed", "listingKey is required.");

  const count = Math.min(MAX_PHOTOS, Math.max(1, Number(body.count) || DEFAULT_PHOTOS));
  const prompt = String(body.prompt || "").trim() || DEFAULT_PROMPT;
  const headshotOverride = String(body.headshotUrl || "").trim();

  // WHICH photos to stage. Without this the route took the first N, and the
  // compositing quality depends heavily on the shot: an INTERIOR room gives the
  // model a floor plane and human-scale reference and comes back excellent,
  // while an AERIAL or distant exterior has neither and comes back with a giant
  // agent floating over a hillside. Feeds commonly lead with aerials -- on
  // 53806 Ridge Road the first three were drone shots, so 3 of 4 results were
  // unusable. Callers pick interiors instead.
  const photoIndexes: number[] | null = Array.isArray(body.photoIndexes)
    ? body.photoIndexes
        .map((n: any) => Number(n))
        .filter((n: number) => Number.isInteger(n) && n >= 0)
        .slice(0, MAX_PHOTOS)
    : null;

  // Per-photo placement, positionally aligned with photoIndexes. The caller is
  // expected to have LOOKED at each frame and said where the person belongs in
  // it, naming things actually visible there. Without this the route falls back
  // to a generic pose rotation that knows nothing about the picture.
  const placements: string[] = Array.isArray(body.placements)
    ? body.placements.map((p: any) => String(p || "").trim())
    : [];
  if (photoIndexes && photoIndexes.length === 0) {
    return bad("validation_failed", "photoIndexes must contain at least one non-negative integer index.");
  }

  await dbConnect();

  // Resolve agent headshot (allow override for testing alt photos)
  let headshotUrl = headshotOverride;
  if (!headshotUrl) {
    const userDoc: any = await User.findById(auth.user._id).select("agentProfile").lean();
    headshotUrl = userDoc?.agentProfile?.headshot;
    if (!headshotUrl) {
      return bad(
        "no_headshot",
        "Agent profile has no headshot URL. Set it in Settings → Profile, or pass a headshotUrl in the request.",
      );
    }
  }

  // SSRF guard: only fetch headshots from allowlisted image hosts, never
  // internal/private targets. Applies to both caller overrides and stored
  // profile URLs before the server-side fetch below.
  const headshotCheck = validateHeadshotUrl(headshotUrl);
  if (headshotCheck.ok === false) {
    return bad("invalid_headshot_url", headshotCheck.message);
  }
  headshotUrl = headshotCheck.url;

  // Fetch the listing photo URLs from the existing photos endpoint.
  // (Public route — fetches Spark in real time with hourly cache.)
  const photosRes = await fetch(`${req.nextUrl.origin}/api/listings/${encodeURIComponent(listingKey)}/photos`);
  if (!photosRes.ok) {
    return bad("listing_photos_unavailable", `Could not fetch photos for ${listingKey}`, 404);
  }
  const photosData: any = await photosRes.json();
  const allPhotos: any[] = photosData.photos || [];
  if (allPhotos.length === 0) {
    return bad("no_photos", "Listing has no photos to generate from.");
  }

  let photos: any[];
  if (photoIndexes) {
    const outOfRange = photoIndexes.filter((i) => i >= allPhotos.length);
    if (outOfRange.length) {
      return bad(
        "validation_failed",
        `photoIndexes out of range: ${outOfRange.join(", ")}. This listing has ${allPhotos.length} photos (0-${allPhotos.length - 1}).`
      );
    }
    // Preserve the caller's order — it becomes the carousel's room order.
    photos = photoIndexes.map((i, slot) => ({
      ...allPhotos[i],
      __index: i,
      __placement: placements[slot],
    }));
  } else {
    photos = allPhotos.slice(0, count).map((p, i) => ({
      ...p,
      __index: i,
      __placement: placements[i],
    }));
  }

  // Download the headshot once — used for every Gemini call.
  let headshotImg: { base64: string; mimeType: string };
  try {
    headshotImg = await fetchAsBase64(headshotUrl);
  } catch (e: any) {
    return bad("headshot_fetch_failed", e.message);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Generate in parallel — Gemini Image model is fast (~5s each).
  const t0 = Date.now();
  const results = await Promise.all(
    photos.map(async (photo: any, i: number) => {
      const listingUrl = photo.uri2048 || photo.uri1280 || photo.uri1024 || photo.uriLarge || photo.url;
      try {
        const listingImg = await fetchAsBase64(listingUrl);

        const response: any = await ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { data: listingImg.base64, mimeType: listingImg.mimeType } },
                { inlineData: { data: headshotImg.base64, mimeType: headshotImg.mimeType } },
                // Per-photo staging note, so a 4-room batch reads as a
                // walkthrough rather than the same pose four times.
                { text: promptForIndex(prompt, photo.__placement, i) },
              ],
            },
          ],
          // Ask the MODEL for Instagram's 4:5 at 2K, rather than generating at
          // whatever it likes and letting Cloudinary crop-fill to fit.
          // Cloudinary is storage; a gravity:auto crop there is an uncontrolled
          // second reframing of a photo we already care about preserving.
          config: {
            imageConfig: { aspectRatio: "4:5", imageSize: "2K" },
          },
        });

        // Pull the first image part out of the response.
        const parts: any[] = response?.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find((p: any) => p?.inlineData?.data);
        if (!imagePart) {
          const textPart = parts.find((p: any) => p?.text)?.text;
          throw new Error(
            "Gemini returned no image" + (textPart ? `: ${String(textPart).slice(0, 200)}` : "")
          );
        }
        const generatedBase64 = imagePart.inlineData.data;
        const generatedMime = imagePart.inlineData.mimeType || "image/png";

        // STORE AS GENERATED. Cloudinary is storage here, nothing more.
        //
        // This used to crop-fill to 4:5 with gravity:auto on upload, which was
        // a second, uncontrolled reframing of an image whose whole point is
        // that it matches the source photograph. The model is now asked for 4:5
        // directly, so there is nothing left to crop — and re-cropping a
        // correctly-framed image could only make it wrong.
        const upload = await cloudinary.uploader.upload(
          `data:${generatedMime};base64,${generatedBase64}`,
          {
            folder: `jpsrealtor/ai-staged/${listingKey}`,
            public_id: `${Date.now()}-${i}`,
          }
        );

        return {
          index: photo.__index ?? i,
          originalUrl: listingUrl,
          stagedUrl: upload.secure_url,
          publicId: upload.public_id,
          width: upload.width,
          height: upload.height,
        };
      } catch (err: any) {
        return {
          index: photo.__index ?? i,
          originalUrl: listingUrl,
          error: err?.message || String(err),
        };
      }
    })
  );

  const successes = results.filter((r: any) => r.stagedUrl);
  const failures = results.filter((r: any) => r.error);
  const tookMs = Date.now() - t0;

  return NextResponse.json(
    {
      listingKey,
      headshotUrl,
      requested: count,
      generated: successes.length,
      failed: failures.length,
      tookMs,
      photos: successes,
      ...(failures.length > 0 ? { errors: failures } : {}),
    },
    { headers: NO_STORE }
  );
}
