"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Map,
  FileText,
  LayoutDashboard,
  Home,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useSidebar } from "./SidebarContext";

interface SidebarProps {
  onClose?: () => void; // Optional prop to close sidebar on mobile
}

const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { id: "chat", label: "Chat", icon: MessageSquare, href: "/chat" },
  { id: "map", label: "Map", icon: Map, href: "/map" },
  { id: "articles", label: "Articles", icon: FileText, href: "/insights" },
  { id: "neighborhoods", label: "Neighborhoods", icon: Home, href: "/neighborhoods" },
];

export default function EnhancedSidebar({ onClose }: SidebarProps) {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

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

  // Determine current active item based on pathname
  const getActiveId = () => {
    if (pathname?.startsWith("/dashboard") || pathname?.startsWith("/auth")) return "dashboard";
    if (pathname?.startsWith("/chat")) return "chat";
    if (pathname?.startsWith("/map") || pathname?.startsWith("/mls-listings")) return "map";
    if (pathname?.startsWith("/insights")) return "articles";
    if (pathname?.startsWith("/neighborhoods")) return "neighborhoods";
    return "";
  };

  const currentView = getActiveId();

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isCollapsed ? "80px" : "280px",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative h-screen max-h-screen bg-black/95 md:bg-neutral-900/95 backdrop-blur-xl border-r border-emerald-500/20 md:border-neutral-800/50 flex flex-col z-30 overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Mobile Close Button - Top Right */}
      {onClose && (
        <button
          onClick={onClose}
          className="md:hidden absolute top-4 right-4 z-50 w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center hover:bg-emerald-500/20 transition-colors"
        >
          <X className="w-5 h-5 text-emerald-400" strokeWidth={2.5} />
        </button>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-6 md:p-4 border-b border-emerald-500/20 md:border-neutral-800/50">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              key="logo"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-cyan-500 md:from-purple-500 md:to-pink-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">JP</span>
              </div>
              <div>
                <h2 className="text-base md:text-sm font-bold text-white">JPS Realtor</h2>
                <p className="text-xs text-neutral-400 md:text-neutral-500">Navigation</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex w-8 h-8 rounded-lg bg-neutral-800/50 border border-neutral-700 items-center justify-center hover:bg-neutral-700 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-neutral-400" />
          )}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-1 min-h-0">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const displayLabel = item.id === "dashboard" && !session ? "Login/Sign-up" : item.label;

          return (
            <div key={item.id}>
              <motion.button
                onClick={() => handleNavigate(item.href, item.label)}
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
              </motion.button>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="p-4 md:p-3 border-t border-emerald-500/20 md:border-neutral-800/50"
        >
          <div className="text-xs text-neutral-500 text-center">
            <p className="font-medium">JPS Realtor</p>
            <p className="mt-1">© {new Date().getFullYear()}</p>
          </div>
        </motion.div>
      )}
    </motion.aside>
  );
}
