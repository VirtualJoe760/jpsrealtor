/**
 * Conversation persistence (save/load from localStorage)
 * Extracted from IntegratedChatWidget.tsx
 */
import { useEffect, useState } from "react";
import {
  saveConversationMessages,
  loadConversationMessages,
} from "@/app/components/chatwidget/EnhancedSidebar";

export function useConversationPersistence(
  conversationId: string,
  messages: any[],
  addMessage: (msg: any) => void
) {
  const [hasTrackedFirstMessage, setHasTrackedFirstMessage] = useState(false);

  // Load conversation from localStorage if URL parameter is present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const loadConversationId = params.get("conversation");

      if (loadConversationId && messages.length === 0) {
        const savedMessages = loadConversationMessages(loadConversationId);

        if (savedMessages.length > 0) {
          // Restore messages to chat
          savedMessages.forEach((msg) => {
            addMessage({
              role: msg.role as "user" | "assistant" | "system",
              content: msg.content,
              context: "general",
              listings: msg.listings,
            });
          });

          // Mark as already tracked to prevent duplicate history entries
          setHasTrackedFirstMessage(true);
        }
      }
    }
  }, []); // Only run on mount

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0 && conversationId) {
      const messagesToSave = messages
        .filter((msg) => msg.role !== "system") // Don't save system messages
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp).getTime(),
          listings: msg.listings,
        }));
      saveConversationMessages(conversationId, messagesToSave);
    }
  }, [messages, conversationId]);

  return { hasTrackedFirstMessage, setHasTrackedFirstMessage };
}
