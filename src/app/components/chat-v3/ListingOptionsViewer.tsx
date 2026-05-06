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
import { LayoutGrid, List, Map as MapIcon, ArrowUpDown } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import ListingOptionsCarousel from "./ListingOptionsCarousel";
import ListingOptionsList from "./ListingOptionsList";
import { chatThemeClasses } from "./themeClasses";
import type { PreviewListing } from "@/lib/chat-search/types";

// Sort options exposed to the user. "default" preserves the order
// preview.ts returned (already ranked by relevance). The rest sort
// by the named numeric field with an explicit direction. Listings
// missing the field sink to the bottom regardless of direction so
// they don't pollute the head of the list.
type SortKey =
  | "default"
  | "price-desc"
  | "price-asc"
  | "beds-desc"
  | "baths-desc"
  | "sqft-desc"
  | "lot-desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "default", label: "Best match" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "price-asc", label: "Price: Low → High" },
  { value: "beds-desc", label: "Most beds" },
  { value: "baths-desc", label: "Most baths" },
  { value: "sqft-desc", label: "Largest sqft" },
  { value: "lot-desc", label: "Largest lot" },
];

function sortListings(listings: PreviewListing[], key: SortKey): PreviewListing[] {
  if (key === "default") return listings;
  // Don't mutate the prop array — caller may share it with other consumers.
  const arr = [...listings];
  // Returning Infinity for missing values pushes them to the end of an
  // ascending sort; -Infinity does the same for descending. Each branch
  // picks the right sentinel for its direction.
  switch (key) {
    case "price-desc":
      return arr.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    case "price-asc":
      return arr.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    case "beds-desc":
      return arr.sort((a, b) => (b.beds ?? -Infinity) - (a.beds ?? -Infinity));
    case "baths-desc":
      return arr.sort((a, b) => (b.baths ?? -Infinity) - (a.baths ?? -Infinity));
    case "sqft-desc":
      return arr.sort((a, b) => (b.sqft ?? -Infinity) - (a.sqft ?? -Infinity));
    case "lot-desc":
      return arr.sort((a, b) => (b.lotSize ?? -Infinity) - (a.lotSize ?? -Infinity));
    default:
      return arr;
  }
}

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
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const t = chatThemeClasses(isLight);

  // Sort once here and forward the result to whichever view is active —
  // panel/list/map all consume the same ordered array, so toggling
  // views never re-shuffles what the user is looking at.
  const sortedListings = useMemo(
    () => sortListings(listings, sortKey),
    [listings, sortKey]
  );

  // Map mode needs lat/lng; if none of the listings carry coords, hide
  // the map tab entirely so the user doesn't switch to an empty map.
  const hasMappable = useMemo(
    () => listings.some((l) => typeof l.latitude === "number" && typeof l.longitude === "number"),
    [listings]
  );

  if (!listings || listings.length === 0) return null;

  // Tab styling — selected tab gets the card background + primary text;
  // unselected tabs are muted.
  const tabBase = "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors";
  const tabSelected = `${t.bgCard} ${t.textPrimary} shadow-sm`;
  const tabUnselected = `${t.textMuted} hover:${isLight ? "text-gray-700" : "text-neutral-200"}`;

  return (
    <div className="space-y-2">
      {/* Header row: title on the left, sort + view toggle on the right. */}
      <div className="flex items-center justify-between gap-3 px-1">
        <h4 className={`text-sm font-semibold truncate ${t.textPrimary}`}>
          {title}
        </h4>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Sort dropdown. Native <select> keeps it accessible + small;
              wrapped so the icon and chevron aren't double-rendered. */}
          <label className={`relative inline-flex items-center gap-1 text-xs ${t.textMuted}`}>
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              aria-label="Sort listings"
              className={`text-xs font-medium rounded-md border-0 px-2 py-1 pr-6 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400 ${t.bgInputPill} ${t.textPrimary}`}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        <div
          role="tablist"
          aria-label="Listing view"
          className={`inline-flex rounded-md p-0.5 flex-shrink-0 ${t.bgInputPill}`}
        >
          <button
            role="tab"
            aria-selected={mode === "panel"}
            onClick={() => setMode("panel")}
            className={`${tabBase} ${mode === "panel" ? tabSelected : tabUnselected}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Panel
          </button>
          <button
            role="tab"
            aria-selected={mode === "list"}
            onClick={() => setMode("list")}
            className={`${tabBase} ${mode === "list" ? tabSelected : tabUnselected}`}
          >
            <List className="w-3.5 h-3.5" />
            List
          </button>
          {hasMappable && (
            <button
              role="tab"
              aria-selected={mode === "map"}
              onClick={() => setMode("map")}
              className={`${tabBase} ${mode === "map" ? tabSelected : tabUnselected}`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Map
            </button>
          )}
        </div>
        </div>
      </div>

      {mode === "panel" && <ListingOptionsCarousel listings={sortedListings} />}
      {mode === "list" && (
        <ListingOptionsList
          listings={sortedListings}
          scopeLabel={scopeLabel}
          mode="view-cma"
          hideHeader
        />
      )}
      {mode === "map" && (
        <div className={`rounded-lg overflow-hidden border ${t.border}`}>
          <ChatMapView
            listings={sortedListings.map((l) => ({
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
