// src/app/components/chat/ChatProvider.tsx
// Global chat state provider for persistence across pages

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { generateSessionId } from "@/lib/chat-utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  context?: "homepage" | "listing" | "dashboard" | "general";
  listings?: any[]; // For messages that include property listings
  searchFilters?: any; // For preserving search filters (e.g., subdivision parameters)
  isLoading?: boolean; // For temporary loading messages
  disambiguationOptions?: any[]; // For subdivision disambiguation choices
}

export interface ChatContextType {
  messages: ChatMessage[];
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  clearMessages: () => void;
  loadMessages: (messages: ChatMessage[]) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  sessionId: string;
  userId: string | null;
  isInitialized: boolean;
  loadingHistory: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
  disableAutoLoad?: boolean; // For /chat route - start fresh
}

export function ChatProvider({ children, disableAutoLoad = false }: ChatProviderProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId] = useState(() => generateSessionId());
  const [userId, setUserId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Set userId from session or generate anonymous ID
  useEffect(() => {
    const updateUserId = () => {
      if (session?.user?.email) {
        setUserId(session.user.email);
      } else if (typeof window !== 'undefined') {
        // Generate or retrieve anonymous ID from localStorage
        const storedAnonymousId = localStorage.getItem("anonymousUserId");
        if (storedAnonymousId) {
          setUserId(storedAnonymousId);
        } else {
          const newAnonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem("anonymousUserId", newAnonymousId);
          setUserId(newAnonymousId);
        }
      }
    };

    updateUserId();
  }, [session?.user?.email]); // Only depend on email, not whole session object

  // Preload AI model in background on mount
  useEffect(() => {
    // Import dynamically to avoid blocking initial render
    const preloadModel = async () => {
      try {
        // Check if WebGPU is supported before attempting to load WebLLM
        if (typeof navigator !== 'undefined' && !('gpu' in navigator)) {
          console.log("ℹ️ WebGPU not supported - skipping AI model preload (will use server-side AI)");
          return;
        }

        const { initializeWebLLM } = await import("@/lib/webllm");
        console.log("🚀 Starting background AI model preload...");
        await initializeWebLLM();
        console.log("✅ AI model preloaded and ready!");
      } catch (error) {
        console.warn("⚠️ AI model preload failed (will use server-side AI):", error);
        // Fail silently - the app will fall back to server-side AI
      }
    };

    // Start preloading after a short delay to not block initial page render
    const timeoutId = setTimeout(preloadModel, 2000);
    return () => clearTimeout(timeoutId);
  }, []);

  // Load chat history from server when userId is available (unless disabled)
  useEffect(() => {
    if (!userId || isInitialized) return;

    // If auto-load is disabled (for /chat route), just mark as initialized
    if (disableAutoLoad) {
      console.log("🚫 Chat history auto-load disabled - starting fresh");
      setIsInitialized(true);
      return;
    }

    const loadChatHistory = async () => {
      setLoadingHistory(true);
      try {
        const response = await fetch(`/api/chat/log?userId=${userId}&limit=50`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.messages) {
            // Convert database messages to chat messages
            const loadedMessages: ChatMessage[] = data.messages.map((msg: any) => ({
              id: msg._id,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.createdAt),
              context: msg.context,
            }));
            setMessages(loadedMessages);
            console.log("📚 Loaded", loadedMessages.length, "messages from history");
          } else {
            console.warn("Chat history response missing data:", data);
          }
        } else {
          // Handle non-OK response
          console.error("Failed to load chat history:", response.status, response.statusText);
          // Still initialize so user can start chatting
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
        // Don't throw - allow user to continue with empty chat
      } finally {
        setLoadingHistory(false);
        setIsInitialized(true);
      }
    };

    loadChatHistory();
  }, [userId, isInitialized, disableAutoLoad]);

  // Helper function to retry message logging with exponential backoff
  const logMessageWithRetry = async (messageData: any, retries = 3) => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch("/api/chat/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(messageData),
        });

        if (response.ok) {
          return; // Success, exit
        }

        // If not ok and not last attempt, continue to retry
        if (attempt < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        // If last attempt, log error
        if (attempt === retries - 1) {
          console.error("Failed to log message after", retries, "attempts:", error);
        } else {
          // Otherwise, wait and retry
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  };

  // Add a new message
  const addMessage = (message: Omit<ChatMessage, "id" | "timestamp">) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);

    // Log to server asynchronously with retry logic
    if (userId) {
      logMessageWithRetry({
        userId,
        sessionId,
        context: message.context || "general",
        role: message.role,
        content: message.content,
      });
    }
  };

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Load messages (for restoring conversations)
  const loadMessages = useCallback((loadedMessages: ChatMessage[]) => {
    setMessages(loadedMessages);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        addMessage,
        clearMessages,
        loadMessages,
        isOpen,
        setIsOpen,
        sessionId,
        userId,
        isInitialized,
        loadingHistory,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}
