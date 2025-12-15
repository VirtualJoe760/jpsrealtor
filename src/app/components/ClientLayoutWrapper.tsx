// app/components/ClientLayoutWrapper.tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import MobileBottomNav from "./navbar/MobileBottomNav";
import EnhancedSidebar from "./EnhancedSidebar";
import TopToggles from "./TopToggles";
import { SidebarProvider, useSidebar } from "./SidebarContext";
import { Providers } from "../providers";
import MetaPixel from "../../components/MetaPixel";

import SpaticalBackground from "./backgrounds/SpaticalBackground";
import MapBackground from "./backgrounds/MapBackground";
import { ThemeProvider, type ThemeName } from "../contexts/ThemeContext";
import { MapStateProvider, useMapState } from "../contexts/MapStateContext";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const pathname = usePathname();
  const { isMapInteractive } = useMapState();

  // Pages where we DON'T want any background (neither spatial nor map)
  const pagesWithoutBackground = [
    '/map', // /map page has its own map instance
    '/mls-listings',
  ];

  // Pages where we want the MAP as background instead of spatial background
  const pagesWithMapBackground = [
    '/map-demo', // Demo page for testing map background
    // Examples: Add more routes where you want map background
    // '/', // Homepage with map background
    // '/dashboard', // Dashboard with map background
  ];

  // Determine which background to show
  const shouldShowSpatialBackground = !pagesWithoutBackground.some(page => pathname?.startsWith(page))
    && !pagesWithMapBackground.some(page => pathname?.startsWith(page));

  const shouldShowMapBackground = pagesWithMapBackground.some(page => pathname?.startsWith(page));

  return (
    <>
      <MetaPixel />

      {/* Global Spatial Background - Persists across navigation */}
      {shouldShowSpatialBackground && (
        <div className="fixed inset-0 z-0">
          <SpaticalBackground showGradient={true} className="h-full w-full" />
        </div>
      )}

      {/* Global Map Background - Shows on specific routes */}
      {shouldShowMapBackground && (
        <MapBackground />
      )}

      {/* Desktop: Always visible sidebar */}
      <div className="hidden md:block fixed left-0 top-0 h-screen z-30">
        <EnhancedSidebar />
      </div>

      {/* Top Toggles - Theme (left) and Map (right) */}
      <TopToggles />

      {/* Main content with sidebar spacing on desktop */}
      <div
        className={`relative z-10 transition-[margin] duration-300 overflow-x-hidden ${
          isCollapsed ? 'md:ml-[80px]' : 'md:ml-[280px]'
        }`}
      >
        <div style={{ pointerEvents: 'auto' }}>
          {children}
        </div>
      </div>

      <MobileBottomNav />
    </>
  );
}

interface ClientLayoutWrapperProps {
  children: React.ReactNode;
  initialTheme?: ThemeName;
}

export default function ClientLayoutWrapper({
  children,
  initialTheme,
}: ClientLayoutWrapperProps) {
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
    <ThemeProvider initialTheme={initialTheme}>
      <MapStateProvider>
        <Providers>
          <SidebarProvider>
            <LayoutContent>{children}</LayoutContent>
          </SidebarProvider>
        </Providers>
      </MapStateProvider>
    </ThemeProvider>
  );
}
