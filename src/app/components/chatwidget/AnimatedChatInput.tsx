"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Send, Mic, MessageCircle, Loader2 } from "lucide-react";

interface AnimatedChatInputProps {
  mode: 'landing' | 'conversation' | 'minimized';
  onSend: (message: string) => void;
  onMicClick: () => void;
  onMinimizedClick?: () => void;
  isStreaming?: boolean;
  streamingText?: string;
  placeholder?: string;
  className?: string;
}

export default function AnimatedChatInput({
  mode,
  onSend,
  onMicClick,
  onMinimizedClick,
  isStreaming = false,
  streamingText = "",
  placeholder = "Where do you want to see Real Estate?",
  className = "",
}: AnimatedChatInputProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  // Auto-focus on mode change
  useEffect(() => {
    if (mode !== 'minimized' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Animation variants for input position
  const variants = {
    landing: {
      scale: 1,
      opacity: 1,
    },
    conversation: {
      position: 'absolute' as const,
      bottom: '24px',
      left: '50%',
      x: '-50%',
      scale: 1,
      opacity: 1,
    },
    minimized: {
      position: 'fixed' as const,
      bottom: '24px',
      right: '24px',
      scale: 1,
      opacity: 1,
    },
  };

  return (
    <motion.div
      layout
      animate={mode}
      variants={variants}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
        mass: 0.8,
      }}
      className={`${mode === 'landing' ? 'z-10' : 'z-40'} ${className} ${
        mode === 'landing' ? 'relative w-full' :
        mode === 'conversation' ? 'w-[90%] max-w-3xl' :
        'w-16 h-16'
      }`}
    >
      <AnimatePresence mode="wait">
        {mode === 'minimized' ? (
          // Minimized floating button
          <motion.button
            key="minimized"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onMinimizedClick}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-2xl hover:shadow-purple-500/50 transition-shadow group"
          >
            <MessageCircle className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
          </motion.button>
        ) : (
          // Expanded input
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative"
          >
            {/* Main input container */}
            <div className="relative bg-neutral-900/90 backdrop-blur-xl border border-neutral-700/50 rounded-2xl shadow-2xl hover:border-neutral-600/50 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={1}
                disabled={isStreaming}
                className="w-full bg-transparent px-4 md:px-6 py-3 md:py-4 pr-24 md:pr-28 text-white placeholder:text-neutral-500 focus:outline-none resize-none max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent text-sm md:text-base"
                style={{ minHeight: '56px' }}
              />

              {/* Streaming indicator */}
              <AnimatePresence>
                {isStreaming && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute left-6 top-full mt-2 text-xs text-purple-400 flex items-center gap-2"
                  >
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>AI is thinking...</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons */}
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                {/* Voice button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onMicClick}
                  disabled={isStreaming}
                  className="p-2.5 rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <Mic className="w-5 h-5 text-neutral-400 group-hover:text-purple-400 transition-colors" />
                </motion.button>

                {/* Send button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming}
                  className="p-2.5 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-neutral-700 disabled:to-neutral-700 hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                >
                  <Send className="w-5 h-5 text-white" />
                </motion.button>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
