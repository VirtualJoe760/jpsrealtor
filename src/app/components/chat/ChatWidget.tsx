"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Copy, Check, Share, Map, MessageSquare } from "lucide-react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSession } from "next-auth/react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useChatContext, ComponentData } from "./ChatProvider";
import { useMapControl } from "@/app/hooks/useMapControl";
import ListingBottomPanel from "../mls/map/ListingBottomPanel";
import { useMLSContext } from "../mls/MLSProvider";
import { SourceBubbles } from "./SourceBubble";
import type { Listing } from "./ListingCarousel";
import { cleanResponseText } from "@/lib/chat/response-parser";
import ChatResultsContainer from "./ChatResultsContainer";
import { extractFiltersFromQuery, applyFiltersToListings } from "@/app/utils/chat/filter-extractor";

// New modular components
import ChatInput from "./ChatInput";
import AutocompleteDropdown from "./AutocompleteDropdown";
import NewChatModal from "./NewChatModal";
import { useAutocomplete } from "./hooks/useAutocomplete";
import { useChatScroll } from "./hooks/useChatScroll";

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
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Map control for showing listings on background map
  const { showMapWithListings, showMapAtLocation, hideMap, isMapVisible, prePositionMap } = useMapControl();

  // Auto-scroll to bottom on new messages
  const messagesEndRef = useChatScroll(messages);

  // ListingBottomPanel state for swipe functionality
  const [showListingPanel, setShowListingPanel] = useState(false);
  const [currentListingQueue, setCurrentListingQueue] = useState<Listing[]>([]);
  const [currentListingIndex, setCurrentListingIndex] = useState(0);
  const { likedListings, dislikedListings, toggleFavorite, swipeLeft: toggleDislike, removeDislike, loadListings } = useMLSContext();

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

  // Handle map query - loads location on map
  const handleMapQuery = async (query: string, suggestion?: any) => {
    console.log('🗺️ [ChatWidget] Executing map query:', query, suggestion);

    // Helper function to determine zoom level based on location type
    const getZoomLevel = (type: string) => {
      switch (type) {
        case 'region': return 7;      // Broader region view
        case 'county': return 9;      // County view
        case 'city': return 11;       // City view
        case 'subdivision': return 13; // Neighborhood view
        case 'listing': return 15;    // Individual property
        case 'geocode': return 12;    // General geocode
        default: return 12;           // Default zoom
      }
    };

    // If we have a suggestion with coordinates, use it
    if (suggestion) {
      const { latitude, longitude, zoom, type } = suggestion;

      if (latitude && longitude) {
        const zoomLevel = zoom || getZoomLevel(type);
        console.log(`🗺️ [ChatWidget] Showing map at ${type}:`, query, { latitude, longitude, zoom: zoomLevel });
        showMapAtLocation(latitude, longitude, zoomLevel);
      }
    } else {
      // No suggestion - search for best match via API (skip "Ask AI" option)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        console.log('🗺️ [ChatWidget] Search API response:', data);

        if (data.results && data.results.length > 0) {
          console.log('🗺️ [ChatWidget] All results:', data.results);

          // Skip "Ask AI" result (type: "ask_ai") and find first real location
          // Priority order: Subdivision > City > County > Region > Geocode > Listing
          const bestMatch = data.results.find((r: any) => r.type !== 'ask_ai');

          console.log('🗺️ [ChatWidget] Best match after filtering:', bestMatch);

          if (bestMatch && bestMatch.latitude && bestMatch.longitude) {
            const zoomLevel = bestMatch.zoom || getZoomLevel(bestMatch.type);
            console.log('🗺️ [ChatWidget] Flying to:', { lat: bestMatch.latitude, lng: bestMatch.longitude, zoom: zoomLevel, type: bestMatch.type });
            showMapAtLocation(bestMatch.latitude, bestMatch.longitude, zoomLevel);
          } else {
            console.warn('🗺️ [ChatWidget] No valid location found in results:', data.results);
          }
        } else {
          console.warn('🗺️ [ChatWidget] No results returned from API for:', query);
        }
      } catch (error) {
        console.error('🗺️ [ChatWidget] Map query error:', error);
      }
    }

    // Background: Also send to AI for when user switches back to chat
    handleAIQueryInBackground(query);
  };

  // Handle AI query - sends to AI chat
  const handleAIQuery = async (query: string) => {
    console.log('🤖 [ChatWidget] Executing AI query:', query);

    addMessage(query, "user");
    setIsLoading(true);

    try {
      // Call AI API with Server-Sent Events (SSE) streaming
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: query },
          ],
          userId: "demo-user",
          userTier: "premium",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Start streaming mode immediately
      setIsLoading(false);
      setIsStreaming(true);
      let fullText = "";
      let components: ComponentData | undefined;

      // Read SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decode the chunk
            const chunk = decoder.decode(value, { stream: true });

            // Process each SSE message (format: "data: {...}\n\n")
            const lines = chunk.split('\n\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.substring(6); // Remove "data: " prefix
                  const data = JSON.parse(jsonStr);

                  if (data.token) {
                    // Append token to displayed text in real-time
                    fullText += data.token;
                    setStreamingText(fullText);

                    // Smooth scroll every 20 characters
                    if (fullText.length % 20 === 0) {
                      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                    }
                  }

                  if (data.components) {
                    // Received component data
                    components = data.components;
                  }

                  if (data.done) {
                    // Stream complete
                    setIsStreaming(false);
                    setStreamingText("");
                    addMessage(fullText, "assistant", undefined, components);
                    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

                    // Pre-position map in background if listings are returned
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

                      // Convert Listing[] to MapListing[] format
                      const mapListings = components.carousel.listings.map((listing: any) => ({
                        _id: listing.id || '',
                        listingId: listing.id || '',
                        listingKey: listing.id || '',
                        latitude: listing.latitude || 0,
                        longitude: listing.longitude || 0,
                        listPrice: listing.price || 0,
                        address: listing.address || '',
                        primaryPhotoUrl: listing.image || '',
                        bedsTotal: listing.beds || 0,
                        bathroomsTotalInteger: listing.baths || 0,
                        livingArea: listing.sqft || 0,
                        city: listing.city || '',
                        unparsedAddress: listing.address || '',
                        subdivisionName: listing.subdivision,
                        propertyType: listing.type || 'A',
                        mlsSource: 'GPS',
                        slugAddress: listing.slugAddress || listing.slug || '',
                      }));

                      // Pre-position map with filters
                      prePositionMap(mapListings, {
                        centerLat,
                        centerLng,
                        zoom
                      });

                      // Load subdivision data if needed
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
                  }

                  if (data.error) {
                    // Error message from stream
                    throw new Error(data.error);
                  }
                } catch (parseError) {
                  // Skip malformed JSON chunks
                  console.warn('[SSE] Skipped malformed chunk:', parseError);
                }
              }
            }
          }
        } catch (readError) {
          console.error('[SSE] Stream read error:', readError);
          setIsStreaming(false);
          setStreamingText("");
          throw readError;
        } finally {
          reader.releaseLock();
        }
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

  // Background AI query - executes AI query silently for when user switches views
  const handleAIQueryInBackground = async (query: string) => {
    console.log('🤖 [ChatWidget] Background AI query:', query);

    // Don't show user message or loading state since this is background
    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: query },
          ],
          userId: "demo-user",
          userTier: "premium",
        }),
      });

      if (!response.ok) {
        console.warn('🤖 [ChatWidget] Background AI query failed:', response.status);
        return;
      }

      let fullText = "";
      let components: ComponentData | undefined;
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.substring(6);
                  const data = JSON.parse(jsonStr);

                  if (data.token) {
                    fullText += data.token;
                  }

                  if (data.components) {
                    components = data.components;
                  }

                  if (data.done) {
                    // Silently add message to history
                    addMessage(query, "user");
                    addMessage(fullText, "assistant", undefined, components);
                    console.log('🤖 [ChatWidget] Background AI query completed, message added to history');
                  }
                } catch (parseError) {
                  console.warn('[Background SSE] Skipped malformed chunk:', parseError);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (error) {
      console.error('🤖 [ChatWidget] Background AI query error:', error);
    }
  };

  // Background map query - pre-positions map silently without switching views
  const handleMapQueryInBackground = async (query: string) => {
    console.log('🗺️ [ChatWidget] Background map query:', query);

    // Helper function to determine zoom level based on location type
    const getZoomLevel = (type: string) => {
      switch (type) {
        case 'region': return 7;      // Broader region view
        case 'county': return 9;      // County view
        case 'city': return 11;       // City view
        case 'subdivision': return 13; // Neighborhood view
        case 'listing': return 15;    // Individual property
        case 'geocode': return 12;    // General geocode
        default: return 12;           // Default zoom
      }
    };

    try {
      // Query search API to extract location from natural language
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      console.log('🗺️ [ChatWidget] Background search API response:', data);

      if (data.results && data.results.length > 0) {
        // Skip "Ask AI" result (type: "ask_ai") and find first real location
        // This handles queries like "buyers guide to coachella valley" → extracts "coachella valley"
        const bestMatch = data.results.find((r: any) => r.type !== 'ask_ai');

        console.log('🗺️ [ChatWidget] Best location match for background positioning:', bestMatch);

        if (bestMatch && bestMatch.latitude && bestMatch.longitude) {
          const zoomLevel = bestMatch.zoom || getZoomLevel(bestMatch.type);
          console.log('🗺️ [ChatWidget] Pre-positioning map at:', {
            lat: bestMatch.latitude,
            lng: bestMatch.longitude,
            zoom: zoomLevel,
            type: bestMatch.type,
            location: bestMatch.label || query
          });

          // Pre-position map without showing it (map stays hidden until user switches)
          // Use empty listings array with viewState to set the position
          prePositionMap([], {
            centerLat: bestMatch.latitude,
            centerLng: bestMatch.longitude,
            zoom: zoomLevel
          });
        } else {
          console.warn('🗺️ [ChatWidget] No valid location found for background map positioning');
        }
      } else {
        console.warn('🗺️ [ChatWidget] No search results for background map query');
      }
    } catch (error) {
      console.error('🗺️ [ChatWidget] Background map query error:', error);
      // Silent fail - don't interrupt user experience
    }
  };

  // Autocomplete hook (handles all autocomplete logic)
  const autocomplete = useAutocomplete({
    message,
    isMapVisible,
    suggestionsRef,
    onSelect: (suggestion) => {
      console.log('🎯 [ChatWidget] Autocomplete selected:', suggestion);

      setMessage(""); // Clear input

      // Check if this is an "Ask AI" suggestion
      if (suggestion.type === "ask_ai") {
        // Always switch to AI view and execute AI query
        console.log('🤖 [ChatWidget] AI query selected, switching to chat view');
        hideMap(); // Switch to chat view
        handleAIQuery(suggestion.label);
      } else {
        // This is a map query (city, subdivision, listing, etc.)
        console.log('🗺️ [ChatWidget] Map query selected');

        if (isMapVisible) {
          // Already on map, just execute map query
          handleMapQuery(suggestion.label, suggestion);
        } else {
          // On chat view, switch to map and execute query
          console.log('🗺️ [ChatWidget] Switching to map view');
          handleMapQuery(suggestion.label, suggestion);
        }
      }
    },
  });

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message;
    setMessage("");
    autocomplete.clear();

    // Bidirectional processing: Execute both AI and map queries in parallel
    // The foreground query depends on current view, background query prepares the other view
    if (isMapVisible) {
      // On map view: Map query in foreground, AI query in background
      console.log('🗺️ [ChatWidget] Map view - executing map query (foreground) + AI query (background)');
      handleMapQuery(userMessage); // Foreground: show map results
      handleAIQueryInBackground(userMessage); // Background: prepare chat response
    } else {
      // On chat view: AI query in foreground, map query in background
      console.log('🤖 [ChatWidget] Chat view - executing AI query (foreground) + map query (background)');
      handleAIQuery(userMessage); // Foreground: show AI response

      // Background: Pre-position map
      handleMapQueryInBackground(userMessage);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Autocomplete hook handles its own keyboard navigation (ArrowUp, ArrowDown, Escape, Enter with selection)
    // Just handle Enter to send when no autocomplete is selected
    if (e.key === "Enter" && !e.shiftKey) {
      // If autocomplete has a selection, let it handle the Enter key
      if (autocomplete.showSuggestions && autocomplete.selectedSuggestionIndex >= 0) {
        return; // Hook will handle it
      }

      e.preventDefault();
      handleSend();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle autocomplete keyboard navigation
    if (autocomplete.showSuggestions && autocomplete.suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        autocomplete.navigateDown();
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        autocomplete.navigateUp();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        autocomplete.clear();
        return;
      }

      if (e.key === "Enter" && autocomplete.selectedSuggestionIndex >= 0) {
        e.preventDefault();
        autocomplete.selectCurrent();
        return;
      }
    }
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
  const handleOpenListingPanel = async (listings: Listing[], startIndex: number) => {
    console.log('[ChatWidget] Opening panel for listing:', listings[startIndex]);

    // Extract filters from user's last query
    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .pop()?.content || '';

    const filters = extractFiltersFromQuery(lastUserMessage);
    console.log('[ChatWidget] Extracted filters from query:', filters);

    // Apply filters to listings (client-side)
    let filteredListings = applyFiltersToListings(listings, filters);
    console.log(`[ChatWidget] Filtered listings: ${listings.length} → ${filteredListings.length}`);

    // Fallback if filters are too restrictive
    if (filteredListings.length === 0) {
      console.warn('[ChatWidget] Filters too restrictive, using all listings');
      filteredListings = listings;
    }

    // Adjust startIndex if needed (in case filtered)
    const adjustedIndex = Math.min(startIndex, filteredListings.length - 1);

    const listing = filteredListings[adjustedIndex];

    // Fetch full listing data from API to ensure we have ALL fields
    try {
      const slugAddress = listing.slugAddress || listing.slug || listing.url?.replace('/mls-listings/', '');

      if (slugAddress) {
        console.log('[ChatWidget] Fetching full data for:', slugAddress);
        const response = await fetch(`/api/mls-listings/${slugAddress}`);

        if (response.ok) {
          const { listing: fullData } = await response.json();
          console.log('[ChatWidget] Full data fetched:', {
            hasPublicRemarks: !!fullData.publicRemarks,
            hasAgentInfo: !!fullData.listOfficeName,
            hasDaysOnMarket: fullData.daysOnMarket != null
          });

          // Merge full data with chat listing (full data takes priority)
          const enrichedListings = [...filteredListings];
          enrichedListings[adjustedIndex] = { ...listing, ...fullData };

          setCurrentListingQueue(enrichedListings);
          setCurrentListingIndex(adjustedIndex);
          setShowListingPanel(true);
          return;
        } else {
          console.warn('[ChatWidget] Failed to fetch full data, using chat data');
        }
      }
    } catch (error) {
      console.error('[ChatWidget] Error fetching full listing data:', error);
    }

    // Fallback to using filtered chat data
    setCurrentListingQueue(filteredListings);
    setCurrentListingIndex(adjustedIndex);
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
    <div
      className={`w-full flex flex-col ${isMapVisible ? 'pt-0 justify-end pb-4' : 'pt-0 md:pt-0'}`}
      data-page={showLanding ? "chat-landing" : "chat"}
      style={{
        fontFamily: `'${chatFont}', sans-serif`,
        height: '100dvh' // Use dynamic viewport height for iOS keyboard compatibility
      }}
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
            <div className="w-full max-w-2xl md:max-w-4xl flex flex-col items-center gap-2 md:gap-8 px-4">
              {/* Logo & Brand */}
              <div className="flex items-center justify-center gap-3">
                <motion.div
                  whileHover={{ scale: 1.1, rotateY: 15, rotateX: 5 }}
                  className="w-22 h-22 md:w-24 md:h-24"
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

                <h1 className={`text-5xl md:text-6xl font-light tracking-wider ${isLight ? "text-gray-900" : "text-white"}`}>
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
                <ChatInput
                  message={message}
                  setMessage={setMessage}
                  onSend={handleSend}
                  onNewChat={handleNewChat}
                  onKeyPress={handleKeyPress}
                  onKeyDown={handleKeyDown}
                  isLoading={isLoading}
                  variant="landing"
                  showNewChatButton={messages.length > 0}
                />

                {/* Autocomplete Suggestions Dropdown - Only show in Map mode */}
                <AutocompleteDropdown
                  suggestions={autocomplete.suggestions}
                  showSuggestions={isMapVisible && autocomplete.showSuggestions}
                  selectedIndex={autocomplete.selectedSuggestionIndex}
                  onSelect={autocomplete.handleSelectSuggestion}
                  suggestionsRef={suggestionsRef}
                  variant="landing"
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversation View - Hide when map is visible */}
      {!showLanding && !isMapVisible && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-4 pt-40 md:pt-28 pb-[12rem] md:pb-2 relative">
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
                          {cleanResponseText(msg.content)}
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

                {/* Consolidated component rendering */}
                {msg.components && (
                  <ChatResultsContainer
                    components={msg.components}
                    onOpenListingPanel={handleOpenListingPanel}
                  />
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
        <>
          <ChatInput
            message={message}
            setMessage={setMessage}
            onSend={handleSend}
            onNewChat={handleNewChat}
            onKeyPress={handleKeyPress}
            onKeyDown={handleKeyDown}
            isLoading={isLoading}
            variant="conversation"
            showNewChatButton={true}
          />

          <AutocompleteDropdown
            suggestions={autocomplete.suggestions}
            showSuggestions={autocomplete.showSuggestions}
            selectedIndex={autocomplete.selectedSuggestionIndex}
            onSelect={autocomplete.handleSelectSuggestion}
            suggestionsRef={suggestionsRef}
            variant="conversation"
          />
        </>
      )}
    </div>

    {/* New Chat Confirmation Modal - Outside main container for proper viewport centering */}
    <NewChatModal
      isOpen={showNewChatModal}
      onConfirm={confirmNewChat}
      onCancel={cancelNewChat}
    />

    {/* ListingBottomPanel for swipe functionality */}
    {showListingPanel && currentListingQueue.length > 0 && currentListingIndex < currentListingQueue.length && (
      <ListingBottomPanel
        listing={{
          ...(currentListingQueue[currentListingIndex] as any),
          _id: currentListingQueue[currentListingIndex].id,
          listingId: currentListingQueue[currentListingIndex].id,
          listingKey: (currentListingQueue[currentListingIndex] as any).listingKey || currentListingQueue[currentListingIndex].id,
          slug: currentListingQueue[currentListingIndex].slugAddress || currentListingQueue[currentListingIndex].slug || currentListingQueue[currentListingIndex].url?.replace('/mls-listings/', ''),
          slugAddress: currentListingQueue[currentListingIndex].slugAddress || currentListingQueue[currentListingIndex].slug || currentListingQueue[currentListingIndex].url?.replace('/mls-listings/', ''),
          primaryPhotoUrl: (currentListingQueue[currentListingIndex] as any).primaryPhotoUrl || currentListingQueue[currentListingIndex].image || '',
          unparsedAddress: (currentListingQueue[currentListingIndex] as any).unparsedAddress || currentListingQueue[currentListingIndex].address,
          address: currentListingQueue[currentListingIndex].address,
          latitude: currentListingQueue[currentListingIndex].latitude || 0,
          longitude: currentListingQueue[currentListingIndex].longitude || 0,
          listPrice: (currentListingQueue[currentListingIndex] as any).listPrice || currentListingQueue[currentListingIndex].price,
          bedsTotal: (currentListingQueue[currentListingIndex] as any).bedsTotal || (currentListingQueue[currentListingIndex] as any).bedroomsTotal || currentListingQueue[currentListingIndex].beds,
          bathroomsTotalInteger: (currentListingQueue[currentListingIndex] as any).bathroomsTotalInteger || (currentListingQueue[currentListingIndex] as any).bathroomsTotalDecimal || currentListingQueue[currentListingIndex].baths,
          livingArea: (currentListingQueue[currentListingIndex] as any).livingArea || currentListingQueue[currentListingIndex].sqft,
          city: currentListingQueue[currentListingIndex].city,
          subdivisionName: (currentListingQueue[currentListingIndex] as any).subdivisionName || currentListingQueue[currentListingIndex].subdivision,
        } as any}
        fullListing={currentListingQueue[currentListingIndex] as any}
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
      <>
        <ChatInput
          message={message}
          setMessage={setMessage}
          onSend={handleSend}
          onKeyPress={handleKeyPress}
          onKeyDown={handleKeyDown}
          isLoading={isLoading}
          variant="map"
          placeholder="Search locations, addresses, cities..."
        />

        <AutocompleteDropdown
          suggestions={autocomplete.suggestions}
          showSuggestions={autocomplete.showSuggestions}
          selectedIndex={autocomplete.selectedSuggestionIndex}
          onSelect={autocomplete.handleSelectSuggestion}
          suggestionsRef={suggestionsRef}
          variant="map"
        />
      </>
    )}
    </>
  );
}
