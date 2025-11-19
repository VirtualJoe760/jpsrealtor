"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Map,
  FileText,
  LayoutDashboard,
  Home,
  Settings,
  Heart,
  SlidersHorizontal,
  Plus,
  Clock,
  Trash2,
  X,
} from "lucide-react";
import { useMLSContext } from "@/app/components/mls/MLSProvider";
import { useChatContext } from "@/app/components/chat/ChatProvider";
import { useEnhancedChat } from "@/app/components/chat/EnhancedChatProvider";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Filters } from "@/types/types";

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onClose?: () => void; // Optional prop to close sidebar on mobile
}

const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "new-chat", label: "Chat", icon: MessageSquare },
  { id: "map-view", label: "Map View", icon: Map, hasSubMenu: true },
  { id: "articles", label: "Articles", icon: FileText },
  { id: "neighborhoods", label: "Neighborhoods", icon: Home },
];

// Conversation History Types
interface ConversationHistory {
  id: string;
  title: string;
  timestamp: number;
  messageCount: number;
}

interface StoredMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  listings?: any[];
}

// Conversation History Utilities
const HISTORY_STORAGE_KEY = "chat_conversation_history";
const MESSAGES_STORAGE_PREFIX = "chat_messages_";
const MAX_HISTORY_ITEMS = 5;

function getConversationHistory(): ConversationHistory[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveConversationHistory(history: ConversationHistory[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to save conversation history:", error);
  }
}

export function addToConversationHistory(firstMessage: string, conversationId: string) {
  const history = getConversationHistory();

  // Create title from first message (truncated to 30 chars)
  const title = firstMessage.length > 30
    ? firstMessage.substring(0, 30) + "..."
    : firstMessage;

  // Add new conversation at the beginning
  const newConversation: ConversationHistory = {
    id: conversationId,
    title,
    timestamp: Date.now(),
    messageCount: 1,
  };

  // Remove oldest if we're at max capacity
  const updatedHistory = [newConversation, ...history.slice(0, MAX_HISTORY_ITEMS - 1)];
  saveConversationHistory(updatedHistory);
}

export function updateConversationMessageCount(conversationId: string) {
  const history = getConversationHistory();
  const updated = history.map(conv =>
    conv.id === conversationId
      ? { ...conv, messageCount: conv.messageCount + 1 }
      : conv
  );
  saveConversationHistory(updated);
}

// Save messages for a specific conversation
export function saveConversationMessages(conversationId: string, messages: StoredMessage[]) {
  if (typeof window === "undefined") return;
  try {
    const key = `${MESSAGES_STORAGE_PREFIX}${conversationId}`;
    localStorage.setItem(key, JSON.stringify(messages));
  } catch (error) {
    console.error("Failed to save conversation messages:", error);
  }
}

// Load messages for a specific conversation
export function loadConversationMessages(conversationId: string): StoredMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const key = `${MESSAGES_STORAGE_PREFIX}${conversationId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Delete a specific conversation
export function deleteConversation(conversationId: string) {
  if (typeof window === "undefined") return;
  try {
    // Remove from history list
    const history = getConversationHistory();
    const updatedHistory = history.filter(conv => conv.id !== conversationId);
    saveConversationHistory(updatedHistory);

    // Remove messages from localStorage
    const key = `${MESSAGES_STORAGE_PREFIX}${conversationId}`;
    localStorage.removeItem(key);

    console.log(`🗑️ Deleted conversation: ${conversationId}`);
  } catch (error) {
    console.error("Failed to delete conversation:", error);
  }
}

// Clear all conversation history
export function clearAllHistory() {
  if (typeof window === "undefined") return;
  try {
    // Get all conversations
    const history = getConversationHistory();

    // Delete all message data
    history.forEach(conv => {
      const key = `${MESSAGES_STORAGE_PREFIX}${conv.id}`;
      localStorage.removeItem(key);
    });

    // Clear history list
    localStorage.removeItem(HISTORY_STORAGE_KEY);

    console.log("🗑️ Cleared all conversation history");
  } catch (error) {
    console.error("Failed to clear all history:", error);
  }
}

export default function EnhancedSidebar({ currentView, onViewChange, onClose }: SidebarProps) {
  const { isSidebarCollapsed: isCollapsed, toggleSidebar } = useEnhancedChat();
  const [mapFiltersOpen, setMapFiltersOpen] = useState(false);
  const { filters, updateFilter, resetFilters, likedListings, loadListings } = useMLSContext();
  const { loadMessages, clearMessages } = useChatContext();
  const [conversationHistory, setConversationHistory] = useState<ConversationHistory[]>([]);
  const { data: session } = useSession();
  const router = useRouter();

  // Collapsible filter sections
  const [filterSections, setFilterSections] = useState({
    basic: true,
    property: false,
    amenities: false,
    community: false,
    location: false,
  });

  // Load conversation history on mount and refresh periodically
  useEffect(() => {
    setConversationHistory(getConversationHistory());

    // Refresh history every 5 seconds to catch new conversations
    const interval = setInterval(() => {
      setConversationHistory(getConversationHistory());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Handle new chat button click
  const handleNewChat = () => {
    // Clear current messages to start a fresh chat
    clearMessages();
    // Navigate to chat view
    router.push('/chat?view=chat', { scroll: false });
    onViewChange('new-chat');
    // Close sidebar on mobile
    if (onClose && typeof window !== 'undefined' && window.innerWidth < 768) {
      onClose();
    }
  };

  // Handle loading a previous conversation
  const handleLoadConversation = (conversationId: string) => {
    console.log("Loading conversation:", conversationId);

    // Load messages from localStorage
    const storedMessages = loadConversationMessages(conversationId);

    if (storedMessages.length > 0) {
      // Convert stored messages to ChatMessage format
      const chatMessages = storedMessages.map((msg, index) => ({
        id: `loaded_${conversationId}_${index}`,
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        listings: msg.listings,
        context: "general" as const,
      }));

      // Clear current messages and load the conversation
      clearMessages();
      loadMessages(chatMessages);

      // Switch to chat view
      onViewChange("new-chat");

      console.log(`✅ Loaded ${chatMessages.length} messages from conversation ${conversationId}`);
    } else {
      console.warn("No messages found for conversation:", conversationId);
    }
  };

  // Handle deleting a specific conversation
  const handleDeleteConversation = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the load conversation action
    deleteConversation(conversationId);
    // Refresh the history list
    setConversationHistory(getConversationHistory());
  };

  // Handle clearing all history
  const handleClearAllHistory = () => {
    if (confirm("Are you sure you want to delete all conversation history?")) {
      clearAllHistory();
      setConversationHistory([]);
    }
  };

  const toggleMapFilters = () => {
    setMapFiltersOpen(!mapFiltersOpen);
  };

  const toggleFilterSection = (section: keyof typeof filterSections) => {
    setFilterSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleFilterChange = (key: keyof Filters, value: any) => {
    updateFilter(key, value);
  };

  const handleApplyFilters = async () => {
    // Default bounds for Coachella Valley
    const DEFAULT_BOUNDS = {
      north: 33.82,
      south: 33.62,
      east: -116.27,
      west: -116.47,
      zoom: 11,
    };

    await loadListings(DEFAULT_BOUNDS, filters);
  };

  const FilterSectionHeader = ({ title, section }: { title: string; section: keyof typeof filterSections }) => (
    <button
      onClick={() => toggleFilterSection(section)}
      className="w-full flex justify-between items-center py-3 md:py-2 text-emerald-400 md:text-purple-400 font-medium text-sm md:text-xs hover:text-emerald-300 md:hover:text-purple-300 transition"
    >
      <span>{title}</span>
      {filterSections[section] ? (
        <ChevronUp className="w-5 h-5 md:w-3 md:h-3" />
      ) : (
        <ChevronDown className="w-5 h-5 md:w-3 md:h-3" />
      )}
    </button>
  );

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isCollapsed ? "60px" : "320px", // Optimized for MacBook and desktop layouts
      }}
      transition={{
        duration: 0.3,
        ease: "easeInOut",
      }}
      className="relative h-screen max-h-screen bg-black/95 md:bg-neutral-900/95 backdrop-blur-xl border-r border-emerald-500/20 md:border-neutral-800/50 flex flex-col z-30 overflow-hidden"
      style={{ height: '100vh', maxHeight: '100vh' }}
    >
      {/* Header - Logo & Actions - Mobile Optimized */}
      <div className="flex items-center justify-between px-4 py-5 md:p-4 border-b border-emerald-500/10 md:border-neutral-800/50">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <>
              {/* Left side: Close/Collapse and New Chat buttons */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 md:gap-2"
              >
                {/* Mobile: Show X to close, Desktop: Show collapse chevron */}
                <button
                  onClick={() => {
                    if (onClose && window.innerWidth < 768) {
                      // Mobile: close the sidebar overlay
                      onClose();
                    } else {
                      // Desktop: toggle collapse
                      toggleSidebar();
                    }
                  }}
                  className="p-3 md:p-2 bg-emerald-500/10 md:bg-transparent hover:bg-emerald-500/20 md:hover:bg-neutral-800 rounded-xl md:rounded-lg transition-all"
                >
                  {/* Mobile: Always show X */}
                  <X className="w-6 h-6 text-emerald-400 md:hidden" strokeWidth={2.5} />

                  {/* Desktop: Show chevron for collapse */}
                  {isCollapsed ? (
                    <ChevronRight className="hidden md:block w-4 h-4 text-neutral-400" />
                  ) : (
                    <ChevronLeft className="hidden md:block w-4 h-4 text-neutral-400" />
                  )}
                </button>

                {/* New Chat Button */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  onClick={handleNewChat}
                  className="p-3 md:p-2 bg-emerald-500/10 md:bg-transparent hover:bg-emerald-500/20 md:hover:bg-neutral-800 rounded-xl md:rounded-lg transition-all"
                  title="New Chat"
                >
                  <Plus className="w-6 h-6 md:w-4 md:h-4 text-emerald-400 md:text-neutral-400" />
                </motion.button>
              </motion.div>

              {/* Right side: Logo Icon */}
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-10 h-10 md:w-8 md:h-8 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl md:rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <svg
                    className="w-6 h-6 md:w-5 md:h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Search - Mobile Optimized */}
      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 py-3 md:p-4"
          >
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-neutral-800/50 md:bg-neutral-800/50 border border-emerald-500/20 md:border-neutral-700/50 rounded-xl md:rounded-lg px-4 py-3 md:px-3 md:py-2 text-base md:text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 md:focus:ring-purple-500/50 transition-all"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Navigation - Scrollable Content */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-1 min-h-0">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const displayLabel = item.id === "dashboard" && !session ? "Login/Sign-up" : item.label;

          return (
            <div key={item.id}>
              <motion.button
                onClick={() => {
                  if (item.hasSubMenu) {
                    // For items with submenus (Map View), only toggle the dropdown
                    toggleMapFilters();
                  } else if (item.id === "neighborhoods") {
                    // Navigate to neighborhoods page
                    router.push("/neighborhoods");
                  } else {
                    // For regular items, change the view
                    const viewParam = item.id === "new-chat" ? "chat" : item.id === "map-view" ? "map" : item.id;
                    router.push(`/chat?view=${viewParam}`, { scroll: false });
                    onViewChange(item.id);
                  }
                }}
                initial={false}
                whileHover={{ x: isCollapsed ? 0 : 4 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center gap-4 md:gap-3 px-4 py-4 md:px-3 md:py-2.5 rounded-xl md:rounded-lg text-base md:text-sm transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 md:from-purple-500/20 md:to-pink-500/20 text-white border border-emerald-500/30 md:border-purple-500/30 shadow-lg shadow-emerald-500/10"
                    : "text-neutral-400 hover:bg-emerald-500/10 md:hover:bg-neutral-800/50 hover:text-neutral-200"
                }`}
              >
                <Icon className="w-6 h-6 md:w-5 md:h-5 flex-shrink-0" strokeWidth={2} />
                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex-1 text-left font-medium md:font-normal"
                    >
                      {displayLabel}
                    </motion.span>
                  )}
                </AnimatePresence>
                {item.hasSubMenu && !isCollapsed && (
                  <motion.div
                    initial={false}
                    animate={{ rotate: mapFiltersOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5 md:w-4 md:h-4" />
                  </motion.div>
                )}
              </motion.button>

              {/* Map View Filters Accordion */}
              {item.hasSubMenu && !isCollapsed && (
                <AnimatePresence>
                  {mapFiltersOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-4 mt-2 mb-2 flex flex-col">
                        <div className="p-4 bg-neutral-800/30 rounded-lg flex flex-col text-xs">
                          {/* Scrollable Filters Area */}
                          <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto pr-2 custom-scrollbar">
                          {/* Favorites Count */}
                          <div className="flex items-center justify-between p-3 md:p-2 bg-neutral-900/50 rounded-xl md:rounded-lg">
                            <div className="flex items-center gap-2">
                              <Heart className="w-6 h-6 md:w-5 md:h-5 text-emerald-400 md:text-purple-400" />
                              <span className="text-base md:text-sm font-medium text-neutral-100">Favorites</span>
                            </div>
                            <span className="text-xl md:text-lg font-bold text-emerald-400 md:text-purple-400">{likedListings.length}</span>
                          </div>

                          {/* ========== BASIC FILTERS ========== */}
                          <div>
                            <FilterSectionHeader title="Basic Filters" section="basic" />
                            {filterSections.basic && (
                              <div className="space-y-5 md:space-y-4 pl-2 pt-2">
                                {/* Listing Type */}
                                <div>
                                  <label className="text-neutral-300 mb-2 block font-medium text-sm md:text-xs">Listing Type</label>
                                  <select
                                    value={filters.listingType}
                                    onChange={(e) => handleFilterChange("listingType", e.target.value)}
                                    className="w-full bg-neutral-700 border border-neutral-600 rounded-xl md:rounded-lg px-4 py-3 md:px-3 md:py-2 text-base md:text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 md:focus:ring-purple-500"
                                  >
                                    <option value="sale">For Sale</option>
                                    <option value="rental">For Rent</option>
                                    <option value="lease">For Lease</option>
                                  </select>
                                </div>

                                {/* Price Range */}
                                <div>
                                  <label className="text-neutral-300 mb-2 block font-medium text-sm md:text-xs">Price Range</label>
                                  <div className="flex gap-3 md:gap-2">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="Min"
                                      value={filters.minPrice}
                                      onChange={(e) => handleFilterChange("minPrice", e.target.value.replace(/\D/g, ""))}
                                      className="w-full bg-neutral-700 border border-neutral-600 rounded-xl md:rounded-lg px-4 py-3 md:px-3 md:py-2 text-base md:text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 md:focus:ring-purple-500"
                                    />
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="Max"
                                      value={filters.maxPrice}
                                      onChange={(e) => handleFilterChange("maxPrice", e.target.value.replace(/\D/g, ""))}
                                      className="w-full bg-neutral-700 border border-neutral-600 rounded-xl md:rounded-lg px-4 py-3 md:px-3 md:py-2 text-base md:text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 md:focus:ring-purple-500"
                                    />
                                  </div>
                                </div>

                                {/* Beds & Baths */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-neutral-300 mb-2 block font-medium text-sm md:text-xs">Min Beds</label>
                                    <input
                                      type="number"
                                      placeholder="Any"
                                      value={filters.beds}
                                      onChange={(e) => handleFilterChange("beds", e.target.value)}
                                      className="w-full bg-neutral-700 border border-neutral-600 rounded-xl md:rounded-lg px-4 py-3 md:px-3 md:py-2 text-base md:text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 md:focus:ring-purple-500"
                                      min="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-neutral-300 mb-2 block font-medium text-sm md:text-xs">Min Baths</label>
                                    <input
                                      type="number"
                                      placeholder="Any"
                                      value={filters.baths}
                                      onChange={(e) => handleFilterChange("baths", e.target.value)}
                                      className="w-full bg-neutral-700 border border-neutral-600 rounded-xl md:rounded-lg px-4 py-3 md:px-3 md:py-2 text-base md:text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 md:focus:ring-purple-500"
                                      min="0"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ========== PROPERTY DETAILS ========== */}
                          <div>
                            <FilterSectionHeader title="Property Details" section="property" />
                            {filterSections.property && (
                              <div className="space-y-5 md:space-y-4 pl-2 pt-2">
                                {/* Property Type */}
                                <div>
                                  <label className="text-neutral-300 mb-2 block font-medium text-sm md:text-xs">Property Type</label>
                                  <select
                                    value={filters.propertySubType}
                                    onChange={(e) => handleFilterChange("propertySubType", e.target.value)}
                                    className="w-full bg-neutral-700 border border-neutral-600 rounded-xl md:rounded-lg px-4 py-3 md:px-3 md:py-2 text-base md:text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 md:focus:ring-purple-500"
                                  >
                                    <option value="">All Types</option>
                                    <option value="Single Family Residence">Single Family Home</option>
                                    <option value="Condominium">Condominium</option>
                                    <option value="Townhouse">Townhouse</option>
                                    <option value="Manufactured Home">Manufactured Home</option>
                                    <option value="Mobile Home">Mobile Home</option>
                                    <option value="Residential Income">Multi-Family</option>
                                  </select>
                                </div>

                                {/* Square Footage */}
                                <div>
                                  <label className="text-neutral-300 mb-2 block font-medium text-sm md:text-xs">Square Footage</label>
                                  <div className="flex gap-3 md:gap-2">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="Min"
                                      value={filters.minSqft}
                                      onChange={(e) => handleFilterChange("minSqft", e.target.value.replace(/\D/g, ""))}
                                      className="w-full bg-neutral-700 border border-neutral-600 rounded-xl md:rounded-lg px-4 py-3 md:px-3 md:py-2 text-base md:text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 md:focus:ring-purple-500"
                                    />
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="Max"
                                      value={filters.maxSqft}
                                      onChange={(e) => handleFilterChange("maxSqft", e.target.value.replace(/\D/g, ""))}
                                      className="w-full bg-neutral-700 border border-neutral-600 rounded-xl md:rounded-lg px-4 py-3 md:px-3 md:py-2 text-base md:text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 md:focus:ring-purple-500"
                                    />
                                  </div>
                                </div>

                                {/* Lot Size */}
                                <div>
                                  <label className="text-neutral-300 mb-2 block font-medium text-sm md:text-xs">Lot Size (Sqft)</label>
                                  <div className="flex gap-3 md:gap-2">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="Min"
                                      value={filters.minLotSize}
                                      onChange={(e) => handleFilterChange("minLotSize", e.target.value.replace(/\D/g, ""))}
                                      className="w-full bg-neutral-700 border border-neutral-600 rounded-xl md:rounded-lg px-4 py-3 md:px-3 md:py-2 text-base md:text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 md:focus:ring-purple-500"
                                    />
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="Max"
                                      value={filters.maxLotSize}
                                      onChange={(e) => handleFilterChange("maxLotSize", e.target.value.replace(/\D/g, ""))}
                                      className="w-full bg-neutral-700 border border-neutral-600 rounded-xl md:rounded-lg px-4 py-3 md:px-3 md:py-2 text-base md:text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 md:focus:ring-purple-500"
                                    />
                                  </div>
                                </div>

                                {/* Year Built */}
                                <div>
                                  <label className="text-neutral-300 mb-2 block font-medium text-sm md:text-xs">Year Built</label>
                                  <div className="flex gap-3 md:gap-2">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="Min"
                                      value={filters.minYear}
                                      onChange={(e) => handleFilterChange("minYear", e.target.value.replace(/\D/g, ""))}
                                      className="w-full bg-neutral-700 border border-neutral-600 rounded-xl md:rounded-lg px-4 py-3 md:px-3 md:py-2 text-base md:text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 md:focus:ring-purple-500"
                                    />
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="Max"
                                      value={filters.maxYear}
                                      onChange={(e) => handleFilterChange("maxYear", e.target.value.replace(/\D/g, ""))}
                                      className="w-full bg-neutral-700 border border-neutral-600 rounded-xl md:rounded-lg px-4 py-3 md:px-3 md:py-2 text-base md:text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 md:focus:ring-purple-500"
                                    />
                                  </div>
                                </div>

                                {/* Land Type */}
                                <div>
                                  <label className="text-neutral-300 mb-2 block font-medium text-sm md:text-xs">Land Ownership</label>
                                  <select
                                    value={filters.landType}
                                    onChange={(e) => handleFilterChange("landType", e.target.value)}
                                    className="w-full bg-neutral-700 border border-neutral-600 rounded-xl md:rounded-lg px-4 py-3 md:px-3 md:py-2 text-base md:text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 md:focus:ring-purple-500"
                                  >
                                    <option value="">All</option>
                                    <option value="Fee Simple">Fee Simple (Own Land)</option>
                                    <option value="Leasehold">Leasehold (Lease Land)</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ========== AMENITIES ========== */}
                          <div>
                            <FilterSectionHeader title="Amenities & Features" section="amenities" />
                            {filterSections.amenities && (
                              <div className="space-y-5 md:space-y-4 pl-2 pt-2">
                                {/* Pool */}
                                <div>
                                  <label className="text-neutral-300 mb-2 block font-medium text-sm md:text-xs">Pool</label>
                                  <div className="flex gap-3 md:gap-2">
                                    <button
                                      onClick={() => handleFilterChange("poolYn", filters.poolYn === true ? undefined : true)}
                                      className={`flex-1 px-4 py-3 md:px-3 md:py-2 text-sm md:text-xs rounded-xl md:rounded-lg font-medium transition ${
                                        filters.poolYn === true
                                          ? "bg-purple-600 text-white"
                                          : "bg-neutral-700 text-neutral-400 hover:bg-neutral-600"
                                      }`}
                                    >
                                      Yes
                                    </button>
                                    <button
                                      onClick={() => handleFilterChange("poolYn", filters.poolYn === false ? undefined : false)}
                                      className={`flex-1 px-4 py-3 md:px-3 md:py-2 text-sm md:text-xs rounded-xl md:rounded-lg font-medium transition ${
                                        filters.poolYn === false
                                          ? "bg-red-600 text-white"
                                          : "bg-neutral-700 text-neutral-400 hover:bg-neutral-600"
                                      }`}
                                    >
                                      No
                                    </button>
                                    <button
                                      onClick={() => handleFilterChange("poolYn", undefined)}
                                      className={`flex-1 px-4 py-3 md:px-3 md:py-2 text-sm md:text-xs rounded-xl md:rounded-lg font-medium transition ${
                                        filters.poolYn === undefined
                                          ? "bg-neutral-600 text-white"
                                          : "bg-neutral-700 text-neutral-400 hover:bg-neutral-600"
                                      }`}
                                    >
                                      Any
                                    </button>
                                  </div>
                                </div>

                                {/* Spa */}
                                <div>
                                  <label className="text-neutral-300 mb-2 block font-medium text-sm md:text-xs">Spa/Hot Tub</label>
                                  <div className="flex gap-3 md:gap-2">
                                    <button
                                      onClick={() => handleFilterChange("spaYn", filters.spaYn === true ? undefined : true)}
                                      className={`flex-1 px-4 py-3 md:px-3 md:py-2 text-sm md:text-xs rounded-xl md:rounded-lg font-medium transition ${
                                        filters.spaYn === true
                                          ? "bg-purple-600 text-white"
                                          : "bg-neutral-700 text-neutral-400 hover:bg-neutral-600"
                                      }`}
                                    >
                                      Yes
                                    </button>
                                    <button
                                      onClick={() => handleFilterChange("spaYn", filters.spaYn === false ? undefined : false)}
                                      className={`flex-1 px-4 py-3 md:px-3 md:py-2 text-sm md:text-xs rounded-xl md:rounded-lg font-medium transition ${
                                        filters.spaYn === false
                                          ? "bg-red-600 text-white"
                                          : "bg-neutral-700 text-neutral-400 hover:bg-neutral-600"
                                      }`}
                                    >
                                      No
                                    </button>
                                    <button
                                      onClick={() => handleFilterChange("spaYn", undefined)}
                                      className={`flex-1 px-4 py-3 md:px-3 md:py-2 text-sm md:text-xs rounded-xl md:rounded-lg font-medium transition ${
                                        filters.spaYn === undefined
                                          ? "bg-neutral-600 text-white"
                                          : "bg-neutral-700 text-neutral-400 hover:bg-neutral-600"
                                      }`}
                                    >
                                      Any
                                    </button>
                                  </div>
                                </div>

                                {/* View */}
                                <div>
                                  <label className="text-neutral-300 mb-2 block font-medium text-sm md:text-xs">View</label>
                                  <div className="flex gap-3 md:gap-2">
                                    <button
                                      onClick={() => handleFilterChange("viewYn", filters.viewYn === true ? undefined : true)}
                                      className={`flex-1 px-4 py-3 md:px-3 md:py-2 text-sm md:text-xs rounded-xl md:rounded-lg font-medium transition ${
                                        filters.viewYn === true
                                          ? "bg-purple-600 text-white"
                                          : "bg-neutral-700 text-neutral-400 hover:bg-neutral-600"
                                      }`}
                                    >
                                      Has View
                                    </button>
                                    <button
                                      onClick={() => handleFilterChange("viewYn", undefined)}
                                      className={`flex-1 px-4 py-3 md:px-3 md:py-2 text-sm md:text-xs rounded-xl md:rounded-lg font-medium transition ${
                                        filters.viewYn === undefined
                                          ? "bg-neutral-600 text-white"
                                          : "bg-neutral-700 text-neutral-400 hover:bg-neutral-600"
                                      }`}
                                    >
                                      Any
                                    </button>
                                  </div>
                                </div>

                                {/* Min Garage Spaces */}
                                <div>
                                  <label className="text-neutral-300 mb-2 block font-medium text-sm md:text-xs">Min Garage Spaces</label>
                                  <input
                                    type="number"
                                    placeholder="Any"
                                    value={filters.minGarages}
                                    onChange={(e) => handleFilterChange("minGarages", e.target.value)}
                                    className="w-full bg-neutral-700 border border-neutral-600 rounded-xl md:rounded-lg px-4 py-3 md:px-3 md:py-2 text-base md:text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 md:focus:ring-purple-500"
                                    min="0"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ========== COMMUNITY & HOA ========== */}
                          <div>
                            <FilterSectionHeader title="Community & HOA" section="community" />
                            {filterSections.community && (
                              <div className="space-y-5 md:space-y-4 pl-2 pt-2">
                                {/* HOA Presence */}
                                <div>
                                  <label className="text-neutral-300 mb-2 block font-medium text-sm md:text-xs">Has HOA</label>
                                  <select
                                    value={
                                      filters.associationYN === true ? "yes" : filters.associationYN === false ? "no" : "any"
                                    }
                                    onChange={(e) =>
                                      handleFilterChange(
                                        "associationYN",
                                        e.target.value === "yes" ? true : e.target.value === "no" ? false : undefined
                                      )
                                    }
                                    className="w-full bg-neutral-700 border border-neutral-600 rounded-xl md:rounded-lg px-4 py-3 md:px-3 md:py-2 text-base md:text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 md:focus:ring-purple-500"
                                  >
                                    <option value="any">Any</option>
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                  </select>
                                </div>

                                {/* Max HOA Fee */}
                                <div>
                                  <label className="text-neutral-300 mb-2 block font-medium text-sm md:text-xs">Max HOA Fee (Monthly)</label>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="No Limit"
                                    value={filters.hoa}
                                    onChange={(e) => handleFilterChange("hoa", e.target.value.replace(/\D/g, ""))}
                                    className="w-full bg-neutral-700 border border-neutral-600 rounded-xl md:rounded-lg px-4 py-3 md:px-3 md:py-2 text-base md:text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 md:focus:ring-purple-500"
                                  />
                                </div>

                                {/* Gated Community */}
                                <div>
                                  <label className="text-neutral-300 mb-2 block font-medium text-sm md:text-xs">Gated Community</label>
                                  <div className="flex gap-3 md:gap-2">
                                    <button
                                      onClick={() =>
                                        handleFilterChange("gatedCommunity", filters.gatedCommunity === true ? undefined : true)
                                      }
                                      className={`flex-1 px-4 py-3 md:px-3 md:py-2 text-sm md:text-xs rounded-xl md:rounded-lg font-medium transition ${
                                        filters.gatedCommunity === true
                                          ? "bg-purple-600 text-white"
                                          : "bg-neutral-700 text-neutral-400 hover:bg-neutral-600"
                                      }`}
                                    >
                                      Yes
                                    </button>
                                    <button
                                      onClick={() => handleFilterChange("gatedCommunity", undefined)}
                                      className={`flex-1 px-4 py-3 md:px-3 md:py-2 text-sm md:text-xs rounded-xl md:rounded-lg font-medium transition ${
                                        filters.gatedCommunity === undefined
                                          ? "bg-neutral-600 text-white"
                                          : "bg-neutral-700 text-neutral-400 hover:bg-neutral-600"
                                      }`}
                                    >
                                      Any
                                    </button>
                                  </div>
                                </div>

                                {/* Senior Community */}
                                <div>
                                  <label className="text-neutral-300 mb-2 block font-medium text-sm md:text-xs">55+ Senior Community</label>
                                  <div className="flex gap-3 md:gap-2">
                                    <button
                                      onClick={() =>
                                        handleFilterChange("seniorCommunity", filters.seniorCommunity === true ? undefined : true)
                                      }
                                      className={`flex-1 px-4 py-3 md:px-3 md:py-2 text-sm md:text-xs rounded-xl md:rounded-lg font-medium transition ${
                                        filters.seniorCommunity === true
                                          ? "bg-purple-600 text-white"
                                          : "bg-neutral-700 text-neutral-400 hover:bg-neutral-600"
                                      }`}
                                    >
                                      Yes
                                    </button>
                                    <button
                                      onClick={() => handleFilterChange("seniorCommunity", undefined)}
                                      className={`flex-1 px-4 py-3 md:px-3 md:py-2 text-sm md:text-xs rounded-xl md:rounded-lg font-medium transition ${
                                        filters.seniorCommunity === undefined
                                          ? "bg-neutral-600 text-white"
                                          : "bg-neutral-700 text-neutral-400 hover:bg-neutral-600"
                                      }`}
                                    >
                                      Any
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ========== LOCATION ========== */}
                          <div>
                            <FilterSectionHeader title="Location" section="location" />
                            {filterSections.location && (
                              <div className="space-y-5 md:space-y-4 pl-2 pt-2">
                                {/* City */}
                                <div>
                                  <label className="text-neutral-300 mb-2 block font-medium text-sm md:text-xs">City</label>
                                  <select
                                    value={filters.city}
                                    onChange={(e) => handleFilterChange("city", e.target.value)}
                                    className="w-full bg-neutral-700 border border-neutral-600 rounded-xl md:rounded-lg px-4 py-3 md:px-3 md:py-2 text-base md:text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 md:focus:ring-purple-500"
                                  >
                                    <option value="">All Cities</option>
                                    <option value="Palm Springs">Palm Springs</option>
                                    <option value="Cathedral City">Cathedral City</option>
                                    <option value="Palm Desert">Palm Desert</option>
                                    <option value="Rancho Mirage">Rancho Mirage</option>
                                    <option value="Indian Wells">Indian Wells</option>
                                    <option value="La Quinta">La Quinta</option>
                                    <option value="Indio">Indio</option>
                                    <option value="Coachella">Coachella</option>
                                    <option value="Desert Hot Springs">Desert Hot Springs</option>
                                  </select>
                                </div>

                                {/* Subdivision */}
                                <div>
                                  <label className="text-neutral-300 mb-2 block font-medium text-sm md:text-xs">Subdivision/Community</label>
                                  <input
                                    type="text"
                                    placeholder="Search by name..."
                                    value={filters.subdivision}
                                    onChange={(e) => handleFilterChange("subdivision", e.target.value)}
                                    className="w-full bg-neutral-700 border border-neutral-600 rounded-xl md:rounded-lg px-4 py-3 md:px-3 md:py-2 text-base md:text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 md:focus:ring-purple-500"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          </div>

                          {/* Sticky Action Buttons - Always Visible at Bottom */}
                          <div className="sticky bottom-0 pt-4 pb-2 bg-neutral-800/95 backdrop-blur-sm mt-4 border-t border-neutral-700/50 space-y-2">
                            {/* Apply Filters Button */}
                            <button
                              onClick={handleApplyFilters}
                              className="w-full py-4 md:py-3 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-bold rounded-xl md:rounded-lg text-base md:text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
                            >
                              Apply Filters
                            </button>

                            {/* Reset Filters Button */}
                            <button
                              onClick={() => resetFilters()}
                              className="w-full py-3.5 md:py-2.5 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl md:rounded-lg text-base md:text-sm transition-all flex items-center justify-center gap-2 font-medium"
                            >
                              <SlidersHorizontal className="w-5 h-5 md:w-4 md:h-4" />
                              Reset All Filters
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          );
        })}

        {/* Conversation History Section */}
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-6"
            >
              <div className="flex items-center justify-between px-3 mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-neutral-500" />
                  <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">History</h3>
                </div>
                {conversationHistory.length > 0 && (
                  <button
                    onClick={handleClearAllHistory}
                    className="text-xs text-neutral-500 hover:text-red-400 transition-colors flex items-center gap-1"
                    title="Clear all history"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {conversationHistory.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-neutral-600 text-center">
                    No conversation history yet
                  </div>
                ) : (
                  conversationHistory.map((conversation) => (
                    <div
                      key={conversation.id}
                      className="group relative"
                    >
                      <button
                        onClick={() => handleLoadConversation(conversation.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200 transition-colors"
                      >
                        <MessageSquare className="w-3 h-3 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate">{conversation.title}</p>
                          <p className="text-xs text-neutral-600">
                            {conversation.messageCount} messages • {new Date(conversation.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </button>
                      {/* Delete button - shown on hover */}
                      <button
                        onClick={(e) => handleDeleteConversation(conversation.id, e)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-neutral-900 border border-neutral-700 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400 transition-all"
                        title="Delete conversation"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Bottom Section - Settings & Profile - DOCKED with Safe Area */}
      <div className="flex-shrink-0 border-t border-neutral-800/50 px-2 pt-2" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
        <motion.button
          whileHover={{ x: isCollapsed ? 0 : 4 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200 transition-all mb-10"
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.aside>
  );
}
