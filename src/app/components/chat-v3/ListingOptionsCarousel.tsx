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
// Auto-scrolls cards into view on a 4s rotation; pauses while the user
// is hovering/touching the carousel and for 6s after they manually
// scrolled. Used inside ListingOptionsViewer alongside ListingOptionsList.

import { useEffect, useRef, useState } from "react";
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

function dispatchOpenPanel(
  listing: PreviewListing,
  siblings?: PreviewListing[],
  index?: number
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(OPEN_PANEL_EVENT, { detail: { listing, siblings, index } })
  );
}

const fmtPrice = (n?: number) => (n ? `$${n.toLocaleString()}` : "—");
const fmtCount = (n?: number) =>
  typeof n === "number" && n > 0 ? n.toString() : "—";
const fmtSqft = (n?: number) =>
  typeof n === "number" && n > 0 ? n.toLocaleString() : "—";

// Continuous-scroll speed in px/sec — slow enough that a user can read
// each card as it drifts past, fast enough to feel alive on long lists.
const SCROLL_SPEED_PX_PER_SEC = 32;
const PAUSE_AFTER_INTERACTION_MS = 6000;

export default function ListingOptionsCarousel({
  listings,
  title,
}: {
  listings: PreviewListing[];
  title?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  // Resume timer fires after the user stops interacting; until it
  // expires we keep auto-scroll suspended so we don't fight the user.
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Continuous smooth scroll using requestAnimationFrame. Each frame we
  // advance scrollLeft by `speed * deltaSec` px. When we hit the end we
  // jump back to 0 without animation (snap reset) so the rotation is
  // seamless. Browser-native scroll-snap is disabled for the auto path
  // because snap-stop fights the per-frame increments.
  useEffect(() => {
    if (paused || !listings || listings.length <= 1) return;
    const el = scrollRef.current;
    if (!el) return;

    let rafId = 0;
    let lastTs = performance.now();

    const step = (ts: number) => {
      const dt = (ts - lastTs) / 1000; // seconds
      lastTs = ts;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) {
        rafId = requestAnimationFrame(step);
        return;
      }
      let next = el.scrollLeft + SCROLL_SPEED_PX_PER_SEC * dt;
      if (next >= maxScroll - 1) {
        // Wrap to start without animation so the loop reads as continuous.
        next = 0;
      }
      el.scrollLeft = next;
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [paused, listings]);

  const pauseFor = (ms: number) => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), ms);
  };

  // Cleanup any pending resume timer on unmount.
  useEffect(() => () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  if (!listings || listings.length === 0) return null;

  return (
    <div className="space-y-2">
      {title && (
        <h4 className="text-sm font-semibold text-gray-900 px-1">{title}</h4>
      )}
      {/* Horizontal scroll list with continuous auto-rotation. We don't
          use scroll-snap here because snap-stop fights the per-frame
          scrollLeft increments — the carousel would judder at every
          snap point. User interaction pauses the rAF loop so they can
          flick freely without the auto-scroll fighting back. */}
      <div
        ref={scrollRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => pauseFor(PAUSE_AFTER_INTERACTION_MS)}
        onWheel={() => pauseFor(PAUSE_AFTER_INTERACTION_MS)}
        className="flex gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "thin" }}
      >
        {listings.map((l, i) => (
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
                  onClick={() => dispatchOpenPanel(l, listings, i)}
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
