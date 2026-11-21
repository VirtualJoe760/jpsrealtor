// src/lib/listings/lead-gate.ts
//
// The registration gate on listing posts, resolved per tenant and per post.
//
// Three layers, most specific wins:
//
//   PLATFORM_DEFAULT  →  agentProfile.leadGate  →  article.listingPost.gate
//
// The post layer only applies when it says `inherit: false`, so an agent who
// changes their default in /agent/settings moves every post that has not opted
// out — which is the point of having a tenant-level setting at all.
//
// IMPORTANT, and the reason `mode`/`delaySeconds` are safe to expose as a dial:
// the gate is NOT what keeps gated data private. The server only ever sends the
// teaser payload to an unregistered visitor (see listing-post-access.ts and
// loadListingPostTeaser), so a 0-second gate and a 60-second gate ship byte-for-
// byte the same HTML. `mode` decides when the overlay DROPS over that teaser,
// nothing more. If a future change starts rendering gated fields into the page
// and relying on the overlay to cover them, this whole thing becomes theatre and
// a view-source defeats it.

export type LeadGateMode = "off" | "immediate" | "delay" | "scroll";

export interface LeadGateConfig {
  /** Master switch. False = never gate this agent's posts. */
  enabled: boolean;
  /** When the overlay drops. "off" is the same as enabled:false, per post. */
  mode: LeadGateMode;
  /** Seconds before the overlay drops, for mode "delay". */
  delaySeconds: number;
  /** Percent of the article scrolled before the overlay drops, for mode "scroll". */
  scrollPercent: number;
  /** Skip the gate for a visitor already known to this agent (session or cookie). */
  allowReturning: boolean;
}

/** What a post may override. `inherit: true` (the default) ignores the rest. */
export interface LeadGateOverride extends Partial<LeadGateConfig> {
  inherit?: boolean;
}

/**
 * Platform default: gate on, 20 seconds of reading first.
 *
 * Not "immediate" on purpose. A wall before the visitor has seen anything reads
 * as a paywall and bounces; 20 seconds is long enough to scroll the hero, the
 * facts and the first paragraph, which is what makes registering feel worth it.
 */
export const PLATFORM_DEFAULT_LEAD_GATE: LeadGateConfig = {
  enabled: true,
  mode: "delay",
  delaySeconds: 20,
  scrollPercent: 50,
  allowReturning: true,
};

const MODES: readonly LeadGateMode[] = ["off", "immediate", "delay", "scroll"];

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Coerce anything stored on a User or an Article into a usable partial.
 *
 * Everything here is hostile input: `agentProfile.leadGate` is written by the
 * settings PUT and `listingPost.gate` by the CMS, and a bad number from either
 * would otherwise become a gate that never drops (or drops instantly) on a live
 * page. Unknown keys are dropped, not merged.
 */
export function sanitizeLeadGate(raw: unknown): Partial<LeadGateConfig> {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const out: Partial<LeadGateConfig> = {};

  if (typeof r.enabled === "boolean") out.enabled = r.enabled;
  if (typeof r.allowReturning === "boolean") out.allowReturning = r.allowReturning;
  if (typeof r.mode === "string" && MODES.includes(r.mode as LeadGateMode)) {
    out.mode = r.mode as LeadGateMode;
  }
  if (Number.isFinite(Number(r.delaySeconds))) {
    out.delaySeconds = Math.round(clamp(Number(r.delaySeconds), 0, 300));
  }
  if (Number.isFinite(Number(r.scrollPercent))) {
    out.scrollPercent = Math.round(clamp(Number(r.scrollPercent), 5, 95));
  }
  return out;
}

/**
 * Resolve the gate for one post.
 *
 * @param agentGate  the POST AUTHOR's `agentProfile.leadGate` — never the domain
 *                   owner's. A post written by Bethany and read on jpsrealtor.com
 *                   gates on Bethany's setting, the same way its registration
 *                   creates a Contact in Bethany's CRM, not Joseph's.
 * @param postGate   `article.listingPost.gate`.
 */
export function resolveLeadGate(
  agentGate: unknown,
  postGate: unknown
): LeadGateConfig {
  const agent = sanitizeLeadGate(agentGate);
  const resolved: LeadGateConfig = { ...PLATFORM_DEFAULT_LEAD_GATE, ...agent };

  const rawPost = (postGate || {}) as Record<string, unknown>;
  // Absent `inherit` means inherit: a post saved before this field existed must
  // not silently start overriding with its empty defaults.
  const inherits = rawPost.inherit === undefined ? true : rawPost.inherit !== false;
  if (inherits) return normalize(resolved);

  return normalize({ ...resolved, ...sanitizeLeadGate(postGate) });
}

/** Collapse the two ways of saying "no gate" so callers test one thing. */
function normalize(c: LeadGateConfig): LeadGateConfig {
  if (!c.enabled || c.mode === "off") {
    return { ...c, enabled: false, mode: "off" };
  }
  return c;
}

/**
 * The subset the client needs to run the overlay timer. Deliberately tiny — it
 * is serialized into the page for every visitor, so nothing agent-private or
 * visitor-identifying belongs in it.
 */
export interface LeadGateClientConfig {
  mode: Exclude<LeadGateMode, "off">;
  delaySeconds: number;
  scrollPercent: number;
}

export function toClientConfig(c: LeadGateConfig): LeadGateClientConfig | null {
  if (!c.enabled || c.mode === "off") return null;
  return {
    mode: c.mode,
    delaySeconds: c.delaySeconds,
    scrollPercent: c.scrollPercent,
  };
}
