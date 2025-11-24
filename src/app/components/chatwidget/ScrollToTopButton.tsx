/**
 * Scroll to top button component
 * Extracted from IntegratedChatWidget.tsx
 */
"use client";

import React, { RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface ScrollToTopButtonProps {
  show: boolean;
  containerRef: RefObject<HTMLDivElement>;
  chatMode: string;
}

export default function ScrollToTopButton({
  show,
  containerRef,
  chatMode,
}: ScrollToTopButtonProps) {
  return (
    <AnimatePresence>
      {show && chatMode === "conversation" && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            containerRef.current?.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }}
          className="fixed bottom-24 right-4 md:right-8 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-shadow"
        >
          <svg
            className="w-5 h-5 md:w-6 md:h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
