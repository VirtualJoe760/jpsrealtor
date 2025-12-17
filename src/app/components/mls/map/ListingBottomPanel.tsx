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
import type { IUnifiedListing } from "@/models/unified-listing";
import Link from "next/link";
import Image from "next/image";
import PannelCarousel from "./PannelCarousel";
import UnifiedListingAttribution from "@/app/components/mls/ListingAttribution";
import DislikedBadge from "./DislikedBadge";
import { useTheme } from "@/app/contexts/ThemeContext";

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
  fullListing: IUnifiedListing;
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

  // State for fetched listing data
  const [enrichedListing, setEnrichedListing] = useState<IUnifiedListing>(fullListing);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch full listing data from API using slugAddress or listingKey
  useEffect(() => {
    const fetchListingData = async () => {
      // Priority: slugAddress (preferred) → listingKey (fallback)
      const identifier = listing.slugAddress || listing.slug || fullListing.slugAddress || fullListing.listingKey;

      if (!identifier) {
        console.warn('[ListingBottomPanel] No identifier available, using provided data');
        setEnrichedListing(fullListing);
        return;
      }

      console.log('[ListingBottomPanel] Fetching data for:', identifier);
      setIsLoading(true);

      try {
        // The mls-listings route now accepts both slugAddress AND listingKey
        const response = await fetch(`/api/mls-listings/${identifier}`);

        if (response.ok) {
          const { listing: apiListing } = await response.json();
          console.log('[ListingBottomPanel] API data fetched:', {
            hasPublicRemarks: !!apiListing.publicRemarks,
            hasPrice: !!apiListing.listPrice,
            hasBeds: !!apiListing.bedsTotal,
            allKeys: Object.keys(apiListing).sort().slice(0, 20)
          });

          // Merge API data with original listing (API data takes priority)
          setEnrichedListing({ ...fullListing, ...apiListing });
        } else {
          console.warn('[ListingBottomPanel] API fetch failed, using provided data');
          setEnrichedListing(fullListing);
        }
      } catch (error) {
        console.error('[ListingBottomPanel] Error fetching listing data:', error);
        setEnrichedListing(fullListing);
      } finally {
        setIsLoading(false);
      }
    };

    fetchListingData();
  }, [listing.slugAddress, listing.slug, fullListing.slugAddress, fullListing.listingKey]);

  // Debug logging for chat listings
  console.log('[ListingBottomPanel] enrichedListing data:', {
    hasPublicRemarks: !!enrichedListing.publicRemarks,
    publicRemarksLength: enrichedListing.publicRemarks?.length || 0,
    publicRemarksPreview: enrichedListing.publicRemarks?.substring(0, 100),
    price: enrichedListing.listPrice,
    beds: enrichedListing.bedsTotal || enrichedListing.bedroomsTotal,
    allKeys: Object.keys(enrichedListing).sort()
  });

  // Theme awareness
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // Generate subdivision URL
  const getSubdivisionUrl = () => {
    if (!enrichedListing.subdivisionName || !enrichedListing.city) return null;

    // Filter out non-applicable subdivisions
    const nonApplicableValues = ['not applicable', 'n/a', 'none', 'other', 'na', 'no hoa'];
    const lowerSubdivision = enrichedListing.subdivisionName.toLowerCase().trim();
    if (nonApplicableValues.some(val => lowerSubdivision.includes(val))) {
      return null;
    }

    // Import the findCityByName function to get the proper cityId
    const { findCityByName } = require('@/app/constants/counties');

    const cityData = findCityByName(enrichedListing.city);
    if (!cityData) return null;

    // Use the city's ID from the counties constant
    const cityId = cityData.city.id;

    // Create subdivision slug from name - this should match the database slug
    const subdivisionSlug = enrichedListing.subdivisionName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return `/neighborhoods/${cityId}/${subdivisionSlug}`;
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
  }, [enrichedListing.listingKey]);

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
    enrichedListing.unparsedAddress ||
    enrichedListing.unparsedFirstLineAddress ||
    enrichedListing.address ||
    listing.address ||
    "Unknown address";

  const panel = (
    <motion.div
      key={enrichedListing.listingKey}
      ref={panelRef}
      drag="x"
      dragElastic={SWIPE.dragElastic}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      animate={controls}
      exit={{ opacity: 0, y: 36, transition: { duration: 0.15 } }}
      className={`fixed bottom-0 z-[100] rounded-t-3xl overflow-hidden max-h-[100vh] sm:max-h-[88vh] md:max-h-[90vh] lg:max-h-[92vh] xl:max-h-[94vh] flex flex-col ${
        isLight ? 'text-gray-900' : 'text-white'
      }`}
      style={{
        width: layout.width,
        left: layout.left,
        background: isLight
          ? "rgba(255, 255, 255, 0.85)"
          : "rgba(15, 15, 18, 0.95)",
        backdropFilter: "blur(24px) saturate(200%)",
        WebkitBackdropFilter: "blur(24px) saturate(200%)",
        border: isLight
          ? "1px solid rgba(209, 213, 219, 0.4)"
          : "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: isLight
          ? "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(209, 213, 219, 0.1)"
          : "0 -8px 32px rgba(0, 0, 0, 0.6), 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        transformOrigin: `50% ${PIN.originYpx}px`,
        rotateZ: rotZ,
        rotateX: rotX,
        skewY: skewY,
        x: dragX,
      }}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className={`absolute top-4 right-4 z-50 p-2.5 rounded-xl border transition-all backdrop-blur-sm ${
          isLight
            ? 'bg-white/90 border-gray-200 hover:bg-white hover:shadow-lg text-gray-700 hover:text-gray-900'
            : 'bg-black/50 border-white/10 hover:bg-black/70 hover:border-white/20 text-white'
        }`}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Disliked Badge */}
      {isDisliked && dislikedTimestamp && onRemoveDislike && (
        <DislikedBadge timestamp={dislikedTimestamp} onRemove={onRemoveDislike} />
      )}

      {/* Carousel */}
      <div className="flex-shrink-0">
        <PannelCarousel listingKey={enrichedListing.listingKey} alt={address} />
      </div>

      {/* Header */}
      <div className={`px-5 py-4 border-b flex-shrink-0 ${
        isLight
          ? 'bg-white/70 border-gray-200/50'
          : 'bg-white/[0.02] border-white/[0.08]'
      }`}>
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium leading-tight mb-1.5 truncate ${
              isLight ? 'text-gray-600' : 'text-gray-400'
            }`}>{address}</p>
            <p className={`text-3xl font-bold tracking-tight ${
              isLight ? 'text-blue-600' : 'text-emerald-400'
            }`}>
              {`$${Number(enrichedListing.listPrice ?? 0).toLocaleString()}`}
            </p>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {/* Share */}
            <button
              onClick={() =>
                navigator.share?.({ title: address, url: window.location.href })
              }
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all backdrop-blur-sm ${
                isLight
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                  : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20'
              }`}
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Calendar */}
            <Link
              href="/book-appointment"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all backdrop-blur-sm ${
                isLight
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                  : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20'
              }`}
            >
              <Calendar className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar min-h-0">
        <div className="flex flex-wrap gap-2 text-sm mb-4">
          {enrichedListing.subdivisionName && (
            subdivisionUrl ? (
              <Link
                href={subdivisionUrl}
                className={`px-3 py-1.5 rounded-lg border transition-all inline-flex items-center gap-1.5 font-medium ${
                  isLight
                    ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/30'
                }`}
              >
                {enrichedListing.subdivisionName}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <span className={`px-3 py-1.5 rounded-lg border font-medium ${
                isLight
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {enrichedListing.subdivisionName}
              </span>
            )
          )}

          {(enrichedListing.bedsTotal != null || enrichedListing.bedroomsTotal != null) && (
            <span className={`px-3 py-1.5 rounded-lg border font-medium ${
              isLight
                ? 'bg-gray-100 text-gray-700 border-gray-200'
                : 'bg-white/5 text-gray-200 border-white/10'
            }`}>
              {enrichedListing.bedsTotal || enrichedListing.bedroomsTotal} Bed
            </span>
          )}

          {enrichedListing.bathroomsTotalInteger != null && (
            <span className={`px-3 py-1.5 rounded-lg border font-medium ${
              isLight
                ? 'bg-gray-100 text-gray-700 border-gray-200'
                : 'bg-white/5 text-gray-200 border-white/10'
            }`}>
              {enrichedListing.bathroomsTotalInteger} Bath
            </span>
          )}

          {enrichedListing.livingArea != null && (
            <span className={`px-3 py-1.5 rounded-lg border font-medium ${
              isLight
                ? 'bg-gray-100 text-gray-700 border-gray-200'
                : 'bg-white/5 text-gray-200 border-white/10'
            }`}>
              {enrichedListing.livingArea.toLocaleString()} SqFt
            </span>
          )}

          {enrichedListing.lotSizeArea != null && (
            <span className={`px-3 py-1.5 rounded-lg border font-medium ${
              isLight
                ? 'bg-gray-100 text-gray-700 border-gray-200'
                : 'bg-white/5 text-gray-200 border-white/10'
            }`}>
              {Math.round(enrichedListing.lotSizeArea).toLocaleString()} Lot
            </span>
          )}

          {enrichedListing.landType && (
            <span className={`px-3 py-1.5 rounded-lg border font-medium ${
              isLight
                ? 'bg-gray-100 text-gray-700 border-gray-200'
                : 'bg-white/5 text-gray-200 border-white/10'
            }`}>
              {enrichedListing.landType}
            </span>
          )}

          {enrichedListing.associationFee && (
            <span className={`px-3 py-1.5 rounded-lg border font-medium ${
              isLight
                ? 'bg-gray-100 text-gray-700 border-gray-200'
                : 'bg-white/5 text-gray-200 border-white/10'
            }`}>
              ${enrichedListing.associationFee}/mo HOA
            </span>
          )}

          {enrichedListing.yearBuilt && (
            <span className={`px-3 py-1.5 rounded-lg border font-medium ${
              isLight
                ? 'bg-gray-100 text-gray-700 border-gray-200'
                : 'bg-white/5 text-gray-200 border-white/10'
            }`}>
              Built {enrichedListing.yearBuilt}
            </span>
          )}

          {enrichedListing.daysOnMarket != null && enrichedListing.daysOnMarket > 0 && (
            <span className={`px-3 py-1.5 rounded-lg border font-medium ${
              isLight
                ? 'bg-gray-100 text-gray-700 border-gray-200'
                : 'bg-white/5 text-gray-200 border-white/10'
            }`}>
              {enrichedListing.daysOnMarket} {enrichedListing.daysOnMarket === 1 ? 'Day' : 'Days'} on Market
            </span>
          )}
        </div>

        {enrichedListing.publicRemarks && (
          <div className={`p-4 rounded-xl mb-4 ${
            isLight
              ? 'bg-gray-50 border border-gray-200'
              : 'bg-white/[0.03] border border-white/[0.08]'
          }`}>
            <p className={`text-sm leading-relaxed line-clamp-4 ${
              isLight ? 'text-gray-700' : 'text-gray-300'
            }`}>{enrichedListing.publicRemarks}</p>
          </div>
        )}

        <div className="mb-4">
          <UnifiedListingAttribution listing={fullListing} />
        </div>

        {/* Swipe Buttons */}
        <div className="flex justify-center gap-8 py-4">
          <button onClick={() => swipeOut("left")} className="transition-transform hover:scale-110 active:scale-95">
            <Image src="/images/swipe-left.png" alt="Dislike" width={64} height={64} />
          </button>
          <button onClick={() => swipeOut("right")} className="transition-transform hover:scale-110 active:scale-95">
            <Image src="/images/swipe-right.png" alt="Like" width={64} height={64} />
          </button>
        </div>
      </div>

      {/* CTA Footer */}
      <div className={`px-5 py-4 border-t flex-shrink-0 ${
        isLight
          ? 'bg-white/70 border-gray-200/50'
          : 'bg-white/[0.02] border-white/[0.08]'
      }`}>
        <Link
          href={`/mls-listings/${enrichedListing.slugAddress || enrichedListing.slug}`}
          className={`block w-full text-center font-semibold py-3.5 rounded-xl text-base transition-all ${
            isLight
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30'
          }`}
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
