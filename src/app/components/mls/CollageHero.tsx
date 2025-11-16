// src/app/components/mls/CollageHero.tsx
"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

export type MediaItem = {
  type: "photo" | "video";
  src: string;
  alt?: string;
};

interface CollageHeroProps {
  media: MediaItem[];
}

const CollageHero: React.FC<CollageHeroProps> = ({ media }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const thumbScrollRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLDivElement | null)[]>([]);

  const current = media?.[currentIndex] ?? {
    type: "photo",
    src: "/images/no-photo.png",
    alt: "Main image not available",
  };

  useEffect(() => {
    const el = thumbRefs.current[currentIndex];
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [currentIndex]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % media.length);
  };

  const openModal = (index: number) => setModalIndex(index);
  const closeModal = () => setModalIndex(null);
  const modalPrev = () =>
    setModalIndex((prev) => (prev! - 1 + media.length) % media.length);
  const modalNext = () => setModalIndex((prev) => (prev! + 1) % media.length);

  const scrollThumbnails = (direction: "left" | "right") => {
    const el = thumbScrollRef.current;
    if (el) {
      el.scrollBy({
        left: direction === "left" ? -200 : 200,
        behavior: "smooth",
      });
    }
  };

  return (
    <>
      <section className="w-full flex flex-col items-center">
        <div className="relative w-full xl:max-w-6xl aspect-[4/3] md:aspect-[5/3] lg:aspect-[3/2] max-h-[700px] rounded-xl overflow-hidden">
          <Image
            src={current.src}
            alt={current.alt || "Main media"}
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPjxmaWx0ZXIgaWQ9J2EnPjxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249JzUnLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPSdibGFjazsnIGZpbHRlcj0ndXJsKCNhKScvPjwvc3ZnPg=="
            fill
            quality={95}
            sizes="(max-width: 1280px) 100vw, 1280px"
            priority
            className="object-cover cursor-pointer z-0"
            onClick={() => openModal(currentIndex)}
          />

          <button
            onClick={handlePrev}
            className="absolute top-1/2 left-4 -translate-y-1/2 text-white z-20 bg-black/30 hover:bg-black/50 p-2 rounded"
            aria-label="Previous"
          >
            <ChevronLeftIcon className="h-8 w-8" />
          </button>
          <button
            onClick={handleNext}
            className="absolute top-1/2 right-4 -translate-y-1/2 text-white z-20 bg-black/30 hover:bg-black/50 p-2 rounded"
            aria-label="Next"
          >
            <ChevronRightIcon className="h-8 w-8" />
          </button>
        </div>

        {/* Thumbnail carousel */}
        <div className="relative mt-2 w-full xl:max-w-6xl overflow-hidden">
          <button
            onClick={() => scrollThumbnails("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/30 hover:bg-black/50 p-1 rounded"
            aria-label="Scroll Left"
          >
            <ChevronLeftIcon className="h-6 w-6 text-white" />
          </button>

          <div
            ref={thumbScrollRef}
            className="flex overflow-x-auto no-scrollbar gap-2 py-2 px-6 scroll-smooth"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {media.map((item, i) => (
              <div
                key={i}
                ref={(el) => {
                  thumbRefs.current[i] = el;
                }}
                className={`relative w-32 h-24 flex-shrink-0 cursor-pointer rounded overflow-hidden border-2 ${
                  i === currentIndex ? "border-blue-500" : "border-transparent"
                }`}
                onClick={() => setCurrentIndex(i)}
              >
                <Image
                  src={item.src}
                  alt={item.alt || `Thumb ${i}`}
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPjxmaWx0ZXIgaWQ9J2EnPjxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249JzUnLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPSdibGFjazsnIGZpbHRlcj0ndXJsKCNhKScvPjwvc3ZnPg=="
                  fill
                  quality={85}
                  sizes="128px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => scrollThumbnails("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/30 hover:bg-black/50 p-1 rounded"
            aria-label="Scroll Right"
          >
            <ChevronRightIcon className="h-6 w-6 text-white" />
          </button>
        </div>
      </section>

      {/* Modal */}
      {modalIndex !== null && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
          onClick={closeModal}
        >
          <div
            className="relative w-[90vw] h-[90vh] max-w-6xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={media[modalIndex]?.src || "/images/no-photo.png"}
              alt={media[modalIndex]?.alt || "Full image"}
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPjxmaWx0ZXIgaWQ9J2EnPjxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249JzUnLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPSdibGFjazsnIGZpbHRlcj0ndXJsKCNhKScvPjwvc3ZnPg=="
              fill
              quality={100}
              sizes="90vw"
              className="object-contain"
            />
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-white z-10"
            >
              <XMarkIcon className="h-8 w-8" />
            </button>
            <button
              onClick={modalPrev}
              className="absolute top-1/2 left-4 -translate-y-1/2 text-white z-10"
            >
              <ChevronLeftIcon className="h-10 w-10" />
            </button>
            <button
              onClick={modalNext}
              className="absolute top-1/2 right-4 -translate-y-1/2 text-white z-10"
            >
              <ChevronRightIcon className="h-10 w-10" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CollageHero;
