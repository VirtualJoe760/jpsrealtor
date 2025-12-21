// src/app/components/NotificationToast.tsx
// Notification toast for Market Snapshot messages

"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageSquare } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";

interface NotificationToastProps {
  message: string;
  locationName: string;
  onDismiss: () => void;
  onClick: () => void;
}

export default function NotificationToast({
  message,
  locationName,
  onDismiss,
  onClick,
}: NotificationToastProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 8000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  // Truncate message to first 120 characters
  const truncatedMessage = message.length > 120
    ? message.substring(0, 120) + "..."
    : message;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, x: 20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`
        fixed top-20 right-6 z-[60] w-96 max-w-[calc(100vw-3rem)]
        rounded-2xl shadow-2xl backdrop-blur-md border cursor-pointer
        ${isLight
          ? "bg-white/95 border-gray-200"
          : "bg-gray-900/95 border-gray-700"
        }
      `}
      onClick={onClick}
      style={{
        backdropFilter: "blur(20px) saturate(150%)",
        WebkitBackdropFilter: "blur(20px) saturate(150%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className={`
            p-2 rounded-lg
            ${isLight ? "bg-blue-100 text-blue-600" : "bg-emerald-900/40 text-emerald-400"}
          `}>
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`font-semibold text-sm ${isLight ? "text-gray-900" : "text-white"}`}>
              Market Snapshot Ready
            </h3>
            <p className={`text-xs ${isLight ? "text-gray-500" : "text-gray-400"}`}>
              {locationName}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className={`
            p-1.5 rounded-lg transition-colors
            ${isLight
              ? "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
              : "hover:bg-gray-800 text-gray-400 hover:text-gray-200"
            }
          `}
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message Preview */}
      <div className="p-4 pt-3">
        <p className={`text-sm leading-relaxed ${isLight ? "text-gray-700" : "text-gray-300"}`}>
          {truncatedMessage}
        </p>
      </div>

      {/* Footer CTA */}
      <div className={`
        px-4 pb-4 pt-2 text-xs font-medium
        ${isLight ? "text-blue-600" : "text-emerald-400"}
      `}>
        Click to view full details →
      </div>

      {/* Pulsing indicator */}
      <motion.div
        className={`absolute top-4 right-4 w-2 h-2 rounded-full ${isLight ? "bg-blue-500" : "bg-emerald-500"}`}
        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
      />
    </motion.div>
  );
}
