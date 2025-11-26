"use client";

import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Map,
  MapPin,
  FileText,
  LayoutDashboard,
  Sun,
  Moon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useSidebar } from "./SidebarContext";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";

interface SidebarProps {
  onClose?: () => void;
}

export default function SimpleSidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { isCollapsed, toggleSidebar, setSidebarCollapsed } = useSidebar();
  const { currentTheme, setTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const effectivelyCollapsed = isMobile ? false : isCollapsed;

  const menuItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Chat", icon: MessageSquare, href: "/" },
    { label: "Map", icon: Map, href: "/map" },
    { label: "Articles", icon: FileText, href: "/insights" },
    { label: "Neighborhoods", icon: MapPin, href: "/neighborhoods" },
  ];

  const handleNavigate = (href: string, label: string) => {
    if (label === "Dashboard" && !session) {
      router.push("/auth/signin");
    } else {
      router.push(href);
    }
    if (onClose) onClose();
  };

  const toggleTheme = () => {
    setTheme(isLight ? "blackspace" : "lightgradient");
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: effectivelyCollapsed ? "80px" : isMobile ? "280px" : "280px" }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={`relative flex flex-col h-screen border-r ${
        isLight
          ? "bg-white/80 border-gray-300 backdrop-blur-xl"
          : "bg-neutral-900/50 border-neutral-700/50 backdrop-blur-xl"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        {!effectivelyCollapsed && (
          <div className="flex items-center gap-3">
            <Image
              src={isLight ? "/images/brand/exp-Realty-Logo-black.png" : "/images/brand/EXP-white-square.png"}
              alt="eXp Realty"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className={`font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
              JPSREALTOR
            </span>
          </div>
        )}
        {!isMobile && (
          <button
            onClick={() => toggleSidebar()}
            className={`p-2 rounded-lg transition-colors ${
              isLight ? "hover:bg-gray-100" : "hover:bg-neutral-800"
            }`}
          >
            {isCollapsed ? (
              <ChevronRight className={`w-5 h-5 ${isLight ? "text-gray-600" : "text-neutral-400"}`} />
            ) : (
              <ChevronLeft className={`w-5 h-5 ${isLight ? "text-gray-600" : "text-neutral-400"}`} />
            )}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.label}
              onClick={() => handleNavigate(item.href, item.label)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? isLight
                    ? "bg-blue-100 text-blue-600"
                    : "bg-purple-600/20 text-purple-400"
                  : isLight
                    ? "text-gray-700 hover:bg-gray-100"
                    : "text-neutral-300 hover:bg-neutral-800"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!effectivelyCollapsed && <span className="text-sm font-medium">{item.label}</span>}
            </motion.button>
          );
        })}
      </nav>

      {/* Footer - extra padding on mobile for safe area */}
      <div className={`p-4 border-t border-gray-200 dark:border-neutral-700 ${isMobile ? 'pb-24' : ''}`}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            isLight ? "hover:bg-gray-100 text-gray-700" : "hover:bg-neutral-800 text-neutral-300"
          }`}
        >
          {isLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          {!effectivelyCollapsed && (
            <span className="text-sm font-medium">{isLight ? "Dark Mode" : "Light Mode"}</span>
          )}
        </button>

        {/* User Profile */}
        {session?.user && !effectivelyCollapsed && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-neutral-700">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isLight ? "bg-blue-100 text-blue-600" : "bg-purple-600/20 text-purple-400"
              }`}>
                {session.user.name?.[0] || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isLight ? "text-gray-900" : "text-white"}`}>
                  {session.user.name}
                </p>
                <p className={`text-xs truncate ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
                  {session.user.email}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
