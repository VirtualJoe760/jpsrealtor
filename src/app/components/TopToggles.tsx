// src/app/components/TopToggles.tsx
// Top navigation toggles - Theme (left) and Map (right)
// Persists across all pages, properly centered with application content

"use client";

import { Sun, Moon, Map, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useMapControl } from "@/app/hooks/useMapControl";
import { useMapState } from "@/app/contexts/MapStateContext";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

import { useChatContext } from "./chat/ChatProvider";

export default function TopToggles() {
  const { currentTheme, setTheme } = useTheme();
  const { isMapVisible, setMapVisible, showMapAtLocation, hideMap } = useMapControl();
  const { viewState } = useMapState();
  const { hasUnreadMessage, setUnreadMessage } = useChatContext();
  const pathname = usePathname();
  const router = useRouter();
  const isLight = currentTheme === "lightgradient";
  const isHomePage = pathname === "/";
  const [isVisible, setIsVisible] = useState(true);
  const [favoritesPanelOpen, setFavoritesPanelOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const lastScrollY = useRef(0);

  // Prevent hydration mismatch - wait for client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug notification state
  useEffect(() => {
    console.log('🔔 [TopToggles] hasUnreadMessage:', hasUnreadMessage, 'isMapVisible:', isMapVisible, 'mounted:', mounted);
  }, [hasUnreadMessage, isMapVisible, mounted]);

  // Listen for favorites panel state changes
  useEffect(() => {
    const handleFavoritesPanel = (e: CustomEvent) => {
      setFavoritesPanelOpen(e.detail.isOpen);
    };

    window.addEventListener('favoritesPanelChange', handleFavoritesPanel as EventListener);
    return () => window.removeEventListener('favoritesPanelChange', handleFavoritesPanel as EventListener);
  }, []);

  useEffect(() => {
    // Hide if favorites panel is open
    if (favoritesPanelOpen) {
      setIsVisible(false);
      return;
    }

    // ONLY on map view, keep toggles always visible (never hide)
    if (isMapVisible) {
      setIsVisible(true);
      return;
    }

    // For all other views (chat, insights, dashboard, etc.), enable scroll-hide
    const handleScroll = () => {
      // Since html has overflow:hidden, scrolling happens on body element
      const currentScrollY = document.body.scrollTop || window.scrollY;

      // Show when scrolling up, hide when scrolling down
      if (currentScrollY < lastScrollY.current || currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      }

      lastScrollY.current = currentScrollY;
    };

    // Listen to scroll on body element (since html has overflow:hidden)
    document.body.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.body.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isMapVisible, favoritesPanelOpen]);

  const handleToggleTheme = () => {
    setTheme(isLight ? "blackspace" : "lightgradient");
  };

  const handleToggleMap = () => {
    if (isHomePage) {
      if (isMapVisible) {
        // Switching to chat view - clear notification
        hideMap();
        setUnreadMessage(false);
      } else {
        // Check if chat has pre-positioned the map
        if (viewState) {
          // User has searched - reveal the pre-positioned map
          setMapVisible(true);
        } else {
          // No search yet - show default California view
          showMapAtLocation(37.0, -119.5, 5);
        }
      }
    } else {
      // If we're on any other page, redirect to homepage (returns to last state)
      router.push("/");
    }
  };

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
      initial={{ y: 0, opacity: 1 }}
      animate={{
        y: isVisible ? 0 : -100,
        opacity: isVisible ? 1 : 0,
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/*
        Icon buttons with individual blur backgrounds
        Mobile: h-12 (48px), Desktop: h-14 (56px)
      */}
      {/* Mobile: Centered container with toggles on left/right */}
      <div className="md:hidden max-w-7xl mx-auto px-4 pt-8 flex items-center justify-between pointer-events-none">
        {/* Theme Toggle - Left (Mobile Only) */}
        <motion.button
          onClick={handleToggleTheme}
          className="pointer-events-auto"
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
          aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
        >
          {isLight ? (
            <Moon
              className="w-9 h-9 text-blue-600 hover:text-blue-700 transition-colors"
              style={{
                filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)) drop-shadow(0 8px 16px rgba(0, 0, 0, 0.2)) drop-shadow(0 12px 24px rgba(0, 0, 0, 0.25))',
              }}
            />
          ) : (
            <Sun
              className="w-9 h-9 text-emerald-400 hover:text-emerald-300 transition-colors"
              style={{
                filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4)) drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5)) drop-shadow(0 12px 24px rgba(0, 0, 0, 0.6))',
              }}
            />
          )}
        </motion.button>

        {/* Map Toggle - Right (Mobile) */}
        <motion.button
          onClick={handleToggleMap}
          className="pointer-events-auto relative"
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
          aria-label={mounted && isMapVisible ? "Show Chat" : "Show Map"}
        >
          {mounted && isMapVisible ? (
            <>
              <MessageSquare
                className="w-9 h-9 transition-colors"
                style={{
                  color: isLight ? '#2563eb' : '#34d399',
                  filter: isLight
                    ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)) drop-shadow(0 8px 16px rgba(0, 0, 0, 0.2)) drop-shadow(0 12px 24px rgba(0, 0, 0, 0.25))'
                    : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4)) drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5)) drop-shadow(0 12px 24px rgba(0, 0, 0, 0.6))',
                }}
              />
              {/* Notification Badge */}
              {hasUnreadMessage && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"
                >
                  <motion.div
                    className="absolute inset-0 bg-red-500 rounded-full"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                </motion.div>
              )}
            </>
          ) : (
            <Map
              className="w-9 h-9 transition-colors"
              style={{
                color: isLight ? '#2563eb' : '#34d399',
                filter: isLight
                  ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)) drop-shadow(0 8px 16px rgba(0, 0, 0, 0.2)) drop-shadow(0 12px 24px rgba(0, 0, 0, 0.25))'
                  : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4)) drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5)) drop-shadow(0 12px 24px rgba(0, 0, 0, 0.6))',
              }}
            />
          )}
        </motion.button>
      </div>

      {/* Desktop: Map toggle on far right edge of screen */}
      <div className="hidden md:block">
        <motion.button
          onClick={handleToggleMap}
          className="pointer-events-auto fixed right-6 top-6"
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
          aria-label={mounted && isMapVisible ? "Show Chat" : "Show Map"}
        >
          {mounted && isMapVisible ? (
            <>
              <MessageSquare
                className="w-11 h-11 transition-colors"
                style={{
                  color: isLight ? '#2563eb' : '#34d399',
                  filter: isLight
                    ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)) drop-shadow(0 8px 16px rgba(0, 0, 0, 0.2)) drop-shadow(0 12px 24px rgba(0, 0, 0, 0.25))'
                    : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4)) drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5)) drop-shadow(0 12px 24px rgba(0, 0, 0, 0.6))',
                }}
              />
              {/* Notification Badge */}
              {hasUnreadMessage && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"
                >
                  <motion.div
                    className="absolute inset-0 bg-red-500 rounded-full"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                </motion.div>
              )}
            </>
          ) : (
            <Map
              className="w-11 h-11 transition-colors"
              style={{
                color: isLight ? '#2563eb' : '#34d399',
                filter: isLight
                  ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15)) drop-shadow(0 8px 16px rgba(0, 0, 0, 0.2)) drop-shadow(0 12px 24px rgba(0, 0, 0, 0.25))'
                  : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4)) drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5)) drop-shadow(0 12px 24px rgba(0, 0, 0, 0.6))',
              }}
            />
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
