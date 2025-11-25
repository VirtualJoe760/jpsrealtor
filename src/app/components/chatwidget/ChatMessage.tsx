// src/app/components/chatwidget/ChatMessage.tsx
// Individual chat message component with support for text, carousel, and map views

"use client";

import React from "react";
import { motion } from "framer-motion";
import { Bot, MapPin } from "lucide-react";
import { parseMarkdown } from "@/lib/markdown-parser";
import { parseAIResponse } from "@/lib/message-parser";
import ListingCarousel, { type Listing } from "@/app/components/chat/ListingCarousel";
import ChatMapView from "@/app/components/chat/ChatMapView";

export interface ChatMessageProps {
  message: {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: Date;
    isLoading?: boolean;
    listings?: Listing[];
    searchFilters?: any;
    disambiguationOptions?: any[];
    cmaData?: any;
  };
  index: number;
  isLight: boolean;
  onViewOnMap?: (listings: Listing[]) => void;
  onSelectionChange?: (messageId: string, selectedListings: Listing[]) => void;
  onGenerateCMA?: (messageId: string, selectedListings: Listing[]) => void;
  selectedListings?: Listing[];
  generatedCMAData?: any;
  generatingCMA?: boolean;
}

export default function ChatMessage({
  message,
  index,
  isLight,
  onViewOnMap,
  onSelectionChange,
  onGenerateCMA,
  selectedListings = [],
  generatedCMAData,
  generatingCMA = false,
}: ChatMessageProps) {
  // Parse AI responses for component markers
  // DEBUG: Log what we receive
  console.log("[ChatMessage] Received message:", {
    id: message.id,
    role: message.role,
    hasListings: !!message.listings,
    listingsCount: message.listings?.length || 0,
    hasSearchFilters: !!message.searchFilters,
    hasCmaData: !!message.cmaData,
  });

  // Parse AI responses for component markers
  const parsed = message.role === "assistant"
  // DEBUG: Log parsing details
  console.log("[ChatMessage] Message content length:", message.content?.length || 0);
  console.log("[ChatMessage] Message content preview:", message.content?.substring(0, 200));
  console.log("[ChatMessage] Has LISTING_CAROUSEL marker:", message.content?.includes('[LISTING_CAROUSEL]'));
  console.log("[ChatMessage] Parsed result:", { 
    hasCarousel: !!parsed.carousel, 
    carouselListings: parsed.carousel?.listings?.length || 0,
    hasMap: !!parsed.map,
    textLength: parsed.text?.length || 0
  });
    ? parseAIResponse(message.content)
    : { text: message.content, carousel: null, map: null };

  // Log parsed components for debugging
  if (message.role === "assistant" && (parsed.carousel || parsed.map)) {
    console.log("[CHAT-MESSAGE] Parsed components:", {
      hasCarousel: !!parsed.carousel,
      carouselListings: parsed.carousel?.listings?.length || 0,
      hasMap: !!parsed.map,
      mapListings: parsed.map?.listings?.length || 0,
    });
  }

  return (
    <motion.div
      key={message.id || index}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 120,
        damping: 15,
        delay: index * 0.08,
        duration: 0.5,
      }}
      className={`flex gap-4 ${
        message.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      {/* Assistant Avatar */}
      {message.role === "assistant" && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: index * 0.08 + 0.1,
          }}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0"
        >
          <Bot className="w-5 h-5 text-white" />
        </motion.div>
      )}

      <div className="flex flex-col gap-4 max-w-4xl w-full">
        {/* Text content */}
        {parsed.text && (
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`rounded-2xl px-6 py-4 backdrop-blur-sm ${
              message.role === "user"
                ? isLight
                  ? "bg-blue-100 text-gray-900 shadow-lg shadow-blue-200/40"
                  : "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                : isLight
                  ? "bg-gray-100 text-gray-900 shadow-lg shadow-gray-200/40"
                  : "bg-neutral-800 text-neutral-100 shadow-lg shadow-neutral-900/30"
            }`}
          >
            {/* Loading animation for search */}
            {message.isLoading ? (
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="flex gap-1"
                >
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: 0,
                    }}
                    className="w-2 h-2 bg-purple-400 rounded-full"
                  />
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: 0.2,
                    }}
                    className="w-2 h-2 bg-purple-400 rounded-full"
                  />
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: 0.4,
                    }}
                    className="w-2 h-2 bg-purple-400 rounded-full"
                  />
                </motion.div>
                <span className="text-purple-300 leading-relaxed">
                  {parseMarkdown(parsed.text, isLight)}
                </span>
              </div>
            ) : (
              <p className="whitespace-pre-wrap leading-relaxed">
                {parseMarkdown(parsed.text, isLight)}
              </p>
            )}
          </motion.div>
        )}

        {/* Listing Carousel from component markers */}
        {parsed.carousel && parsed.carousel.listings && parsed.carousel.listings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 15,
              delay: 0.3,
            }}
            className="w-full"
          >
            <ListingCarousel
              listings={parsed.carousel.listings}
              title={parsed.carousel.title}
              onSelectionChange={onSelectionChange ? (selected) => onSelectionChange(message.id, selected) : undefined}
              selectedListings={selectedListings}
            />
          </motion.div>
        )}

        {/* Map View from component markers */}
        {parsed.map && parsed.map.listings && parsed.map.listings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 15,
              delay: 0.4,
            }}
            className="w-full"
          >
            <ChatMapView listings={parsed.map.listings} />
          </motion.div>
        )}

        {/* Legacy: Listing Map and Carousel (for backwards compatibility) */}
        {message.listings && message.listings.length > 0 && !parsed.carousel && !parsed.map && (
          <>
            {/* Map View */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 15,
                delay: 0.2,
              }}
              className="mt-4"
            >
              <ChatMapView
                listings={message.listings}
                searchFilters={(message as any).searchFilters}
              />
            </motion.div>

            {/* View on Full Map Button */}
            {onViewOnMap && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 100,
                  damping: 15,
                  delay: 0.3,
                }}
                className="mt-3"
              >
                <motion.button
                  onClick={() => onViewOnMap(message.listings!)}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-2.5 md:py-3 px-3 md:px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                  <span>View on Full Map</span>
                </motion.button>
              </motion.div>
            )}

            {/* Listing Carousel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 15,
                delay: 0.4,
              }}
              className="mt-4"
            >
              <ListingCarousel
                listings={message.listings}
                title={`${message.listings.length} properties found`}
                onSelectionChange={onSelectionChange ? (selected) => onSelectionChange(message.id, selected) : undefined}
                selectedListings={selectedListings}
              />
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  );
}
