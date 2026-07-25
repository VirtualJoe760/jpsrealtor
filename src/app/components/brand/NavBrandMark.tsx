"use client";

// The nav's brand slot: the agent's TEAM logo when one is configured
// (Brand settings → Navigation Bar Logo), otherwise the ChatRealty wordmark.
//
// ChatRealty is the parent platform's brand, not the agent's agency — an
// Obsidian Group agent's site should lead with Obsidian Group. Platform
// hosts (chatrealty.io/www) always keep the wordmark, even though their
// branding fetch resolves the primary agent.
//
// Renders the wordmark until the client-side branding fetch lands (branding
// is never available at SSR), so there is no hydration mismatch.

import Wordmark from "@/app/components/brand/Wordmark";
import { isPlatformDomain } from "@/lib/domain-classify";

export default function NavBrandMark({
  teamLogo,
  teamLogoDark,
  isLight,
  teamName,
  wordmarkClassName = "",
  logoClassName = "",
}: {
  teamLogo?: string;
  teamLogoDark?: string;
  isLight: boolean;
  teamName?: string;
  wordmarkClassName?: string;
  logoClassName?: string;
}) {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const logo = isLight ? teamLogo : teamLogoDark || teamLogo;

  if (logo && host && !isPlatformDomain(host)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt={teamName || "Team logo"} className={logoClassName} />;
  }
  return <Wordmark className={wordmarkClassName} />;
}
