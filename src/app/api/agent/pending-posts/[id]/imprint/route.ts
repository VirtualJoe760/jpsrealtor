// POST /api/agent/pending-posts/[id]/imprint
//
// Fix ONE slide in place, rather than declining the whole post.
//
// The agent looks at a slide, says what is wrong with it — "put me on the rug",
// "different posture from slide 2", "there's a blank strip at the bottom" — and
// this regenerates that slide with Gemini, carrying the full staging guidelines
// plus their correction, verifies the result, and swaps it in.
//
// WHY THIS EXISTS: declining threw away seven good slides to fix one bad one,
// and the feedback only reached the pipeline by being retyped into a chat
// window. A post is rarely wholly wrong; it is usually slide 2.
//
// The correction is appended AFTER the preservation rules and explicitly cannot
// override them (see buildStagingPrompt). "Move me onto the rug" must not be
// read as permission to repaint the floor.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";
import { v2 as cloudinary } from "cloudinary";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import PendingPost from "@/models/PendingPost";
import User from "@/models/User";
import UnifiedListing from "@/models/unified-listing";
import { buildStagingPrompt } from "@/lib/content/staging-prompt";
import { verifyStagedPhoto } from "@/lib/content/verify-staged-photo";

export const maxDuration = 300;

const NO_STORE = { "Cache-Control": "no-store" };

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function bad(error: string, message: string, status = 400) {
  return NextResponse.json({ error, message }, { status, headers: NO_STORE });
}

async function b64(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch failed ${r.status}`);
  const buf = await r.arrayBuffer();
  const ct = r.headers.get("content-type") || "";
  return {
    data: Buffer.from(buf).toString("base64"),
    mimeType: ct.startsWith("image/") ? ct : "image/jpeg",
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  if (!process.env.GEMINI_API_KEY) {
    return bad("gemini_not_configured", "GEMINI_API_KEY is not set.", 500);
  }

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return bad("validation_failed", "Bad post id.");

  let body: any;
  try {
    body = await request.json();
  } catch {
    return bad("invalid_json", "Body must be JSON.");
  }

  const slideN = Number(body.slideN);
  const correction = String(body.correction || "").trim();
  if (!Number.isInteger(slideN)) return bad("validation_failed", "slideN is required.");
  if (!correction) return bad("validation_failed", "Tell it what to change.");

  await dbConnect();

  const post: any = await PendingPost.findOne({
    _id: new mongoose.Types.ObjectId(id),
    agentId: new mongoose.Types.ObjectId(session.user.id),
  });
  if (!post) return bad("not_found", "Post not found.", 404);
  if (post.status === "posted") return bad("already_posted", "This post is already live.", 409);

  const slide = (post.slides || []).find((s: any) => s.n === slideN);
  if (!slide) return bad("not_found", `No slide ${slideN} on this post.`, 404);
  if (slide.kind !== "room") {
    return bad(
      "not_imprintable",
      `Slide ${slideN} is a ${slide.kind} slide — only staged room photos are regenerated this way. Text and cover copy is edited on the post itself.`
    );
  }

  // The ORIGINAL listing photo, not the staged one. Re-staging an already
  // staged image compounds whatever the first pass got wrong.
  const slotIndex = (post.slides || [])
    .filter((s: any) => s.kind === "room")
    .findIndex((s: any) => s.n === slideN);
  const photoIndex = post.generation?.photoIndexes?.[slotIndex];
  if (photoIndex === undefined) {
    return bad("no_source", "This slide has no recorded source photo, so it can't be regenerated.");
  }

  const listing: any = await UnifiedListing.collection.findOne(
    { listingKey: post.listingKey },
    { projection: { media: 1 } }
  );
  const photoUrls: string[] = (listing?.media || [])
    .map((m: any) => m.MediaURL || m.uri2048 || m.url)
    .filter(Boolean);
  const originalUrl = photoUrls[photoIndex];
  if (!originalUrl) return bad("no_source", "Original listing photo is unavailable.");

  const userDoc: any = await User.findById(session.user.id).select("agentProfile").lean();
  const headshotUrl = userDoc?.agentProfile?.headshot;
  if (!headshotUrl) return bad("no_headshot", "No headshot on your profile.");

  const placement =
    post.generation?.poses?.[slotIndex] || "standing naturally in the middle of the room";

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const [src, head] = await Promise.all([b64(originalUrl), b64(headshotUrl)]);

    const res: any = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: src.data, mimeType: src.mimeType } },
            { inlineData: { data: head.data, mimeType: head.mimeType } },
            { text: buildStagingPrompt({ placement, variationIndex: slotIndex, correction }) },
          ],
        },
      ],
      config: { imageConfig: { aspectRatio: "4:5", imageSize: "2K" } },
    });

    const img = (res?.candidates?.[0]?.content?.parts || []).find((p: any) => p?.inlineData?.data);
    if (!img) return bad("no_image", "Gemini returned no image. Try rewording the change.", 502);

    const up = await cloudinary.uploader.upload(
      `data:image/png;base64,${img.inlineData.data}`,
      { folder: `jpsrealtor/pending/${post.listingKey}/imprint` }
    );

    // Same gate as the batch pipeline — a correction is not a reason to skip QC.
    const v = await verifyStagedPhoto({ originalUrl, stagedUrl: up.secure_url });
    if (!v.pass) {
      await cloudinary.uploader.destroy(up.public_id).catch(() => {});
      return NextResponse.json(
        {
          ok: false,
          rejected: true,
          message:
            "That take altered the room, so it was discarded. Try again — the model samples differently each time.",
          changes: v.changes,
        },
        { headers: NO_STORE }
      );
    }

    // Drop the old asset only after the replacement is confirmed good.
    const oldPublicId = slide.publicId;
    slide.url = up.secure_url;
    slide.publicId = up.public_id;
    post.generation.attempt = (post.generation.attempt || 1) + 1;
    post.slideFeedback = [
      ...(post.slideFeedback || []).filter((f: any) => f.n !== slideN),
      { n: slideN, note: correction },
    ];
    await post.save();
    if (oldPublicId) await cloudinary.uploader.destroy(oldPublicId).catch(() => {});

    return NextResponse.json(
      { ok: true, slideN, url: up.secure_url, notes: v.notes || [] },
      { headers: NO_STORE }
    );
  } catch (err: any) {
    console.error("[imprint]", err);
    return bad("imprint_failed", err?.message || "Regeneration failed.", 502);
  }
}
