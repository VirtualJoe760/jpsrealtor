"use client";

import { useFavorites } from "@/lib/favorites";
import type { ListingSummary } from "@/lib/types";

export default function FavoriteButton({
  listing,
  className = "",
}: {
  listing: ListingSummary;
  className?: string;
}) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(listing.listingKey);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(listing);
      }}
      aria-pressed={active}
      aria-label={active ? "Remove from favorites" : "Save to favorites"}
      title={active ? "Remove from favorites" : "Save to favorites"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/85 shadow transition hover:bg-white ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill={active ? "#e11d48" : "none"}
        stroke={active ? "#e11d48" : "#475569"}
        strokeWidth="2"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    </button>
  );
}
