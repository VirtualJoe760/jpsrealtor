"use client";

// Discover = swipe deck + optional refine. The deck populates AS-IS by
// default (a fresh batch, no questions asked); the "Refine" control lets a
// visitor discover with specifics in mind — an area, minimum beds, a pool,
// a price ceiling — without leaving the swipe experience.
//
// Note: property sub-type (condo vs house) isn't in the search filter surface
// yet — add it here the day the API exposes it.

import { useState } from "react";
import type { ListingSummary } from "@/lib/types";
import SwipeDeck from "@/components/SwipeDeck";

type Filters = {
  city: string;
  minBeds: string;
  hasPool: boolean;
  maxPrice: string;
};

const EMPTY: Filters = { city: "", minBeds: "", hasPool: false, maxPrice: "" };

export default function DiscoverClient({ initial }: { initial: ListingSummary[] }) {
  const [items, setItems] = useState<ListingSummary[]>(initial);
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState(0); // bump to remount the deck
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const active = filters.city || filters.minBeds || filters.hasPool || filters.maxPrice;

  async function apply(next: Filters) {
    setLoading(true);
    setNote(null);
    try {
      const p = new URLSearchParams({ limit: "30" });
      if (next.city.trim()) p.set("city", next.city.trim());
      if (next.minBeds) p.set("minBeds", next.minBeds);
      if (next.hasPool) p.set("hasPool", "true");
      if (next.maxPrice) p.set("maxPrice", next.maxPrice.replace(/[^0-9]/g, ""));
      const res = await fetch(`/api/listings?${p.toString()}`);
      const data = await res.json();
      const found: ListingSummary[] = Array.isArray(data?.items) ? data.items : [];
      if (found.length === 0) {
        setNote("No homes match that yet — try widening the area or price.");
      } else {
        setItems(found);
        setApplied((n) => n + 1);
        setOpen(false);
      }
    } catch {
      setNote("Couldn't load homes right now — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Refine toggle — collapsed by default so the as-is deck stays clean */}
      <div className="mb-4 flex justify-center">
        <button
          onClick={() => setOpen((o) => !o)}
          className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
            active
              ? "border-brand bg-brand text-white"
              : "border-gray-300 bg-white text-gray-600 hover:border-brand hover:text-brand"
          }`}
        >
          {active ? "Refining ✓" : "Refine"} — area, beds, pool, price
        </button>
      </div>

      {open && (
        <div className="mx-auto mb-6 max-w-sm rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              placeholder="City / area"
              className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <select
              value={filters.minBeds}
              onChange={(e) => setFilters({ ...filters, minBeds: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">Any beds</option>
              <option value="1">1+ beds</option>
              <option value="2">2+ beds</option>
              <option value="3">3+ beds</option>
              <option value="4">4+ beds</option>
            </select>
            <input
              value={filters.maxPrice}
              onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
              placeholder="Max price"
              inputMode="numeric"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <label className="col-span-2 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={filters.hasPool}
                onChange={(e) => setFilters({ ...filters, hasPool: e.target.checked })}
                className="h-4 w-4 accent-[var(--brand)]"
              />
              Has a pool
            </label>
          </div>
          {note && <p className="mt-3 text-xs text-amber-700">{note}</p>}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => apply(filters)}
              disabled={loading}
              className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {loading ? "Finding homes…" : "Discover these"}
            </button>
            {active && (
              <button
                onClick={() => {
                  setFilters(EMPTY);
                  apply(EMPTY);
                }}
                disabled={loading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      <SwipeDeck key={applied} listings={items} />
    </div>
  );
}
