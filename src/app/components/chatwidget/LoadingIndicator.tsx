/**
 * Loading indicator with progress
 * Extracted from IntegratedChatWidget.tsx
 */
"use client";

import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export interface LoadingIndicatorProps {
  loadingProgress: string;
  isLight: boolean;
}

export default function LoadingIndicator({
  loadingProgress,
  isLight,
}: LoadingIndicatorProps) {
  if (!loadingProgress) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{
        type: "spring",
        stiffness: 150,
        damping: 15,
      }}
      className={`flex items-center gap-3 text-sm backdrop-blur-sm rounded-full px-4 py-2 shadow-lg ${
        isLight
          ? "text-gray-700 bg-white/80"
          : "text-neutral-400 bg-neutral-800/50"
      }`}
    >
      <Loader2 className={`w-4 h-4 animate-spin ${isLight ? "text-blue-500" : "text-purple-400"}`} />
      <span>{loadingProgress}</span>
    </motion.div>
  );
}
