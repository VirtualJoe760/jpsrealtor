// src/app/components/chat/EnhancedChatProvider.tsx
// Enhanced chat state with view management and animations

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ChatProvider, useChatContext } from "./ChatProvider";
import { type Listing } from "./ListingCarousel";

export type ViewType = 'chat' | 'map' | 'articles' | 'dashboard' | 'subdivisions';
export type ChatModeType = 'landing' | 'conversation' | 'minimized';

interface EnhancedChatContextType {
  // View state
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;

  // Chat mode (controls input animation)
  chatMode: ChatModeType;
  setChatMode: (mode: ChatModeType) => void;

  // Sidebar state
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  // Search results for map integration
  searchResults: Listing[];
  setSearchResults: (results: Listing[]) => void;

  // Animation triggers
  animateInputToBottom: () => void;
  animateInputToCenter: () => void;
  minimizeChat: () => void;
  expandChat: () => void;

  // View-specific data
  viewData: Record<string, any>;
  setViewData: (view: ViewType, data: any) => void;

  // Loading states
  isTransitioning: boolean;
}

const EnhancedChatContext = createContext<EnhancedChatContextType | undefined>(undefined);

function EnhancedChatProviderInner({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<ViewType>('chat');
  const [chatMode, setChatMode] = useState<ChatModeType>('landing');
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchResults, setSearchResults] = useState<Listing[]>([]);
  const [viewData, setViewDataState] = useState<Record<string, any>>({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [initialMessageCount, setInitialMessageCount] = useState(0);

  const { messages } = useChatContext();

  // Track initial message count to detect new messages
  useEffect(() => {
    if (initialMessageCount === 0 && messages.length > 0) {
      setInitialMessageCount(messages.length);
      console.log("📊 Initial message count:", messages.length);
    }
  }, [messages.length]);

  // Animation helper functions
  const animateInputToBottom = () => {
    console.log("🎬 Animating input to bottom");
    setChatMode('conversation');
    setHasAnimated(true);
  };

  const animateInputToCenter = () => {
    console.log("🎬 Animating input to center");
    setChatMode('landing');
  };

  const minimizeChat = () => {
    console.log("🎬 Minimizing chat");
    setChatMode('minimized');
  };

  const expandChat = () => {
    console.log("🎬 Expanding chat");
    setChatMode(currentView === 'chat' ? 'landing' : 'conversation');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  const setViewData = (view: ViewType, data: any) => {
    setViewDataState(prev => ({
      ...prev,
      [view]: data,
    }));
  };

  // Auto-animate input to bottom when user sends first NEW message
  useEffect(() => {
    // Only animate if:
    // 1. We're still in landing mode
    // 2. We haven't animated yet
    // 3. The message count has increased beyond initial load
    if (chatMode === 'landing' && !hasAnimated && messages.length > initialMessageCount) {
      const userMessages = messages.filter(m => m.role === 'user');
      if (userMessages.length > 0) {
        console.log("🎯 User sent first message, animating to bottom");
        setTimeout(animateInputToBottom, 100);
      }
    }
  }, [messages.length, chatMode, hasAnimated, initialMessageCount]);

  // When switching TO chat view, always show landing mode (never minimized)
  useEffect(() => {
    if (currentView === 'chat') {
      // If coming from another view or if messages exist, decide mode
      if (messages.length > 0 && chatMode !== 'conversation') {
        console.log("🎯 Switching to chat view with messages - showing conversation mode");
        setChatMode('conversation');
      } else if (messages.length === 0 && chatMode !== 'landing') {
        console.log("🎯 Switching to chat view - showing landing mode");
        setChatMode('landing');
      }
    }
  }, [currentView, messages.length]);

  // Auto-switch to map view when search results arrive
  useEffect(() => {
    if (searchResults.length > 0 && currentView === 'chat') {
      console.log("🎯 Search results received, staying in chat for carousel");
      // We'll let user manually switch to map, or add a button
    }
  }, [searchResults]);

  // Handle view transitions
  const handleSetCurrentView = (view: ViewType) => {
    setIsTransitioning(true);
    setCurrentView(view);
    setTimeout(() => setIsTransitioning(false), 600); // Match animation duration
  };

  return (
    <EnhancedChatContext.Provider
      value={{
        currentView,
        setCurrentView: handleSetCurrentView,
        chatMode,
        setChatMode,
        isSidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
        searchResults,
        setSearchResults,
        animateInputToBottom,
        animateInputToCenter,
        minimizeChat,
        expandChat,
        viewData,
        setViewData,
        isTransitioning,
      }}
    >
      {children}
    </EnhancedChatContext.Provider>
  );
}

export function EnhancedChatProvider({ children }: { children: ReactNode }) {
  return (
    <ChatProvider disableAutoLoad={true}>
      <EnhancedChatProviderInner>{children}</EnhancedChatProviderInner>
    </ChatProvider>
  );
}

export function useEnhancedChat() {
  const context = useContext(EnhancedChatContext);
  if (!context) {
    throw new Error("useEnhancedChat must be used within EnhancedChatProvider");
  }
  return context;
}
