/**
 * Auto-scroll to bottom behavior
 * Extracted from IntegratedChatWidget.tsx
 */
import { useEffect, RefObject } from "react";

export function useAutoScroll(
  messagesEndRef: RefObject<HTMLDivElement>,
  isAtBottom: boolean,
  isUserScrolling: boolean,
  dependencies: any[]
) {
  useEffect(() => {
    if (isAtBottom && !isUserScrolling) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [...dependencies, isAtBottom, isUserScrolling]);
}
