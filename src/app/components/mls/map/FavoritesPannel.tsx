// src/app/components/mls/map/FavoritesPannel.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { X, Heart, ThumbsDown } from "lucide-react";
import type { MapListing } from "@/types/types";
import {
  groupListingsBySubdivision,
  getSubdivisionDisplayName,
} from "@/app/utils/groupListingsBySubdivision";
import clsx from "clsx";
import { useTheme } from "@/app/contexts/ThemeContext";

type Props = {
  visibleListings: MapListing[];
  favorites: MapListing[];
  dislikedListings: MapListing[];
  isSidebarOpen: boolean;
  selectedListing?: MapListing | null;
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
  selectedListing,
  onClose,
  onSelectListing,
  onRemoveFavorite,
  onClearFavorites,
  onRemoveDislike,
  onClearDislikes,
}: Props) {
  const [activeTab, setActiveTab] = useState<"favorites" | "disliked">("favorites");
  const router = useRouter();
  const asideRef = useRef<HTMLElement>(null);
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // Theme-aware classes
  const themeClasses = {
    title: isLight ? 'text-gray-900' : 'text-white',
    text: isLight ? 'text-gray-700' : 'text-neutral-300',
    textSecondary: isLight ? 'text-gray-600' : 'text-neutral-400',
    textTertiary: isLight ? 'text-gray-500' : 'text-neutral-500',
    buttonSecondary: isLight
      ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
      : 'text-neutral-400 hover:text-white hover:bg-neutral-800',
    tabInactive: isLight
      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-900'
      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white',
    emptyStateBg: isLight ? 'bg-gray-200' : 'bg-neutral-800',
    emptyStateIcon: isLight ? 'text-gray-400' : 'text-neutral-600',
    cardBg: isLight ? 'bg-white' : 'bg-neutral-800/50',
    cardBorder: isLight ? 'border-gray-300' : 'border-neutral-700',
    cardHoverBorder: isLight ? 'hover:border-blue-500' : 'hover:border-emerald-500',
    subdivisionHeader: isLight ? 'bg-white/95 border-gray-300' : 'bg-neutral-900/95 border-neutral-800',
    badgeBg: isLight ? 'bg-gray-200/80 text-gray-700' : 'bg-neutral-700/50 text-neutral-300',
  };

  // Memoize listings to prevent unnecessary re-renders
  const listingsToShow = useMemo(() => {
    return activeTab === "favorites" ? favorites : dislikedListings;
  }, [activeTab, favorites, dislikedListings]);

  // Prevent double-tap zoom on iPad and handle swipe-to-close
  useEffect(() => {
    const preventDoubleTapZoom = (e: TouchEvent) => {
      const t2 = e.timeStamp;
      const t1 = (e.currentTarget as any).lastTouch || t2;
      const dt = t2 - t1;
      const fingers = e.touches.length;
      (e.currentTarget as any).lastTouch = t2;

      if (!dt || dt > 500 || fingers > 1) return; // Not a double tap

      e.preventDefault();
      e.stopPropagation();
    };

    // Enhanced swipe-to-close
    let startX = 0;
    let startY = 0;
    let isDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      startX = touch.clientX;
      startY = touch.clientY;
      isDragging = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches[0]) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = Math.abs(touch.clientY - startY);

      // Only track horizontal swipes (not vertical scrolling)
      if (Math.abs(deltaX) > 10 && deltaY < 30) {
        isDragging = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDragging) return;

      const touch = e.changedTouches[0];
      if (!touch) return;
      const deltaX = touch.clientX - startX;

      // Swipe right to close (at least 100px swipe)
      if (deltaX > 100) {
        onClose();
      }

      isDragging = false;
    };

    const aside = asideRef.current;
    if (aside) {
      aside.addEventListener('touchstart', preventDoubleTapZoom, { passive: false });
      aside.addEventListener('touchstart', handleTouchStart, { passive: true });
      aside.addEventListener('touchmove', handleTouchMove, { passive: true });
      aside.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    return () => {
      if (aside) {
        aside.removeEventListener('touchstart', preventDoubleTapZoom);
        aside.removeEventListener('touchstart', handleTouchStart);
        aside.removeEventListener('touchmove', handleTouchMove);
        aside.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [onClose]);

  return (
    <>
      {isSidebarOpen && (
        <div
          className={`fixed inset-0 z-30 lg:hidden ${
            isLight ? 'bg-black/30' : 'bg-black/60'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        />
      )}

      <aside
        ref={asideRef}
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
        className={`fixed top-0 right-0 h-screen
        w-[95%] sm:w-[90%] md:w-[35%] lg:w-[28%] xl:w-[26%] 2xl:w-[24%]
        backdrop-blur-xl transform transition-transform duration-300 z-[70]
        shadow-2xl overflow-hidden flex flex-col
        ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}
        ${isLight
          ? 'bg-white/98 text-gray-900 border-l border-gray-300'
          : 'bg-neutral-900/98 text-white border-l border-neutral-800'
        }`}
      >
        {/* Sticky header: tabs + close + title/clear */}
        <div className={`flex-shrink-0 backdrop-blur-xl border-b ${
          isLight
            ? 'bg-white/95 border-gray-300'
            : 'bg-neutral-900/95 border-neutral-800'
        }`}>
          {/* Title row with close button */}
          <div className="px-5 pt-5 pb-3 flex justify-between items-center relative">
            {/* Invisible spacer to balance close button on mobile */}
            <div className="w-10 md:w-0"></div>
            <div className="flex-1 md:flex-initial">
              <h2 className={`text-xl md:text-2xl font-bold text-center md:text-left ${themeClasses.title}`}>
                {activeTab === "favorites"
                  ? "Your Favorites"
                  : "Disliked Properties"}
              </h2>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close Panel"
              className={`flex-shrink-0 p-2 rounded-lg transition ${themeClasses.buttonSecondary}`}
              type="button"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs row */}
          <div className="px-5 pb-4">
            <div className="flex gap-2">
                <button
                  className={clsx(
                    "flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all",
                    activeTab === "favorites"
                      ? isLight
                        ? "bg-pink-500 text-white shadow-lg shadow-pink-500/30"
                        : "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30"
                      : themeClasses.tabInactive
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab("favorites");
                  }}
                  type="button"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <Heart className="w-4 h-4" />
                    <span>Favorites</span>
                    <span className="text-xs opacity-80">({favorites.length})</span>
                  </div>
                </button>

                <button
                  className={clsx(
                    "flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all",
                    activeTab === "disliked"
                      ? isLight
                        ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                        : "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30"
                      : themeClasses.tabInactive
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab("disliked");
                  }}
                  type="button"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <ThumbsDown className="w-4 h-4" />
                    <span>Disliked</span>
                    <span className="text-xs opacity-80">({dislikedListings.length})</span>
                  </div>
                </button>
              </div>

            {/* Clear All Button */}
            <div className="mt-3">
              {activeTab === "favorites" && favorites.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearFavorites();
                  }}
                  className={`text-sm transition font-medium ${themeClasses.textSecondary} hover:text-red-400`}
                  type="button"
                >
                  Clear All Favorites
                </button>
              )}
              {activeTab === "disliked" && dislikedListings.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearDislikes();
                  }}
                  className={`text-sm transition font-medium ${themeClasses.textSecondary} hover:text-red-400`}
                  type="button"
                >
                  Clear All Disliked
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-3 pb-2">
          {activeTab === "favorites" && favorites.length === 0 ? (
            <div className="text-center py-20">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${themeClasses.emptyStateBg}`}>
                <Heart className={`w-10 h-10 ${themeClasses.emptyStateIcon}`} />
              </div>
              <p className={`text-lg font-medium mb-2 ${themeClasses.text}`}>No favorites yet</p>
              <p className={`text-sm ${themeClasses.textTertiary}`}>Swipe right on listings to save them</p>
            </div>
          ) : activeTab === "disliked" && dislikedListings.length === 0 ? (
            <div className="text-center py-20">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${themeClasses.emptyStateBg}`}>
                <ThumbsDown className={`w-10 h-10 ${themeClasses.emptyStateIcon}`} />
              </div>
              <p className={`text-lg font-medium mb-2 ${themeClasses.text}`}>No disliked properties</p>
              <p className={`text-sm ${themeClasses.textTertiary}`}>Swipe left on listings to dislike them</p>
            </div>
          ) : (
            <div className="space-y-6">
              {(() => {
                const prioritySubdivision = selectedListing
                  ? ((selectedListing as any).subdivisionName ||
                     (selectedListing as any).subdivision)
                  : null;

                const groupedListings = groupListingsBySubdivision(
                  listingsToShow,
                  prioritySubdivision
                );

                return groupedListings.map((group) => {
                  const isPrioritySubdivision =
                    prioritySubdivision &&
                    group.subdivision.toLowerCase() === prioritySubdivision.toLowerCase();

                  return (
                    <div key={group.subdivision}>
                      {/* Subdivision Header - Improved */}
                      <div className={`sticky top-0 z-20 backdrop-blur-xl py-3 -mx-5 px-5 border-b mb-4 ${themeClasses.subdivisionHeader}`}>
                        <div className="flex items-center gap-2">
                          {isPrioritySubdivision && (
                            <span className="text-yellow-400">⭐</span>
                          )}
                          <h3
                            className={`text-sm font-bold uppercase tracking-wider ${
                              isPrioritySubdivision
                                ? "text-emerald-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {getSubdivisionDisplayName(group.subdivision)}
                          </h3>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          {group.listings.length}{" "}
                          {group.listings.length === 1 ? "property" : "properties"}
                          {isPrioritySubdivision && " • Current Selection"}
                        </p>
                      </div>

                      {/* Listings - Improved Cards */}
                      <ul className="space-y-4">
                        {group.listings.map((listing, index) => (
                          <li key={listing.listingKey || listing.listingId || listing._id || `listing-${index}`} className="relative group">
                            <div
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
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (activeTab === "favorites") {
                                    router.push(
                                      `/mls-listings/${listing.slugAddress || listing.slug}`
                                    );
                                  } else {
                                    onSelectListing(listing);
                                  }
                                }
                              }}
                              role="button"
                              tabIndex={0}
                              className="w-full text-left cursor-pointer"
                            >
                              <div className="flex flex-col rounded-xl overflow-hidden border ${themeClasses.cardBg} ${themeClasses.cardBorder} ${themeClasses.cardHoverBorder} transition-colors will-change-auto">
                                {/* Image Container - LARGER */}
                                <div className={`relative overflow-hidden ${isLight ? 'bg-gray-200' : 'bg-neutral-900'}`}>
                                  <img
                                    src={listing.primaryPhotoUrl}
                                    alt={listing.address}
                                    className="w-full h-48 object-cover"
                                    draggable={false}
                                    loading="lazy"
                                    decoding="async"
                                  />

                                  {/* Gradient Overlay */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                  {/* Price Badge - On Image */}
                                  <div className="absolute bottom-3 left-3">
                                    <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-emerald-500/30">
                                      <p className="text-xl font-bold text-emerald-400">
                                        ${Number(listing.listPrice ?? 0).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Remove Buttons */}
                                  {activeTab === "favorites" && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        onRemoveFavorite(listing);
                                      }}
                                      className="absolute top-3 right-3 text-red-500 hover:text-red-400 bg-black/60 backdrop-blur-md rounded-full p-2 transition hover:scale-110"
                                      aria-label="Remove from favorites"
                                      type="button"
                                    >
                                      <Heart className="w-5 h-5 fill-red-500" />
                                    </button>
                                  )}

                                  {activeTab === "disliked" && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        onRemoveDislike(listing);
                                      }}
                                      className="absolute top-3 right-3 text-white hover:text-gray-200 bg-red-500/80 backdrop-blur-md rounded-full p-2 transition hover:scale-110"
                                      aria-label="Remove from disliked"
                                      title="Click to un-dislike this listing"
                                      type="button"
                                    >
                                      <ThumbsDown className="w-5 h-5" />
                                    </button>
                                  )}
                                </div>

                                {/* Listing Info - Better Spacing */}
                                <div className="p-4 space-y-3">
                                  {/* Address */}
                                  <p className={`text-sm font-medium line-clamp-2 leading-relaxed ${themeClasses.text}`}>
                                    {listing.unparsedAddress || listing.address}
                                  </p>

                                  {/* Property Details - Improved Pills */}
                                  <div className="flex flex-wrap gap-2">
                                    {listing.bedsTotal != null && (
                                      <span className="px-2.5 py-1 rounded-full ${themeClasses.badgeBg} text-xs font-medium">
                                        🛏️ {listing.bedsTotal} {listing.bedsTotal === 1 ? 'Bed' : 'Beds'}
                                      </span>
                                    )}
                                    {listing.bathroomsTotalInteger != null && (
                                      <span className="px-2.5 py-1 rounded-full ${themeClasses.badgeBg} text-xs font-medium">
                                        🛁 {listing.bathroomsTotalInteger} {listing.bathroomsTotalInteger === 1 ? 'Bath' : 'Baths'}
                                      </span>
                                    )}
                                    {listing.livingArea != null && (
                                      <span className="px-2.5 py-1 rounded-full ${themeClasses.badgeBg} text-xs font-medium">
                                        📐 {listing.livingArea.toLocaleString()} SqFt
                                      </span>
                                    )}
                                  </div>

                                  {/* Amenities Row */}
                                  {(listing.lotSizeSqft != null || listing.poolYn || listing.spaYn) && (
                                    <div className="flex flex-wrap gap-2">
                                      {listing.lotSizeSqft != null && (
                                        <span className="px-2.5 py-1 rounded-full ${themeClasses.badgeBg} text-xs font-medium">
                                          🏡 {Math.round(listing.lotSizeSqft).toLocaleString()} Lot
                                        </span>
                                      )}
                                      {listing.poolYn && (
                                        <span className="px-2.5 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full text-xs font-medium">
                                          🏊 Pool
                                        </span>
                                      )}
                                      {listing.spaYn && (
                                        <span className="px-2.5 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full text-xs font-medium">
                                          🧖 Spa
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Remarks */}
                                  {listing.publicRemarks && (
                                    <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                                      {listing.publicRemarks}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
