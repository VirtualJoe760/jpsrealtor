"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Users, FileCheck, FileText, Phone, Megaphone, MessageSquare, Menu, X, Mail, UserCircle } from "lucide-react";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";
import { useSession } from "next-auth/react";

export default function AgentNav() {
  const pathname = usePathname();
  const { currentTheme } = useTheme();
  const { textSecondary, textPrimary, border, cardBg } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const user = session?.user as any;
  const isTeamLeader = user?.isTeamLeader;

  const navItems = [
    {
      href: "/agent/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      exact: true,
      show: true,
    },
    {
      href: "/agent/contacts",
      label: "Contacts",
      icon: UserCircle,
      exact: false,
      show: true,
    },
    {
      href: "/agent/email",
      label: "Email",
      icon: Mail,
      exact: false,
      show: true,
    },
    {
      href: "/agent/messages",
      label: "Messages",
      icon: MessageSquare,
      exact: false,
      show: true,
    },
    {
      href: "/agent/campaigns",
      label: "Campaigns",
      icon: Megaphone,
      exact: false,
      show: true,
    },
    {
      href: "/agent/cms",
      label: "CMS",
      icon: FileText,
      exact: false,
      show: true,
    },
    {
      href: "/agent/applications",
      label: "Applications",
      icon: FileCheck,
      exact: false,
      show: isTeamLeader, // Only show for team leaders
    },
    {
      href: "/agent/team",
      label: "Team",
      icon: Users,
      exact: false,
      show: isTeamLeader, // Only show for team leaders
    },
  ];

  const isActive = (href: string, exact: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="pt-4 sm:pt-6 mb-6 sm:mb-8">
      {/* Mobile hamburger button */}
      <div className="md:hidden flex justify-end mb-4">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`p-2 rounded-lg transition-colors ${
            isLight
              ? "hover:bg-gray-100 text-gray-700"
              : "hover:bg-gray-800 text-gray-300"
          }`}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="w-7 h-7" />
          ) : (
            <Menu className="w-7 h-7" />
          )}
        </button>
      </div>

      {/* Desktop navigation - horizontal tabs */}
      <div className={`hidden md:flex items-center gap-2 border-b ${border}`}>
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
                  active
                    ? isLight
                      ? "border-blue-600 text-blue-600 font-semibold"
                      : "border-emerald-500 text-emerald-400 font-semibold"
                    : `border-transparent ${textSecondary} ${
                        isLight ? "hover:text-gray-900 hover:border-gray-300" : "hover:text-white hover:border-gray-700"
                      }`
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
      </div>

      {/* Mobile navigation - overlay menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`md:hidden fixed top-0 right-0 bottom-0 w-64 ${cardBg} shadow-2xl z-50 overflow-y-auto`}
            >
              {/* Menu Header with Close Button */}
              <div className={`flex items-center justify-between p-4 border-b ${border}`}>
                <h3 className={`text-lg font-semibold ${textPrimary}`}>Menu</h3>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    isLight ? "hover:bg-gray-100" : "hover:bg-gray-800"
                  }`}
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="pt-2">
                {navItems
                  .filter((item) => item.show)
                  .map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href, item.exact);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 border-b ${border} last:border-b-0 transition-colors ${
                          active
                            ? isLight
                              ? "bg-blue-50 text-blue-600 font-semibold"
                              : "bg-emerald-900/30 text-emerald-400 font-semibold"
                            : `${textSecondary} ${
                                isLight ? "hover:bg-gray-50" : "hover:bg-gray-800/50"
                              }`
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
