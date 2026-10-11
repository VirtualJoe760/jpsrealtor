"use client";

// The standalone corner mark: the badge in a hero/banner corner and on the
// chat page. Resolution order:
//   1. the agent's text brand mark (agentProfile.brandMark)
//   2. the brokerage logo image    (agentProfile.brokerage.logo / logoDark)
//   3. nothing
//
// A brokerage logo in this slot is OPTIONAL. It was effectively mandatory
// before — six surfaces each resolved the image themselves — which meant an
// agent who would rather show their own monogram had no way to say so, and an
// agent with no brokerage artwork got an empty corner.
//
// Text first, for the same reasons it won in the nav: crisp at any size,
// inherits the theme colour so it needs no light/dark pair, and no image
// request. It also sidesteps the hardest case for artwork here — a metallic
// logo that reads on a dark hero and washes out on a light one.
//
// Image fallback resolves symmetrically (light falls back to dark and vice
// versa) because many brokerage marks are NEUTRAL and should be uploaded once,
// not twice. Light used to fall back to nothing, so a neutral mark stored only
// in the dark slot vanished in light mode.

import Wordmark from "@/app/components/brand/Wordmark";
import { useBranding } from "@/app/contexts/BrandingContext";

export default function BrandCornerMark({
  isLight,
  className = "",
  wordmarkClassName = "",
  logoClassName = "",
}: {
  isLight: boolean;
  /** Positioning for the slot — applied to whichever mark renders. */
  className?: string;
  wordmarkClassName?: string;
  logoClassName?: string;
}) {
  const { branding, resolved } = useBranding();

  // Nothing is rendered until branding is known: an empty corner for a moment
  // is correct, while another tenant's artwork would not be. See
  // BrandingContext for why "unknown" and "none" are kept distinct.
  if (!resolved || !branding) return null;

  const mark = branding.brandMark;
  if (mark?.thin || mark?.bold) {
    return (
      <div className={className}>
        <Wordmark
          className={wordmarkClassName}
          thin={mark.thin || ""}
          bold={mark.bold || ""}
        />
      </div>
    );
  }

  const logo = isLight
    ? branding.brokerLogo || branding.brokerLogoDark
    : branding.brokerLogoDark || branding.brokerLogo;
  if (!logo) return null;

  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo}
        alt={branding.brokerageName || "Brokerage"}
        className={logoClassName}
      />
    </div>
  );
}
