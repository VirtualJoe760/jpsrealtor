"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, MessageSquare, Map, Lightbulb, User, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { useMapControl } from "@/app/hooks/useMapControl";
import { usePWA } from "@/app/contexts/PWAContext";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { isMapVisible, showMapAtLocation, hideMap } = useMapControl();
  const { currentTheme, bgPrimary, border, textSecondary } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";
  // Use centralized PWA context (no duplicate detection!)
  const { isStandalone, isIOS } = usePWA();

  const isHomePage = pathname === "/";

  // Handle Chat/Map button click
  const handleChatMapClick = () => {
    if (isHomePage) {
      // On homepage, toggle map visibility
      if (isMapVisible) {
        hideMap();
      } else {
        // Show map centered on California (entire state view)
        showMapAtLocation(37.0, -119.5, 5);
      }
    } else {
      // On other pages, navigate to homepage (returns to last state)
      router.push("/");
    }
  };

  const navItems = [
    {
      name: isMapVisible ? "Map" : "Chat",
      icon: isMapVisible ? Map : MessageSquare,
      onClick: handleChatMapClick,
      active: pathname === "/",
    },
    {
      name: "Insights",
      icon: Lightbulb,
      href: "/insights",
      active: pathname?.startsWith("/insights"),
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
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isChatMapButton = index === 0; // First item is Chat/Map

          return (
            <button
              key={item.name}
              onClick={item.onClick || (() => router.push(item.href!))}
              className={`flex flex-col items-center justify-center min-w-[60px] py-2 px-3 rounded-xl transition-all ${
                item.active
                  ? isLight
                    ? "text-blue-600 bg-blue-600/10"
                    : "text-emerald-500 bg-emerald-500/10"
                  : isLight
                    ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
              }`}
              data-tour={isChatMapButton ? "mobile-map-button" : undefined}
            >
              <div className="relative w-8 h-8 mb-1 flex items-center justify-center">
                {/* Layered icons for Chat/Map button */}
                {isChatMapButton ? (
                  <>
                    {/* Shadow outline - alternate mode hint (static for performance) */}
                    <div
                      className="absolute inset-0 flex items-center justify-center opacity-30"
                    >
                      {isMapVisible ? (
                        <MessageSquare className={`w-7 h-7 ${
                          isLight ? "text-blue-300" : "text-emerald-700"
                        }`} style={{ filter: 'blur(2px)' }} />
                      ) : (
                        <Map className={`w-7 h-7 ${
                          isLight ? "text-blue-300" : "text-emerald-700"
                        }`} style={{ filter: 'blur(2px)' }} />
                      )}
                    </div>

                    {/* Main icon (no animation for better performance) */}
                    <div className="relative z-10">
                      <Icon
                        className={`w-6 h-6 ${item.active ? "stroke-[2.5]" : "stroke-2"}`}
                      />
                    </div>

                    {/* Rotating arrows indicator (CSS animation for better performance) */}
                    <div className="absolute -bottom-1 -right-1 z-20 animate-spin-slow">
                      <RefreshCw className={`w-3 h-3 ${
                        item.active
                          ? isLight ? "text-blue-600" : "text-emerald-500"
                          : isLight ? "text-gray-400" : "text-neutral-500"
                      }`} />
                    </div>
                  </>
                ) : (
                  <Icon
                    className={`w-6 h-6 ${item.active ? "stroke-[2.5]" : "stroke-2"}`}
                  />
                )}
              </div>
              <span className="text-xs font-medium">{item.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
