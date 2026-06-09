// src/lib/nav-layout.ts
// Resolves the per-tenant layout/branding config for the CURRENT request,
// server-side, so the root layout can render the right shell, font, and theme
// WITHOUT a post-hydration flash. (The old client-side font fetch flashed
// Raleway → agent font; resolving here fixes that the same way navLayout does.)
//
// The choice belongs to the domain OWNER (the agent whose subdomain/custom
// domain is being viewed), not the logged-in visitor — same multi-tenant rule
// as resolveDomainOwner / agent-branding.

import { headers } from "next/headers";
import { resolveDomainOwner } from "@/lib/resolveDomainOwner";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export type NavLayout = "sidebar" | "navbar";
export type ThemeMode = "both" | "light" | "dark";

export interface TenantConfig {
  navLayout: NavLayout;
  fontFamily: string; // e.g. "Raleway"
  themeMode: ThemeMode;
}

const DEFAULTS: TenantConfig = {
  navLayout: "sidebar",
  fontFamily: "Raleway",
  themeMode: "both",
};

export async function getServerTenantConfig(): Promise<TenantConfig> {
  try {
    const h = await headers();
    const host = h.get("host") || "localhost";
    // resolveDomainOwner takes a Request — build a minimal one from the
    // incoming headers (it only reads request.url's ?subdomain and the host header).
    const req = new Request(`http://${host}/`, { headers: h as unknown as HeadersInit });
    const { ownerId } = await resolveDomainOwner(req);
    if (!ownerId) return DEFAULTS;

    await dbConnect();
    const owner = await User.findById(ownerId)
      .select("agentProfile.navLayout agentProfile.fontFamily agentProfile.themeMode")
      .lean<{ agentProfile?: { navLayout?: string; fontFamily?: string; themeMode?: string } }>();

    const ap = owner?.agentProfile || {};
    return {
      navLayout: ap.navLayout === "navbar" ? "navbar" : "sidebar",
      fontFamily: ap.fontFamily || DEFAULTS.fontFamily,
      themeMode: ap.themeMode === "light" || ap.themeMode === "dark" ? ap.themeMode : "both",
    };
  } catch {
    // Any failure (DB, header parsing) falls back to safe defaults.
    return DEFAULTS;
  }
}

/** Back-compat thin wrapper. */
export async function getServerNavLayout(): Promise<NavLayout> {
  return (await getServerTenantConfig()).navLayout;
}
