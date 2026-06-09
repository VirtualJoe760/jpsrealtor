// src/lib/nav-layout.ts
// Resolves the nav layout (sidebar | navbar) for the CURRENT request's tenant,
// server-side, so the root layout can render the right shell without a
// post-hydration flash (the agent-font feature flashes precisely because it
// resolves client-side — we don't want to repeat that for a layout-level change).
//
// The choice belongs to the domain OWNER (the agent whose subdomain/custom
// domain is being viewed), not the logged-in visitor — same multi-tenant rule
// as resolveDomainOwner / agent-branding.

import { headers } from "next/headers";
import { resolveDomainOwner } from "@/lib/resolveDomainOwner";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export type NavLayout = "sidebar" | "navbar";

export async function getServerNavLayout(): Promise<NavLayout> {
  try {
    const h = await headers();
    const host = h.get("host") || "localhost";
    // resolveDomainOwner takes a Request — build a minimal one from the
    // incoming headers (it only reads request.url's ?subdomain and the host header).
    const req = new Request(`http://${host}/`, { headers: h as unknown as HeadersInit });
    const { ownerId } = await resolveDomainOwner(req);
    if (!ownerId) return "sidebar";

    await dbConnect();
    const owner = await User.findById(ownerId)
      .select("agentProfile.navLayout")
      .lean<{ agentProfile?: { navLayout?: string } }>();

    return owner?.agentProfile?.navLayout === "navbar" ? "navbar" : "sidebar";
  } catch {
    // Any failure (DB, header parsing) falls back to the safe default.
    return "sidebar";
  }
}
