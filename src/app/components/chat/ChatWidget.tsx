// src/app/components/chat/ChatWidget.tsx
// Main chat widget component with Groq integration

"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Loader2, AlertCircle } from "lucide-react";
import { useChatContext } from "./ChatProvider";
import {
  buildSystemPrompt,
  buildConversationHistory,
  extractGoalsFromText,
  getWelcomeMessage,
} from "@/lib/chat-utils";
import { getLocationWithCache } from "@/lib/geolocation";
import ListingCarousel, { type Listing } from "./ListingCarousel";
import MapView, { type MapLocation } from "./MapView";
import ChatMapView from "./ChatMapView";
import { detectFunctionCall, executeMLSSearch, formatSearchResultsForAI } from "@/lib/ai-functions";
import { parseAIResponse } from "@/lib/message-parser";

interface ChatWidgetProps {
  context: "homepage" | "listing" | "dashboard";
  listingData?: any; // For listing context
  className?: string;
}

interface ChatMessageWithComponents {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  context?: "homepage" | "listing" | "dashboard" | "general";
  listings?: Listing[];
  mapLocations?: MapLocation[];
}

export default function ChatWidget({ context, listingData, className = "" }: ChatWidgetProps) {
  const { messages, addMessage, isOpen, setIsOpen, userId } = useChatContext();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [userLocation, setUserLocation] = useState<{ city?: string; region?: string } | null>(null);
  const [enrichedMessages, setEnrichedMessages] = useState<ChatMessageWithComponents[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Filter messages by current context
  const contextMessages = messages.filter((msg) => msg.context === context || !msg.context);

  // Combine persistent messages with enriched messages (listings/maps) and streaming
  const allMessages = [...contextMessages, ...enrichedMessages];

  // Combine with streaming message for display
  const displayMessages = streamingMessage
    ? [...allMessages, { id: 'streaming', role: 'assistant' as const, content: streamingMessage, timestamp: new Date(), context }]
    : allMessages;

  // Auto-scroll to bottom when new messages arrive or streaming updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages, streamingMessage]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Load user location on mount
  useEffect(() => {
    getLocationWithCache().then(setUserLocation);
  }, []);

  // Send welcome message if this is the first interaction in this context
  useEffect(() => {
    if (isOpen && contextMessages.length === 0 && !isLoading && !streamingMessage) {
      const welcomeMsg = getWelcomeMessage(context, userLocation);
      addMessage({
        role: "assistant",
        content: welcomeMsg,
        context,
      });
    }
  }, [isOpen, context, contextMessages.length, isLoading, streamingMessage, userLocation]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !userId) return;

    const userMessage = input.trim();
    setInput("");
    setError("");

    // Add user message to chat
    addMessage({
      role: "user",
      content: userMessage,
      context,
    });

    setIsLoading(true);

    try {
      // Build conversation history
      const history = buildConversationHistory(
        contextMessages.map((m) => ({ role: m.role, content: m.content }))
      );

      // Add current user message
      history.push({ role: "user", content: userMessage });

      // Build system prompt with location awareness
      // NOTE: This ChatWidget uses the old Groq integration (being phased out)
      // The new chat uses /api/chat/stream which has matchLocation and searchCity tools
      const systemPrompt = buildSystemPrompt(context, listingData, userLocation);

      // Prepare messages for Groq
      const llmMessages = [
        { role: "system", content: systemPrompt },
        ...history,
      ];

      // Call Groq API
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: llmMessages,
          userId,
          userTier: "free",
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const fullResponse = data.response;

      // Check if AI wants to call a function
      const functionCall = detectFunctionCall(fullResponse);

      if (functionCall && functionCall.type === "search") {
        // Execute MLS search
        console.log("🔍 AI requesting MLS search:", functionCall.params);
        const searchResults = await executeMLSSearch(functionCall.params);

        if (searchResults.success && searchResults.listings.length > 0) {
          // Add AI message with clean text
          addMessage({
            role: "assistant",
            content: functionCall.cleanedText || "Let me show you what I found!",
            context,
          });

          // Store listings in state for display
          setEnrichedMessages((prev) => [
            ...prev,
            {
              id: `search_${Date.now()}`,
              role: "assistant",
              content: `Found ${searchResults.count} properties matching your criteria:`,
              timestamp: new Date(),
              context,
              listings: searchResults.listings,
            },
          ]);

          // Add search results back to conversation for AI context
          const resultsContext = formatSearchResultsForAI(searchResults.listings);
          addMessage({
            role: "system",
            content: `[Search Results] ${resultsContext}`,
            context,
          });
        } else {
          // No results found
          addMessage({
            role: "assistant",
            content: "I couldn't find any properties matching those exact criteria. Would you like me to adjust the search parameters?",
            context,
          });
        }
      } else {
        // No function call - just add the response
        addMessage({
          role: "assistant",
          content: fullResponse,
          context,
        });
      }

      // Extract goals from the conversation
      const extractedGoals = extractGoalsFromText(userMessage + " " + fullResponse);

      if (Object.keys(extractedGoals).length > 0) {
        // Save goals to database
        fetch("/api/chat/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            goals: extractedGoals,
            context,
            conversationSnippet: userMessage,
          }),
        }).catch((err) => console.error("Error saving goals:", err));
      }
    } catch (err: any) {
      console.error("Error generating response:", err);
      setError(err.message || "Failed to generate response. Please try again.");
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

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 ${className}`}
      >
        <MessageCircle className="w-5 h-5" />
        <span className="font-medium">Ask AI Assistant</span>
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-3rem)] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col ${className}`}
      style={{ maxHeight: "600px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-white" />
          <h3 className="font-semibold text-white">AI Real Estate Assistant</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
        {displayMessages.map((message) => {
          const enrichedMsg = message as ChatMessageWithComponents;

          // Parse AI responses for component markers
          const parsed = message.role === "assistant"
            ? parseAIResponse(message.content)
            : { text: message.content, carousel: null, map: null };

          return (
            <div key={message.id}>
              {/* Text content */}
              {parsed.text && (
                <div
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-lg ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : message.role === "system"
                        ? "hidden" // Hide system messages
                        : "bg-gray-800 text-gray-100 border border-gray-700"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{parsed.text}</p>
                  </div>
                </div>
              )}

              {/* Listing Carousel from component markers */}
              {parsed.carousel && (
                <div className="mt-4 w-full">
                  <ListingCarousel
                    listings={parsed.carousel.listings}
                    title={parsed.carousel.title}
                  />
                </div>
              )}

              {/* Map View from component markers */}
              {parsed.map && (
                <div className="mt-4 w-full rounded-lg overflow-hidden border border-gray-700">
                  <ChatMapView listings={parsed.map.listings} />
                </div>
              )}

              {/* Legacy: Show listing carousel if this message has listings (for backwards compatibility) */}
              {enrichedMsg.listings && enrichedMsg.listings.length > 0 && !parsed.carousel && (
                <div className="flex justify-start mt-2">
                  <ListingCarousel
                    listings={enrichedMsg.listings}
                    title={`${enrichedMsg.listings.length} properties found`}
                  />
                </div>
              )}

              {/* Legacy: Show map if this message has map locations (for backwards compatibility) */}
              {enrichedMsg.mapLocations && enrichedMsg.mapLocations.length > 0 && !parsed.map && (
                <div className="flex justify-start mt-2">
                  <MapView locations={enrichedMsg.mapLocations} />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] px-4 py-2 rounded-lg bg-gray-800 text-gray-100 border border-gray-700">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-start">
            <div className="max-w-[80%] px-4 py-2 rounded-lg bg-red-900/20 text-red-400 border border-red-700">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700 bg-gray-900">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about properties..."
            className="flex-1 px-3 py-2 bg-gray-800 text-white border border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500 text-center">
          Powered by Groq AI
        </p>
      </div>
    </div>
  );
}
