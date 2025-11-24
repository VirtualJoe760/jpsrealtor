// src/app/components/modals/SwipeCompletionModal.tsx
// Completion modal shown when user finishes swiping through all listings in a subdivision

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Heart } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import type { SwipeCompletionModalProps } from "@/types/swipe";

export default function SwipeCompletionModal({
  isOpen,
  subdivision,
  subdivisionSlug,
  cityId,
  favoritesCount,
  totalCount,
  onViewFavorites,
  onKeepBrowsing,
  onClose,
}: SwipeCompletionModalProps) {
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
            onClick={onClose}
            className={`fixed inset-0 z-[9999] ${
              isLight
                ? "bg-black/40 backdrop-blur-sm"
                : "bg-black/60 backdrop-blur-md"
            }`}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] w-[90%] max-w-md rounded-2xl p-8 shadow-2xl ${
              isLight
                ? "bg-white border border-gray-200"
                : "bg-gray-900 border border-gray-700"
            }`}
          >
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div
                className={`rounded-full p-4 ${
                  isLight
                    ? "bg-emerald-100"
                    : "bg-emerald-900/30"
                }`}
              >
                <CheckCircle
                  className={`w-12 h-12 ${
                    isLight ? "text-emerald-600" : "text-emerald-400"
                  }`}
                />
              </div>
            </div>

            {/* Title */}
            <h2
              className={`text-2xl font-bold text-center mb-3 ${
                isLight ? "text-gray-900" : "text-white"
              }`}
            >
              All Done! 🎉
            </h2>

            {/* Message */}
            <p
              className={`text-center mb-2 ${
                isLight ? "text-gray-700" : "text-gray-300"
              }`}
            >
              You've finished reviewing all homes in
            </p>
            <p
              className={`text-center font-bold text-lg mb-6 ${
                isLight ? "text-blue-600" : "text-emerald-400"
              }`}
            >
              {subdivision}
            </p>

            {/* Stats */}
            {favoritesCount > 0 && (
              <div
                className={`flex items-center justify-center gap-2 mb-6 p-4 rounded-lg ${
                  isLight
                    ? "bg-blue-50 border border-blue-200"
                    : "bg-emerald-900/20 border border-emerald-700/50"
                }`}
              >
                <Heart
                  className={`w-5 h-5 ${
                    isLight ? "text-red-500" : "text-red-400"
                  }`}
                  fill="currentColor"
                />
                <span
                  className={`font-semibold ${
                    isLight ? "text-gray-900" : "text-white"
                  }`}
                >
                  {favoritesCount} favorite{favoritesCount !== 1 ? "s" : ""}
                </span>
                <span
                  className={isLight ? "text-gray-600" : "text-gray-400"}
                >
                  out of {totalCount}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* View Favorites Button */}
              {favoritesCount > 0 && (
                <button
                  onClick={onViewFavorites}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                    isLight
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl"
                      : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg hover:shadow-xl"
                  }`}
                >
                  <Heart className="w-5 h-5" />
                  View My Favorites
                </button>
              )}

              {/* Keep Browsing Button */}
              <button
                onClick={onKeepBrowsing}
                className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 ${
                  isLight
                    ? "bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300"
                    : "bg-gray-800 hover:bg-gray-700 text-white border border-gray-600"
                }`}
              >
                Keep Browsing
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
