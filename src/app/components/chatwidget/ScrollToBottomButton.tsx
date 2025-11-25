// src/app/components/chatwidget/ScrollToBottomButton.tsx
// Floating button to scroll to bottom of chat

"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface ScrollToBottomButtonProps {
  show: boolean;
  onClick: () => void;
  isLight: boolean;
}

export default function ScrollToBottomButton({ show, onClick, isLight }: ScrollToBottomButtonProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClick}
          className={`fixed bottom-24 right-8 z-50 p-3 rounded-full shadow-lg transition-colors ${
            isLight
              ? "bg-white text-gray-800 hover:bg-gray-100"
              : "bg-neutral-800 text-white hover:bg-neutral-700"
          }`}
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
