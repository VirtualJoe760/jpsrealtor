// src/app/components/MigrationToast.tsx
// Toast notification for localStorage migration to database

"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { X, Heart, ThumbsDown, Check } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";

interface MigrationToastProps {
  favoritesCount: number;
  dislikesCount: number;
  onDismiss: () => void;
}

export default function MigrationToast({
  favoritesCount,
  dislikesCount,
  onDismiss,
}: MigrationToastProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const totalCount = favoritesCount + dislikesCount;

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 6000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: 20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`
        fixed top-20 right-6 z-[60] w-80 max-w-[calc(100vw-3rem)]
        rounded-xl shadow-2xl backdrop-blur-md border
        ${isLight
          ? "bg-white/95 border-gray-200"
          : "bg-gray-900/95 border-gray-700"
        }
      `}
      style={{
        backdropFilter: "blur(20px) saturate(150%)",
        WebkitBackdropFilter: "blur(20px) saturate(150%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <div className={`
            p-1.5 rounded-lg
            ${isLight ? "bg-green-100 text-green-600" : "bg-green-900/40 text-green-400"}
          `}>
            <Check className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`font-semibold text-sm ${isLight ? "text-gray-900" : "text-white"}`}>
              Saved to Your Account
            </h3>
            <p className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>
              {totalCount} {totalCount === 1 ? 'listing' : 'listings'} migrated
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className={`
            p-1 rounded-lg transition-colors
            ${isLight
              ? "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              : "hover:bg-gray-800 text-gray-500 hover:text-gray-300"
            }
          `}
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="px-3 pb-3">
        <p className={`text-xs ${isLight ? "text-gray-600" : "text-gray-400"} mb-2`}>
          We saved your preferences from before you logged in:
        </p>

        {favoritesCount > 0 && (
          <div className="flex items-center gap-2 mb-1.5">
            <Heart className={`w-3.5 h-3.5 ${isLight ? "text-red-500" : "text-red-400"}`} fill="currentColor" />
            <span className={`text-xs ${isLight ? "text-gray-700" : "text-gray-300"}`}>
              {favoritesCount} favorite{favoritesCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {dislikesCount > 0 && (
          <div className="flex items-center gap-2">
            <ThumbsDown className={`w-3.5 h-3.5 ${isLight ? "text-gray-500" : "text-gray-400"}`} />
            <span className={`text-xs ${isLight ? "text-gray-700" : "text-gray-300"}`}>
              {dislikesCount} dislike{dislikesCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        <p className={`text-xs mt-2 font-medium ${isLight ? "text-green-600" : "text-green-400"}`}>
          ✓ Available on all your devices
        </p>
      </div>

      {/* Success indicator */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-xl ${isLight ? "bg-green-500" : "bg-green-600"}`}
      />
    </motion.div>
  );
}
