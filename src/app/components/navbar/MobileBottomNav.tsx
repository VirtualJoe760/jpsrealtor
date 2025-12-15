"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, MessageSquare, Lightbulb, User } from "lucide-react";
import { useSession } from "next-auth/react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { currentTheme, bgPrimary, border, textSecondary } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const navItems = [
    {
      name: "Chat",
      icon: MessageSquare,
      href: "/",
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
      className={`fixed left-0 right-0 bottom-0 z-50 backdrop-blur-xl border-t sm:hidden ${
        isLight
          ? "bg-white/95 border-gray-200"
          : "bg-black/95 border-neutral-800"
      }`}
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.name}
              onClick={() => router.push(item.href)}
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
              <Icon
                className={`w-6 h-6 mb-1 ${item.active ? "stroke-[2.5]" : "stroke-2"}`}
              />
              <span className="text-xs font-medium">{item.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
