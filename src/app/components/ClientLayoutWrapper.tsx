// app/components/ClientLayoutWrapper.tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import MobileBottomNav from "./navbar/MobileBottomNav";
import EnhancedSidebar from "./EnhancedSidebar";
import EnhancedNavbar from "./EnhancedNavbar";
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
import { useFavoritesSync } from "../hooks/useFavoritesSync";
import { fetchAgentPublic } from "../hooks/useAgentProfile";

function LayoutContent({ children, navLayout = "sidebar" }: { children: React.ReactNode; navLayout?: "sidebar" | "navbar" }) {
  // Sync favorites status on login (once per session)
  useFavoritesSync();
  const { isCollapsed } = useSidebar();
  const isNavbar = navLayout === "navbar";
  const pathname = usePathname();
  const { isMapInteractive } = useMapState();
  const { currentTheme } = useTheme();

  // Apply agent font via CSS variable (NOT body.style — that crashes MapLibre/React reconciliation)
  useEffect(() => {
    fetchAgentPublic()
      .then((data) => {
        const font = data?.profile?.agentProfile?.fontFamily;
        if (font) {
          document.documentElement.style.setProperty("--agent-font", `'${font}', sans-serif`);
        }
      })
      .catch(() => {});
  }, []);

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

  // Listing detail pages - hide sidebar and nav completely
  const isListingDetailPage = pathname?.startsWith('/mls-listings/') && pathname !== '/mls-listings';

  // Landing pages - hide sidebar and nav for clean standalone experience
  const isLandingPage = pathname?.startsWith('/lp/');

  // Determine which background to show
  const shouldShowSpatialBackground = !pagesWithoutBackground.some(page => pathname?.startsWith(page))
    && !pagesWithMapBackground.some(page => pathname?.startsWith(page));

  const shouldShowMapBackground = pagesWithMapBackground.some(page => pathname?.startsWith(page));

  // Determine whether to show TopToggles - only on CHAP page
  const shouldShowTopToggles = pathname === '/chap';

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

      {/* Desktop/tablet nav (except on landing pages). The tenant's navLayout
          decides sidebar (left, default) vs navbar (top). Mobile is unaffected —
          MobileBottomNav handles small screens for both layouts. */}
      {!isLandingPage && (
        isNavbar ? (
          <div className="hidden md:block fixed top-0 left-0 right-0 z-30 carousel-hide">
            <EnhancedNavbar />
          </div>
        ) : (
          <div className="hidden md:block fixed left-0 top-0 h-screen z-30 carousel-hide">
            <EnhancedSidebar />
          </div>
        )
      )}

      {/* Top Toggles - Theme (left) and Map (right) - Hidden on agent pages */}
      {shouldShowTopToggles && <TopToggles />}

      {/* Main content spacing on desktop: left margin for the sidebar, or top
          padding for the fixed navbar. Mobile gets neither. */}
      <div
        data-main-content
        className={`relative z-10 transition-[margin,padding] duration-300 ${
          isLandingPage
            ? ''
            : isNavbar
              ? 'overflow-x-hidden md:pt-16'
              : `overflow-x-hidden ${isCollapsed ? 'md:ml-[80px]' : 'md:ml-[280px]'}`
        }`}
      >
        <div style={{ pointerEvents: 'auto' }}>
          {children}
        </div>
      </div>

      {/* Mobile Bottom Nav (hidden on listing detail and landing pages) */}
      {!isLandingPage && <MobileBottomNav />}

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
  navLayout?: "sidebar" | "navbar";
}

export default function ClientLayoutWrapper({
  children,
  initialTheme,
  navLayout = "sidebar",
}: ClientLayoutWrapperProps) {
  // Gesture zoom prevention (pinch) - CSS handles double-tap via touch-action: manipulation
  useEffect(() => {
    // Only prevent gesture-based zooming (pinch, etc.) - NOT double-tap
    // Double-tap is handled by CSS: touch-action: manipulation !important
    const preventGesture = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Prevent zoom on wheel with ctrl/cmd (desktop)
    const preventWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Only add gesture and wheel listeners - NO touchend/touchstart blocking!
    document.addEventListener('gesturestart', preventGesture, { passive: false, capture: true });
    document.addEventListener('gesturechange', preventGesture, { passive: false, capture: true });
    document.addEventListener('gestureend', preventGesture, { passive: false, capture: true });
    document.addEventListener('wheel', preventWheelZoom, { passive: false, capture: true });

    return () => {
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
              <LayoutContent navLayout={navLayout}>{children}</LayoutContent>
            </SidebarProvider>
          </Providers>
        </MapStateProvider>
      </PWAProvider>
    </ThemeProvider>
  );
}
