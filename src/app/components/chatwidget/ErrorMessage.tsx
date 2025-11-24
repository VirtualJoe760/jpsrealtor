/**
 * Error message display component
 * Extracted from IntegratedChatWidget.tsx
 */
"use client";

import React from "react";
import { motion } from "framer-motion";

export interface ErrorMessageProps {
  error: string;
  isLight: boolean;
}

export default function ErrorMessage({ error, isLight }: ErrorMessageProps) {
  if (!error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 150,
        damping: 15,
      }}
      className={`rounded-lg px-4 py-3 shadow-lg backdrop-blur-sm ${
        isLight
          ? "bg-red-50 border border-red-300 text-red-800 shadow-red-200/30"
          : "bg-red-900/50 border border-red-700 text-red-200 shadow-red-900/30"
      }`}
    >
      {error}
    </motion.div>
  );
}
