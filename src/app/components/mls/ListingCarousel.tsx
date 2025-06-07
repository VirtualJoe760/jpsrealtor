"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { fetchListingPhotos } from "@/app/utils/spark/photos";

interface ListingCarouselProps {
  listingId: string;
  initialPhoto: string;
  alt?: string;
}

const ListingCarousel: React.FC<ListingCarouselProps> = ({ listingId, initialPhoto, alt }) => {
  const [photos, setPhotos] = useState<string[]>([initialPhoto]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadAllPhotos = async () => {
      try {
        const results = await fetchListingPhotos(listingId);
        const urls = results
          .map((p: any) => p.Uri800 || p.UriLarge || p.UriThumb)
          .filter((url: string | undefined): url is string => !!url);

        const unique = Array.from(new Set([initialPhoto, ...urls]));

        if (!cancelled && unique.length > 0) {
          setPhotos(unique);
        }
      } catch (err) {
        console.warn("📛 Could not load all photos:", err);
      }
    };

    loadAllPhotos();

    return () => {
      cancelled = true;
    };
  }, [listingId, initialPhoto]);

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const displayPhoto = photos[currentIndex] || "/images/no-photo.png";

  return (
    <div className="relative w-full h-52 sm:h-60 lg:h-72 2xl:h-80 rounded-t-2xl overflow-hidden">
      <Image
        src={displayPhoto}
        alt={alt || "Listing photo"}
        fill
        className="object-cover transition-opacity duration-300 ease-in-out"
      />

      {photos.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 p-1 rounded-full z-10 hover:bg-black/70"
            aria-label="Previous photo"
          >
            <ChevronLeftIcon className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 p-1 rounded-full z-10 hover:bg-black/70"
            aria-label="Next photo"
          >
            <ChevronRightIcon className="w-5 h-5 text-white" />
          </button>
        </>
      )}
    </div>
  );
};

export default ListingCarousel;
