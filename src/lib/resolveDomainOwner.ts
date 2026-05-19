// src/lib/resolveDomainOwner.ts
// Shared helper to figure out which agent "owns" the current request's domain.
//
// This is the resolution chain that /api/agent/public and /api/agent-branding
// already use ad-hoc; pulling it into one helper so any public-facing endpoint
// (articles, listings, blog, etc.) that needs to scope content to the domain
// owner can do so consistently. Without this, endpoints accidentally scope by
// session.user.id (the visitor) and leak other agents' content on the wrong
// site — see the bug where Bethany Klier's blog posts showed on jpsrealtor.com
// because the articles list had no host-aware filter.
//
// Resolution order:
//   1. ?subdomain= query param or x-agent-subdomain header (proxy-set)
//   2. Host header -> agentProfile.customDomain
//   3. Host header -> DomainRegistry collection (status: active)
//   4. PRIMARY_AGENT_EMAIL env fallback (the platform owner)

import dbConnect from "./mongoose";
import User from "@/models/User";
import mongoose from "mongoose";

export type DomainOwnerSource =
  | "subdomain"
  | "customDomain"
  | "domainRegistry"
  | "primaryAgentFallback"
  | null;

export interface DomainOwnerContext {
  /** Mongo ObjectId string of the user who owns the current domain. */
  ownerId: string | null;
  /** Where the resolution came from. Useful for logging and tests. */
  source: DomainOwnerSource;
  /** Raw host (lowercased, port stripped) that was used in the lookup. */
  host: string;
  /** Subdomain extracted from query param / header, if any. */
  subdomain: string | null;
}

/**
 * Resolve the agent that owns the current request's domain. Takes a plain
 * `Request` (works for both NextRequest and the Web `Request` that route
 * handlers receive). Returns the owner's _id as a string, plus diagnostic
 * info so callers can log or branch.
 *
 * Callers that need the full User document should run their own
 * `User.findById(ownerId).select(...).lean()` query — this helper deliberately
 * returns only the id so it stays cheap and the projection stays at the
 * call site.
 */
export async function resolveDomainOwner(
  request: Request
): Promise<DomainOwnerContext> {
  await dbConnect();

  const url = new URL(request.url);
  const subdomain =
    url.searchParams.get("subdomain") ||
    request.headers.get("x-agent-subdomain");
  const host = (request.headers.get("host") || "")
    .split(":")[0]
    .toLowerCase();

  // 1. Subdomain
  if (subdomain) {
    const agent = await User.findOne(
      { "agentProfile.subdomain": subdomain },
      { _id: 1 }
    ).lean();
    if (agent) {
      return {
        ownerId: String((agent as any)._id),
        source: "subdomain",
        host,
        subdomain,
      };
    }
  }

  // 2. customDomain on agentProfile
  if (host && host !== "localhost") {
    const agent = await User.findOne(
      { "agentProfile.customDomain": host },
      { _id: 1 }
    ).lean();
    if (agent) {
      return {
        ownerId: String((agent as any)._id),
        source: "customDomain",
        host,
        subdomain,
      };
    }

    // 3. DomainRegistry — use raw mongo because we don't have a Mongoose
    // model for this collection in this file's tree.
    try {
      const db = mongoose.connection.db;
      if (db) {
        const entry = await db.collection("domainregistries").findOne(
          { domain: host, status: "active" },
          { projection: { ownerId: 1 } }
        );
        if (entry?.ownerId) {
          return {
            ownerId: String(entry.ownerId),
            source: "domainRegistry",
            host,
            subdomain,
          };
        }
      }
    } catch {
      /* non-blocking */
    }
  }

  // 4. Primary agent fallback (jpsrealtor.com, josephsardella.com, localhost,
  //    or anything else we don't recognize → Joseph).
  const primaryEmail =
    process.env.PRIMARY_AGENT_EMAIL || "josephsardella@gmail.com";
  const primary = await User.findOne({ email: primaryEmail }, { _id: 1 }).lean();
  if (primary) {
    return {
      ownerId: String((primary as any)._id),
      source: "primaryAgentFallback",
      host,
      subdomain,
    };
  }

  return { ownerId: null, source: null, host, subdomain };
}
