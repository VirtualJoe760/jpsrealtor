"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Search, User, MessageSquare, Map, MapPin } from "lucide-react";
import { useSession } from "next-auth/react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { useMapControl } from "@/app/hooks/useMapControl";
import { usePWA } from "@/app/contexts/PWAContext";
import { useState, useRef, useCallback, useEffect } from "react";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { showMapAtLocation, hideMap } = useMapControl();
  const { currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";
  const { isStandalone, isIOS } = usePWA();

  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const didLongPress = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Hide on preview and campaign pages
  if (pathname?.startsWith("/articles/preview") || pathname?.startsWith("/campaign")) return null;

  const isSearchActive = pathname === "/chap" || pathname === "/neighborhoods";

  // Long press handlers
  const handlePointerDown = () => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setSearchMenuOpen(true);
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Short tap — go to map view
    if (!didLongPress.current) {
      setSearchMenuOpen(false);
      handleSearchOption("/chap?view=map");
    }
  };

  const handlePointerCancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const isChapPage = pathname === "/chap";

  const handleSearchOption = (path: string) => {
    setSearchMenuOpen(false);
    if (path === "/chap") {
      // Chat mode
      if (isChapPage) {
        hideMap();
      } else {
        router.push("/chap");
      }
    } else if (path === "/chap?view=map") {
      // Map mode
      if (isChapPage) {
        showMapAtLocation(37.0, -119.5, 5);
      } else {
        router.push("/chap?view=map");
      }
    } else {
      router.push(path);
    }
  };

  // Close menu on outside tap
  useEffect(() => {
    if (!searchMenuOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setSearchMenuOpen(false);
      }
    };
    // Use a slight delay so the menu option click can register first
    const id = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [searchMenuOpen]);

  const searchOptions = [
    { label: "Chat", icon: MessageSquare, path: "/chap" },
    { label: "Map", icon: Map, path: "/chap?view=map" },
    { label: "Neighborhoods", icon: MapPin, path: "/neighborhoods" },
  ];

  const navItems = [
    {
      name: "Search",
      icon: Search,
      active: isSearchActive,
      isSearch: true,
    },
    {
      name: "Home",
      icon: Home,
      href: "/",
      active: pathname === "/",
    },
    {
      name: session ? "Profile" : "Login",
      icon: User,
      href: session ? "/dashboard" : "/auth/signin",
      active: pathname?.startsWith("/dashboard") || pathname?.startsWith("/auth"),
    },
  ];

  return (
    <nav
      className={`mobile-bottom-nav fixed left-0 right-0 bottom-0 z-50 backdrop-blur-xl border-t sm:hidden ${
        isLight
          ? "bg-white/95 border-gray-200"
          : "bg-black/95 border-neutral-800"
      }`}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.isSearch) {
            return (
              <div key={item.name} className="relative" ref={menuRef}>
                {/* Search popup menu */}
                {searchMenuOpen && (
                  <div
                    className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-xl border shadow-lg overflow-hidden min-w-[180px] ${
                      isLight
                        ? "bg-white border-gray-200"
                        : "bg-neutral-900 border-neutral-700"
                    }`}
                  >
                    {searchOptions.map((option) => {
                      const OptionIcon = option.icon;
                      return (
                        <button
                          key={option.label}
                          onClick={() => handleSearchOption(option.path)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                            isLight
                              ? "text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                              : "text-neutral-200 hover:bg-neutral-800 active:bg-neutral-700"
                          }`}
                        >
                          <OptionIcon className="w-5 h-5" />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Search button */}
                <button
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`flex flex-col items-center justify-center min-w-[60px] py-2 px-3 rounded-xl transition-all select-none ${
                    item.active || searchMenuOpen
                      ? isLight
                        ? "text-blue-600 bg-blue-600/10"
                        : "text-emerald-500 bg-emerald-500/10"
                      : isLight
                        ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
                  }`}
                  data-tour="mobile-map-button"
                >
                  <div className="relative w-8 h-8 mb-1 flex items-center justify-center">
                    <Icon className={`w-6 h-6 ${item.active ? "stroke-[2.5]" : "stroke-2"}`} />
                  </div>
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              </div>
            );
          }

          return (
            <button
              key={item.name}
              onClick={() => router.push(item.href!)}
              className={`flex flex-col items-center justify-center min-w-[60px] py-2 px-3 rounded-xl transition-all ${
                item.active
                  ? isLight
                    ? "text-blue-600 bg-blue-600/10"
                    : "text-emerald-500 bg-emerald-500/10"
                  : isLight
                    ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
              }`}
            >
              <div className="relative w-8 h-8 mb-1 flex items-center justify-center">
                <Icon className={`w-6 h-6 ${item.active ? "stroke-[2.5]" : "stroke-2"}`} />
              </div>
              <span className="text-xs font-medium">{item.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
