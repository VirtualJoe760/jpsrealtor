/**
 * Track scroll position and user scrolling state
 * Extracted from IntegratedChatWidget.tsx
 */
import { useState, useEffect, RefObject } from "react";
import { SCROLL_THRESHOLD } from "@/app/constants/chat";

export function useScrollPosition(containerRef: RefObject<HTMLDivElement>) {
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // Consider "at bottom" if within threshold
      const atBottom = distanceFromBottom < SCROLL_THRESHOLD;
      setIsAtBottom(atBottom);

      // Show scroll to top button if scrolled down 300px
      setShowScrollTop(scrollTop > 300);

      // User is manually scrolling if not at bottom
      if (!atBottom) {
        setIsUserScrolling(true);
      } else {
        setIsUserScrolling(false);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [containerRef]);

  return { isUserScrolling, isAtBottom, showScrollTop, setShowScrollTop };
}
