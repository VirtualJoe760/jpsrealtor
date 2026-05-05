"use client";

// src/app/components/chat-v3/ListingOptionsCarousel.tsx
//
// Horizontal carousel sibling of ListingOptionsList. Same per-card data
// flow (PreviewListing fields, "—" for missing values, no zero-bd
// surprises) and the same two-button action set:
//
//   View         → opens the production ListingBottomPanel via
//                  chatv3:open-listing-panel window event
//   Generate CMA → submits a fresh chat turn via chatv3:send-message
//
// Used alongside ListingOptionsList in PreviewRenderer for
// listing-search / neighborhood / listingResults intents — the
// carousel is for image-forward skimming, the list is for committing.

import Image from "next/image";
import { Bed, Bath, Maximize2, FileText, Eye } from "lucide-react";
import type { PreviewListing } from "@/lib/chat-search/types";

const SEND_MESSAGE_EVENT = "chatv3:send-message";
const OPEN_PANEL_EVENT = "chatv3:open-listing-panel";

function dispatchChatMessage(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SEND_MESSAGE_EVENT, { detail: { message } })
  );
}

function dispatchOpenPanel(listing: PreviewListing) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(OPEN_PANEL_EVENT, { detail: { listing } })
  );
}

const fmtPrice = (n?: number) => (n ? `$${n.toLocaleString()}` : "—");
const fmtCount = (n?: number) =>
  typeof n === "number" && n > 0 ? n.toString() : "—";
const fmtSqft = (n?: number) =>
  typeof n === "number" && n > 0 ? n.toLocaleString() : "—";

export default function ListingOptionsCarousel({
  listings,
  title,
}: {
  listings: PreviewListing[];
  title?: string;
}) {
  if (!listings || listings.length === 0) return null;

  return (
    <div className="space-y-2">
      {title && (
        <h4 className="text-sm font-semibold text-gray-900 px-1">{title}</h4>
      )}
      {/* Horizontal scroll list. snap-x makes finger-flicks land on a
          card edge instead of mid-card. Hide native scrollbar in the
          chat surface — it's distracting and the swipe affordance is
          already implied by the cards bleeding off the right edge. */}
      <div
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: "thin" }}
      >
        {listings.map((l) => (
          <article
            key={l.listingKey}
            className="flex-shrink-0 w-64 sm:w-72 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm snap-start"
          >
            {/* Photo */}
            <div className="relative w-full h-36 bg-gray-100">
              {l.primaryPhotoUrl ? (
                <Image
                  src={l.primaryPhotoUrl}
                  alt={l.address}
                  fill
                  sizes="288px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                  No photo
                </div>
              )}
              <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded">
                {fmtPrice(l.price)}
              </div>
            </div>

            {/* Body */}
            <div className="p-3 space-y-1">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {l.address}
              </div>
              {l.subdivision && (
                <div className="text-xs text-gray-500 truncate">
                  {l.subdivision}
                </div>
              )}
              <div className="flex items-center gap-2.5 text-xs text-gray-600 pt-0.5">
                <span className="inline-flex items-center gap-1">
                  <Bed className="w-3.5 h-3.5" />
                  {fmtCount(l.beds)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Bath className="w-3.5 h-3.5" />
                  {fmtCount(l.baths)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Maximize2 className="w-3.5 h-3.5" />
                  {fmtSqft(l.sqft)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-1.5 pt-2">
                <button
                  onClick={() => dispatchOpenPanel(l)}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-md transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View
                </button>
                <button
                  onClick={() =>
                    dispatchChatMessage(`generate a cma for ${l.address}`)
                  }
                  className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-md transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  CMA
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
