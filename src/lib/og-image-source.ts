// src/lib/og-image-source.ts
//
// Shared resolver for the root opengraph-image.tsx / twitter-image.tsx file
// conventions: which agent's branded OG card should this HOST show?
//
// Subdomain hosts (bethanyklier.chatrealty.io, foo.localhost) parse directly.
// CUSTOM domains (jpsrealtor.com, josephsardella.com) parse to nothing — they
// must resolve the domain OWNER and use the owner's subdomain, otherwise the
// /api/og call renders the generic platform logo instead of the agent card.

import { resolveDomainOwner } from "@/lib/resolveDomainOwner";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

/** Parse the agent subdomain from a chatrealty/localhost host, if any. */
export function parseOgSubdomain(bareHost: string): string | undefined {
  if (bareHost.includes("chatrealty")) {
    const parts = bareHost.split("chatrealty")[0]?.replace(/\.$/, "");
    return parts?.split(".").filter((s) => s && s !== "www").pop() || undefined;
  }
  if (bareHost.endsWith(".localhost")) {
    const sub = bareHost.split(".localhost")[0];
    if (sub && sub !== "www") return sub;
  }
  return undefined;
}

/**
 * Resolve the subdomain whose branding /api/og should render for a request.
 * Falls back through the domain-owner chain for custom domains. Returns
 * undefined for pure platform hosts (chatrealty.io apex/www) — /api/og then
 * renders the platform card.
 */
export async function resolveOgSubdomain(
  hdrs: Headers | { get(name: string): string | null }
): Promise<string | undefined> {
  const host = hdrs.get("host") || "localhost:3000";
  const bareHost = host.split(":")[0].toLowerCase();

  const parsed = parseOgSubdomain(bareHost);
  if (parsed) return parsed;

  // Platform apex/www stays platform-branded.
  if (bareHost === "chatrealty.io" || bareHost === "www.chatrealty.io") {
    return undefined;
  }

  try {
    const req = new Request(`https://${host}/`, {
      headers: hdrs as unknown as HeadersInit,
    });
    const { ownerId } = await resolveDomainOwner(req);
    if (ownerId) {
      await dbConnect();
      const u: any = await User.findById(ownerId)
        .select("agentProfile.subdomain")
        .lean();
      return u?.agentProfile?.subdomain || undefined;
    }
  } catch {
    /* fall through — caller renders its fallback */
  }
  return undefined;
}
