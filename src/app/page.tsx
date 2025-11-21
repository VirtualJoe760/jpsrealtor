"use client";

import { useEffect, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { EnhancedChatProvider, useEnhancedChat } from "@/app/components/chat/EnhancedChatProvider";
import { MLSProvider } from "@/app/components/mls/MLSProvider";
import { useChatContext } from "@/app/components/chat/ChatProvider";
import MLSPreloader from "@/app/components/mls/MLSPreloader";
import IntegratedChatWidget from "@/app/components/chatwidget/IntegratedChatWidget";
import ArticlesView from "@/app/components/chatwidget/ArticlesView";
import DashboardViewIntegrated from "@/app/components/chatwidget/DashboardViewIntegrated";
import SubdivisionsView from "@/app/components/chatwidget/SubdivisionsView";
import { blurFade } from "@/app/utils/chat/motion";

// Force dynamic rendering for this page since it uses search params
export const dynamic = 'force-dynamic';

// Component that handles URL search params synchronization
function URLSyncHandler() {
  const { currentView, setCurrentView } = useEnhancedChat();
  const { clearMessages } = useChatContext();
  const searchParams = useSearchParams();

  useEffect(() => {
    const viewParam = searchParams.get('view');
    const newParam = searchParams.get('new');

    // If new=true, clear messages for a fresh chat
    if (newParam === 'true') {
      clearMessages();
      // Remove the 'new' param from URL to avoid clearing again on refresh
      const url = new URL(window.location.href);
      url.searchParams.delete('new');
      window.history.replaceState({}, '', url.toString());
    }

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
  }, [searchParams, currentView, setCurrentView, clearMessages]);

  return null;
}

function HomePageContent() {
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
    <div className="h-screen w-screen overflow-hidden relative" data-page="home" style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
      {/* URL Sync Handler */}
      <URLSyncHandler />

      {/* Background MLS Preloader - Loads map data invisibly */}
      <MLSPreloader />

      {/* Main Content Area */}
      <main className="flex-1 w-full h-full relative overflow-x-hidden overflow-y-auto z-10">
        <AnimatePresence mode="wait">{renderView()}</AnimatePresence>

        {/* Subtle gradient overlay for depth */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-purple-900/5 via-transparent to-pink-900/5" />
      </main>
    </div>
  );
}

function HomePageWrapper() {
  return (
    <EnhancedChatProvider>
      <MLSProvider>
        <HomePageContent />
      </MLSProvider>
    </EnhancedChatProvider>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-neutral-400 text-sm">Loading...</p>
        </div>
      </div>
    }>
      <HomePageWrapper />
    </Suspense>
  );
}
