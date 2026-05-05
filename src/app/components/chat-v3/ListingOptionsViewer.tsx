"use client";

// src/app/components/chat-v3/ListingOptionsViewer.tsx
//
// Wraps ListingOptionsCarousel + ListingOptionsList behind a Panel/List
// toggle so the chat surface shows one view at a time instead of stacking
// both. Default is panel (image-forward, auto-rotates) since it reads
// faster at a glance; List is a click away for users who want every
// card visible without scrolling.

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { LayoutGrid, List, Map as MapIcon } from "lucide-react";
import ListingOptionsCarousel from "./ListingOptionsCarousel";
import ListingOptionsList from "./ListingOptionsList";
import type { PreviewListing } from "@/lib/chat-search/types";

// ChatMapView pulls in maplibre-gl (heavy). Lazy-load it so users who
// stay on Panel/List don't pay the cost.
const ChatMapView = dynamic(
  () => import("@/app/components/chat/ChatMapView"),
  { ssr: false, loading: () => <div className="h-72 bg-gray-100 rounded-lg animate-pulse" /> }
);

type ViewMode = "panel" | "list" | "map";

export default function ListingOptionsViewer({
  listings,
  title,
  scopeLabel,
  defaultMode = "panel",
}: {
  listings: PreviewListing[];
  title?: string;
  scopeLabel?: string;
  defaultMode?: ViewMode;
}) {
  const [mode, setMode] = useState<ViewMode>(defaultMode);

  // Map mode needs lat/lng; if none of the listings carry coords, hide
  // the map tab entirely so the user doesn't switch to an empty map.
  const hasMappable = useMemo(
    () => listings.some((l) => typeof l.latitude === "number" && typeof l.longitude === "number"),
    [listings]
  );

  if (!listings || listings.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Header row: title on the left, view toggle on the right. */}
      <div className="flex items-center justify-between gap-3 px-1">
        <h4 className="text-sm font-semibold text-gray-900 truncate">
          {title}
        </h4>
        <div
          role="tablist"
          aria-label="Listing view"
          className="inline-flex bg-gray-100 rounded-md p-0.5 flex-shrink-0"
        >
          <button
            role="tab"
            aria-selected={mode === "panel"}
            onClick={() => setMode("panel")}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              mode === "panel"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Panel
          </button>
          <button
            role="tab"
            aria-selected={mode === "list"}
            onClick={() => setMode("list")}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              mode === "list"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
          {hasMappable && (
            <button
              role="tab"
              aria-selected={mode === "map"}
              onClick={() => setMode("map")}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                mode === "map"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Map
            </button>
          )}
        </div>
      </div>

      {mode === "panel" && <ListingOptionsCarousel listings={listings} />}
      {mode === "list" && (
        <ListingOptionsList
          listings={listings}
          scopeLabel={scopeLabel}
          mode="view-cma"
          hideHeader
        />
      )}
      {mode === "map" && (
        <div className="rounded-lg overflow-hidden border border-gray-200">
          <ChatMapView
            listings={listings.map((l) => ({
              id: l.listingKey,
              listingKey: l.listingKey,
              listingId: l.listingKey,
              address: l.address,
              latitude: l.latitude,
              longitude: l.longitude,
              price: l.price,
              beds: l.beds,
              baths: l.baths,
              sqft: l.sqft,
              image: l.primaryPhotoUrl,
              city: l.city,
              subdivision: l.subdivision,
              slugAddress: l.slugAddress,
              slug: l.slugAddress,
            }))}
          />
        </div>
      )}
    </div>
  );
}
