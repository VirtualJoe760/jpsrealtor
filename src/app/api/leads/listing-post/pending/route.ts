// POST /api/leads/listing-post/pending
// Body: { slug, openHouseChoice?, wantsComps?, consent }
//
// Step 1 of registering with Google or Facebook.
//
// The provider round trip leaves our site, so everything the visitor chose on
// the gate has to be held somewhere that survives it. This validates the
// choice, records the exact consent text with its IP, and parks it in a signed
// 15-minute cookie. The client then calls signIn(provider, { callbackUrl }),
// and /api/leads/listing-post/complete picks it up on the way back.
//
// Consent is captured HERE, before the redirect, and never inferred from a
// successful OAuth return — clicking a Google button is not agreement to be
// emailed, called or texted by an estate agent.
//
// Public (PUBLIC_API_EXACT in src/proxy.ts): the visitor has no session yet,
// that being the point. Rate-limited like the form it sits beside; no Turnstile,
// because this writes nothing to the database and the provider's own flow plus
// the complete route's checks are what stand between this and a contact record.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Article from "@/models/article";
import { clientIp } from "@/lib/turnstile";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  LP_PENDING_COOKIE,
  mintPending,
  pendingCookieOptions,
} from "@/lib/listings/listing-post-pending";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

/** Stored verbatim on the contact, so what they agreed to is auditable later. */
export const SOCIAL_CONSENT_TEXT =
  "I agree to be contacted by this agent about this property and my home search, " +
  "including follow-up email. Registered with a Google or Facebook account.";

function bad(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status, headers: NO_STORE });
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req) || "unknown";
    const limit = checkRateLimit(`lp-pending:ip:${ip}`, { max: 10, windowMs: 60 * 60 * 1000 });
    if (!limit.ok) return bad(limit.error || "Too many attempts. Please try again later.", limit.status || 429);

    const body = await req.json().catch(() => null);
    if (!body?.slug) return bad("Missing post.");

    // Consent is not optional and not implied. Without it there is nothing to
    // carry, so we refuse before the visitor is sent to a provider.
    if (body.consent !== true) return bad("Please agree to be contacted before continuing.");

    await dbConnect();
    const post: any = await Article.findOne({ slug: String(body.slug), category: "listing-post" })
      .select("slug author.id listingPost.postType")
      .lean();
    if (!post?.author?.id) return bad("Post not found.", 404);

    const token = mintPending({
      slug: String(post.slug),
      agentId: String(post.author.id),
      openHouseChoice: body.openHouseChoice ? String(body.openHouseChoice).slice(0, 120) : undefined,
      wantsComps: body.wantsComps === true,
      consentText: SOCIAL_CONSENT_TEXT,
      consentIp: ip,
    });
    if (!token) return bad("Social registration is unavailable right now.", 503);

    const res = NextResponse.json({ success: true }, { headers: NO_STORE });
    res.cookies.set(LP_PENDING_COOKIE, token, pendingCookieOptions);
    return res;
  } catch (err) {
    console.error("[leads/listing-post/pending] Error:", err);
    return bad("Could not start registration.", 500);
  }
}
