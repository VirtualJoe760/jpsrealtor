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

import { useEffect, useRef } from "react";
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
  // Refs for paused state + resume timer so the rAF loop reads them
  // without retriggering the effect. The previous state-based
  // implementation re-fired the effect on every render (parent passes
  // fresh listings array) — even with a stable [paused, listingsCount]
  // dep, dev hot-reload + React strict mode were enough to keep
  // canceling rAF before any frame painted visible motion.
  const pausedRef = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listingsCount = listings?.length ?? 0;

  // Continuous smooth scroll using requestAnimationFrame. The rAF loop
  // is set up ONCE on mount (or when length goes from 0/1 → many) and
  // runs until unmount. Each frame reads pausedRef live, so user
  // interaction doesn't restart the loop.
  useEffect(() => {
    if (listingsCount <= 1) return;
    const el = scrollRef.current;
    if (!el) return;

    let rafId = 0;
    let lastTs = performance.now();

    const step = (ts: number) => {
      const dt = (ts - lastTs) / 1000; // seconds
      lastTs = ts;
      // Skip motion while paused but keep ticking so we resume cleanly.
      if (!pausedRef.current) {
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll > 0) {
          let next = el.scrollLeft + SCROLL_SPEED_PX_PER_SEC * dt;
          if (next >= maxScroll - 1) {
            // Wrap to start so the loop reads as continuous.
            next = 0;
          }
          el.scrollLeft = next;
        }
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [listingsCount]);

  const pause = () => {
    pausedRef.current = true;
  };
  const resume = () => {
    pausedRef.current = false;
  };
  const pauseFor = (ms: number) => {
    pause();
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(resume, ms);
  };

  // Translate vertical wheel scroll into horizontal carousel scroll
  // when the cursor is over the strip — without this the page
  // scrolls vertically and the user can't browse the carousel with
  // a mouse wheel. Also pauses auto-scroll for a few seconds so the
  // user's intent isn't fought by the rotation.
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    // Only intercept when the dominant axis is vertical (regular
    // mouse wheels). Trackpads that already produce deltaX let the
    // browser's native horizontal scroll do its thing.
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
    pauseFor(PAUSE_AFTER_INTERACTION_MS);
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
        onMouseEnter={pause}
        onMouseLeave={resume}
        onTouchStart={() => pauseFor(PAUSE_AFTER_INTERACTION_MS)}
        onWheel={handleWheel}
        // Hidden scrollbar — Firefox/standards via scrollbarWidth,
        // WebKit/Blink via the arbitrary variant on ::-webkit-scrollbar.
        // Carousel rotates on its own and pauses on hover, so a visible
        // scrollbar is just chrome the user doesn't need.
        className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
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
