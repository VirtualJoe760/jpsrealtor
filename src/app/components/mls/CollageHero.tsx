// src/app/components/mls/CollageHero.tsx
"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Maximize2, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [isHoveringMain, setIsHoveringMain] = useState(false);
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
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (modalIndex !== null) {
        if (e.key === "ArrowLeft") modalPrev();
        if (e.key === "ArrowRight") modalNext();
        if (e.key === "Escape") closeModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalIndex]);

  return (
    <>
      {/* Main Photo Section */}
      <section className="w-full max-w-7xl mx-auto px-2 sm:px-4 md:pl-6 lg:pl-8 pt-16 sm:pt-20 md:pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative w-full aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] max-h-[400px] sm:max-h-[500px] md:max-h-[600px] rounded-lg sm:rounded-2xl overflow-hidden bg-black/40 backdrop-blur-xl border border-neutral-800/50 shadow-2xl group"
          onMouseEnter={() => setIsHoveringMain(true)}
          onMouseLeave={() => setIsHoveringMain(false)}
        >
          {/* Main Image */}
          <Image
            src={current.src}
            alt={current.alt || "Main media"}
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPjxmaWx0ZXIgaWQ9J2EnPjxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249JzUnLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPSdibGFjazsnIGZpbHRlcj0ndXJsKCNhKScvPjwvc3ZnPg=="
            fill
            quality={100}
            sizes="(max-width: 1280px) 100vw, 1280px"
            priority
            unoptimized={current.src.includes('media.crmls.org')}
            className="object-cover cursor-pointer transition-transform duration-500 group-hover:scale-105"
            onClick={() => openModal(currentIndex)}
          />

          {/* Gradient Overlays for Better Button Visibility */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black/60 to-transparent" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black/60 to-transparent" />
          </div>

          {/* Navigation Buttons - Modern Glass-morphism Style */}
          <AnimatePresence>
            {isHoveringMain && (
              <>
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  onClick={handlePrev}
                  className="absolute top-1/2 left-2 sm:left-4 -translate-y-1/2 z-20 bg-black/60 backdrop-blur-md hover:bg-black/80 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-white/10 transition-all shadow-lg group/btn"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 text-white group-hover/btn:scale-110 transition-transform" strokeWidth={2.5} />
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  onClick={handleNext}
                  className="absolute top-1/2 right-2 sm:right-4 -translate-y-1/2 z-20 bg-black/60 backdrop-blur-md hover:bg-black/80 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-white/10 transition-all shadow-lg group/btn"
                  aria-label="Next"
                >
                  <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-white group-hover/btn:scale-110 transition-transform" strokeWidth={2.5} />
                </motion.button>
              </>
            )}
          </AnimatePresence>

          {/* Photo Counter & Fullscreen Button */}
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 flex items-center gap-1.5 sm:gap-2">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black/60 backdrop-blur-md px-2 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl border border-white/10 text-white text-xs sm:text-sm font-medium shadow-lg"
            >
              {currentIndex + 1} / {media.length}
            </motion.div>
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => openModal(currentIndex)}
              className="bg-black/60 backdrop-blur-md hover:bg-black/80 p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-white/10 transition-all shadow-lg group/expand"
              aria-label="View Fullscreen"
            >
              <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5 text-white group-hover/expand:scale-110 transition-transform" strokeWidth={2.5} />
            </motion.button>
          </div>
        </motion.div>

        {/* Thumbnail Carousel - Modern Glass Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative mt-4 bg-black/40 backdrop-blur-xl border border-neutral-800/50 rounded-2xl p-4 shadow-2xl"
        >
          <div className="flex items-center gap-3">
            {/* Left Scroll Button */}
            <button
              onClick={() => scrollThumbnails("left")}
              className="flex-shrink-0 bg-neutral-900/50 hover:bg-neutral-800/50 p-2 rounded-lg border border-neutral-700/30 transition-all group"
              aria-label="Scroll Left"
            >
              <ChevronLeft className="h-5 w-5 text-neutral-400 group-hover:text-white transition-colors" strokeWidth={2.5} />
            </button>

            {/* Thumbnails */}
            <div
              ref={thumbScrollRef}
              className="flex overflow-x-auto no-scrollbar gap-3 scroll-smooth flex-1"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {media.map((item, i) => (
                <motion.div
                  key={i}
                  ref={(el) => {
                    thumbRefs.current[i] = el;
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative w-24 h-20 md:w-32 md:h-24 flex-shrink-0 cursor-pointer rounded-xl overflow-hidden border-2 transition-all shadow-lg ${
                    i === currentIndex
                      ? "border-emerald-400 ring-2 ring-emerald-400/50 shadow-emerald-500/50"
                      : "border-neutral-700/50 hover:border-neutral-600"
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
                    className={`object-cover transition-all duration-300 ${
                      i === currentIndex ? "opacity-100" : "opacity-60 hover:opacity-90"
                    }`}
                  />

                  {/* Active Indicator */}
                  {i === currentIndex && (
                    <motion.div
                      layoutId="activeThumb"
                      className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent pointer-events-none"
                    />
                  )}
                </motion.div>
              ))}
            </div>

            {/* Right Scroll Button */}
            <button
              onClick={() => scrollThumbnails("right")}
              className="flex-shrink-0 bg-neutral-900/50 hover:bg-neutral-800/50 p-2 rounded-lg border border-neutral-700/30 transition-all group"
              aria-label="Scroll Right"
            >
              <ChevronRight className="h-5 w-5 text-neutral-400 group-hover:text-white transition-colors" strokeWidth={2.5} />
            </button>
          </div>
        </motion.div>
      </section>

      {/* Modal - Enhanced Fullscreen Viewer */}
      <AnimatePresence>
        {modalIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black z-[9999] flex items-center justify-center"
            onClick={(e) => {
              // Only close if clicking the backdrop, not the image
              if (e.target === e.currentTarget) {
                e.preventDefault();
              }
            }}
          >
            {/* Close Button - Top Right */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={(e) => {
                e.stopPropagation();
                closeModal();
              }}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 z-[10000] bg-white/10 backdrop-blur-md hover:bg-white/20 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-white/20 transition-all shadow-2xl group"
              aria-label="Close fullscreen view"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6 text-white group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />
            </motion.button>

            {/* Photo Counter */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 sm:top-6 z-[10000] bg-white/10 backdrop-blur-md px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl border border-white/20 text-white text-sm sm:text-lg font-medium shadow-2xl"
            >
              {modalIndex + 1} / {media.length}
            </motion.div>

            {/* Main Image Container - Full screen */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative w-full h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={media[modalIndex]?.src || "/images/no-photo.png"}
                alt={media[modalIndex]?.alt || "Full image"}
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPjxmaWx0ZXIgaWQ9J2EnPjxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249JzUnLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWxsPSdibGFjazsnIGZpbHRlcj0ndXJsKCNhKScvPjwvc3ZnPg=="
                fill
                quality={100}
                sizes="100vw"
                unoptimized={(media[modalIndex]?.src || "").includes('media.crmls.org')}
                className="object-contain p-4 sm:p-8"
              />

              {/* Navigation Buttons - Left/Right */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  modalPrev();
                }}
                className="absolute top-1/2 left-2 sm:left-6 -translate-y-1/2 z-10 bg-white/10 backdrop-blur-md hover:bg-white/20 p-2 sm:p-4 rounded-lg sm:rounded-xl border border-white/20 transition-all shadow-2xl group"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8 text-white group-hover:scale-110 transition-transform" strokeWidth={2.5} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  modalNext();
                }}
                className="absolute top-1/2 right-2 sm:right-6 -translate-y-1/2 z-10 bg-white/10 backdrop-blur-md hover:bg-white/20 p-2 sm:p-4 rounded-lg sm:rounded-xl border border-white/20 transition-all shadow-2xl group"
                aria-label="Next photo"
              >
                <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8 text-white group-hover:scale-110 transition-transform" strokeWidth={2.5} />
              </button>
            </motion.div>

            {/* Keyboard Hint */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 sm:bottom-6 z-[10000] bg-white/10 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-white/20 text-white/80 text-xs shadow-2xl"
            >
              Use arrow keys to navigate • Press <kbd className="px-1 py-0.5 bg-white/20 rounded text-white">ESC</kbd> to close
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CollageHero;
