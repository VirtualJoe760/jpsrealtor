"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTheme } from "@/app/contexts/ThemeContext";

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

  // Theme support
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

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

  // Auto-scroll for thumbnails and advance photo when thumbnail goes out of view
  useEffect(() => {
    const scrollContainer = document.getElementById('thumbnail-scroll-container');
    if (!scrollContainer || photos.length <= 1) return;

    let scrollDirection = 1;
    let scrollPosition = 0;
    const scrollSpeed = 0.5;
    const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;

    const autoScroll = () => {
      scrollPosition += scrollSpeed * scrollDirection;

      if (scrollPosition >= maxScroll) {
        scrollDirection = -1;
      } else if (scrollPosition <= 0) {
        scrollDirection = 1;
      }

      scrollContainer.scrollLeft = scrollPosition;

      // Check if current thumbnail is out of view
      const currentThumbnail = scrollContainer.children[currentIndex] as HTMLElement;
      if (currentThumbnail) {
        const thumbRect = currentThumbnail.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();

        // Check if thumbnail is completely scrolled out of view on the left
        if (thumbRect.right < containerRect.left) {
          // Move to next photo
          setCurrentIndex((prev) => (prev + 1) % photos.length);
        }
        // Check if thumbnail is completely scrolled out of view on the right
        else if (thumbRect.left > containerRect.right) {
          // Move to previous photo
          setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
        }
      }
    };

    const intervalId = setInterval(autoScroll, 30);

    return () => clearInterval(intervalId);
  }, [photos.length, currentIndex]);

  if (loading) {
    return (
      <div className={`relative w-full h-96 ${isLight ? 'bg-gray-100' : 'bg-gray-800'} rounded-lg flex items-center justify-center transition-all duration-300`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isLight ? 'border-blue-600' : 'border-blue-400'} mx-auto mb-4`}></div>
          <p className={`${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Loading photos...</p>
        </div>
      </div>
    );
  }

  if (error || photos.length === 0) {
    return (
      <div className={`relative w-full h-96 ${isLight ? 'bg-gray-100' : 'bg-gray-800'} rounded-lg flex items-center justify-center transition-all duration-300`}>
        <div className={`text-center ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
          <svg
            className={`w-16 h-16 mx-auto mb-4 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}
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

  // Safety check (should never happen due to early return above)
  if (!currentPhoto) {
    return null;
  }

  return (
    <div className="space-y-6 -mx-6 md:-mx-8">
      {/* Main Photo Display - Full Width */}
      <div className={`relative w-full h-[450px] md:h-[550px] ${isLight ? 'bg-gray-200' : 'bg-gray-900'} overflow-hidden group transition-all duration-300`}>
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full"
        >
          <Image
            src={currentPhoto.src}
            alt={currentPhoto.caption || `${subdivisionName} - Photo ${currentIndex + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
            priority={currentIndex === 0}
            quality={95}
          />
        </motion.div>

        {/* Navigation Arrows */}
        {photos.length > 1 && (
          <>
            <motion.button
              onClick={goToPrevious}
              whileHover={{ scale: 1.1 }}
              className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                isLight
                  ? 'bg-white/60 hover:bg-white/80 text-gray-800 shadow-lg'
                  : 'bg-black/60 hover:bg-black/80 text-white'
              } backdrop-blur-md p-4 rounded-full transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100`}
              aria-label="Previous photo"
            >
              <svg
                className="w-7 h-7"
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
            </motion.button>

            <motion.button
              onClick={goToNext}
              whileHover={{ scale: 1.1 }}
              className={`absolute right-4 top-1/2 -translate-y-1/2 ${
                isLight
                  ? 'bg-white/60 hover:bg-white/80 text-gray-800 shadow-lg'
                  : 'bg-black/60 hover:bg-black/80 text-white'
              } backdrop-blur-md p-4 rounded-full transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100`}
              aria-label="Next photo"
            >
              <svg
                className="w-7 h-7"
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
            </motion.button>
          </>
        )}

        {/* Photo Counter */}
        <div
          className={`absolute top-4 right-4 ${
            isLight
              ? 'bg-white/90 text-gray-900 shadow-md border border-gray-200'
              : 'bg-black/90 text-white border border-white/10'
          } backdrop-blur-md px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300`}
          style={{ backdropFilter: 'blur(12px)' }}
        >
          {currentIndex + 1} / {photos.length}
        </div>
      </div>

      {/* Listing Info - Below Image */}
      <Link
        href={`/mls-listings/${currentPhoto.slug}`}
        className="block px-6 md:px-8 hover:opacity-80 transition-opacity duration-200"
      >
        <div className={isLight ? 'text-gray-900' : 'text-white'}>
          {/* Price */}
          <div className={`text-3xl md:text-4xl font-bold mb-3 ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
            {currentPhoto.listPrice
              ? `$${currentPhoto.listPrice.toLocaleString()}`
              : "Price not available"}
          </div>

          {/* Beds & Baths */}
          <div className={`flex items-center gap-4 text-base md:text-lg mb-2 font-medium ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
            {(currentPhoto.bedroomsTotal !== undefined && currentPhoto.bedroomsTotal !== null) && (
              <div className="flex items-center gap-2">
                <svg
                  className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`}
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
                <span>{currentPhoto.bedroomsTotal} bed{currentPhoto.bedroomsTotal !== 1 ? 's' : ''}</span>
              </div>
            )}
            {(currentPhoto.bedroomsTotal !== undefined && currentPhoto.bedroomsTotal !== null) &&
             (currentPhoto.bathroomsTotalDecimal !== undefined && currentPhoto.bathroomsTotalDecimal !== null) && (
              <span className={isLight ? 'text-gray-400' : 'text-gray-500'}>|</span>
            )}
            {(currentPhoto.bathroomsTotalDecimal !== undefined && currentPhoto.bathroomsTotalDecimal !== null) && (
              <div className="flex items-center gap-2">
                <svg
                  className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`}
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
                <span>{currentPhoto.bathroomsTotalDecimal} bath{currentPhoto.bathroomsTotalDecimal !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Address */}
          <div className={`text-base md:text-lg ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            {currentPhoto.address || "Address not available"}
          </div>
        </div>
      </Link>

      {/* Thumbnail Strip - Auto-scrolling, No Scrollbar */}
      {photos.length > 1 && (
        <div
          id="thumbnail-scroll-container"
          className="flex gap-3 overflow-x-auto px-6 md:px-8 no-scrollbar"
        >
          {photos.map((photo, index) => (
            <motion.button
              key={photo.photoId}
              onClick={() => goToIndex(index)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex-shrink-0 relative w-24 h-24 md:w-28 md:h-28 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                index === currentIndex
                  ? `border-blue-600 ring-2 ${isLight ? 'ring-blue-400 shadow-lg' : 'ring-blue-300 shadow-xl'}`
                  : isLight
                  ? 'border-gray-300 hover:border-blue-400 bg-gray-100 shadow-sm'
                  : 'border-gray-600 hover:border-blue-500 bg-gray-800'
              }`}
            >
              <Image
                src={photo.src}
                alt={`Thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 96px, 112px"
                quality={85}
              />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
