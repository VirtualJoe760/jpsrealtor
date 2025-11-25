// src/app/components/chatwidget/hooks/useConversationPersistence.ts
// Custom hook for managing conversation persistence (localStorage save/load)

import { useState, useEffect } from "react";
import {
  saveConversationMessages,
  loadConversationMessages,
} from "../EnhancedSidebar.tsx.example";

export interface UseConversationPersistenceReturn {
  conversationId: string;
  hasTrackedFirstMessage: boolean;
  setHasTrackedFirstMessage: (tracked: boolean) => void;
}

export function useConversationPersistence(
  messages: any[],
  userId: string
): UseConversationPersistenceReturn {
  // Generate conversation ID (check URL params first)
  const [conversationId] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const loadConversationId = params.get("conversation");
      if (loadConversationId) {
        return loadConversationId;
      }
    }
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  });

  const [hasTrackedFirstMessage, setHasTrackedFirstMessage] = useState(false);

  // Load conversation from localStorage if URL parameter is present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const loadConversationId = params.get("conversation");

      if (loadConversationId) {
        const savedMessages = loadConversationMessages(loadConversationId);
        if (savedMessages && savedMessages.length > 0) {
          console.log(`[CONVERSATION] Loaded ${savedMessages.length} messages from localStorage`);
          // Messages are loaded directly by the component using this hook
        }
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0 && userId) {
      // Filter to only user and assistant messages (exclude system)
      const messagesToSave = messages.filter(
        (msg) => msg.role === "user" || msg.role === "assistant"
      );

      if (messagesToSave.length > 0) {
        saveConversationMessages(conversationId, messagesToSave);
      }
    }
  }, [messages, conversationId, userId]);

  return {
    conversationId,
    hasTrackedFirstMessage,
    setHasTrackedFirstMessage,
  };
}
