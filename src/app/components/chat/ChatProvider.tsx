"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Listing } from "./ListingCarousel";
import type { SourceType } from "./SourceBubble";
import type { ComparisonItem } from "./SubdivisionComparisonChart";

// Component data from API response
export interface ComponentData {
  carousel?: {
    title?: string;
    listings: Listing[];
  };
  listView?: {
    title?: string;
    listings: Listing[];
    totalCount?: number;
    hasMore?: boolean;
  };
  mapView?: {
    listings: any[];
    center?: { lat: number; lng: number };
    zoom?: number;
    searchFilters?: {
      city?: string;
      subdivision?: string;
      county?: string;
      minPrice?: number;
      maxPrice?: number;
      beds?: number;
      baths?: number;
      propertyType?: string;
    };
  };
  sources?: SourceType[];
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
    title?: string;
    items: ComparisonItem[];
  };
  articles?: {
    query?: string;
    results: any[];
  };
  marketStats?: {
    location?: {
      city?: string;
      subdivision?: string;
      county?: string;
    };
    daysOnMarket?: {
      average: number;
      median: number;
      min: number;
      max: number;
      distribution: any;
      trend: string;
      sampleSize: number;
    };
    pricePerSqft?: {
      average: number;
      median: number;
      min: number;
      max: number;
      distribution: any;
      sampleSize: number;
    };
    hoaFees?: {
      average: number;
      median: number;
      min: number;
      max: number;
      distribution: any;
      frequency: any;
      sampleSize: number;
    };
    propertyTax?: {
      average: number;
      median: number;
      min: number;
      max: number;
      effectiveRate: number;
      distribution: any;
      sampleSize: number;
    };
  };
  neighborhood?: {
    type: "city" | "subdivision" | "subdivision-group" | "county" | "region";
    cityId?: string;
    subdivisionSlug?: string;
    subdivisions?: string[];
    countyId?: string;
    name: string;
    normalizedName?: string;
    filters?: {
      // Price
      minPrice?: number;
      maxPrice?: number;
      // Beds/Baths
      beds?: number;
      baths?: number;
      // Size
      minSqft?: number;
      maxSqft?: number;
      minLotSize?: number;
      maxLotSize?: number;
      // Year
      minYear?: number;
      maxYear?: number;
      // Amenities
      pool?: boolean;
      spa?: boolean;
      view?: boolean;
      fireplace?: boolean;
      gatedCommunity?: boolean;
      seniorCommunity?: boolean;
      // Garage/Stories
      garageSpaces?: number;
      stories?: number;
      // Property type
      propertyType?: string;
      // Geographic filters
      eastOf?: string;
      westOf?: string;
      northOf?: string;
      southOf?: string;
      // HOA filters
      hasHOA?: boolean;
      maxHOA?: number;
      minHOA?: number;
      // Sorting
      sort?: string;
    };
  };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp: Date;
  listings?: Listing[];
  components?: ComponentData; // Structured component data
  tool_calls?: any[]; // For assistant messages that call tools
  tool_call_id?: string; // For tool response messages
  name?: string; // For tool messages
}

export interface NotificationContent {
  message: string;
  locationName: string;
}

interface ChatContextType {
  messages: ChatMessage[];
  addMessage: (
    content: string,
    role: "user" | "assistant" | "tool",
    listings?: Listing[],
    components?: ComponentData,
    tool_calls?: any[],
    tool_call_id?: string,
    name?: string
  ) => void;
  clearMessages: () => void;
  hasUnreadMessage: boolean;
  setUnreadMessage: (unread: boolean) => void;
  notificationContent: NotificationContent | null;
  setNotificationContent: (content: NotificationContent | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const CHAT_STORAGE_KEY = 'jps-chat-messages';
const CHAT_EXPIRATION_KEY = 'jps-chat-expiration';
const CHAT_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasUnreadMessage, setHasUnreadMessage] = useState(false);
  const [notificationContent, setNotificationContent] = useState<NotificationContent | null>(null);

  // Load messages from sessionStorage on mount with expiration check
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(CHAT_STORAGE_KEY);
      const expiration = sessionStorage.getItem(CHAT_EXPIRATION_KEY);

      if (stored && expiration) {
        const expirationTime = parseInt(expiration, 10);
        const now = Date.now();

        // Check if session has expired
        if (now < expirationTime) {
          const parsed = JSON.parse(stored);
          // Convert timestamp strings back to Date objects
          const messagesWithDates = parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(messagesWithDates);
          console.log('[ChatProvider] Loaded', messagesWithDates.length, 'messages from session (expires in', Math.round((expirationTime - now) / 1000), 'seconds)');
        } else {
          // Session expired, clear it
          console.log('[ChatProvider] Session expired, clearing chat history');
          sessionStorage.removeItem(CHAT_STORAGE_KEY);
          sessionStorage.removeItem(CHAT_EXPIRATION_KEY);
        }
      }
    } catch (error) {
      console.error('[ChatProvider] Error loading messages from sessionStorage:', error);
    }
    setIsHydrated(true);
  }, []);

  // Save messages to sessionStorage with expiration timestamp
  useEffect(() => {
    if (!isHydrated) return; // Don't save until initial load is complete

    try {
      if (messages.length > 0) {
        sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
        // Set expiration time to 5 minutes from now
        const expirationTime = Date.now() + CHAT_EXPIRATION_TIME;
        sessionStorage.setItem(CHAT_EXPIRATION_KEY, expirationTime.toString());
        // console.log('[ChatProvider] Saved', messages.length, 'messages to session');
      } else {
        // Clear session if no messages
        sessionStorage.removeItem(CHAT_STORAGE_KEY);
        sessionStorage.removeItem(CHAT_EXPIRATION_KEY);
      }
    } catch (error) {
      console.error('[ChatProvider] Error saving messages to sessionStorage:', error);
    }
  }, [messages, isHydrated]);

  const addMessage = (
    content: string,
    role: "user" | "assistant" | "tool",
    listings?: Listing[],
    components?: ComponentData,
    tool_calls?: any[],
    tool_call_id?: string,
    name?: string
  ) => {
    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      listings,
      components,
      tool_calls,
      tool_call_id,
      name,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const clearMessages = () => {
    setMessages([]);
    sessionStorage.removeItem(CHAT_STORAGE_KEY);
    sessionStorage.removeItem(CHAT_EXPIRATION_KEY);
  };

  const setUnreadMessage = (unread: boolean) => {
    console.log('🔔 [ChatProvider] setUnreadMessage called with:', unread);
    setHasUnreadMessage(unread);
    console.log('🔔 [ChatProvider] hasUnreadMessage state updated to:', unread);
  };

  return (
    <ChatContext.Provider value={{
      messages,
      addMessage,
      clearMessages,
      hasUnreadMessage,
      setUnreadMessage,
      notificationContent,
      setNotificationContent
    }}>
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
