// src/app/components/mls/map/SwipeCompletionModal.tsx
"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Heart, X } from "lucide-react";

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
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-gray-700 rounded-2xl shadow-2xl max-w-md w-full p-8 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-700/50 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>

          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-white text-center mb-3">
            Swipe Queue Complete!
          </h2>

          {/* Message */}
          <p className="text-gray-300 text-center mb-2">
            You have finished the swipe queue.
            {favoritesCount > 0 && " Would you like to review your favorites in your dashboard?"}
          </p>

          {/* Favorites Count */}
          {favoritesCount > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2">
                <Heart className="w-5 h-5 text-red-400 fill-red-400" />
                <p className="text-white font-semibold">
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
                className="w-full py-3 px-4 bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black text-white font-semibold rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Heart className="w-5 h-5" />
                <span>Review Your Favorites</span>
              </button>
            )}

            <button
              onClick={handleContinueBrowsing}
              className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg border border-gray-600 transition-all duration-200"
            >
              Continue Browsing
            </button>
          </div>

          {/* Additional info */}
          <p className="text-gray-500 text-sm text-center mt-4">
            Move to a different area on the map to discover more properties
          </p>
        </div>
      </div>
    </>
  );
}
