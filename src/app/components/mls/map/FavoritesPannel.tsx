// src/app/components/mls/map/FavoritesPannel.tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { X, Heart, ThumbsDown, CheckSquare } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"favorites" | "disliked" | "selected">("favorites");
  const router = useRouter();
  const asideRef = useRef<HTMLElement>(null);
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // Dynamic title based on active tab
  const getTitle = () => {
    switch (activeTab) {
      case "favorites":
        return "Your Favorites";
      case "disliked":
        return "Disliked Properties";
      case "selected":
        return "Selected Properties";
      default:
        return "Your Favorites";
    }
  };

  // Theme-aware classes
  const themeClasses = {
    title: isLight ? 'text-gray-900' : 'text-white',
    text: isLight ? 'text-gray-700' : 'text-neutral-300',
    textSecondary: isLight ? 'text-gray-600' : 'text-neutral-400',
    textTertiary: isLight ? 'text-gray-500' : 'text-neutral-500',
    border: isLight ? 'border-gray-300' : 'border-neutral-700',
    buttonSecondary: isLight
      ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
      : 'text-neutral-400 hover:text-white hover:bg-neutral-800',
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
        className={`fixed top-0 right-0 h-screen w-full
        backdrop-blur-xl transform transition-transform duration-300 z-[70]
        shadow-2xl overflow-hidden flex flex-col
        ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}
        ${isLight
          ? 'bg-white/98 text-gray-900'
          : 'bg-neutral-900/98 text-white'
        }`}
      >
        {/* Sticky header: title + tabs + close */}
        <div className={`flex-shrink-0 backdrop-blur-xl border-b ${
          isLight
            ? 'bg-white/95 border-gray-300'
            : 'bg-neutral-900/95 border-neutral-800'
        }`}>
          {/* Title row with close button */}
          <div className="px-6 pt-6 pb-4 flex justify-center items-center relative">
            <h2 className={`text-2xl font-bold ${themeClasses.title}`}>
              {getTitle()}
            </h2>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close Panel"
              className={`absolute right-6 flex-shrink-0 p-2 rounded-lg transition ${themeClasses.buttonSecondary}`}
              type="button"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs row - Admin nav style with underline */}
          <div className="px-6">
            <div className={`flex items-center gap-2 border-b ${themeClasses.border}`}>
              <button
                className={clsx(
                  "flex items-center gap-2 px-4 py-3 border-b-2 transition-all",
                  activeTab === "favorites"
                    ? isLight
                      ? "border-pink-500 text-pink-600 font-semibold"
                      : "border-pink-500 text-pink-400 font-semibold"
                    : `border-transparent ${themeClasses.textSecondary} ${
                        isLight ? "hover:text-gray-900 hover:border-gray-300" : "hover:text-white hover:border-gray-700"
                      }`
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("favorites");
                }}
                type="button"
              >
                <Heart className="w-4 h-4" />
                <span>Favorites</span>
                <span className={`text-sm ${activeTab === "favorites" ? "" : "opacity-60"}`}>
                  ({favorites.length})
                </span>
              </button>

              <button
                className={clsx(
                  "flex items-center gap-2 px-4 py-3 border-b-2 transition-all",
                  activeTab === "selected"
                    ? isLight
                      ? "border-blue-500 text-blue-600 font-semibold"
                      : "border-emerald-500 text-emerald-400 font-semibold"
                    : `border-transparent ${themeClasses.textSecondary} ${
                        isLight ? "hover:text-gray-900 hover:border-gray-300" : "hover:text-white hover:border-gray-700"
                      }`
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("selected");
                }}
                type="button"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Selected</span>
                <span className={`text-sm ${activeTab === "selected" ? "" : "opacity-60"}`}>
                  (0)
                </span>
              </button>

              <button
                className={clsx(
                  "flex items-center gap-2 px-4 py-3 border-b-2 transition-all",
                  activeTab === "disliked"
                    ? isLight
                      ? "border-red-500 text-red-600 font-semibold"
                      : "border-red-500 text-red-400 font-semibold"
                    : `border-transparent ${themeClasses.textSecondary} ${
                        isLight ? "hover:text-gray-900 hover:border-gray-300" : "hover:text-white hover:border-gray-700"
                      }`
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab("disliked");
                }}
                type="button"
              >
                <ThumbsDown className="w-4 h-4" />
                <span>Disliked</span>
                <span className={`text-sm ${activeTab === "disliked" ? "" : "opacity-60"}`}>
                  ({dislikedListings.length})
                </span>
              </button>
            </div>

            {/* Clear All Button */}
            <div className="py-3">
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
              {activeTab === "selected" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Add clear selected functionality
                  }}
                  className={`text-sm transition font-medium ${themeClasses.textSecondary} hover:text-red-400`}
                  type="button"
                >
                  Clear All Selected
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
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {activeTab === "favorites" && favorites.length === 0 ? (
            <div className="text-center py-20">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${themeClasses.emptyStateBg}`}>
                <Heart className={`w-10 h-10 ${themeClasses.emptyStateIcon}`} />
              </div>
              <p className={`text-lg font-medium mb-2 ${themeClasses.text}`}>No favorites yet</p>
              <p className={`text-sm ${themeClasses.textTertiary}`}>Swipe right on listings to save them</p>
            </div>
          ) : activeTab === "selected" ? (
            <div className="text-center py-20">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${themeClasses.emptyStateBg}`}>
                <CheckSquare className={`w-10 h-10 ${themeClasses.emptyStateIcon}`} />
              </div>
              <p className={`text-lg font-medium mb-2 ${themeClasses.text}`}>No selected properties</p>
              <p className={`text-sm ${themeClasses.textTertiary}`}>Select properties from the map to compare them</p>
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
            <div className="space-y-0">
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
                      {/* Subdivision Header - No gap, connects to menu */}
                      <div className={`sticky top-0 z-20 backdrop-blur-xl py-3 px-6 border-b ${themeClasses.subdivisionHeader}`}>
                        <div className="flex items-center gap-2">
                          {isPrioritySubdivision && (
                            <span className="text-yellow-400">⭐</span>
                          )}
                          <h3
                            className={`text-sm font-bold uppercase tracking-wider ${
                              isLight ? "text-blue-600" : "text-emerald-400"
                            }`}
                          >
                            {getSubdivisionDisplayName(group.subdivision)}
                          </h3>
                        </div>
                        <p className={`text-xs mt-1 ${themeClasses.textTertiary}`}>
                          {group.listings.length}{" "}
                          {group.listings.length === 1 ? "property" : "properties"}
                          {isPrioritySubdivision && " • Current Selection"}
                        </p>
                      </div>

                      {/* Listings - Centered with max-width container */}
                      <div className="px-6 py-4">
                        <div className="max-w-7xl mx-auto">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                            {group.listings.map((listing, index) => (
                          <div key={listing.listingKey || listing.listingId || listing._id || `listing-${index}`} className="relative group">
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
                              <div className={`flex flex-col rounded-xl overflow-hidden border ${themeClasses.cardBg} ${themeClasses.cardBorder} ${themeClasses.cardHoverBorder} transition-colors will-change-auto`}>
                                {/* Image Container */}
                                <div className={`relative overflow-hidden ${isLight ? 'bg-gray-200' : 'bg-neutral-900'}`}>
                                  <img
                                    src={(() => {
                                      // Extract primary photo from media array (matches /api/mls-listings/[slugAddress])
                                      const media = listing.media || [];
                                      const primaryPhoto = media.find(
                                        (m: any) => m.MediaCategory === "Primary Photo" || m.Order === 0
                                      ) || media[0];
                                      return primaryPhoto?.Uri800 || primaryPhoto?.Uri640 || listing.primaryPhotoUrl || "/images/no-photo.png";
                                    })()}
                                    alt={listing.address}
                                    className="w-full h-48 object-cover"
                                    draggable={false}
                                    loading="lazy"
                                    decoding="async"
                                  />

                                  {/* Gradient Overlay */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                  {/* Price Badge */}
                                  <div className="absolute bottom-3 left-3">
                                    <div className={`backdrop-blur-md px-3 py-1.5 rounded-lg border ${
                                      isLight
                                        ? 'bg-white/90 border-blue-500/30'
                                        : 'bg-black/80 border-emerald-500/30'
                                    }`}>
                                      <p className={`text-lg font-bold ${
                                        isLight ? 'text-blue-600' : 'text-emerald-400'
                                      }`}>
                                        ${Number(listing.listPrice ?? 0).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Remove Button */}
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
                                      <Heart className="w-4 h-4 fill-red-500" />
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
                                      <ThumbsDown className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>

                                {/* Listing Info */}
                                <div className="p-3 space-y-2">
                                  {/* Address */}
                                  <p className={`text-sm font-medium line-clamp-2 leading-relaxed ${themeClasses.text}`}>
                                    {listing.unparsedAddress || listing.address}
                                  </p>

                                  {/* Property Details */}
                                  <div className="flex flex-wrap gap-1.5">
                                    {listing.bedsTotal != null && (
                                      <span className={`px-2 py-0.5 rounded-full ${themeClasses.badgeBg} text-xs font-medium`}>
                                        {listing.bedsTotal} bd
                                      </span>
                                    )}
                                    {listing.bathroomsTotalInteger != null && (
                                      <span className={`px-2 py-0.5 rounded-full ${themeClasses.badgeBg} text-xs font-medium`}>
                                        {listing.bathroomsTotalInteger} ba
                                      </span>
                                    )}
                                    {listing.livingArea != null && (
                                      <span className={`px-2 py-0.5 rounded-full ${themeClasses.badgeBg} text-xs font-medium`}>
                                        {listing.livingArea.toLocaleString()} ft²
                                      </span>
                                    )}
                                  </div>

                                  {/* Amenities */}
                                  {(listing.poolYn || listing.spaYn) && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {listing.poolYn && (
                                        <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full text-xs font-medium">
                                          Pool
                                        </span>
                                      )}
                                      {listing.spaYn && (
                                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full text-xs font-medium">
                                          Spa
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* View Details Button */}
                                  <button
                                    className={`w-full mt-2 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                                      isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                                    }`}
                                  >
                                    View Details
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                            ))}
                          </div>
                        </div>
                      </div>
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
