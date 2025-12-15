// src/app/components/chat/hooks/useChatScroll.ts
// Auto-scroll to bottom on new messages

import { useEffect, useRef } from "react";

export function useChatScroll<T>(dependency: T) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dependency]);

  return messagesEndRef;
}
