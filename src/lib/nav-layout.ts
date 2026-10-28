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
import { isPlatformDomain } from "@/lib/domain-classify";

export type NavLayout = "sidebar" | "navbar";
export type ThemeMode = "both" | "light" | "dark";

/**
 * Public measurement IDs for this tenant. Resolved server-side so the tags are
 * in the first HTML response — a pixel injected after hydration misses the
 * bounce traffic, which is most of it.
 */
export interface TenantTracking {
  metaPixelId: string;
  ga4MeasurementId: string;
  googleAdsId: string;
  googleAdsConversionLabel: string;
}

export interface TenantConfig {
  navLayout: NavLayout;
  themeMode: ThemeMode;
  tracking: TenantTracking;
}

// Platform-level fallbacks. An agent who has not set their own IDs inherits the
// platform's, which is the pre-existing behaviour (a single global pixel) —
// keeping it means this change cannot silently switch off the live pixel.
const ENV_TRACKING: TenantTracking = {
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || "",
  ga4MeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "",
  googleAdsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "",
  googleAdsConversionLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL || "",
};

const DEFAULTS: TenantConfig = {
  navLayout: "sidebar",
  themeMode: "both",
  tracking: ENV_TRACKING,
};

/** Accepts only well-formed IDs; a typo'd tag is worse than no tag. */
function sanitizeTracking(t?: Record<string, any>): TenantTracking {
  if (!t || t.enabled === false) {
    // enabled:false is an explicit opt-out, so it must NOT fall back to the
    // platform IDs — that would keep tracking the agent's visitors anyway.
    return t?.enabled === false
      ? { metaPixelId: "", ga4MeasurementId: "", googleAdsId: "", googleAdsConversionLabel: "" }
      : ENV_TRACKING;
  }
  const pick = (v: any, re: RegExp, fallback: string) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s && re.test(s) ? s : fallback;
  };
  return {
    metaPixelId: pick(t.metaPixelId, /^\d{8,20}$/, ENV_TRACKING.metaPixelId),
    ga4MeasurementId: pick(t.ga4MeasurementId, /^G-[A-Z0-9]{6,15}$/i, ENV_TRACKING.ga4MeasurementId),
    googleAdsId: pick(t.googleAdsId, /^AW-\d{6,15}$/i, ENV_TRACKING.googleAdsId),
    googleAdsConversionLabel: pick(t.googleAdsConversionLabel, /^[A-Za-z0-9_-]{5,40}$/, ENV_TRACKING.googleAdsConversionLabel),
  };
}

export async function getServerTenantConfig(): Promise<TenantConfig> {
  try {
    const h = await headers();
    const host = h.get("host") || "localhost";
    // The platform is not a tenant. Owner resolution falls back to the PRIMARY
    // agent on chatrealty.io, which handed the platform that agent's nav
    // layout, theme and tracking IDs (2026-10-28: "chatrealty.io must be
    // separated from JPSREALTOR or any agent-branded website").
    if (isPlatformDomain(host)) return DEFAULTS;
    // resolveDomainOwner takes a Request — build a minimal one from the
    // incoming headers (it only reads request.url's ?subdomain and the host header).
    const req = new Request(`http://${host}/`, { headers: h as unknown as HeadersInit });
    const { ownerId } = await resolveDomainOwner(req);
    if (!ownerId) return DEFAULTS;

    await dbConnect();
    const owner = await User.findById(ownerId)
      .select("agentProfile.navLayout agentProfile.themeMode agentProfile.tracking")
      .lean<{ agentProfile?: { navLayout?: string; themeMode?: string; tracking?: Record<string, any> } }>();

    const ap = owner?.agentProfile || {};
    return {
      navLayout: ap.navLayout === "navbar" ? "navbar" : "sidebar",
      themeMode: ap.themeMode === "light" || ap.themeMode === "dark" ? ap.themeMode : "both",
      tracking: sanitizeTracking(ap.tracking),
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

/** Thin wrapper for callers that only need the measurement IDs. */
export async function getServerTenantTracking(): Promise<TenantTracking> {
  return (await getServerTenantConfig()).tracking;
}
