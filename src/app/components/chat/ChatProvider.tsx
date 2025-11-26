"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { Listing } from "./ListingCarousel";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  listings?: Listing[];
}

interface ChatContextType {
  messages: ChatMessage[];
  addMessage: (content: string, role: "user" | "assistant", listings?: Listing[]) => void;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const addMessage = (content: string, role: "user" | "assistant", listings?: Listing[]) => {
    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      listings,
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
