"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";
import Link from "next/link";
import { useState } from "react";
import {
  LayoutDashboard,
  UserCheck,
  Handshake,
  Users,
  CreditCard,
  Mail,
  Globe,
  UserCog,
  Contact,
  FileText,
  Home,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";

const sidebarItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/agent-applications", label: "Agent Applications", icon: UserCheck },
  { href: "/admin/partner-applications", label: "Partner Applications", icon: Handshake },
  { href: "/admin/partnerships", label: "Partnerships", icon: Users },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/campaigns", label: "Campaigns", icon: Mail },
  { href: "/admin/domains", label: "Domains", icon: Globe },
  { href: "/admin/users", label: "Users", icon: UserCog },
  { href: "/admin/crm", label: "CRM", icon: Contact },
  { href: "/admin/content", label: "Content", icon: FileText },
  { href: "/admin/homepage-builder", label: "Homepage Builder", icon: Home },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentTheme } = useTheme();
  const { textPrimary, textSecondary, border, cardBg } = useThemeClasses();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLight = currentTheme === "lightgradient";

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const activeBg = isLight ? "bg-blue-50" : "bg-white/10";
  const activeText = isLight ? "text-blue-700 font-semibold" : "text-white font-semibold";
  const hoverBg = isLight ? "hover:bg-gray-100" : "hover:bg-white/5";
  const sidebarBg = isLight ? "bg-white" : "bg-gray-900";
  const headerBg = isLight ? "bg-white/80 backdrop-blur" : "bg-gray-900/80 backdrop-blur";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-60 ${sidebarBg} ${border} border-r
          flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Sidebar header */}
        <div className={`flex items-center justify-between px-4 py-4 border-b ${border}`}>
          <h2 className={`text-lg font-bold ${textPrimary}`}>Admin</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className={`md:hidden p-1 rounded ${textSecondary} ${hoverBg}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5
                  text-sm transition-colors
                  ${active ? `${activeBg} ${activeText}` : `${textSecondary} ${hoverBg}`}
                `}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Back to site */}
        <div className={`px-4 py-3 border-t ${border}`}>
          <Link
            href="/dashboard"
            className={`flex items-center gap-2 text-sm ${textSecondary} ${hoverBg} px-2 py-1.5 rounded`}
          >
            <ChevronLeft size={16} />
            Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className={`flex items-center justify-between px-4 md:px-6 py-3 border-b ${border} ${headerBg}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`md:hidden p-2 rounded ${textSecondary} ${hoverBg}`}
            >
              <Menu size={20} />
            </button>
            <h1 className={`text-lg font-semibold ${textPrimary}`}>Admin Dashboard</h1>
          </div>
          <div className={`text-sm ${textSecondary}`}>
            {session?.user?.email}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
