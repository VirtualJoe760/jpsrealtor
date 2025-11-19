// src/app/components/chat/ListingCarousel.tsx
// Auto-scrolling listing carousel for chat (dashboard-style)

"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Home, Bed, Bath, Maximize2, Heart } from "lucide-react";
import { useMLSContext } from "@/app/components/mls/MLSProvider";
import type { MapListing } from "@/types/types";

export interface Listing {
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
}

interface ListingCarouselProps {
  listings: Listing[];
  title?: string;
}

export default function ListingCarousel({ listings, title }: ListingCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { likedListings, toggleFavorite } = useMLSContext();

  // Helper function to check if a listing is favorited
  const isFavorited = (listing: Listing) => {
    const slug = listing.slugAddress || listing.slug || listing.id;
    return likedListings.some((fav) => (fav.slugAddress ?? fav.slug) === slug);
  };

  // Handle favorite toggle
  const handleFavoriteClick = (e: React.MouseEvent, listing: Listing) => {
    e.preventDefault();
    e.stopPropagation();

    // Convert Listing to MapListing format for toggleFavorite
    const mapListing: MapListing = {
      _id: listing.id,
      listingId: listing.id,
      listingKey: listing.id,
      slug: listing.slug || listing.id,
      slugAddress: listing.slugAddress || listing.slug || listing.id,
      primaryPhotoUrl: listing.image || '',
      unparsedAddress: listing.address,
      address: listing.address,
      latitude: 0, // Not available in chat listing format
      longitude: 0, // Not available in chat listing format
      listPrice: listing.price,
      bedsTotal: listing.beds,
      bathroomsTotalInteger: listing.baths,
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
      <div className="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
        <p className="text-neutral-400 text-sm">No listings found matching your criteria.</p>
      </div>
    );
  }

  // Duplicate listings for infinite scroll
  const duplicatedListings = [...listings, ...listings];

  return (
    <div className="my-4">
      {title && (
        <div className="mb-3">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-neutral-400">{listings.length} properties found</p>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {duplicatedListings.map((listing, index) => (
          <div
            key={`${listing.id}-${index}`}
            className="flex-shrink-0 w-72 bg-neutral-800/50 border border-neutral-700 rounded-xl overflow-hidden transition-all group hover:border-neutral-600"
          >
            {/* Image */}
            <div className="relative h-44">
              {listing.image ? (
                <Image
                  src={listing.image}
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
              <p className="mb-2 text-2xl font-bold text-emerald-400">
                ${listing.price?.toLocaleString() || "N/A"}
              </p>
              <p className="mb-3 truncate text-sm text-neutral-300">
                {listing.address || "No address"}
              </p>

              <div className="mb-3 flex gap-4 text-sm text-neutral-400">
                <div className="flex items-center gap-1">
                  <Bed className="w-4 h-4" />
                  <span>{listing.beds ?? 0} bd</span>
                </div>
                <div className="flex items-center gap-1">
                  <Bath className="w-4 h-4" />
                  <span>{listing.baths ?? 0} ba</span>
                </div>
                <div className="flex items-center gap-1">
                  <Maximize2 className="w-4 h-4" />
                  <span>{listing.sqft?.toLocaleString() ?? 0} sqft</span>
                </div>
              </div>

              {listing.subdivision && (
                <p className="mb-3 truncate text-xs text-neutral-500">
                  {listing.subdivision}
                </p>
              )}

              <Link
                href={listing.url}
                target="_blank"
                className="block w-full rounded-lg bg-neutral-700 py-2 text-center text-sm text-white transition-colors hover:bg-neutral-600"
              >
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
