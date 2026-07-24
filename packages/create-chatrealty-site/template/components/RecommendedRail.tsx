"use client";

// "Recommended for you" — the guest-side taste rail. It reads the visitor's
// saved homes (localStorage favorites, filled by the heart button + /discover
// swipe deck), infers what they like (city, price band, bedroom count), and
// fetches similar active listings via /api/listings. Already-saved homes are
// filtered out. Nothing renders until the visitor has saved at least one home,
// so a brand-new visitor never sees an empty or generic rail.
//
// This is the anonymous version of ChatRealty's server-side "favorite
// spotlight". When end-user auth lands, swap the localStorage read for the
// account's saved homes and let the server pick the recommendations.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ListingSummary } from "@/lib/types";
import { useFavorites } from "@/lib/favorites";
import ListingCard from "@/components/ListingCard";

const HOW_MANY = 3;

// Most-frequent non-null value in a list (ties broken by first seen).
function mode<T>(values: (T | null | undefined)[]): T | undefined {
  const counts = new Map<T, number>();
  let best: T | undefined;
  let bestN = 0;
  for (const v of values) {
    if (v == null) continue;
    const n = (counts.get(v) || 0) + 1;
    counts.set(v, n);
    if (n > bestN) {
      bestN = n;
      best = v;
    }
  }
  return best;
}

function priceOf(l: ListingSummary): number | null {
  return l.currentPrice ?? l.listPrice ?? null;
}

// Derive a search from the saved homes: dominant city, a price band widened
// around what they've saved, and a bedroom floor. A stable signature string
// lets the effect skip refetching when the taste hasn't actually moved.
function tasteFrom(favorites: ListingSummary[]) {
  const city = mode(favorites.map((f) => f.city));
  const prices = favorites.map(priceOf).filter((p): p is number => p != null);
  const beds = favorites.map((f) => f.beds).filter((b): b is number => b != null);

  const params = new URLSearchParams({ limit: String(HOW_MANY + 12) });
  if (city) params.set("city", city);
  if (prices.length) {
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    params.set("minPrice", String(Math.round(lo * 0.75)));
    params.set("maxPrice", String(Math.round(hi * 1.25)));
  }
  if (beds.length) {
    params.set("minBeds", String(Math.max(1, Math.min(...beds))));
  }
  return { city, params, signature: params.toString() };
}

export default function RecommendedRail() {
  const { favorites } = useFavorites();
  const { city, params, signature } = useMemo(() => tasteFrom(favorites), [favorites]);
  const [recs, setRecs] = useState<ListingSummary[]>([]);

  useEffect(() => {
    if (favorites.length === 0) {
      setRecs([]);
      return;
    }
    let cancelled = false;
    const savedKeys = new Set(favorites.map((f) => f.listingKey));
    fetch(`/api/listings?${params.toString()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.items) return;
        const picks = (data.items as ListingSummary[])
          .filter((l) => !savedKeys.has(l.listingKey))
          .slice(0, HOW_MANY);
        setRecs(picks);
      })
      .catch(() => {
        /* offline / no data connected — just don't show the rail */
      });
    return () => {
      cancelled = true;
    };
    // signature captures city/price/beds; refetch only when taste moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, favorites.length]);

  if (favorites.length === 0 || recs.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Recommended for you</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Based on the {favorites.length === 1 ? "home" : "homes"} you've saved
            {city ? ` in ${city}` : ""}.
          </p>
        </div>
        <Link href="/favorites" className="text-sm font-medium text-brand hover:underline">
          Your saved →
        </Link>
      </div>
      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {recs.map((l) => (
          <ListingCard key={l.listingKey} listing={l} />
        ))}
      </div>
    </section>
  );
}
