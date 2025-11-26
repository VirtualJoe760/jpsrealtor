// app/components/ClientLayoutWrapper.tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import MobileBottomNav from "./navbar/MobileBottomNav";
import GlobalHamburgerMenu from "./GlobalHamburgerMenu";
import EnhancedSidebar from "./EnhancedSidebar";
import { SidebarProvider, useSidebar } from "./SidebarContext";
import { Providers } from "../providers";
import MetaPixel from "../../components/MetaPixel";

import SpaticalBackground from "./backgrounds/SpaticalBackground";
import { ThemeProvider } from "../contexts/ThemeContext";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const pathname = usePathname();

  // Pages where we DON'T want the spatial background
  const pagesWithoutBackground = [
    '/map',
    '/mls-listings',
  ];

  // Check if current page should have spatial background
  const shouldShowBackground = !pagesWithoutBackground.some(page => pathname?.startsWith(page));

  return (
    <>
      <MetaPixel />
      <GlobalHamburgerMenu />

      {/* Global Spatial Background - Persists across navigation */}
      {shouldShowBackground && (
        <div className="fixed inset-0 z-0">
          <SpaticalBackground showGradient={true} className="h-full w-full" />
        </div>
      )}

      {/* Desktop: Always visible sidebar */}
      <div className="hidden md:block fixed left-0 top-0 h-screen z-30">
        <EnhancedSidebar />
      </div>

      {/* Main content with sidebar spacing on desktop */}
      <div
        className={`relative z-10 transition-[margin] duration-300 overflow-x-hidden ${
          isCollapsed ? 'md:ml-[80px]' : 'md:ml-[280px]'
        }`}
      >
        {children}
      </div>

      <MobileBottomNav />
    </>
  );
}

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
    <ThemeProvider>
      <Providers>
        <SidebarProvider>
          <LayoutContent>{children}</LayoutContent>
        </SidebarProvider>
      </Providers>
    </ThemeProvider>
  );
}
