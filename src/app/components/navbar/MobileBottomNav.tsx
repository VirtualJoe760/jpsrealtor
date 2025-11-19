"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, MessageSquare, Map, FileText, User } from "lucide-react";
import { useSession } from "next-auth/react";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const navItems = [
    {
      name: "Neighborhoods",
      icon: Home,
      href: "/neighborhoods",
      active: pathname?.startsWith("/neighborhoods"),
    },
    {
      name: "Chat",
      icon: MessageSquare,
      href: "/chat",
      active: pathname?.startsWith("/chat"),
    },
    {
      name: "Map",
      icon: Map,
      href: "/map",
      active: pathname?.startsWith("/map"),
    },
    {
      name: "Articles",
      icon: FileText,
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
      className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-neutral-800 sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
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
                  ? "text-emerald-400 bg-emerald-500/10"
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
