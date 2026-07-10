"use client";

// Client boundary that lazy-loads the Leaflet map with SSR disabled (Leaflet
// needs `window`). `dynamic(..., { ssr: false })` is only allowed inside a
// Client Component — this wrapper lets Server Components (e.g. the detail page)
// render the map too.

import dynamic from "next/dynamic";
import type { ListingSummary } from "@/lib/types";

const ListingMap = dynamic(() => import("./ListingMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-gray-400">
      Loading map…
    </div>
  ),
});

export default function ListingMapClient({ listings }: { listings: ListingSummary[] }) {
  return <ListingMap listings={listings} />;
}
