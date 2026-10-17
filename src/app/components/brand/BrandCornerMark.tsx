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
import { useBranding, type Branding } from "@/app/contexts/BrandingContext";

type CornerMark =
  | { kind: "text"; thin: string; bold: string }
  | { kind: "logo"; src: string; alt: string };

function resolveCornerMark(
  branding: Branding | null,
  isPlatform: boolean,
  resolved: boolean,
  isLight: boolean
): CornerMark | null {
  // Platform hosts have no corner mark. chatrealty.io resolves branding to the
  // PRIMARY agent (agent-branding's last fallback), so without this the
  // platform's own chat page wore Joseph's "JPS" badge — for every visitor,
  // including an admin impersonating someone else.
  if (isPlatform) return null;

  // Nothing is rendered until branding is known: an empty corner for a moment
  // is correct, while another tenant's artwork would not be. See
  // BrandingContext for why "unknown" and "none" are kept distinct.
  if (!resolved || !branding) return null;

  const mark = branding.brandMark;
  if (mark?.thin || mark?.bold) return { kind: "text", thin: mark.thin || "", bold: mark.bold || "" };

  const logo = isLight
    ? branding.brokerLogo || branding.brokerLogoDark
    : branding.brokerLogoDark || branding.brokerLogo;
  if (!logo) return null;
  return { kind: "logo", src: logo, alt: branding.brokerageName || "Brokerage" };
}

/** Whether a corner mark will render — lets a caller drop the frame around it. */
export function useHasCornerMark(isLight: boolean): boolean {
  const { branding, isPlatform, resolved } = useBranding();
  return resolveCornerMark(branding, isPlatform, resolved, isLight) !== null;
}

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
  const { branding, isPlatform, resolved } = useBranding();
  const mark = resolveCornerMark(branding, isPlatform, resolved, isLight);
  if (!mark) return null;

  if (mark.kind === "text") {
    return (
      <div className={className}>
        <Wordmark className={wordmarkClassName} thin={mark.thin} bold={mark.bold} />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mark.src} alt={mark.alt} className={logoClassName} />
    </div>
  );
}
