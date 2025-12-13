"use client";

import { MLSProvider } from "@/app/components/mls/MLSProvider";
import { ChatProvider } from "@/app/components/chat/ChatProvider";
import ChatWidget from "@/app/components/chat/ChatWidget";
import MapLayer from "@/app/components/MapLayer";
import SpaticalBackground from "@/app/components/backgrounds/SpaticalBackground";
import { useMapControl } from "@/app/hooks/useMapControl";

function HomeContent() {
  const { isMapVisible } = useMapControl();

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
