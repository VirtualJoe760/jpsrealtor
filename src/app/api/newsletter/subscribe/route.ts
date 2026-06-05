// src/app/api/newsletter/subscribe/route.ts
//
// Public newsletter signup. Turnstile + per-IP rate limit, scoped to the
// domain owner via resolveDomainOwner so each branded site builds its own list.
// Idempotent: re-subscribing an existing address succeeds; a previously
// unsubscribed address is reactivated.
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import dbConnect from "@/lib/mongoose";
import NewsletterSubscriber from "@/models/NewsletterSubscriber";
import { resolveDomainOwner } from "@/lib/resolveDomainOwner";
import { verifyTurnstile, clientIp } from "@/lib/turnstile";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(
  body: any,
  status = 200,
  extraHeaders: Record<string, string> = {}
) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...extraHeaders },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const name = body.name ? String(body.name).trim().slice(0, 120) : undefined;

    if (!email || !EMAIL_RE.test(email)) {
      return json({ error: "A valid email is required" }, 400);
    }

    const ip = clientIp(request) || "unknown";
    const rl = checkRateLimit(`newsletter:subscribe:${ip}`, {
      max: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.ok) {
      return json({ error: rl.error }, rl.status, {
        "Retry-After": String(rl.retryAfter),
      });
    }

    const captcha = await verifyTurnstile(body.turnstileToken, ip);
    if (!captcha.success) {
      return json(
        { error: captcha.error || "CAPTCHA verification failed" },
        400
      );
    }

    await dbConnect();

    const { ownerId } = await resolveDomainOwner(request);
    if (!ownerId) {
      // No resolvable owner (misconfigured apex) — don't silently drop into a
      // null bucket.
      return json({ error: "Newsletter isn't available on this site yet" }, 503);
    }

    const existing = await NewsletterSubscriber.findOne({ ownerId, email });
    if (existing) {
      if (existing.status === "unsubscribed") {
        existing.status = "active";
        existing.unsubscribedAt = undefined;
        existing.consentAt = new Date();
        existing.consentIp = ip;
        if (name && !existing.name) existing.name = name;
        await existing.save();
      }
      return json({ success: true, alreadySubscribed: true });
    }

    await NewsletterSubscriber.create({
      ownerId,
      email,
      name,
      status: "active",
      source: typeof body.source === "string" ? body.source.slice(0, 60) : "newsletter-signup",
      unsubscribeToken: randomBytes(24).toString("hex"),
      consentIp: ip,
      consentAt: new Date(),
    });

    return json({ success: true });
  } catch (err) {
    console.error("[newsletter/subscribe] Error:", err);
    return json({ error: "Failed to subscribe" }, 500);
  }
}
