"use client";

// The nav's brand slot: the agent's own SITE logo when one is configured
// (Brand settings → Navigation Bar Logo), otherwise the ChatRealty wordmark.
//
// This used to read the TEAM logo, which tied an agent's personal mark to
// their team affiliation — so going solo blanked the nav. It reads navLogo
// now; see User.ts for why the pair is separate.
//
// ChatRealty is the parent platform's brand, not the agent's agency — a
// Fathom Realty agent's site should lead with their own mark. Platform
// hosts (chatrealty.io/www) always keep the wordmark, even though their
// branding fetch resolves the primary agent.
//
// Renders the wordmark until the client-side branding fetch lands (branding
// is never available at SSR), so there is no hydration mismatch.

import Wordmark from "@/app/components/brand/Wordmark";
import { isPlatformDomain } from "@/lib/domain-classify";

export default function NavBrandMark({
  navLogo,
  navLogoDark,
  navWordmark,
  isLight,
  brandName,
  wordmarkClassName = "",
  logoClassName = "",
}: {
  navLogo?: string;
  navLogoDark?: string;
  /** Text mark, e.g. { thin: "JPS", bold: "REALTOR" }. Takes precedence. */
  navWordmark?: { thin?: string; bold?: string } | null;
  isLight: boolean;
  brandName?: string;
  wordmarkClassName?: string;
  logoClassName?: string;
}) {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const logo = isLight ? navLogo : navLogoDark || navLogo;
  const onAgentSite = Boolean(host) && !isPlatformDomain(host);

  // A text wordmark beats an uploaded image when both are set: it is the more
  // specific choice, it stays crisp at any size, and it inherits the theme
  // colour so it needs no light/dark pair. Clear it to fall back to the image.
  if (onAgentSite && (navWordmark?.thin || navWordmark?.bold)) {
    return (
      <Wordmark
        className={wordmarkClassName}
        thin={navWordmark.thin || ""}
        bold={navWordmark.bold || ""}
      />
    );
  }

  if (logo && onAgentSite) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt={brandName || "Logo"} className={logoClassName} />;
  }
  return <Wordmark className={wordmarkClassName} />;
}
