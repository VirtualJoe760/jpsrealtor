// src/app/components/mls/map/FavoritesPannel.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Heart, ThumbsDown } from "lucide-react";
import type { MapListing } from "@/types/types";
import {
  groupListingsBySubdivision,
  getSubdivisionDisplayName,
} from "@/app/utils/groupListingsBySubdivision";
import clsx from "clsx";

type Props = {
  visibleListings: MapListing[];
  favorites: MapListing[];
  dislikedListings: MapListing[];
  isSidebarOpen: boolean;
  onClose: () => void;
  onSelectListing: (listing: MapListing) => void;
  onRemoveFavorite: (listing: MapListing) => void;
  onClearFavorites: () => void;
  onRemoveDislike: (listing: MapListing) => void;
  onClearDislikes: () => void;
};

export default function FavoritesPannel({
  visibleListings,
  favorites,
  dislikedListings,
  isSidebarOpen,
  onClose,
  onSelectListing,
  onRemoveFavorite,
  onClearFavorites,
  onRemoveDislike,
  onClearDislikes,
}: Props) {
  const [activeTab, setActiveTab] = useState<"visible" | "favorites" | "disliked">("visible");
  const router = useRouter();

  const listingsToShow =
    activeTab === "visible"
      ? visibleListings
      : activeTab === "favorites"
      ? favorites
      : dislikedListings;

  return (
    <>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={(e) => {
            e.stopPropagation(); // prevent clicking through to map
            onClose();
          }}
        />
      )}

      <aside
        onTouchStart={(e) => {
          const touch = e.touches?.[0];
          if (touch) (e.currentTarget as any).dataset.touchStartX = touch.clientX;
        }}
        onTouchEnd={(e) => {
          const touch = e.changedTouches?.[0];
          const start = parseFloat((e.currentTarget as any).dataset.touchStartX || "0");
          if (touch && touch.clientX - start > 75) {
            e.stopPropagation();
            onClose();
          }
        }}
        className={`fixed top-[128px] right-0 h-[calc(100dvh-128px)] w-[100%] sm:w-[100%] md:w-[60%] lg:w-[25%] 2xl:w-[15%]
        bg-zinc-950 text-white transform transition-transform duration-300 z-50
        ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}
        border-l border-zinc-800 overflow-y-auto overscroll-contain`}
      >
        {/* Sticky header: tabs + close + title/clear always visible */}
        <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/70 border-b border-zinc-800">
          <div className="px-4 pt-4 pb-3 flex justify-between items-center gap-3">
            <div className="flex space-x-2 flex-1">
              <button
                className={clsx(
                  "text-xs sm:text-sm px-2 py-2 rounded-lg font-medium transition-all",
                  activeTab === "visible"
                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30"
                    : "bg-zinc-800 text-white hover:bg-zinc-700"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("visible");
                }}
                type="button"
              >
                In View ({visibleListings.length})
              </button>
              <button
                className={clsx(
                  "text-xs sm:text-sm px-2 py-2 rounded-lg font-medium transition-all",
                  activeTab === "favorites"
                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30"
                    : "bg-zinc-800 text-white hover:bg-zinc-700"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("favorites");
                }}
                type="button"
              >
                Favorites ({favorites.length})
              </button>
              <button
                className={clsx(
                  "text-xs sm:text-sm px-2 py-2 rounded-lg font-medium transition-all",
                  activeTab === "disliked"
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                    : "bg-zinc-800 text-white hover:bg-zinc-700"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("disliked");
                }}
                type="button"
              >
                Disliked ({dislikedListings.length})
              </button>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close Sidebar"
              className="text-zinc-400 hover:text-white transition p-1"
              type="button"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="px-4 pb-3 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-emerald-400 tracking-wide">
              {activeTab === "visible"
                ? "Properties in View"
                : activeTab === "favorites"
                ? "Your Favorites"
                : "Disliked Properties"}
            </h2>
            {activeTab === "favorites" && favorites.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearFavorites();
                }}
                className="text-xs text-zinc-400 hover:text-red-500 transition"
                type="button"
              >
                Clear All
              </button>
            )}
            {activeTab === "disliked" && dislikedListings.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearDislikes();
                }}
                className="text-xs text-zinc-400 hover:text-red-500 transition"
                type="button"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="px-4 py-4">
          {activeTab === "visible" && visibleListings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-zinc-400 mb-2">No properties currently in view.</p>
              <p className="text-xs text-zinc-500">Pan the map to see nearby listings</p>
            </div>
          ) : activeTab === "favorites" && favorites.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-zinc-400">You haven't liked any listings yet.</p>
            </div>
          ) : activeTab === "disliked" && dislikedListings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-zinc-400">No disliked properties.</p>
              <p className="text-xs text-zinc-500 mt-2">
                Swipe left on listings to dislike them
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {(() => {
                const groupedListings = groupListingsBySubdivision(listingsToShow);

                return groupedListings.map((group) => (
                  <div key={group.subdivision}>
                    {/* Subdivision Header */}
                    <div className="sticky top-[120px] z-20 bg-zinc-900/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/70 py-2 -mx-4 px-4 border-b border-zinc-800">
                      <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">
                        {getSubdivisionDisplayName(group.subdivision)}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1">
                        {group.listings.length}{" "}
                        {group.listings.length === 1 ? "property" : "properties"}
                      </p>
                    </div>

                    {/* Listings in this subdivision */}
                    <ul className="space-y-4 mt-3">
                      {group.listings.map((listing) => (
                        <li key={listing._id} className="relative group">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeTab === "favorites") {
                                router.push(
                                  `/mls-listings/${listing.slugAddress || listing.slug}`
                                );
                              } else {
                                onSelectListing(listing);
                              }
                            }}
                            className="w-full text-left"
                            type="button"
                          >
                            <div className="flex flex-col bg-zinc-900 rounded-lg overflow-hidden shadow-sm border border-zinc-800 hover:border-emerald-500 transition-all duration-200 hover:shadow-md hover:shadow-emerald-500/10">
                              {/* Image Container */}
                              <div className="relative overflow-hidden bg-zinc-800">
                                <img
                                  src={listing.primaryPhotoUrl}
                                  alt={listing.address}
                                  className="w-full h-32 object-cover group-hover:scale-105 transition duration-200"
                                  draggable={false}
                                  loading="lazy"
                                />

                                {/* Remove from Favorites Button */}
                                {activeTab === "favorites" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      onRemoveFavorite(listing);
                                    }}
                                    className="absolute top-2 right-2 text-red-500 hover:text-red-400 bg-black/40 backdrop-blur-sm rounded-full p-1.5 transition"
                                    aria-label="Remove from favorites"
                                    type="button"
                                  >
                                    <Heart className="w-5 h-5 fill-red-500" />
                                  </button>
                                )}

                                {/* Remove from Disliked Button */}
                                {activeTab === "disliked" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      onRemoveDislike(listing);
                                    }}
                                    className="absolute top-2 right-2 text-white hover:text-zinc-300 bg-red-500/80 backdrop-blur-sm rounded-full p-1.5 transition"
                                    aria-label="Remove from disliked"
                                    title="Click to un-dislike this listing"
                                    type="button"
                                  >
                                    <ThumbsDown className="w-5 h-5" />
                                  </button>
                                )}
                              </div>

                              {/* Listing Info */}
                              <div className="p-3 space-y-2">
                                <p className="text-base font-semibold text-white group-hover:text-emerald-400 transition">
                                  ${Number(listing.listPrice ?? 0).toLocaleString()}
                                </p>

                                <p className="text-xs text-zinc-300 line-clamp-2">
                                  {listing.unparsedAddress || listing.address}
                                </p>

                                {/* Property Details - Row 1 */}
                                <div className="text-xs text-zinc-400 flex flex-wrap gap-3">
                                  {listing.bedsTotal != null && (
                                    <span>{listing.bedsTotal} Bed</span>
                                  )}
                                  {listing.bathroomsTotalInteger != null && (
                                    <span>{listing.bathroomsTotalInteger} Bath</span>
                                  )}
                                  {listing.livingArea != null && (
                                    <span>{listing.livingArea.toLocaleString()} SqFt</span>
                                  )}
                                </div>

                                {/* Property Details - Row 2 */}
                                <div className="text-xs text-zinc-400 flex flex-wrap gap-3">
                                  {listing.lotSizeSqft != null && (
                                    <span>
                                      {Math.round(listing.lotSizeSqft).toLocaleString()} Lot
                                    </span>
                                  )}
                                  {listing.poolYn && <span>🏊 Pool</span>}
                                  {listing.spaYn && <span>🧖 Spa</span>}
                                </div>

                                {/* Remarks - Only if Present */}
                                {listing.publicRemarks && (
                                  <p className="text-xs text-zinc-500 line-clamp-2 pt-1">
                                    {listing.publicRemarks}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
