"use client";

import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Map,
  MapPin,
  Lightbulb,
  LayoutDashboard,
  Sun,
  Moon,
  Newspaper,
  Calendar,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Settings,
  Shield,
  LogOut,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
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
  const [dashboardDropdownOpen, setDashboardDropdownOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const effectivelyCollapsed = isMobile ? false : isCollapsed;

  const menuItems = [
    { label: "Chat", icon: MessageSquare, href: "/" },
    { label: "Map", icon: Map, href: "/map" },
    { label: "Insights", icon: Lightbulb, href: "/insights" },
    { label: "Neighborhoods", icon: MapPin, href: "/neighborhoods" },
  ];

  const dashboardItems = [
    { label: "Settings", icon: Settings, href: "/dashboard/settings" },
    ...((session?.user as any)?.isAdmin ? [{ label: "Admin", icon: Shield, href: "/admin" }] : []),
  ];

  const handleNavigate = (href: string, label?: string) => {
    router.push(href);
    if (onClose) onClose();
    // Close dropdown after navigation
    setDashboardDropdownOpen(false);
  };

  const handleDashboardClick = () => {
    if (!session) {
      router.push("/auth/signin");
      if (onClose) onClose();
    } else {
      router.push("/dashboard");
      if (onClose) onClose();
    }
  };

  const handleDropdownToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the dashboard click from firing
    setDashboardDropdownOpen(!dashboardDropdownOpen);
  };

  const handleSignOut = async () => {
    setDashboardDropdownOpen(false);
    if (onClose) onClose();
    await signOut({ callbackUrl: "/" });
  };

  const toggleTheme = () => {
    setTheme(isLight ? "blackspace" : "lightgradient");
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: effectivelyCollapsed ? "80px" : isMobile ? "280px" : "280px" }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={`relative flex flex-col h-full max-h-screen border-r overflow-y-auto ${
        isLight
          ? "bg-white/80 border-gray-300 backdrop-blur-xl"
          : "bg-neutral-900/50 border-neutral-700/50 backdrop-blur-xl"
      }`}
      style={{ paddingBottom: isMobile ? 'env(safe-area-inset-bottom, 20px)' : undefined }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5">
        {!effectivelyCollapsed && (
          <div className="flex items-center">
            <Image
              src={isLight ? "/images/brand/obsidian-logo-black.png" : "/images/brand/logo-white-obsidian.png"}
              alt="Obsidian Group"
              width={220}
              height={50}
              className="object-contain"
            />
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
        {/* Dashboard Dropdown */}
        <div>
          <motion.button
            onClick={handleDashboardClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              pathname.startsWith("/dashboard")
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
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            {!effectivelyCollapsed && (
              <>
                <span className="text-sm font-medium flex-1 text-left">
                  {session ? "Dashboard" : "Sign In"}
                </span>
                {session && (
                  <div onClick={handleDropdownToggle} className="p-1 -m-1">
                    {dashboardDropdownOpen ? (
                      <ChevronUp className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 flex-shrink-0" />
                    )}
                  </div>
                )}
              </>
            )}
          </motion.button>

          {/* Dropdown Items */}
          {!effectivelyCollapsed && dashboardDropdownOpen && session && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-1 ml-4 space-y-1"
            >
              {dashboardItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <motion.button
                    key={item.label}
                    onClick={() => handleNavigate(item.href)}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm ${
                      isActive
                        ? isLight
                          ? "bg-blue-50 text-blue-600"
                          : "bg-purple-600/10 text-purple-400"
                        : isLight
                          ? "text-gray-600 hover:bg-gray-50"
                          : "text-neutral-400 hover:bg-neutral-800/50"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">{item.label}</span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* Regular Menu Items */}
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.label}
              onClick={() => handleNavigate(item.href)}
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
      <div className={`mt-auto ${isMobile ? 'pb-20' : ''}`}>
        {/* Theme Toggle */}
        <div className={`px-3 py-2 border-t overflow-hidden ${effectivelyCollapsed ? '' : 'mx-3'} ${isLight ? "border-gray-200" : "border-neutral-700/50"}`}>
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center rounded-lg transition-colors ${
              effectivelyCollapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'
            } ${
              isLight ? "hover:bg-gray-100 text-gray-700" : "hover:bg-neutral-800 text-neutral-300"
            }`}
          >
            {isLight ? <Moon className="w-5 h-5 flex-shrink-0" /> : <Sun className="w-5 h-5 flex-shrink-0" />}
            {!effectivelyCollapsed && (
              <span className="text-sm font-medium whitespace-nowrap">{isLight ? "Dark Mode" : "Light Mode"}</span>
            )}
          </button>
        </div>

        {/* Agent Branding - Required Agency Treatment */}
        {!effectivelyCollapsed && (
          <div className={`px-4 pt-3 pb-2 mx-3 border-t overflow-hidden ${isLight ? "border-gray-200" : "border-neutral-700/50"}`}>
            <p
              className={`text-xs text-center leading-relaxed whitespace-nowrap ${isLight ? "text-gray-500" : "text-neutral-500"}`}
              style={{ minWidth: '220px' }}
            >
              Joseph Sardella
              <span className={`mx-1.5 ${isLight ? "text-gray-300" : "text-neutral-600"}`}>|</span>
              eXp Realty
              <br />
              Obsidian Group
              <span className={`mx-1.5 ${isLight ? "text-gray-300" : "text-neutral-600"}`}>|</span>
              DRE# 02106916
            </p>
          </div>
        )}

        {/* Quick Action Icons */}
        {!effectivelyCollapsed && (
          <div className="flex justify-center gap-3 px-4 pb-4 mx-3">
            <a
              href="/newsletter-signup"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                isLight
                  ? "bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600"
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
              }`}
              title="Newsletter"
            >
              <Newspaper className="w-4 h-4" />
            </a>
            <a
              href="/book-appointment"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                isLight
                  ? "bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600"
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
              }`}
              title="Book Appointment"
            >
              <Calendar className="w-4 h-4" />
            </a>
            <a
              href="tel:760-833-6334"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                isLight
                  ? "bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-600"
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-emerald-400"
              }`}
              title="Call 760-833-6334"
            >
              <Phone className="w-4 h-4" />
            </a>
            <a
              href="mailto:josephsardella@gmail.com"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                isLight
                  ? "bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600"
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
              }`}
              title="Email josephsardella@gmail.com"
            >
              <Mail className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
