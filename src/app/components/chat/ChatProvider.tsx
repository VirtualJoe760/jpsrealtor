// src/app/components/chat/ChatProvider.tsx
// Global chat state provider for persistence across pages

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { generateSessionId } from "@/lib/chat-utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  context?: "homepage" | "listing" | "dashboard" | "general";
}

export interface ChatContextType {
  messages: ChatMessage[];
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  clearMessages: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  sessionId: string;
  userId: string | null;
  isInitialized: boolean;
  loadingHistory: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId] = useState(() => generateSessionId());
  const [userId, setUserId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Set userId from session or generate anonymous ID
  useEffect(() => {
    if (session?.user?.email) {
      setUserId(session.user.email);
    } else {
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
  }, [session]);

  // Preload AI model in background on mount
  useEffect(() => {
    // Import dynamically to avoid blocking initial render
    const preloadModel = async () => {
      try {
        const { initializeWebLLM } = await import("@/lib/webllm");
        console.log("🚀 Starting background AI model preload...");
        await initializeWebLLM();
        console.log("✅ AI model preloaded and ready!");
      } catch (error) {
        console.error("⚠️ AI model preload failed (will retry on first use):", error);
      }
    };

    // Start preloading after a short delay to not block initial page render
    const timeoutId = setTimeout(preloadModel, 2000);
    return () => clearTimeout(timeoutId);
  }, []);

  // Load chat history from server when userId is available
  useEffect(() => {
    if (!userId || isInitialized) return;

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
          }
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
      } finally {
        setLoadingHistory(false);
        setIsInitialized(true);
      }
    };

    loadChatHistory();
  }, [userId, isInitialized]);

  // Add a new message
  const addMessage = (message: Omit<ChatMessage, "id" | "timestamp">) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);

    // Log to server asynchronously (don't wait for response)
    if (userId) {
      fetch("/api/chat/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          sessionId,
          context: message.context || "general",
          role: message.role,
          content: message.content,
        }),
      }).catch((error) => console.error("Error logging message:", error));
    }
  };

  // Clear all messages
  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        addMessage,
        clearMessages,
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
