// src/app/components/chat/ListingCarousel.tsx
// Simple listing carousel for chat (you'll redesign this later)

"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Home, Bed, Bath, Maximize2 } from "lucide-react";

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
}

interface ListingCarouselProps {
  listings: Listing[];
  title?: string;
}

export default function ListingCarousel({ listings, title }: ListingCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (listings.length === 0) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <p className="text-gray-400 text-sm">No listings found matching your criteria.</p>
      </div>
    );
  }

  const currentListing = listings[currentIndex];

  if (!currentListing) {
    return null;
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? listings.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === listings.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="my-3 bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden max-w-md">
      {title && (
        <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-gray-400">{listings.length} properties found</p>
        </div>
      )}

      {/* Image */}
      <div className="relative h-48 bg-gray-900">
        {currentListing.image ? (
          <Image
            src={currentListing.image}
            alt={currentListing.address}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Home className="w-12 h-12 text-gray-600" />
          </div>
        )}

        {/* Navigation arrows */}
        {listings.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </>
        )}

        {/* Counter */}
        {listings.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
            {currentIndex + 1} / {listings.length}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4">
        <p className="text-2xl font-bold text-emerald-400 mb-2">
          ${currentListing.price.toLocaleString()}
        </p>

        <p className="text-sm text-gray-300 mb-3 truncate">{currentListing.address}</p>

        {/* Specs */}
        <div className="flex gap-4 mb-3 text-sm text-gray-400">
          <div className="flex items-center gap-1">
            <Bed className="w-4 h-4" />
            <span>{currentListing.beds} bd</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="w-4 h-4" />
            <span>{currentListing.baths} ba</span>
          </div>
          <div className="flex items-center gap-1">
            <Maximize2 className="w-4 h-4" />
            <span>{currentListing.sqft.toLocaleString()} sqft</span>
          </div>
        </div>

        {currentListing.subdivision && (
          <p className="text-xs text-gray-500 mb-3 truncate">{currentListing.subdivision}</p>
        )}

        {/* View button */}
        <Link
          href={currentListing.url}
          target="_blank"
          className="block w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-lg transition-colors text-sm font-medium"
        >
          View Full Details
        </Link>
      </div>

      {/* Dots indicator */}
      {listings.length > 1 && (
        <div className="flex justify-center gap-1 pb-3">
          {listings.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? "bg-blue-500" : "bg-gray-600"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
