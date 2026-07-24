"use client";

// Swipe-to-save listing discovery — a card stack the visitor swipes through.
// Right (or ♥) saves to favorites; left (or ✕) passes. Pointer + touch drag,
// keyboard arrows, and buttons all work. Reuses useFavorites (localStorage) so
// saved homes show up on /favorites just like the heart button.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ListingSummary } from "@/lib/types";
import { useFavorites } from "@/lib/favorites";
import { money, num } from "@/lib/format";

const SWIPE_THRESHOLD = 90; // px past which a release commits the swipe

export default function SwipeDeck({ listings }: { listings: ListingSummary[] }) {
  const { toggle, isFavorite } = useFavorites();
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [leaving, setLeaving] = useState<"left" | "right" | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const current = listings[index];
  const next = listings[index + 1];

  const commit = useCallback(
    (dir: "left" | "right") => {
      if (!current || leaving) return;
      if (dir === "right" && !isFavorite(current.listingKey)) {
        toggle(current);
        setSavedCount((c) => c + 1);
      }
      setLeaving(dir);
      setDrag(null);
      setStart(null);
      // Advance after the exit animation.
      window.setTimeout(() => {
        setIndex((i) => i + 1);
        setLeaving(null);
      }, 240);
    },
    [current, leaving, isFavorite, toggle]
  );

  // Keyboard: ← pass, → save.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") commit("left");
      if (e.key === "ArrowRight") commit("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit]);

  if (!current) {
    return (
      <div className="mx-auto max-w-sm rounded-2xl border border-gray-200 bg-white p-10 text-center">
        <p className="text-lg font-semibold text-gray-900">That's everything!</p>
        <p className="mt-2 text-sm text-gray-500">
          You saved {savedCount} {savedCount === 1 ? "home" : "homes"}.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/favorites" className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white">
            View saved
          </Link>
          <Link href="/listings" className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700">
            Browse all
          </Link>
        </div>
      </div>
    );
  }

  const dx = drag && start ? drag.x - start.x : 0;
  const rot = leaving ? (leaving === "right" ? 18 : -18) : dx / 18;
  const tx = leaving ? (leaving === "right" ? 600 : -600) : dx;
  const opacity = leaving ? 0 : 1;

  return (
    <div className="mx-auto max-w-sm select-none">
      <div className="relative h-[30rem]">
        {/* Peek of the next card behind. */}
        {next && (
          <div className="absolute inset-0 scale-[0.96] rounded-2xl border border-gray-200 bg-white opacity-70" aria-hidden />
        )}

        <div
          className="absolute inset-0 cursor-grab overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg active:cursor-grabbing"
          style={{
            transform: `translateX(${tx}px) rotate(${rot}deg)`,
            opacity,
            transition: drag ? "none" : "transform 0.24s ease, opacity 0.24s ease",
            touchAction: "pan-y",
          }}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            setStart({ x: e.clientX, y: e.clientY });
            setDrag({ x: e.clientX, y: e.clientY });
          }}
          onPointerMove={(e) => {
            if (start) setDrag({ x: e.clientX, y: e.clientY });
          }}
          onPointerUp={() => {
            if (dx > SWIPE_THRESHOLD) commit("right");
            else if (dx < -SWIPE_THRESHOLD) commit("left");
            else {
              setDrag(null);
              setStart(null);
            }
          }}
        >
          {/* Photo */}
          <div className="relative h-64 w-full bg-gray-100">
            {current.thumbUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.thumbUrl} alt={current.address || ""} className="h-full w-full object-cover" draggable={false} />
            )}
            {/* Drag hint overlays */}
            <div
              className="pointer-events-none absolute left-4 top-4 rounded-md border-2 border-emerald-500 px-3 py-1 text-lg font-extrabold text-emerald-500"
              style={{ opacity: Math.min(1, Math.max(0, dx / SWIPE_THRESHOLD)) }}
            >
              SAVE
            </div>
            <div
              className="pointer-events-none absolute right-4 top-4 rounded-md border-2 border-rose-500 px-3 py-1 text-lg font-extrabold text-rose-500"
              style={{ opacity: Math.min(1, Math.max(0, -dx / SWIPE_THRESHOLD)) }}
            >
              PASS
            </div>
          </div>

          {/* Facts */}
          <div className="p-5">
            <p className="text-xl font-bold text-gray-900">{money(current.currentPrice ?? current.listPrice)}</p>
            <p className="mt-0.5 text-sm text-gray-600">
              {current.address}
              {current.city ? `, ${current.city}` : ""}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {[
                current.beds != null ? `${num(current.beds)} bd` : null,
                current.baths != null ? `${num(current.baths)} ba` : null,
                current.sqft != null ? `${num(current.sqft)} sqft` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {(current.listOfficeName || current.listAgentName) && (
              <p className="mt-2 text-[11px] text-gray-400">
                Listed by {[current.listOfficeName, current.listAgentName].filter(Boolean).join(" — ")}
              </p>
            )}
            <Link
              href={current.detailUrl}
              className="mt-3 inline-block text-sm font-semibold text-brand"
              onPointerDown={(e) => e.stopPropagation()}
            >
              View details →
            </Link>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 flex items-center justify-center gap-6">
        <button
          onClick={() => commit("left")}
          aria-label="Pass"
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-rose-200 bg-white text-2xl text-rose-500 shadow-sm transition hover:scale-105 hover:border-rose-400"
        >
          ✕
        </button>
        <span className="text-xs text-gray-400">
          {index + 1} / {listings.length}
        </span>
        <button
          onClick={() => commit("right")}
          aria-label="Save"
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-200 bg-white text-2xl text-emerald-500 shadow-sm transition hover:scale-105 hover:border-emerald-400"
        >
          ♥
        </button>
      </div>
      <p className="mt-4 text-center text-xs text-gray-400">
        Swipe or use ← / → · saved homes appear on your Favorites
      </p>
    </div>
  );
}
