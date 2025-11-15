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
   🔧 TUNING
   ======================= */
const SWIPE = {
  minOffsetRatio: 0.2,
  minVelocity: 450,
  flyOutRatio: 0.98,
  flyOutDuration: 0.2, // Slightly faster for smoother transitions
  snapSpring: { stiffness: 380, damping: 32 },
  dragElastic: 0.28,
  lockScrollMaxWidth: 1024,
};

/* Distortion feel */
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
  onViewFullListing?: () => void; // Callback when user clicks "View Full Listing"
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
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Touch gesture detection
  useEffect(() => {
    const scrollElement = scrollableRef.current;
    if (!scrollElement) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      setGestureDirection(null);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      const dx = Math.abs(touch.clientX - touchStartRef.current.x);
      const dy = Math.abs(touch.clientY - touchStartRef.current.y);

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

    scrollElement.addEventListener("touchstart", handleTouchStart, { passive: true });
    scrollElement.addEventListener("touchmove", handleTouchMove, { passive: false });
    scrollElement.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      scrollElement.removeEventListener("touchstart", handleTouchStart);
      scrollElement.removeEventListener("touchmove", handleTouchMove);
      scrollElement.removeEventListener("touchend", handleTouchEnd);
    };
  }, [gestureDirection]);

  const getSwipeMessage = () => {
    const subdivision = fullListing.subdivisionName || (fullListing as any).subdivision;
    if (subdivision && subdivision.toLowerCase() !== "other") {
      return `Swiping in ${subdivision}`;
    }

    const propertyType =
      fullListing.propertyType?.replace(/([A-Z])/g, " $1").trim() || "Property";
    const city =
      fullListing.city ||
      fullListing.unparsedAddress?.split(",")[1]?.trim() ||
      listing.address?.split(",")[1]?.trim() ||
      "this area";
    return `${propertyType} in ${city}`;
  };

  const dragX = useMotionValue(0);

  const rotZ = useTransform(dragX, [-300, 0, 300], [-PIN.rotZMaxDeg, 0, PIN.rotZMaxDeg]);
  const skewY = useTransform(dragX, [-300, 0, 300], [PIN.skewYMaxDeg, 0, -PIN.skewYMaxDeg]);
  const rotX = useTransform(dragX, [-300, 0, 300], [PIN.rotXMaxDeg, 0, PIN.rotXMaxDeg]);

  const shadowAlpha = useTransform(dragX, [-300, 0, 300], [0.35 + PIN.shadowBoost, 0.35, 0.35 + PIN.shadowBoost]);
  const boxShadowMV = useTransform<number, string>(
    shadowAlpha,
    (a: number) => `0 15px 40px rgba(0,0,0,${a})`
  );

  const exitDirRef = useRef<"left" | "right" | null>(null);

  const address =
    fullListing.unparsedAddress ||
    fullListing.unparsedFirstLineAddress ||
    fullListing.address ||
    listing.address ||
    "Unknown address";

  // Lock scroll on mobile
  useEffect(() => {
    const shouldLock =
      SWIPE.lockScrollMaxWidth <= 0 ||
      (typeof window !== "undefined" &&
        window.innerWidth <= SWIPE.lockScrollMaxWidth);

    if (!shouldLock) return;

    const scrollY = window.scrollY || window.pageYOffset;
    const prev = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      overflowY: document.body.style.overflowY,
      overscrollBehavior: (document.documentElement.style as any).overscrollBehavior,
    };

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflowY = "hidden";
    (document.documentElement.style as any).overscrollBehavior = "none";

    return () => {
      document.body.style.position = prev.position;
      document.body.style.top = prev.top;
      document.body.style.left = prev.left;
      document.body.style.right = prev.right;
      document.body.style.width = prev.width;
      document.body.style.overflowY = prev.overflowY;
      (document.documentElement.style as any).overscrollBehavior = prev.overscrollBehavior;
      const y = Math.abs(parseInt(prev.top || "0", 10)) || scrollY;
      window.scrollTo(0, y);
    };
  }, []);

  // Entrance animation
  useEffect(() => {
    if (!mounted) return; // Don't animate until mounted

    // Immediate smooth entrance animation
    requestAnimationFrame(() => {
      try {
        if (!mounted) return;

        controls.set({ opacity: 0, y: 28, scale: 0.985, rotate: 0 });
        dragX.set(0);

        // Immediate animation start for fluid transitions
        requestAnimationFrame(() => {
          if (mounted) {
            controls.start({
              opacity: 1,
              y: 0,
              scale: 1,
              rotate: 0,
              transition: { duration: 0.18, ease: [0.42, 0, 0.58, 1] }, // Slightly faster
            }).catch(() => {
              // Silently catch animation errors
            });
          }
        });
      } catch (err) {
        // Silently catch if controls aren't ready
      }
    });
  }, [fullListing?.listingKey, controls, dragX, mounted]);

  const swipeOut = async (dir: "left" | "right") => {
    exitDirRef.current = dir;
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

    if (exitDirRef.current === "left") onSwipeLeft?.();
    else if (exitDirRef.current === "right") onSwipeRight?.();

    // Don't reset controls here - let entrance animation handle the transition
    dragX.set(0);
    exitDirRef.current = null;

    setTimeout(() => setSwipeMessage(null), 2000);
  };

  const handleDragStart = () => {
    dragStartTimeRef.current = Date.now();
    dragStartPosRef.current = { x: dragX.get(), y: 0 };
  };

  const handleDragEnd = (_e: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    const { offset, velocity } = info;
    const dragDuration = Date.now() - dragStartTimeRef.current;
    const dragDistance = Math.abs(offset.x);

    // Ignore very short drags (likely clicks)
    if (dragDuration < 100 && dragDistance < 5) {
      animate(dragX, 0, { type: "spring", stiffness: 380, damping: 32 });
      return;
    }

    const minOffset = Math.round((typeof window !== "undefined" ? window.innerWidth : 420) * SWIPE.minOffsetRatio);

    if (offset.x < -minOffset || velocity.x < -SWIPE.minVelocity) return swipeOut("left");
    if (offset.x > minOffset || velocity.x > SWIPE.minVelocity) return swipeOut("right");

    controls.start({
      y: 0,
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: { type: "spring", ...SWIPE.snapSpring },
    });
    animate(dragX, 0, { type: "spring", stiffness: 380, damping: 32 });
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
    willChange: "transform, opacity", // Hardware acceleration hint
  };

  if (!mounted) return null;

  const panelContent = (
    <AnimatePresence>
      {fullListing?.listingKey && (
        <motion.div
          key={listing._id || listing.listingKey || fullListing.listingKey}
          ref={panelRef}
          animate={controls}
          exit={{ opacity: 0, y: 36, transition: { duration: 0.18 } }}
          className={clsx(
            "fixed bottom-0 left-0 right-0 z-[9999] text-white rounded-t-2xl shadow-lg overflow-hidden flex flex-col",
            "transform-gpu will-change-transform pointer-events-auto",
            "max-h-[90vh] lg:max-h-[85vh]",
            lgLayoutClasses
          )}
          style={panelStyle}
          {...stopClicks}
          drag="x"
          dragElastic={SWIPE.dragElastic}
          dragMomentum={false}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Close Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close"
            className="absolute top-3 right-3 bg-black/80 hover:bg-black rounded-full p-2 z-[100] backdrop-blur-md transition-all shadow-xl border border-white/20 pointer-events-auto"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {isDisliked && dislikedTimestamp && onRemoveDislike && (
            <DislikedBadge timestamp={dislikedTimestamp} onRemove={onRemoveDislike} />
          )}

          <AnimatePresence>
            {swipeMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="absolute top-16 left-1/2 -translate-x-1/2 z-[90] px-6 py-3 bg-emerald-500/95 backdrop-blur-md rounded-full shadow-2xl"
                {...stopClicks}
              >
                <p className="text-black font-semibold text-base whitespace-nowrap">
                  {swipeMessage}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div {...stopClicks} className="flex-shrink-0">
            <PannelCarousel listingKey={fullListing.listingKey} alt={address} />
          </div>

          {/* Header */}
          <div
            className="flex-shrink-0 px-5 sm:px-6 pt-3 lg:pt-4 pb-2 lg:pb-3 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800"
            {...stopClicks}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg lg:text-2xl font-semibold mb-1 leading-tight">
                  {address}
                </p>
                <p className="text-xl lg:text-2xl font-bold text-emerald-400 leading-tight">
                  ${Number(fullListing.listPrice ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700"
                  aria-label="Share this listing"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.share?.({ title: address, url: window.location.href });
                  }}
                >
                  <Share2 className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white" />
                </button>
                <Link
                  href="/book-appointment"
                  className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700"
                  aria-label="Book an appointment"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Calendar className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white" />
                </Link>
              </div>
            </div>
          </div>

          {/* Details */}
          <div
            ref={scrollableRef}
            className="flex-1 overflow-y-auto overscroll-contain lg:overflow-visible custom-scrollbar"
            style={{
              WebkitOverflowScrolling: "touch",
              WebkitTouchCallout: "none",
            }}
            {...stopClicks}
          >
            <div className="px-5 sm:px-6 py-3 lg:py-4 space-y-3 lg:space-y-4 text-white" style={{ touchAction: "pan-y" }}>
              <div className="flex flex-wrap gap-2 text-sm lg:text-base">
                {fullListing?.subdivisionName && fullListing.subdivisionName.toLowerCase() !== "other" && (
                  <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/30">
                    {fullListing.subdivisionName}
                  </span>
                )}
                {fullListing?.bedsTotal !== undefined && (
                  <span className="bg-zinc-800 px-2 py-1 rounded-full">{fullListing.bedsTotal} Bed</span>
                )}
                {fullListing?.bathroomsTotalInteger !== undefined && (
                  <span className="bg-zinc-800 px-2 py-1 rounded-full">{fullListing.bathroomsTotalInteger} Bath</span>
                )}
                {fullListing?.livingArea !== undefined && (
                  <span className="bg-zinc-800 px-2 py-1 rounded-full">
                    {fullListing.livingArea.toLocaleString()} SqFt
                  </span>
                )}
                {fullListing?.lotSizeArea !== undefined && (
                  <span className="bg-zinc-800 px-2 py-1 rounded-full">
                    {Math.round(fullListing.lotSizeArea).toLocaleString()} Lot
                  </span>
                )}
                {fullListing?.landType && (
                  <span className="bg-zinc-800 px-2 py-1 rounded-full">{fullListing.landType}</span>
                )}

                {/* ✅ Fixed type-safe associationFee comparison */}
                {typeof fullListing?.associationFee === "number" &&
                  fullListing.associationFee > 0 && (
                    <span className="bg-zinc-800 px-2 py-1 rounded-full">
                      ${fullListing.associationFee.toLocaleString()}/mo HOA
                    </span>
                  )}

                {fullListing?.terms && fullListing.terms.length > 0 && (
                  <span className="bg-zinc-800 px-2 py-1 rounded-full">
                    {fullListing.terms.join(", ")}
                  </span>
                )}
                {fullListing?.yearBuilt && (
                  <span className="bg-zinc-800 px-2 py-1 rounded-full">
                    Built {fullListing.yearBuilt}
                  </span>
                )}
                {fullListing?.poolYn && (
                  <span className="bg-zinc-800 px-3 py-1 rounded-full">🏊 Pool</span>
                )}
                {fullListing?.spaYn && (
                  <span className="bg-zinc-800 px-3 py-1 rounded-full">🧖 Spa</span>
                )}
              </div>

              {fullListing?.publicRemarks && (
                <p className="text-xs lg:text-sm text-white line-clamp-3 lg:line-clamp-4">
                  {fullListing.publicRemarks.length > 300
                    ? `${fullListing.publicRemarks.slice(0, 200)}...`
                    : fullListing.publicRemarks}
                </p>
              )}

              <ListingAttribution listing={fullListing} />

              <div className="flex justify-center gap-6 lg:gap-8 pt-2 pb-2 lg:pb-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    swipeOut("left");
                  }}
                  className="w-14 h-14 lg:w-[72px] lg:h-[72px]"
                >
                  <Image
                    src="/images/swipe-left.png"
                    alt="Swipe Left"
                    width={72}
                    height={72}
                    sizes="(max-width: 1024px) 56px, 72px"
                    className="drop-shadow-lg hover:opacity-80 active:scale-95 transition w-full h-full"
                  />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    swipeOut("right");
                  }}
                  className="w-14 h-14 lg:w-[72px] lg:h-[72px]"
                >
                  <Image
                    src="/images/swipe-right.png"
                    alt="Swipe Right"
                    width={72}
                    height={72}
                    sizes="(max-width: 1024px) 56px, 72px"
                    className="drop-shadow-lg hover:opacity-80 active:scale-95 transition w-full h-full"
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex-shrink-0 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent px-5 sm:px-6 py-3 lg:py-4 border-t border-zinc-800"
            style={{ paddingBottom: `max(1rem, env(safe-area-inset-bottom, 0px))` }}
            {...stopClicks}
          >
            <Link
              href={`/mls-listings/${fullListing.slugAddress || fullListing.slug || ""}`}
              className="block text-center bg-emerald-500 text-black font-bold py-2.5 lg:py-3 px-4 rounded-lg hover:bg-emerald-400 active:bg-emerald-600 transition-colors duration-200 text-base lg:text-lg shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                // Flush pending swipes before navigating
                onViewFullListing?.();
              }}
              role="button"
              aria-label={`View full listing for ${address}`}
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
