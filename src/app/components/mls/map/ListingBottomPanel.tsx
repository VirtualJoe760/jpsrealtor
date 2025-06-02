"use client";

import { X } from "lucide-react";
import Link from "next/link";
import type { MapListing } from "@/types/types";

type Props = {
  listing: MapListing;
  onClose: () => void;
};

export default function ListingBottomPanel({ listing, onClose }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-transparent text-white rounded-t-2xl shadow-lg overflow-hidden max-h-[85vh] animate-slide-up">
      <div className="w-full 2xl:max-w-5xl 2xl:mx-auto 2xl:rounded-t-2xl bg-zinc-950 border-t border-zinc-800">
        {/* Photo */}
        <div className="relative">
          <img
            src={listing.primaryPhotoUrl}
            alt={listing.address}
            className="h-48 w-full sm:h-56 lg:h-64 2xl:h-72 object-cover"
          />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-2 right-2 bg-black/60 rounded-full p-1"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Details */}
        <div className="p-5 space-y-3">
          <div>
            <p className="text-sm uppercase tracking-widest text-zinc-400 mb-1">
              {listing.address}
            </p>
            <p className="text-2xl font-bold text-emerald-400 leading-tight">
              ${listing.listPrice.toLocaleString()}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm text-zinc-300">
            {listing.bedroomsTotal !== undefined && (
              <span className="bg-zinc-800 px-3 py-1 rounded-full">
                {listing.bedroomsTotal} Bed
              </span>
            )}
            {listing.bathroomsFull !== undefined && (
              <span className="bg-zinc-800 px-3 py-1 rounded-full">
                {listing.bathroomsFull} Bath
              </span>
            )}
            {listing.livingArea !== undefined && (
              <span className="bg-zinc-800 px-3 py-1 rounded-full">
                {listing.livingArea.toLocaleString()} SqFt
              </span>
            )}
            {listing.lotSizeSqft !== undefined && (
              <span className="bg-zinc-800 px-3 py-1 rounded-full">
                {Math.round(listing.lotSizeSqft).toLocaleString()} Lot
              </span>
            )}
            {listing.pool && (
              <span className="bg-zinc-800 px-3 py-1 rounded-full">🏊 Pool</span>
            )}
            {listing.spa && (
              <span className="bg-zinc-800 px-3 py-1 rounded-full">🧖 Spa</span>
            )}
          </div>

          {listing.publicRemarks && (
            <p className="text-sm text-zinc-400 mt-2 line-clamp-5">
              {listing.publicRemarks}
            </p>
          )}

          <Link
            href={`/mls-listings/${listing.slugAddress}`}
            className="block text-center mt-4 bg-emerald-500 text-black font-semibold py-2 rounded-md hover:bg-emerald-400 transition"
          >
            View Full Listing
          </Link>
        </div>
      </div>
    </div>
  );
}
