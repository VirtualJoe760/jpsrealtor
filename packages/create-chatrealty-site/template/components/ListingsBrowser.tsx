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

// The applied filters as a query string — used both for the browser URL (so a
// search is shareable and survives reload) and for the `back` link carried into
// each listing detail page. Clicking into a home and back used to dump the
// visitor on the unfiltered browse, losing the search they had just built.
function toQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.city) p.set("city", f.city);
  if (f.minPrice) p.set("minPrice", f.minPrice);
  if (f.maxPrice) p.set("maxPrice", f.maxPrice);
  if (f.minBeds) p.set("minBeds", f.minBeds);
  if (f.minBaths) p.set("minBaths", f.minBaths);
  if (f.hasPool) p.set("hasPool", "true");
  return p.toString();
}

export default function ListingsBrowser({
  initialCity = "",
  initialFilters,
  marketCities = [],
}: {
  /** @deprecated pass the whole search via `initialFilters` — city alone drops the rest. */
  initialCity?: string;
  /** The search the page was opened with, parsed from the URL by app/listings/page.tsx. */
  initialFilters?: Partial<Filters>;
  /** Cities the unfiltered browse is scoped to — shown so the scope is visible. */
  marketCities?: string[];
}) {
  // Seed BOTH the form and the applied search from the URL. The effect below
  // rewrites the address bar to match `applied`, so seeding only `city` (as
  // this used to) actively erased the rest of the query on arrival: a correct
  // `?back=/listings?minBeds=3&maxPrice=600000` href landed on a bare
  // /listings with empty inputs. The href was never the broken part.
  const initial: Filters = { ...EMPTY, city: initialCity, ...initialFilters };
  const [draft, setDraft] = useState<Filters>(initial);
  const [applied, setApplied] = useState<Filters>(initial);
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

  // Keep the URL in step with the applied filters (replace, not push — the back
  // button should leave the page, not walk back through every filter tweak).
  const query = toQuery(applied);
  useEffect(() => {
    const url = query ? `/listings?${query}` : "/listings";
    window.history.replaceState(null, "", url);
  }, [query]);
  const backHref = query ? `/listings?${query}` : "/listings";

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
            // Back to the search the page was opened at, not to whatever the
            // visitor last typed — city stays because it's the page's scope.
            setDraft({ ...EMPTY, city: initial.city });
            setApplied({ ...EMPTY, city: initial.city });
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
          {!applied.city && marketCities.length > 0 && (
            <span className="text-gray-400"> in {marketCities.join(" · ")}</span>
          )}
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

      {error && <p className="cr-note cr-note-danger mb-4 p-3 text-sm">{error}</p>}

      {/* FULL-BLEED map: breaks out of the page container (100vw at the
          viewport edge) and fills the space under the header. A map boxed in
          a narrow card is unusable on a phone, which is the primary device. */}
      {view === "map" ? (
        <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen h-[calc(100vh-8rem)] overflow-hidden border-y border-gray-200 sm:h-[calc(100vh-9rem)]">
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
              {items.map((l, i) => (
                // First row (up to 3 across) loads eagerly — no blank boxes on
                // first paint; the rest lazy-load as they scroll into view.
                <ListingCard key={l.listingKey} listing={l} priority={i < 3} backHref={backHref} />
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
