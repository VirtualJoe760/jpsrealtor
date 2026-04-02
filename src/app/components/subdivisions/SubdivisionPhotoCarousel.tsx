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
          className={`relative w-full h-[600px] md:h-[700px] ${
            isLight ? "bg-gray-200" : "bg-gray-800"
          } rounded-2xl animate-pulse`}
        />
        {/* Thumbnails skeleton */}
        <div className="flex gap-3 overflow-x-auto pb-2">
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
    <div className="space-y-6">
      {/* Main Listing Display - Slideshow */}
      <div className={`relative rounded-2xl overflow-hidden ${
        isLight ? "bg-gray-100" : "bg-gray-900"
      } shadow-2xl`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="relative w-full h-[600px] md:h-[700px]"
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

            {/* Listing Details Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
              {/* Price */}
              <div className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-white">
                {formatPrice(currentPhoto.listPrice)}
              </div>

              {/* Beds & Baths */}
              <div className="flex items-center gap-8 mb-6">
                {currentPhoto.bedsTotal !== undefined && currentPhoto.bedsTotal !== null && (
                  <div className="flex items-center gap-3 text-white">
                    <Bed className="w-6 h-6 md:w-7 md:h-7" />
                    <span className="text-2xl md:text-3xl font-bold">
                      {currentPhoto.bedsTotal}
                    </span>
                    <span className="text-lg md:text-xl font-medium text-white/90">
                      {currentPhoto.bedsTotal === 1 ? "bed" : "beds"}
                    </span>
                  </div>
                )}

                {currentPhoto.bathroomsTotalDecimal !== undefined && currentPhoto.bathroomsTotalDecimal !== null && (
                  <div className="flex items-center gap-3 text-white">
                    <Bath className="w-6 h-6 md:w-7 md:h-7" />
                    <span className="text-2xl md:text-3xl font-bold">
                      {currentPhoto.bathroomsTotalDecimal}
                    </span>
                    <span className="text-lg md:text-xl font-medium text-white/90">
                      {currentPhoto.bathroomsTotalDecimal === 1 ? "bath" : "baths"}
                    </span>
                  </div>
                )}
              </div>

              {/* Address */}
              <div className="flex items-start gap-3 mb-8">
                <MapPin className="w-6 h-6 md:w-7 md:h-7 flex-shrink-0 mt-1 text-white" />
                <p className="text-xl md:text-2xl lg:text-3xl font-semibold leading-tight text-white">
                  {currentPhoto.address}
                </p>
              </div>

              {/* View Details Button */}
              <Link
                href={`/mls-listings/${currentPhoto.slug}`}
                className={`inline-flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg transition-all hover:scale-105 shadow-2xl ${
                  isLight
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                View Full Details
                <svg
                  className="w-6 h-6"
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
                  className={`absolute left-6 top-1/3 -translate-y-1/2 ${
                    isLight
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  } backdrop-blur-md p-4 rounded-full transition-all duration-300 shadow-xl hover:scale-110 z-10`}
                  aria-label="Previous listing"
                >
                  <ChevronLeft className="w-8 h-8" strokeWidth={2.5} />
                </button>

                <button
                  onClick={goToNext}
                  className={`absolute right-6 top-1/3 -translate-y-1/2 ${
                    isLight
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  } backdrop-blur-md p-4 rounded-full transition-all duration-300 shadow-xl hover:scale-110 z-10`}
                  aria-label="Next listing"
                >
                  <ChevronRight className="w-8 h-8" strokeWidth={2.5} />
                </button>
              </>
            )}

            {/* Counter Badge */}
            <div
              className={`absolute top-6 right-6 ${
                isLight
                  ? "bg-white/95 text-gray-900"
                  : "bg-black/90 text-white"
              } backdrop-blur-md px-5 py-2.5 rounded-full text-base font-bold shadow-xl border ${
                isLight ? "border-gray-200" : "border-white/20"
              }`}
            >
              {currentIndex + 1} / {photos.length}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Thumbnail Navigation */}
      <div className={`relative p-4 rounded-xl ${
        isLight ? "bg-white border border-gray-200" : "bg-gray-900/50"
      }`}>
        <div className={`flex gap-3 overflow-x-auto px-2 py-2 pb-3 scrollbar-thin ${
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
              className={`flex-shrink-0 relative w-40 h-28 rounded-xl overflow-hidden transition-all duration-300 ${
                index === currentIndex
                  ? `ring-4 ${isLight ? "ring-blue-600" : "ring-emerald-500"} shadow-2xl scale-105`
                  : `ring-2 ${isLight ? "ring-gray-300 hover:ring-blue-400" : "ring-gray-700 hover:ring-emerald-500"} shadow-lg hover:shadow-xl opacity-70 hover:opacity-100`
              }`}
            >
              {/* Thumbnail Photo */}
              <Image
                src={photo.src}
                alt={`Listing ${index + 1}`}
                fill
                className="object-cover"
                sizes="160px"
                quality={85}
              />

              {/* Overlay with price - dark for both themes */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2">
                <p className="font-bold text-sm truncate text-white">
                  {formatPrice(photo.listPrice)}
                </p>
                <p className="text-xs truncate text-white/80">
                  {photo.bedsTotal}bd · {photo.bathroomsTotalDecimal}ba
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Browse instruction */}
      <div className="text-center pt-2">
        <p className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>
          Click thumbnails to browse listings or use arrow keys
        </p>
      </div>
    </div>
  );
}
