// src/app/components/chat/EndOfQueueModal.tsx
// Modal shown when user finishes swiping through all listings in neighborhood

"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { Heart, MessageSquare, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface EndOfQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewFavorites: () => void;
  onContinueChat: () => void;
  neighborhoodName?: string;
  totalSwiped?: number;
  totalLiked?: number;
}

export default function EndOfQueueModal({
  isOpen,
  onClose,
  onViewFavorites,
  onContinueChat,
  neighborhoodName,
  totalSwiped = 0,
  totalLiked = 0,
}: EndOfQueueModalProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${
                isLight
                  ? "bg-white border border-gray-200"
                  : "bg-neutral-900 border border-neutral-700"
              }`}
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className={`absolute top-4 right-4 p-2 rounded-full transition-colors z-10 ${
                  isLight
                    ? "hover:bg-gray-100 text-gray-600"
                    : "hover:bg-neutral-800 text-neutral-400"
                }`}
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className={`px-6 pt-6 pb-4 text-center ${
                isLight
                  ? "bg-gradient-to-b from-blue-50 to-transparent"
                  : "bg-gradient-to-b from-emerald-950/30 to-transparent"
              }`}>
                <div className="flex justify-center mb-4">
                  <div className={`p-4 rounded-full ${
                    isLight
                      ? "bg-blue-100"
                      : "bg-emerald-900/50"
                  }`}>
                    <Heart className={`w-8 h-8 ${
                      isLight ? "text-blue-600" : "text-emerald-400"
                    }`} />
                  </div>
                </div>

                <h2 className={`text-2xl font-bold mb-2 ${
                  isLight ? "text-gray-900" : "text-white"
                }`}>
                  You've Seen Them All!
                </h2>

                <p className={`text-sm ${
                  isLight ? "text-gray-600" : "text-neutral-400"
                }`}>
                  {neighborhoodName && (
                    <span className="block mb-1">
                      Finished browsing <span className="font-semibold">{neighborhoodName}</span>
                    </span>
                  )}
                  {totalSwiped > 0 && (
                    <span>
                      You viewed {totalSwiped} {totalSwiped === 1 ? 'property' : 'properties'}
                      {totalLiked > 0 && ` and liked ${totalLiked}`}
                    </span>
                  )}
                </p>
              </div>

              {/* Actions */}
              <div className="px-6 py-6 space-y-3">
                {/* View Favorites Button */}
                {totalLiked > 0 && (
                  <button
                    onClick={onViewFavorites}
                    className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all ${
                      isLight
                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/30"
                        : "bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/30"
                    }`}
                  >
                    <Heart className="w-5 h-5 fill-current" />
                    <span>View My {totalLiked} Favorite{totalLiked !== 1 ? 's' : ''}</span>
                  </button>
                )}

                {/* Continue Chatting Button */}
                <button
                  onClick={onContinueChat}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all ${
                    totalLiked > 0
                      ? isLight
                        ? "bg-gray-200 text-gray-900 hover:bg-gray-300"
                        : "bg-neutral-800 text-white hover:bg-neutral-700"
                      : isLight
                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/30"
                        : "bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-emerald-500/30"
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>Continue Chatting</span>
                </button>

                {/* Alternative: Search Another Area */}
                <button
                  onClick={onContinueChat}
                  className={`w-full px-6 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isLight
                      ? "text-gray-600 hover:bg-gray-100"
                      : "text-neutral-400 hover:bg-neutral-800"
                  }`}
                >
                  Search Another Area
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
