"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, Phone } from "lucide-react";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";

export default function AdminNav() {
  const pathname = usePathname();
  const { currentTheme } = useTheme();
  const { textSecondary, border } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const navItems = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: BarChart3,
      exact: true,
    },
    {
      href: "/admin/cms",
      label: "CMS",
      icon: FileText,
      exact: false,
    },
    {
      href: "/admin/crm",
      label: "CRM",
      icon: Phone,
      exact: false,
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
        {navItems.map((item) => {
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
