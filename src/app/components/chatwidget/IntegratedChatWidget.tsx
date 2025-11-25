"use client";

import { useState, useEffect, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { useChatContext } from "@/app/components/chat/ChatProvider";
import { useEnhancedChat } from "@/app/components/chat/EnhancedChatProvider";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getLocationWithCache } from "@/lib/geolocation";
import type { UserData } from "@/lib/chat-utils";
import type { Listing } from "@/app/components/chat/ListingCarousel";
import ChatLandingView from "./ChatLandingView";
import ChatMessageList, { type DisplayMessage } from "./ChatMessageList";
import AnimatedChatInput from "./AnimatedChatInput";
import { useChatHandler } from "./hooks/useChatHandler";
import {
  loadConversationMessages,
  saveConversationMessages,
} from "./EnhancedSidebar";

export default function IntegratedChatWidget() {
  const { messages, addMessage, userId } = useChatContext();
  const { chatMode, expandChat, setSearchResults } = useEnhancedChat();
  const { data: session } = useSession();
  const router = useRouter();

  const [userLocation, setUserLocation] = useState<{ city?: string; region?: string } | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [conversationId] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const loadConversationId = params.get("conversation");
      if (loadConversationId) return loadConversationId;
    }
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  });
  const [hasTrackedFirstMessage, setHasTrackedFirstMessage] = useState(false);
  const [selectedListingsPerMessage, setSelectedListingsPerMessage] = useState<Record<string, Listing[]>>({});
  const [generatingCMA, setGeneratingCMA] = useState(false);
  const [generatedCMAData, setGeneratedCMAData] = useState<Record<string, any>>({});

  // Use chat handler hook for all AI logic
  const { handleSend, isStreaming, streamingMessage, error } = useChatHandler({
    messages,
    addMessage,
    userId,
    userLocation,
    userData,
    conversationId,
    hasTrackedFirstMessage,
    setHasTrackedFirstMessage,
    setSearchResults,
  });

  // Display messages (filter and deduplicate)
  const displayMessages = useMemo(() => {
    const context = "general";
    const baseMessages: DisplayMessage[] = messages
      .filter((msg) => {
        const matchesContext = !msg.context || msg.context === context;
        const isNotSystemMessage = msg.role !== "system";
        return matchesContext && isNotSystemMessage;
      })
      .map((msg) => ({
        id: msg.id || `msg_${msg.timestamp}`,
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        listings: Array.isArray((msg as any).listings) ? (msg as any).listings : undefined,
      }));

    if (streamingMessage) {
      baseMessages.push({
        id: "streaming",
        role: "assistant",
        content: streamingMessage,
        timestamp: new Date(),
      });
    }

    // Deduplicate by ID
    const seen = new Set<string>();
    return baseMessages.filter((msg) => {
      if (seen.has(msg.id)) return false;
      seen.add(msg.id);
      return true;
    });
  }, [messages, streamingMessage]);

  // Load user location
  useEffect(() => {
    getLocationWithCache().then(setUserLocation);
  }, []);

  // Load user data for personalization
  useEffect(() => {
    const fetchUserData = async () => {
      if (!session?.user?.email && !userId) return;

      try {
        if (session?.user?.email) {
          const profileResponse = await fetch("/api/user/profile");
          if (profileResponse.ok) {
            const { profile } = await profileResponse.json();

            const favoritesResponse = await fetch("/api/user/favorites");
            const favoritesData = favoritesResponse.ok ? await favoritesResponse.json() : null;

            const goalsResponse = await fetch(`/api/chat/goals?userId=${userId}`);
            const goalsData = goalsResponse.ok ? await goalsResponse.json() : null;

            const data: UserData = {
              name: profile?.name,
              profileDescription: profile?.profileDescription,
              realEstateGoals: profile?.realEstateGoals,
              homeownerStatus: profile?.homeownerStatus,
              topCities: favoritesData?.analytics?.topCities || [],
              topSubdivisions: favoritesData?.analytics?.topSubdivisions || [],
              favoriteCount: favoritesData?.favorites?.length || 0,
              chatGoals: goalsData?.goals?.goals || undefined,
            };

            setUserData(data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch user data for personalization:", error);
      }
    };

    fetchUserData();
  }, [session, userId]);

  // Load conversation from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const loadConversationId = params.get("conversation");

      if (loadConversationId && messages.length === 0) {
        const savedMessages = loadConversationMessages(loadConversationId);

        if (savedMessages.length > 0) {
          savedMessages.forEach((msg) => {
            addMessage({
              role: msg.role as "user" | "assistant" | "system",
              content: msg.content,
              context: "general",
              listings: msg.listings,
            });
          });

          setHasTrackedFirstMessage(true);
        }
      }
    }
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0 && conversationId) {
      const messagesToSave = messages
        .filter((msg) => msg.role !== "system")
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp).getTime(),
          listings: msg.listings,
        }));
      saveConversationMessages(conversationId, messagesToSave);
    }
  }, [messages, conversationId]);

  // Prevent body scroll on mobile in landing mode
  useEffect(() => {
    if (chatMode === "landing" && typeof window !== "undefined") {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        document.body.style.overflow = "hidden";
        document.body.style.height = "100vh";
        document.body.style.touchAction = "none";
      }
    } else {
      document.body.style.overflow = "";
      document.body.style.height = "";
      document.body.style.touchAction = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.height = "";
      document.body.style.touchAction = "";
    };
  }, [chatMode]);

  const handleMicClick = () => {
    setIsVoiceActive(!isVoiceActive);
  };

  const handleViewOnMap = (listings: Listing[]) => {
    const validListings = listings.filter((l) => l.latitude && l.longitude);
    if (validListings.length === 0) {
      router.push("/map");
      return;
    }

    const lats = validListings.map((l) => l.latitude!);
    const lngs = validListings.map((l) => l.longitude!);

    const bounds = {
      north: Math.max(...lats) + (Math.max(...lats) - Math.min(...lats)) * 0.1 || 0.01,
      south: Math.min(...lats) - (Math.max(...lats) - Math.min(...lats)) * 0.1 || 0.01,
      east: Math.max(...lngs) + (Math.max(...lngs) - Math.min(...lngs)) * 0.1 || 0.01,
      west: Math.min(...lngs) - (Math.max(...lngs) - Math.min(...lngs)) * 0.1 || 0.01,
      zoom: 13,
    };

    router.push(`/map?bounds=${encodeURIComponent(JSON.stringify(bounds))}`);
  };

  const handleSelectionChange = (messageId: string, selectedListings: Listing[]) => {
    setSelectedListingsPerMessage((prev) => ({
      ...prev,
      [messageId]: selectedListings,
    }));
  };

  const handleGenerateCMA = async (messageId: string, selectedListings: Listing[]) => {
    if (selectedListings.length === 0) return;

    try {
      setGeneratingCMA(true);

      const response = await fetch("/api/ai/cma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedProperties: selectedListings.map((l) => ({
            address: l.address,
            price: l.price,
            beds: l.beds,
            baths: l.baths,
            sqft: l.sqft,
            city: l.city,
            subdivision: l.subdivision,
            listingId: l.id,
            latitude: l.latitude,
            longitude: l.longitude,
          })),
          city: selectedListings[0]?.city || "Unknown",
          subdivision: selectedListings[0]?.subdivision,
          maxComps: 20,
          includeInvestmentAnalysis: true,
        }),
      });

      if (!response.ok) throw new Error(`CMA API failed: ${response.status}`);

      const data = await response.json();
      setGeneratedCMAData((prev) => ({ ...prev, [messageId]: data }));

      addMessage({
        role: "assistant",
        content: `📊 I've generated a Comparative Market Analysis for your ${selectedListings.length} selected ${selectedListings.length === 1 ? "property" : "properties"}. Here are the insights:`,
        context: "general",
        cmaData: data,
      });
    } catch (error) {
      console.error("Error generating CMA:", error);
      addMessage({
        role: "assistant",
        content: "I encountered an error while generating the CMA. Please try again.",
        context: "general",
      });
    } finally {
      setGeneratingCMA(false);
    }
  };

  return (
    <div
      className={`relative h-full w-full flex flex-col overflow-x-hidden ${
        chatMode === "landing" ? "overflow-y-hidden" : "overflow-y-auto"
      }`}
      style={{ maxWidth: "100vw" }}
    >
      {/* Landing Page */}
      <AnimatePresence>
        {chatMode === "landing" && (
          <ChatLandingView
            onSend={handleSend}
            onMicClick={handleMicClick}
            isStreaming={isStreaming}
            streamingMessage={streamingMessage}
          />
        )}
      </AnimatePresence>

      {/* Conversation View */}
      <AnimatePresence>
        {chatMode === "conversation" && (
          <ChatMessageList
            messages={displayMessages}
            streamingMessage={streamingMessage}
            isStreaming={isStreaming}
            onViewOnMap={handleViewOnMap}
            onSelectionChange={handleSelectionChange}
            onGenerateCMA={handleGenerateCMA}
            selectedListingsPerMessage={selectedListingsPerMessage}
            generatedCMAData={generatedCMAData}
            generatingCMA={generatingCMA}
          />
        )}
      </AnimatePresence>

      {/* Chat Input (conversation and minimized modes) */}
      {chatMode !== "landing" && (
        <AnimatedChatInput
          mode={chatMode}
          onSend={handleSend}
          onMicClick={handleMicClick}
          onMinimizedClick={expandChat}
          isStreaming={isStreaming}
          streamingText={streamingMessage}
        />
      )}
    </div>
  );
}
