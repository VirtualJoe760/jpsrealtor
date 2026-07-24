// Proxy: inquiry form → this route → ChatRealty lead-capture (token server-side).
// Write-only: records a deduped Contact against your tenant. No CRM/PII is ever
// returned to the page.

import { NextRequest, NextResponse } from "next/server";
import { submitLead, ChatRealtyError } from "@/lib/chatrealty";

export const dynamic = "force-dynamic";

// Tiny in-memory rate limit (per warm server instance). Swap for a durable
// limiter (Upstash/Redis) before real traffic.
const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX = 5;

function limited(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX;
}

// Cloudflare Turnstile — enforced only when the agent has set their own
// TURNSTILE_SECRET_KEY. Unset → skip (honeypot + rate-limit still apply).
async function turnstileOk(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured → no gate
  if (!token) return false;
  try {
    const form = new URLSearchParams({ secret, response: token, remoteip: ip });
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const data = (await r.json().catch(() => ({}))) as { success?: boolean };
    return data.success === true;
  } catch {
    return false; // fail closed if the verify call itself fails
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Honeypot — bots fill hidden fields; humans don't.
  if (body?.company) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Turnstile (if the agent configured it).
  if (!(await turnstileOk(typeof body?.turnstileToken === "string" ? body.turnstileToken : undefined, ip))) {
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 400 });
  }

  const email = typeof body?.email === "string" ? body.email.trim() : undefined;
  const phone = typeof body?.phone === "string" ? body.phone.trim() : undefined;
  if (!email && !phone) {
    return NextResponse.json({ error: "Provide an email or a phone number." }, { status: 400 });
  }

  try {
    const { contactId } = await submitLead({
      email,
      phone,
      name: typeof body?.name === "string" ? body.name.trim().slice(0, 200) : undefined,
      tags: Array.isArray(body?.tags) ? body.tags.slice(0, 5) : undefined,
    });
    return NextResponse.json({ ok: true, recorded: contactId != null }, { status: 200 });
  } catch (e) {
    const status = e instanceof ChatRealtyError ? e.status : 500;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not record your inquiry." },
      { status }
    );
  }
}
