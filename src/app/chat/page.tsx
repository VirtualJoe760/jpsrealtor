"use client";

import { useEffect, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { EnhancedChatProvider, useEnhancedChat } from "@/app/components/chat/EnhancedChatProvider";
import { MLSProvider } from "@/app/components/mls/MLSProvider";
import MLSPreloader from "@/app/components/mls/MLSPreloader";
import IntegratedChatWidget from "./components/IntegratedChatWidget";
import ArticlesView from "./components/ArticlesView";
import DashboardViewIntegrated from "./components/DashboardViewIntegrated";
import SubdivisionsView from "./components/SubdivisionsView";
import StarsCanvas from "./components/StarsCanvas";
import { blurFade } from "./utils/motion";

// Force dynamic rendering for this page since it uses search params
export const dynamic = 'force-dynamic';

// Component that handles URL search params synchronization
function URLSyncHandler() {
  const { currentView, setCurrentView } = useEnhancedChat();
  const searchParams = useSearchParams();

  useEffect(() => {
    const viewParam = searchParams.get('view');

    // Map URL params to internal view states
    type ViewType = 'chat' | 'articles' | 'dashboard' | 'subdivisions';
    const validViews: Record<string, ViewType> = {
      'chat': 'chat',
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

  const renderView = () => {
    switch (currentView) {
      case "chat":
        return (
          <motion.div key="chat" {...blurFade(0.5)} className="h-full">
            <IntegratedChatWidget />
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

  return (
    <div className="h-screen w-screen bg-black overflow-hidden relative" data-page="chat">
      {/* URL Sync Handler */}
      <URLSyncHandler />

      {/* Persistent Starfield Background */}
      <div className="absolute inset-0 z-0">
        <StarsCanvas />
      </div>

      {/* Background MLS Preloader - Loads map data invisibly */}
      <MLSPreloader />

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
