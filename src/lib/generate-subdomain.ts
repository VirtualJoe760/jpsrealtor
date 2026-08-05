// src/lib/generate-subdomain.ts
// Shared utility for generating unique agent subdomains.
//
// Pattern: firstName + lastName → lowercase alphanumeric slug
//   "Joseph Sardella" → "josephsardella"
//   "María García"    → "maragarca"
//   Conflict?         → "josephsardella2", "josephsardella3", ...
//
// DNS: *.chatrealty.io wildcard CNAME → cname.vercel-dns.com (Cloudflare).
//
// REGISTRATION IS STILL REQUIRED PER SUBDOMAIN. The wildcard is DNS only — it
// routes traffic to Vercel's edge, but the Vercel PROJECT cannot hold a
// wildcard domain while chatrealty.io runs on Cloudflare nameservers, so a
// subdomain that was never added via the projects/domains API 404s at
// Vercel's router (DEPLOYMENT_NOT_FOUND) before any of our code runs.
//
// This file briefly knew that (added 2026-04-30, bcf56ac9) and forgot it the
// same day (7aec49bb — removed on the assumption "wildcard handles it").
// Subdomains minted in that window (e.g. bethanyklier) work; everything
// minted after 404'd until the 2026-08-05 backfill. Do not remove
// ensureSubdomainRegistered again without attaching an actual wildcard
// domain to the project, which requires moving DNS to Vercel nameservers.

import mongoose from "mongoose";
import { addDomainToProject, VercelApiError } from "@/lib/vercel-domains";

// Reserved words that can't be used as subdomains
const RESERVED = new Set([
  "admin", "api", "app", "auth", "blog", "cdn", "chat", "cms",
  "dashboard", "dev", "docs", "ftp", "help", "mail", "map",
  "media", "news", "proxy", "search", "shop", "staging", "status",
  "support", "test", "www", "chatrealty", "jpsrealtor", "agent",
]);

/**
 * Generate a unique subdomain for an agent.
 *
 * @param name      User's display name (e.g. "Joseph Sardella")
 * @param email     Fallback if name is empty
 * @param userId    The user's ObjectId (excluded from uniqueness check)
 * @returns         The final unique subdomain string
 */
export async function generateSubdomain(
  name: string | undefined,
  email: string,
  userId: mongoose.Types.ObjectId | string
): Promise<string> {
  // Build base slug from name, fall back to email prefix
  const raw = (name || email.split("@")[0]).toLowerCase();
  let base = raw.replace(/[^a-z0-9]/g, "");

  // Enforce minimum length
  if (base.length < 3) {
    base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  if (base.length < 3) {
    base = "agent";
  }

  // Truncate overly long subdomains
  if (base.length > 30) {
    base = base.slice(0, 30);
  }

  // Check reserved words
  if (RESERVED.has(base)) {
    base = `${base}re`;
  }

  // Find a unique subdomain (check conflicts, append number if needed)
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database not connected");
  const usersCol = db.collection("users");

  let final = base;
  let attempt = 0;

  while (true) {
    const existing = await usersCol.findOne({
      "agentProfile.subdomain": final,
      _id: { $ne: new mongoose.Types.ObjectId(String(userId)) },
    });
    if (!existing) break;
    attempt++;
    final = `${base}${attempt}`;
  }

  // Awaited, deliberately. A dangling promise in a serverless function is
  // killed when the response returns — fire-and-forget here means the
  // registration usually never runs and leaves no trace. This never throws
  // and is bounded by the fetch timeout, so the cost to a signup is ~300ms.
  const reg = await ensureSubdomainRegistered(final);
  console.log(`[generate-subdomain] ${final}.chatrealty.io — ${reg.note}`);

  return final;
}

/**
 * Idempotently register {subdomain}.chatrealty.io as a domain on the Vercel
 * project, so Vercel's router maps the hostname to our deployment instead of
 * emitting DEPLOYMENT_NOT_FOUND. Never throws — callers decide whether the
 * result is worth surfacing (connect_site does; the signup path does not).
 */
export async function ensureSubdomainRegistered(
  subdomain: string
): Promise<{ registered: boolean; note: string }> {
  // Minted subdomains are [a-z0-9]{3,30}, but this function's input is a
  // profile field, not a mint result — match the mint contract exactly and
  // refuse reserved labels, so nothing agent-writable can attach api/admin/
  // mail/etc. as a project domain.
  const label = String(subdomain).toLowerCase();
  if (!/^[a-z0-9]{3,30}$/.test(label) || RESERVED.has(label)) {
    return { registered: false, note: `refused subdomain: ${JSON.stringify(subdomain)}` };
  }
  const domain = `${label}.chatrealty.io`;
  try {
    await addDomainToProject(domain);
    return { registered: true, note: "registered with Vercel" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // A structured 409 = the domain is already attached: the goal state, not
    // a failure. Branch on the typed status — never regex the prose, which
    // echoes the domain name (a subdomain like "mike409" made every failure
    // match /409/).
    if (err instanceof VercelApiError && err.status === 409) {
      return { registered: true, note: `already registered (${err.code || "409"})` };
    }
    console.error(`[generate-subdomain] Vercel registration failed for ${domain}: ${msg}`);
    return { registered: false, note: `registration failed: ${msg}` };
  }
}
