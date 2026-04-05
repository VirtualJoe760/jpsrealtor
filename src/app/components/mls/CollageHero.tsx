// src/app/components/mls/CollageHero.tsx
"use client";

import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Maximize2, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/app/contexts/ThemeContext";

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
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

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

  const openModal = (index: number) => {
    setModalIndex(index);
    // Allow landscape rotation for fullscreen carousel
    document.body.classList.add("carousel-open");
    try { screen.orientation?.unlock?.(); } catch {}
  };

  const closeModal = () => {
    setModalIndex(null);
    // Re-enable landscape blocker
    document.body.classList.remove("carousel-open");
    try { (screen.orientation as any)?.lock?.("portrait-primary")?.catch?.(() => {}); } catch {}
  };
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
      <section className="w-full px-0 md:max-w-7xl md:mx-auto md:px-4 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`relative w-full h-[38vh] md:aspect-[16/9] md:h-auto md:max-h-[600px] md:rounded-2xl overflow-hidden backdrop-blur-xl md:border shadow-2xl group ${
            isLight
              ? "bg-gray-100 md:border-gray-200"
              : "bg-black/40 md:border-neutral-800/50"
          }`}
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

          {/* Gradient Overlays for Better Button Visibility - Only in dark mode */}
          {!isLight && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black/60 to-transparent" />
              <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black/60 to-transparent" />
            </div>
          )}

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
                  className={`absolute top-1/2 left-4 -translate-y-1/2 z-20 backdrop-blur-md p-3 rounded-xl border transition-all shadow-lg group/btn ${
                    isLight
                      ? "bg-blue-600 hover:bg-blue-700 border-blue-700 text-white"
                      : "bg-black/60 hover:bg-black/80 border-white/10 text-white"
                  }`}
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-6 w-6 group-hover/btn:scale-110 transition-transform" strokeWidth={2.5} />
                </motion.button>

                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  onClick={handleNext}
                  className={`absolute top-1/2 right-4 -translate-y-1/2 z-20 backdrop-blur-md p-3 rounded-xl border transition-all shadow-lg group/btn ${
                    isLight
                      ? "bg-blue-600 hover:bg-blue-700 border-blue-700 text-white"
                      : "bg-black/60 hover:bg-black/80 border-white/10 text-white"
                  }`}
                  aria-label="Next"
                >
                  <ChevronRight className="h-6 w-6 group-hover/btn:scale-110 transition-transform" strokeWidth={2.5} />
                </motion.button>
              </>
            )}
          </AnimatePresence>

          {/* Photo Counter & Fullscreen Button */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`backdrop-blur-md px-4 py-2 rounded-xl border text-sm font-medium shadow-lg ${
                isLight
                  ? "bg-white/95 border-gray-200 text-gray-900"
                  : "bg-black/60 border-white/10 text-white"
              }`}
            >
              {currentIndex + 1} / {media.length}
            </motion.div>
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => openModal(currentIndex)}
              className={`backdrop-blur-md p-2 rounded-xl border transition-all shadow-lg group/expand ${
                isLight
                  ? "bg-white/95 hover:bg-white border-gray-200 text-gray-900"
                  : "bg-black/60 hover:bg-black/80 border-white/10 text-white"
              }`}
              aria-label="View Fullscreen"
            >
              <Maximize2 className={`h-5 w-5 group-hover/expand:scale-110 transition-transform ${
                isLight ? "text-gray-900" : "text-white"
              }`} strokeWidth={2.5} />
            </motion.button>
          </div>
        </motion.div>

      </section>

      {/* Modal - Enhanced Fullscreen Viewer (portaled to body to escape stacking context) */}
      {typeof document !== "undefined" && createPortal(
      <AnimatePresence>
        {modalIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[9999] flex items-center justify-center"
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
      </AnimatePresence>,
      document.body
      )}
    </>
  );
};

export default CollageHero;
