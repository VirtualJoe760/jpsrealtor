// Privacy Policy · Terms of Service — the only part of the old page footer
// (SiteFooter) that is still shown, since 2026-10-17 when Joseph asked for the
// footer to be hidden on every page.
//
// Two placements:
//   - "sidebar": the bottom of EnhancedSidebar, between the theme toggle and the
//     newsletter / appointment / phone / email icons.
//   - "page": one small line at the bottom of the page, ONLY where there is no
//     sidebar to carry it — phones (the sidebar is md+), tenants on the top
//     navbar layout, and /lp/ landing pages (no nav at all). Without it those
//     pages would have no privacy link anywhere, and /lp/ pages are where paid
//     ads land with a lead form: Meta and Google Ads expect a reachable privacy
//     policy there, and California expects a conspicuous one on the homepage.

import Link from "next/link";

export default function LegalLinks({
  variant,
  isLight,
  className = "",
  showCompany = false,
}: {
  variant: "sidebar" | "page";
  isLight?: boolean;
  className?: string;
  /** Mission · Join Us · Invest — ChatRealty-the-company links. Platform host
   *  only: on an agent's own site they would read as that agent's company. */
  showCompany?: boolean;
}) {
  const tone =
    variant === "sidebar"
      ? isLight
        ? "text-gray-500 hover:text-gray-700"
        : "text-neutral-500 hover:text-neutral-300"
      : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200";
  const sep = variant === "sidebar" ? (isLight ? "text-gray-300" : "text-neutral-600") : "text-neutral-400";

  const legal = (
    <nav aria-label="Legal" className={`flex items-center justify-center gap-2 text-[11px] ${showCompany ? "" : className}`}>
      <Link href="/privacy-policy" className={`${tone} hover:underline`}>
        Privacy Policy
      </Link>
      <span aria-hidden="true" className={sep}>
        ·
      </span>
      <Link href="/terms-of-service" className={`${tone} hover:underline`}>
        Terms of Service
      </Link>
    </nav>
  );
  if (!showCompany) return legal;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <nav aria-label="Company" className="flex items-center justify-center gap-2 text-[11px]">
        <Link href="/mission" className={`${tone} hover:underline`}>
          Mission
        </Link>
        <span aria-hidden="true" className={sep}>
          ·
        </span>
        <Link href="/join" className={`${tone} hover:underline`}>
          Join Us
        </Link>
        <span aria-hidden="true" className={sep}>
          ·
        </span>
        <Link href="/invest" className={`${tone} hover:underline`}>
          Invest
        </Link>
      </nav>
      {legal}
    </div>
  );
}
