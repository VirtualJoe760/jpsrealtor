// src/app/components/chatwidget/hooks/useChatScroll.ts
// Custom hook for managing chat scroll behavior

import { useState, useEffect, useRef, RefObject } from "react";

export interface UseChatScrollReturn {
  messagesEndRef: RefObject<HTMLDivElement>;
  messagesContainerRef: RefObject<HTMLDivElement>;
  isUserScrolling: boolean;
  isAtBottom: boolean;
  showScrollTop: boolean;
  setShowScrollTop: (show: boolean) => void;
  scrollToBottom: () => void;
}

export function useChatScroll(displayMessages: any[], streamingMessage: string): UseChatScrollReturn {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Detect when user scrolls manually
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

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll only if user is at bottom (not interrupting reading)
  useEffect(() => {
    if (isAtBottom && !isUserScrolling) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayMessages, streamingMessage, isAtBottom, isUserScrolling]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setIsUserScrolling(false);
  };

  return {
    messagesEndRef,
    messagesContainerRef,
    isUserScrolling,
    isAtBottom,
    showScrollTop,
    setShowScrollTop,
    scrollToBottom,
  };
}
