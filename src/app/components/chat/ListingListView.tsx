// src/app/components/chat/ListingListView.tsx
// Paginated list view for browsing all listings

"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Home, Bed, Bath, Maximize2, Heart, ChevronLeft, ChevronRight } from "lucide-react";
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

interface ListingListViewProps {
  listings: Listing[];
  title?: string;
  totalCount?: number;
  hasMore?: boolean;
  onSelectionChange?: (selectedListings: Listing[]) => void;
  selectedListings?: Listing[];
  onOpenPanel?: (listings: Listing[], startIndex: number) => void;
}

const ITEMS_PER_PAGE = 4;

export default function ListingListView({
  listings,
  title,
  totalCount,
  hasMore,
  onSelectionChange,
  selectedListings = [],
  onOpenPanel
}: ListingListViewProps) {
  const { likedListings, toggleFavorite } = useMLSContext();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [currentPage, setCurrentPage] = useState(1);
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

  // Pagination
  const totalPages = Math.ceil(listings.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentListings = listings.slice(startIndex, endIndex);

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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of list
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  return (
    <div className="my-4 w-full">
      {/* Header */}
      {title && (
        <div className="mb-4">
          <p className={`text-base font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{title}</p>
          <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>
            Showing {startIndex + 1}-{Math.min(endIndex, listings.length)} of {totalCount || listings.length} properties
          </p>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {currentListings.map((listing, index) => (
          <div
            key={`${listing.id}-${index}`}
            className={`flex gap-4 rounded-xl overflow-hidden transition-all group ${
              isLight
                ? 'bg-white/90 border border-gray-300 hover:border-gray-400 shadow-sm'
                : 'bg-neutral-800/50 border border-neutral-700 hover:border-neutral-600'
            }`}
            style={isLight ? { backdropFilter: "blur(10px) saturate(150%)" } : {}}
          >
            {/* Image */}
            <div className="relative w-32 h-24 md:w-40 md:h-28 flex-shrink-0">
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
                  <Home className="h-8 w-8 text-neutral-500" />
                </div>
              )}

              {/* Checkbox for CMA Selection */}
              <button
                onClick={(e) => handleCheckboxToggle(e, listing)}
                className="absolute left-2 top-2 rounded-md bg-black/50 p-1 transition-all hover:bg-black/70 z-10"
                title={isSelected(listing) ? "Deselect for CMA" : "Select for CMA"}
              >
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                    isSelected(listing)
                      ? isLight
                        ? "bg-blue-600 border-blue-600"
                        : "bg-emerald-400 border-emerald-400"
                      : "bg-transparent border-white"
                  }`}
                >
                  {isSelected(listing) && (
                    <svg
                      className="w-3 h-3 text-white"
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
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 transition-colors hover:bg-black/70 z-10"
                title={isFavorited(listing) ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart
                  className={`h-4 w-4 transition-all ${
                    isFavorited(listing)
                      ? "fill-red-400 text-red-400"
                      : "text-white"
                  }`}
                />
              </button>
            </div>

            {/* Details */}
            <div className="flex-1 p-3 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className={`text-lg font-bold mb-1 ${
                    isLight ? 'text-blue-600' : 'text-emerald-400'
                  }`}>
                    ${listing.price?.toLocaleString() || "N/A"}
                  </p>
                  <p className={`truncate text-sm ${
                    isLight ? 'text-gray-700' : 'text-neutral-300'
                  }`}>
                    {listing.address || "No address"}
                  </p>
                  {listing.subdivision && (
                    <p className={`truncate text-xs mt-1 ${
                      isLight ? 'text-gray-500' : 'text-neutral-500'
                    }`}>
                      {listing.subdivision}
                    </p>
                  )}
                </div>

                {/* View Details Button */}
                {onOpenPanel ? (
                  <button
                    onClick={() => onOpenPanel(listings, startIndex + index)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                      isLight
                        ? 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                        : 'bg-neutral-700 text-white hover:bg-neutral-600'
                    }`}
                  >
                    View
                  </button>
                ) : (
                  <Link
                    href={listing.url}
                    target="_blank"
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                      isLight
                        ? 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                        : 'bg-neutral-700 text-white hover:bg-neutral-600'
                    }`}
                  >
                    View
                  </Link>
                )}
              </div>

              <div className={`flex gap-3 text-xs ${
                isLight ? 'text-gray-600' : 'text-neutral-400'
              }`}>
                <div className="flex items-center gap-1">
                  <Bed className="w-3.5 h-3.5" />
                  <span>{listing.beds ?? 0} bd</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bath className="w-3.5 h-3.5" />
                  <span>{listing.baths ?? 0} ba</span>
                </div>
                <div className="flex items-center gap-1">
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>{listing.sqft?.toLocaleString() ?? 0} sqft</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors ${
              currentPage === 1
                ? isLight
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                : isLight
                ? 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                : 'bg-neutral-700 text-white hover:bg-neutral-600'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    currentPage === pageNum
                      ? isLight
                        ? 'bg-blue-600 text-white'
                        : 'bg-emerald-500 text-black font-semibold'
                      : isLight
                      ? 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                      : 'bg-neutral-700 text-white hover:bg-neutral-600'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors ${
              currentPage === totalPages
                ? isLight
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                : isLight
                ? 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                : 'bg-neutral-700 text-white hover:bg-neutral-600'
            }`}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {hasMore && (
        <p className={`mt-4 text-center text-sm ${
          isLight ? 'text-gray-600' : 'text-neutral-400'
        }`}>
          More results available. Refine your search to see specific properties.
        </p>
      )}
    </div>
  );
}
