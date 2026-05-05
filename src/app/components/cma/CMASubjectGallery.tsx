"use client";

// src/app/components/cma/CMASubjectGallery.tsx
//
// Horizontal photo carousel of the subject property, slotted between
// PricePositionCard and Active Properties on the CMA report. Mirrors
// the pattern from chat-v3 ListingOptionsCarousel (smooth horizontal
// scroll, hidden scrollbar, hover pause) but here the strip is static
// — no auto-rotate. Each photo is click-to-expand into a full-screen
// lightbox rendered via createPortal so it pins to the viewport
// regardless of any transformed ancestor.

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

// Same pattern as chat-v3 ListingOptionsCarousel: rAF accumulator
// drives a continuous smooth scroll. Browsers floor fractional
// scrollLeft, so we track full-precision position in JS and only
// commit Math.round() to the DOM. pauseRef lets hover/wheel pause
// without triggering effect re-runs.
const SCROLL_SPEED_PX_PER_SEC = 28;
const PAUSE_AFTER_INTERACTION_MS = 6000;

interface Props {
  photos: string[];
  address: string;
}

export default function CMASubjectGallery({ photos, address }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photosCount = photos?.length ?? 0;

  // Auto-scroll loop. Pauses while lightbox is open so we don't keep
  // sliding cards behind the modal. Survives parent re-renders
  // because the dep is just photosCount.
  useEffect(() => {
    if (photosCount <= 1) return;

    let rafId = 0;
    let lastTs = performance.now();
    let virtualLeft = 0;

    const step = (ts: number) => {
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;
      const el = scrollRef.current;
      if (el && !pausedRef.current && lightboxIndex === null) {
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll > 0) {
          virtualLeft += SCROLL_SPEED_PX_PER_SEC * dt;
          if (virtualLeft >= maxScroll - 1) virtualLeft = 0;
          // Re-sync if user dragged/wheeled the strip themselves
          const dom = el.scrollLeft;
          if (Math.abs(dom - virtualLeft) > 4) virtualLeft = dom;
          const target = Math.round(virtualLeft);
          if (target !== el.scrollLeft) el.scrollLeft = target;
        }
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [photosCount, lightboxIndex]);

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

  // Translate vertical wheel scroll into horizontal — without it the
  // page scrolls instead of the strip when the cursor is over the
  // carousel.
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
    pauseFor(PAUSE_AFTER_INTERACTION_MS);
  };

  // Cleanup pending resume timer on unmount
  useEffect(() => () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (photos.length === 0) return;
      const next = (index + photos.length) % photos.length;
      setLightboxIndex(next);
    },
    [photos.length]
  );

  // Lightbox keyboard nav — Esc closes, arrows navigate.
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") goTo(lightboxIndex - 1);
      if (e.key === "ArrowRight") goTo(lightboxIndex + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, goTo]);

  if (!photos || photos.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between px-1">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Property Photos
        </h4>
        <span className="text-xs text-gray-500">
          {photos.length} {photos.length === 1 ? "photo" : "photos"} · click to expand
        </span>
      </div>
      <div
        ref={scrollRef}
        onMouseEnter={pause}
        onMouseLeave={resume}
        onTouchStart={() => pauseFor(PAUSE_AFTER_INTERACTION_MS)}
        onWheel={handleWheel}
        className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {photos.map((src, i) => (
          <button
            key={i}
            onClick={() => setLightboxIndex(i)}
            className="flex-shrink-0 w-72 sm:w-80 h-44 sm:h-52 rounded-lg overflow-hidden bg-gray-100 hover:ring-2 hover:ring-blue-400 transition-all cursor-zoom-in"
            type="button"
          >
            <img
              src={src}
              alt={`${address} — photo ${i + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {/* Lightbox via portal — escapes any transformed ancestor so it
          pins to the actual viewport regardless of CMAReport's scroll
          position or animation transforms. */}
      {lightboxIndex !== null &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[1000] bg-black/95 flex items-center justify-center"
            onClick={() => setLightboxIndex(null)}
          >
            <button
              onClick={(ev) => {
                ev.stopPropagation();
                setLightboxIndex(null);
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute top-4 left-4 text-white/80 text-sm font-mono px-3 py-1 rounded-full bg-white/10">
              {lightboxIndex + 1} / {photos.length}
            </div>
            <img
              src={photos[lightboxIndex]}
              alt={`${address} — photo ${lightboxIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              onClick={(ev) => ev.stopPropagation()}
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={(ev) => {
                    ev.stopPropagation();
                    goTo(lightboxIndex - 1);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(ev) => {
                    ev.stopPropagation();
                    goTo(lightboxIndex + 1);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
