"use client";

import Link from "next/link";
import { useFavorites } from "@/lib/favorites";
import ListingCard from "@/components/ListingCard";

export default function FavoritesPage() {
  const { favorites } = useFavorites();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Your favorites</h1>
      {favorites.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p className="text-gray-500">You haven&apos;t saved any homes yet.</p>
          <Link
            href="/listings"
            className="mt-4 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Browse listings
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((l) => (
            <ListingCard key={l.listingKey} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
