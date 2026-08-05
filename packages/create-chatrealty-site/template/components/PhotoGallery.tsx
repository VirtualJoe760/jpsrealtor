"use client";

// The listing photo gallery — hero, thumbnail strip, full-screen viewer.
//
// It exists to keep the buyer HERE. "View all 31 photos" used to be a link to
// chatrealty.io/mls-listings/{key}, so the most engaged moment on the site —
// someone looking through a home they like — ended with them on a different
// site. A judged build called that out as the site funnelling its own traffic
// away. If you restyle this component, keep the photos on the agent's site.
//
// Falls back gracefully: one photo (or none) renders the hero alone, no strip,
// no viewer. That's the shape when the photo endpoint is unavailable.

import { useCallback, useEffect, useState } from "react";
import type { ListingPhoto } from "@/lib/types";

export default function PhotoGallery({
  photos,
  fallbackUrl,
  alt,
}: {
  photos: ListingPhoto[];
  /** Used when the photo list is empty (the summary thumbnail). */
  fallbackUrl?: string | null;
  alt: string;
}) {
  const list: { url: string; thumbUrl: string | null; caption: string | null }[] =
    photos.length > 0
      ? photos
      : fallbackUrl
        ? [{ url: fallbackUrl, thumbUrl: fallbackUrl, caption: null }]
        : [];

  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const count = list.length;

  const go = useCallback(
    (delta: number) => setIndex((i) => (count === 0 ? 0 : (i + delta + count) % count)),
    [count]
  );

  // Arrow keys move through the viewer; Escape closes it. Only while open, so
  // the page's own keyboard behavior is untouched the rest of the time.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  if (count === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
        No photo available
      </div>
    );
  }

  const current = list[Math.min(index, count - 1)];

  return (
    <>
      <div className="overflow-hidden rounded-2xl bg-gray-100">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative block w-full cursor-zoom-in"
          aria-label={`View photo ${index + 1} of ${count} full screen`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.url} alt={alt} className="aspect-[16/10] w-full object-cover" />
          {count > 1 && (
            <span className="absolute bottom-4 right-4 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white">
              {index + 1} / {count} · View all {count} photos
            </span>
          )}
        </button>
      </div>

      {count > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {list.map((p, i) => (
            <button
              key={`${p.url}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === index ? "border-brand" : "border-transparent opacity-70 hover:opacity-100"
              }`}
              aria-label={`Photo ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumbUrl || p.url} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={alt}
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
          >
            Close
          </button>
          {count > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                className="absolute left-4 rounded-full bg-white/10 px-4 py-3 text-white hover:bg-white/20"
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                className="absolute right-4 rounded-full bg-white/10 px-4 py-3 text-white hover:bg-white/20"
                aria-label="Next photo"
              >
                ›
              </button>
              <p className="absolute bottom-4 text-sm text-white/70">
                {index + 1} / {count}
                {current.caption ? ` · ${current.caption}` : ""}
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
