// src/app/components/mls/ListingAttribution.tsx
"use client";

import clsx from "clsx";
import Image from "next/image";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import type { IUnifiedListing } from "@/models/unified-listing";

/**
 * IDX Listing Attribution (subtle, blends in, whole block clickable)
 * - Uses explicit "Listed by"
 * - Shows office, agent, phone/email if provided
 * - No divider; light styling so it blends with the page
 * - Clicking anywhere in the block prompts a call to 760-833-6334
 */
export default function ListingAttribution({
  listing,
  className,
}: {
  listing: IUnifiedListing;
  className?: string;
}) {
  const { textMuted, textTertiary, textSecondary } = useThemeClasses();

  const officeName = listing.listOfficeName?.trim();
  const officePhone = listing.listOfficePhone?.trim();
  const agentName = listing.listAgentName?.trim();
  const agentPhone = listing.listAgentPreferredPhone?.trim() || undefined;

  // Optional future field support
  const agentEmail = (listing as any)?.listAgentEmail?.trim?.();

  // Prefer agent contact, fall back to office (display only)
  const displayPhone = agentPhone || officePhone;

  const idxLogo =
    listing.displayCompliance?.IDXLogo?.LogoUri ||
    listing.displayCompliance?.IDXLogoSmall?.LogoUri;

  const handleCall = () => {
    if (typeof window !== "undefined") {
      window.location.href = "tel:7608336334";
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleCall();
    }
  };

  return (
    <section
      role="button"
      aria-label="Listing attribution"
      tabIndex={0}
      onClick={handleCall}
      onKeyDown={handleKey}
      className={clsx(
        `text-xs ${textMuted} leading-snug`,
        "flex flex-wrap items-center gap-x-2 gap-y-1",
        "cursor-pointer select-none",
        className
      )}
      data-testid="listing-attribution"
    >
      {idxLogo ? (
        <span className="inline-flex items-center justify-center shrink-0">
          <Image
            src={idxLogo}
            alt="IDX logo"
            width={18}
            height={18}
            className="rounded"
            priority
          />
        </span>
      ) : null}

      <span className={textTertiary}>Listed by</span>

      <span className={textSecondary}>
        {officeName || "Listing Brokerage"}
        {agentName ? `, ${agentName}` : ""}
      </span>

      {displayPhone ? (
        <>
          <span className={textMuted}>·</span>
          <span>{displayPhone}</span>
        </>
      ) : null}

      {agentEmail ? (
        <>
          <span className={textMuted}>·</span>
          <span className="break-all">{agentEmail}</span>
        </>
      ) : null}
    </section>
  );
}
