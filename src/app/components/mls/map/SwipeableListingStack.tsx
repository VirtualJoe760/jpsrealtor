// src/app/components/mls/map/SwipeableListingStack.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
  PanInfo,
} from "framer-motion";
import { X, RotateCcw } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import type { MapListing } from "@/types/types";
import type { IListing } from "@/models/listings";
import ListingBottomPanel from "./ListingBottomPanel";

/* ======================================================
   CONSTANTS
====================================================== */

const SWIPE_THRESHOLD = 100; // pixels to trigger swipe
const SWIPE_VELOCITY = 500; // velocity threshold
const EXIT_DURATION = 0.3;
const STACK_OFFSET = 8; // vertical offset between stacked cards
const STACK_SCALE = 0.95; // scale of cards behind
const MAX_VISIBLE_CARDS = 3; // how many cards to show in stack

type SwipeDirection = "left" | "right";

interface SwipeHistoryItem {
  listing: MapListing;
  fullListing: IListing;
  direction: SwipeDirection;
}

interface Props {
  listings: MapListing[]; // Array of listings to swipe through
  fullListings: Map<string, IListing>; // Map of listingKey -> full listing data
  onClose: () => void;
  onSwipeLeft?: (listing: MapListing) => void;
  onSwipeRight?: (listing: MapListing) => void;
  isSidebarOpen: boolean;
  isLeftSidebarCollapsed?: boolean;
}

export default function SwipeableListingStack({
  listings: initialListings,
  fullListings,
  onClose,
  onSwipeLeft,
  onSwipeRight,
  isSidebarOpen,
  isLeftSidebarCollapsed,
}: Props) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [listings, setListings] = useState<MapListing[]>(initialListings);
  const [history, setHistory] = useState<SwipeHistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeIndex = listings.length - 1; // Top card is last in array
  const activeListing = listings[activeIndex];
  const activeFullListing = activeListing ? fullListings.get(activeListing.listingKey) : null;

  const dragX = useMotionValue(0);
  const [leaveX, setLeaveX] = useState(0);
  const [leaveY, setLeaveY] = useState(0);

  // Visual feedback during drag
  const rotate = useTransform(dragX, [-200, 0, 200], [-15, 0, 15]);
  const opacity = useTransform(dragX, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  const removeCard = (listing: MapListing, direction: SwipeDirection) => {
    const fullListing = fullListings.get(listing.listingKey);
    if (!fullListing) return;

    // Add to history
    setHistory((prev) => [...prev, { listing, fullListing, direction }]);

    // Remove from stack
    setListings((prev) => prev.filter((l) => l.listingKey !== listing.listingKey));

    // Call appropriate callback
    if (direction === "left") {
      onSwipeLeft?.(listing);
    } else {
      onSwipeRight?.(listing);
    }

    // Reset for next card
    setLeaveX(0);
    setLeaveY(0);
  };

  const undoSwipe = () => {
    if (history.length === 0) return;

    const lastSwipe = history[history.length - 1];
    if (!lastSwipe) return;

    // Remove from history
    setHistory((prev) => prev.slice(0, -1));

    // Add back to listings
    setListings((prev) => [...prev, lastSwipe.listing]);
  };

  const onDragEnd = (_e: any, info: PanInfo) => {
    if (!activeListing) return;

    const threshold = SWIPE_THRESHOLD;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    // Check if swipe threshold met
    if (offset > threshold || velocity > SWIPE_VELOCITY) {
      setLeaveX(1000);
      removeCard(activeListing, "right");
      return;
    }

    if (offset < -threshold || velocity < -SWIPE_VELOCITY) {
      setLeaveX(-1000);
      removeCard(activeListing, "left");
      return;
    }

    // Snap back if didn't meet threshold
    dragX.set(0);
  };

  if (!mounted || !activeListing || !activeFullListing) return null;

  const panel = (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Undo Button */}
      {history.length > 0 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={undoSwipe}
          className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-[110] backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 transition-colors pointer-events-auto shadow-xl ${
            isLight
              ? 'bg-white/95 border-2 border-gray-300 text-gray-900 hover:bg-white'
              : 'bg-gray-900/90 border border-gray-700 text-white hover:bg-gray-800/90'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span className="text-sm font-medium">Undo</span>
        </motion.button>
      )}

      {/* Stack Counter */}
      <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-[105] backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium pointer-events-none shadow-xl ${
        isLight
          ? 'bg-white/95 border-2 border-gray-300 text-gray-900'
          : 'bg-gray-900/90 border border-gray-700 text-white'
      }`}>
        {activeIndex + 1} / {initialListings.length}
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className={`absolute top-6 right-6 z-[105] backdrop-blur-md p-2 rounded-full transition-colors pointer-events-auto shadow-xl ${
          isLight
            ? 'bg-white/95 border-2 border-gray-300 hover:bg-white'
            : 'bg-gray-900/90 border border-gray-700 hover:bg-gray-800/90'
        }`}
      >
        <X className={`w-6 h-6 ${isLight ? 'text-gray-900' : 'text-white'}`} />
      </button>

      {/* Card Stack */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-auto">
        <AnimatePresence mode="wait">
          {listings.map((listing, index) => {
            const fullListing = fullListings.get(listing.listingKey);
            if (!fullListing) return null;

            const isActive = index === activeIndex;
            const isVisible = index >= activeIndex - (MAX_VISIBLE_CARDS - 1);

            if (!isVisible) return null;

            const stackPosition = activeIndex - index; // 0 = top card, 1 = second card, etc.
            const scale = 1 - stackPosition * (1 - STACK_SCALE);
            const yOffset = stackPosition * STACK_OFFSET;

            return (
              <motion.div
                key={listing.listingKey}
                drag={isActive ? "x" : false}
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                onDragEnd={isActive ? onDragEnd : undefined}
                initial={{
                  scale: scale,
                  y: yOffset,
                  opacity: 1,
                }}
                animate={{
                  scale: isActive ? 1 : scale,
                  y: isActive ? 0 : yOffset,
                  opacity: 1,
                  transition: {
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  },
                }}
                exit={{
                  x: leaveX,
                  y: leaveY,
                  opacity: 0,
                  scale: 0.8,
                  rotate: leaveX > 0 ? 20 : -20,
                  transition: { duration: EXIT_DURATION },
                }}
                style={{
                  x: isActive ? dragX : 0,
                  opacity: isActive ? opacity : 1,
                  rotate: isActive ? rotate : 0,
                }}
                className="absolute bottom-0 left-0 right-0"
              >
                <ListingBottomPanel
                  listing={listing}
                  fullListing={fullListing}
                  onClose={onClose}
                  onSwipeLeft={() => {
                    if (isActive) {
                      setLeaveX(-1000);
                      removeCard(listing, "left");
                    }
                  }}
                  onSwipeRight={() => {
                    if (isActive) {
                      setLeaveX(1000);
                      removeCard(listing, "right");
                    }
                  }}
                  isSidebarOpen={isSidebarOpen}
                  isLeftSidebarCollapsed={isLeftSidebarCollapsed}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* End of Stack Message */}
      {listings.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute bottom-32 left-1/2 -translate-x-1/2 text-center"
        >
          <p className={`text-xl font-semibold mb-4 ${
            isLight ? 'text-gray-900' : 'text-white'
          }`}>No more listings</p>
          <button
            onClick={onClose}
            className={`px-6 py-3 font-bold rounded-lg transition-colors ${
              isLight
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-emerald-500 text-black hover:bg-emerald-400'
            }`}
          >
            Close
          </button>
        </motion.div>
      )}
    </div>
  );

  return createPortal(panel, document.body);
}
