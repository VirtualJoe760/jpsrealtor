"use client";

import { useState, useEffect, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { EnhancedChatProvider, useEnhancedChat } from "@/app/components/chat/EnhancedChatProvider";
import { MLSProvider } from "@/app/components/mls/MLSProvider";
import MLSPreloader from "@/app/components/mls/MLSPreloader";
import EnhancedSidebar from "./components/EnhancedSidebar";
import IntegratedChatWidget from "./components/IntegratedChatWidget";
import MapViewIntegrated from "./components/MapViewIntegrated";
import ArticlesView from "./components/ArticlesView";
import DashboardViewIntegrated from "./components/DashboardViewIntegrated";
import SubdivisionsView from "./components/SubdivisionsView";
import StarsCanvas from "./components/StarsCanvas";
import { blurFade, fadeSlideIn } from "./utils/motion";

// Force dynamic rendering for this page since it uses search params
export const dynamic = 'force-dynamic';

// Component that handles URL search params synchronization
function URLSyncHandler() {
  const { currentView, setCurrentView } = useEnhancedChat();
  const searchParams = useSearchParams();

  useEffect(() => {
    const viewParam = searchParams.get('view');

    // Map URL params to internal view states
    type ViewType = 'chat' | 'map' | 'articles' | 'dashboard' | 'subdivisions';
    const validViews: Record<string, ViewType> = {
      'chat': 'chat',
      'map': 'map',
      'articles': 'articles',
      'dashboard': 'dashboard',
      'subdivisions': 'subdivisions'
    };

    // Default to 'chat' if no param or invalid param
    const newView: ViewType = viewParam && validViews[viewParam] ? validViews[viewParam] : 'chat';

    if (newView !== currentView) {
      setCurrentView(newView);
    }
  }, [searchParams, currentView, setCurrentView]);

  return null;
}

function ChatPageContent() {
  const { currentView, setCurrentView } = useEnhancedChat();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderView = () => {
    switch (currentView) {
      case "chat":
        return (
          <motion.div key="chat" {...blurFade(0.5)} className="h-full">
            <IntegratedChatWidget />
          </motion.div>
        );
      case "map":
        return (
          <motion.div key="map" {...blurFade(0.5)} className="h-full">
            <MapViewIntegrated />
          </motion.div>
        );
      case "articles":
        return (
          <motion.div key="articles" {...blurFade(0.5)} className="h-full">
            <ArticlesView />
          </motion.div>
        );
      case "dashboard":
        return (
          <motion.div key="dashboard" {...blurFade(0.5)} className="h-full">
            <DashboardViewIntegrated />
          </motion.div>
        );
      case "subdivisions":
        return (
          <motion.div key="subdivisions" {...blurFade(0.5)} className="h-full">
            <SubdivisionsView />
          </motion.div>
        );
      default:
        return (
          <motion.div key="chat" {...blurFade(0.5)} className="h-full">
            <IntegratedChatWidget />
          </motion.div>
        );
    }
  };

  const handleViewChange = (view: string) => {
    const viewMap: Record<string, any> = {
      "new-chat": "chat",
      "map-view": "map",
      "articles": "articles",
      "dashboard": "dashboard",
      "subdivisions": "subdivisions",
    };
    setCurrentView(viewMap[view] || "chat");
    setSidebarOpen(false); // Close sidebar after selection
  };

  return (
    <div className="md:flex h-screen w-screen bg-black overflow-hidden relative" data-page="chat">
      {/* URL Sync Handler */}
      <URLSyncHandler />

      {/* Persistent Starfield Background */}
      <div className="absolute inset-0 z-0">
        <StarsCanvas />
      </div>

      {/* Background MLS Preloader - Loads map data invisibly */}
      <MLSPreloader />

      {/* Mobile-only: Hamburger Menu Button - Only show when sidebar is closed */}
      {!sidebarOpen && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
          onClick={() => setSidebarOpen(true)}
          className="md:hidden fixed top-4 left-4 z-50 w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 backdrop-blur-xl border border-emerald-500/30 flex items-center justify-center hover:from-emerald-500/30 hover:to-cyan-500/30 hover:border-emerald-500/50 active:scale-95 transition-all shadow-2xl shadow-emerald-500/20"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <Menu className="w-6 h-6 text-emerald-400" strokeWidth={2.5} />
        </motion.button>
      )}

      {/* Desktop: Always visible sidebar */}
      <div className="hidden md:block relative z-10">
        <EnhancedSidebar
          currentView={currentView === "chat" ? "new-chat" : currentView === "map" ? "map-view" : currentView}
          onViewChange={handleViewChange}
        />
      </div>

      {/* Mobile: Overlay Sidebar - Slides in from left */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="md:hidden fixed left-0 top-0 h-full z-40"
            >
              <EnhancedSidebar
                currentView={currentView === "chat" ? "new-chat" : currentView === "map" ? "map-view" : currentView}
                onViewChange={handleViewChange}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 w-full md:w-auto h-full relative overflow-hidden z-10">
        <AnimatePresence mode="wait">{renderView()}</AnimatePresence>

        {/* Subtle gradient overlay for depth */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-purple-900/5 via-transparent to-pink-900/5" />
      </main>
    </div>
  );
}

function ChatPageWrapper() {
  return (
    <EnhancedChatProvider>
      <MLSProvider>
        <ChatPageContent />
      </MLSProvider>
    </EnhancedChatProvider>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-neutral-400 text-sm">Loading chat...</p>
        </div>
      </div>
    }>
      <ChatPageWrapper />
    </Suspense>
  );
}
