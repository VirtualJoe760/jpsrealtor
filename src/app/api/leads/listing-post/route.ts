// POST /api/leads/listing-post
// Body: { slug, firstName, lastName?, email, phone?, wantsComps?, consent, turnstileToken }
//
// Registration form on a CMS "listing blog post" (open house or general
// listing page). Public (PUBLIC_API_EXACT in src/proxy.ts) and guarded the
// same way as the buy/sell intake forms: Turnstile + 10/h per-IP rate limit.
//
// On submit:
//   1. Contact in the POST AUTHOR's CRM (the agent who published the post —
//      not the domain owner, which can differ for a public post shown on
//      another agent's domain).
//   2. A partial User: no password, emailVerified null. Never touches an
//      existing account.
//   3. "Complete your registration" email (renderBrandedEmail), linking to the
//      existing /auth/welcome token flow, plus recently sold comps from
//      unified_closed_listings when asked for.

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import Article from "@/models/article";
import User from "@/models/User";
import Contact from "@/models/Contact";
import VerificationToken from "@/models/verificationToken";
import { verifyTurnstile, clientIp } from "@/lib/turnstile";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveSignupOrigin } from "@/lib/signup-origin";
import { notifyAgentLead } from "@/lib/messaging/notify-agent";
import { sendListingPostRegistrationEmail } from "@/lib/email-resend";
import { findRecentSoldComparables } from "@/lib/listings/listing-post";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

function originFor(req: NextRequest): string {
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(",")[0].trim();
  if (!host) return process.env.NEXTAUTH_URL || "https://chatrealty.io";
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host) || host.endsWith(".localhost") || /\.localhost:\d+$/.test(host);
  return `${local ? "http" : "https"}://${host}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const slug = String(body.slug || "").trim();
    const firstName = String(body.firstName || "").trim().slice(0, 80);
    const lastName = String(body.lastName || "").trim().slice(0, 80);
    const email = String(body.email || "").trim().toLowerCase().slice(0, 200);
    const phone = String(body.phone || "").trim().slice(0, 40);
    const wantsComps = body.wantsComps === true;

    if (!slug) return bad("Missing post");
    if (!firstName || !EMAIL_RE.test(email)) return bad("Name and a valid email are required");
    if (body.consent !== true) return bad("Please agree to the communication terms to register");

    const ip = clientIp(req) || "unknown";
    const limit = checkRateLimit(`listing-post:ip:${ip}`, { max: 10, windowMs: 60 * 60 * 1000 });
    if (!limit.ok) {
      return NextResponse.json(
        { error: limit.error },
        { status: limit.status, headers: { ...NO_STORE, "Retry-After": String(limit.retryAfter) } }
      );
    }
    const captcha = await verifyTurnstile(body.turnstileToken, ip);
    if (!captcha.success) return bad(captcha.error || "CAPTCHA verification failed");

    await dbConnect();

    const post: any = await Article.findOne({ slug, category: "listing-post", status: "published" })
      .select("slug title author listingPost")
      .lean();
    if (!post?.listingPost?.listingKey) return bad("This listing post is not available", 404);

    const agent: any = await User.findById(post.author.id).select("name email agentProfile.cellPhone").lean();
    if (!agent) return bad("This listing post is not available", 404);

    const lp = post.listingPost;
    const isOpenHouse = lp.postType === "open-house";
    const now = new Date();
    const fullName = `${firstName} ${lastName}`.trim();
    const consentText = isOpenHouse ? "Open house registration" : "Listing post registration";

    // ---- 1. Contact in the author's CRM ------------------------------------
    const tags = [
      "Web Generated Leads",
      isOpenHouse ? "Open House RSVP" : "Listing Post",
      lp.address,
      wantsComps ? "Requested Sold Comps" : null,
    ].filter(Boolean) as string[];
    const noteLine = `${now.toISOString().slice(0, 10)}: ${consentText} — ${lp.address || lp.listingKey}${
      isOpenHouse && lp.openHouse?.date ? ` (open house ${lp.openHouse.date} ${lp.openHouse.startTime || ""})` : ""
    }${wantsComps ? " · asked for recently sold comps" : ""}. Agreed to communication terms from ${ip}.`;

    let contact: any = await Contact.findOne({
      userId: agent._id,
      $or: [{ "emails.address": email }, { email }],
    });
    if (contact) {
      contact.tags = Array.from(new Set([...(contact.tags || []), ...tags]));
      if (!contact.phones?.length && phone) {
        contact.phones = [{ number: phone, label: "mobile", isPrimary: true, isValid: true }];
        contact.phone = phone;
      }
      contact.consent = {
        ...(contact.consent?.toObject?.() || contact.consent || {}),
        marketingConsent: true,
        tcpaConsent: phone ? true : !!contact.consent?.tcpaConsent,
        consentDate: now,
        consentIp: ip,
      };
      contact.noteHistory = [...(contact.noteHistory || []), { content: noteLine, createdAt: now }];
      await contact.save();
    } else {
      contact = await Contact.create({
        userId: agent._id,
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        emails: [{ address: email, label: "personal", isPrimary: true, isValid: true }],
        phones: phone ? [{ number: phone, label: "mobile", isPrimary: true, isValid: true }] : [],
        source: "website",
        status: "uncontacted",
        tags,
        interests: { buying: true, locations: [lp.address].filter(Boolean) },
        preferences: { emailOptIn: true, smsOptIn: !!phone, callOptIn: !!phone, preferredContactMethod: "email" },
        consent: { marketingConsent: true, tcpaConsent: !!phone, consentDate: now, consentIp: ip },
        notes: noteLine,
      });
    }

    // ---- 2. Partial User (no password, unverified) -------------------------
    let needsCompletion = false;
    let user: any = await User.findOne({ email });
    if (!user) {
      const signupOrigin = await resolveSignupOrigin(req, "listing_post");
      user = await User.create({
        email,
        name: fullName,
        phone: phone || undefined,
        roles: ["endUser"],
        signupOrigin: { ...signupOrigin, agentId: signupOrigin.agentId || String(agent._id) },
      });
      needsCompletion = true;
    } else if (!user.password && user.signupOrigin?.method === "listing_post") {
      // An earlier partial registration that never set a password. (Opening
      // the welcome link already sets emailVerified, so that can't be the test.)
      needsCompletion = true;
    }
    if (!contact.linkedUserId && user?._id) {
      await Contact.updateOne({ _id: contact._id }, { $set: { linkedUserId: new mongoose.Types.ObjectId(String(user._id)) } });
    }

    // ---- 3. Email ----------------------------------------------------------
    const origin = originFor(req);
    let completeUrl: string | null = null;
    if (needsCompletion) {
      const token = randomBytes(32).toString("hex");
      await VerificationToken.create({ identifier: email, token, expires: new Date(Date.now() + TOKEN_TTL_MS) });
      completeUrl = `${origin}/auth/welcome?token=${token}`;
    }

    let comparables = null;
    if (wantsComps) {
      comparables = await findRecentSoldComparables(lp.listingKey).catch((err) => {
        console.error("[leads/listing-post] comps failed:", err);
        return null;
      });
    }

    const sent = await sendListingPostRegistrationEmail({
      to: email,
      name: fullName,
      address: lp.address || "this home",
      postUrl: `${origin}/insights/listing-post/${post.slug}`,
      agentName: agent.name,
      agentEmail: agent.email,
      openHouse: isOpenHouse ? lp.openHouse : null,
      completeUrl,
      comparables,
    });

    notifyAgentLead({
      agentId: String(agent._id),
      kind: "new_lead",
      leadName: fullName,
      detail: [isOpenHouse ? "Open house RSVP" : "Listing post", lp.address].filter(Boolean).join(" • "),
      leadPhone: phone || undefined,
    }).catch(() => {});

    return NextResponse.json(
      { success: true, emailSent: !!sent, accountPending: needsCompletion },
      { headers: NO_STORE }
    );
  } catch (err) {
    console.error("[leads/listing-post] Error:", err);
    return bad("Registration failed. Please try again.", 500);
  }
}
