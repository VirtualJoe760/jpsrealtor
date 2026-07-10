"use client";

import { useCallback, useEffect, useState } from "react";
import type { ListingSummary, SearchResult } from "@/lib/types";
import ListingCard from "./ListingCard";
import ListingMapClient from "./ListingMapClient";

const LIMIT = 24;

type Filters = {
  city: string;
  minPrice: string;
  maxPrice: string;
  minBeds: string;
  minBaths: string;
  hasPool: boolean;
};

const EMPTY: Filters = { city: "", minPrice: "", maxPrice: "", minBeds: "", minBaths: "", hasPool: false };

export default function ListingsBrowser({ initialCity = "" }: { initialCity?: string }) {
  const [draft, setDraft] = useState<Filters>({ ...EMPTY, city: initialCity });
  const [applied, setApplied] = useState<Filters>({ ...EMPTY, city: initialCity });
  const [items, setItems] = useState<ListingSummary[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"grid" | "map">("grid");

  const load = useCallback(async (f: Filters, skip: number, append: boolean) => {
    setLoading(true);
    setError("");
    const p = new URLSearchParams();
    if (f.city) p.set("city", f.city);
    if (f.minPrice) p.set("minPrice", f.minPrice);
    if (f.maxPrice) p.set("maxPrice", f.maxPrice);
    if (f.minBeds) p.set("minBeds", f.minBeds);
    if (f.minBaths) p.set("minBaths", f.minBaths);
    if (f.hasPool) p.set("hasPool", "true");
    p.set("limit", String(LIMIT));
    p.set("skip", String(skip));
    try {
      const res = await fetch(`/api/listings?${p.toString()}`);
      const data: SearchResult & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      if (!append) setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(applied, 0, false);
  }, [applied, load]);

  const input = "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand";

  return (
    <div>
      {/* Filters */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(draft);
        }}
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <label className="flex flex-col text-xs text-gray-500">
          City
          <input
            className={`${input} w-40`}
            placeholder="Palm Desert"
            value={draft.city}
            onChange={(e) => setDraft({ ...draft, city: e.target.value })}
          />
        </label>
        <label className="flex flex-col text-xs text-gray-500">
          Min price
          <input
            className={`${input} w-32`}
            inputMode="numeric"
            placeholder="Any"
            value={draft.minPrice}
            onChange={(e) => setDraft({ ...draft, minPrice: e.target.value.replace(/\D/g, "") })}
          />
        </label>
        <label className="flex flex-col text-xs text-gray-500">
          Max price
          <input
            className={`${input} w-32`}
            inputMode="numeric"
            placeholder="Any"
            value={draft.maxPrice}
            onChange={(e) => setDraft({ ...draft, maxPrice: e.target.value.replace(/\D/g, "") })}
          />
        </label>
        <label className="flex flex-col text-xs text-gray-500">
          Beds
          <select className={`${input} w-24`} value={draft.minBeds} onChange={(e) => setDraft({ ...draft, minBeds: e.target.value })}>
            <option value="">Any</option>
            {[1, 2, 3, 4, 5].map((b) => (
              <option key={b} value={b}>{b}+</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs text-gray-500">
          Baths
          <select className={`${input} w-24`} value={draft.minBaths} onChange={(e) => setDraft({ ...draft, minBaths: e.target.value })}>
            <option value="">Any</option>
            {[1, 2, 3, 4].map((b) => (
              <option key={b} value={b}>{b}+</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
          <input type="checkbox" checked={draft.hasPool} onChange={(e) => setDraft({ ...draft, hasPool: e.target.checked })} />
          Pool
        </label>
        <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Search
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft({ ...EMPTY, city: initialCity });
            setApplied({ ...EMPTY, city: initialCity });
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Reset
        </button>
      </form>

      {/* Result count + view toggle */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {loading && items.length === 0
            ? "Searching…"
            : total != null
              ? `${total} home${total === 1 ? "" : "s"}`
              : `${items.length}${hasMore ? "+" : ""} homes`}
        </p>
        <div className="inline-flex overflow-hidden rounded-lg border border-gray-300 text-sm">
          <button
            onClick={() => setView("grid")}
            className={`px-3 py-1.5 ${view === "grid" ? "bg-brand text-white" : "bg-white text-gray-600"}`}
          >
            Grid
          </button>
          <button
            onClick={() => setView("map")}
            className={`px-3 py-1.5 ${view === "map" ? "bg-brand text-white" : "bg-white text-gray-600"}`}
          >
            Map
          </button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {view === "map" ? (
        <div className="h-[70vh] overflow-hidden rounded-xl border border-gray-200">
          <ListingMapClient listings={items} />
        </div>
      ) : (
        <>
          {items.length === 0 && !loading ? (
            <p className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-500">
              No homes match these filters. Try widening your search.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((l) => (
                <ListingCard key={l.listingKey} listing={l} />
              ))}
            </div>
          )}
          {hasMore && (
            <div className="mt-8 text-center">
              <button
                onClick={() => load(applied, items.length, true)}
                disabled={loading}
                className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
