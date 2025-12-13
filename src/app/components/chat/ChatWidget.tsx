"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Copy, Check, Share, SquarePen, Loader2, MapPin, Building2, Home, Map as MapIcon, Globe2 } from "lucide-react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSession } from "next-auth/react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useChatContext, ComponentData } from "./ChatProvider";
import { useMapControl } from "@/app/hooks/useMapControl";
import ListingCarousel from "./ListingCarousel";
import ChatMapView from "./ChatMapView";
import { ArticleResults } from "./ArticleCard";
import { AppreciationCard } from "../analytics/AppreciationCard";
import { ComparisonCard } from "../analytics/ComparisonCard";
import ListingBottomPanel from "../mls/map/ListingBottomPanel";
import { useMLSContext } from "../mls/MLSProvider";
import ChatHeader from "./ChatHeader";
import { SourceBubbles } from "./SourceBubble";
import type { Listing } from "./ListingCarousel";

export default function ChatWidget() {
  const { data: session } = useSession();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const { messages, addMessage, clearMessages } = useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Autocomplete suggestions
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  // Debounced search for autocomplete
  useEffect(() => {
    if (message.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(message)}`);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          setSuggestions(data.results);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error('Autocomplete error:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [message]);

  // Map control for showing listings on background map
  const { showMapWithListings, showMapAtLocation, hideMap, isMapVisible, prePositionMap } = useMapControl();

  // ListingBottomPanel state for swipe functionality
  const [showListingPanel, setShowListingPanel] = useState(false);
  const [currentListingQueue, setCurrentListingQueue] = useState<Listing[]>([]);
  const [currentListingIndex, setCurrentListingIndex] = useState(0);
  const { likedListings, dislikedListings, toggleFavorite, swipeLeft: toggleDislike, removeDislike } = useMLSContext();

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShare = async (text: string) => {
    const shareData = {
      title: "JPS Realtor",
      text: text,
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(text);
        setCopiedId("share-fallback");
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      // User cancelled or error
      console.error("Share failed:", err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message;
    setMessage("");
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);

    // If map is visible, this is a map search, not an AI chat
    if (isMapVisible) {
      console.log('🗺️ [ChatWidget] Map search query:', userMessage);
      // Map search will be handled by autocomplete selection
      // Don't send to AI
      return;
    }

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
          userTier: "premium",
        }),
      });

      const data = await response.json();

      if (data.success && data.response) {
        // Natural word-by-word streaming reveal effect
        setIsLoading(false);
        setIsStreaming(true);
        const fullText = data.response;
        const components: ComponentData | undefined = data.components;

        // Split into words and preserve whitespace/punctuation
        const words = fullText.split(/(\s+)/); // Preserves spaces between words
        let currentWordIndex = 0;
        let displayedText = "";

        const intervalId = setInterval(() => {
          if (currentWordIndex < words.length) {
            displayedText += words[currentWordIndex];
            setStreamingText(displayedText);
            currentWordIndex++;

            // Smooth scroll every 5 words to reduce jank
            if (currentWordIndex % 10 === 0 || currentWordIndex === words.length) {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }
          } else {
            clearInterval(intervalId);
            setIsStreaming(false);
            setStreamingText("");
            addMessage(fullText, "assistant", undefined, components);
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

            // Pre-position map in background if listings are returned (WITHOUT revealing it)
            // User will click "Open in Map View" button to reveal the already-positioned map
            if (components?.carousel?.listings && components.carousel.listings.length > 0) {
              console.log('🗺️ [ChatWidget] Pre-positioning map (hidden) with', components.carousel.listings.length, 'listings');

              // Calculate center from listings or use mapView center
              const centerLat = components.mapView?.center?.lat || components.carousel.listings[0]?.latitude || 33.8303;
              const centerLng = components.mapView?.center?.lng || components.carousel.listings[0]?.longitude || -116.5453;
              const zoom = components.mapView?.zoom || 12;

              // Build filters from searchFilters if provided by AI
              const mapFilters: any = {};

              if (components.mapView?.searchFilters) {
                const sf = components.mapView.searchFilters;
                if (sf.subdivision) mapFilters.subdivision = sf.subdivision;
                if (sf.city) mapFilters.city = sf.city;
                if (sf.county) mapFilters.county = sf.county;
                if (sf.minPrice) mapFilters.minPrice = sf.minPrice.toString();
                if (sf.maxPrice) mapFilters.maxPrice = sf.maxPrice.toString();
                if (sf.beds) mapFilters.beds = sf.beds.toString();
                if (sf.baths) mapFilters.baths = sf.baths.toString();
                if (sf.propertyType) mapFilters.propertyType = sf.propertyType;

                console.log('🗺️ [ChatWidget] Using search filters from AI:', sf);
              }

              // Pre-position map with filters so subdivision boundaries load
              prePositionMap(components.carousel.listings, {
                centerLat,
                centerLng,
                zoom
              });

              // Also load listings with the filters to get subdivision data
              if (components.mapView?.searchFilters?.subdivision) {
                console.log('🗺️ [ChatWidget] Loading subdivision data:', components.mapView.searchFilters.subdivision);
                const bounds = {
                  north: centerLat + 0.05,
                  south: centerLat - 0.05,
                  east: centerLng + 0.05,
                  west: centerLng - 0.05,
                  zoom
                };
                loadListings(bounds, mapFilters);
              }
            }

            // TODO: Play notification sound when AI responds while map is visible
            // if (isMapVisible) {
            //   playNotificationSound();
            // }
          }
        }, 15); // 15ms per word - faster reveal
      } else {
        // Handle API errors gracefully
        setIsLoading(false);
        setIsStreaming(false);
        setStreamingText("");
        const errorMessage = data.error || data.details || "something went wrong";
        addMessage(
          `I apologize, but I encountered an issue: ${errorMessage}.\n\nPlease try rephrasing your question or try again in a moment.`,
          "assistant"
        );
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch (error) {
      console.error("Chat error:", error);
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingText("");
      addMessage(
        "I apologize, but I'm having trouble connecting right now. Please check your connection and try again in a moment.",
        "assistant"
      );
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Handle autocomplete navigation
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        return;
      }

      if (e.key === "Enter" && selectedSuggestionIndex >= 0) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedSuggestionIndex]);
        return;
      }
    }

    // Normal enter to send
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Get icon and subtitle for suggestion type
  const getSuggestionDisplay = (suggestion: any) => {
    const iconClass = `w-5 h-5 flex-shrink-0 ${isLight ? "text-blue-600" : "text-emerald-400"}`;

    switch (suggestion.type) {
      case "ai":
        return {
          icon: (
            <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          ),
          subtitle: "",
          isAskAI: true,
        };
      case "region":
        return {
          icon: <Globe2 className={iconClass} />,
          subtitle: "Region",
        };
      case "county":
        return {
          icon: <MapIcon className={iconClass} />,
          subtitle: "County",
        };
      case "city":
        return {
          icon: <Building2 className={iconClass} />,
          subtitle: suggestion.totalListings ? `City • ${suggestion.totalListings} listings` : "City",
        };
      case "subdivision":
        return {
          icon: <Home className={iconClass} />,
          subtitle: suggestion.city ? `Subdivision in ${suggestion.city}` : "Subdivision",
        };
      case "geocode":
        return {
          icon: <MapPin className={iconClass} />,
          subtitle: "Location",
        };
      case "listing":
        return {
          icon: null, // Listings show photo
          subtitle: [
            suggestion.listPrice && `$${suggestion.listPrice.toLocaleString()}`,
            suggestion.bedrooms && `${suggestion.bedrooms} bd`,
            suggestion.bathrooms && `${suggestion.bathrooms} ba`,
            suggestion.sqft && `${suggestion.sqft.toLocaleString()} sqft`,
          ].filter(Boolean).join(" • "),
        };
      default:
        return {
          icon: <MapPin className={iconClass} />,
          subtitle: "Location",
        };
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: any) => {
    // Set the message text and close suggestions
    setMessage(suggestion.label);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);

    // DON'T auto-open the map - let user send the message to get a chat response with preview
    // The chat response will include a ChatMapView component showing the area
  };

  const handleNewChat = () => {
    if (messages.length > 0) {
      setShowNewChatModal(true);
    }
  };

  const confirmNewChat = () => {
    clearMessages();
    setMessage("");
    setShowNewChatModal(false);
    hideMap(); // Hide map when starting new chat
  };

  const cancelNewChat = () => {
    setShowNewChatModal(false);
  };

  // Listing panel handlers
  const handleOpenListingPanel = (listings: Listing[], startIndex: number) => {
    setCurrentListingQueue(listings);
    setCurrentListingIndex(startIndex);
    setShowListingPanel(true);
  };

  const handleCloseListingPanel = () => {
    setShowListingPanel(false);
  };

  const handleSwipeLeft = () => {
    // Dislike current listing
    const currentListing = currentListingQueue[currentListingIndex];
    if (currentListing) {
      // Convert to MapListing format for toggleDislike
      const mapListing = {
        _id: currentListing.id,
        listingId: currentListing.id,
        listingKey: currentListing.id,
        slug: currentListing.url.replace('/mls-listings/', ''),
        slugAddress: currentListing.url.replace('/mls-listings/', ''),
        primaryPhotoUrl: currentListing.image || '',
        unparsedAddress: currentListing.address,
        address: currentListing.address,
        latitude: currentListing.latitude || 0,
        longitude: currentListing.longitude || 0,
        listPrice: currentListing.price,
        bedsTotal: currentListing.beds,
        bathroomsTotalInteger: currentListing.baths,
        livingArea: currentListing.sqft,
        city: currentListing.city,
        subdivisionName: currentListing.subdivision,
      };
      toggleDislike(mapListing as any);
    }

    // Move to next listing
    if (currentListingIndex < currentListingQueue.length - 1) {
      setCurrentListingIndex(currentListingIndex + 1);
    } else {
      // End of queue
      setShowListingPanel(false);
    }
  };

  const handleSwipeRight = () => {
    // Like current listing
    const currentListing = currentListingQueue[currentListingIndex];
    if (currentListing) {
      // Convert to MapListing format for toggleFavorite
      const mapListing = {
        _id: currentListing.id,
        listingId: currentListing.id,
        listingKey: currentListing.id,
        slug: currentListing.url.replace('/mls-listings/', ''),
        slugAddress: currentListing.url.replace('/mls-listings/', ''),
        primaryPhotoUrl: currentListing.image || '',
        unparsedAddress: currentListing.address,
        address: currentListing.address,
        latitude: currentListing.latitude || 0,
        longitude: currentListing.longitude || 0,
        listPrice: currentListing.price,
        bedsTotal: currentListing.beds,
        bathroomsTotalInteger: currentListing.baths,
        livingArea: currentListing.sqft,
        city: currentListing.city,
        subdivisionName: currentListing.subdivision,
      };
      toggleFavorite(mapListing);
    }

    // Move to next listing
    if (currentListingIndex < currentListingQueue.length - 1) {
      setCurrentListingIndex(currentListingIndex + 1);
    } else {
      // End of queue
      setShowListingPanel(false);
    }
  };

  const showLanding = messages.length === 0;

  // Font options - change this to swap fonts easily
  // Options: 'Plus Jakarta Sans', 'DM Sans', 'Inter'
  const chatFont = 'DM Sans';

  return (
    <>
    <ChatHeader />
    <div
      className={`h-screen w-full flex flex-col pt-20 md:pt-0 ${isMapVisible ? 'justify-end pb-4' : ''}`}
      data-page={showLanding ? "chat-landing" : "chat"}
      style={{ fontFamily: `'${chatFont}', sans-serif` }}
    >
      {/* Landing View - hide when map is visible */}
      <AnimatePresence>
        {showLanding && !isMapVisible && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="flex-1 flex items-center justify-center pb-12 md:pb-16"
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

              {/* Input Bar in Landing */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="w-full max-w-[700px] relative"
              >
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
                    onKeyPress={handleKeyPress}
                    onKeyDown={handleKeyPress}
                    placeholder="Ask me anything about real estate..."
                    disabled={isLoading}
                    className={`w-full px-6 py-4 pr-28 bg-transparent outline-none rounded-2xl text-[15px] font-medium tracking-[-0.01em] ${
                      isLight ? "text-gray-900 placeholder-gray-400" : "text-white placeholder-neutral-400"
                    }`}
                  />
                  {messages.length > 0 && (
                    <button
                      onClick={handleNewChat}
                      title="Start new conversation"
                      className={`absolute right-16 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all ${
                        isLight
                          ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                          : "bg-neutral-700 hover:bg-neutral-600 text-neutral-300"
                      }`}
                    >
                      <SquarePen className="w-5 h-5" />
                    </button>
                  )}
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

                {/* Autocomplete Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className={`absolute top-full mt-2 w-full rounded-xl shadow-2xl backdrop-blur-md overflow-y-auto z-50 ${
                      isLight ? "bg-white/95 border border-gray-300" : "bg-neutral-800/95 border border-neutral-700"
                    }`}
                    style={{
                      backdropFilter: "blur(20px) saturate(150%)",
                      WebkitBackdropFilter: "blur(20px) saturate(150%)",
                      maxHeight: "60vh",
                    }}
                  >
                    {suggestions.map((suggestion, index) => {
                      const display = getSuggestionDisplay(suggestion);

                      return (
                        <div
                          key={index}
                          onClick={() => handleSelectSuggestion(suggestion)}
                          className={`px-4 py-3 cursor-pointer transition-all flex items-center gap-3 ${
                            index === selectedSuggestionIndex
                              ? isLight
                                ? "bg-blue-100"
                                : "bg-purple-600/30"
                              : isLight
                                ? "hover:bg-gray-100"
                                : "hover:bg-neutral-700"
                          } ${index !== 0 ? (isLight ? "border-t border-gray-200" : "border-t border-neutral-700") : ""}`}
                        >
                          {/* Icon or Photo */}
                          {suggestion.photo ? (
                            <img
                              src={suggestion.photo}
                              alt={suggestion.label}
                              className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                            />
                          ) : (
                            display.icon
                          )}

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {/* Main label */}
                            <div className={`font-medium truncate ${isLight ? "text-gray-900" : "text-white"}`}>
                              {display.isAskAI && (
                                <span className={`font-semibold ${isLight ? "text-blue-600" : "text-emerald-400"}`}>
                                  Ask AI:{" "}
                                </span>
                              )}
                              {suggestion.label}
                            </div>

                            {/* Subtitle with type indicator */}
                            {!display.isAskAI && (
                              <div className="flex items-center gap-2 text-xs flex-wrap">
                                {suggestion.type === "listing" ? (
                                  <>
                                    <span className={`font-semibold ${isLight ? "text-blue-600" : "text-emerald-400"}`}>
                                      Map Query
                                    </span>
                                    {suggestion.mlsSource && (
                                      <>
                                        <span className={isLight ? "text-gray-400" : "text-neutral-500"}>•</span>
                                        <span className={isLight ? "text-gray-600" : "text-neutral-400"}>
                                          {suggestion.mlsSource}
                                        </span>
                                      </>
                                    )}
                                    {display.subtitle && (
                                      <>
                                        <span className={isLight ? "text-gray-400" : "text-neutral-500"}>•</span>
                                        <span className={isLight ? "text-gray-600" : "text-neutral-400"}>
                                          {display.subtitle}
                                        </span>
                                      </>
                                    )}
                                  </>
                                ) : suggestion.type === "city" || suggestion.type === "subdivision" ||
                                   suggestion.type === "county" || suggestion.type === "region" ||
                                   suggestion.type === "geocode" ? (
                                  <>
                                    <span className={`font-semibold ${isLight ? "text-blue-600" : "text-emerald-400"}`}>
                                      Map Query
                                    </span>
                                    <span className={isLight ? "text-gray-400" : "text-neutral-500"}>•</span>
                                    <span className={isLight ? "text-gray-600" : "text-neutral-400"}>
                                      {display.subtitle}
                                    </span>
                                  </>
                                ) : (
                                  <span className={isLight ? "text-gray-500" : "text-neutral-400"}>
                                    {display.subtitle}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversation View - Hide when map is visible */}
      {!showLanding && !isMapVisible && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-4 pt-4 md:pt-6 pb-32 md:pb-2 relative">
          <div className="max-w-6xl mx-auto space-y-3 sm:space-y-4 overflow-hidden">
            {messages.map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                {/* Text message row */}
                <div className={`flex gap-2 sm:gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isLight
                        ? "bg-gradient-to-br from-blue-400 to-blue-600"
                        : "bg-gradient-to-br from-neutral-600 to-neutral-800 border border-neutral-600"
                    }`}>
                      <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                  )}

                  <div className="max-w-[85%] sm:max-w-3xl flex flex-col">
                    <div
                      className={`rounded-2xl px-3 sm:px-5 py-3 sm:py-4 select-text ${
                        msg.role === "user"
                          ? isLight
                            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20"
                            : "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                          : isLight
                            ? "bg-white/90 text-gray-800 shadow-md border border-gray-200/50"
                            : "bg-neutral-900/80 text-neutral-50 shadow-lg border border-neutral-700/50 backdrop-blur-sm"
                      }`}
                    >
                      <div className={`text-base sm:text-[20px] leading-relaxed font-medium tracking-[-0.01em] select-text [&>p]:my-1.5 [&>ul]:my-2.5 [&>ul]:ml-4 [&>ul]:list-disc [&>ol]:my-2.5 [&>ol]:ml-4 [&>ol]:list-decimal [&>li]:my-1 [&>strong]:font-semibold [&>h1]:text-xl [&>h1]:font-semibold [&>h1]:mb-2 [&>h2]:text-lg [&>h2]:font-semibold [&>h2]:mb-2 [&>h3]:font-semibold [&>h3]:mb-1 ${
                        msg.role === "user" ? "text-white" : ""
                      }`}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({ node, ...props }) => (
                              <div className={`overflow-x-auto my-6 ${
                                isLight
                                  ? '[&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-blue-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-blue-400'
                                  : '[&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-emerald-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-emerald-600'
                              }`}>
                                <table className={`min-w-full border-collapse rounded-xl overflow-hidden shadow-lg ${
                                  isLight
                                    ? 'bg-white border border-gray-200'
                                    : 'bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700'
                                }`} {...props} />
                              </div>
                            ),
                            thead: ({ node, ...props }) => (
                              <thead className={
                                isLight
                                  ? 'bg-gradient-to-r from-blue-50 to-blue-100/80'
                                  : 'bg-gradient-to-r from-emerald-900/40 to-emerald-800/30'
                              } {...props} />
                            ),
                            tbody: ({ node, ...props }) => (
                              <tbody className={isLight ? '' : 'divide-y divide-neutral-700/50'} {...props} />
                            ),
                            tr: ({ node, ...props }) => (
                              <tr className={`transition-colors ${
                                isLight
                                  ? 'hover:bg-blue-50/50 border-b border-gray-100 last:border-b-0'
                                  : 'hover:bg-emerald-500/5 border-b border-neutral-700/30 last:border-b-0'
                              }`} {...props} />
                            ),
                            th: ({ node, ...props }) => (
                              <th className={`px-6 py-4 text-left font-bold tracking-tight ${
                                isLight
                                  ? 'text-blue-900'
                                  : 'text-emerald-300'
                              }`} {...props} />
                            ),
                            td: ({ node, ...props }) => (
                              <td className={`px-6 py-4 font-medium ${
                                isLight
                                  ? 'text-gray-700'
                                  : 'text-neutral-200'
                              }`} {...props} />
                            ),
                            code: ({ node, inline, ...props }: any) =>
                              inline ? (
                                <code className={`px-2 py-1 rounded-md text-sm font-mono font-semibold ${
                                  isLight
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50'
                                }`} {...props} />
                              ) : (
                                <code className={`block px-5 py-4 rounded-xl my-3 text-sm font-mono overflow-x-auto shadow-inner ${
                                  isLight
                                    ? 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 border border-gray-200'
                                    : 'bg-gradient-to-br from-neutral-900 to-neutral-800 text-neutral-200 border border-neutral-700'
                                }`} {...props} />
                              )
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                    {/* Copy, Share buttons, and Sources for assistant messages */}
                    {msg.role === "assistant" && (
                      <div className="mt-2 self-start">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                              copiedId === msg.id
                                ? isLight
                                  ? "bg-emerald-100 text-emerald-600"
                                  : "bg-emerald-500/20 text-emerald-400"
                                : isLight
                                  ? "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                                  : "bg-neutral-800 text-neutral-500 hover:bg-neutral-700 hover:text-neutral-300"
                            }`}
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleShare(msg.content)}
                            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                              isLight
                                ? "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                                : "bg-neutral-800 text-neutral-500 hover:bg-neutral-700 hover:text-neutral-300"
                            }`}
                          >
                            <Share className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Source Citations */}
                        {msg.components?.sources && msg.components.sources.length > 0 && (
                          <SourceBubbles sources={msg.components.sources} />
                        )}
                      </div>
                    )}
                  </div>

                  {msg.role === "user" && (
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
                      isLight ? "bg-blue-600" : "bg-emerald-500"
                    }`}>
                      {session?.user?.image ? (
                        <Image
                          src={session.user.image}
                          alt={session.user.name || "User"}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      )}
                    </div>
                  )}
                </div>

                {/* Components rendered full-width and centered - MacBook optimized */}
                {msg.components?.carousel && msg.components.carousel.listings?.length > 0 && (
                  <div className="w-full overflow-hidden px-2 xl:px-16 2xl:px-12">
                    <ListingCarousel
                      listings={msg.components.carousel.listings}
                      title={msg.components.carousel.title}
                      onOpenPanel={handleOpenListingPanel}
                    />
                  </div>
                )}

                {msg.components?.mapView && msg.components.mapView.listings?.length > 0 && (
                  <div className="w-full overflow-hidden px-2 xl:px-16 2xl:px-12">
                    <ChatMapView
                      listings={msg.components.carousel?.listings || msg.components.mapView.listings}
                    />
                  </div>
                )}

                {msg.components?.appreciation && (
                  <div className="w-full overflow-hidden px-2 xl:px-16 2xl:px-12">
                    <AppreciationCard data={msg.components.appreciation} />
                  </div>
                )}

                {msg.components?.comparison && (
                  <div className="w-full overflow-hidden px-2 xl:px-16 2xl:px-12">
                    <ComparisonCard data={msg.components.comparison} />
                  </div>
                )}

                {msg.components?.articles && msg.components.articles.results?.length > 0 && (
                  <div className="w-full overflow-hidden px-2 xl:px-16 2xl:px-12">
                    <ArticleResults
                      results={msg.components.articles.results}
                      query={msg.components.articles.query || ""}
                    />
                  </div>
                )}
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isLight
                    ? "bg-gradient-to-br from-blue-400 to-blue-600"
                    : "bg-gradient-to-br from-neutral-600 to-neutral-800 border border-neutral-600"
                }`}>
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className={`rounded-2xl px-5 py-4 ${
                  isLight
                    ? "bg-white/90 shadow-md border border-gray-200/50"
                    : "bg-neutral-900/80 shadow-lg border border-neutral-700/50 backdrop-blur-sm"
                }`}>
                  <div className="flex gap-2">
                    <div className={`w-2 h-2 rounded-full animate-bounce ${isLight ? "bg-blue-400" : "bg-emerald-400"}`} />
                    <div className={`w-2 h-2 rounded-full animate-bounce ${isLight ? "bg-blue-400" : "bg-emerald-400"}`} style={{ animationDelay: "0.2s" }} />
                    <div className={`w-2 h-2 rounded-full animate-bounce ${isLight ? "bg-blue-400" : "bg-emerald-400"}`} style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              </motion.div>
            )}
            {isStreaming && streamingText && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isLight
                    ? "bg-gradient-to-br from-blue-400 to-blue-600"
                    : "bg-gradient-to-br from-neutral-600 to-neutral-800 border border-neutral-600"
                }`}>
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="max-w-3xl flex flex-col gap-4">
                  <div
                    className={`rounded-2xl px-5 py-4 select-text ${
                      isLight
                        ? "bg-white/90 text-gray-800 shadow-md border border-gray-200/50"
                        : "bg-neutral-900/80 text-neutral-50 shadow-lg border border-neutral-700/50 backdrop-blur-sm"
                    }`}
                  >
                    <div className="text-[20px] leading-relaxed font-medium tracking-[-0.01em] select-text [&>p]:my-1.5 [&>ul]:my-2.5 [&>ul]:ml-4 [&>ul]:list-disc [&>ol]:my-2.5 [&>ol]:ml-4 [&>ol]:list-decimal [&>li]:my-1 [&>strong]:font-semibold">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({ node, ...props }) => (
                            <div className={`overflow-x-auto my-6 ${
                              isLight
                                ? '[&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-blue-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-blue-400'
                                : '[&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-emerald-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-emerald-600'
                            }`}>
                              <table className={`min-w-full border-collapse rounded-xl overflow-hidden shadow-lg ${
                                isLight
                                  ? 'bg-white border border-gray-200'
                                  : 'bg-gradient-to-br from-neutral-900 to-neutral-800 border border-neutral-700'
                              }`} {...props} />
                            </div>
                          ),
                          thead: ({ node, ...props }) => (
                            <thead className={
                              isLight
                                ? 'bg-gradient-to-r from-blue-50 to-blue-100/80'
                                : 'bg-gradient-to-r from-emerald-900/40 to-emerald-800/30'
                            } {...props} />
                          ),
                          tbody: ({ node, ...props }) => (
                            <tbody className={isLight ? '' : 'divide-y divide-neutral-700/50'} {...props} />
                          ),
                          tr: ({ node, ...props }) => (
                            <tr className={`transition-colors ${
                              isLight
                                ? 'hover:bg-blue-50/50 border-b border-gray-100 last:border-b-0'
                                : 'hover:bg-emerald-500/5 border-b border-neutral-700/30 last:border-b-0'
                            }`} {...props} />
                          ),
                          th: ({ node, ...props }) => (
                            <th className={`px-6 py-4 text-left font-bold tracking-tight ${
                              isLight
                                ? 'text-blue-900'
                                : 'text-emerald-300'
                            }`} {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className={`px-6 py-4 font-medium ${
                              isLight
                                ? 'text-gray-700'
                                : 'text-neutral-200'
                            }`} {...props} />
                          ),
                          code: ({ node, inline, ...props }: any) =>
                            inline ? (
                              <code className={`px-2 py-1 rounded-md text-sm font-mono font-semibold ${
                                isLight
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50'
                              }`} {...props} />
                            ) : (
                              <code className={`block px-5 py-4 rounded-xl my-3 text-sm font-mono overflow-x-auto shadow-inner ${
                                isLight
                                  ? 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 border border-gray-200'
                                  : 'bg-gradient-to-br from-neutral-900 to-neutral-800 text-neutral-200 border border-neutral-700'
                              }`} {...props} />
                            )
                        }}
                      >
                        {streamingText}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Chat Input - Only show in conversation mode when map is NOT visible */}
      {!showLanding && !isMapVisible && (
        <div
          className={`fixed bottom-0 left-0 pr-[10px] pl-3 sm:px-4 pb-[84px] sm:pb-4 pt-6 z-30 backdrop-blur-xl md:relative md:bottom-auto md:left-auto md:right-auto md:pr-4 md:pb-4 md:backdrop-blur-none ${
            isLight ? 'bg-gradient-to-t from-white/90 via-white/70 to-transparent' : 'bg-gradient-to-t from-black/70 via-black/50 to-transparent'
          }`}
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
              onKeyPress={handleKeyPress}
              onKeyDown={handleKeyPress}
              placeholder="Ask me anything about real estate..."
              disabled={isLoading}
              className={`w-full px-4 sm:px-6 py-4 sm:py-4 pr-24 sm:pr-28 bg-transparent outline-none rounded-2xl text-base sm:text-[15px] font-medium tracking-[-0.01em] ${
                isLight ? "text-gray-900 placeholder-gray-500" : "text-white placeholder-neutral-400"
              }`}
            />
            <button
              onClick={handleNewChat}
              title="Start new conversation"
              className={`absolute right-14 sm:right-16 top-1/2 -translate-y-1/2 p-2.5 sm:p-2.5 rounded-xl transition-all active:scale-95 ${
                isLight
                  ? "bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700"
                  : "bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-500 text-neutral-300"
              }`}
            >
              <SquarePen className="w-5 h-5 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={handleSend}
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

          {/* Autocomplete Suggestions Dropdown - Conversation Mode */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className={`absolute bottom-full mb-2 w-full rounded-xl shadow-2xl backdrop-blur-md overflow-hidden z-50 max-h-80 overflow-y-auto ${
                isLight ? "bg-white/95 border border-gray-300" : "bg-neutral-800/95 border border-neutral-700"
              }`}
              style={{
                backdropFilter: "blur(20px) saturate(150%)",
                WebkitBackdropFilter: "blur(20px) saturate(150%)",
              }}
            >
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className={`px-4 py-3 cursor-pointer transition-all flex items-center gap-3 ${
                    index === selectedSuggestionIndex
                      ? isLight
                        ? "bg-blue-100"
                        : "bg-emerald-600/30"
                      : isLight
                        ? "hover:bg-gray-100"
                        : "hover:bg-neutral-700"
                  } ${index !== 0 ? (isLight ? "border-t border-gray-200" : "border-t border-neutral-700") : ""}`}
                >
                  {suggestion.type === "geocode" ? (
                    <>
                      <MapPin className={`w-5 h-5 flex-shrink-0 ${isLight ? "text-blue-600" : "text-emerald-400"}`} />
                      <div className="flex-1">
                        <div className={`font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                          {suggestion.label}
                        </div>
                        <div className={`text-xs ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
                          Location
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {suggestion.photo && (
                        <img
                          src={suggestion.photo}
                          alt={suggestion.label}
                          className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate ${isLight ? "text-gray-900" : "text-white"}`}>
                          {suggestion.label}
                        </div>
                        <div className={`text-xs ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
                          {suggestion.listPrice && `$${suggestion.listPrice.toLocaleString()}`}
                          {suggestion.bedrooms && ` • ${suggestion.bedrooms} bd`}
                          {suggestion.bathrooms && ` • ${suggestion.bathrooms} ba`}
                          {suggestion.sqft && ` • ${suggestion.sqft.toLocaleString()} sqft`}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      )}
    </div>

    {/* New Chat Confirmation Modal - Outside main container for proper viewport centering */}
    <AnimatePresence>
      {showNewChatModal && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[9998]"
            onClick={cancelNewChat}
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
                  onClick={cancelNewChat}
                  className={`flex-1 px-5 py-3 rounded-xl font-semibold transition-all ${
                    isLight
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:shadow-md'
                      : 'bg-neutral-800/50 hover:bg-neutral-700/50 text-neutral-300 border border-neutral-700/50 hover:border-neutral-600/50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmNewChat}
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

    {/* ListingBottomPanel for swipe functionality */}
    {showListingPanel && currentListingQueue.length > 0 && currentListingIndex < currentListingQueue.length && (
      <ListingBottomPanel
        listing={{
          _id: currentListingQueue[currentListingIndex].id,
          listingId: currentListingQueue[currentListingIndex].id,
          listingKey: currentListingQueue[currentListingIndex].id,
          slug: currentListingQueue[currentListingIndex].url.replace('/mls-listings/', ''),
          slugAddress: currentListingQueue[currentListingIndex].url.replace('/mls-listings/', ''),
          primaryPhotoUrl: currentListingQueue[currentListingIndex].image || '',
          unparsedAddress: currentListingQueue[currentListingIndex].address,
          address: currentListingQueue[currentListingIndex].address,
          latitude: currentListingQueue[currentListingIndex].latitude || 0,
          longitude: currentListingQueue[currentListingIndex].longitude || 0,
          listPrice: currentListingQueue[currentListingIndex].price,
          bedsTotal: currentListingQueue[currentListingIndex].beds,
          bathroomsTotalInteger: currentListingQueue[currentListingIndex].baths,
          livingArea: currentListingQueue[currentListingIndex].sqft,
          city: currentListingQueue[currentListingIndex].city,
          subdivisionName: currentListingQueue[currentListingIndex].subdivision,
        }}
        fullListing={{
          listingKey: currentListingQueue[currentListingIndex].id,
          slug: currentListingQueue[currentListingIndex].url.replace('/mls-listings/', ''),
          slugAddress: currentListingQueue[currentListingIndex].url.replace('/mls-listings/', ''),
          unparsedAddress: currentListingQueue[currentListingIndex].address,
          address: currentListingQueue[currentListingIndex].address,
          city: currentListingQueue[currentListingIndex].city,
          subdivisionName: currentListingQueue[currentListingIndex].subdivision,
          listPrice: currentListingQueue[currentListingIndex].price,
          bedroomsTotal: currentListingQueue[currentListingIndex].beds,
          bathroomsTotalDecimal: currentListingQueue[currentListingIndex].baths,
          livingArea: currentListingQueue[currentListingIndex].sqft,
          latitude: currentListingQueue[currentListingIndex].latitude?.toString() || '0',
          longitude: currentListingQueue[currentListingIndex].longitude?.toString() || '0',
          primaryPhotoUrl: currentListingQueue[currentListingIndex].image || '',
        } as any}
        onClose={handleCloseListingPanel}
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        isSidebarOpen={false}
        isLeftSidebarCollapsed={false}
        isDisliked={dislikedListings.some(d => d.listingKey === currentListingQueue[currentListingIndex].id)}
        onRemoveDislike={() => {
          const mapListing = {
            _id: currentListingQueue[currentListingIndex].id,
            listingKey: currentListingQueue[currentListingIndex].id,
            slug: currentListingQueue[currentListingIndex].url.replace('/mls-listings/', ''),
            slugAddress: currentListingQueue[currentListingIndex].url.replace('/mls-listings/', ''),
          };
          removeDislike(mapListing as any);
        }}
      />
    )}

    {/* Bottom Input Bar - shows when map is visible */}
    {isMapVisible && (
      <div className="fixed bottom-4 left-4 right-4 z-30 md:left-1/2 md:-translate-x-1/2 md:max-w-3xl" style={{ pointerEvents: 'auto' }}>
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
            onKeyPress={handleKeyPress}
            onKeyDown={handleKeyPress}
            placeholder="Search locations, addresses, cities..."
            disabled={isLoading}
            className={`w-full px-6 py-4 pr-24 bg-transparent outline-none rounded-2xl text-[15px] font-medium tracking-[-0.01em] ${
              isLight ? "text-gray-900 placeholder-gray-400" : "text-white placeholder-neutral-400"
            }`}
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

        {/* Autocomplete Suggestions Dropdown - Map Mode */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className={`absolute bottom-full mb-2 w-full rounded-xl shadow-2xl backdrop-blur-md overflow-hidden z-50 max-h-80 overflow-y-auto ${
              isLight ? "bg-white/95 border border-gray-300" : "bg-neutral-800/95 border border-neutral-700"
            }`}
            style={{
              backdropFilter: "blur(20px) saturate(150%)",
              WebkitBackdropFilter: "blur(20px) saturate(150%)",
              }}
          >
            {suggestions.map((suggestion, index) => {
              const display = getSuggestionDisplay(suggestion);
              return (
                <div
                  key={index}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className={`px-4 py-3 cursor-pointer transition-all flex items-center gap-3 ${
                    index === selectedSuggestionIndex
                      ? isLight
                        ? "bg-blue-100"
                        : "bg-emerald-600/30"
                      : isLight
                        ? "hover:bg-gray-100"
                        : "hover:bg-neutral-700"
                  } ${index !== 0 ? (isLight ? "border-t border-gray-200" : "border-t border-neutral-700") : ""}`}
                >
                  {suggestion.type === "listing" && suggestion.photo ? (
                    <>
                      <img
                        src={suggestion.photo}
                        alt={suggestion.label}
                        className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate ${isLight ? "text-gray-900" : "text-white"}`}>
                          {suggestion.label}
                        </div>
                        <div className={`text-xs ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
                          {display.subtitle}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {display.icon}
                      <div className="flex-1">
                        <div className={`font-medium ${isLight ? "text-gray-900" : "text-white"}`}>
                          {suggestion.label}
                        </div>
                        <div className={`text-xs ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
                          {display.subtitle}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}
    </>
  );
}
