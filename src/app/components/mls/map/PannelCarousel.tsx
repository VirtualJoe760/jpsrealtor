// src/app/components/mls/map/PannelCarousel.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Photo = {
  id: string;
  caption: string;
  src: string;
  primary: boolean;
};

type Props = {
  alt: string;
  listingKey: string;
};

export default function PannelCarousel({ listingKey, alt }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [current, setCurrent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPhotosFromRoute = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/listing/${listingKey}/photos`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!res.ok) {
          console.error(
            `🚫 Failed to fetch photos for ${listingKey}: ${res.status}`
          );
          setPhotos([]);
          setIsLoading(false);
          return;
        }

        const data = await res.json();
        console.log("✅ Photos fetched:", data.photos?.length);

        if (!Array.isArray(data.photos)) {
          console.warn("⚠️ Unexpected photos format:", data);
          setPhotos([]);
          setIsLoading(false);
          return;
        }

        setPhotos(data.photos);
      } catch (err) {
        console.error("❌ Error fetching photos from API route:", err);
        setPhotos([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhotosFromRoute();
  }, [listingKey]);

  const next = () => setCurrent((prev) => (prev + 1) % photos.length);
  const prev = () =>
    setCurrent((prev) => (prev - 1 + photos.length) % photos.length);

  const nextIndex = (current + 1) % photos.length;

  return (
    <div className="relative w-full aspect-[16/9] rounded-t-2xl overflow-hidden bg-zinc-900">
      {isLoading ? (
        <div className="flex items-center justify-center h-full w-full text-white">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="flex items-center justify-center h-full w-full text-white">
          No photos available
        </div>
      ) : (
        <>
          {/* Main Photo */}
          <div className="absolute inset-0">
            <Image
              src={photos[current]?.src || "/images/no-photo.png"}
              alt={alt}
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Preload next photo */}
          {photos[nextIndex]?.src && (
            <Image
              src={photos[nextIndex].src}
              alt="Preload next image"
              width={1}
              height={1}
              className="hidden"
              priority={false}
            />
          )}

          {/* Navigation buttons */}
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-1 rounded-full z-10"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-1 rounded-full z-10"
            aria-label="Next photo"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </>
      )}
    </div>
  );
}
