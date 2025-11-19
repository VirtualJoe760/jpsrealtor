// app/components/ClientLayoutWrapper.tsx
"use client";

import { useEffect } from "react";
import MobileBottomNav from "./navbar/MobileBottomNav";
import { Providers } from "../providers";
import MetaPixel from "../../components/MetaPixel";

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  // Aggressive double-tap zoom and pinch zoom prevention for iOS
  useEffect(() => {
    let lastTouchEnd = 0;

    // Prevent double-tap zoom
    const preventDoubleTap = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
        e.stopPropagation();
      }
      lastTouchEnd = now;
    };

    // Prevent pinch zoom
    const preventPinch = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Prevent all gesture-based zooming
    const preventGesture = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Add multiple layers of protection
    document.addEventListener('touchend', preventDoubleTap, { passive: false, capture: true });
    document.addEventListener('gesturestart', preventGesture, { passive: false, capture: true });
    document.addEventListener('gesturechange', preventGesture, { passive: false, capture: true });
    document.addEventListener('gestureend', preventGesture, { passive: false, capture: true });

    // Prevent zoom on wheel with ctrl/cmd
    const preventWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('wheel', preventWheelZoom, { passive: false, capture: true });

    return () => {
      document.removeEventListener('touchend', preventDoubleTap, true);
      document.removeEventListener('gesturestart', preventGesture, true);
      document.removeEventListener('gesturechange', preventGesture, true);
      document.removeEventListener('gestureend', preventGesture, true);
      document.removeEventListener('wheel', preventWheelZoom, true);
    };
  }, []);

  return (
    <Providers>
      <MetaPixel />
      {children}
      <MobileBottomNav />
    </Providers>
  );
}
