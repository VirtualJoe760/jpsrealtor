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

  useEffect(() => {
    const fetchPhotosFromRoute = async () => {
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
          return;
        }

        const data = await res.json();
        console.log("✅ Photos fetched:", data.photos?.length);

        if (!Array.isArray(data.photos)) {
          console.warn("⚠️ Unexpected photos format:", data);
          setPhotos([]);
          return;
        }

        setPhotos(data.photos);
      } catch (err) {
        console.error("❌ Error fetching photos from API route:", err);
        setPhotos([]);
      }
    };

    fetchPhotosFromRoute();
  }, [listingKey]);

  const next = () => setCurrent((prev) => (prev + 1) % photos.length);
  const prev = () =>
    setCurrent((prev) => (prev - 1 + photos.length) % photos.length);

  if (!photos.length) {
    return (
      <div className="relative w-full aspect-[16/9] bg-zinc-800 flex items-center justify-center text-white">
        No photos available
      </div>
    );
  }

  const nextIndex = (current + 1) % photos.length;

  return (
    <div className="relative w-full aspect-[16/9] rounded-t-2xl overflow-hidden">
      {/* Visible Photo */}
      <div className="absolute inset-0">
        <Image
          src={photos[current]?.src || "/images/no-photo.png"}
          alt={alt}
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Preload Next Photo */}
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

      {/* Nav Buttons */}
      <button
        onClick={prev}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-2 rounded-full z-10"
        aria-label="Previous photo"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>
      <button
        onClick={next}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 p-2 rounded-full z-10"
        aria-label="Next photo"
      >
        <ChevronRight className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}
