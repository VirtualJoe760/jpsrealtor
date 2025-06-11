"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Heart } from "lucide-react";
import type { MapListing } from "@/types/types";

type Props = {
  visibleListings: MapListing[];
  favorites: MapListing[];
  isSidebarOpen: boolean;
  onClose: () => void;
  onSelectListing: (listing: MapListing) => void;
  onRemoveFavorite: (listing: MapListing) => void;
  onClearFavorites: () => void;
};

export default function FavoritesPannel({
  visibleListings,
  favorites,
  isSidebarOpen,
  onClose,
  onSelectListing,
  onRemoveFavorite,
  onClearFavorites,
}: Props) {
  const [activeTab, setActiveTab] = useState<"visible" | "favorites">("visible");
  const router = useRouter();

  const listingsToShow = activeTab === "visible" ? visibleListings : favorites;

  return (
    <>
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={onClose} />
      )}

      <aside
        onTouchStart={(e) => {
          const touch = e.touches?.[0];
          if (touch) (e.currentTarget as any).dataset.touchStartX = touch.clientX;
        }}
        onTouchEnd={(e) => {
          const touch = e.changedTouches?.[0];
          const start = parseFloat((e.currentTarget as any).dataset.touchStartX || "0");
          if (touch && touch.clientX - start > 75) onClose();
        }}
        className={`fixed top-[64px] right-0 h-[calc(100vh-64px)] w-[100%] sm:w-[100%] md:w-[60%] lg:w-[25%] 2xl:w-[15%]
        bg-zinc-950 text-white transform transition-transform duration-300 z-40
        ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}
        border-l border-zinc-800 overflow-y-auto px-4 py-6 pt-6 overscroll-contain`}
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-2">
            <button
              className={`text-sm px-3 py-1 rounded ${
                activeTab === "visible"
                  ? "bg-emerald-500 text-black"
                  : "bg-zinc-800 text-white"
              }`}
              onClick={() => setActiveTab("visible")}
            >
              In View ({visibleListings.length})
            </button>
            <button
              className={`text-sm px-3 py-1 rounded ${
                activeTab === "favorites"
                  ? "bg-emerald-500 text-black"
                  : "bg-zinc-800 text-white"
              }`}
              onClick={() => setActiveTab("favorites")}
            >
              Favorites ({favorites.length})
            </button>
          </div>
          <button onClick={onClose} aria-label="Close Sidebar" className="hover:text-emerald-400">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-emerald-400 tracking-wide">
            {activeTab === "visible" ? "Properties in View" : "Your Favorites"}
          </h2>
          {activeTab === "favorites" && favorites.length > 0 && (
            <button
              onClick={onClearFavorites}
              className="text-xs text-zinc-400 hover:text-red-500"
            >
              Clear All
            </button>
          )}
        </div>

        {listingsToShow.length === 0 ? (
          <p className="text-sm text-zinc-400">
            {activeTab === "favorites"
              ? "You haven’t liked any listings yet."
              : "No properties currently in view."}
          </p>
        ) : (
          <ul className="space-y-5">
            {listingsToShow.map((listing) => (
              <li key={listing._id} className="relative group">
                <button
                  onClick={() =>
                    activeTab === "favorites"
                      ? router.push(`/mls-listings/${listing.slugAddress || listing.slug}`)
                      : onSelectListing(listing)
                  }
                  className="w-full text-left"
                >
                  <div className="flex flex-col bg-zinc-900 rounded-xl overflow-hidden shadow-sm border border-zinc-800 hover:border-emerald-500 transition-all duration-200">
                    <div className="relative">
                      <img
                        src={listing.primaryPhotoUrl}
                        alt={listing.address}
                        className="w-full h-40 object-cover group-hover:opacity-90 transition duration-200"
                      />
                      {activeTab === "favorites" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onRemoveFavorite(listing);
                          }}
                          className="absolute top-2 right-2 text-red-500 hover:text-red-400"
                          aria-label="Remove from favorites"
                        >
                          <Heart className="w-5 h-5 fill-red-500" />
                        </button>
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      <p className="text-lg font-semibold text-white group-hover:text-emerald-400 transition">
                        ${listing.listPrice.toLocaleString()}
                      </p>
                      <p className="text-sm text-zinc-300">{listing.unparsedAddress}</p>
                      <div className="text-xs text-zinc-400 flex flex-wrap gap-2">
                        {listing.bedsTotal && <span>{listing.bedsTotal} Bed</span>}
                        {listing.bathroomsTotalInteger !== undefined && (
                          <span>{listing.bathroomsTotalInteger} Bath</span>
                        )}
                        {listing.livingArea && <span>{listing.livingArea.toLocaleString()} SqFt</span>}
                        {listing.lotSizeSqft && (
                          <span>{Math.round(listing.lotSizeSqft).toLocaleString()} Lot</span>
                        )}
                        {listing.pool && <span>🏊 Pool</span>}
                        {listing.spa && <span>🧖 Spa</span>}
                      </div>
                      {listing.publicRemarks && (
                        <p className="text-xs text-zinc-400 mt-2 line-clamp-3">{listing.publicRemarks}</p>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </>
  );
}
