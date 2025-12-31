// src/app/components/chat/ListingCarousel.tsx
// Auto-scrolling listing carousel for chat (dashboard-style)

"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Home, Bed, Bath, Maximize2, Heart, FileText } from "lucide-react";
import { useMLSContext } from "@/app/components/mls/MLSProvider";
import type { MapListing } from "@/types/types";
import { useTheme } from "@/app/contexts/ThemeContext";

export interface Listing {
  // Core display fields
  id: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  city: string;
  address: string;
  image?: string;
  subdivision?: string;
  type?: string;
  url: string;
  slug?: string;
  slugAddress?: string;
  latitude?: number;
  longitude?: number;
  listingKey?: string;

  // Additional fields for ListingBottomPanel
  _id?: string;
  listingId?: string;
  unparsedAddress?: string;
  unparsedFirstLineAddress?: string;
  bedsTotal?: number;
  bedroomsTotal?: number;
  bathroomsTotalInteger?: number;
  bathroomsTotalDecimal?: number;
  bathroomsFull?: number;
  bathroomsHalf?: number;
  livingArea?: number;
  lotSizeArea?: number;
  lotSizeSqft?: number;
  yearBuilt?: number;
  daysOnMarket?: number;
  standardStatus?: string;
  propertySubType?: string;
  subdivisionName?: string;
  mlsSource?: string;
  landType?: string;
  associationFee?: number;
  poolYn?: boolean;
  pool?: boolean;
  spaYn?: boolean;
  spa?: boolean;
  publicRemarks?: string;
  modificationTimestamp?: string;
}

interface ListingCarouselProps {
  listings: Listing[];
  title?: string;
  onSelectionChange?: (selectedListings: Listing[]) => void;
  selectedListings?: Listing[];
  onOpenPanel?: (listings: Listing[], startIndex: number) => void;
}

export default function ListingCarousel({
  listings,
  title,
  onSelectionChange,
  selectedListings = [],
  onOpenPanel
}: ListingCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { likedListings, toggleFavorite } = useMLSContext();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [localSelectedListings, setLocalSelectedListings] = useState<Listing[]>(selectedListings);
  const [photos, setPhotos] = useState<Record<string, string>>({});

  // Fetch photos from Spark API for all listings
  useEffect(() => {
    const fetchPhotos = async () => {
      const photoPromises = listings.map(async (listing) => {
        const listingKey = listing.listingKey || listing.id;
        if (!listingKey) return null;

        try {
          const res = await fetch(`/api/listings/${listingKey}/photos`);
          if (res.ok) {
            const data = await res.json();
            const firstPhoto = data.photos?.[0];
            if (firstPhoto) {
              // Use the highest quality available
              const photoUrl = firstPhoto.uri2048 ||
                               firstPhoto.uri1600 ||
                               firstPhoto.uri1280 ||
                               firstPhoto.uri1024 ||
                               firstPhoto.uri800 ||
                               firstPhoto.uriLarge ||
                               firstPhoto.uriThumb ||
                               listing.image;
              return { listingKey, photoUrl };
            }
          }
        } catch (err) {
          console.error(`Failed to fetch photo for ${listingKey}:`, err);
        }
        return null;
      });

      const results = await Promise.all(photoPromises);
      const photoMap: Record<string, string> = {};
      results.forEach((result) => {
        if (result) {
          photoMap[result.listingKey] = result.photoUrl;
        }
      });
      setPhotos(photoMap);
    };

    if (listings.length > 0) {
      fetchPhotos();
    }
  }, [listings]);

  // Helper function to check if a listing is favorited
  const isFavorited = (listing: Listing) => {
    const slug = listing.slugAddress || listing.slug || listing.id;
    return likedListings.some((fav) => (fav.slugAddress ?? fav.slug) === slug);
  };

  // Helper function to check if a listing is selected
  const isSelected = (listing: Listing) => {
    return localSelectedListings.some((selected) => selected.id === listing.id);
  };

  // Handle checkbox toggle
  const handleCheckboxToggle = (e: React.MouseEvent, listing: Listing) => {
    e.preventDefault();
    e.stopPropagation();

    const newSelection = isSelected(listing)
      ? localSelectedListings.filter((l) => l.id !== listing.id)
      : [...localSelectedListings, listing];

    setLocalSelectedListings(newSelection);
    onSelectionChange?.(newSelection);
  };

  // Handle favorite toggle
  const handleFavoriteClick = (e: React.MouseEvent, listing: Listing) => {
    e.preventDefault();
    e.stopPropagation();

    // Convert Listing to MapListing format for toggleFavorite
    const mapListing: MapListing = {
      _id: listing.id,
      listingId: listing.id,
      listingKey: listing.listingKey || listing.id,
      slug: listing.slug || listing.id,
      slugAddress: listing.slugAddress || listing.slug || listing.id,
      primaryPhotoUrl: listing.image || '',
      unparsedAddress: listing.address,
      address: listing.address,
      latitude: listing.latitude || 0,
      longitude: listing.longitude || 0,
      listPrice: listing.price,
      bedsTotal: listing.beds,
      bathroomsTotalInteger: Math.floor(listing.baths),
      livingArea: listing.sqft,
      city: listing.city,
      subdivisionName: listing.subdivision,
    };

    toggleFavorite(mapListing);
  };

  // Auto-scroll effect (same as dashboard)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || listings.length === 0) return;

    let intervalId: NodeJS.Timeout | null = null;
    const scrollSpeed = 0.5; // pixels per tick
    const tickInterval = 20; // ms between ticks (50fps)
    let isUserScrolling = false;
    let userScrollTimeout: NodeJS.Timeout | null = null;

    const autoScroll = () => {
      if (container && !isUserScrolling) {
        // Infinite loop: Reset to start when reaching halfway point
        const halfWidth = container.scrollWidth / 2;
        if (container.scrollLeft >= halfWidth - 10) {
          container.scrollLeft = 0;
        }
        container.scrollLeft += scrollSpeed;
      }
    };

    const handleUserInteraction = () => {
      isUserScrolling = true;
      if (userScrollTimeout) clearTimeout(userScrollTimeout);
      userScrollTimeout = setTimeout(() => {
        isUserScrolling = false;
      }, 2000);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
      handleUserInteraction();

      // Keep infinite loop while wheeling
      const halfWidth = container.scrollWidth / 2;
      if (container.scrollLeft >= halfWidth - 10) {
        container.scrollLeft = 0;
      } else if (container.scrollLeft < 10) {
        container.scrollLeft = halfWidth - container.clientWidth;
      }
    };

    const handleMouseEnter = () => {
      isUserScrolling = true;
    };

    const handleMouseLeave = () => {
      isUserScrolling = false;
    };

    // Start auto-scroll after short delay
    const startTimer = setTimeout(() => {
      const canScroll = container.scrollWidth > container.clientWidth;
      if (canScroll) {
        intervalId = setInterval(autoScroll, tickInterval);
      }
    }, 500);

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      clearTimeout(startTimer);
      if (userScrollTimeout) clearTimeout(userScrollTimeout);
      if (intervalId !== null) clearInterval(intervalId);
      // Only remove event listeners if container still exists
      if (container) {
        container.removeEventListener("wheel", handleWheel);
        container.removeEventListener("mouseenter", handleMouseEnter);
        container.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [listings.length]);

  if (listings.length === 0) {
    return (
      <div className={`p-4 rounded-lg border ${
        isLight
          ? 'bg-gray-100 border-gray-300 text-gray-600'
          : 'bg-neutral-800/50 border-neutral-700 text-neutral-400'
      }`}>
        <p className="text-sm">No listings found matching your criteria.</p>
      </div>
    );
  }

  // Duplicate listings for infinite scroll
  // Duplicate 2x for smooth infinite scroll (less duplication since we're paginating)
  const duplicatedListings = Array(2).fill(listings).flat();

  return (
    <div className="my-4 w-full overflow-hidden">
      {title && (
        <div className="mb-3">
          <p className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>{title}</p>
          <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>{listings.length} properties found</p>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none", overscrollBehaviorX: "contain" }}
      >
        {duplicatedListings.map((listing, index) => (
          <div
            key={`${listing.id}-${index}`}
            className={`flex-shrink-0 w-[85vw] sm:w-72 md:w-80 xl:w-96 2xl:w-[28rem] rounded-xl overflow-hidden transition-all group ${
              isLight
                ? 'bg-white/90 border border-gray-300 hover:border-gray-400 shadow-md'
                : 'bg-neutral-800/50 border border-neutral-700 hover:border-neutral-600'
            }`}
            style={isLight ? { backdropFilter: "blur(10px) saturate(150%)" } : {}}
          >
            {/* Image */}
            <div className="relative h-48 sm:h-40 md:h-44 xl:h-52 2xl:h-60">
              {(photos[listing.listingKey || listing.id] || listing.image) ? (
                <Image
                  src={photos[listing.listingKey || listing.id] || listing.image || ''}
                  alt={listing.address || "Property"}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-neutral-700">
                  <Home className="h-12 w-12 text-neutral-500" />
                </div>
              )}

              {/* Checkbox for CMA Selection */}
              <button
                onClick={(e) => handleCheckboxToggle(e, listing)}
                className="absolute left-2 top-2 rounded-md bg-black/50 p-1.5 transition-all hover:bg-black/70 z-10"
                title={isSelected(listing) ? "Deselect for CMA" : "Select for CMA"}
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    isSelected(listing)
                      ? isLight
                        ? "bg-blue-600 border-blue-600"
                        : "bg-emerald-400 border-emerald-400"
                      : "bg-transparent border-white"
                  }`}
                >
                  {isSelected(listing) && (
                    <svg
                      className="w-3.5 h-3.5 text-white"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                </div>
              </button>

              {/* Favorite Heart Icon */}
              <button
                onClick={(e) => handleFavoriteClick(e, listing)}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-2 transition-colors hover:bg-black/70 z-10"
                title={isFavorited(listing) ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart
                  className={`h-5 w-5 transition-all ${
                    isFavorited(listing)
                      ? "fill-red-400 text-red-400"
                      : "text-white"
                  }`}
                />
              </button>
            </div>

            {/* Details */}
            <div className="p-4">
              <p className={`mb-2 text-2xl font-bold ${
                isLight ? 'text-blue-600' : 'text-emerald-400'
              }`}>
                ${listing.price?.toLocaleString() || "N/A"}
              </p>
              <p className={`mb-3 truncate text-sm ${
                isLight ? 'text-gray-700' : 'text-neutral-300'
              }`}>
                {listing.address || "No address"}
              </p>

              <div className={`mb-3 flex gap-4 text-sm ${
                isLight ? 'text-gray-600' : 'text-neutral-400'
              }`}>
                <div className="flex items-center gap-1">
                  <Bed className="w-4 h-4" />
                  <span>{listing.beds ?? listing.bedsTotal ?? listing.bedroomsTotal ?? 0} bd</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bath className="w-4 h-4" />
                  <span>{listing.baths ?? listing.bathsTotal ?? listing.bathroomsTotalInteger ?? listing.bathroomsFull ?? 0} ba</span>
                </div>
                <div className="flex items-center gap-1">
                  <Maximize2 className="w-4 h-4" />
                  <span>{listing.sqft?.toLocaleString() ?? listing.livingArea?.toLocaleString() ?? 0} sqft</span>
                </div>
              </div>

              {listing.subdivision && (
                <p className={`mb-3 truncate text-xs ${
                  isLight ? 'text-gray-500' : 'text-neutral-500'
                }`}>
                  {listing.subdivision}
                </p>
              )}

              {onOpenPanel ? (
                <button
                  onClick={() => onOpenPanel(listings, index % listings.length)}
                  className={`block w-full rounded-lg py-2 text-center text-sm transition-colors ${
                    isLight
                      ? 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                      : 'bg-neutral-700 text-white hover:bg-neutral-600'
                  }`}
                  data-tour={index === 0 ? "view-listing-button" : undefined}
                >
                  View Details
                </button>
              ) : (
                <Link
                  href={listing.url}
                  target="_blank"
                  className={`block w-full rounded-lg py-2 text-center text-sm transition-colors ${
                    isLight
                      ? 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                      : 'bg-neutral-700 text-white hover:bg-neutral-600'
                  }`}
                  data-tour={index === 0 ? "view-listing-button" : undefined}
                >
                  View Details
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
