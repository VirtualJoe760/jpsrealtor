"use client";

import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Home,
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
  Map,
  Briefcase,
  Users,
  MapPin,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useSidebar } from "./SidebarContext";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useMapControl } from "../hooks/useMapControl";
import { resolveSpawnPoint } from "@/lib/map/resolve-spawn-point";
import { trackEvent } from "@/lib/meta-pixel";
import { trackClickToCall } from "@/lib/google-ads";

interface SidebarProps {
  onClose?: () => void;
}

export default function SimpleSidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { isCollapsed, toggleSidebar, setSidebarCollapsed } = useSidebar();
  const { currentTheme, toggleTheme: toggleThemeMode } = useTheme();
  const { isMapVisible, showMapAtLocation, hideMap } = useMapControl();
  const isLight = currentTheme === "lightgradient";
  const isChapPage = pathname === "/chap";

  const [isMobile, setIsMobile] = useState(false);
  const [dashboardDropdownOpen, setDashboardDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Agent/team branding data
  const [branding, setBranding] = useState<{
    agentName?: string;
    brokerageName?: string;
    teamName?: string;
    licenseNumber?: string;
    phone?: string;
    email?: string;
    teamLogo?: string;
    teamLogoDark?: string;
    brokerLogo?: string;
    brokerLogoDark?: string;
  }>({});

  // Prevent hydration mismatch - wait for client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug session state
  useEffect(() => {
    console.log("🔍 EnhancedSidebar Session Debug:", {
      status,
      hasSession: !!session,
      sessionData: session,
      sessionUser: session?.user,
      sessionEmail: session?.user?.email,
      dashboardDropdownOpen,
      pathname,
      timestamp: new Date().toISOString(),
    });
  }, [status, session, dashboardDropdownOpen, pathname]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch agent branding data — from subdomain agent or logged-in user
  useEffect(() => {
    // Detect subdomain to load the domain owner's branding (even if not logged in)
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    let subdomain: string | null = null;
    if (host.includes("chatrealty")) {
      const parts = host.split("chatrealty")[0]?.replace(/\.$/, "");
      subdomain = parts?.split(".").filter((s) => s && s !== "www").pop() || null;
    } else if (host.endsWith(".localhost")) {
      const sub = host.split(".localhost")[0];
      if (sub && sub !== "www") subdomain = sub;
    }

    if (subdomain) {
      // On an agent subdomain — fetch branding from public endpoint
      fetch(`/api/agent-branding?subdomain=${encodeURIComponent(subdomain)}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.branding) setBranding(data.branding);
        })
        .catch(() => {});
    } else if (status === "authenticated") {
      // On main domain — use logged-in user's profile
      fetch("/api/user/profile")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (!data?.profile) return;
          const p = data.profile;
          const ap = p.agentProfile || {};
          setBranding({
            agentName: p.name,
            brokerageName: p.brokerageName || ap.brokerageName,
            teamName: ap.teamName || p.team?.name,
            licenseNumber: p.licenseNumber || ap.licenseNumber,
            phone: ap.cellPhone || ap.officePhone || p.phone,
            email: p.email,
            teamLogo: ap.teamLogo,
            teamLogoDark: ap.teamLogoDark,
            brokerLogo: ap.brokerLogo,
            brokerLogoDark: ap.brokerLogoDark,
          });
        })
        .catch(() => {});
    }
  }, [status]);

  const effectivelyCollapsed = isMobile ? false : isCollapsed;

  const handleMapToggle = () => {
    if (isChapPage) {
      if (!isMapVisible) {
        // Resolve spawn point once — geolocation prompt or Palm Desert.
        // Off-page click goes through the URL → /chap effect runs the
        // same resolver path on mount, so we only need this branch.
        resolveSpawnPoint().then((spawn) => {
          showMapAtLocation(spawn.lat, spawn.lng, spawn.zoom);
        });
      }
      if (onClose) onClose();
    } else {
      router.push("/chap?view=map");
      if (onClose) onClose();
    }
  };

  const handleChatToggle = () => {
    if (isChapPage) {
      hideMap();
    } else {
      router.push("/chap");
    }
    if (onClose) onClose();
  };

  const menuItems = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Chat", icon: MessageSquare, action: "chat" },
    { label: "Map", icon: Map, action: "map" },
    { label: "Neighborhoods", icon: MapPin, href: "/neighborhoods" },
  ];

  const dashboardItems = [
    { label: "Settings", icon: Settings, href: "/dashboard/settings" },
    ...((session?.user as any)?.roles?.includes('realEstateAgent') ? [{ label: "Agent", icon: Briefcase, href: "/agent/dashboard" }] : []),
    ...((session?.user as any)?.isTeamLeader ? [{ label: "Team", icon: Users, href: "/agent/create-team" }] : []),
    ...((session?.user as any)?.isAdmin ? [{ label: "Admin", icon: Shield, href: "/admin" }] : []),
  ];

  const handleNavigate = (href: string, label?: string) => {
    router.push(href);
    if (onClose) onClose();
    // Close dropdown after navigation
    setDashboardDropdownOpen(false);
  };

  const handleDashboardClick = () => {
    // If session is loading, don't navigate yet
    if (status === "loading") {
      console.log("⏳ Session still loading, preventing navigation");
      return;
    }

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
    toggleThemeMode();
  };

  // Hide sidebar on preview and campaign pages
  if (pathname?.startsWith("/articles/preview") || pathname?.startsWith("/campaign")) return null;

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
              src={
                isLight
                  ? "/images/brand/chatrealty-logo-light-1436x356.png"
                  : "/images/brand/chatrealty-logo-dark-1436x356.png"
              }
              alt={branding.teamName || branding.brokerageName || "ChatRealty"}
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
              mounted && pathname.startsWith("/dashboard")
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
                  {!mounted || status === "loading" ? "Sign In" : session ? `Dashboard` : "Sign In"}
                </span>
                {mounted && session && (
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
          {!effectivelyCollapsed && dashboardDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-1 ml-4 space-y-1"
            >
              {status === "loading" ? (
                <div className={`px-4 py-2 text-sm ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
                  Loading...
                </div>
              ) : session ? (
                <>
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
                  <motion.button
                    onClick={handleSignOut}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm ${
                      isLight
                        ? "text-red-500 hover:bg-red-50"
                        : "text-red-400 hover:bg-red-900/20"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">Sign Out</span>
                  </motion.button>
                </>
              ) : (
                <div className={`px-4 py-2 text-sm ${isLight ? "text-gray-600" : "text-neutral-400"}`}>
                  Please sign in to access dashboard features
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Regular Menu Items */}
        {menuItems.map((item) => {
          const isActive = mounted && (item.action === "map"
            ? isChapPage && isMapVisible
            : item.action === "chat"
              ? isChapPage && !isMapVisible
              : pathname === item.href);
          const Icon = item.icon;

          const handleClick = () => {
            if (item.action === "map") {
              handleMapToggle();
            } else if (item.action === "chat") {
              handleChatToggle();
            } else {
              handleNavigate(item.href);
            }
          };

          return (
            <motion.button
              key={item.label}
              onClick={handleClick}
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
              data-tour={item.action === "map" ? (isMobile ? "mobile-menu-map" : "map-mode-button") : undefined}
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
        {!effectivelyCollapsed && branding.agentName && (
          <div className={`px-4 pt-3 pb-2 mx-3 border-t ${isLight ? "border-gray-200" : "border-neutral-700/50"}`}>
            <p className={`text-[11px] text-center leading-relaxed ${isLight ? "text-gray-500" : "text-neutral-500"}`}>
              {branding.agentName}
              {branding.licenseNumber && (
                <>
                  <span className={`mx-1 ${isLight ? "text-gray-300" : "text-neutral-600"}`}>|</span>
                  DRE# {branding.licenseNumber}
                </>
              )}
              <br />
              eXp Realty
              <span className={`mx-1 ${isLight ? "text-gray-300" : "text-neutral-600"}`}>|</span>
              chatRealty
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
            {branding.phone && (
              <a
                href={`tel:${branding.phone.replace(/\D/g, "")}`}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  isLight
                    ? "bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-600"
                    : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-emerald-400"
                }`}
                title={`Call ${branding.phone}`}
                onClick={() => { trackEvent("Contact", { contactType: "phone_click" }); trackClickToCall({ phoneNumber: branding.phone!, source: "sidebar" }); }}
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            {branding.email && (
              <a
                href={`mailto:${branding.email}`}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  isLight
                    ? "bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600"
                    : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
                }`}
                title={`Email ${branding.email}`}
              >
                <Mail className="w-4 h-4" />
              </a>
            )}
          </div>
        )}
      </div>
    </motion.aside>
  );
}
