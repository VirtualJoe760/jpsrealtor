// src/app/components/mls/map/ListingBottomPanel.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { X, Share2, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { MapListing } from "@/types/types";
import type { IListing } from "@/models/listings";
import clsx from "clsx";

type Props = {
  listing: MapListing;
  onClose: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  isSidebarOpen: boolean;
  isFiltersOpen: boolean;
};

export default function ListingBottomPanel({
  listing,
  onClose,
  onSwipeLeft,
  onSwipeRight,
  isSidebarOpen,
  isFiltersOpen,
}: Props) {
  const [fullListing, setFullListing] = useState<IListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [exitSwipe, setExitSwipe] = useState<"left" | "right" | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const photoUrl =
    listing.primaryPhotoUrl?.startsWith("http") ||
    listing.primaryPhotoUrl?.startsWith("/")
      ? listing.primaryPhotoUrl
      : "/images/no-photo.png";

  const address =
    fullListing?.unparsedAddress ||
    fullListing?.unparsedFirstLineAddress ||
    fullListing?.address ||
    listing.unparsedAddress ||
    listing.unparsedFirstLineAddress ||
    listing.address ||
    "Unknown address";

  useEffect(() => {
    const fetchListingDetails = async () => {
      const slug = listing.slugAddress ?? listing.slug;
      try {
        const res = await fetch(`/api/mls-listings/${slug}`);
        if (!res.ok) throw new Error("Failed to fetch full listing");
        const json = await res.json();
        setFullListing(json?.listing ?? null);
      } catch (err) {
        console.error("❌ Error fetching full listing:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchListingDetails();
  }, [listing]);

  const handleSwipe = (dir: "left" | "right") => {
    console.log("👉 Swipe initiated:", dir);
    setExitSwipe(dir);
    setTimeout(() => {
      if (dir === "left") {
        console.log("✅ Swipe left completed, attempting to advance");
        onSwipeLeft?.();
      } else {
        console.log("✅ Swipe right completed, attempting to go back");
        onSwipeRight?.();
      }
      setExitSwipe(null);
    }, 400);
  };

  const getExitAnimation = () => {
    if (exitSwipe === "left")
      return { x: -400, y: -120, rotate: -10, opacity: 0 };
    if (exitSwipe === "right")
      return { x: 400, y: -120, rotate: 10, opacity: 0 };
    return { opacity: 0 };
  };

  const lgLayoutClasses = clsx({
    "lg:left-[25%] lg:right-[15%]": isFiltersOpen,
    "lg:left-[15%] lg:right-[25%]": isSidebarOpen && !isFiltersOpen,
    "lg:left-[15%] lg:right-[15%]": !isSidebarOpen && !isFiltersOpen,
  });

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={listing.slugAddress ?? listing.slug}
        ref={panelRef}
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{
          ...getExitAnimation(),
          transition: { duration: 0.45, ease: [0.42, 0, 0.58, 1] },
        }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        drag={true}
        onDragEnd={(e, info) => {
          const { offset, velocity } = info;

          if (offset.x < -100 || velocity.x < -500) {
            console.log("👈 Swipe left detected");
            onSwipeLeft?.();
          } else if (offset.x > 100 || velocity.x > 500) {
            console.log("👉 Swipe right detected");
            onSwipeRight?.();
          } else if (offset.y > 100) {
            console.log("📉 Swipe down to close triggered");
            onClose();
          } else {
            console.log("😐 No significant swipe");
          }
        }}
        className={clsx(
          "fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 text-white rounded-t-2xl shadow-lg overflow-hidden max-h-[85vh]",
          lgLayoutClasses
        )}
      >
        <div className="relative w-full h-44 sm:h-60 lg:h-72 2xl:h-80 rounded-t-2xl overflow-hidden">
          <Image
            src={photoUrl}
            alt={address}
            fill
            className="object-cover"
            priority
          />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-2 right-2 bg-black/60 rounded-full p-1"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3 text-white">
            <div className="flex items-start justify-between pt-4">
              <div>
                <p className="text-3xl font-semibold mb-1 leading-tight">
                  {address}
                </p>
                <p className="text-2xl font-bold text-emerald-400 leading-tight">
                  $
                  {Number(
                    fullListing?.listPrice ?? listing.listPrice
                  ).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700"
                  aria-label="Share this listing"
                  onClick={() =>
                    navigator.share?.({
                      title: address,
                      url: window.location.href,
                    })
                  }
                >
                  <Share2 className="w-4 h-4 text-white" />
                </button>
                <Link
                  href="/book-appointment"
                  className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700"
                  aria-label="Book an appointment"
                >
                  <Calendar className="w-4 h-4 text-white" />
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-base sm:text-lg mt-2">
              {fullListing?.bedsTotal !== undefined && (
                <span className="bg-zinc-800 px-3 py-1 rounded-full">
                  {fullListing.bedsTotal} Bed
                </span>
              )}
              {fullListing?.bathroomsTotalInteger !== undefined && (
                <span className="bg-zinc-800 px-3 py-1 rounded-full">
                  {fullListing.bathroomsTotalInteger} Bath
                </span>
              )}
              {fullListing?.livingArea !== undefined && (
                <span className="bg-zinc-800 px-3 py-1 rounded-full">
                  {fullListing.livingArea.toLocaleString()} SqFt
                </span>
              )}
              {fullListing?.lotSizeArea !== undefined && (
                <span className="bg-zinc-800 px-3 py-1 rounded-full">
                  {Math.round(fullListing.lotSizeArea).toLocaleString()} Lot
                </span>
              )}
              {fullListing?.yearBuilt && (
                <span className="bg-zinc-800 px-3 py-1 rounded-full">
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

            {fullListing?.subdivisionName && (
              <p className="text-base sm:text-lg font-semibold text-white mt-1">
                Subdivision: {fullListing.subdivisionName}
              </p>
            )}

            {fullListing?.publicRemarks && (
              <p className="text-sm text-white mt-2 line-clamp-5">
                {fullListing.publicRemarks.length > 300
                  ? `${fullListing.publicRemarks.slice(0, 200)}...`
                  : fullListing.publicRemarks}
              </p>
            )}

            <div className="flex justify-center gap-8 mt-6">
              <button onClick={() => handleSwipe("left")}>
                <Image
                  src="/images/swipe-left.png"
                  alt="Swipe Left"
                  width={64}
                  height={64}
                  className="drop-shadow-lg hover:opacity-80 active:scale-95 transition"
                />
              </button>
              <button onClick={() => handleSwipe("right")}>
                <Image
                  src="/images/swipe-right.png"
                  alt="Swipe Right"
                  width={64}
                  height={64}
                  className="drop-shadow-lg hover:opacity-80 active:scale-95 transition"
                />
              </button>
            </div>

            <Link
              href={`/mls-listings/${listing.slugAddress ?? listing.slug}`}
              className="block text-center mt-2 bg-emerald-500 text-black font-semibold py-2 rounded-md hover:bg-emerald-400 transition"
            >
              View Full Listing
            </Link>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
