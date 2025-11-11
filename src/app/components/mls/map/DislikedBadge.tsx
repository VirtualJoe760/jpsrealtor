// src/app/components/mls/map/DislikedBadge.tsx
"use client";

import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

type Props = {
  timestamp: number;
  onRemove: () => void;
};

export default function DislikedBadge({ timestamp, onRemove }: Props) {
  const [isRemoving, setIsRemoving] = useState(false);

  const getTimeAgo = (ts: number): string => {
    const now = Date.now();
    const diff = now - ts;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRemoving(true);
    setTimeout(() => {
      onRemove();
    }, 200); // Wait for animation
  };

  return (
    <AnimatePresence>
      {!isRemoving && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="absolute top-16 right-3 z-[90] flex items-center gap-2 bg-red-500/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-red-400/30 group"
        >
          <button
            onClick={handleRemove}
            className="w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            aria-label="Remove from disliked"
            title="Click to un-dislike this listing"
          >
            <X className="w-3 h-3 text-white" />
          </button>
          <span className="text-xs font-semibold text-white">
            Disliked {getTimeAgo(timestamp)}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
