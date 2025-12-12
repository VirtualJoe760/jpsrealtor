"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Listing } from "./ListingCarousel";

// Component data from API response
export interface ComponentData {
  carousel?: {
    title?: string;
    listings: Listing[];
  };
  mapView?: {
    listings: any[];
    center?: { lat: number; lng: number };
    zoom?: number;
  };
  appreciation?: {
    location?: {
      city?: string;
      subdivision?: string;
      county?: string;
    };
    period: string;
    appreciation: {
      annual: number;
      cumulative: number;
      trend: "increasing" | "decreasing" | "stable";
    };
    marketData: {
      startMedianPrice: number;
      endMedianPrice: number;
      totalSales: number;
      confidence: "high" | "medium" | "low";
    };
    metadata?: {
      mlsSources?: string[];
    };
  };
  comparison?: {
    location1: {
      name: string;
      appreciation: {
        annual: number;
        cumulative: number;
        trend: "increasing" | "decreasing" | "stable" | "volatile";
      };
      marketData: {
        startMedianPrice: number;
        endMedianPrice: number;
        totalSales: number;
        confidence: "high" | "medium" | "low";
      };
    };
    location2: {
      name: string;
      appreciation: {
        annual: number;
        cumulative: number;
        trend: "increasing" | "decreasing" | "stable" | "volatile";
      };
      marketData: {
        startMedianPrice: number;
        endMedianPrice: number;
        totalSales: number;
        confidence: "high" | "medium" | "low";
      };
    };
    period: string;
    winner?: string;
    insights?: {
      annualDifference?: number;
      cumulativeDifference?: number;
      priceGrowth?: string;
      marketStrength?: string;
    };
  };
  articles?: {
    query?: string;
    results: any[];
  };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  listings?: Listing[];
  components?: ComponentData; // Structured component data
}

interface ChatContextType {
  messages: ChatMessage[];
  addMessage: (content: string, role: "user" | "assistant", listings?: Listing[], components?: ComponentData) => void;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const CHAT_STORAGE_KEY = 'jps-chat-messages';

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load messages from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        const messagesWithDates = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(messagesWithDates);
        console.log('[ChatProvider] Loaded', messagesWithDates.length, 'messages from localStorage');
      }
    } catch (error) {
      console.error('[ChatProvider] Error loading messages from localStorage:', error);
    }
    setIsHydrated(true);
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (!isHydrated) return; // Don't save until initial load is complete

    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      console.log('[ChatProvider] Saved', messages.length, 'messages to localStorage');
    } catch (error) {
      console.error('[ChatProvider] Error saving messages to localStorage:', error);
    }
  }, [messages, isHydrated]);

  const addMessage = (content: string, role: "user" | "assistant", listings?: Listing[], components?: ComponentData) => {
    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      listings,
      components,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const clearMessages = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  return (
    <ChatContext.Provider value={{ messages, addMessage, clearMessages }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within ChatProvider");
  }
  return context;
}
