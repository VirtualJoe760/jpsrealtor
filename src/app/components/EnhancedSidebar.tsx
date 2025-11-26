"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Map,
  MapPin,
  FileText,
  LayoutDashboard,
  Home,
  X,
  Sparkles,
  Clock,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Sun,
  Moon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useSidebar } from "./SidebarContext";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";

interface SidebarProps {
  onClose?: () => void; // Optional prop to close sidebar on mobile
}

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

// Fetch conversation history from database (user-specific)
async function getConversationHistoryFromDB(): Promise<ConversationHistory[]> {
  try {
    const response = await fetch('/api/chat/history');
    if (!response.ok) {
      console.warn('Failed to fetch chat history from DB, using localStorage');
      return getConversationHistoryLocal();
    }
    const data = await response.json();
    return data.history || [];
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return getConversationHistoryLocal();
  }
}

// Fallback to localStorage (for backwards compatibility)
function getConversationHistoryLocal(): ConversationHistory[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Legacy function - now just calls DB version
function getConversationHistory(): ConversationHistory[] {
  return getConversationHistoryLocal();
}

function saveConversationHistory(history: ConversationHistory[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to save conversation history:", error);
  }
}

export async function addToConversationHistory(firstMessage: string, conversationId: string, aiResponse?: string) {
  // Generate AI title (with fallback to truncated message)
  let title = firstMessage.length > 30
    ? firstMessage.substring(0, 30) + "..."
    : firstMessage;

  try {
    // Try to generate a better title using AI
    const titleResponse = await fetch('/api/chat/generate-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: firstMessage,
        aiResponse: aiResponse,
      }),
    });

    if (titleResponse.ok) {
      const data = await titleResponse.json();
      if (data.title) {
        title = data.title;
      }
    }
  } catch (error) {
    console.warn('Failed to generate AI title, using fallback:', error);
  }

  // Save to database (user-specific)
  try {
    await fetch('/api/chat/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        title,
        messages: [{
          role: 'user',
          content: firstMessage,
          timestamp: Date.now(),
        }],
      }),
    });
  } catch (error) {
    console.error('Failed to save chat to database:', error);
  }

  // Also save to localStorage for backwards compatibility
  const history = getConversationHistory();
  const newConversation: ConversationHistory = {
    id: conversationId,
    title,
    timestamp: Date.now(),
    messageCount: 1,
  };
  const updatedHistory = [newConversation, ...history.slice(0, MAX_HISTORY_ITEMS - 1)];
  saveConversationHistory(updatedHistory);
}

export async function updateConversationMessageCount(conversationId: string) {
  // Update localStorage
  const history = getConversationHistory();
  const updated = history.map(conv =>
    conv.id === conversationId
      ? { ...conv, messageCount: conv.messageCount + 1, timestamp: Date.now() }
      : conv
  );
  saveConversationHistory(updated);

  // Also update the database to keep it in sync
  try {
    const conv = updated.find(c => c.id === conversationId);
    if (conv) {
      await fetch('/api/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conv.id,
          title: conv.title,
          messages: [], // Messages are stored separately, just update metadata
        }),
      });
    }
  } catch (error) {
    console.error('Failed to update conversation in database:', error);
  }
}

// Save messages for a specific conversation
export async function saveConversationMessages(conversationId: string, messages: StoredMessage[]) {
  if (typeof window === "undefined") return;

  // Save to localStorage for quick access
  try {
    const key = `${MESSAGES_STORAGE_PREFIX}${conversationId}`;
    localStorage.setItem(key, JSON.stringify(messages));
  } catch (error) {
    console.error("Failed to save conversation messages to localStorage:", error);
  }

  // Also save to database for cross-device persistence
  try {
    const history = getConversationHistory();
    const conv = history.find(c => c.id === conversationId);
    if (conv) {
      await fetch('/api/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          title: conv.title,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          })),
        }),
      });
      console.log(`💾 Saved ${messages.length} messages to database for conversation: ${conversationId}`);
    }
  } catch (error) {
    console.error('Failed to save conversation messages to database:', error);
  }
}

// Load messages for a specific conversation
export async function loadConversationMessages(conversationId: string): Promise<StoredMessage[]> {
  if (typeof window === "undefined") return [];

  // Try loading from database first for cross-device sync
  try {
    const response = await fetch(`/api/chat/history/messages?conversationId=${conversationId}`);
    if (response.ok) {
      const data = await response.json();
      if (data.messages && data.messages.length > 0) {
        console.log(`📥 Loaded ${data.messages.length} messages from database for conversation: ${conversationId}`);
        return data.messages;
      }
    }
  } catch (error) {
    console.warn('Failed to load messages from database, falling back to localStorage:', error);
  }

  // Fallback to localStorage
  try {
    const key = `${MESSAGES_STORAGE_PREFIX}${conversationId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Delete a specific conversation
export async function deleteConversation(conversationId: string) {
  if (typeof window === "undefined") return;
  try {
    // Delete from database
    await fetch(`/api/chat/history?conversationId=${conversationId}`, {
      method: 'DELETE',
    });

    // Remove from localStorage
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

const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { id: "chat", label: "Chat", icon: MessageSquare, href: "/" },
  { id: "map", label: "Map", icon: Map, href: "/map" },
  { id: "articles", label: "Articles", icon: FileText, href: "/insights" },
  { id: "neighborhoods", label: "Neighborhoods", icon: Home, href: "/neighborhoods" },
];

export default function EnhancedSidebar({ onClose }: SidebarProps) {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationHistory[]>([]);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [savedCommunities, setSavedCommunities] = useState<Array<{ name: string; id: string; type: 'city' | 'subdivision'; cityId?: string }>>([]);
  const [isCommunitiesCollapsed, setIsCommunitiesCollapsed] = useState(false);

  // On mobile (when onClose exists), always treat sidebar as expanded
  const isMobile = !!onClose;
  const effectivelyCollapsed = isMobile ? false : isCollapsed;

  // Load conversation history from database on mount and refresh periodically
  useEffect(() => {
    const loadHistory = async () => {
      const history = await getConversationHistoryFromDB();
      console.log('📚 [EnhancedSidebar] Loading conversation history from DB:', history);
      console.log('📱 [EnhancedSidebar] isMobile:', isMobile);
      console.log('📏 [EnhancedSidebar] isCollapsed:', isCollapsed);
      console.log('📏 [EnhancedSidebar] effectivelyCollapsed:', effectivelyCollapsed);
      console.log('📊 [EnhancedSidebar] History count:', history.length);
      setConversationHistory(history);
    };

    loadHistory();

    // Refresh history every 10 seconds to catch new conversations
    const interval = setInterval(async () => {
      const refreshedHistory = await getConversationHistoryFromDB();
      console.log('🔄 [EnhancedSidebar] Refreshing history:', refreshedHistory.length, 'items');
      setConversationHistory(refreshedHistory);
    }, 10000);

    return () => clearInterval(interval);
  }, [isMobile, isCollapsed, effectivelyCollapsed]);

  // Load saved communities (cities and subdivisions) from user favorites
  useEffect(() => {
    const loadSavedCommunities = async () => {
      if (!session?.user?.email) return;

      try {
        const response = await fetch('/api/user/favorite-communities');
        if (response.ok) {
          const data = await response.json();
          if (data.communities) {
            setSavedCommunities(data.communities);
          }
        }
      } catch (error) {
        console.error('Failed to load saved communities:', error);
      }
    };

    loadSavedCommunities();

    // Refresh every 30 seconds to catch new favorites
    const interval = setInterval(loadSavedCommunities, 30000);
    return () => clearInterval(interval);
  }, [session?.user?.email]);

  const handleNavigate = (href: string, label: string) => {
    console.log(`🧭 Navigating to ${label}:`, href);

    // Handle dashboard/login logic
    if (label === "Dashboard" && !session) {
      router.push("/auth/signin");
    } else {
      router.push(href);
    }

    // Close mobile sidebar if callback provided
    if (onClose) {
      onClose();
    }
  };

  // Handle loading a previous conversation
  const handleLoadConversation = (conversationId: string) => {
    console.log("📂 Loading conversation:", conversationId);

    // Navigate to chat with conversation ID
    router.push(`/?conversation=${conversationId}`);

    // Close mobile sidebar if callback provided
    if (onClose) {
      onClose();
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

  // Determine current active item based on pathname
  const getActiveId = () => {
    if (pathname?.startsWith("/dashboard") || pathname?.startsWith("/auth")) return "dashboard";
    if (pathname === "/" || pathname?.startsWith("/chat")) return "chat";
    if (pathname?.startsWith("/map") || pathname?.startsWith("/mls-listings")) return "map";
    if (pathname?.startsWith("/insights")) return "articles";
    if (pathname?.startsWith("/neighborhoods")) return "neighborhoods";
    return "";
  };

  const currentView = getActiveId();

  // Theme support
  const { currentTheme, toggleTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // Theme-aware colors
  const textPrimary = isLight ? "text-gray-900" : "text-white";
  const textSecondary = isLight ? "text-gray-600" : "text-neutral-400";
  const textMuted = isLight ? "text-gray-500" : "text-neutral-600";

  return (
    <motion.aside
      initial={false}
      animate={{
        width: effectivelyCollapsed ? "88px" : "280px",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative h-screen max-h-screen flex flex-col z-30 overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Background - theme-aware */}
      <div className={`absolute inset-0 border-r ${
        isLight
          ? isMobile
            ? 'bg-gradient-to-b from-white via-gray-50 to-white border-emerald-500/20'
            : 'bg-white/90 backdrop-blur-2xl border-gray-200'
          : isMobile
            ? 'bg-gradient-to-b from-black via-gray-950 to-black border-emerald-500/20'
            : 'bg-black/40 backdrop-blur-2xl border-white/10'
      }`} />

      {/* Gradient overlay for depth - theme-aware */}
      <div className={`absolute inset-0 pointer-events-none ${
        isLight
          ? isMobile
            ? 'bg-gradient-to-b from-emerald-50/50 via-transparent to-emerald-50/50'
            : 'bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50'
          : isMobile
            ? 'bg-gradient-to-b from-emerald-900/5 via-transparent to-emerald-900/10'
            : 'bg-gradient-to-br from-purple-900/10 via-transparent to-cyan-900/10'
      }`} />

      {/* Animated gradient accent on the right edge */}
      <motion.div
        className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent"
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Content - relative to float above background */}
      <div className="relative flex flex-col h-full">
        {/* Mobile Close Button - Top Right */}
        {onClose && (
          <motion.button
            onClick={onClose}
            className="md:hidden absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Close menu"
          >
            <div className="relative w-6 h-6 flex items-center justify-center">
              {/* X Lines */}
              <motion.span
                initial={{ rotate: 45, backgroundColor: "#10b981" }}
                className="absolute w-7 h-0.5 rounded-full"
                style={{
                  boxShadow: "0 0 12px rgba(16,185,129,0.8), 0 0 20px rgba(16,185,129,0.4)"
                }}
              />
              <motion.span
                initial={{ rotate: -45, backgroundColor: "#10b981" }}
                className="absolute w-7 h-0.5 rounded-full"
                style={{
                  boxShadow: "0 0 12px rgba(16,185,129,0.8), 0 0 20px rgba(16,185,129,0.4)"
                }}
              />
            </div>
          </motion.button>
        )}

        {/* Header with Logo */}
        <div className={`flex items-center justify-between p-6 md:p-4 border-b ${
          isLight ? 'border-gray-200' : 'border-white/10'
        }`}>
          <AnimatePresence mode="wait">
            {!effectivelyCollapsed ? (
              <motion.div
                key="logo-expanded"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, type: "spring" }}
                className="flex items-center justify-center flex-1"
              >
                <motion.button
                  onClick={toggleSidebar}
                  whileHover={{
                    rotateY: 15,
                    rotateX: 5,
                    scale: 1.05,
                  }}
                  transition={{ type: "spring", stiffness: 300 }}
                  style={{
                    transformStyle: "preserve-3d",
                    perspective: 1000,
                  }}
                  className="relative w-full max-w-[240px] h-28 md:h-24 rounded-xl flex items-center justify-center group cursor-pointer"
                >
                  {/* Glow effect behind logo */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-xl blur-xl"
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                      scale: [0.95, 1.05, 0.95],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  {/* Floating animation */}
                  <motion.div
                    animate={{
                      y: [0, -6, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="relative z-10 w-full h-full flex items-center justify-center"
                  >
                    <Image
                      src={isLight ? "/images/brand/obsidian-logo-black.png" : "/images/brand/logo-white-obsidian.png"}
                      alt="Obsidian Group"
                      width={240}
                      height={96}
                      className="object-contain w-full h-full drop-shadow-2xl"
                      priority
                    />
                  </motion.div>
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="logo-collapsed"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, type: "spring" }}
                className="flex items-center justify-center w-full"
              >
                <motion.button
                  onClick={toggleSidebar}
                  whileHover={{
                    scale: 1.15,
                    rotateY: 10,
                    rotateZ: 5,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 15
                  }}
                  style={{
                    transformStyle: "preserve-3d",
                  }}
                  className="relative w-12 h-12 rounded-lg flex items-center justify-center cursor-pointer"
                >
                  {/* Glow effect behind EXP logo */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-blue-500/20 rounded-lg blur-md"
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  {/* Floating animation */}
                  <motion.div
                    animate={{
                      y: [0, -4, 0],
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="relative z-10 w-full h-full"
                  >
                    <Image
                      src={isLight ? "/images/brand/exp-Realty-Logo-black.png" : "/images/brand/EXP-white-square.png"}
                      alt="eXp Realty"
                      width={48}
                      height={48}
                      className="object-contain w-full h-full drop-shadow-2xl"
                      priority
                    />
                  </motion.div>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop Collapse Toggle Arrow - floats with logo */}
          {!isMobile && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleSidebar}
              className="flex w-9 h-9 items-center justify-center transition-transform flex-shrink-0"
              aria-label={effectivelyCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              animate={{
                y: [0, -3, 0],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <motion.div
                initial={false}
                animate={{ rotate: effectivelyCollapsed ? 0 : 180 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="relative"
              >
                {/* Glow effect background */}
                <div className={`absolute inset-0 blur-md rounded-full ${
                  isLight ? 'bg-blue-500/40' : 'bg-emerald-400/40'
                }`} />
                <ChevronRight
                  className={`w-5 h-5 relative z-10 ${
                    isLight ? 'text-blue-500' : 'text-emerald-400'
                  }`}
                  strokeWidth={2.5}
                  style={{
                    filter: isLight
                      ? "drop-shadow(0 0 6px rgba(59,130,246,0.8))"
                      : "drop-shadow(0 0 6px rgba(16,185,129,0.8))"
                  }}
                />
              </motion.div>
            </motion.button>
          )}
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-2 min-h-0 custom-scrollbar">
          {navigationItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const isHovered = hoveredItem === item.id;
            const displayLabel = item.id === "dashboard" && !session ? "Login/Sign-up" : item.label;

            // Hide Dashboard and Articles on mobile to make room for chat history
            const hiddenOnMobile = item.id === "dashboard" || item.id === "articles";

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={hiddenOnMobile ? "hidden md:block" : ""}
              >
                <motion.button
                  onClick={() => handleNavigate(item.href, item.label)}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  whileHover={{
                    x: effectivelyCollapsed ? 0 : 4,
                    scale: 1.02,
                  }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative w-full flex items-center ${effectivelyCollapsed ? 'justify-center' : 'gap-3'} ${effectivelyCollapsed ? 'p-3' : 'px-4 py-3'} rounded-xl text-base md:text-sm transition-all overflow-hidden group ${
                    isActive
                      ? isLight
                        ? 'text-white font-semibold shadow-lg'
                        : `${textPrimary} shadow-lg`
                      : `${textSecondary} hover:${textPrimary}`
                  }`}
                  style={{
                    transformStyle: "preserve-3d",
                  }}
                >
                  {/* Background with glass-morphism */}
                  <motion.div
                    className={`absolute inset-0 rounded-xl transition-all ${
                      isActive
                        ? isLight
                          ? "bg-blue-500 border border-blue-600 shadow-lg shadow-blue-500/30"
                          : "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30"
                        : isLight
                          ? "bg-white/40 backdrop-blur-sm border border-gray-200 group-hover:bg-white/60 group-hover:border-blue-200"
                          : "bg-black/20 backdrop-blur-sm border border-white/5 group-hover:bg-black/40 group-hover:border-white/10"
                    }`}
                    animate={isActive ? {
                      boxShadow: isLight
                        ? [
                            "0 0 20px rgba(59, 130, 246, 0.3)",
                            "0 0 40px rgba(59, 130, 246, 0.4)",
                            "0 0 20px rgba(59, 130, 246, 0.3)",
                          ]
                        : [
                            "0 0 20px rgba(16, 185, 129, 0.2)",
                            "0 0 40px rgba(6, 182, 212, 0.3)",
                            "0 0 20px rgba(16, 185, 129, 0.2)",
                          ],
                    } : {}}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />

                  {/* Hover glow effect */}
                  <AnimatePresence>
                    {isHovered && !isActive && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`absolute inset-0 rounded-xl blur-sm ${
                          isLight
                            ? "bg-blue-100/60"
                            : "bg-gradient-to-r from-purple-500/10 to-pink-500/10"
                        }`}
                      />
                    )}
                  </AnimatePresence>

                  {/* Icon with 3D effect */}
                  <motion.div
                    animate={isActive ? {
                      rotateY: [0, 5, 0, -5, 0],
                      rotateX: [0, 2, 0, -2, 0],
                    } : {}}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    style={{ transformStyle: "preserve-3d" }}
                    className="relative z-10"
                  >
                    <Icon
                      className={`${effectivelyCollapsed ? 'w-6 h-6' : 'w-6 h-6 md:w-5 md:h-5'} flex-shrink-0 transition-colors ${
                        isActive
                          ? isLight
                            ? "text-white"
                            : "text-emerald-400"
                          : ""
                      }`}
                      strokeWidth={2.5}
                    />
                  </motion.div>

                  {/* Label */}
                  <AnimatePresence mode="wait">
                    {!effectivelyCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="relative z-10 flex-1 text-left font-medium"
                      >
                        {displayLabel}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Active indicator */}
                  {isActive && !effectivelyCollapsed && (
                    <motion.div
                      layoutId="activeIndicator"
                      className={`absolute right-2 w-1.5 h-8 rounded-full ${
                        isLight
                          ? "bg-blue-600"
                          : "bg-gradient-to-b from-emerald-400 to-cyan-400"
                      }`}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.button>
              </motion.div>
            );
          })}

          {/* Conversation History Section */}

          <AnimatePresence mode="wait">
            {!effectivelyCollapsed && conversationHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pt-4 pb-2 px-3"
              >
                {/* History Header - Collapsible */}
                <div className={`w-full flex items-center justify-between mb-2 px-2 py-1.5 rounded-lg transition-colors group ${
                  isLight ? "hover:bg-gray-100" : "hover:bg-black/20"
                }`}>
                  <button
                    onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                    className="flex items-center gap-2 flex-1"
                  >
                    <Clock className={`w-3.5 h-3.5 ${isLight ? 'text-gray-500' : 'text-neutral-500'}`} />
                    <h3 className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-gray-600' : 'text-neutral-500'}`}>History</h3>
                    <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-neutral-600'}`}>({conversationHistory.length})</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleClearAllHistory}
                      className="p-1 rounded hover:bg-red-500/10 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      title="Clear all history"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                      className="p-1"
                    >
                      {isHistoryCollapsed ? (
                        <ChevronDown className={`w-3.5 h-3.5 ${isLight ? 'text-gray-500' : 'text-neutral-500'}`} />
                      ) : (
                        <ChevronUp className={`w-3.5 h-3.5 ${isLight ? 'text-gray-500' : 'text-neutral-500'}`} />
                      )}
                    </button>
                  </div>
                </div>

                {/* History List - Collapsible */}
                <AnimatePresence>
                  {!isHistoryCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-0 max-h-[60vh] md:max-h-[30vh] overflow-y-auto custom-scrollbar">
                        {conversationHistory.map((conversation, index) => (
                          <div key={conversation.id}>
                            {index > 0 && (
                              <hr className={`border-t my-1 ${isLight ? 'border-gray-200' : 'border-white/5'}`} />
                            )}
                            <div className={`group relative py-2 px-2 rounded-lg transition-colors ${
                              isLight ? 'hover:bg-gray-100' : 'hover:bg-black/20'
                            }`}>
                              <button
                                onClick={() => handleLoadConversation(conversation.id)}
                                className="w-full flex items-start gap-2 text-left"
                              >
                                <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${
                                  isLight ? 'text-emerald-600/60' : 'text-emerald-500/40'
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs ${textSecondary} truncate leading-relaxed`}>{conversation.title}</p>
                                  <p className={`text-[10px] ${textMuted} mt-0.5`}>
                                    {conversation.messageCount} msgs • {new Date(conversation.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </p>
                                </div>
                              </button>
                              {/* Delete button - shown on hover */}
                              <button
                                onClick={(e) => handleDeleteConversation(conversation.id, e)}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded border opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400 transition-all ${
                                  isLight
                                    ? 'bg-white border-gray-300'
                                    : 'bg-black/60 border-white/10'
                                }`}
                                title="Delete conversation"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Saved Communities Section */}
          <AnimatePresence mode="wait">
            {!effectivelyCollapsed && savedCommunities.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pt-4 pb-2 px-3"
              >
                {/* Communities Header - Collapsible */}
                <div className={`w-full flex items-center justify-between mb-2 px-2 py-1.5 rounded-lg transition-colors group ${
                  isLight ? "hover:bg-gray-100" : "hover:bg-black/20"
                }`}>
                  <button
                    onClick={() => setIsCommunitiesCollapsed(!isCommunitiesCollapsed)}
                    className="flex items-center gap-2 flex-1"
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isLight ? 'text-gray-500' : 'text-neutral-500'}`} />
                    <h3 className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-gray-600' : 'text-neutral-500'}`}>Communities</h3>
                    <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-neutral-600'}`}>({savedCommunities.length})</span>
                  </button>
                  <button
                    onClick={() => setIsCommunitiesCollapsed(!isCommunitiesCollapsed)}
                    className="p-1"
                  >
                    {isCommunitiesCollapsed ? (
                      <ChevronDown className={`w-3.5 h-3.5 ${isLight ? 'text-gray-500' : 'text-neutral-500'}`} />
                    ) : (
                      <ChevronUp className={`w-3.5 h-3.5 ${isLight ? 'text-gray-500' : 'text-neutral-500'}`} />
                    )}
                  </button>
                </div>

                {/* Communities List - Collapsible */}
                <AnimatePresence>
                  {!isCommunitiesCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-0 max-h-[40vh] md:max-h-[20vh] overflow-y-auto custom-scrollbar">
                        {savedCommunities.map((community, index) => (
                          <div key={community.id}>
                            {index > 0 && (
                              <hr className={`border-t my-1 ${isLight ? 'border-gray-200' : 'border-white/5'}`} />
                            )}
                            <div className={`group relative py-2 px-2 rounded-lg transition-colors ${
                              isLight ? 'hover:bg-gray-100' : 'hover:bg-black/20'
                            }`}>
                              <button
                                onClick={() => {
                                  const url = community.type === 'city'
                                    ? `/neighborhoods/${community.id}`
                                    : `/neighborhoods/${community.cityId}/${community.id}`;
                                  router.push(url);
                                  if (onClose) onClose();
                                }}
                                className="w-full flex items-start gap-2 text-left"
                              >
                                {community.type === 'city' ? (
                                  <MapPin className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${
                                    isLight ? 'text-emerald-600/60' : 'text-emerald-500/40'
                                  }`} />
                                ) : (
                                  <Home className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${
                                    isLight ? 'text-blue-600/60' : 'text-blue-500/40'
                                  }`} />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs ${textSecondary} truncate leading-relaxed`}>{community.name}</p>
                                  <p className={`text-[10px] ${textMuted} mt-0.5`}>
                                    {community.type === 'city' ? 'City' : 'Subdivision'}
                                  </p>
                                </div>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* Theme Toggle Button */}
        <AnimatePresence>
          {!effectivelyCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              className={`px-4 py-3 border-t ${
                isLight ? 'border-gray-200' : 'border-white/10'
              }`}
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleTheme}
                className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isLight
                    ? 'bg-gray-200/80 hover:bg-gray-300/80 text-gray-900'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <AnimatePresence mode="wait">
                  {isLight ? (
                    <motion.div
                      key="moon"
                      initial={{ rotate: -180, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 180, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Moon className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="sun"
                      initial={{ rotate: 180, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -180, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Sun className="w-5 h-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <span className="font-medium text-sm">
                  {isLight ? 'Dark Mode' : 'Light Mode'}
                </span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <AnimatePresence>
          {!effectivelyCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className={`relative p-4 pb-20 md:pb-3 md:p-3 border-t ${
                isLight ? 'border-gray-200' : 'border-white/10'
              }`}
            >
              {/* Glass panel background */}
              <div className={`absolute inset-0 backdrop-blur-md ${
                isLight ? 'bg-white/50' : 'bg-black/20'
              }`} />

              {/* Sparkle decoration */}
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute top-2 right-2 text-emerald-400/30"
              >
                <Sparkles className="w-4 h-4" />
              </motion.div>

              <div className={`relative text-xs ${textSecondary} text-center leading-relaxed`}>
                <motion.p
                  className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400"
                  animate={{
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    backgroundSize: "200% 200%",
                  }}
                >
                  Joseph Sardella
                </motion.p>
                <p className={`mt-0.5 ${textMuted}`}>eXp Realty | Obsidian Group</p>
                <p className={`mt-0.5 ${textMuted}`}>DRE# 02106916</p>
                <motion.p
                  className={`mt-2 ${textMuted}`}
                  animate={{
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  © {new Date().getFullYear()}
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add subtle scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.5);
        }
      `}</style>
    </motion.aside>
  );
}
