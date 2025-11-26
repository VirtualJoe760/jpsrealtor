// src/app/chap/page.tsx
// Chap - Chat + Map integrated property discovery experience

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, MapPin, Home, Sparkles } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { MLSProvider } from "@/app/components/mls/MLSProvider";
import ListingCarousel, { type Listing } from "@/app/components/chat/ListingCarousel";
import ChatMapView from "@/app/components/chat/ChatMapView";
import Image from "next/image";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  listings?: Listing[];
  mapData?: {
    listings: Listing[];
    center: { lat: number; lng: number };
    zoom: number;
  };
}

// Parse AI response to extract component data
function parseAIResponse(content: string): {
  text: string;
  listingCarousel?: { title: string; listings: Listing[] };
  mapView?: { listings: Listing[]; center: { lat: number; lng: number }; zoom: number };
} {
  let text = content;
  let listingCarousel: { title: string; listings: Listing[] } | undefined;
  let mapView: { listings: Listing[]; center: { lat: number; lng: number }; zoom: number } | undefined;

  // Extract [LISTING_CAROUSEL]...[/LISTING_CAROUSEL]
  const carouselMatch = content.match(/\[LISTING_CAROUSEL\]\s*([\s\S]*?)\s*\[\/LISTING_CAROUSEL\]/);
  if (carouselMatch) {
    try {
      const jsonStr = carouselMatch[1].trim();
      listingCarousel = JSON.parse(jsonStr);
      text = text.replace(carouselMatch[0], "").trim();
    } catch (e) {
      console.error("Failed to parse LISTING_CAROUSEL:", e);
    }
  }

  // Extract [MAP_VIEW]...[/MAP_VIEW]
  const mapMatch = content.match(/\[MAP_VIEW\]\s*([\s\S]*?)\s*\[\/MAP_VIEW\]/);
  if (mapMatch) {
    try {
      const jsonStr = mapMatch[1].trim();
      mapView = JSON.parse(jsonStr);
      text = text.replace(mapMatch[0], "").trim();
    } catch (e) {
      console.error("Failed to parse MAP_VIEW:", e);
    }
  }

  // Clean up any remaining markers or excessive whitespace
  text = text.replace(/\[LISTING_CAROUSEL\]|\[\/LISTING_CAROUSEL\]|\[MAP_VIEW\]|\[\/MAP_VIEW\]/g, "").trim();
  text = text.replace(/\n{3,}/g, "\n\n");

  return { text, listingCarousel, mapView };
}

function ChapContent() {
  const {
    currentTheme,
    cardBg,
    cardBorder,
    textPrimary,
    textSecondary,
  } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Generate unique ID for messages
  const generateId = () => Math.random().toString(36).substring(2, 15);

  // Send message to AI
  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;

    setShowLanding(false);
    setIsLoading(true);

    // Add user message
    const userMsgId = generateId();
    const newUserMessage: Message = {
      id: userMsgId,
      role: "user",
      content: userMessage.trim(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue("");

    try {
      // Build conversation history for context
      const conversationHistory = [
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user", content: userMessage.trim() },
      ];

      // Call the chat API
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversationHistory,
          userId: "chap-user-" + generateId(),
          userTier: "free",
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Unknown error");
      }

      // Parse AI response for component markers
      const parsed = parseAIResponse(data.response);

      // Add assistant message with parsed data
      const assistantMsgId = generateId();
      const assistantMessage: Message = {
        id: assistantMsgId,
        role: "assistant",
        content: parsed.text,
        listings: parsed.listingCarousel?.listings,
        mapData: parsed.mapView,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);

      // Add error message
      const errorMsgId = generateId();
      const errorMessage: Message = {
        id: errorMsgId,
        role: "assistant",
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [messages, isLoading]);

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  // Quick action buttons for landing
  const quickActions = [
    { label: "Homes in Palm Desert", query: "Show me homes in Palm Desert" },
    { label: "La Quinta properties", query: "Show me properties in La Quinta" },
    { label: "Palm Desert Country Club", query: "Show me homes in Palm Desert Country Club" },
    { label: "Indian Wells homes", query: "Find homes in Indian Wells" },
  ];

  return (
    <div className="flex flex-col h-screen">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {showLanding ? (
          // Landing view
          <div className="flex flex-col items-center justify-center min-h-full px-4 py-8">
            <div className="text-center max-w-2xl">
              {/* Logo */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <Image
                  src="/exp-logo.svg"
                  alt="eXp Realty"
                  width={80}
                  height={80}
                  className="w-16 h-16 md:w-20 md:h-20"
                />
                <span className={`text-4xl md:text-5xl font-bold tracking-tight ${textPrimary}`}>
                  JPSREALTOR
                </span>
              </div>

              {/* Tagline */}
              <p className={`text-lg md:text-xl mb-8 ${textSecondary}`}>
                Your AI-powered property discovery assistant
              </p>

              {/* Quick actions */}
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.query)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-105 ${
                      isLight
                        ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                        : "bg-gray-800 text-gray-200 hover:bg-gray-700"
                    }`}
                  >
                    <MapPin className="inline-block w-4 h-4 mr-1 -mt-0.5" />
                    {action.label}
                  </button>
                ))}
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                <div className={`p-4 rounded-xl ${cardBg} ${cardBorder} border`}>
                  <Home className={`w-8 h-8 mb-2 ${isLight ? "text-blue-600" : "text-emerald-400"}`} />
                  <h3 className={`font-semibold mb-1 ${textPrimary}`}>Find Properties</h3>
                  <p className={`text-sm ${textSecondary}`}>
                    Search by city, subdivision, or specific criteria
                  </p>
                </div>
                <div className={`p-4 rounded-xl ${cardBg} ${cardBorder} border`}>
                  <MapPin className={`w-8 h-8 mb-2 ${isLight ? "text-blue-600" : "text-emerald-400"}`} />
                  <h3 className={`font-semibold mb-1 ${textPrimary}`}>Interactive Maps</h3>
                  <p className={`text-sm ${textSecondary}`}>
                    See listings on a map with price markers
                  </p>
                </div>
                <div className={`p-4 rounded-xl ${cardBg} ${cardBorder} border`}>
                  <Sparkles className={`w-8 h-8 mb-2 ${isLight ? "text-blue-600" : "text-emerald-400"}`} />
                  <h3 className={`font-semibold mb-1 ${textPrimary}`}>AI Insights</h3>
                  <p className={`text-sm ${textSecondary}`}>
                    Get market analysis and investment metrics
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Chat messages
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] ${message.role === "user" ? "" : "w-full"}`}>
                  {/* Message bubble */}
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      message.role === "user"
                        ? isLight
                          ? "bg-blue-600 text-white"
                          : "bg-blue-600 text-white"
                        : isLight
                          ? "bg-gray-100 text-gray-900"
                          : "bg-gray-800 text-gray-100"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {/* Listing Carousel */}
                  {message.listings && message.listings.length > 0 && (
                    <div className="mt-4">
                      <ListingCarousel
                        listings={message.listings}
                        title={`${message.listings.length} properties found`}
                      />
                    </div>
                  )}

                  {/* Map View */}
                  {message.mapData && message.mapData.listings.length > 0 && (
                    <div className="mt-4">
                      <ChatMapView
                        listings={message.mapData.listings}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className={`px-4 py-3 rounded-2xl ${isLight ? "bg-gray-100" : "bg-gray-800"}`}>
                  <div className="flex items-center gap-2">
                    <Loader2 className={`w-4 h-4 animate-spin ${isLight ? "text-gray-600" : "text-gray-400"}`} />
                    <span className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                      Searching properties...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className={`border-t ${isLight ? "border-gray-200 bg-white" : "border-gray-800 bg-gray-900"}`}>
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 py-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask me about properties in the Coachella Valley..."
              disabled={isLoading}
              className={`w-full px-4 py-3 pr-12 rounded-full border transition-all focus:outline-none focus:ring-2 ${
                isLight
                  ? "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-transparent"
                  : "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-gray-500 focus:border-transparent"
              } disabled:opacity-50`}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all disabled:opacity-50 ${
                isLight
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-700 text-white hover:bg-gray-600"
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ChapPage() {
  return (
    <MLSProvider>
      <ChapContent />
    </MLSProvider>
  );
}
