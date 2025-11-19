"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, MessageSquare, Map, FileText, Home, User, LayoutDashboard } from "lucide-react";
import { useSession } from "next-auth/react";

export default function GlobalHamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  // Don't show on chat page since it has its own sidebar
  const hiddenPaths = ["/chat"];
  const shouldHide = hiddenPaths.some(path => pathname?.startsWith(path));

  if (shouldHide) return null;

  const menuItems = [
    {
      name: "Chat",
      icon: MessageSquare,
      href: "/chat",
      active: pathname?.startsWith("/chat"),
    },
    {
      name: "Map",
      icon: Map,
      href: "/mls-listings",
      active: pathname?.startsWith("/mls-listings"),
    },
    {
      name: "Neighborhoods",
      icon: Home,
      href: "/neighborhoods",
      active: pathname?.startsWith("/neighborhoods"),
    },
    {
      name: "Articles",
      icon: FileText,
      href: "/insights",
      active: pathname?.startsWith("/insights"),
    },
    {
      name: session ? "Dashboard" : "Login",
      icon: session ? LayoutDashboard : User,
      href: session ? "/dashboard" : "/auth/signin",
      active: pathname?.startsWith("/dashboard") || pathname?.startsWith("/auth"),
    },
  ];

  const handleNavigate = (href: string) => {
    router.push(href);
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger Button - Top Left, Mobile Only */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
          onClick={() => setIsOpen(true)}
          className="md:hidden fixed top-4 left-4 z-50 w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 backdrop-blur-xl border border-emerald-500/30 flex items-center justify-center hover:from-emerald-500/30 hover:to-cyan-500/30 hover:border-emerald-500/50 active:scale-95 transition-all shadow-2xl shadow-emerald-500/20"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <Menu className="w-6 h-6 text-emerald-400" strokeWidth={2.5} />
        </motion.button>
      )}

      {/* Overlay and Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Menu Sidebar */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="md:hidden fixed left-0 top-0 h-full w-72 bg-black/95 backdrop-blur-xl border-r border-emerald-500/20 shadow-2xl z-50 flex flex-col"
              style={{ paddingTop: 'env(safe-area-inset-top)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
                <h2 className="text-xl font-bold text-white">Menu</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center hover:bg-emerald-500/20 transition-colors"
                >
                  <X className="w-5 h-5 text-emerald-400" strokeWidth={2.5} />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavigate(item.href)}
                      className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl text-base transition-all ${
                        item.active
                          ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-white border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                          : "text-neutral-400 hover:bg-emerald-500/10 hover:text-neutral-200"
                      }`}
                    >
                      <Icon className="w-6 h-6 flex-shrink-0" strokeWidth={2} />
                      <span className="flex-1 text-left font-medium">{item.name}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Footer */}
              <div className="p-4 border-t border-emerald-500/20">
                <p className="text-xs text-neutral-500 text-center">
                  JPS Realtor © {new Date().getFullYear()}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
