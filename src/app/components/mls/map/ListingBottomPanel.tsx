// src/app/components/mls/map/ListingBottomPanel.tsx
// @ts-nocheck
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
import type { IListing } from "@/models/listings";
import Link from "next/link";
import Image from "next/image";
import PannelCarousel from "./PannelCarousel";
import ListingAttribution from "@/app/components/mls/ListingAttribution";
import DislikedBadge from "./DislikedBadge";

/* ======================================================
   FIXED PANEL LAYOUT CONSTANTS
====================================================== */

const MOBILE_BREAKPOINT = 640;

// The listing panel's optimal width - this is the centerpiece
const OPTIMAL_PANEL_WIDTH = {
  sm: 500,   // Small tablets (768px-1023px)
  md: 550,   // Medium tablets (1024px-1279px)
  lg: 600,   // Laptops/MacBook (1280px-1535px) - typical MacBook Air/Pro 13"
  xl: 700,   // Larger laptops (1536px-1919px) - MacBook Pro 14"/16"
  "2xl": 900, // Large desktop (1920px+)
};

function getOptimalPanelWidth() {
  const w = window.innerWidth;
  if (w < 640) return w; // Mobile: full width
  if (w < 1024) return OPTIMAL_PANEL_WIDTH.sm;
  if (w < 1280) return OPTIMAL_PANEL_WIDTH.md;
  if (w < 1536) return OPTIMAL_PANEL_WIDTH.lg;
  if (w < 1920) return OPTIMAL_PANEL_WIDTH.xl;
  return OPTIMAL_PANEL_WIDTH["2xl"];
}

/* Debounce helper */
function debounce(fn: Function, delay: number) {
  let timer: any = null;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ======================================================
   SWIPE CONSTANTS
====================================================== */

const SWIPE = {
  minOffsetRatio: 0.2,
  minVelocity: 450,
  flyOutRatio: 0.98,
  flyOutDuration: 0.2,
  snapSpring: { stiffness: 380, damping: 32 },
  dragElastic: 0.28,
};

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
  isSidebarOpen: boolean;             // right Favorites panel open?
  isLeftSidebarCollapsed?: boolean;   // left sidebar collapsed?
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
  isLeftSidebarCollapsed = false,
  isDisliked = false,
  dislikedTimestamp = null,
  onRemoveDislike,
}: Props) {

  const controls = useAnimationControls();
  const panelRef = useRef<HTMLDivElement>(null);

  // Generate subdivision URL
  const getSubdivisionUrl = () => {
    if (!fullListing.subdivisionName || !fullListing.city) return null;

    // Filter out non-applicable subdivisions
    const nonApplicableValues = ['not applicable', 'n/a', 'none', 'other', 'na', 'no hoa'];
    const lowerSubdivision = fullListing.subdivisionName.toLowerCase().trim();
    if (nonApplicableValues.some(val => lowerSubdivision.includes(val))) {
      return null;
    }

    // Create city slug
    const citySlug = fullListing.city
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Create subdivision slug from name - keep it simple
    const subdivisionSlug = fullListing.subdivisionName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return `/neighborhoods/${citySlug}/${subdivisionSlug}`;
  };

  const subdivisionUrl = getSubdivisionUrl();

  const [mounted, setMounted] = useState(false);

  /* The only dynamic values we care about: left offset and width */
  const [layout, setLayout] = useState({
    width: typeof window !== 'undefined' ? getOptimalPanelWidth() : 1000,
    left: 0,
  });

  const dragX = useMotionValue(0);

  /* ======================================================
     3D SWIPE VISUALS
  ====================================================== */

  const rotZ = useTransform(dragX, [-300, 0, 300], [-PIN.rotZMaxDeg, 0, PIN.rotZMaxDeg]);
  const skewY = useTransform(dragX, [-300, 0, 300], [PIN.skewYMaxDeg, 0, -PIN.skewYMaxDeg]);
  const rotX = useTransform(dragX, [-300, 0, 300], [PIN.rotXMaxDeg, 0, PIN.rotXMaxDeg]);

  const shadowAlpha = useTransform(
    dragX,
    [-300, 0, 300],
    [0.35 + PIN.shadowBoost, 0.35, 0.35 + PIN.shadowBoost]
  );
  const boxShadowMV = useTransform(shadowAlpha, (a) => `0 15px 40px rgba(0,0,0,${a})`);

  /* ======================================================
     MOUNT ANIMATION & PREVENT DOUBLE-TAP ZOOM
  ====================================================== */

  useEffect(() => {
    setMounted(true);

    controls.set({ opacity: 0, y: 28, scale: 0.985 });
    dragX.set(0);

    controls.start({
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.2, ease: [0.42, 0, 0.58, 1] },
    });

    // Prevent double-tap zoom on iOS
    const preventDoubleTapZoom = (e: TouchEvent) => {
      const t2 = e.timeStamp;
      const t1 = (e.currentTarget as any).lastTouch || t2;
      const dt = t2 - t1;
      const fingers = e.touches.length;
      (e.currentTarget as any).lastTouch = t2;

      if (!dt || dt > 500 || fingers > 1) return; // Not a double tap

      e.preventDefault();
      e.stopPropagation();
    };

    const panel = panelRef.current;
    if (panel) {
      panel.addEventListener('touchstart', preventDoubleTapZoom, { passive: false });
    }

    return () => {
      if (panel) {
        panel.removeEventListener('touchstart', preventDoubleTapZoom);
      }
    };
  }, [fullListing.listingKey]);

  /* ======================================================
     CENTERPIECE LAYOUT LOGIC
     - Panel stays centered and fixed width
     - Sidebars move around it, not vice versa
  ====================================================== */

  const computeLayout = () => {
    if (typeof window === "undefined") return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Mobile: full width, no centering
    if (w < MOBILE_BREAKPOINT) {
      setLayout({
        width: w,
        left: 0,
      });
      return;
    }

    // Tablet portrait mode (768px-1023px in portrait): full width
    const isTabletPortrait = w >= 768 && w < 1024 && h > w;
    if (isTabletPortrait) {
      setLayout({
        width: w,
        left: 0,
      });
      return;
    }

    // Desktop/tablet landscape: Fixed optimal width, centered on screen
    const optimalWidth = getOptimalPanelWidth();

    // Center the panel in the viewport, regardless of sidebars
    const left = (w - optimalWidth) / 2;

    setLayout({
      width: optimalWidth,
      left
    });
  };

  // This prevents jank during sidebar animations
  const debouncedCompute = debounce(computeLayout, 180);

  useEffect(() => {
    if (mounted) debouncedCompute();
  }, [isSidebarOpen, isLeftSidebarCollapsed]);

  useEffect(() => {
    computeLayout();
    window.addEventListener("resize", computeLayout);
    return () => window.removeEventListener("resize", computeLayout);
  }, []);

  /* ======================================================
     SWIPE LOGIC
  ====================================================== */

  const swipeOut = async (dir: "left" | "right") => {
    const W = window.innerWidth;
    const fly = Math.round(W * SWIPE.flyOutRatio);

    const animX = animate(dragX, dir === "left" ? -fly : fly, {
      duration: SWIPE.flyOutDuration,
      ease: [0.42, 0, 0.58, 1],
    });

    const animOther = controls.start({
      y: -60,
      opacity: 0,
      scale: 0.985,
      rotate: dir === "left" ? -4 : 4,
      transition: { duration: SWIPE.flyOutDuration },
    });

    await Promise.all([animX.finished, animOther]);

    dir === "left" ? onSwipeLeft?.() : onSwipeRight?.();

    dragX.set(0);
  };

  const handleDragEnd = (_e: any, info: any) => {
    const { offset, velocity } = info;
    const threshold = window.innerWidth * SWIPE.minOffsetRatio;

    if (offset.x < -threshold || velocity.x < -SWIPE.minVelocity)
      return swipeOut("left");
    if (offset.x > threshold || velocity.x > SWIPE.minVelocity)
      return swipeOut("right");

    controls.start({
      y: 0,
      opacity: 1,
      scale: 1,
      transition: { type: "spring", ...SWIPE.snapSpring },
    });

    animate(dragX, 0, {
      type: "spring",
      stiffness: 380,
      damping: 32,
    });
  };

  if (!mounted) return null;

  /* ======================================================
     MAIN MARKUP
  ====================================================== */

  const address =
    fullListing.unparsedAddress ||
    fullListing.unparsedFirstLineAddress ||
    fullListing.address ||
    listing.address ||
    "Unknown address";

  const panel = (
    <motion.div
      key={fullListing.listingKey}
      ref={panelRef}
      drag="x"
      dragElastic={SWIPE.dragElastic}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      animate={controls}
      exit={{ opacity: 0, y: 36, transition: { duration: 0.15 } }}
      className="fixed bottom-0 z-[100] rounded-t-2xl shadow-2xl overflow-hidden text-white max-h-[85vh] sm:max-h-[88vh] md:max-h-[90vh] lg:max-h-[92vh] xl:max-h-[94vh] flex flex-col"
      style={{
        width: layout.width,
        left: layout.left,
        background: "rgba(22,22,22,0.95)",
        backdropFilter: "blur(10px)",
        transformOrigin: `50% ${PIN.originYpx}px`,
        rotateZ: rotZ,
        rotateX: rotX,
        skewY: skewY,
        boxShadow: boxShadowMV,
        x: dragX,
      }}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-50 bg-black/70 p-2 rounded-full border border-white/10 hover:bg-black/90 transition-colors"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Disliked Badge */}
      {isDisliked && dislikedTimestamp && onRemoveDislike && (
        <DislikedBadge timestamp={dislikedTimestamp} onRemove={onRemoveDislike} />
      )}

      {/* Carousel */}
      <div className="flex-shrink-0">
        <PannelCarousel listingKey={fullListing.listingKey} alt={address} />
      </div>

      {/* Header */}
      <div className="px-4 py-2.5 bg-zinc-900/95 border-b border-zinc-800 flex-shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xl font-semibold leading-tight">{address}</p>
            <p className="text-2xl font-bold text-emerald-400">
              {`$${Number(fullListing.listPrice ?? 0).toLocaleString()}`}
            </p>
          </div>

          <div className="flex gap-2">
            {/* Share */}
            <button
              onClick={() =>
                navigator.share?.({ title: address, url: window.location.href })
              }
              className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center hover:bg-zinc-700 flex-shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            {/* Calendar */}
            <Link
              href="/book-appointment"
              className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center hover:bg-zinc-700 flex-shrink-0"
            >
              <Calendar className="w-3.5 h-3.5 text-white" />
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-2.5 custom-scrollbar min-h-0">
        <div className="flex flex-wrap gap-1.5 text-sm mb-2.5">
          {fullListing.subdivisionName && (
            subdivisionUrl ? (
              <Link
                href={subdivisionUrl}
                className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20 hover:bg-emerald-500/30 hover:border-emerald-500/40 transition-all inline-flex items-center gap-1"
              >
                {fullListing.subdivisionName}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20">
                {fullListing.subdivisionName}
              </span>
            )
          )}

          {(fullListing.bedsTotal != null || fullListing.bedroomsTotal != null) && (
            <span className="bg-zinc-800 px-2 py-1 rounded-full">
              {fullListing.bedsTotal || fullListing.bedroomsTotal} Bed
            </span>
          )}

          {fullListing.bathroomsTotalInteger != null && (
            <span className="bg-zinc-800 px-2 py-1 rounded-full">
              {fullListing.bathroomsTotalInteger} Bath
            </span>
          )}

          {fullListing.livingArea != null && (
            <span className="bg-zinc-800 px-2 py-1 rounded-full">
              {fullListing.livingArea.toLocaleString()} SqFt
            </span>
          )}

          {fullListing.lotSizeArea != null && (
            <span className="bg-zinc-800 px-2 py-1 rounded-full">
              {Math.round(fullListing.lotSizeArea).toLocaleString()} Lot
            </span>
          )}

          {fullListing.landType && (
            <span className="bg-zinc-800 px-2 py-1 rounded-full">
              {fullListing.landType}
            </span>
          )}

          {fullListing.associationFee && (
            <span className="bg-zinc-800 px-2 py-1 rounded-full">
              ${fullListing.associationFee}/mo HOA
            </span>
          )}

          {fullListing.yearBuilt && (
            <span className="bg-zinc-800 px-2 py-1 rounded-full">
              Built {fullListing.yearBuilt}
            </span>
          )}
        </div>

        {fullListing.publicRemarks && (
          <p className="text-white/90 text-sm leading-relaxed mb-3 line-clamp-3">{fullListing.publicRemarks}</p>
        )}

        <div className="mb-3">
          <ListingAttribution listing={fullListing} />
        </div>

        {/* Swipe Buttons */}
        <div className="flex justify-center gap-8 py-3">
          <button onClick={() => swipeOut("left")} className="transition-transform hover:scale-110">
            <Image src="/images/swipe-left.png" alt="" width={60} height={60} />
          </button>
          <button onClick={() => swipeOut("right")} className="transition-transform hover:scale-110">
            <Image src="/images/swipe-right.png" alt="" width={60} height={60} />
          </button>
        </div>
      </div>

      {/* CTA Footer */}
      <div className="px-4 py-3 bg-zinc-900/95 border-t border-zinc-800 flex-shrink-0">
        <Link
          href={`/mls-listings/${fullListing.slugAddress || fullListing.slug}`}
          className="block w-full text-center bg-emerald-500 text-black font-bold py-2.5 rounded-lg hover:bg-emerald-400 text-base"
        >
          View Full Listing
        </Link>
      </div>
    </motion.div>
  );

  return createPortal(
    <AnimatePresence mode="wait">
      {fullListing?.listingKey && panel}
    </AnimatePresence>,
    document.body
  );
}
