// src/lib/signup-origin.ts
// Resolves which website a user signed up on and which agent owns it.

import type { NextRequest } from "next/server";
import { isPlatformDomain, isAgentDomain } from "@/lib/domain-utils";

export interface SignupOrigin {
  domain: string;
  subdomain?: string;
  agentId?: string;
  method: string;
  ip?: string;
}

/**
 * Extract signup origin from an incoming request.
 * Call this in any user-creation API route.
 */
export async function resolveSignupOrigin(
  request: NextRequest | Request,
  method: string
): Promise<SignupOrigin> {
  const headers = request.headers;
  const host = (headers.get("host") || "").replace(/:\d+$/, "").toLowerCase();
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headers.get("x-real-ip")
    || undefined;

  // Check if middleware set an agent subdomain
  let subdomain = headers.get("x-agent-subdomain") || undefined;

  // Extract subdomain from *.localhost (local dev)
  if (!subdomain && host.endsWith(".localhost")) {
    subdomain = host.replace(/\.localhost$/, "");
  }

  // Extract subdomain from *.chatrealty.io
  if (!subdomain && host.endsWith(".chatrealty.io")) {
    const sub = host.replace(/\.chatrealty\.io$/, "");
    if (sub && sub !== "www") {
      subdomain = sub;
    }
  }

  const origin: SignupOrigin = {
    domain: host || "unknown",
    subdomain,
    method,
    ip,
  };

  // If there's a subdomain, look up the agent who owns it
  if (subdomain) {
    try {
      const mongoose = await import("mongoose");
      const db = mongoose.default.connection.db;
      if (db) {
        const agent = await db.collection("users").findOne(
          { "agentProfile.subdomain": subdomain },
          { projection: { _id: 1 } }
        );
        if (agent) {
          origin.agentId = agent._id.toString();
        }
      }
    } catch {
      // Non-blocking
    }
  }

  // If it's an agent custom domain (not platform, not subdomain), look up which agent owns it
  if (!subdomain && isAgentDomain(host) && !host.includes("localhost")) {
    try {
      const mongoose = await import("mongoose");
      const db = mongoose.default.connection.db;
      if (db) {
        // Check DomainMapping
        const mapping = await db.collection("domainmappings").findOne(
          { domain: host },
          { projection: { agentId: 1 } }
        );
        if (mapping?.agentId) {
          origin.agentId = mapping.agentId.toString();
        } else {
          // Check DomainRegistry
          const registry = await db.collection("domainregistries").findOne(
            { domain: host },
            { projection: { ownerId: 1 } }
          );
          if (registry?.ownerId) {
            origin.agentId = registry.ownerId.toString();
          }
        }
      }
    } catch {
      // Non-blocking
    }
  }

  return origin;
}

/**
 * If the user signed up on an agent's domain, create a Contact in that agent's CRM.
 * Call this AFTER the user has been created (so we have their _id).
 *
 * @param userId    The newly created user's ObjectId
 * @param name      User's display name
 * @param email     User's email
 * @param phone     User's phone (optional)
 * @param origin    The SignupOrigin resolved from the request
 */
export async function linkUserToAgent(
  userId: string,
  name: string | undefined,
  email: string,
  phone: string | undefined,
  origin: SignupOrigin
): Promise<void> {
  if (!origin.agentId) return; // Not from an agent domain

  try {
    const mongoose = await import("mongoose");
    const Contact = (await import("@/models/Contact")).default;

    const agentObjectId = new mongoose.Types.ObjectId(origin.agentId);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Check if contact already exists for this agent + email
    const existing = await Contact.findOne({
      userId: agentObjectId,
      $or: [
        { "emails.address": email.toLowerCase() },
        { email: email.toLowerCase() },
        { linkedUserId: userObjectId },
      ],
    });

    if (existing) {
      // Link the user account if not already linked
      if (!existing.linkedUserId) {
        existing.linkedUserId = userObjectId;
        await existing.save();
      }
      return;
    }

    // Parse name
    const parts = (name || "").trim().split(/\s+/);
    const firstName = parts[0] || email.split("@")[0];
    const lastName = parts.slice(1).join(" ") || "";

    await Contact.create({
      userId: agentObjectId,
      firstName,
      lastName,
      emails: email ? [{ address: email.toLowerCase(), label: "personal", isPrimary: true, isValid: true }] : [],
      phones: phone ? [{ number: phone, label: "mobile", isPrimary: true, isValid: true }] : [],
      email: email.toLowerCase(),
      phone: phone || undefined,
      source: "website",
      status: "uncontacted",
      tags: ["Website Signup", origin.domain],
      linkedUserId: userObjectId,
      isPersonal: false,
      labels: [],
      notes: `Auto-created: signed up on ${origin.domain}`,
    });

    console.log(`[signup-origin] Created contact for ${email} → agent ${origin.agentId} (from ${origin.domain})`);
  } catch (err) {
    console.error("[signup-origin] Failed to create agent contact:", err);
    // Non-blocking — don't fail the signup
  }
}

/**
 * Google/Facebook sign-ups are created inside NextAuth's signIn callback, which
 * has no request, so they're stored with `domain: "unknown"`. On an agent's site
 * the OAuth round trip also runs on chatrealty.io and only then hands the
 * session back to the agent's host (/api/auth/receive). So the first request we
 * see from the new user on a real site is the one that tells us where they
 * signed up. Call this from there: it fills the origin once and links the user
 * into that agent's CRM, exactly as the email/password path does at register.
 *
 * Only touches users whose origin is still unknown AND who were created in the
 * last 2 hours — an old account browsing an agent site later did not "sign up"
 * there. (2026-11-03: Becky Rees signed up with Google on an agent site and
 * landed with no origin and no CRM contact; the comment promising this
 * backfill had no code behind it.)
 */
const BACKFILL_WINDOW_MS = 2 * 60 * 60 * 1000;

export async function backfillSignupOrigin(
  request: NextRequest | Request,
  userId: string
): Promise<void> {
  try {
    const mongoose = await import("mongoose");
    const User = (await import("@/models/User")).default;
    if (!mongoose.default.isValidObjectId(userId)) return;

    const user: any = await User.findOne({
      _id: userId,
      createdAt: { $gte: new Date(Date.now() - BACKFILL_WINDOW_MS) },
      $or: [{ "signupOrigin.domain": "unknown" }, { "signupOrigin.domain": { $exists: false } }],
    })
      .select("name email phone signupOrigin")
      .lean();
    if (!user) return;

    const method = user.signupOrigin?.method || "oauth";
    const origin = await resolveSignupOrigin(request, method);
    if (!origin.domain || origin.domain === "unknown") return;

    // Conditional update so two concurrent first requests can't both link.
    const res = await User.updateOne(
      { _id: userId, $or: [{ "signupOrigin.domain": "unknown" }, { "signupOrigin.domain": { $exists: false } }] },
      {
        $set: {
          signupOrigin: {
            domain: origin.domain,
            subdomain: origin.subdomain,
            agentId: origin.agentId ? new mongoose.Types.ObjectId(origin.agentId) : undefined,
            method,
            ip: origin.ip,
          },
        },
      }
    );
    if (res.modifiedCount !== 1) return;

    await linkUserToAgent(userId, user.name, user.email, user.phone, origin);
  } catch (err) {
    console.error("[signup-origin] backfill failed:", err);
  }
}
