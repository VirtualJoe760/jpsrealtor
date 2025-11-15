// src/app/components/mls/map/ListingBottomPanel.tsx
"use client";

import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Share2, Calendar } from "lucide-react";
import {
  motion,
  useAnimationControls,
  useMotionValue,
  useTransform,
  AnimatePresence,
  animate,
} from "framer-motion";
import type { MapListing } from "@/types/types";
import Link from "next/link";
import type { IListing } from "@/models/listings";
import clsx from "clsx";
import PannelCarousel from "./PannelCarousel";
import Image from "next/image";
import ListingAttribution from "@/app/components/mls/ListingAttribution";
import DislikedBadge from "./DislikedBadge";

/* =======================
   🔧 SWIPE TUNING
======================= */
const SWIPE = {
  minOffsetRatio: 0.2,
  minVelocity: 450,
  flyOutRatio: 0.98,
  flyOutDuration: 0.2,
  snapSpring: { stiffness: 380, damping: 32 },
  dragElastic: 0.28,
  lockScrollMaxWidth: 1024,
};

/* Distortion animation feel */
const PIN = {
  originYpx: 14,
  rotZMaxDeg: 8,
  skewYMaxDeg: 10,
  rotXMaxDeg: 6,
  shadowBoost: 0.25,
};

type Props = {
  listing: MapListing;
  fullListing: IListing;
  onClose: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onViewFullListing?: () => void;
  isSidebarOpen: boolean;
  isFiltersOpen: boolean;
  isDisliked?: boolean;
  dislikedTimestamp?: number | null;
  onRemoveDislike?: () => void;
};

export default function ListingBottomPanel({
  listing,
  fullListing,
  onClose,
  onSwipeLeft,
  onSwipeRight,
  onViewFullListing,
  isSidebarOpen,
  isFiltersOpen,
  isDisliked = false,
  dislikedTimestamp = null,
  onRemoveDislike,
}: Props) {
  const controls = useAnimationControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [swipeMessage, setSwipeMessage] = useState<string | null>(null);
  const scrollableRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [gestureDirection, setGestureDirection] = useState<
    "horizontal" | "vertical" | null
  >(null);
  const dragStartTimeRef = useRef<number>(0);
  const dragX = useMotionValue(0);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  /* ========================
       TOUCH SCROLL HANDLER
  ======================== */
  useEffect(() => {
    const scrollElement = scrollableRef.current;
    if (!scrollElement) return;

    const handleTouchStart = (e: TouchEvent) => {
      const t = e.touches?.[0];
      if (!t) return;

      touchStartRef.current = { x: t.clientX, y: t.clientY };
      setGestureDirection(null);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches?.[0];
      if (!t || !touchStartRef.current) return;

      const dx = Math.abs(t.clientX - touchStartRef.current.x);
      const dy = Math.abs(t.clientY - touchStartRef.current.y);

      if (dx > 10 || dy > 10) {
        if (gestureDirection === null) {
          if (dx > dy * 1.5) {
            setGestureDirection("horizontal");
            e.preventDefault();
          } else if (dy > dx * 1.5) {
            setGestureDirection("vertical");
          }
        } else if (gestureDirection === "horizontal") {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      touchStartRef.current = null;
      setGestureDirection(null);
    };

    scrollElement.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    scrollElement.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    scrollElement.addEventListener("touchend", handleTouchEnd, {
      passive: true,
    });

    return () => {
      scrollElement.removeEventListener("touchstart", handleTouchStart);
      scrollElement.removeEventListener("touchmove", handleTouchMove);
      scrollElement.removeEventListener("touchend", handleTouchEnd);
    };
  }, [gestureDirection]);

  const getSwipeMessage = () => {
    const subdivision = fullListing.subdivisionName;
    if (subdivision && subdivision.toLowerCase() !== "other") {
      return `Swiping in ${subdivision}`;
    }
    return "";
  };

  const rotZ = useTransform(
    dragX,
    [-300, 0, 300],
    [-PIN.rotZMaxDeg, 0, PIN.rotZMaxDeg]
  );
  const skewY = useTransform(
    dragX,
    [-300, 0, 300],
    [PIN.skewYMaxDeg, 0, -PIN.skewYMaxDeg]
  );
  const rotX = useTransform(
    dragX,
    [-300, 0, 300],
    [PIN.rotXMaxDeg, 0, PIN.rotXMaxDeg]
  );

  const shadowAlpha = useTransform(
    dragX,
    [-300, 0, 300],
    [0.35 + PIN.shadowBoost, 0.35, 0.35 + PIN.shadowBoost]
  );

  const boxShadowMV = useTransform(shadowAlpha, (a) => {
    return `0 15px 40px rgba(0,0,0,${a})`;
  });

  const address =
    fullListing.unparsedAddress ||
    fullListing.unparsedFirstLineAddress ||
    fullListing.address ||
    listing.address ||
    "Unknown address";

  /* ======================
        ENTRANCE ANIMATION
  ====================== */
  useEffect(() => {
    if (!mounted) return;

    // Reset instantly
    controls.set({ opacity: 0, y: 28, scale: 0.985 });
    dragX.set(0);

    // Wait for next event loop to guarantee mount
    const timer = setTimeout(() => {
      if (!mounted || !panelRef.current) return;

      controls
        .start({
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: 0.18, ease: [0.42, 0, 0.58, 1] },
        })
        .catch(() => {});
    }, 0);

    return () => clearTimeout(timer);
  }, [mounted, fullListing.listingKey]);

  /* ======================
         SWIPE LOGIC
  ====================== */

  const swipeOut = async (dir: "left" | "right") => {
    setSwipeMessage(getSwipeMessage());

    const W = typeof window !== "undefined" ? window.innerWidth : 420;
    const fly = Math.round(W * SWIPE.flyOutRatio);

    const animX = animate(dragX, dir === "left" ? -fly : fly, {
      duration: SWIPE.flyOutDuration,
      ease: [0.42, 0, 0.58, 1],
    });

    const animOther = controls.start({
      y: -60,
      opacity: 0,
      scale: 0.985,
      rotate: dir === "left" ? -3 : 3,
      transition: { duration: SWIPE.flyOutDuration, ease: [0.42, 0, 0.58, 1] },
    });

    await Promise.all([animOther, animX.finished]);

    dir === "left" ? onSwipeLeft?.() : onSwipeRight?.();

    dragX.set(0);
    setTimeout(() => setSwipeMessage(null), 2000);
  };

  const handleDragStart = () => {
    dragStartTimeRef.current = Date.now();
  };

  const handleDragEnd = (
    _e: any,
    info: { offset: { x: number }; velocity: { x: number } }
  ) => {
    const { offset, velocity } = info;

    const minOffset = Math.round(
      (window.innerWidth || 420) * SWIPE.minOffsetRatio
    );

    if (offset.x < -minOffset || velocity.x < -SWIPE.minVelocity)
      return swipeOut("left");
    if (offset.x > minOffset || velocity.x > SWIPE.minVelocity)
      return swipeOut("right");

    controls.start({
      y: 0,
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: { type: "spring", ...SWIPE.snapSpring },
    });

    animate(dragX, 0, {
      type: "spring",
      stiffness: 380,
      damping: 32,
    });
  };

  const lgLayoutClasses = clsx({
    "lg:left-[25%] lg:right-[15%]": isFiltersOpen,
    "lg:left-[15%] lg:right-[25%]": isSidebarOpen && !isFiltersOpen,
    "lg:left-[15%] lg:right-[15%]": !isSidebarOpen && !isFiltersOpen,
  });

  const stopClicks = { onClick: (e: any) => e.stopPropagation() };

  const panelStyle: any = {
    transformOrigin: `50% ${PIN.originYpx}px`,
    perspective: 1000,
    rotateZ: rotZ,
    rotateX: rotX,
    skewY: skewY,
    boxShadow: boxShadowMV,
    background: "rgba(24,24,24,0.85)",
    backdropFilter: "blur(8px)",
    x: dragX,
  };

  if (!mounted) return null;

  const panelContent = (
    <AnimatePresence>
      {fullListing?.listingKey && (
        <motion.div
          key={listing._id || fullListing.listingKey}
          ref={panelRef}
          animate={controls}
          exit={{ opacity: 0, y: 36, transition: { duration: 0.18 } }}
          className={clsx(
            "fixed bottom-0 left-0 right-0 z-[9999] text-white rounded-t-2xl shadow-lg overflow-hidden flex flex-col",
            "transform-gpu pointer-events-auto",
            "max-h-[90vh] md:max-h-[48vh] lg:max-h-[85vh]",
            lgLayoutClasses
          )}
          style={panelStyle}
          drag="x"
          dragElastic={SWIPE.dragElastic}
          dragMomentum={false}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          {...stopClicks}
        >
          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-3 right-3 bg-black/80 hover:bg-black rounded-full p-2 z-[100] border border-white/20"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Disliked Badge */}
          {isDisliked && dislikedTimestamp && onRemoveDislike && (
            <DislikedBadge
              timestamp={dislikedTimestamp}
              onRemove={onRemoveDislike}
            />
          )}

          {/* Swipe message */}
          <AnimatePresence>
            {swipeMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="absolute top-16 left-1/2 -translate-x-1/2 z-[90] px-6 py-3 bg-emerald-500/95 rounded-full shadow-2xl"
              >
                <p className="text-black font-semibold text-base whitespace-nowrap">
                  {swipeMessage}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PHOTO CAROUSEL */}
          <div {...stopClicks} className="flex-shrink-0">
            <PannelCarousel listingKey={fullListing.listingKey} alt={address} />
          </div>

          {/* HEADER */}
          <div className="flex-shrink-0 px-5 sm:px-6 md:px-3 pt-3 pb-2 bg-zinc-900/95 border-b border-zinc-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg md:text-sm lg:text-2xl font-semibold leading-tight">
                  {address}
                </p>
                <p className="text-xl md:text-base lg:text-2xl font-bold text-emerald-400 leading-tight">
                  ${Number(fullListing.listPrice ?? 0).toLocaleString()}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  className="w-8 h-8 lg:w-9 lg:h-9 bg-zinc-800 rounded-full flex items-center justify-center hover:bg-zinc-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.share?.({
                      title: address,
                      url: window.location.href,
                    });
                  }}
                >
                  <Share2 className="w-4 h-4 text-white" />
                </button>

                <Link
                  href="/book-appointment"
                  className="w-8 h-8 lg:w-9 lg:h-9 bg-zinc-800 rounded-full flex items-center justify-center hover:bg-zinc-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Calendar className="w-4 h-4 text-white" />
                </Link>
              </div>
            </div>
          </div>

          {/* CONTENT */}
          <div
            ref={scrollableRef}
            className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-5 py-3 md:py-1 lg:py-4"
            {...stopClicks}
          >
            <div className="text-white space-y-3">
              {/* BADGES */}
              <div className="flex flex-wrap gap-2 text-sm lg:text-base">
                {fullListing.subdivisionName && (
                  <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/30">
                    {fullListing.subdivisionName}
                  </span>
                )}

                {typeof fullListing.bedsTotal === "number" && (
                  <span className="bg-zinc-800 px-2 py-1 rounded-full">
                    {fullListing.bedsTotal} Bed
                  </span>
                )}

                {typeof fullListing.bathroomsTotalInteger === "number" && (
                  <span className="bg-zinc-800 px-2 py-1 rounded-full">
                    {fullListing.bathroomsTotalInteger} Bath
                  </span>
                )}

                {typeof fullListing.livingArea === "number" && (
                  <span className="bg-zinc-800 px-2 py-1 rounded-full">
                    {fullListing.livingArea.toLocaleString()} SqFt
                  </span>
                )}

                {typeof fullListing.lotSizeArea === "number" && (
                  <span className="bg-zinc-800 px-2 py-1 rounded-full">
                    {Math.round(fullListing.lotSizeArea).toLocaleString()} Lot
                  </span>
                )}

                {fullListing.landType && (
                  <span className="bg-zinc-800 px-2 py-1 rounded-full">
                    {fullListing.landType}
                  </span>
                )}

                {typeof fullListing.associationFee === "number" &&
                  fullListing.associationFee > 0 && (
                    <span className="bg-zinc-800 px-2 py-1 rounded-full">
                      ${fullListing.associationFee.toLocaleString()}/mo HOA
                    </span>
                  )}

                {typeof fullListing.yearBuilt === "number" && (
                  <span className="bg-zinc-800 px-2 py-1 rounded-full">
                    Built {fullListing.yearBuilt}
                  </span>
                )}

                {fullListing.poolYn && (
                  <span className="bg-zinc-800 px-3 py-1 rounded-full">
                    🏊 Pool
                  </span>
                )}

                {fullListing.spaYn && (
                  <span className="bg-zinc-800 px-3 py-1 rounded-full">
                    🧖 Spa
                  </span>
                )}
              </div>

              {fullListing.publicRemarks && (
                <p className="text-xs lg:text-sm text-white line-clamp-4">
                  {fullListing.publicRemarks}
                </p>
              )}

              <ListingAttribution listing={fullListing} />
            </div>

            {/* Swipe buttons */}
            <div className="flex justify-center gap-6 lg:gap-8 pt-4 pb-2">
              <button
                onClick={() => swipeOut("left")}
                className="w-14 h-14 lg:w-20 lg:h-20"
              >
                <Image
                  src="/images/swipe-left.png"
                  alt="Swipe Left"
                  fill={false}
                  width={72}
                  height={72}
                  className="drop-shadow-lg hover:opacity-80 active:scale-95"
                />
              </button>

              <button
                onClick={() => swipeOut("right")}
                className="w-14 h-14 lg:w-20 lg:h-20"
              >
                <Image
                  src="/images/swipe-right.png"
                  alt="Swipe Right"
                  fill={false}
                  width={72}
                  height={72}
                  className="drop-shadow-lg hover:opacity-80 active:scale-95"
                />
              </button>
            </div>
          </div>

          {/* Footer CTA */}
          <div
            className="bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent px-5 py-3 border-t border-zinc-800"
            style={{
              paddingBottom: `max(1rem, env(safe-area-inset-bottom, 0px))`,
            }}
          >
            <Link
              href={`/mls-listings/${
                fullListing.slugAddress || fullListing.slug || ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onViewFullListing?.();
              }}
              className="block text-center bg-emerald-500 text-black font-bold py-3 rounded-lg hover:bg-emerald-400 active:bg-emerald-600 text-lg shadow-lg"
            >
              View Full Listing
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(panelContent, document.body);
}
