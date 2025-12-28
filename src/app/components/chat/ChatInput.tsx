"use client";

import { Send, SquarePen } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";

interface ChatInputProps {
  message: string;
  setMessage: (message: string) => void;
  onSend: () => void;
  onNewChat?: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  placeholder?: string;
  showNewChatButton?: boolean;
  variant?: "landing" | "conversation" | "map";
  className?: string;
}

export default function ChatInput({
  message,
  setMessage,
  onSend,
  onNewChat,
  onKeyPress,
  onKeyDown,
  isLoading,
  placeholder = "Ask me anything about real estate...",
  showNewChatButton = false,
  variant = "conversation",
  className = "",
}: ChatInputProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // iOS Safari fix: Force viewport recalculation when keyboard closes
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Force a layout recalculation to fix "frozen" state after keyboard closes
    if (typeof window !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
      // Method 1: Force a minimal scroll to trigger reflow
      window.scrollTo(0, 0);

      // Method 2: Force immediate viewport height recalculation
      setTimeout(() => {
        // Trigger a reflow by reading a layout property
        const _ = document.body.offsetHeight;

        // Force repaint by toggling a style
        document.body.style.transform = 'translateZ(0)';
        requestAnimationFrame(() => {
          document.body.style.transform = '';
        });
      }, 100);
    }
  };

  // Landing variant - prominent, centered
  if (variant === "landing") {
    return (
      <div className={`w-full max-w-[700px] relative ${className}`}>
        <div
          className={`relative rounded-2xl backdrop-blur-md ${
            isLight
              ? "bg-white/80 border border-gray-300 shadow-[0_8px_32px_rgba(59,130,246,0.15),0_4px_16px_rgba(0,0,0,0.1)]"
              : "bg-neutral-800/50 border border-neutral-700/50 shadow-[0_8px_32px_rgba(16,185,129,0.2),0_4px_16px_rgba(0,0,0,0.3)]"
          }`}
          style={{
            backdropFilter: "blur(10px) saturate(150%)",
            WebkitBackdropFilter: "blur(10px) saturate(150%)",
          }}
        >
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={onKeyPress}
            onKeyDown={onKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={isLoading}
            autoComplete="off"
            className={`w-full px-6 py-4 pr-28 bg-transparent outline-none rounded-2xl text-base font-medium tracking-[-0.01em] ${
              isLight ? "text-gray-900 placeholder-gray-400" : "text-white placeholder-neutral-400"
            }`}
            style={{ fontSize: '16px' }} // Prevent iOS zoom on focus
          />
          {showNewChatButton && onNewChat && (
            <button
              onClick={onNewChat}
              title="Start new conversation"
              className={`absolute right-16 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all ${
                isLight
                  ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  : "bg-neutral-700 hover:bg-neutral-600 text-neutral-300"
              }`}
              data-tour="new-chat-button"
            >
              <SquarePen className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onSend}
            disabled={!message.trim() || isLoading}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all ${
              message.trim() && !isLoading
                ? isLight
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-purple-600 hover:bg-purple-700 text-white"
                : isLight
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-neutral-700 text-neutral-500 cursor-not-allowed"
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Map variant - bottom fixed with gear icon
  if (variant === "map") {
    return (
      <div className={`fixed bottom-[92px] sm:bottom-4 left-4 right-4 z-30 md:left-1/2 md:-translate-x-1/2 md:max-w-3xl ${className}`} style={{ pointerEvents: 'auto' }}>
        <div
          className={`relative rounded-2xl backdrop-blur-md shadow-2xl ${
            isLight ? "bg-white/90 border border-gray-300" : "bg-neutral-800/90 border border-neutral-700/50"
          }`}
          style={{
            backdropFilter: "blur(20px) saturate(150%)",
            WebkitBackdropFilter: "blur(20px) saturate(150%)",
          }}
        >
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={onKeyPress}
            onKeyDown={onKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={isLoading}
            autoComplete="off"
            className={`w-full px-6 py-4 pr-24 bg-transparent outline-none rounded-2xl text-base font-medium tracking-[-0.01em] ${
              isLight ? "text-gray-900 placeholder-gray-400" : "text-white placeholder-neutral-400"
            }`}
            style={{ fontSize: '16px' }} // Prevent iOS zoom on focus
          />
          {/* Settings Gear Button - opens map controls */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Dispatch custom event to toggle map controls
              window.dispatchEvent(new CustomEvent('toggleMapControls'));
            }}
            className={`absolute right-14 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all hover:scale-110 active:scale-95 ${
              isLight
                ? "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                : "text-neutral-500 hover:text-emerald-400 hover:bg-emerald-500/10"
            }`}
            aria-label="Map Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          {/* Search icon for map mode */}
          <div className={`absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl ${
            isLight ? "text-gray-400" : "text-neutral-500"
          }`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // Conversation variant - bottom floating with gradient mask
  return (
    <div
      className={`fixed bottom-0 left-0 pr-[10px] pl-3 sm:px-4 pb-[100px] sm:pb-4 pt-6 z-30 backdrop-blur-xl md:relative md:bottom-auto md:left-auto md:right-auto md:pr-4 md:pb-4 md:backdrop-blur-none ${
        isLight ? 'bg-gradient-to-t from-white/90 via-white/70 to-transparent' : 'bg-gradient-to-t from-black/70 via-black/50 to-transparent'
      } ${className}`}
      style={{
        right: '10px',
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 100%)',
      }}
    >
      <div className="max-w-4xl mx-auto relative">
        <div
          className={`relative rounded-2xl backdrop-blur-md ${
            isLight
              ? "bg-white/95 border-2 border-gray-300 shadow-[0_12px_48px_rgba(59,130,246,0.2),0_8px_24px_rgba(0,0,0,0.12)]"
              : "bg-neutral-800/80 border-2 border-neutral-700/70 shadow-[0_12px_48px_rgba(16,185,129,0.25),0_8px_24px_rgba(0,0,0,0.4)]"
          }`}
          style={{
            backdropFilter: "blur(10px) saturate(150%)",
            WebkitBackdropFilter: "blur(10px) saturate(150%)",
          }}
        >
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={onKeyPress}
            onKeyDown={onKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={isLoading}
            autoComplete="off"
            className={`w-full px-4 sm:px-6 py-4 sm:py-4 pr-24 sm:pr-28 bg-transparent outline-none rounded-2xl text-base sm:text-[15px] font-medium tracking-[-0.01em] ${
              isLight ? "text-gray-900 placeholder-gray-500" : "text-white placeholder-neutral-400"
            }`}
            style={{ fontSize: '16px' }} // Prevent iOS zoom on focus
          />
          {showNewChatButton && onNewChat && (
            <button
              onClick={onNewChat}
              title="Start new conversation"
              className={`absolute right-14 sm:right-16 top-1/2 -translate-y-1/2 p-2.5 sm:p-2.5 rounded-xl transition-all active:scale-95 ${
                isLight
                  ? "bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700"
                  : "bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-500 text-neutral-300"
              }`}
              data-tour="new-chat-button"
            >
              <SquarePen className="w-5 h-5 sm:w-5 sm:h-5" />
            </button>
          )}
          <button
            onClick={onSend}
            disabled={!message.trim() || isLoading}
            className={`absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-2.5 sm:p-2.5 rounded-xl transition-all active:scale-95 ${
              message.trim() && !isLoading
                ? isLight
                  ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg"
                  : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-lg"
                : isLight
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-neutral-700 text-neutral-500 cursor-not-allowed"
            }`}
          >
            <Send className="w-5 h-5 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
