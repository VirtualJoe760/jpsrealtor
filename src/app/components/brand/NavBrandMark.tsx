"use client";

// The nav's brand slot. Resolution order, once branding is known:
//   1. the agent's text wordmark  (agentProfile.navWordmark)
//   2. the agent's uploaded logo  (agentProfile.navLogo / navLogoDark)
//   3. the agent's NAME as a wordmark (GENE CRUCEAN) — src/lib/agent-wordmark.ts
//   4. the ChatRealty wordmark, only when there is no name either
//
// Step 3 is new (2026-10-16). Before it, an agent with nothing configured got
// step 4, so the platform's brand sat in the nav of the agent's own site.
//
// Order matters at the top: a text mark is the more specific choice, stays
// crisp at any size and inherits the theme colour, so it wins over an image.
// (It also used to read the TEAM logo, which tied an agent's personal mark to
// their team affiliation — going solo blanked the nav. See User.ts.)
//
// WHAT IT NO LONGER DOES is render step 3 while steps 1 and 2 are unknown.
// Branding is resolved per host from Mongo and is never available at SSR, so
// this showed the ChatRealty wordmark until the fetch landed — making the
// PLATFORM's brand the loading state for every agent's site, visible as a
// CHATREALTY flash on jpsrealtor.com before JPSREALTOR appeared. While the
// answer is pending it now renders an empty slot of the same height: the
// layout cannot jump, and no one else's brand stands in. Repeat visits skip
// even that, because BrandingContext restores the cached mark before paint.
//
// Platform hosts (chatrealty.io/www) are exempt — isPlatformDomain() answers
// from the hostname alone, so the wordmark is right immediately.

import Wordmark from "@/app/components/brand/Wordmark";
import { BrandSlotPlaceholder, useBranding } from "@/app/contexts/BrandingContext";
import { nameWordmark } from "@/lib/agent-wordmark";

export default function NavBrandMark({
  isLight,
  wordmarkClassName = "",
  logoClassName = "",
  compact = false,
}: {
  isLight: boolean;
  wordmarkClassName?: string;
  logoClassName?: string;
  compact?: boolean;
}) {
  const { branding, isPlatform, resolved } = useBranding();

  if (isPlatform) {
    return <Wordmark className={wordmarkClassName} compact={compact} />;
  }

  if (!resolved) {
    // Reserve the slot. Height matches the rendered mark so nothing shifts.
    return <BrandSlotPlaceholder className={`${wordmarkClassName} h-[1em] w-24`} />;
  }

  const wm = branding?.navWordmark;
  if (wm?.thin || wm?.bold) {
    return (
      <Wordmark
        className={wordmarkClassName}
        compact={compact}
        thin={wm.thin || ""}
        bold={wm.bold || ""}
      />
    );
  }

  // Symmetric: a neutral mark uploaded to either slot serves both themes.
  const logo = isLight
    ? branding?.navLogo || branding?.navLogoDark
    : branding?.navLogoDark || branding?.navLogo;
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={logo}
        alt={branding?.brokerageName || branding?.agentName || "Logo"}
        className={logoClassName}
      />
    );
  }

  // Resolved, and the agent set no mark of their own: their site still says
  // who they are, not ChatRealty.
  const named = nameWordmark(branding?.agentName);
  if (named) {
    return (
      <Wordmark className={wordmarkClassName} compact={compact} thin={named.thin} bold={named.bold} spaced />
    );
  }
  return <Wordmark className={wordmarkClassName} compact={compact} />;
}
