// src/app/components/chat/hooks/useChatScroll.ts
// Auto-scroll to bottom on new messages.
//
// First run after mount uses behavior:"auto" — the conversation view
// remounts every time the map closes, so the effect's initial fire
// would animate a full-height smooth scroll from the top, which the
// user sees as "the page spawns at the top then animates down."
// Smooth is reserved for genuine in-conversation message updates.

import { useEffect, useRef } from "react";

export function useChatScroll<T>(dependency: T) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstRunRef = useRef(true);

  useEffect(() => {
    const behavior: ScrollBehavior = isFirstRunRef.current ? "auto" : "smooth";
    isFirstRunRef.current = false;
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, [dependency]);

  return messagesEndRef;
}
