// src/lib/signup-origin.ts
// Resolves which website a user signed up on and which agent owns it.

import type { NextRequest } from "next/server";
import { isPlatformDomain, isOwnerDomain } from "@/lib/domain-utils";

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
  const subdomain = headers.get("x-agent-subdomain") || undefined;

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

  // If it's a custom domain (not platform or owner), look up which agent owns it
  if (!subdomain && !isPlatformDomain(host) && !isOwnerDomain(host) && host !== "localhost" && !host.includes("localhost")) {
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
