"use client";

import Link from "next/link";
import { useFavorites } from "@/lib/favorites";
import { useAccount } from "@/lib/account";
import ListingCard from "@/components/ListingCard";

// SAVED HOMES IS AN ACCOUNT SURFACE. When accounts are enabled, a signed-out
// visitor must never see a saved list — they get the sign-in prompt instead.
// This is the funnel that turns a visitor into the agent's lead; leaving it
// open silently breaks that. FavoriteButton and SwipeDeck already gate the
// ACTION; this gates the DESTINATION, which shipped ungated.
//
// `unavailable` = test-data/preview mode, where accounts genuinely aren't on.
// There, favorites stay on-device and the list renders — expected, not a hole.
export default function FavoritesPage() {
  const { favorites } = useFavorites();
  const { status, openSignIn } = useAccount();

  if (status === "loading") {
    return <div className="h-40 animate-pulse rounded-xl border border-gray-200 bg-surface" />;
  }

  if (status === "guest") {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Your favorites</h1>
        <div className="rounded-xl border border-gray-200 bg-surface p-10 text-center">
          <p className="text-gray-600">Sign in to see the homes you&apos;ve saved.</p>
          <p className="mt-1 text-sm text-gray-500">
            Your saved homes sync across every device you use.
          </p>
          <button
            onClick={openSignIn}
            className="mt-4 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Your favorites</h1>
      {favorites.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-surface p-10 text-center">
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
