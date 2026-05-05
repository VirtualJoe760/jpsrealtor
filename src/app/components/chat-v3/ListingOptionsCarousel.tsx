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
import { Bed, Bath, Maximize2, FileText, Eye, Sparkles, Heart } from "lucide-react";
import type { PreviewListing } from "@/lib/chat-search/types";

const SEND_MESSAGE_EVENT = "chatv3:send-message";
const OPEN_PANEL_EVENT = "chatv3:open-listing-panel";
const TOGGLE_FAVORITE_EVENT = "chatv3:toggle-favorite";

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

function dispatchToggleFavorite(listing: PreviewListing) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(TOGGLE_FAVORITE_EVENT, { detail: { listing } })
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

  // Continuous smooth scroll using requestAnimationFrame.
  //
  // Subtlety: browsers floor fractional scrollLeft values, so writing
  // 0.2 each frame leaves DOM at 0 forever and the carousel never
  // moves. Solution: accumulate position in a JS-side `virtualLeft`
  // (full precision), and only commit to el.scrollLeft as an integer
  // — that way fractional ticks add up and eventually cross a pixel
  // boundary, producing visible motion.
  //
  // The rAF runs from mount to unmount. Each frame reads pausedRef
  // live, so user interaction doesn't restart the loop.
  useEffect(() => {
    if (listingsCount <= 1) return;

    let rafId = 0;
    let lastTs = performance.now();
    let virtualLeft = 0;

    const step = (ts: number) => {
      const dt = (ts - lastTs) / 1000; // seconds
      lastTs = ts;
      const el = scrollRef.current;
      if (el && !pausedRef.current) {
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll > 0) {
          // Drift the virtual position. Wrap to start when we hit
          // the end so the loop reads as continuous.
          virtualLeft += SCROLL_SPEED_PX_PER_SEC * dt;
          if (virtualLeft >= maxScroll - 1) virtualLeft = 0;
          // Sync user-driven scrolls (mouse drag / wheel / touch
          // flick) back into virtualLeft so we don't snap them
          // back when the user lets go.
          const dom = el.scrollLeft;
          if (Math.abs(dom - virtualLeft) > 4) virtualLeft = dom;
          // Commit as an integer — fractional values get floored
          // by the browser, which prevents accumulation.
          const target = Math.round(virtualLeft);
          if (target !== el.scrollLeft) el.scrollLeft = target;
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
              {/* Stats row — bd/ba/sqft on the left, AI + heart icons
                  on the right. Same row keeps the card compact;
                  justify-between pushes the icon group to the
                  opposite end so it reads as a balanced trailing
                  action cluster. */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="flex items-center gap-2.5 text-xs text-gray-600 min-w-0">
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
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() =>
                      dispatchChatMessage(`Tell me about ${l.address}`)
                    }
                    title="Ask AI about this property"
                    className="w-6 h-6 inline-flex items-center justify-center bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-600 border border-blue-200 rounded transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => dispatchToggleFavorite(l)}
                    title="Save to favorites"
                    className="w-6 h-6 inline-flex items-center justify-center bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 border border-rose-200 rounded transition-colors"
                  >
                    <Heart className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Primary actions */}
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
