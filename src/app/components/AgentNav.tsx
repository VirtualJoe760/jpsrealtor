"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileCheck, Briefcase, FileText, Phone, Megaphone } from "lucide-react";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";
import { useSession } from "next-auth/react";

export default function AgentNav() {
  const pathname = usePathname();
  const { currentTheme } = useTheme();
  const { textSecondary, border } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";
  const { data: session } = useSession();

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
      href: "/agent/crm",
      label: "CRM",
      icon: Phone,
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
      href: "/agent/clients",
      label: "Clients",
      icon: Briefcase,
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
    <nav className="pt-6 mb-8">
      <div className={`flex items-center gap-2 border-b ${border}`}>
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
    </nav>
  );
}
