// src/app/components/crm/ContactPropertyCarousel.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";

type PropertyImage = {
  url: string;
  source: string;
  caption: string;
  order: number;
};

type Props = {
  contactId: string;
  isLight: boolean;
};

export default function ContactPropertyCarousel({ contactId, isLight }: Props) {
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [current, setCurrent] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState<string>('none');

  useEffect(() => {
    const fetchPropertyImages = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/crm/contacts/${contactId}/property-images`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!res.ok) {
          console.error(
            `[ContactPropertyCarousel] Failed to fetch property images: ${res.status}`
          );
          setImages([]);
          setIsLoading(false);
          return;
        }

        const data = await res.json();
        if (!data.success || !Array.isArray(data.images) || data.images.length === 0) {
          console.log(`[ContactPropertyCarousel] No property images available`);
          setImages([]);
          setSource(data.source || 'none');
          setIsLoading(false);
          return;
        }

        console.log(`[ContactPropertyCarousel] Loaded ${data.images.length} images from ${data.source}`);
        setImages(data.images);
        setSource(data.source);
      } catch (err) {
        console.error("[ContactPropertyCarousel] Error fetching property images:", err);
        setImages([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPropertyImages();
  }, [contactId]);

  const next = () => setCurrent((prev) => (prev + 1) % images.length);
  const prev = () =>
    setCurrent((prev) => (prev - 1 + images.length) % images.length);

  const nextIndex = (current + 1) % images.length;

  // Source badge styling
  const getSourceBadgeColor = () => {
    switch (source) {
      case 'active':
        return 'bg-green-600 text-white';
      case 'closed':
        return 'bg-blue-600 text-white';
      case 'streetview':
        return 'bg-purple-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  return (
    <div
      className={`
        relative
        w-full
        h-full
        overflow-hidden
        ${isLight ? 'bg-gray-200' : 'bg-gray-800'}
      `}
    >
      {isLoading ? (
        <div className={`flex items-center justify-center h-full w-full ${
          isLight ? 'text-gray-600' : 'text-gray-400'
        }`}>
          <div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${
            isLight ? 'border-gray-600' : 'border-gray-400'
          }`} />
        </div>
      ) : images.length === 0 ? (
        <div className={`flex flex-col items-center justify-center h-full w-full ${
          isLight ? 'text-gray-500' : 'text-gray-400'
        }`}>
          <Home className="w-16 h-16 opacity-30 mb-2" />
          <p className="text-sm">No property images available</p>
        </div>
      ) : (
        <>
          {/* Main Photo */}
          <Image
            src={images[current]?.url || "/images/no-photo.png"}
            alt={images[current]?.caption || "Property image"}
            fill
            className="object-cover"
            priority={current === 0}
            loading={current === 0 ? "eager" : "lazy"}
            quality={90}
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 90vw, 1200px"
            unoptimized={images[current]?.url?.includes('streetview') || images[current]?.url?.startsWith('data:')}
          />

          {/* Preload Next Photo */}
          {images[nextIndex]?.url && !images[nextIndex]?.url?.includes('streetview') && (
            <Image
              src={images[nextIndex].url}
              alt="Next"
              fill
              className="hidden"
              quality={85}
              loading="lazy"
            />
          )}

          {/* Source Badge */}
          <div className="absolute top-3 right-3 z-10">
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg ${getSourceBadgeColor()}`}>
              {images[current]?.source || source}
            </span>
          </div>

          {/* Navigation - Only show if more than 1 image */}
          {images.length > 1 && (
            <>
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
                  p-2
                  rounded-full
                  z-10
                  transition-all
                  hover:scale-110
                  active:scale-95
                  shadow-lg
                "
              >
                <ChevronLeft className="w-6 h-6 text-white" />
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
                  p-2
                  rounded-full
                  z-10
                  transition-all
                  hover:scale-110
                  active:scale-95
                  shadow-lg
                "
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>

              {/* Counter */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full z-10">
                <span className="text-white text-sm font-medium">
                  {current + 1} / {images.length}
                </span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
