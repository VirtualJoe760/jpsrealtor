"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

interface Photo {
  photoId: string;
  listingId: string;
  slug: string;
  caption: string;
  src: string;
  thumb: string;
  address: string;
  listPrice: number;
  bedroomsTotal: number;
  bathroomsTotalDecimal: number;
}

interface SubdivisionPhotoCarouselProps {
  subdivisionSlug: string;
  subdivisionName: string;
  limit?: number;
}

export default function SubdivisionPhotoCarousel({
  subdivisionSlug,
  subdivisionName,
  limit = 20,
}: SubdivisionPhotoCarouselProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPhotos();
  }, [subdivisionSlug]);

  const fetchPhotos = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/subdivisions/${subdivisionSlug}/photos?limit=${limit}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch photos");
      }

      const data = await response.json();
      setPhotos(data.photos || []);
    } catch (err) {
      console.error("Error fetching subdivision photos:", err);
      setError("Failed to load photos");
    } finally {
      setLoading(false);
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? photos.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === photos.length - 1 ? 0 : prevIndex + 1
    );
  };

  const goToIndex = (index: number) => {
    setCurrentIndex(index);
  };

  if (loading) {
    return (
      <div className="relative w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading photos...</p>
        </div>
      </div>
    );
  }

  if (error || photos.length === 0) {
    return (
      <div className="relative w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-600">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p>No photos available for this subdivision</p>
        </div>
      </div>
    );
  }

  const currentPhoto = photos[currentIndex];

  return (
    <div className="space-y-4">
      {/* Main Photo Display */}
      <div className="relative w-full h-96 bg-gray-900 rounded-lg overflow-hidden group">
        <Image
          src={currentPhoto.src}
          alt={currentPhoto.caption || `${subdivisionName} - Photo ${currentIndex + 1}`}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          priority={currentIndex === 0}
        />

        {/* Navigation Arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100"
              aria-label="Previous photo"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100"
              aria-label="Next photo"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}

        {/* Photo Counter */}
        <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} / {photos.length}
        </div>

        {/* Listing Info Overlay - Clickable */}
        <Link
          href={`/mls-listings/${currentPhoto.slug}`}
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6 hover:from-black/95 hover:via-black/75 transition-all cursor-pointer"
        >
          <div className="text-white">
            {/* Price */}
            <div className="text-3xl font-bold mb-2">
              {currentPhoto.listPrice
                ? `$${currentPhoto.listPrice.toLocaleString()}`
                : "Price not available"}
            </div>

            {/* Beds & Baths */}
            <div className="flex items-center gap-4 text-base mb-3">
              {(currentPhoto.bedroomsTotal !== undefined && currentPhoto.bedroomsTotal !== null) && (
                <div className="flex items-center gap-1.5">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  <span className="font-medium">{currentPhoto.bedroomsTotal} bed{currentPhoto.bedroomsTotal !== 1 ? 's' : ''}</span>
                </div>
              )}
              {(currentPhoto.bedroomsTotal !== undefined && currentPhoto.bedroomsTotal !== null) &&
               (currentPhoto.bathroomsTotalDecimal !== undefined && currentPhoto.bathroomsTotalDecimal !== null) && (
                <span className="text-white/60">|</span>
              )}
              {(currentPhoto.bathroomsTotalDecimal !== undefined && currentPhoto.bathroomsTotalDecimal !== null) && (
                <div className="flex items-center gap-1.5">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
                    />
                  </svg>
                  <span className="font-medium">{currentPhoto.bathroomsTotalDecimal} bath{currentPhoto.bathroomsTotalDecimal !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            {/* Address - Bottom, Larger */}
            <div className="text-lg font-medium opacity-95">
              {currentPhoto.address || "Address not available"}
            </div>
          </div>
        </Link>
      </div>

      {/* Thumbnail Strip */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {photos.map((photo, index) => (
            <button
              key={photo.photoId}
              onClick={() => goToIndex(index)}
              className={`flex-shrink-0 relative w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? "border-blue-600 ring-2 ring-blue-300"
                  : "border-gray-300 hover:border-blue-400"
              }`}
            >
              <Image
                src={photo.thumb || photo.src}
                alt={`Thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
