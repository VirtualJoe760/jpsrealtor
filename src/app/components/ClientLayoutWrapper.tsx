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
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import SpaticalBackground from "./backgrounds/SpaticalBackground";
import MapBackground from "./backgrounds/MapBackground";
import { ThemeProvider, type ThemeName, useTheme } from "../contexts/ThemeContext";
import { MapStateProvider, useMapState } from "../contexts/MapStateContext";
import { PWAProvider } from "../contexts/PWAContext";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const pathname = usePathname();
  const { isMapInteractive } = useMapState();
  const { currentTheme } = useTheme();

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

  // Pages where we WANT TopToggles (whitelist approach)
  const pagesWithTopToggles = [
    '/', // Root page (map/chat)
  ];

  // Determine which background to show
  const shouldShowSpatialBackground = !pagesWithoutBackground.some(page => pathname?.startsWith(page))
    && !pagesWithMapBackground.some(page => pathname?.startsWith(page));

  const shouldShowMapBackground = pagesWithMapBackground.some(page => pathname?.startsWith(page));

  // Determine whether to show TopToggles - only on root page
  const shouldShowTopToggles = pathname === '/';

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

      {/* Top Toggles - Theme (left) and Map (right) - Hidden on agent pages */}
      {shouldShowTopToggles && <TopToggles />}

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

      {/* Toast Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={currentTheme === 'blackspace' ? 'dark' : 'light'}
      />
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
  // Optimized touch event handling with comprehensive logging
  useEffect(() => {
    console.log('[ClientLayoutWrapper] ========================================');
    console.log('[ClientLayoutWrapper] Setting up touch event listeners');
    console.log('[ClientLayoutWrapper] ========================================');

    let lastTouchEnd = 0;
    let touchCount = 0;
    let doubleTapCount = 0;

    // Smarter double-tap prevention - only prevent actual double-taps
    const preventDoubleTap = (e: TouchEvent) => {
      const now = Date.now();
      const timeSinceLastTouch = now - lastTouchEnd;
      touchCount++;

      console.log(`[Touch] touchend #${touchCount} - Time since last: ${timeSinceLastTouch}ms`);

      // Only prevent if it's a genuine double-tap (< 300ms AND on same element)
      if (timeSinceLastTouch > 0 && timeSinceLastTouch <= 300) {
        doubleTapCount++;
        console.warn(`[Touch] DOUBLE-TAP DETECTED (#${doubleTapCount}) - Preventing zoom`);
        e.preventDefault();
        e.stopPropagation();
      }

      lastTouchEnd = now;
    };

    // Prevent gesture-based zooming (pinch, etc.)
    const preventGesture = (e: Event) => {
      console.warn('[Touch] Gesture event detected - Preventing:', e.type);
      e.preventDefault();
      e.stopPropagation();
    };

    // Prevent zoom on wheel with ctrl/cmd
    const preventWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        console.warn('[Touch] Ctrl/Cmd+Wheel zoom attempt - Preventing');
        e.preventDefault();
        e.stopPropagation();
      }
    };

    console.log('[ClientLayoutWrapper] Adding listeners with passive: false');

    // Add event listeners
    document.addEventListener('touchend', preventDoubleTap, { passive: false, capture: true });
    document.addEventListener('gesturestart', preventGesture, { passive: false, capture: true });
    document.addEventListener('gesturechange', preventGesture, { passive: false, capture: true });
    document.addEventListener('gestureend', preventGesture, { passive: false, capture: true });
    document.addEventListener('wheel', preventWheelZoom, { passive: false, capture: true });

    console.log('[ClientLayoutWrapper] Touch event listeners installed');

    return () => {
      console.log('[ClientLayoutWrapper] Removing touch event listeners');
      console.log(`[ClientLayoutWrapper] Stats: ${touchCount} touches, ${doubleTapCount} double-taps prevented`);

      document.removeEventListener('touchend', preventDoubleTap, true);
      document.removeEventListener('gesturestart', preventGesture, true);
      document.removeEventListener('gesturechange', preventGesture, true);
      document.removeEventListener('gestureend', preventGesture, true);
      document.removeEventListener('wheel', preventWheelZoom, true);
    };
  }, []);

  return (
    <ThemeProvider initialTheme={initialTheme}>
      <PWAProvider>
        <MapStateProvider>
          <Providers>
            <SidebarProvider>
              <LayoutContent>{children}</LayoutContent>
            </SidebarProvider>
          </Providers>
        </MapStateProvider>
      </PWAProvider>
    </ThemeProvider>
  );
}
