// src/app/components/mls/ListingAttribution.tsx
"use client";

import clsx from "clsx";
import Image from "next/image";
import type { IListing } from "@/models/listings";

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
  listing: IListing;
  className?: string;
}) {
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
        "text-xs text-zinc-500 leading-snug",
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

      <span className="text-zinc-400">Listed by</span>

      <span className="text-zinc-300">
        {officeName || "Listing Brokerage"}
        {agentName ? `, ${agentName}` : ""}
      </span>

      {displayPhone ? (
        <>
          <span className="text-zinc-600">·</span>
          <span>{displayPhone}</span>
        </>
      ) : null}

      {agentEmail ? (
        <>
          <span className="text-zinc-600">·</span>
          <span className="break-all">{agentEmail}</span>
        </>
      ) : null}
    </section>
  );
}
