"use client";

import { motion, AnimatePresence } from "framer-motion";
import { SquarePen } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";

interface NewChatModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function NewChatModal({ isOpen, onConfirm, onCancel }: NewChatModalProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[9998]"
            onClick={onCancel}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            <div
              className={`rounded-2xl p-8 shadow-2xl w-full max-w-md backdrop-blur-md ${
                isLight
                  ? 'bg-white border border-gray-200'
                  : 'bg-neutral-900/60 border border-neutral-700/50'
              }`}
              style={{
                backdropFilter: "blur(20px) saturate(150%)",
                WebkitBackdropFilter: "blur(20px) saturate(150%)",
              }}
            >
              {/* Icon */}
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${
                isLight ? 'bg-blue-100' : 'bg-purple-500/10 border border-purple-500/20'
              }`}>
                <SquarePen className={`w-7 h-7 ${
                  isLight ? 'text-blue-600' : 'text-purple-300'
                }`} />
              </div>

              {/* Title */}
              <h3 className={`text-2xl font-bold mb-3 ${
                isLight ? 'text-gray-900' : 'text-neutral-100'
              }`}>
                Start New Conversation?
              </h3>

              {/* Description */}
              <p className={`text-base mb-8 leading-relaxed ${
                isLight ? 'text-gray-600' : 'text-neutral-400'
              }`}>
                This will clear your current chat history. Your conversation will be permanently deleted and cannot be recovered.
              </p>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className={`flex-1 px-5 py-3 rounded-xl font-semibold transition-all ${
                    isLight
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:shadow-md'
                      : 'bg-neutral-800/50 hover:bg-neutral-700/50 text-neutral-300 border border-neutral-700/50 hover:border-neutral-600/50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  className={`flex-1 px-5 py-3 rounded-xl font-semibold text-white transition-all ${
                    isLight
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                      : 'bg-purple-600/90 hover:bg-purple-600 border border-purple-500/30 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30'
                  }`}
                >
                  Start New Chat
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
