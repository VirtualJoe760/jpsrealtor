"use client";

// EnhancedNavbar — a top-bar variant of EnhancedSidebar (SimpleSidebar).
// Rendered (md+ only) by ClientLayoutWrapper when the tenant's agentProfile.navLayout
// === "navbar". Mobile is unaffected (MobileBottomNav handles small screens).
// Mirrors the sidebar's nav data, branding fetch, theme toggle, quick actions,
// and chat/map actions so the two layouts stay in lockstep.

import { usePathname, useRouter } from "next/navigation";
import {
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
  Settings,
  Shield,
  LogOut,
  Map,
  Briefcase,
  Users,
  MapPin,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { signOutChain } from "@/lib/signout-chain";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useMapControl } from "../hooks/useMapControl";
import { resolveSpawnPoint } from "@/lib/map/resolve-spawn-point";
import { trackEvent } from "@/lib/meta-pixel";
import { trackClickToCall } from "@/lib/google-ads";

export default function EnhancedNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { currentTheme, toggleTheme: toggleThemeMode, themeLocked } = useTheme();
  const { isMapVisible, showMapAtLocation, hideMap } = useMapControl();
  const isLight = currentTheme === "lightgradient";
  const isChapPage = pathname === "/chap";

  const [dashboardDropdownOpen, setDashboardDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [branding, setBranding] = useState<{
    agentName?: string;
    brokerageName?: string;
    teamName?: string;
    licenseNumber?: string;
    phone?: string;
    email?: string;
  }>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  // Same domain-owner branding resolution the sidebar uses.
  useEffect(() => {
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    let subdomain: string | null = null;
    if (host.includes("chatrealty")) {
      const parts = host.split("chatrealty")[0]?.replace(/\.$/, "");
      subdomain = parts?.split(".").filter((s) => s && s !== "www").pop() || null;
    } else if (host.endsWith(".localhost")) {
      const sub = host.split(".localhost")[0];
      if (sub && sub !== "www") subdomain = sub;
    }
    const qs = subdomain ? `?subdomain=${encodeURIComponent(subdomain)}` : "";
    fetch(`/api/agent-branding${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.branding) setBranding(data.branding);
      })
      .catch(() => {});
  }, [status]);

  // Close the dashboard dropdown on outside click / Escape.
  useEffect(() => {
    if (!dashboardDropdownOpen) return;
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDashboardDropdownOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDashboardDropdownOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [dashboardDropdownOpen]);

  const handleMapToggle = () => {
    if (isChapPage) {
      if (!isMapVisible) {
        resolveSpawnPoint().then((spawn) => showMapAtLocation(spawn.lat, spawn.lng, spawn.zoom));
      }
    } else {
      router.push("/chap?view=map");
    }
  };

  const handleChatToggle = () => {
    if (isChapPage) hideMap();
    else router.push("/chap");
  };

  const menuItems: Array<{ label: string; icon: typeof Home; href?: string; action?: "chat" | "map" }> = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Chat", icon: MessageSquare, action: "chat" },
    { label: "Map", icon: Map, action: "map" },
    { label: "Neighborhoods", icon: MapPin, href: "/neighborhoods" },
  ];

  const dashboardItems = [
    { label: "Settings", icon: Settings, href: "/dashboard/settings" },
    ...((session?.user as any)?.roles?.includes("realEstateAgent") ? [{ label: "Agent", icon: Briefcase, href: "/agent/dashboard" }] : []),
    ...((session?.user as any)?.isTeamLeader ? [{ label: "Team", icon: Users, href: "/agent/create-team" }] : []),
    ...((session?.user as any)?.isAdmin ? [{ label: "Admin", icon: Shield, href: "/admin" }] : []),
  ];

  const handleNavigate = (href: string) => {
    router.push(href);
    setDashboardDropdownOpen(false);
  };

  const handleDashboardClick = () => {
    if (status === "loading") return;
    router.push(session ? "/dashboard" : "/auth/signin");
  };

  const handleSignOut = () => {
    setDashboardDropdownOpen(false);
    signOutChain();
  };

  // Same opt-out pages as the sidebar.
  if (pathname?.startsWith("/articles/preview") || pathname?.startsWith("/campaign")) return null;

  const itemBase = "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium whitespace-nowrap";
  const activeCls = isLight ? "bg-blue-100 text-blue-600" : "bg-purple-600/20 text-purple-400";
  const idleCls = isLight ? "text-gray-700 hover:bg-gray-100" : "text-neutral-300 hover:bg-neutral-800";
  const iconBtn = isLight
    ? "bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600"
    : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white";

  return (
    <header
      className={`w-full h-16 flex items-center gap-2 px-4 border-b backdrop-blur-xl ${
        isLight ? "bg-white/80 border-gray-300" : "bg-neutral-900/60 border-neutral-700/50"
      }`}
    >
      {/* Logo → home */}
      <button onClick={() => handleNavigate("/")} className="flex items-center shrink-0" aria-label="Home">
        <Image
          src={isLight ? "/images/brand/chatrealty-logo-light-1436x356.png" : "/images/brand/chatrealty-logo-dark-1436x356.png"}
          alt={branding.teamName || branding.brokerageName || "ChatRealty"}
          width={150}
          height={34}
          className="object-contain"
        />
      </button>

      {/* Primary nav. NOTE: no overflow-x here — an overflow context would clip the
          absolutely-positioned Dashboard dropdown (top-full) below the bar. */}
      <nav className="flex items-center gap-1 ml-2 min-w-0">
        {/* Dashboard dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleDashboardClick}
            className={`${itemBase} ${mounted && pathname.startsWith("/dashboard") ? activeCls : idleCls}`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>{!mounted || status === "loading" ? "Sign In" : session ? "Dashboard" : "Sign In"}</span>
            {mounted && session && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setDashboardDropdownOpen((v) => !v);
                }}
                className="p-0.5 -m-0.5"
              >
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              </span>
            )}
          </button>

          {mounted && session && dashboardDropdownOpen && (
            <div
              className={`absolute left-0 top-full mt-1 min-w-[180px] rounded-xl border shadow-lg overflow-hidden z-50 ${
                isLight ? "bg-white border-gray-200" : "bg-neutral-900 border-neutral-700"
              }`}
            >
              {dashboardItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <button
                    key={item.label}
                    onClick={() => handleNavigate(item.href)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      isActive
                        ? isLight ? "bg-blue-50 text-blue-600" : "bg-purple-600/10 text-purple-400"
                        : isLight ? "text-gray-700 hover:bg-gray-50" : "text-neutral-300 hover:bg-neutral-800/50"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
              <button
                onClick={handleSignOut}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-t ${
                  isLight ? "text-red-500 hover:bg-red-50 border-gray-100" : "text-red-400 hover:bg-red-900/20 border-neutral-800"
                }`}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Regular menu items */}
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            mounted &&
            (item.action === "map"
              ? isChapPage && isMapVisible
              : item.action === "chat"
                ? isChapPage && !isMapVisible
                : pathname === item.href);
          const onClick = () => {
            if (item.action === "map") handleMapToggle();
            else if (item.action === "chat") handleChatToggle();
            else handleNavigate(item.href!);
          };
          return (
            <button
              key={item.label}
              onClick={onClick}
              className={`${itemBase} ${isActive ? activeCls : idleCls}`}
              data-tour={item.action === "map" ? "map-mode-button" : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-2 shrink-0">
        {/* Agent branding (required agency treatment) — lg+ only for space */}
        {branding.agentName && (
          <span className={`hidden lg:block text-[11px] text-right leading-tight ${isLight ? "text-gray-500" : "text-neutral-500"}`}>
            {branding.agentName}
            {branding.licenseNumber && <> · DRE# {branding.licenseNumber}</>}
            <br />
            eXp Realty · chatRealty
          </span>
        )}

        {/* Quick actions */}
        <div className="hidden sm:flex items-center gap-2">
          <a href="/newsletter-signup" title="Newsletter" className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${iconBtn}`}>
            <Newspaper className="w-4 h-4" />
          </a>
          <a href="/book-appointment" title="Book Appointment" className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${iconBtn}`}>
            <Calendar className="w-4 h-4" />
          </a>
          {branding.phone && (
            <a
              href={`tel:${branding.phone.replace(/\D/g, "")}`}
              title={`Call ${branding.phone}`}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${iconBtn}`}
              onClick={() => { trackEvent("Contact", { contactType: "phone_click" }); trackClickToCall({ phoneNumber: branding.phone!, source: "navbar" }); }}
            >
              <Phone className="w-4 h-4" />
            </a>
          )}
          {branding.email && (
            <a href={`mailto:${branding.email}`} title={`Email ${branding.email}`} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${iconBtn}`}>
              <Mail className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Theme toggle — hidden when the tenant locks light/dark only */}
        {!themeLocked && (
          <button
            onClick={() => toggleThemeMode()}
            title={isLight ? "Dark Mode" : "Light Mode"}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${iconBtn}`}
          >
            {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        )}
      </div>
    </header>
  );
}
