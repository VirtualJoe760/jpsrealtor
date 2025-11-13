"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { MapListing } from "@/types/types";

type Props = {
  listing: MapListing | null;
  onClose: () => void;
};

export default function ListingDrawer({ listing, onClose }: Props) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const startX = useRef<number | null>(null);

  const [translateY, setTranslateY] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  useEffect(() => {
    if (!listing) setTranslateY(100); // Hide drawer if no listing
    else setTranslateY(0);
  }, [listing]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    startY.current = touch.clientY;
    startX.current = touch.clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const touch = e.touches[0];
    if (!touch) return;

    const deltaY = touch.clientY - (startY.current ?? 0);
    const deltaX = touch.clientX - (startX.current ?? 0);

    // Detect horizontal swipe for favorite/dismiss
    if (Math.abs(deltaX) > 80 && Math.abs(deltaY) < 50) {
      if (deltaX > 0) {
      } else {
      }
      setIsSwiping(false);
      onClose();
      return;
    }

    // Vertical swipe to close
    if (deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
      setTranslateY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (translateY > 100) {
      onClose();
    } else {
      setTranslateY(0);
    }
    setIsSwiping(false);
    startY.current = null;
    startX.current = null;
  };

  if (!listing) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed bottom-0 left-0 right-0 bg-zinc-950 z-50 rounded-t-2xl border-t border-zinc-800 transition-transform duration-300"
        style={{
          transform: `translateY(${translateY}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative">
          <img
            src={listing.primaryPhotoUrl}
            alt={listing.address}
            className="w-full h-56 object-cover rounded-t-2xl"
          />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 bg-black/70 rounded-full p-1"
          >
            <X className="text-white" />
          </button>
        </div>

        <div className="p-4 space-y-2 text-white">
          <h2 className="text-2xl font-bold text-emerald-400">
            ${listing.listPrice.toLocaleString()}
          </h2>
          <p className="text-lg">{listing.address}</p>
          <div className="text-sm text-zinc-400 flex gap-4 flex-wrap">
            {listing.bedroomsTotal && <span>{listing.bedroomsTotal} Bed</span>}
            {listing.bathroomsFull && <span>{listing.bathroomsFull} Bath</span>}
            {listing.livingArea && <span>{listing.livingArea.toLocaleString()} SqFt</span>}
            {listing.lotSizeSqft && <span>{Math.round(listing.lotSizeSqft).toLocaleString()} Lot</span>}
            {listing.pool && <span>🏊 Pool</span>}
            {listing.spa && <span>🧖 Spa</span>}
          </div>
          {listing.publicRemarks && (
            <p className="text-sm text-zinc-300 mt-2">
              {listing.publicRemarks}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
