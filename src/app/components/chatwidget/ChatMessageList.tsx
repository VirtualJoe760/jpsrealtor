"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Loader2 } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import ChatMessage from "./ChatMessage";
import ScrollToBottomButton from "./ScrollToBottomButton";
import type { Listing } from "@/app/components/chat/ListingCarousel";

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  listings?: Listing[];
  searchFilters?: any;
  disambiguationOptions?: any[];
  cmaData?: any;
}

interface ChatMessageListProps {
  messages: DisplayMessage[];
  streamingMessage: string;
  isStreaming: boolean;
  onViewOnMap?: (listings: Listing[]) => void;
  onSelectionChange?: (messageId: string, selectedListings: Listing[]) => void;
  onGenerateCMA?: (messageId: string, selectedListings: Listing[]) => void;
  selectedListingsPerMessage?: Record<string, Listing[]>;
  generatedCMAData?: Record<string, any>;
  generatingCMA?: boolean;
}

export default function ChatMessageList({
  messages,
  streamingMessage,
  isStreaming,
  onViewOnMap,
  onSelectionChange,
  onGenerateCMA,
  selectedListingsPerMessage = {},
  generatedCMAData = {},
  generatingCMA = false,
}: ChatMessageListProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  // Detect when user scrolls manually
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const atBottom = distanceFromBottom < 100;

      setIsAtBottom(atBottom);
      setIsUserScrolling(!atBottom);
      setShowScrollTop(scrollTop > 300);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll only if user is at bottom
  useEffect(() => {
    if (isAtBottom && !isUserScrolling) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingMessage, isAtBottom, isUserScrolling]);

  const scrollToBottom = () => {
    messagesContainerRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Top gradient fade */}
      <div
        className={`absolute top-0 left-0 right-0 h-24 pointer-events-none z-20 ${
          isLight
            ? "bg-gradient-to-b from-gray-50 via-gray-50/80 to-transparent"
            : "bg-gradient-to-b from-black via-black/80 to-transparent"
        }`}
      />

      {/* Bottom gradient fade */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-20 ${
          isLight
            ? "bg-gradient-to-t from-gray-50 via-gray-50/80 to-transparent"
            : "bg-gradient-to-t from-black via-black/80 to-transparent"
        }`}
      />

      {/* Messages container */}
      <motion.div
        ref={messagesContainerRef}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        transition={{ type: "spring", stiffness: 100, damping: 20, duration: 0.6 }}
        className="h-full overflow-y-auto px-4 pt-24 pb-36 space-y-4 relative z-10 max-w-4xl mx-auto w-full [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {messages.map((message, index) => (
          <ChatMessage
            key={message.id || index}
            message={message}
            index={index}
            isLight={isLight}
            onViewOnMap={onViewOnMap}
            onSelectionChange={onSelectionChange}
            onGenerateCMA={onGenerateCMA}
            selectedListings={selectedListingsPerMessage[message.id] || []}
            generatedCMAData={generatedCMAData[message.id]}
            generatingCMA={generatingCMA}
          />
        ))}

        {/* Streaming message loader */}
        {streamingMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4 justify-start"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0"
            >
              <Bot className="w-5 h-5 text-white" />
            </motion.div>
            <motion.div
              className={`max-w-xl rounded-2xl px-6 py-4 backdrop-blur-sm ${
                isLight
                  ? "bg-gray-100 text-gray-900 shadow-lg shadow-gray-200/40"
                  : "bg-neutral-800 text-neutral-100 shadow-lg shadow-neutral-900/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">{streamingMessage}</span>
              </div>
            </motion.div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </motion.div>

      {/* Scroll to Top Button */}
      <ScrollToBottomButton show={showScrollTop} onClick={scrollToBottom} isLight={isLight} />
    </div>
  );
}
