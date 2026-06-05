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

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_PHOTOS = 10;
const DEFAULT_PHOTOS = 5;

const DEFAULT_PROMPT = `Place the real-estate agent shown in the second image naturally into the home shown in the first image. The agent should appear professional, confident, and at ease — like they're showing the home to a prospective buyer. Position them realistically in the scene (standing in the space, walking through, or gesturing toward a key feature). Match the lighting direction, color temperature, and perspective. Apply a subtle warm color grade and slight contrast lift for a magazine-quality real-estate look distinct from the original photo. Keep every architectural detail, finish, and fixture in the home exactly as shown. Output: polished real-estate marketing photo in portrait orientation, no text overlays.`;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function bad(error: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error, message, details }, { status, headers: NO_STORE });
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

  // Fetch the listing photo URLs from the existing photos endpoint.
  // (Public route — fetches Spark in real time with hourly cache.)
  const photosRes = await fetch(`${req.nextUrl.origin}/api/listings/${encodeURIComponent(listingKey)}/photos`);
  if (!photosRes.ok) {
    return bad("listing_photos_unavailable", `Could not fetch photos for ${listingKey}`, 404);
  }
  const photosData: any = await photosRes.json();
  const photos: any[] = (photosData.photos || []).slice(0, count);
  if (photos.length === 0) {
    return bad("no_photos", "Listing has no photos to generate from.");
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
                { text: prompt },
              ],
            },
          ],
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

        // Upload to Cloudinary at 4:5 portrait (IG carousel-optimal).
        const upload = await cloudinary.uploader.upload(
          `data:${generatedMime};base64,${generatedBase64}`,
          {
            folder: `jpsrealtor/ai-staged/${listingKey}`,
            public_id: `${Date.now()}-${i}`,
            transformation: [
              { aspect_ratio: "4:5", crop: "fill", gravity: "auto", width: 1080 },
              { quality: "auto:good", fetch_format: "auto" },
            ],
          }
        );

        return {
          index: i,
          originalUrl: listingUrl,
          stagedUrl: upload.secure_url,
          publicId: upload.public_id,
          width: upload.width,
          height: upload.height,
        };
      } catch (err: any) {
        return {
          index: i,
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
