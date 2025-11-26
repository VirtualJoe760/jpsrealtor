// src/app/components/ScrollPanel.tsx
"use client";

import { useRef, useState, useEffect, ReactNode } from "react";

interface ScrollPanelProps {
  children: ReactNode;
  className?: string;
}

export default function ScrollPanel({
  children,
  className = "",
}: ScrollPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMacbook, setIsMacbook] = useState(false);

  // Detect if we're on a Mac (likely has trackpad)
  useEffect(() => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ||
                  navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
    setIsMacbook(isMac);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`overflow-x-auto ${className} [&::-webkit-scrollbar]:hidden`}
      style={{
        scrollbarWidth: "none",
        overscrollBehaviorX: "contain", // Prevents browser back/forward gesture
      }}
    >
      <div
        className={`flex gap-6 w-max pb-4 ${!isMacbook ? 'animate-scroll-slow' : ''}`}
      >
        {children}
      </div>
    </div>
  );
}
