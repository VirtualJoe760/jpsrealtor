// src/app/components/mls/map/SwipeCompletionModal.tsx
"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Heart, X } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";

interface SwipeCompletionModalProps {
  isOpen: boolean;
  favoritesCount: number;
  onClose: () => void;
}

export default function SwipeCompletionModal({
  isOpen,
  favoritesCount,
  onClose,
}: SwipeCompletionModalProps) {
  const router = useRouter();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  if (!isOpen) return null;

  const handleViewFavorites = () => {
    router.push("/dashboard");
  };

  const handleContinueBrowsing = () => {
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${
          isLight ? 'bg-black/40' : 'bg-black/80'
        }`}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className={`rounded-2xl shadow-2xl max-w-md w-full p-8 relative ${
            isLight
              ? 'bg-white border-2 border-gray-300'
              : 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-gray-700'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
              isLight ? 'hover:bg-gray-200' : 'hover:bg-gray-700/50'
            }`}
          >
            <X className={`w-5 h-5 ${isLight ? 'text-gray-600' : 'text-gray-400'}`} />
          </button>

          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
            </div>
          </div>

          {/* Title */}
          <h2 className={`text-3xl font-bold text-center mb-3 ${
            isLight ? 'text-gray-900' : 'text-white'
          }`}>
            Swipe Queue Complete!
          </h2>

          {/* Message */}
          <p className={`text-center mb-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
            You have finished the swipe queue.
            {favoritesCount > 0 && " Would you like to review your favorites in your dashboard?"}
          </p>

          {/* Favorites Count */}
          {favoritesCount > 0 && (
            <div className={`rounded-lg p-4 mb-6 ${
              isLight
                ? 'bg-pink-100 border border-pink-300'
                : 'bg-red-500/10 border border-red-500/30'
            }`}>
              <div className="flex items-center justify-center space-x-2">
                <Heart className={`w-5 h-5 fill-current ${
                  isLight ? 'text-pink-600' : 'text-red-400'
                }`} />
                <p className={`font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  You have {favoritesCount} favorite{favoritesCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {favoritesCount > 0 && (
              <button
                onClick={handleViewFavorites}
                className={`w-full py-3 px-4 font-semibold rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 ${
                  isLight
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black text-white'
                }`}
              >
                <Heart className="w-5 h-5" />
                <span>Review Your Favorites</span>
              </button>
            )}

            <button
              onClick={handleContinueBrowsing}
              className={`w-full py-3 px-4 font-semibold rounded-lg transition-all duration-200 ${
                isLight
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-900 border border-gray-300'
                  : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600'
              }`}
            >
              Continue Browsing
            </button>
          </div>

          {/* Additional info */}
          <p className={`text-sm text-center mt-4 ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
            Move to a different area on the map to discover more properties
          </p>
        </div>
      </div>
    </>
  );
}
