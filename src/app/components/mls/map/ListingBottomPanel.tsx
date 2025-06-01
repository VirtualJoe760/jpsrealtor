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
    <div className="fixed bottom-0 left-0 right-0 lg:right-[25%] z-50 bg-zinc-950 text-white border-t border-zinc-800 rounded-t-2xl shadow-lg overflow-hidden max-h-[85vh] animate-slide-up">
      {/* Photo with X overlay */}
      <div className="relative">
        <img
          src={listing.primaryPhotoUrl}
          alt={listing.address}
          className="w-full h-48 object-cover sm:h-56 lg:h-64"
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
      <div className="p-4 space-y-2">
        <p className="text-base font-semibold text-zinc-200">
          {listing.address}
        </p>
        <p className="text-lg font-bold text-emerald-400">
          ${listing.listPrice.toLocaleString()}
        </p>
        <div className="text-xs text-zinc-400 flex flex-wrap gap-2">
          {listing.bedroomsTotal !== undefined && (
            <span>{listing.bedroomsTotal} Bed</span>
          )}
          {listing.bathroomsFull !== undefined && (
            <span>{listing.bathroomsFull} Bath</span>
          )}
          {listing.livingArea !== undefined && (
            <span>{listing.livingArea.toLocaleString()} SqFt</span>
          )}
          {listing.lotSizeSqft !== undefined && (
            <span>
              {Math.round(listing.lotSizeSqft).toLocaleString()} Lot
            </span>
          )}
          {listing.pool && <span>🏊 Pool</span>}
          {listing.spa && <span>🧖 Spa</span>}
        </div>

        {listing.publicRemarks && (
          <p className="text-xs text-zinc-400 mt-2 line-clamp-5">
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
  );
}
