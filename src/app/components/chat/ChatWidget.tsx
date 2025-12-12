"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Copy, Check, Share, SquarePen, Loader2 } from "lucide-react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSession } from "next-auth/react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useChatContext, ComponentData } from "./ChatProvider";
import ListingCarousel from "./ListingCarousel";
import ChatMapView from "./ChatMapView";
import { ArticleResults } from "./ArticleCard";
import { AppreciationCard } from "../analytics/AppreciationCard";
import { ComparisonCard } from "../analytics/ComparisonCard";
import ListingBottomPanel from "../mls/map/ListingBottomPanel";
import { useMLSContext } from "../mls/MLSProvider";
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
          }
        }, 15); // 15ms per word - faster reveal
      } else {
        // Handle API errors gracefully
        setIsLoading(false);
        const errorMessage = data.error || data.details || "I encountered an issue processing your request.";
        addMessage(
          `I apologize, but I encountered an issue: ${errorMessage}\n\nPlease try rephrasing your question or try again in a moment.`,
          "assistant"
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      setIsLoading(false);
      addMessage(
        "I apologize, but I'm having trouble connecting right now. Please check your connection and try again.",
        "assistant"
      );
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
    <div className="h-screen w-full flex flex-col" data-page={showLanding ? "chat-landing" : "chat"} style={{ fontFamily: `'${chatFont}', sans-serif` }}>
      {/* Landing View */}
      <AnimatePresence>
        {showLanding && (
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
                className="w-full max-w-[700px]"
              >
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
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversation View */}
      {!showLanding && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-36 md:pt-6 pb-6 relative">
          <div className="max-w-6xl mx-auto space-y-4 overflow-hidden">
            {messages.map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-4"
              >
                {/* Text message row */}
                <div className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isLight
                        ? "bg-gradient-to-br from-blue-400 to-blue-600"
                        : "bg-gradient-to-br from-neutral-600 to-neutral-800 border border-neutral-600"
                    }`}>
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}

                  <div className="max-w-3xl flex flex-col">
                    <div
                      className={`rounded-2xl px-5 py-4 select-text ${
                        msg.role === "user"
                          ? isLight
                            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20"
                            : "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                          : isLight
                            ? "bg-white/90 text-gray-800 shadow-md border border-gray-200/50"
                            : "bg-neutral-900/80 text-neutral-50 shadow-lg border border-neutral-700/50 backdrop-blur-sm"
                      }`}
                    >
                      <div className={`text-[20px] leading-relaxed font-medium tracking-[-0.01em] select-text [&>p]:my-1.5 [&>ul]:my-2.5 [&>ul]:ml-4 [&>ul]:list-disc [&>ol]:my-2.5 [&>ol]:ml-4 [&>ol]:list-decimal [&>li]:my-1 [&>strong]:font-semibold [&>h1]:text-xl [&>h1]:font-semibold [&>h1]:mb-2 [&>h2]:text-lg [&>h2]:font-semibold [&>h2]:mb-2 [&>h3]:font-semibold [&>h3]:mb-1 ${
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
                    {/* Copy and Share buttons for assistant messages */}
                    {msg.role === "assistant" && (
                      <div className="mt-2 self-start flex items-center gap-2">
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
                    )}
                  </div>

                  {msg.role === "user" && (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
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
                        <User className="w-5 h-5 text-white" />
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

      {/* Chat Input - Only show in conversation mode */}
      {!showLanding && (
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
              className={`w-full px-6 py-4 pr-28 bg-transparent outline-none rounded-2xl text-[15px] font-medium tracking-[-0.01em] ${
                isLight ? "text-gray-900 placeholder-gray-400" : "text-white placeholder-neutral-400"
              }`}
            />
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
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9998]"
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
              className={`rounded-2xl p-8 shadow-2xl w-full max-w-md ${
                isLight
                  ? 'bg-white border border-gray-200'
                  : 'bg-gray-800 border border-gray-700'
              }`}
            >
              {/* Icon */}
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${
                isLight ? 'bg-blue-100' : 'bg-purple-500/20'
              }`}>
                <SquarePen className={`w-7 h-7 ${
                  isLight ? 'text-blue-600' : 'text-purple-400'
                }`} />
              </div>

              {/* Title */}
              <h3 className={`text-2xl font-bold mb-3 ${
                isLight ? 'text-gray-900' : 'text-white'
              }`}>
                Start New Conversation?
              </h3>

              {/* Description */}
              <p className={`text-base mb-8 leading-relaxed ${
                isLight ? 'text-gray-600' : 'text-gray-300'
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
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-200 hover:shadow-lg'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmNewChat}
                  className={`flex-1 px-5 py-3 rounded-xl font-semibold text-white transition-all shadow-lg ${
                    isLight
                      ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl'
                      : 'bg-purple-600 hover:bg-purple-700 hover:shadow-purple-500/50'
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
    </>
  );
}
