// src/app/api/skill/instagram/carousel/route.ts
//
// POST → publish a 2-10 image carousel to the authenticated agent's
// Instagram Business Account.
//
// Auth: crt_live_ token with the `social:post` scope.
// Rate tier: write (matches /campaigns/draft, lower than send-money tier).
//
// Three-step Meta Graph API dance:
//   1. POST /{ig-user-id}/media per image — creates a child container.
//   2. POST /{ig-user-id}/media with media_type=CAROUSEL + children — parent.
//   3. POST /{ig-user-id}/media_publish with creation_id — publish.
//
// IG requirements (Meta docs):
//   - 2-10 images per carousel
//   - All images must be publicly fetchable HTTPS URLs (Cloudinary, Spark CDN, etc.)
//   - Caption ≤ 2200 chars
//   - JPEG/PNG only
//
// Returns:
//   { ok: true, postId: "17841...", permalink: "https://www.instagram.com/p/..." }
// or:
//   { error: "...", message: "...", details: { step, response } }

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";

const NO_STORE = { "Cache-Control": "no-store" };
const META_API_VERSION = "v21.0";
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;
const MAX_IMAGES = 10;
const MIN_IMAGES = 2;
const MAX_CAPTION = 2200;

type IgError = { error: string; message: string; details?: unknown };

function bad(error: string, message: string, status = 400, details?: unknown): NextResponse {
  return NextResponse.json({ error, message, details } as IgError, { status, headers: NO_STORE });
}

async function graphPost(path: string, params: Record<string, string>): Promise<any> {
  const body = new URLSearchParams(params);
  const res = await fetch(`${META_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.error?.message || `Graph API ${res.status}`);
    (err as any).response = json;
    (err as any).status = res.status;
    throw err;
  }
  return json;
}

async function graphGet(path: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${META_BASE}${path}?${qs}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.error?.message || `Graph API ${res.status}`);
    (err as any).response = json;
    (err as any).status = res.status;
    throw err;
  }
  return json;
}

export async function POST(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "social:post");
  if (denied) return denied;
  if (auth.ok === false) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  }
  const rl = skillRateLimit(auth, "write");
  if (rl) return rl;

  // ---- Body ----
  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("invalid_json", "Body must be valid JSON.");
  }

  const imageUrls: unknown = body.imageUrls;
  const caption = String(body.caption ?? "").trim();

  if (!Array.isArray(imageUrls)) {
    return bad("validation_failed", "imageUrls must be an array.");
  }
  if (imageUrls.length < MIN_IMAGES || imageUrls.length > MAX_IMAGES) {
    return bad(
      "validation_failed",
      `imageUrls must be ${MIN_IMAGES}-${MAX_IMAGES} entries (got ${imageUrls.length}).`
    );
  }
  for (const u of imageUrls) {
    if (typeof u !== "string" || !u.startsWith("https://")) {
      return bad("validation_failed", `All image URLs must be HTTPS strings. Bad entry: ${u}`);
    }
  }
  if (caption.length > MAX_CAPTION) {
    return bad("validation_failed", `caption is ${caption.length} chars; max is ${MAX_CAPTION}.`);
  }

  // ---- Resolve creds + IG business account ----
  await dbConnect();
  const userDoc: any = await User.findById(auth.user._id).select("adAccounts").lean();
  const meta = userDoc?.adAccounts?.meta;
  const token: string | undefined = meta?.pageAccessToken || meta?.accessToken;
  const pageId: string | undefined = meta?.pageId;
  if (!token || !pageId) {
    return bad(
      "meta_not_connected",
      "Connect Meta Ads in Settings → Integrations first.",
      400
    );
  }

  let igUserId: string;
  try {
    const page: any = await graphGet(`/${pageId}`, {
      fields: "instagram_business_account",
      access_token: token,
    });
    if (!page?.instagram_business_account?.id) {
      return bad(
        "no_ig_business_account",
        "Your Facebook Page has no Instagram Business Account linked. Link one in IG → Settings → Linked Accounts.",
        400
      );
    }
    igUserId = page.instagram_business_account.id;
  } catch (err: any) {
    return bad(
      "meta_graph_error",
      err?.message || "Failed to resolve Instagram Business Account.",
      502,
      { step: "resolve_ig_account", response: err?.response }
    );
  }

  // ---- Step 1: child containers (parallel) ----
  let childIds: string[];
  try {
    childIds = await Promise.all(
      (imageUrls as string[]).map(async (url) => {
        const r = await graphPost(`/${igUserId}/media`, {
          image_url: url,
          is_carousel_item: "true",
          access_token: token,
        });
        if (!r?.id) throw new Error(`Child container returned no id for ${url}`);
        return r.id;
      })
    );
  } catch (err: any) {
    return bad(
      "child_container_failed",
      err?.message || "One or more image containers failed to create.",
      502,
      { step: "create_child", response: err?.response }
    );
  }

  // ---- Step 2: carousel parent container ----
  let parentId: string;
  try {
    const r = await graphPost(`/${igUserId}/media`, {
      media_type: "CAROUSEL",
      children: childIds.join(","),
      caption,
      access_token: token,
    });
    if (!r?.id) throw new Error("Parent container returned no id");
    parentId = r.id;
  } catch (err: any) {
    return bad(
      "parent_container_failed",
      err?.message || "Failed to create the carousel container.",
      502,
      { step: "create_parent", response: err?.response }
    );
  }

  // ---- Step 3: publish ----
  let postId: string;
  try {
    const r = await graphPost(`/${igUserId}/media_publish`, {
      creation_id: parentId,
      access_token: token,
    });
    if (!r?.id) throw new Error("Publish returned no id");
    postId = r.id;
  } catch (err: any) {
    return bad(
      "publish_failed",
      err?.message || "Failed to publish the carousel.",
      502,
      { step: "publish", parentId, response: err?.response }
    );
  }

  // Best-effort permalink fetch — non-blocking on failure.
  let permalink: string | null = null;
  try {
    const r = await graphGet(`/${postId}`, {
      fields: "permalink",
      access_token: token,
    });
    permalink = r?.permalink || null;
  } catch {
    // ignore — post is already published successfully
  }

  return NextResponse.json(
    {
      ok: true,
      postId,
      permalink,
      imageCount: childIds.length,
      captionLength: caption.length,
    },
    { headers: NO_STORE }
  );
}
