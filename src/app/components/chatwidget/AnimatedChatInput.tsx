"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { Send, Mic, MessageCircle, Loader2 } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { getThemeClasses } from "@/app/themes/themes";

// Fun, substantive placeholder prompts that rotate every 4 seconds
const PLACEHOLDER_PROMPTS = [
  "Show me family-friendly homes in Temecula with pools...",
  "Find luxury condos near the beach under $800k...",
  "What's the market like in Orange County right now?",
  "Compare schools in Irvine vs. Tustin neighborhoods...",
  "I need a 4-bedroom home with a big backyard...",
  "Show me new construction in San Diego County...",
  "What are HOA fees like in gated communities?",
  "Find homes with mountain views in Riverside...",
  "I'm downsizing - show me modern townhomes...",
  "Which neighborhoods have the best appreciation?",
  "Show me homes near top-rated elementary schools...",
  "Find investment properties with good rental income...",
  "What can I afford with a $5,000/month budget?",
  "Compare commute times from San Clemente to LA...",
  "Show me eco-friendly homes with solar panels...",
  "Find homes in walkable neighborhoods with shops...",
  "What's available in Lake Elsinore under $600k?",
  "I need a home office and gym space - what's out there?",
  "Show me properties with RV parking or a 3-car garage...",
  "Which areas have the lowest property taxes?",
  "Find homes with paid-off solar and energy savings...",
  "What's the difference between Murrieta and Menifee?",
  "Show me horse properties with acreage in Norco...",
  "I'm a first-time buyer - where should I start?",
  "Find homes near hiking trails and nature parks...",
];

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
  placeholder,
  className = "",
}: AnimatedChatInputProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { currentTheme } = useTheme();
  const themeClasses = getThemeClasses(currentTheme);
  const isLight = currentTheme === "lightgradient";

  // Rotating placeholder prompts with crossfade
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [displayPlaceholder, setDisplayPlaceholder] = useState(
    placeholder || PLACEHOLDER_PROMPTS[0]
  );
  const [isPlaceholderFading, setIsPlaceholderFading] = useState(false);

  // Rotate placeholder every 4 seconds with crossfade effect (only if no custom placeholder provided)
  useEffect(() => {
    if (placeholder) {
      setDisplayPlaceholder(placeholder);
      return;
    }

    const interval = setInterval(() => {
      // Start fade out
      setIsPlaceholderFading(true);

      // After fade out completes, change text and fade in
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_PROMPTS.length);
        setIsPlaceholderFading(false);
      }, 300); // Half of transition duration for crossfade effect
    }, 4000);

    return () => clearInterval(interval);
  }, [placeholder]);

  // Update display placeholder when index changes
  useEffect(() => {
    if (!placeholder) {
      setDisplayPlaceholder(PLACEHOLDER_PROMPTS[placeholderIndex]);
    }
  }, [placeholderIndex, placeholder]);

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
      position: 'fixed' as const,
      bottom: '32px',
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
            <div className={`relative backdrop-blur-xl rounded-2xl shadow-2xl transition-all ${
              isLight
                ? 'bg-white/90 border border-gray-300/50 hover:border-gray-400/50'
                : 'bg-neutral-900/90 border border-neutral-700/50 hover:border-neutral-600/50'
            }`}>
              {/* Custom animated placeholder overlay */}
              {!input && (
                <div
                  className={`absolute left-4 md:left-6 top-3 md:top-4 pointer-events-none transition-opacity duration-600 ${
                    isLight ? 'text-gray-500' : 'text-neutral-500'
                  } ${isPlaceholderFading ? 'opacity-0' : 'opacity-100'}`}
                  style={{ fontSize: '16px' }}
                >
                  {displayPlaceholder}
                </div>
              )}

              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder=""
                rows={1}
                disabled={isStreaming}
                className={`w-full bg-transparent px-4 md:px-6 py-3 md:py-4 pr-24 md:pr-28 focus:outline-none resize-none max-h-32 overflow-y-auto scrollbar-thin md:text-base text-left ${
                  isLight
                    ? 'text-gray-900 scrollbar-thumb-gray-400 scrollbar-track-transparent'
                    : 'text-white scrollbar-thumb-neutral-700 scrollbar-track-transparent'
                }`}
                style={{ minHeight: '56px', fontSize: '16px', textAlign: 'left', direction: 'ltr' }}
              />

              {/* Streaming indicator */}
              <AnimatePresence>
                {isStreaming && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`absolute left-6 top-full mt-2 text-xs flex items-center gap-2 ${
                      isLight ? 'text-purple-600' : 'text-purple-400'
                    }`}
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
                  className={`p-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed group ${
                    isLight ? 'hover:bg-gray-100' : 'hover:bg-neutral-800'
                  }`}
                >
                  <Mic className={`w-5 h-5 transition-colors ${
                    isLight
                      ? 'text-gray-600 group-hover:text-purple-600'
                      : 'text-neutral-400 group-hover:text-purple-400'
                  }`} />
                </motion.button>

                {/* Send button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming}
                  className={`p-2.5 rounded-lg transition-all ${
                    !input.trim() || isStreaming
                      ? isLight
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-neutral-700 cursor-not-allowed'
                      : 'bg-gradient-to-br from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/50'
                  }`}
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
