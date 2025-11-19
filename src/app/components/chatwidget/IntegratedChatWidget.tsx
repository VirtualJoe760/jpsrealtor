"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatContext } from "@/app/components/chat/ChatProvider";
import { useEnhancedChat } from "@/app/components/chat/EnhancedChatProvider";
import { streamChatCompletion } from "@/lib/webllm";
import {
  buildSystemPrompt,
  buildConversationHistory,
  extractGoalsFromText,
  UserData,
} from "@/lib/chat-utils";
import { getLocationWithCache } from "@/lib/geolocation";
import ListingCarousel, { type Listing } from "@/app/components/chat/ListingCarousel";
import ChatMapView from "@/app/components/chat/ChatMapView";
import { detectFunctionCall, executeMLSSearch, formatSearchResultsForAI } from "@/lib/ai-functions";
import { InitProgressReport } from "@mlc-ai/web-llm";
import { User, Bot, Loader2 } from "lucide-react";
import AnimatedChatInput from "./AnimatedChatInput";
import StarsCanvas from "./StarsCanvas";
import { fadeSlideIn } from "@/app/utils/chat/motion";
import { useSession } from "next-auth/react";
import { addToConversationHistory, updateConversationMessageCount, saveConversationMessages } from "./EnhancedSidebar";
import Image from "next/image";

// Simple markdown parser for basic formatting
function parseMarkdown(text: string): React.ReactNode {
  if (!text) return text;

  // Split by bold markers but keep them
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, index) => {
    // Check if this part is wrapped in **
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2); // Remove ** from both ends
      return <strong key={index} className="font-bold text-white">{boldText}</strong>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

// Helper function to log chat messages via API (non-blocking)
const logChatMessageAsync = async (role: string, content: string, userId: string, metadata?: any) => {
  try {
    await fetch('/api/chat/log-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, content, userId, metadata })
    });
  } catch (error) {
    // Silently fail - logging shouldn't break the app
    console.warn('Failed to log message:', error);
  }
};

export default function IntegratedChatWidget() {
  const { messages, addMessage, userId } = useChatContext();
  const {
    chatMode,
    setChatMode,
    searchResults,
    setSearchResults,
    animateInputToBottom,
    expandChat,
    currentView,
  } = useEnhancedChat();
  const { data: session } = useSession();

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [loadingProgress, setLoadingProgress] = useState("");
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [error, setError] = useState("");
  const [userLocation, setUserLocation] = useState<{ city?: string; region?: string } | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [useAPIFallback, setUseAPIFallback] = useState(true); // Always use Groq API for fast, reliable responses
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [conversationId] = useState(() => `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [hasTrackedFirstMessage, setHasTrackedFirstMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const MAX_RETRIES = 2; // ISSUE #3 FIX: Retry up to 2 times before giving up

  // ISSUE #5 FIX: Track if user has manually scrolled away from bottom
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // ISSUE #4 FIX: Single unified message interface with proper TypeScript types
  interface DisplayMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    isLoading?: boolean;
    listings?: Listing[];
  }

  // ISSUE #4 FIX: Simplified message state - single source of truth
  // Filter messages by context and exclude system messages
  const context = "general";
  const displayMessages = React.useMemo(() => {
    // Get base messages from context
    const baseMessages: DisplayMessage[] = messages
      .filter((msg) => {
        const matchesContext = !msg.context || msg.context === context;
        const isNotSystemMessage = msg.role !== "system";
        return matchesContext && isNotSystemMessage;
      })
      .map(msg => ({
        id: msg.id || `msg_${msg.timestamp}`,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        // Safely check if listings exist and is an array
        listings: Array.isArray((msg as any).listings) ? (msg as any).listings : undefined
      }));

    // Add streaming message if present
    if (streamingMessage) {
      baseMessages.push({
        id: "streaming",
        role: "assistant",
        content: streamingMessage,
        timestamp: new Date(),
      });
    }

    // Remove duplicate messages by ID (deduplication)
    const seen = new Set<string>();
    return baseMessages.filter(msg => {
      if (seen.has(msg.id)) return false;
      seen.add(msg.id);
      return true;
    });
  }, [messages, streamingMessage]);

  // ISSUE #5 FIX: Detect when user scrolls manually
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // Consider "at bottom" if within 100px of bottom
      const atBottom = distanceFromBottom < 100;
      setIsAtBottom(atBottom);

      // User is manually scrolling if not at bottom
      if (!atBottom) {
        setIsUserScrolling(true);
      } else {
        setIsUserScrolling(false);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // ISSUE #5 FIX: Auto-scroll only if user is at bottom (not interrupting reading)
  useEffect(() => {
    if (isAtBottom && !isUserScrolling) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayMessages, streamingMessage, isAtBottom, isUserScrolling]);

  // Load user location
  useEffect(() => {
    getLocationWithCache().then(setUserLocation);
  }, []);

  // Load user data for personalization (profile, goals, favorites)
  useEffect(() => {
    const fetchUserData = async () => {
      if (!session?.user?.email && !userId) {
        // No authenticated user or anonymous user - skip personalization
        return;
      }

      try {
        // Fetch user profile if authenticated
        if (session?.user?.email) {
          const profileResponse = await fetch('/api/user/profile');
          if (profileResponse.ok) {
            const { profile } = await profileResponse.json();

            // Fetch favorites and analytics
            const favoritesResponse = await fetch('/api/user/favorites');
            const favoritesData = favoritesResponse.ok ? await favoritesResponse.json() : null;

            // Fetch chat goals
            const goalsResponse = await fetch(`/api/chat/goals?userId=${userId}`);
            const goalsData = goalsResponse.ok ? await goalsResponse.json() : null;

            // Build userData object
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
            console.log('📊 User data loaded for personalization:', data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data for personalization:', error);
        // Fail gracefully - chat works without personalization
      }
    };

    fetchUserData();
  }, [session, userId]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0 && conversationId) {
      const messagesToSave = messages
        .filter(msg => msg.role !== "system") // Don't save system messages
        .map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp).getTime(),
          listings: msg.listings,
        }));
      saveConversationMessages(conversationId, messagesToSave);
    }
  }, [messages, conversationId]);

  // Always use Groq API for fast, reliable responses on both mobile and desktop
  useEffect(() => {
    console.log('🚀 Using Groq API for AI responses (works on mobile and desktop)');
  }, []);

  // DO NOT send automatic welcome message - let AI respond naturally to first user message

  // ISSUE #3 FIX: Separate function to get AI response with retry logic and API fallback
  const getAIResponse = async (llmMessages: any[], attemptNumber: number = 0): Promise<string> => {
    const progressCallback = (report: InitProgressReport) => {
      setLoadingProgress(report.text);
      setLoadingPercent(Math.round(report.progress * 100));
    };

    // Always use Groq API for fast, reliable responses
    if (useAPIFallback) {
      try {
        console.log('🚀 Using Groq API (fast & cheap)...');
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: llmMessages,
            userId,
            userTier: 'free' // TODO: Get from user's subscription status
          })
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Groq response received:', {
          model: data.metadata?.model,
          processingTime: data.metadata?.processingTime + 'ms'
        });
        return data.response;
      } catch (error) {
        console.error('Groq API failed:', error);
        throw error;
      }
    }

    // Try WebLLM (desktop with WebGPU)
    let fullResponse = "";
    let chunkBuffer = "";

    try {
      for await (const chunk of streamChatCompletion(llmMessages, {
        temperature: 0.3, // Lower temperature for more consistent, less hallucinatory responses
        maxTokens: 300, // Reduced to prevent hallucination - function calls + brief response
        onProgress: progressCallback,
      })) {
        chunkBuffer += chunk;

        // Throttle updates for smoother streaming (update every 20ms for faster display)
        await new Promise(resolve => setTimeout(resolve, 20));

        fullResponse = chunkBuffer;
        setStreamingMessage(fullResponse);
      }

      return fullResponse;
    } catch (error) {
      console.error('WebLLM streaming failed:', error);
      // Clear streaming message on error
      setStreamingMessage("");
      throw error;
    }
  };

  const handleSend = async (userMessage: string) => {
    if (!userMessage.trim() || isStreaming || !userId) return;

    setError("");
    setIsStreaming(true);
    const startTime = Date.now();

    // Log user message (async, non-blocking)
    logChatMessageAsync('user', userMessage, userId, {
      timestamp: new Date().toISOString()
    });

    // DON'T add user message yet - wait to see if it triggers a search
    // We'll add it conditionally based on the AI's response

    let currentAttempt = 0;
    let fullResponse = "";

    while (currentAttempt <= MAX_RETRIES) {
      try {
        // Build conversation history - EXCLUDE system messages (they're internal only)
        const conversationMessages = messages.filter(msg =>
          (!msg.context || msg.context === context) && msg.role !== "system"
        );
        const history = buildConversationHistory(
          conversationMessages.map((m) => ({ role: m.role, content: m.content }))
        );

        history.push({ role: "user", content: userMessage });

        // Build system prompt - MUST BE FIRST MESSAGE (with personalization)
        const systemPrompt = buildSystemPrompt("general", null, userLocation, userData);

        const enhancedSystemPrompt = `${systemPrompt}

FUNCTION CALLING RULES:
- When ready to show properties, use: searchListings({"minBeds": 3, "cities": ["Palm Springs"]})
- You can respond naturally AND call function - both are fine
- If calling searchListings, you can add a brief intro like "Let me find some options for you."
- DON'T echo conversation history ("User: ...", "You: ...")
- DON'T make multiple search calls in one response`;

        // CRITICAL: System message MUST be first, then conversation history
        const llmMessages = [{ role: "system", content: enhancedSystemPrompt }, ...history];

        // ISSUE #3 FIX: Get AI response with retry logic
        fullResponse = await getAIResponse(llmMessages, currentAttempt);

        setStreamingMessage("");

        // Log AI response (async, non-blocking)
        logChatMessageAsync('assistant', fullResponse, userId, {
          loadingTime: Date.now() - startTime,
          attemptNumber: currentAttempt,
          usedAPIFallback: useAPIFallback,
          timestamp: new Date().toISOString()
        });

        // Success! Break out of retry loop
        setRetryCount(0);
        break;

      } catch (err: any) {
        currentAttempt++;
        console.error(`Chat error (attempt ${currentAttempt}/${MAX_RETRIES + 1}):`, err);

        // Clear streaming message on error
        setStreamingMessage("");

        // ISSUE #3 FIX: If WebLLM fails and we're not already using API fallback, switch to it
        const isWebGPUError = err.message?.includes('WebGPU') || err.message?.includes('GPU');
        if (!useAPIFallback && isWebGPUError) {
          console.log('⚠️ WebLLM failed, switching to API fallback...');
          setUseAPIFallback(true);
          currentAttempt = 0; // Reset attempt counter for API fallback
          continue; // Retry with API
        }

        // If we've exhausted retries, throw the error
        if (currentAttempt > MAX_RETRIES) {
          throw err;
        }

        // Wait before retrying (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, currentAttempt - 1), 5000);
        console.log(`⏳ Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    try {

      // Check for function calls
      const functionCall = detectFunctionCall(fullResponse);

      if (functionCall && functionCall.type === "search") {
        console.log("🔍 AI requesting MLS search:", functionCall.params);

        // Track conversation history on first user message (even for searches)
        if (!hasTrackedFirstMessage) {
          addToConversationHistory(userMessage, conversationId);
          setHasTrackedFirstMessage(true);
        } else {
          // Update message count for existing conversation
          updateConversationMessageCount(conversationId);
        }

        // Log function call (async, non-blocking)
        logChatMessageAsync('system', `Function call detected: searchListings`, userId, {
          functionCall: functionCall.params,
          timestamp: new Date().toISOString()
        });

        // ADD user message so they can see what they asked for
        addMessage({
          role: "user",
          content: userMessage,
          context: "general",
        });

        // ISSUE #4 FIX: Show loading state with temporary streaming message
        setStreamingMessage("Searching properties...");

        const searchResponse = await executeMLSSearch(functionCall.params);

        // Clear loading state
        setStreamingMessage("");

        // Log search results (async, non-blocking)
        logChatMessageAsync('system', `Search completed: ${searchResponse.count} listings found`, userId, {
          searchResults: {
            count: searchResponse.count,
            cities: functionCall.params.cities,
            filters: functionCall.params
          },
          timestamp: new Date().toISOString()
        });

        if (searchResponse.success && searchResponse.listings.length > 0) {
          // DON'T show the AI's raw response - it contains function calls
          // Just show a clean, user-friendly message

          console.log('🏠 Adding message with listings:', searchResponse.listings.length, 'properties');
          addMessage({
            role: "assistant",
            content: `Found ${searchResponse.count} properties matching your criteria.`,
            context: "general",
            listings: searchResponse.listings, // Attach listings to message
          });

          // Update search results for map
          setSearchResults(searchResponse.listings);

          // Add results to context (system message - won't be displayed)
          const resultsContext = formatSearchResultsForAI(searchResponse.listings);
          addMessage({
            role: "system",
            content: `[Search Results] ${resultsContext}`,
            context: "general",
          });
        } else {
          addMessage({
            role: "assistant",
            content: "I couldn't find any properties matching those criteria. Would you like to adjust your search?",
            context: "general",
          });
        }
      } else {
        // Regular message (no function call) - add user message first
        addMessage({
          role: "user",
          content: userMessage,
          context: "general",
        });

        // Track conversation history on first user message
        if (!hasTrackedFirstMessage) {
          addToConversationHistory(userMessage, conversationId);
          setHasTrackedFirstMessage(true);
        } else {
          // Update message count for existing conversation
          updateConversationMessageCount(conversationId);
        }

        // Clean response to remove any system prompt leakage
        let cleanResponse = fullResponse;
        const instructionMarkers = [
          'Function call:',
          'For searching in',
          'For market trends',
          'Remember to:',
          'Supported property types',
          'When suggesting',
          'If unsure about',
          'Example response',
          'FUNCTION CALLING:',
          'Available parameters:',
          'CRITICAL:',
        ];

        for (const marker of instructionMarkers) {
          const markerIndex = cleanResponse.indexOf(marker);
          if (markerIndex !== -1) {
            cleanResponse = cleanResponse.substring(0, markerIndex).trim();
            break;
          }
        }

        addMessage({
          role: "assistant",
          content: cleanResponse,
          context: "general",
        });
      }

      // Extract and save goals
      const goals = extractGoalsFromText(userMessage);
      if (Object.keys(goals).length > 0 && userId) {
        console.log("📊 Extracted goals:", goals);
        // Capture userId at the time of extraction to avoid race conditions
        const currentUserId = userId;
        const goalsToSave = { ...goals };

        // Save to server
        fetch("/api/chat/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUserId, goals: goalsToSave }),
        }).catch(console.error);
      }
    } catch (err: any) {
      console.error("Chat error:", err);

      // Detect mobile WebGPU issues
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const isWebGPUError = err.message?.includes('WebGPU') || err.message?.includes('GPU');

      let errorMessage = "";
      if (isMobile && isWebGPUError) {
        errorMessage = "AI chat requires desktop browser with WebGPU support. Please try on desktop or use our contact form.";
      } else {
        errorMessage = err.message || "Something went wrong. Please try again.";
      }

      setError(errorMessage);

      // Log error (async, non-blocking)
      logChatMessageAsync('system', `Error occurred: ${errorMessage}`, userId, {
        error: err.message || err.toString(),
        stack: err.stack,
        isMobile,
        isWebGPUError,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsStreaming(false);
      setLoadingProgress("");
      setLoadingPercent(0);
    }
  };

  const handleMicClick = () => {
    // TODO: Implement voice input
    setIsVoiceActive(!isVoiceActive);
    console.log("🎤 Voice input clicked");
  };

  const handleMinimizedClick = () => {
    expandChat();
  };

  // Prevent body scroll when in landing mode (only on mobile)
  useEffect(() => {
    if (chatMode === 'landing' && typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        // Save scroll position
        const scrollY = window.scrollY;
        document.body.style.overflow = 'hidden';
        document.body.style.height = '100vh';
        document.body.style.touchAction = 'none';
      }
    } else {
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.style.touchAction = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.body.style.touchAction = '';
    };
  }, [chatMode]);

  return (
    <div className={`relative h-full w-full flex flex-col ${chatMode === 'landing' ? 'overflow-hidden' : ''}`}>
      {/* ISSUE #2 FIX: Keep stars visible in all modes, just reduce opacity in conversation */}
      <AnimatePresence>
        {currentView === 'chat' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: chatMode === 'landing' ? 1 : 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ overflow: 'hidden' }}
          >
            <StarsCanvas />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Landing Page - Centered Group Container */}
      <AnimatePresence>
        {chatMode === 'landing' && (
          <div className="absolute inset-0 flex items-center justify-center z-10 px-4 pb-4 md:pb-0">
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 20,
                duration: 0.8
              }}
              className="w-full max-w-[90%] md:max-w-4xl flex flex-col items-center gap-4 md:gap-8"
            >
            {/* Logo */}
            <div className="flex items-center justify-center gap-1.5 md:gap-3">
              <motion.div
                initial={{ scale: 0, rotateY: -180 }}
                animate={{
                  scale: 1,
                  rotateY: 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 150,
                  damping: 15,
                  delay: 0.3
                }}
                whileHover={{
                  scale: 1.1,
                  rotateY: 15,
                  rotateX: 5,
                }}
                style={{
                  transformStyle: "preserve-3d",
                  perspective: 1000
                }}
                className="w-12 h-12 md:w-24 md:h-24 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 relative"
              >
                <motion.div
                  animate={{
                    rotateY: [0, 5, 0, -5, 0],
                    rotateX: [0, 2, 0, -2, 0],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <Image
                    src="/images/brand/EXP-white-square.png"
                    alt="eXp Realty"
                    width={96}
                    height={96}
                    className="object-contain drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                    priority
                  />
                </motion.div>
              </motion.div>

              {/* Vertical Divider */}
              <motion.div
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 100,
                  damping: 15,
                  delay: 0.4
                }}
                className="h-6 md:h-12 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"
              />

              <motion.h1
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 100,
                  damping: 15,
                  delay: 0.5
                }}
                whileHover={{
                  scale: 1.02,
                  textShadow: "0 0 20px rgba(168,85,247,0.5)"
                }}
                style={{
                  transformStyle: "preserve-3d",
                  perspective: 1000
                }}
                className="text-lg md:text-6xl font-light tracking-wider text-white whitespace-nowrap relative"
              >
                <motion.span
                  animate={{
                    textShadow: [
                      "0 0 10px rgba(168,85,247,0.3)",
                      "0 0 20px rgba(168,85,247,0.5)",
                      "0 0 10px rgba(168,85,247,0.3)"
                    ]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  JPSREALTOR
                </motion.span>
              </motion.h1>
            </div>

            {/* Chat Input - Positioned within the group */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="w-full max-w-[700px]"
            >
              <AnimatedChatInput
                mode="landing"
                onSend={handleSend}
                onMicClick={handleMicClick}
                onMinimizedClick={handleMinimizedClick}
                isStreaming={isStreaming}
                streamingText={streamingMessage}
              />
            </motion.div>

            {/* Quick Action Pills - Positioned within the group */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="hidden md:flex flex-wrap gap-3 justify-center max-w-2xl"
            >
              {["Articles", "Map", "Dashboard", "Neighborhoods"].map((action, index) => {
                const actionMap: Record<string, () => void> = {
                  "Articles": () => window.location.href = "/insights",
                  "Map": () => window.location.href = "/map",
                  "Dashboard": () => window.location.href = "/dashboard",
                  "Neighborhoods": () => window.location.href = "/neighborhoods",
                };

                return (
                  <motion.button
                    key={action}
                    onClick={actionMap[action]}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 120,
                      damping: 15,
                      delay: 0.8 + index * 0.1
                    }}
                    whileHover={{
                      scale: 1.08,
                      y: -4,
                      boxShadow: "0 10px 30px rgba(168, 85, 247, 0.3)"
                    }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-2.5 bg-neutral-800/50 backdrop-blur-sm border border-neutral-700/50 rounded-full text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 hover:border-purple-500/50 transition-colors duration-300 shadow-lg cursor-pointer"
                  >
                    {action}
                  </motion.button>
                );
              })}
            </motion.div>
          </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Messages Container (only in conversation mode) */}
      <AnimatePresence>
        {chatMode === 'conversation' && (
          <motion.div
            ref={messagesContainerRef}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 20,
              duration: 0.6
            }}
            className="flex-1 overflow-y-auto px-4 py-6 pb-32 space-y-4 relative z-10 max-w-4xl mx-auto w-full [&::-webkit-scrollbar]:hidden"
            style={{
              scrollbarWidth: 'none'
            }}
            onScroll={(e) => {
              const container = e.currentTarget;
              setShowScrollTop(container.scrollTop > 300);
            }}
          >
            {displayMessages.map((message, index) => (
              <motion.div
                key={message.id || index}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 120,
                  damping: 15,
                  delay: index * 0.08,
                  duration: 0.5
                }}
                className={`flex gap-4 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 15,
                      delay: index * 0.08 + 0.1
                    }}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0"
                  >
                    <Bot className="w-5 h-5 text-white" />
                  </motion.div>
                )}

                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`max-w-xl ${
                    message.role === "user"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                      : "bg-neutral-800 text-neutral-100 shadow-lg shadow-neutral-900/30"
                  } rounded-2xl px-6 py-4 backdrop-blur-sm`}
                >
                  {/* Loading animation for search */}
                  {(message as any).isLoading ? (
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
                      <span className="text-purple-300 leading-relaxed">{parseMarkdown(message.content)}</span>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{parseMarkdown(message.content)}</p>
                  )}

                  {/* Listing Map and Carousel */}
                  {message.listings && message.listings.length > 0 && (() => {
                    console.log('🎠 Rendering map and carousel for message:', message.id, 'with', message.listings.length, 'listings');
                    return (
                    <>
                      {/* Map View */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 100,
                          damping: 15,
                          delay: 0.2
                        }}
                        className="mt-4"
                      >
                        <ChatMapView listings={message.listings} />
                      </motion.div>

                      {/* Listing Carousel */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 100,
                          damping: 15,
                          delay: 0.4
                        }}
                        className="mt-4"
                      >
                        <ListingCarousel listings={message.listings} />
                      </motion.div>
                    </>
                    );
                  })()}
                </motion.div>

                {message.role === "user" && (
                  <motion.div
                    initial={{ scale: 0, rotate: 180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 15,
                      delay: index * 0.08 + 0.1
                    }}
                    className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center flex-shrink-0 shadow-lg"
                  >
                    <User className="w-5 h-5 text-white" />
                  </motion.div>
                )}
              </motion.div>
            ))}

            {/* Loading indicator */}
            {loadingProgress && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{
                  type: "spring",
                  stiffness: 150,
                  damping: 15
                }}
                className="flex items-center gap-3 text-sm text-neutral-400 bg-neutral-800/50 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg"
              >
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span>{loadingProgress}</span>
                {loadingPercent > 0 && <span className="text-purple-400 font-medium">({loadingPercent}%)</span>}
              </motion.div>
            )}

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{
                  type: "spring",
                  stiffness: 150,
                  damping: 15
                }}
                className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 text-red-200 shadow-lg shadow-red-900/30 backdrop-blur-sm"
              >
                {error}
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && chatMode === 'conversation' && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              messagesContainerRef.current?.scrollTo({
                top: 0,
                behavior: 'smooth'
              });
            }}
            className="fixed bottom-24 right-6 md:right-8 z-20 w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-shadow"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Animated Chat Input - Only shown in conversation and minimized modes */}
      {chatMode !== 'landing' && (
        <AnimatedChatInput
          mode={chatMode}
          onSend={handleSend}
          onMicClick={handleMicClick}
          onMinimizedClick={handleMinimizedClick}
          isStreaming={isStreaming}
          streamingText={streamingMessage}
        />
      )}
    </div>
  );
}
