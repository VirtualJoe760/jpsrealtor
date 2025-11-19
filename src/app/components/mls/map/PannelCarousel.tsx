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
        if (!Array.isArray(data.photos)) {
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
    <div
      className="
        relative
        w-full
        h-[300px] sm:h-[320px] md:h-[340px] lg:h-[360px] xl:h-[400px] 2xl:h-[450px]
        rounded-t-2xl
        overflow-hidden
        bg-zinc-900
      "
    >
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
          <Image
            src={photos[current]?.src || "/images/no-photo.png"}
            alt={alt}
            fill
            className="object-cover"
            priority={current === 0}
            loading={current === 0 ? "eager" : "lazy"}
            quality={100}
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 90vw, (max-width: 1440px) 1200px, (max-width: 1920px) 1600px, 2000px"
            unoptimized={false}
          />

          {/* Preload Next Photo */}
          {photos[nextIndex]?.src && (
            <Image
              src={photos[nextIndex].src}
              alt="Next"
              fill
              className="hidden"
              quality={85}
              loading="lazy"
            />
          )}

          {/* Navigation */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="
              absolute 
              left-3 
              top-1/2 
              -translate-y-1/2 
              bg-black/70 
              hover:bg-black/90 
              backdrop-blur-sm 
              p-3 
              rounded-full 
              z-10 
              transition-all 
              hover:scale-110 
              active:scale-95
              shadow-lg
            "
          >
            <ChevronLeft className="w-8 h-8 text-white" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="
              absolute 
              right-3 
              top-1/2 
              -translate-y-1/2 
              bg-black/70 
              hover:bg-black/90 
              backdrop-blur-sm 
              p-3 
              rounded-full 
              z-10 
              transition-all 
              hover:scale-110 
              active:scale-95
              shadow-lg
            "
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>

          {/* Counter */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full z-10">
            <span className="text-white text-sm font-medium">
              {current + 1} / {photos.length}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
