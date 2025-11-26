"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot } from "lucide-react";
import Image from "next/image";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useChatContext } from "./ChatProvider";
import ListingCarousel from "./ListingCarousel";
import ChatMapView from "./ChatMapView";

export default function ChatWidget() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { messages, addMessage } = useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message;
    setMessage("");
    addMessage(userMessage, "user");
    setIsLoading(true);

    try {
      // Call AI API
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: userMessage },
          ],
          userId: "demo-user",
          userTier: "free",
        }),
      });

      const data = await response.json();

      if (data.success && data.response) {
        // Parse response for listings
        const listingsMatch = data.response.match(/\[LISTING_CAROUSEL\](.*?)\[\/LISTING_CAROUSEL\]/s);
        let listings = null;

        if (listingsMatch) {
          try {
            const carouselData = JSON.parse(listingsMatch[1]);
            listings = carouselData.listings;
          } catch (e) {
            console.error("Failed to parse listings:", e);
          }
        }

        // Clean response text
        const cleanText = data.response
          .replace(/\[LISTING_CAROUSEL\].*?\[\/LISTING_CAROUSEL\]/gs, "")
          .replace(/\[MAP_VIEW\].*?\[\/MAP_VIEW\]/gs, "")
          .trim();

        addMessage(cleanText, "assistant", listings || undefined);
      }
    } catch (error) {
      console.error("Chat error:", error);
      addMessage("Sorry, something went wrong. Please try again.", "assistant");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showLanding = messages.length === 0;

  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Landing View */}
      <AnimatePresence>
        {showLanding && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="flex-1 flex items-center justify-center"
          >
            <div className="w-full max-w-2xl md:max-w-4xl flex flex-col items-center gap-6 md:gap-8 px-4">
              {/* Logo & Brand */}
              <div className="flex items-center justify-center gap-3">
                <motion.div
                  whileHover={{ scale: 1.1, rotateY: 15, rotateX: 5 }}
                  className="w-20 h-20 md:w-24 md:h-24"
                >
                  <Image
                    src={isLight ? "/images/brand/exp-Realty-Logo-black.png" : "/images/brand/EXP-white-square.png"}
                    alt="eXp Realty"
                    width={96}
                    height={96}
                    className="object-contain"
                    priority
                  />
                </motion.div>

                <div
                  className={`h-12 w-px ${
                    isLight
                      ? "bg-gradient-to-b from-transparent via-gray-400/50 to-transparent"
                      : "bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"
                  }`}
                />

                <h1 className={`text-3xl md:text-6xl font-light tracking-wider ${isLight ? "text-gray-900" : "text-white"}`}>
                  JPSREALTOR
                </h1>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversation View */}
      {!showLanding && (
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.map((msg, index) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}

              <div className="max-w-3xl flex flex-col gap-4">
                <div
                  className={`rounded-2xl px-6 py-4 ${
                    msg.role === "user"
                      ? isLight
                        ? "bg-blue-100 text-gray-900"
                        : "bg-purple-600 text-white"
                      : isLight
                        ? "bg-gray-100 text-gray-900"
                        : "bg-neutral-800 text-neutral-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                {/* Listing Carousel */}
                {msg.listings && msg.listings.length > 0 && (
                  <ListingCarousel
                    listings={msg.listings}
                    title={`${msg.listings.length} properties found`}
                  />
                )}

                {/* Map View */}
                {msg.listings && msg.listings.length > 0 && (
                  <ChatMapView listings={msg.listings} />
                )}
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className={`rounded-2xl px-6 py-4 ${isLight ? "bg-gray-100" : "bg-neutral-800"}`}>
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Chat Input */}
      <div className="p-4">
        <div className="max-w-4xl mx-auto">
          <div
            className={`relative rounded-2xl backdrop-blur-md shadow-lg ${
              isLight ? "bg-white/80 border border-gray-300" : "bg-neutral-800/50 border border-neutral-700/50"
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
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about real estate..."
              disabled={isLoading}
              className={`w-full px-6 py-4 pr-14 bg-transparent outline-none rounded-2xl ${
                isLight ? "text-gray-900 placeholder-gray-500" : "text-white placeholder-gray-400"
              }`}
            />
            <button
              onClick={handleSend}
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
      </div>
    </div>
  );
}
