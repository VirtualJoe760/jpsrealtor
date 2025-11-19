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
      <section className="w-full max-w-7xl mx-auto px-4 pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative w-full aspect-[16/9] md:aspect-[21/9] max-h-[600px] rounded-2xl overflow-hidden bg-black/40 backdrop-blur-xl border border-neutral-800/50 shadow-2xl group"
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
                  className="absolute top-1/2 left-4 -translate-y-1/2 z-20 bg-black/60 backdrop-blur-md hover:bg-black/80 p-3 rounded-xl border border-white/10 transition-all shadow-lg group/btn"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-6 w-6 text-white group-hover/btn:scale-110 transition-transform" strokeWidth={2.5} />
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  onClick={handleNext}
                  className="absolute top-1/2 right-4 -translate-y-1/2 z-20 bg-black/60 backdrop-blur-md hover:bg-black/80 p-3 rounded-xl border border-white/10 transition-all shadow-lg group/btn"
                  aria-label="Next"
                >
                  <ChevronRight className="h-6 w-6 text-white group-hover/btn:scale-110 transition-transform" strokeWidth={2.5} />
                </motion.button>
              </>
            )}
          </AnimatePresence>

          {/* Photo Counter & Fullscreen Button */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white text-sm font-medium shadow-lg"
            >
              {currentIndex + 1} / {media.length}
            </motion.div>
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => openModal(currentIndex)}
              className="bg-black/60 backdrop-blur-md hover:bg-black/80 p-2 rounded-xl border border-white/10 transition-all shadow-lg group/expand"
              aria-label="View Fullscreen"
            >
              <Maximize2 className="h-5 w-5 text-white group-hover/expand:scale-110 transition-transform" strokeWidth={2.5} />
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
            className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center"
            onClick={closeModal}
          >
            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={closeModal}
              className="absolute top-6 right-6 z-50 bg-black/60 backdrop-blur-md hover:bg-black/80 p-3 rounded-xl border border-white/10 transition-all shadow-lg group"
            >
              <X className="h-6 w-6 text-white group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />
            </motion.button>

            {/* Photo Counter */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-black/60 backdrop-blur-md px-6 py-3 rounded-xl border border-white/10 text-white text-lg font-medium shadow-lg"
            >
              {modalIndex + 1} / {media.length}
            </motion.div>

            {/* Main Image Container */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative w-[90vw] h-[90vh] max-w-7xl"
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
                unoptimized={(media[modalIndex]?.src || "").includes('media.crmls.org')}
                className="object-contain"
              />

              {/* Navigation Buttons */}
              <button
                onClick={modalPrev}
                className="absolute top-1/2 left-6 -translate-y-1/2 z-10 bg-black/60 backdrop-blur-md hover:bg-black/80 p-4 rounded-xl border border-white/10 transition-all shadow-lg group"
              >
                <ChevronLeft className="h-8 w-8 text-white group-hover:scale-110 transition-transform" strokeWidth={2.5} />
              </button>

              <button
                onClick={modalNext}
                className="absolute top-1/2 right-6 -translate-y-1/2 z-10 bg-black/60 backdrop-blur-md hover:bg-black/80 p-4 rounded-xl border border-white/10 transition-all shadow-lg group"
              >
                <ChevronRight className="h-8 w-8 text-white group-hover:scale-110 transition-transform" strokeWidth={2.5} />
              </button>
            </motion.div>

            {/* Keyboard Hint */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black/40 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 text-neutral-400 text-xs"
            >
              Use arrow keys to navigate • Press ESC to close
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CollageHero;
