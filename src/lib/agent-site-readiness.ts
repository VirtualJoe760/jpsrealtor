// src/lib/agent-site-readiness.ts
//
// Single source of truth for "is this agent's public site ready to go live?"
//
// Free-tier agents don't need a paid subscription to publish their public
// {slug}.chatrealty.io site — they need a COMPLETE profile. This helper defines
// the go-live checklist and is consumed by BOTH:
//   - the dashboard "Complete your profile" card (shows the steps), and
//   - the public-site gate (src/app/api/agent/public + src/app/agent-site/…),
//     which flips the site from "Coming Soon" to live.
// Keeping one definition means the checklist the agent sees and the gate that
// actually publishes their site can never drift apart.

export interface SiteReadinessStep {
  key: string;
  label: string;
  done: boolean;
}

export interface SiteReadiness {
  steps: SiteReadinessStep[];
  completed: number;
  total: number;
  /** True when every required step is done — the site may go live. */
  complete: boolean;
}

/** Minimal shape needed to evaluate readiness (a User doc or profile payload). */
export interface SiteReadinessInput {
  name?: string | null;
  phone?: string | null;
  agentProfile?: {
    heroPhoto?: string | null;
    heroPhotoDark?: string | null;
    headshot?: string | null;
    headline?: string | null;
    personalStory?: string | null;
    videoIntro?: string | null;
    cellPhone?: string | null;
    officePhone?: string | null;
  } | null;
}

/**
 * Evaluate the go-live checklist for an agent. The required fields mirror the
 * dashboard setup card: identity (name, phone), imagery (banner + headshot),
 * and intro copy (headline + a personal story or video).
 */
export function getSiteReadiness(input: SiteReadinessInput): SiteReadiness {
  const ap = input.agentProfile ?? {};
  // Each check must match what the PUBLIC SITE actually renders, not a single
  // narrow field — otherwise an agent who filled a valid alternative (cell/office
  // phone, or a dark-mode banner) sees content on their site yet stays gated as
  // "Coming Soon" forever. The site's own fallbacks: phone = cell|office|top-level;
  // hero = heroPhoto|heroPhotoDark.
  const steps: SiteReadinessStep[] = [
    { key: "name", label: "Name", done: !!input.name?.trim() },
    {
      key: "phone",
      label: "Phone",
      done: !!(input.phone?.trim() || ap.cellPhone?.trim() || ap.officePhone?.trim()),
    },
    { key: "heroPhoto", label: "Banner photo", done: !!(ap.heroPhoto || ap.heroPhotoDark) },
    { key: "headshot", label: "Headshot", done: !!ap.headshot },
    { key: "headline", label: "Headline", done: !!ap.headline?.trim() },
    {
      key: "story",
      label: "Personal story or video",
      done: !!(ap.personalStory?.trim() || ap.videoIntro),
    },
  ];
  const completed = steps.filter((s) => s.done).length;
  return { steps, completed, total: steps.length, complete: completed === steps.length };
}

/** True when the agent has finished the setup required to publish their site. */
export function isSiteReady(input: SiteReadinessInput): boolean {
  return getSiteReadiness(input).complete;
}
