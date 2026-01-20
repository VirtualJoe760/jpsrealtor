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
  isLight: boolean;
  textPrimary: string;
  textSecondary: string;
}

export default function RemovedListingsModal({
  isOpen,
  removedListings,
  onContinue,
  isLight,
  textPrimary,
  textSecondary,
}: RemovedListingsModalProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleContinue = () => {
    setIsClosing(true);
    onContinue();
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
              className={`w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl ${
                isLight ? "bg-white" : "bg-gray-900"
              }`}
            >
              {/* Header */}
              <div
                className={`p-6 border-b ${isLight ? "border-gray-200" : "border-gray-700"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isLight ? "bg-amber-100" : "bg-amber-900/30"
                      }`}
                    >
                      <AlertCircle className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <h2 className={`text-2xl font-bold ${textPrimary}`}>
                        Listings No Longer Available
                      </h2>
                      <p className={`${textSecondary} text-sm mt-1`}>
                        {removedListings.length}{" "}
                        {removedListings.length === 1 ? "listing has" : "listings have"} been
                        removed from the market
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleContinue}
                    className={`p-2 rounded-lg transition-colors ${
                      isLight
                        ? "hover:bg-gray-100 text-gray-500"
                        : "hover:bg-gray-800 text-gray-400"
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
                <p className={`${textSecondary} text-sm mb-6`}>
                  The following properties were previously in your favorites but are no longer
                  listed on the MLS. They may have been sold, taken off the market, or are
                  otherwise unavailable.
                </p>

                <div className="space-y-3">
                  {removedListings.map(({ listing }) => (
                    <div
                      key={listing.listingKey}
                      className={`flex items-center gap-4 p-4 rounded-lg border ${
                        isLight ? "border-gray-200 bg-gray-50" : "border-gray-700 bg-gray-800/50"
                      }`}
                    >
                      {/* Photo */}
                      <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-300">
                        <div
                          className={`w-full h-full flex items-center justify-center ${
                            isLight ? "bg-gray-200" : "bg-gray-700"
                          }`}
                        >
                          <ImageOff className="w-8 h-8 text-gray-400" />
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
                        <div className={`flex items-center gap-3 text-xs ${textSecondary} mt-1`}>
                          <span>{listing.bedsTotal ?? 0} bd</span>
                          <span>{listing.bathroomsTotalInteger ?? 0} ba</span>
                          <span>{listing.livingArea?.toLocaleString() ?? 0} sqft</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
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

              {/* Footer */}
              <div
                className={`p-6 border-t ${isLight ? "border-gray-200" : "border-gray-700"}`}
              >
                <button
                  onClick={handleContinue}
                  disabled={isClosing}
                  className={`w-full px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                    isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"
                  } disabled:opacity-50`}
                >
                  {isClosing ? "Continuing..." : "Continue to Dashboard"}
                </button>
                <p className={`text-xs ${textSecondary} text-center mt-3`}>
                  These listings have been automatically hidden from your favorites
                </p>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
