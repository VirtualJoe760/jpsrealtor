"use client";

import { createContext, useContext, useState, ReactNode } from "react";
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

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

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

  const clearMessages = () => setMessages([]);

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
