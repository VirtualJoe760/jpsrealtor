// src/app/components/mls/map/ListingBottomPanel.tsx
// @ts-nocheck
"use client";

import { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Share2, Calendar, Sparkles } from "lucide-react";
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
import { useRouter } from "next/navigation";
import PannelCarousel from "./PannelCarousel";
import UnifiedListingAttribution from "@/app/components/mls/ListingAttribution";
import DislikedBadge from "./DislikedBadge";
import { useTheme } from "@/app/contexts/ThemeContext";
import { usePWA } from "@/app/contexts/PWAContext";

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
  onPanelClosedForTutorial?: () => void; // Tutorial callback for close button click
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
  onPanelClosedForTutorial,
}: Props) {

  const controls = useAnimationControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Stable portal container — must be declared before any early returns
  const portalRef = useRef<HTMLDivElement | null>(null);
  if (!portalRef.current && typeof document !== 'undefined') {
    const existing = document.getElementById('listing-bottom-panel-portal');
    if (existing) {
      portalRef.current = existing as HTMLDivElement;
    } else {
      const el = document.createElement('div');
      el.id = 'listing-bottom-panel-portal';
      document.body.appendChild(el);
      portalRef.current = el;
    }
  }

  // State for fetched listing data
  const [enrichedListing, setEnrichedListing] = useState<IUnifiedListing>(fullListing);
  const [isLoading, setIsLoading] = useState(false);

  // Use centralized PWA detection from PWAContext
  const { isStandalone } = usePWA();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Mark as hydrated for SSR consistency
    setHydrated(true);
  }, []);

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

      setIsLoading(true);

      try {
        const response = await fetch(`/api/mls-listings/${identifier}`);

        if (response.ok) {
          const { listing: apiListing } = await response.json();
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

    controls.set({ opacity: 0, y: 28, scale: 0.985, rotate: 0 });
    dragX.set(0);

    controls.start({
      opacity: 1,
      y: 0,
      scale: 1,
      rotate: 0,
      transition: { duration: 0.2, ease: [0.42, 0, 0.58, 1] },
    });

    return () => {};
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
    onPanelClosedForTutorial?.(); // Notify tutorial system that swipe completed

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
      className={`fixed bottom-0 z-[100] rounded-t-3xl overflow-hidden ${
        hydrated && isStandalone
          ? 'max-h-[95vh]' // PWA: 95vh - PERFECT
          : 'max-h-[88vh]'  // Browser: 88vh for better fit (also SSR default)
      } sm:max-h-[88vh] md:max-h-[90vh] lg:max-h-[92vh] xl:max-h-[94vh] flex flex-col ${
        isLight ? 'text-gray-900' : 'text-white'
      }`}
      suppressHydrationWarning
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
        onClick={() => {
          onClose();
          onPanelClosedForTutorial?.(); // Notify tutorial system
        }}
        data-tour="close-listing-panel"
        className={`absolute top-12 right-4 z-50 p-2.5 rounded-xl border transition-all backdrop-blur-sm ${
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

      {/* Header — Address + Price */}
      <div className={`px-5 pt-3 pb-2 flex-shrink-0`}>
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold leading-tight mb-1 ${
              isLight ? 'text-gray-800' : 'text-gray-200'
            }`}>{address}</p>
            <p className={`text-3xl font-extrabold tracking-tight ${
              isLight ? 'text-blue-600' : 'text-emerald-400'
            }`}>
              {`$${Number(enrichedListing.listPrice ?? 0).toLocaleString()}`}
            </p>
          </div>

          <div className="flex gap-1.5 flex-shrink-0 mt-1">
            {/* AI ask — dispatches chatv3:send-message so ChatWidget
                picks it up and routes a fresh chat turn through the
                same parser → preview → narrate pipe. The address is
                the canonical handle the user types ("tell me about
                {address}"). Uses a soft accent color so it reads as
                the active action vs the neutral share/calendar. */}
            <button
              onClick={() => {
                // Navigate to /chap with the AI query as a URL param
                // — works from any page (map view, /mls-listings, etc).
                // /chap reads the param on mount, hides the map if
                // visible, and passes the message to ChatWidget's
                // autoSendMessage prop. URL navigation preserves the
                // pattern: same-page nav doesn't unmount the chat
                // tree (Next.js client routing), so chat history
                // survives. Cross-page nav lands the user at the
                // chat view with the response already streaming.
                const url = `/chap?aiQuery=${encodeURIComponent(
                  `Tell me about ${address}`
                )}`;
                onClose();
                router.push(url);
              }}
              title="Ask AI about this property"
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                isLight
                  ? "bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200"
                  : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigator.share?.({ title: address, url: window.location.href })}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                isLight
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200'
                  : 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <Link
              href="/book-appointment"
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                isLight
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200'
                  : 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Stats chips + description + swipe */}
      <div className="flex-shrink-0 px-5 pb-2">
        {/* Chips row */}
        <div className="flex flex-wrap gap-1 text-[11px] mb-2">
          {enrichedListing.subdivisionName && (
            subdivisionUrl ? (
              <Link
                href={subdivisionUrl}
                className={`px-2 py-0.5 rounded-md border inline-flex items-center gap-0.5 font-medium transition-all ${
                  isLight
                    ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                }`}
              >
                {enrichedListing.subdivisionName}
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <span className={`px-2 py-0.5 rounded-md border font-medium ${
                isLight ? 'bg-blue-50 text-blue-700 border-blue-200'
                         : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>{enrichedListing.subdivisionName}</span>
            )
          )}

          {(enrichedListing.bedsTotal != null || enrichedListing.bedroomsTotal != null) && (
            <span className={`px-2 py-0.5 rounded-md border font-medium ${
              isLight ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-white/5 text-gray-200 border-white/10'
            }`}>{enrichedListing.bedsTotal || enrichedListing.bedroomsTotal} Bed</span>
          )}

          {enrichedListing.bathroomsTotalInteger != null && (
            <span className={`px-2 py-0.5 rounded-md border font-medium ${
              isLight ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-white/5 text-gray-200 border-white/10'
            }`}>{enrichedListing.bathroomsTotalInteger} Bath</span>
          )}

          {enrichedListing.livingArea != null && (
            <span className={`px-2 py-0.5 rounded-md border font-medium ${
              isLight ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-white/5 text-gray-200 border-white/10'
            }`}>{enrichedListing.livingArea.toLocaleString()} SqFt</span>
          )}

          {enrichedListing.lotSizeArea != null && enrichedListing.lotSizeArea > 0 && (
            <span className={`px-2 py-0.5 rounded-md border font-medium ${
              isLight ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-white/5 text-gray-200 border-white/10'
            }`}>{Math.round(enrichedListing.lotSizeArea).toLocaleString()} Lot</span>
          )}

          {enrichedListing.associationFee != null && enrichedListing.associationFee > 0 && (
            <span className={`px-2 py-0.5 rounded-md border font-medium ${
              isLight ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-white/5 text-gray-200 border-white/10'
            }`}>${enrichedListing.associationFee}/mo HOA</span>
          )}

          {enrichedListing.yearBuilt != null && enrichedListing.yearBuilt > 0 && (
            <span className={`px-2 py-0.5 rounded-md border font-medium ${
              isLight ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-white/5 text-gray-200 border-white/10'
            }`}>Built {enrichedListing.yearBuilt}</span>
          )}

          {(enrichedListing.poolYN === true || enrichedListing.pool) && (
            <span className={`px-2 py-0.5 rounded-md border font-medium ${
              isLight ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
            }`}>Pool</span>
          )}

          {(enrichedListing.spaYN === true || enrichedListing.spa) && (
            <span className={`px-2 py-0.5 rounded-md border font-medium ${
              isLight ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
            }`}>Spa</span>
          )}
        </div>

        {/* Description snippet */}
        {enrichedListing.publicRemarks && (
          <p className={`text-xs leading-relaxed mb-2 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            {enrichedListing.publicRemarks.length > 100
              ? enrichedListing.publicRemarks.substring(0, 100) + "... "
              : enrichedListing.publicRemarks}
            {enrichedListing.publicRemarks.length > 100 && (
              <Link
                href={`/mls-listings/${enrichedListing.slugAddress || enrichedListing.slug}`}
                className={`font-medium ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-emerald-400 hover:text-emerald-300'}`}
              >
                view more
              </Link>
            )}
          </p>
        )}

        {/* MLS Attribution */}
        <div className="mb-2">
          <UnifiedListingAttribution listing={fullListing} />
        </div>

        {/* Swipe Buttons — redesigned for theme */}
        <div className="flex justify-center gap-6 py-2">
          <button
            onClick={() => swipeOut("left")}
            data-tour="swipe-left-button"
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg ${
              isLight
                ? 'bg-red-50 border-2 border-red-200 text-red-500 hover:bg-red-100 hover:border-red-300 hover:shadow-red-200/50'
                : 'bg-red-950/40 border-2 border-red-800/50 text-red-400 hover:bg-red-900/50 hover:border-red-600/50 hover:shadow-red-900/30'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384" />
            </svg>
          </button>
          <button
            onClick={() => swipeOut("right")}
            data-tour="swipe-right-button"
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg ${
              isLight
                ? 'bg-green-50 border-2 border-green-200 text-green-500 hover:bg-green-100 hover:border-green-300 hover:shadow-green-200/50'
                : 'bg-emerald-950/40 border-2 border-emerald-800/50 text-emerald-400 hover:bg-emerald-900/50 hover:border-emerald-600/50 hover:shadow-emerald-900/30'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904" />
            </svg>
          </button>
        </div>
      </div>

      {/* CTA Footer */}
      <div className={`px-5 py-3 border-t flex-shrink-0 ${
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

  if (!portalRef.current) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {fullListing?.listingKey && panel}
    </AnimatePresence>,
    portalRef.current
  );
}
