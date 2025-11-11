// src/app/components/mls/map/DislikedResetDialog.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";

type Props = {
  isOpen: boolean;
  dislikedCount: number;
  onReset: () => void;
  onClose: () => void;
};

export default function DislikedResetDialog({
  isOpen,
  dislikedCount,
  onReset,
  onClose,
}: Props) {
  const handleReset = () => {
    onReset();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000]"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10001] w-[90vw] max-w-md"
          >
            <div className="bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 px-6 py-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Disliked Properties Limit
                    </h2>
                    <p className="text-sm text-zinc-400">
                      You've reached {dislikedCount}+ disliked properties
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                <p className="text-zinc-300 leading-relaxed mb-4">
                  You've disliked over {dislikedCount} properties recently. Would you like
                  to reset your dislikes to review them again?
                </p>
                <p className="text-sm text-zinc-400">
                  Resetting will clear all disliked properties from your history, giving
                  you a fresh start.
                </p>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-zinc-950/50 border-t border-zinc-800 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
                >
                  Keep Filtering
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
                >
                  Reset All
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
