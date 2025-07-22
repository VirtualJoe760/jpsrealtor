"use client";

import { useRef, useState, useEffect } from "react";
import { X, Share2, Calendar } from "lucide-react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import type { MapListing } from "@/types/types";

import Link from "next/link";
import type { IListing } from "@/models/listings";
import clsx from "clsx";
import PannelCarousel from "./PannelCarousel";
import Image from "next/image";

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
  const [exitSwipe, setExitSwipe] = useState<"left" | "right" | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const opacity = useTransform(x, [-300, 0, 300], [0, 1, 0]);
  const scale = useTransform(x, [-300, 0, 300], [0.95, 1, 0.95]);

  const address =
    fullListing.unparsedAddress ||
    fullListing.unparsedFirstLineAddress ||
    fullListing.address ||
    "Unknown address";

  useEffect(() => {
    console.log(
      "🧪 ListingBottomPanel listing.listingKey:",
      listing?.listingKey
    );
    console.log(
      "🧪 ListingBottomPanel fullListing.listingKey:",
      fullListing?.listingKey
    );
  }, [listing?.listingKey, fullListing?.listingKey]);

  const handleSwipe = (dir: "left" | "right") => {
    setExitSwipe(dir);
    setTimeout(() => {
      dir === "left" ? onSwipeLeft?.() : onSwipeRight?.();
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
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, scale: 0.98, backdropFilter: "blur(0px)" }}
      animate={{
        opacity: 1,
        scale: 1,
        backdropFilter: "blur(8px)",
        transition: {
          duration: 0.4,
          ease: [0.42, 0, 0.58, 1],
        },
      }}
      exit={{
        ...getExitAnimation(),
        transition: { duration: 0.4, ease: [0.42, 0, 0.58, 1] },
      }}
      style={{ backdropFilter: "blur(8px)" }}
      drag
      dragElastic={0.2}
      whileDrag={{ scale: 0.96, opacity: 0.9 }}
      onDragEnd={(e, info) => {
        const { offset, velocity } = info;
        if (offset.x < -100 || velocity.x < -500) handleSwipe("left");
        else if (offset.x > 100 || velocity.x > 500) handleSwipe("right");
        else if (offset.y > 100) onClose();
      }}
      className={clsx(
        "fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/80 text-white rounded-t-2xl shadow-lg overflow-hidden backdrop-blur",
        lgLayoutClasses
      )}
    >
      <PannelCarousel listingKey={fullListing.listingKey} alt={address} />
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-2 right-2 bg-black/60 rounded-full p-1 z-10"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      <div className="flex flex-col max-h-[85vh]">
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3 text-white overflow-y-auto flex-1">
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
              <span className="bg-zinc-800 px-3 py-1 rounded-full">🏊 Pool</span>
            )}
            {fullListing?.spaYn && (
              <span className="bg-zinc-800 px-3 py-1 rounded-full">🧖 Spa</span>
            )}
          </div>

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
        </div>

        <div className="sticky bottom-0 bg-zinc-950/80 px-4 sm:px-5 pb-4 sm:pb-5">
          <Link
            href={`/mls-listings/${listing.slugAddress}`}
            className="block text-center bg-emerald-500 text-black font-semibold py-2 rounded-md hover:bg-emerald-400 transition"
          >
            View Full Listing
          </Link>
        </div>
      </div>
    </motion.div>
  );
}