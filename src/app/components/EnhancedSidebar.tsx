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
  Sparkles,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useSidebar } from "./SidebarContext";
import Image from "next/image";
import { useState } from "react";

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
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

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
      className="relative h-screen max-h-screen flex flex-col z-30 overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Glass-morphism background with stars visible behind */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-2xl border-r border-white/10" />

      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-cyan-900/10 pointer-events-none" />

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
            whileHover={{ scale: 1.05, rotate: 90 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="md:hidden absolute top-4 right-4 z-50 w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-black/80 transition-colors shadow-lg"
          >
            <X className="w-5 h-5 text-emerald-400" strokeWidth={2.5} />
          </motion.button>
        )}

        {/* Header with Logo */}
        <div className="flex items-center justify-between p-6 md:p-4 border-b border-white/10">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                key="logo"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, type: "spring" }}
                className="flex items-center justify-center flex-1"
              >
                <motion.div
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
                  className="relative w-full max-w-[240px] h-28 md:h-24 rounded-xl flex items-center justify-center group"
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
                  <Image
                    src="/images/brand/logo-white-obsidian.png"
                    alt="Obsidian Group"
                    width={240}
                    height={96}
                    className="object-contain w-full h-full relative z-10 drop-shadow-2xl"
                    priority
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop Collapse Toggle */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleSidebar}
            className="hidden md:flex w-8 h-8 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 items-center justify-center hover:bg-black/80 transition-colors shadow-lg"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-neutral-300" strokeWidth={2.5} />
            ) : (
              <ChevronLeft className="w-4 h-4 text-neutral-300" strokeWidth={2.5} />
            )}
          </motion.button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-2 min-h-0 custom-scrollbar">
          {navigationItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const isHovered = hoveredItem === item.id;
            const displayLabel = item.id === "dashboard" && !session ? "Login/Sign-up" : item.label;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <motion.button
                  onClick={() => handleNavigate(item.href, item.label)}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  whileHover={{
                    x: isCollapsed ? 0 : 4,
                    scale: 1.02,
                  }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} ${isCollapsed ? 'p-3' : 'px-4 py-3'} rounded-xl text-base md:text-sm transition-all overflow-hidden group ${
                    isActive
                      ? "text-white shadow-lg"
                      : "text-neutral-400 hover:text-white"
                  }`}
                  style={{
                    transformStyle: "preserve-3d",
                  }}
                >
                  {/* Background with glass-morphism */}
                  <motion.div
                    className={`absolute inset-0 rounded-xl transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30"
                        : "bg-black/20 backdrop-blur-sm border border-white/5 group-hover:bg-black/40 group-hover:border-white/10"
                    }`}
                    animate={isActive ? {
                      boxShadow: [
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
                        className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl blur-sm"
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
                      className={`${isCollapsed ? 'w-6 h-6' : 'w-6 h-6 md:w-5 md:h-5'} flex-shrink-0 transition-colors ${
                        isActive ? "text-emerald-400" : ""
                      }`}
                      strokeWidth={2.5}
                    />
                  </motion.div>

                  {/* Label */}
                  <AnimatePresence mode="wait">
                    {!isCollapsed && (
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
                  {isActive && !isCollapsed && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute right-2 w-1.5 h-8 bg-gradient-to-b from-emerald-400 to-cyan-400 rounded-full"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.button>
              </motion.div>
            );
          })}
        </nav>

        {/* Footer */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="relative p-4 md:p-3 border-t border-white/10"
            >
              {/* Glass panel background */}
              <div className="absolute inset-0 bg-black/20 backdrop-blur-md" />

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

              <div className="relative text-xs text-neutral-400 text-center leading-relaxed">
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
                <p className="mt-0.5 text-neutral-500">eXp Realty | Obsidian Group</p>
                <p className="mt-0.5 text-neutral-600">DRE# 02106916</p>
                <motion.p
                  className="mt-2 text-neutral-700"
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
