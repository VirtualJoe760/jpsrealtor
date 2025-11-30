"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Copy, Check, Share } from "lucide-react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { useSession } from "next-auth/react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useChatContext, ComponentData } from "./ChatProvider";
import ListingCarousel from "./ListingCarousel";
import ChatMapView from "./ChatMapView";
import { ArticleResults } from "./ArticleCard";

export default function ChatWidget() {
  const { data: session } = useSession();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { messages, addMessage } = useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        // Streaming text reveal effect
        setIsLoading(false);
        setIsStreaming(true);
        const fullText = data.response;
        const components: ComponentData | undefined = data.components;
        let currentIndex = 0;

        const intervalId = setInterval(() => {
          if (currentIndex < fullText.length) {
            setStreamingText(fullText.substring(0, currentIndex + 1));
            currentIndex++;
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          } else {
            clearInterval(intervalId);
            setIsStreaming(false);
            setStreamingText("");
            addMessage(fullText, "assistant", undefined, components);
          }
        }, 20); // 20ms per character for smooth reveal
      }
    } catch (error) {
      console.error("Chat error:", error);
      addMessage("Sorry, something went wrong. Please try again.", "assistant");
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

  // Font options - change this to swap fonts easily
  // Options: 'Plus Jakarta Sans', 'DM Sans', 'Inter'
  const chatFont = 'DM Sans';

  return (
    <div className="h-screen w-full flex flex-col" data-page={showLanding ? "chat-landing" : "chat"} style={{ fontFamily: `'${chatFont}', sans-serif` }}>
      {/* Landing View */}
      <AnimatePresence>
        {showLanding && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="flex-1 flex items-center justify-center pb-32 md:pb-32 xl:pb-32 2xl:pb-0"
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
                    className={`w-full px-6 py-4 pr-14 bg-transparent outline-none rounded-2xl text-[15px] font-medium tracking-[-0.01em] ${
                      isLight ? "text-gray-900 placeholder-gray-400" : "text-white placeholder-neutral-400"
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
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
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
                      <ReactMarkdown>{streamingText}</ReactMarkdown>
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
              className={`w-full px-6 py-4 pr-14 bg-transparent outline-none rounded-2xl text-[15px] font-medium tracking-[-0.01em] ${
                isLight ? "text-gray-900 placeholder-gray-400" : "text-white placeholder-neutral-400"
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
      )}
    </div>
  );
}
