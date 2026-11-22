"use client";

import CMAReport from "@/app/components/cma/CMAReport";
import { adaptPrebuiltCmaStats } from "@/lib/cma/adapt-prebuilt-stats";
import type { IUnifiedListing } from "@/models/unified-listing";

// CMA section — uses pre-computed cmaStats from the listing document when
// available (sub-50ms render), falls back to on-demand /api/cma/generate
// otherwise (1-20s). cmaStats is written by build-listing-cma.py on a
// twice-weekly VPS cron — see docs/cma/LISTING_CMA_BACKEND_BUILDER.md.
//
// Shape note: the Python script writes a flat shape (subject.pool: bool)
// for storage compactness, but the TS components were built around the
// on-demand engine's ResolvedAttribute shape (subject.resolved.pool).
// adaptPrebuiltCmaStats() bridges the two without forcing a Python rewrite.
export default function ListingCMASection({
  listing,
  prebuiltOnly = false,
}: {
  listing: IUnifiedListing;
  prebuiltOnly?: boolean;
}) {
  const listingKey = listing.listingKey || "";
  if (!listingKey) return null;

  // Prefer the pre-computed stats; null when the cron hasn't covered this
  // listing yet, in which case CMAReport falls through to its existing
  // /api/cma/subdivision/{slug} → /api/cma/generate flow.
  const cmaStats = (listing as any).cmaStats;
  const preloaded = cmaStats ? adaptPrebuiltCmaStats(cmaStats, listing) : null;
  if (prebuiltOnly && !preloaded) return null;

  return (
    <section className="py-8 px-4 md:px-8">
      <CMAReport
        listingKey={listingKey}
        subdivisionName={listing.subdivisionName}
        result={preloaded || undefined}
      />
    </section>
  );
}
