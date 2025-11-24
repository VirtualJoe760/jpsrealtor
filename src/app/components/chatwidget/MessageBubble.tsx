/**
 * Individual message bubble component
 * Extracted from IntegratedChatWidget.tsx
 */
"use client";

import React from "react";
import { motion } from "framer-motion";
import { MapPin, Home, User, Bot } from "lucide-react";
import { useRouter } from "next/navigation";

import type { DisplayMessage } from "@/types/chat";
import type { Listing } from "@/app/components/chat/ListingCarousel";
import { parseMarkdown } from "@/app/utils/chat/parseMarkdown";
import ListingCarousel from "@/app/components/chat/ListingCarousel";
import ChatMapView from "@/app/components/chat/ChatMapView";
import CMAMessage from "@/app/components/chat/CMAMessage";

export interface MessageBubbleProps {
  message: DisplayMessage;
  index: number;
  isLight: boolean;
  onViewOnMap?: (listings: Listing[]) => void;
}

export default function MessageBubble({
  message,
  index,
  isLight,
  onViewOnMap,
}: MessageBubbleProps) {
  const router = useRouter();
  const isUser = message.role === "user";

  return (
    <div
      className={`flex gap-4 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && (
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

      <div
        className={`max-w-xl rounded-2xl px-6 py-4 backdrop-blur-sm ${
          isUser
            ? isLight
              ? "bg-blue-100 text-gray-900 shadow-lg shadow-blue-200/40"
              : "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
            : isLight
              ? "bg-gray-100 text-gray-900 shadow-lg shadow-gray-200/40"
              : "bg-neutral-800 text-neutral-100 shadow-lg shadow-neutral-900/30"
        }`}
        style={{ userSelect: 'text', WebkitUserSelect: 'text', MozUserSelect: 'text' }}
      >
        {/* Loading animation */}
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
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  className="w-2 h-2 bg-purple-400 rounded-full"
                />
              ))}
            </motion.div>
            <span className="text-purple-300 leading-relaxed">
              {parseMarkdown(message.content, isLight)}
            </span>
          </div>
        ) : (
          <p className="whitespace-pre-wrap leading-relaxed">
            {parseMarkdown(message.content, isLight)}
          </p>
        )}

        {/* Listing Map and Carousel */}
        {message.listings && message.listings.length > 0 && (
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
                searchFilters={message.searchFilters}
              />
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 15,
                delay: 0.3,
              }}
              className="mt-3 space-y-2"
            >
              {/* Subdivision/City Page Button */}
              {message.locationMetadata &&
               (message.locationMetadata.type === "subdivision" ||
                message.locationMetadata.type === "city") && (
                <motion.button
                  onClick={() => {
                    const meta = message.locationMetadata!;
                    if (meta.type === "subdivision" && meta.cityId && meta.slug) {
                      router.push(`/neighborhoods/${meta.cityId}/${meta.slug}`);
                    } else if (meta.type === "city" && meta.cityId) {
                      router.push(`/neighborhoods/${meta.cityId}`);
                    }
                  }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 md:py-3 px-3 md:px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  <Home className="w-4 h-4 md:w-5 md:h-5" />
                  <span>
                    {message.locationMetadata.type === "subdivision"
                      ? `Explore ${message.locationMetadata.name}`
                      : `Explore ${message.locationMetadata.name} Neighborhoods`}
                  </span>
                </motion.button>
              )}

              {/* View on Full Map Button */}
              {onViewOnMap && (
                <motion.button
                  onClick={() => onViewOnMap(message.listings!)}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-2.5 md:py-3 px-3 md:px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                  <span>View on Full Map</span>
                </motion.button>
              )}
            </motion.div>

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
              <ListingCarousel listings={message.listings} />
            </motion.div>
          </>
        )}

        {/* CMA Report */}
        {message.cmaReport && (
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
            <CMAMessage report={message.cmaReport} />
          </motion.div>
        )}
      </div>

      {isUser && (
        <motion.div
          initial={{ scale: 0, rotate: 180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: index * 0.08 + 0.1,
          }}
          className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center flex-shrink-0 shadow-lg"
        >
          <User className="w-5 h-5 text-white" />
        </motion.div>
      )}
    </div>
  );
}
