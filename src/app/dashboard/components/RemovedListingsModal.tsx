// src/app/dashboard/components/RemovedListingsModal.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, ImageOff } from "lucide-react";
import ListingPhoto from "../../components/ListingPhoto";
import { RemovedListing } from "../utils/types";

interface RemovedListingsModalProps {
  isOpen: boolean;
  removedListings: RemovedListing[];
  onContinue: () => void;
  onMoveToWatched?: () => void | Promise<void>; // Callback after moving to watched (can be async)
  isLight: boolean;
  textPrimary: string;
  textSecondary: string;
}

export default function RemovedListingsModal({
  isOpen,
  removedListings,
  onContinue,
  onMoveToWatched,
  isLight,
  textPrimary,
  textSecondary,
}: RemovedListingsModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const handleMoveToWatched = async () => {
    if (removedListings.length === 0) {
      onContinue();
      return;
    }

    try {
      setIsMoving(true);

      // Extract listing keys
      const listingKeys = removedListings.map((r) => r.listingKey);

      console.log(`[RemovedListingsModal] Moving ${listingKeys.length} listings to watched addresses`);

      // Call API to move to watched addresses
      const response = await fetch("/api/user/watched-addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingKeys }),
      });

      if (!response.ok) {
        throw new Error(`Failed to move listings: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[RemovedListingsModal] Successfully moved ${result.movedCount} listings to watched addresses`);

      // Trigger refresh callback if provided and wait for it to complete
      if (onMoveToWatched) {
        console.log('[RemovedListingsModal] Calling onMoveToWatched callback...');
        await onMoveToWatched();
        console.log('[RemovedListingsModal] Refresh complete');
      }

      // Close modal after refresh completes
      setIsClosing(true);
      onContinue();
    } catch (error) {
      console.error("[RemovedListingsModal] Error moving to watched addresses:", error);
      // Still close the modal even on error
      setIsClosing(true);
      onContinue();
    } finally {
      setIsMoving(false);
    }
  };

  const handleContinue = () => {
    // Move to watched addresses before closing
    handleMoveToWatched();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
            onClick={handleContinue}
          >
            {/* Modal - Click inside won't close */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col ${
                isLight ? "bg-white" : "bg-gray-900"
              }`}
            >
              {/* Header - Fixed */}
              <div
                className={`p-4 border-b flex-shrink-0 ${isLight ? "border-gray-200" : "border-gray-700"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isLight ? "bg-amber-100" : "bg-amber-900/30"
                      }`}
                    >
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <h2 className={`text-xl font-bold ${textPrimary}`}>
                        Listings No Longer Available
                      </h2>
                      <p className={`${textSecondary} text-xs mt-0.5`}>
                        {removedListings.length}{" "}
                        {removedListings.length === 1 ? "listing has" : "listings have"} been
                        removed from the market
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleContinue}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isLight
                        ? "hover:bg-gray-100 text-gray-500"
                        : "hover:bg-gray-800 text-gray-400"
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Content - Scrollable */}
              <div className="p-4 overflow-y-auto flex-1">
                <p className={`${textSecondary} text-xs mb-3`}>
                  The following properties were previously in your favorites but are no longer
                  listed on the MLS. They may have been sold, taken off the market, or are
                  otherwise unavailable. We'll move them to your "Watched Addresses" and notify
                  you if they come back on the market.
                </p>

                <div className="space-y-2">
                  {removedListings.map(({ listing }) => (
                    <div
                      key={listing.listingKey}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        isLight ? "border-gray-200 bg-gray-50" : "border-gray-700 bg-gray-800/50"
                      }`}
                    >
                      {/* Photo */}
                      <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-300">
                        <div
                          className={`w-full h-full flex items-center justify-center ${
                            isLight ? "bg-gray-200" : "bg-gray-700"
                          }`}
                        >
                          <ImageOff className="w-6 h-6 text-gray-400" />
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${textPrimary} text-sm`}>
                          ${listing.listPrice?.toLocaleString() || "N/A"}
                        </p>
                        <p className={`text-xs ${textSecondary} truncate`}>
                          {listing.address || listing.unparsedAddress || "No address"}
                        </p>
                        <div className={`flex items-center gap-2 text-xs ${textSecondary} mt-0.5`}>
                          <span>{listing.bedsTotal ?? 0} bd</span>
                          <span>{listing.bathroomsTotalInteger ?? 0} ba</span>
                          <span>{listing.livingArea?.toLocaleString() ?? 0} sqft</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                          isLight
                            ? "bg-red-100 text-red-700"
                            : "bg-red-900/40 text-red-300"
                        }`}
                      >
                        Off Market
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer - Fixed at bottom */}
              <div
                className={`p-4 border-t flex-shrink-0 ${isLight ? "border-gray-200" : "border-gray-700"}`}
              >
                <button
                  onClick={handleContinue}
                  disabled={isClosing || isMoving}
                  className={`w-full px-6 py-2.5 rounded-lg font-medium text-white transition-colors ${
                    isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
                  } disabled:opacity-50`}
                >
                  {isMoving ? "Moving to Watched Addresses..." : isClosing ? "Continuing..." : "Move to Watched & Continue"}
                </button>
                <p className={`text-xs ${textSecondary} text-center mt-2`}>
                  We'll monitor these addresses and alert you when they're back on the market
                </p>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
