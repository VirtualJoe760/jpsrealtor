"use client";

import { MLSProvider } from "@/app/components/mls/MLSProvider";
import { ChatProvider } from "@/app/components/chat/ChatProvider";
import ChatWidget from "@/app/components/chat/ChatWidget";
import MapLayer from "@/app/components/MapLayer";
import SpaticalBackground from "@/app/components/backgrounds/SpaticalBackground";
import { useMapControl } from "@/app/hooks/useMapControl";

function HomeContent() {
  const { isMapVisible, showMapAtLocation, hideMap } = useMapControl();

  const handleToggleMap = () => {
    if (isMapVisible) {
      hideMap();
    } else {
      // Show map centered on Palm Desert
      showMapAtLocation(33.8303, -116.5453, 12);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Spatial Background - base layer */}
      <div
        className="fixed inset-0"
        style={{
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <SpaticalBackground showGradient={true} className="h-full w-full" />
      </div>

      {/* Map Layer with wipe clip-path effect */}
      <div
        className="fixed inset-0 transition-all duration-[1500ms] ease-in-out"
        style={{
          zIndex: 1,
          clipPath: isMapVisible
            ? 'inset(0% 0% 0% 0%)' // Fully visible
            : 'inset(50% 0% 50% 0%)', // Clipped to center horizontal line (hidden)
          pointerEvents: isMapVisible ? 'auto' : 'none',
        }}
      >
        <MapLayer />
      </div>

      {/* Map Toggle Button - Top Right */}
      <button
        onClick={handleToggleMap}
        className="fixed top-4 right-4 z-30 p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110"
        aria-label={isMapVisible ? "Hide Map" : "Show Map"}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isMapVisible ? (
            // X icon when map is visible
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            // Map icon when map is hidden
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          )}
        </svg>
      </button>

      {/* Chat Widget - renders above both backgrounds */}
      <div className="relative z-20">
        <ChatWidget />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <MLSProvider>
      <ChatProvider>
        <HomeContent />
      </ChatProvider>
    </MLSProvider>
  );
}
