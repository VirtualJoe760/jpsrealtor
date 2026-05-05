"use client";

// src/app/components/chat-v3/ListingOptionsList.tsx
//
// Disambiguation list for the cma intent when the user types a street
// without a house number ("cma for desi drive"). Renders the candidate
// properties with two actions per card:
//
//   Details     → /mls-listings/[slugAddress] (full listing page)
//   Generate CMA → dispatches a `chatv3:send-message` window event that
//                  ChatWidget listens for, submitting a new chat turn
//                  with "generate a cma for {address}". This keeps the
//                  card decoupled from ChatProvider — anyone can listen.

import Link from "next/link";
import Image from "next/image";
import { Bed, Bath, Maximize2, FileText, ExternalLink } from "lucide-react";
import type { PreviewListing } from "@/lib/chat-search/types";

const SEND_MESSAGE_EVENT = "chatv3:send-message";

export type ChatV3SendMessageEvent = CustomEvent<{ message: string }>;

function dispatchChatMessage(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SEND_MESSAGE_EVENT, { detail: { message } })
  );
}

const fmtPrice = (n?: number) => (n ? `$${n.toLocaleString()}` : "—");

// PreviewListing pulls beds/baths/sqft straight from preview.ts mapListing,
// which already coalesces bedsTotal ?? bedroomsTotal etc. But we still
// guard at the render level — if the raw listing doc was missing both
// canonical fields, the slim shape can carry 0 forward and we display
// "—" rather than "0 bd / 0 ba / 0 sqft" which reads as broken.
const fmtCount = (n?: number) =>
  typeof n === "number" && n > 0 ? n.toString() : "—";
const fmtSqft = (n?: number) =>
  typeof n === "number" && n > 0 ? n.toLocaleString() : "—";

export default function ListingOptionsList({
  listings,
  scopeLabel,
}: {
  listings: PreviewListing[];
  scopeLabel?: string;
}) {
  if (!listings || listings.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between px-1">
        <h4 className="text-sm font-semibold text-gray-900">
          {listings.length} {listings.length === 1 ? "property" : "properties"}
          {scopeLabel ? ` on ${scopeLabel}` : ""}
        </h4>
        <span className="text-xs text-gray-500">Pick one</span>
      </div>

      <ul className="space-y-2">
        {listings.map((l) => (
          <li
            key={l.listingKey}
            className="flex gap-3 p-2 sm:p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            {/* Photo */}
            <div className="flex-shrink-0 w-20 h-20 sm:w-28 sm:h-20 rounded-md overflow-hidden bg-gray-100">
              {l.primaryPhotoUrl ? (
                <Image
                  src={l.primaryPhotoUrl}
                  alt={l.address}
                  width={112}
                  height={80}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                  No photo
                </div>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-base font-bold text-blue-600">
                  {fmtPrice(l.price)}
                </span>
                <span className="text-sm text-gray-700 truncate">
                  {l.address}
                </span>
              </div>
              {l.subdivision && (
                <div className="text-xs text-gray-500 truncate mt-0.5">
                  {l.subdivision}
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-600 mt-1.5">
                <span className="inline-flex items-center gap-1">
                  <Bed className="w-3.5 h-3.5" />
                  {fmtCount(l.beds)} bd
                </span>
                <span className="inline-flex items-center gap-1">
                  <Bath className="w-3.5 h-3.5" />
                  {fmtCount(l.baths)} ba
                </span>
                <span className="inline-flex items-center gap-1">
                  <Maximize2 className="w-3.5 h-3.5" />
                  {fmtSqft(l.sqft)} sqft
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1.5 self-center flex-shrink-0">
              <Link
                href={`/mls-listings/${l.slugAddress || l.listingKey}`}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-md transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Details
              </Link>
              <button
                onClick={() =>
                  dispatchChatMessage(`generate a cma for ${l.address}`)
                }
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-md transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Generate CMA
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Re-export the event name so callers (ChatWidget) can subscribe with
// the same string instead of duplicating it.
export { SEND_MESSAGE_EVENT };
