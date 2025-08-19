"use client";

import { useRef, useState, useEffect } from "react";
import { X, Share2, Calendar } from "lucide-react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import type { MapListing } from "@/types/types";

import Link from "next/link";
import type { IListing } from "@/models/listings";
import clsx from "clsx";
import PannelCarousel from "./PannelCarousel";
import Image from "next/image";
import ListingAttribution from "@/app/components/mls/ListingAttribution";

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

  // Motion values for drag
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const opacity = useTransform(x, [-300, 0, 300], [0.5, 1, 0.5]); // Increased min opacity
  const scale = useTransform(x, [-300, 0, 300], [0.95, 1, 0.95]);
  const rotateY = useTransform(x, [-300, 0, 300], [-20, 0, 20]);
  const rotateX = useTransform(y, [-150, 0, 150], [15, 0, 15]);
  const scaleY = useTransform(x, [-300, 0, 300], [0.8, 1, 0.8]);
  const skewY = useTransform(x, [-300, 0, 300], [-8, 0, 8]);
  const boxShadow = useTransform(x, [-300, 0, 300], [
    "0 15px 40px rgba(0, 0, 0, 0.6)",
    "0 5px 15px rgba(0, 0, 0, 0.3)",
    "0 15px 40px rgba(0, 0, 0, 0.6)",
  ]);

  const address =
    fullListing.unparsedAddress ||
    fullListing.unparsedFirstLineAddress ||
    fullListing.address ||
    listing.address ||
    "Unknown address";

  // Debug listing mismatch
  useEffect(() => {
    console.log("🧪 ListingBottomPanel listing:", {
      listingKey: listing?.listingKey,
      slugAddress: listing?.slugAddress,
      address: listing?.address,
    });
    console.log("🧪 ListingBottomPanel fullListing:", {
      listingKey: fullListing?.listingKey,
      address: fullListing?.unparsedAddress || fullListing?.address,
    });
    if (!listing?.listingKey) {
      console.warn("⚠️ Listing missing listingKey:", listing);
    }
    if (listing?.listingKey && fullListing?.listingKey && listing.listingKey !== fullListing.listingKey) {
      console.warn("⚠️ Listing mismatch: listing.listingKey does not match fullListing.listingKey", {
        listingKey: listing.listingKey,
        fullListingKey: fullListing.listingKey,
      });
    }
  }, [listing, fullListing]);

  const handleSwipe = (dir: "left" | "right") => {
    setExitSwipe(dir);
    setTimeout(() => {
      dir === "left" ? onSwipeLeft?.() : onSwipeRight?.();
      setExitSwipe(null);
    }, 400);
  };

  const getExitAnimation = () => {
    if (exitSwipe === "left") return { x: -450, y: -200, rotateY: -20, rotateX: 15, scaleY: 0.8, skewY: -8, opacity: 0 };
    if (exitSwipe === "right") return { x: 450, y: -200, rotateY: 20, rotateX: 15, scaleY: 0.8, skewY: 8, opacity: 0 };
    return { opacity: 0 };
  };

  const snapBackVariants = {
    snap: {
      x: 0,
      y: 0,
      rotateY: 0,
      rotateX: 0,
      scaleY: 1,
      skewY: 0,
      opacity: 1, // Ensure full opacity on mount
      scale: 1,
      transition: { type: "spring", stiffness: 350, damping: 30 },
    },
  };

  const lgLayoutClasses = clsx({
    "lg:left-[25%] lg:right-[15%]": isFiltersOpen,
    "lg:left-[15%] lg:right-[25%]": isSidebarOpen && !isFiltersOpen,
    "lg:left-[15%] lg:right-[15%]": !isSidebarOpen && !isFiltersOpen,
  });

  return (
    <AnimatePresence>
      {fullListing?.listingKey && (
        <motion.div
          key={fullListing.listingKey} // Ensure unique key for animation
          ref={panelRef}
          initial={{ opacity: 0, y: 50, scale: 0.98 }} // Simplified initial state
          animate={snapBackVariants.snap}
          exit={{
            ...getExitAnimation(),
            transition: { duration: 0.4, ease: [0.42, 0, 0.58, 1] },
          }}
          style={{
            background: "rgba(24, 24, 24, 0.8)", // Fallback background
            backdropFilter: "blur(8px)",
            perspective: 1500,
            rotateY,
            rotateX,
            scaleY,
            skewY,
            boxShadow,
            x,
            y,
          }}
          drag
          dragElastic={0.3}
          dragConstraints={{ left: -300, right: 300, top: -100, bottom: 100 }}
          whileDrag={{ scale: 0.96, opacity: 1 }} // Force opacity during drag
          onDragEnd={(e, info) => {
            const { offset, velocity } = info;
            if (Math.abs(offset.x) < 100 && Math.abs(offset.y) < 100) {
              x.set(0);
              y.set(0);
            } else if (offset.x < -100 || velocity.x < -500) {
              handleSwipe("left");
            } else if (offset.x > 100 || velocity.x > 500) {
              handleSwipe("right");
            } else if (offset.y > 100) {
              onClose();
            }
          }}
          className={clsx(
            "fixed bottom-0 left-0 right-0 z-50 text-white rounded-t-2xl shadow-lg overflow-hidden",
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
                  <p className="text-2xl font-semibold mb-1 leading-tight">{address}</p>
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
                  <span className="bg-zinc-800 px-2 py-1 rounded-full">{fullListing.bedsTotal} Bed</span>
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
                  <span className="bg-zinc-800 px-2 py-1 rounded-full">Built {fullListing.yearBuilt}</span>
                )}
                {fullListing?.poolYn && <span className="bg-zinc-800 px-3 py-1 rounded-full">🏊 Pool</span>}
                {fullListing?.spaYn && <span className="bg-zinc-800 px-3 py-1 rounded-full">🧖 Spa</span>}
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
                <button onClick={() => handleSwipe("left")}>
                  <Image
                    src="/images/swipe-left.png"
                    alt="Swipe Left"
                    width={64}
                    height={64}
                    sizes="(max-width: 768px) 64px, 64px"
                    className="drop-shadow-lg hover:opacity-80 active:scale-95 transition"
                  />
                </button>
                <button onClick={() => handleSwipe("right")}>
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
                href={`/mls-listings/${listing.slugAddress || fullListing.slugAddress || ""}`}
                className="block text-center bg-emerald-500 text-black font-semibold py-2 rounded-md hover:bg-emerald-400 transition"
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