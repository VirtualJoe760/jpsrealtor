// src/app/components/mls/map/ListingBottomPanel.tsx
"use client";

import { useRef, useEffect } from "react";
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

/* =======================
   🔧 TUNING
   ======================= */
const SWIPE = {
  minOffsetRatio: 0.3,
  minVelocity: 650,
  flyOutRatio: 0.98,
  flyOutDuration: 0.22,
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
  isSidebarOpen: boolean;
  isFiltersOpen: boolean;
};

export default function ListingBottomPanel({
  listing,
  fullListing,
  onClose,
  onSwipeLeft,
  onSwipeRight,
  isSidebarOpen,
  isFiltersOpen,
}: Props) {
  const controls = useAnimationControls();
  const panelRef = useRef<HTMLDivElement>(null);

  // Horizontal MotionValue
  const dragX = useMotionValue(0);

  // Derived transforms
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

  /* 🚫 BODY SCROLL LOCK (mobile) */
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
      overscrollBehavior: (document.documentElement.style as any)
        .overscrollBehavior,
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
      (document.documentElement.style as any).overscrollBehavior =
        prev.overscrollBehavior;
      const y = Math.abs(parseInt(prev.top || "0", 10)) || scrollY;
      window.scrollTo(0, y);
    };
  }, []);

  // Entrance
  useEffect(() => {
    controls.set({ opacity: 0, y: 28, scale: 0.985, rotate: 0 });
    dragX.set(0);

    const id = requestAnimationFrame(() => {
      controls.start({
        opacity: 1,
        y: 0,
        scale: 1,
        rotate: 0,
        transition: { duration: 0.2, ease: [0.42, 0, 0.58, 1] },
      });
    });

    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullListing?.listingKey]);

  // Swipe-out
  const swipeOut = async (dir: "left" | "right") => {
    exitDirRef.current = dir;
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

    controls.set({ opacity: 1, y: 0, scale: 1, rotate: 0 });
    dragX.set(0);
    exitDirRef.current = null;
  };

  // Drag thresholds
  const handleDragEnd = (
    _e: any,
    info: { offset: { x: number; y: number }; velocity: { x: number } }
  ) => {
    const { offset, velocity } = info;
    const minOffset = Math.round(
      (typeof window !== "undefined" ? window.innerWidth : 420) *
        SWIPE.minOffsetRatio
    );

    if (offset.x < -minOffset || velocity.x < -SWIPE.minVelocity)
      return swipeOut("left");
    if (offset.x > minOffset || velocity.x > SWIPE.minVelocity)
      return swipeOut("right");

    // Snap back
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
  };

  return (
    <AnimatePresence>
      {fullListing?.listingKey && (
        <motion.div
          key={listing._id || listing.listingKey || fullListing.listingKey}
          ref={panelRef}
          animate={controls}
          exit={{ opacity: 0, y: 36, transition: { duration: 0.18 } }}
          className={clsx(
            "fixed bottom-0 left-0 right-0 z-50 text-white rounded-t-2xl shadow-lg overflow-hidden",
            "transform-gpu will-change-transform pointer-events-auto",
            lgLayoutClasses
          )}
          style={panelStyle}
          {...stopClicks}
          drag="x" // ✅ draggable everywhere
          dragElastic={SWIPE.dragElastic}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
        >
          {/* Content */}
          <div {...stopClicks}>
            <PannelCarousel listingKey={fullListing.listingKey} alt={address} />
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close"
            className="absolute top-2 right-2 bg-black/60 rounded-full p-1 z-10"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div
            className="flex flex-col max-h:[85vh] max-h-[85vh]"
            style={{ WebkitOverflowScrolling: "touch" }}
            {...stopClicks}
          >
            <div
              className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3 text-white overflow-y-auto flex-1 overscroll-contain"
              style={{ touchAction: "pan-y" }}
            >
              <div className="flex items-start justify-between pt-4">
                <div>
                  <p className="text-2xl font-semibold mb-1 leading-tight">
                    {address}
                  </p>
                  <p className="text-2xl font-bold text-emerald-400 leading-tight">
                    ${Number(fullListing.listPrice ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700"
                    aria-label="Share this listing"
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
                    className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700"
                    aria-label="Book an appointment"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Calendar className="w-4 h-4 text-white" />
                  </Link>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-base sm:text-lg mt-2">
                {fullListing?.bedsTotal !== undefined && (
                  <span className="bg-zinc-800 px-2 py-1 rounded-full">
                    {fullListing.bedsTotal} Bed
                  </span>
                )}
                {fullListing?.bathroomsTotalInteger !== undefined && (
                  <span className="bg-zinc-800 px-2 py-1 rounded-full">
                    {fullListing.bathroomsTotalInteger} Bath
                  </span>
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
                {fullListing?.yearBuilt && (
                  <span className="bg-zinc-800 px-2 py-1 rounded-full">
                    Built {fullListing.yearBuilt}
                  </span>
                )}
                {fullListing?.poolYn && (
                  <span className="bg-zinc-800 px-3 py-1 rounded-full">
                    🏊 Pool
                  </span>
                )}
                {fullListing?.spaYn && (
                  <span className="bg-zinc-800 px-3 py-1 rounded-full">
                    🧖 Spa
                  </span>
                )}
              </div>

              {fullListing?.publicRemarks && (
                <p className="text-sm text-white mt-2 line-clamp-5">
                  {fullListing.publicRemarks.length > 300
                    ? `${fullListing.publicRemarks.slice(0, 200)}...`
                    : fullListing.publicRemarks}
                </p>
              )}

              <ListingAttribution listing={fullListing} className="mt-2" />

              <div className="flex justify-center gap-8 mt-6">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    swipeOut("left");
                  }}
                >
                  <Image
                    src="/images/swipe-left.png"
                    alt="Swipe Left"
                    width={64}
                    height={64}
                    sizes="(max-width: 768px) 64px, 64px"
                    className="drop-shadow-lg hover:opacity-80 active:scale-95 transition"
                  />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    swipeOut("right");
                  }}
                >
                  <Image
                    src="/images/swipe-right.png"
                    alt="Swipe Right"
                    width={64}
                    height={64}
                    sizes="(max-width: 768px) 64px, 64px"
                    className="drop-shadow-lg hover:opacity-80 active:scale-95 transition"
                  />
                </button>
              </div>
            </div>

            <div className="sticky bottom-0 bg-zinc-950/80 px-4 sm:px-5 pb-4 sm:pb-5">
              <Link
                href={`/mls-listings/${
                  fullListing.slugAddress || fullListing.slug || ""
                }`}
                className="block text-center bg-emerald-500 text-black font-semibold py-2 rounded-md hover:bg-emerald-400 transition"
                onClick={(e) => e.stopPropagation()}
              >
                View Full Listing
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
