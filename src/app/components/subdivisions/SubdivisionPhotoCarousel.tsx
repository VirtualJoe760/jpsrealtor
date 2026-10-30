"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/app/contexts/ThemeContext";
import { Bed, Bath, MapPin, ChevronLeft, ChevronRight } from "lucide-react";

interface Photo {
  photoId: string;
  listingId: string;
  slug: string;
  caption: string;
  src: string;
  thumb: string;
  address: string;
  listPrice: number;
  bedsTotal: number;
  bathroomsTotalDecimal: number;
}

// Landscape frame sized to the viewport. The old fixed h-[600px]/h-[700px]
// rendered a tall portrait crop on phones and ate the whole first screen on
// desktop.
const FRAME = "aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9]";

interface SubdivisionPhotoCarouselProps {
  subdivisionSlug: string;
  cityId?: string;
  subdivisionName: string;
  limit?: number;
}

export default function SubdivisionPhotoCarousel({
  subdivisionSlug,
  cityId,
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
        `/api/subdivisions/${subdivisionSlug}/photos?limit=${limit}${cityId ? `&city=${cityId}` : ''}`
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const goToListing = (index: number) => {
    setCurrentIndex(index);
  };

  // Swipe on touch devices (40px threshold so vertical scrolls don't flip slides)
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) (dx > 0 ? goToPrevious : goToNext)();
    setTouchStartX(null);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photos.length]);

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Main photo skeleton */}
        <div
          className={`relative w-full ${FRAME} ${
            isLight ? "bg-gray-200" : "bg-gray-800"
          } md:rounded-2xl animate-pulse`}
        />
        {/* Thumbnails skeleton */}
        <div className="flex gap-3 overflow-x-auto pb-2 px-4 md:px-0">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`flex-shrink-0 w-32 h-24 ${
                isLight ? "bg-gray-200" : "bg-gray-800"
              } rounded-lg animate-pulse`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || photos.length === 0) {
    return (
      <div
        className={`relative w-full h-96 ${
          isLight ? "bg-gray-100" : "bg-gray-800"
        } rounded-2xl flex items-center justify-center transition-all duration-300`}
      >
        <div className={`text-center ${isLight ? "text-gray-700" : "text-gray-300"}`}>
          <svg
            className={`w-16 h-16 mx-auto mb-4 ${
              isLight ? "text-gray-400" : "text-gray-500"
            }`}
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
          <p className="text-lg font-medium">No listings available</p>
          <p className="text-sm mt-2">Check back soon for new properties</p>
        </div>
      </div>
    );
  }

  const currentPhoto = photos[currentIndex];

  return (
    <div className="space-y-4">
      {/* Main Listing Display - Slideshow */}
      <div
        className={`relative md:rounded-2xl overflow-hidden ${
          isLight ? "bg-gray-100" : "bg-gray-900"
        } md:shadow-xl`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className={`relative w-full ${FRAME}`}
          >
            {/* Photo */}
            <Image
              src={currentPhoto.src}
              alt={currentPhoto.address || `${subdivisionName} listing ${currentIndex + 1}`}
              fill
              className="object-cover"
              sizes="100vw"
              quality={100}
              priority={currentIndex < 3}
            />

            {/* Gradient Overlay - dark for both themes */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

            {/* Listing Details Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 flex items-end justify-between gap-4">
              <div className="min-w-0">
                {/* Price */}
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-none">
                  {formatPrice(currentPhoto.listPrice)}
                </div>

                {/* Beds & Baths */}
                <div className="mt-2 flex items-center gap-4 text-sm md:text-base text-white/90">
                  {currentPhoto.bedsTotal !== undefined && currentPhoto.bedsTotal !== null && (
                    <span className="flex items-center gap-1.5">
                      <Bed className="w-4 h-4" />
                      {currentPhoto.bedsTotal} {currentPhoto.bedsTotal === 1 ? "bed" : "beds"}
                    </span>
                  )}
                  {currentPhoto.bathroomsTotalDecimal !== undefined && currentPhoto.bathroomsTotalDecimal !== null && (
                    <span className="flex items-center gap-1.5">
                      <Bath className="w-4 h-4" />
                      {currentPhoto.bathroomsTotalDecimal} {currentPhoto.bathroomsTotalDecimal === 1 ? "bath" : "baths"}
                    </span>
                  )}
                </div>

                {/* Address */}
                <p className="mt-1.5 flex items-center gap-1.5 text-xs sm:text-sm md:text-base text-white/80 truncate">
                  <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                  <span className="truncate">{currentPhoto.address}</span>
                </p>
              </div>

              {/* View Details Button */}
              <Link
                href={`/mls-listings/${currentPhoto.slug}`}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 md:px-5 md:py-2.5 rounded-full font-semibold text-xs md:text-sm transition-colors ${
                  isLight
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                <span className="hidden sm:inline">View Details</span>
                <span className="sm:hidden">View</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </div>

            {/* Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-black/25 hover:bg-black/50 text-white/90 hover:text-white backdrop-blur-sm transition-colors z-10"
                  aria-label="Previous listing"
                >
                  <ChevronLeft className="w-5 h-5" strokeWidth={2} />
                </button>

                <button
                  onClick={goToNext}
                  className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-black/25 hover:bg-black/50 text-white/90 hover:text-white backdrop-blur-sm transition-colors z-10"
                  aria-label="Next listing"
                >
                  <ChevronRight className="w-5 h-5" strokeWidth={2} />
                </button>
              </>
            )}

            {/* Counter Badge */}
            <div
              className="absolute top-3 right-3 md:top-4 md:right-4 bg-black/40 text-white backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums"
            >
              {currentIndex + 1} / {photos.length}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Thumbnail Navigation */}
      <div className="relative">
        <div className={`flex gap-3 overflow-x-auto px-4 md:px-1 py-2 pb-3 scrollbar-thin ${
          isLight
            ? "scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            : "scrollbar-thumb-gray-600 scrollbar-track-gray-800"
        }`}>
          {photos.map((photo, index) => (
            <motion.button
              key={photo.photoId}
              onClick={() => goToListing(index)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex-shrink-0 relative w-28 h-20 md:w-36 md:h-24 rounded-lg overflow-hidden transition-all duration-300 ${
                index === currentIndex
                  ? `ring-2 ${isLight ? "ring-blue-600" : "ring-emerald-500"} shadow-lg`
                  : `ring-1 ${isLight ? "ring-gray-300 hover:ring-blue-400" : "ring-gray-700 hover:ring-emerald-500"} opacity-70 hover:opacity-100`
              }`}
            >
              {/* Thumbnail Photo */}
              <Image
                src={photo.src}
                alt={`Listing ${index + 1}`}
                fill
                className="object-cover"
                sizes="144px"
                quality={85}
              />

              {/* Overlay with price - dark for both themes */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-1.5 left-2 right-2 text-left">
                <p className="font-bold text-xs md:text-sm truncate text-white">
                  {formatPrice(photo.listPrice)}
                </p>
                <p className="text-[10px] md:text-xs truncate text-white/80">
                  {photo.bedsTotal}bd · {photo.bathroomsTotalDecimal}ba
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Browse instruction */}
    </div>
  );
}
