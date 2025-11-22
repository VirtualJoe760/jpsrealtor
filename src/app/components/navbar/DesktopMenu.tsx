"use client";

import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { User, Settings, LogOut, ChevronDown, BarChart3 } from "lucide-react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

const navigation = [
  { name: "About", href: "/about" },
  { name: 'Insights', href: '/insights' },
  { name: "Listings", href: "/mls-listings" },
  { name: "Neighborhoods", href: "/neighborhoods" },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function DesktopMenu() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { currentTheme, textPrimary } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  // Check if user is admin
  useEffect(() => {
    if (session?.user?.email) {
      fetch("/api/user/check-admin")
        .then((res) => res.json())
        .then((data) => setIsAdmin(data.isAdmin))
        .catch(() => setIsAdmin(false));
    }
  }, [session]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

  return (
    <div className="hidden sm:ml-6 sm:block">
      <div className="flex space-x-4 items-center">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <a
              key={item.name}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={classNames(
                isActive
                  ? isLight ? "bg-emerald-100 text-emerald-900" : "bg-neutral-light text-neutral-dark"
                  : isLight ? "text-gray-700 hover:text-emerald-600" : "text-white hover:text-gray-300",
                "rounded-md px-3 py-2 text-sm font-medium"
              )}
            >
              {item.name}
            </a>
          );
        })}

        {/* Auth section */}
        {status === "loading" ? (
          <div className={`px-3 py-2 text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>...</div>
        ) : session ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isLight
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-white text-black hover:bg-gray-200"
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                isLight
                  ? "bg-emerald-700 text-white"
                  : "bg-gradient-to-br from-gray-700 to-gray-900 text-white"
              }`}>
                {session.user.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <span>{session.user.name || 'Profile'}</span>
              <ChevronDown className={classNames(
                "w-4 h-4 transition-transform",
                isDropdownOpen ? "rotate-180" : ""
              )} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-1 z-50 border ${
                isLight
                  ? "bg-white border-gray-200"
                  : "bg-gray-900 border-gray-700"
              }`}>
                <Link
                  href="/dashboard"
                  onClick={() => setIsDropdownOpen(false)}
                  className={`flex items-center px-4 py-2 text-sm transition-colors ${
                    isLight
                      ? "text-gray-700 hover:bg-gray-100"
                      : "text-gray-200 hover:bg-gray-800"
                  }`}
                >
                  <User className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setIsDropdownOpen(false)}
                    className={`flex items-center px-4 py-2 text-sm transition-colors ${
                      isLight
                        ? "text-blue-600 hover:bg-blue-50"
                        : "text-blue-400 hover:bg-gray-800"
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Admin Dashboard
                  </Link>
                )}
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsDropdownOpen(false)}
                  className={`flex items-center px-4 py-2 text-sm transition-colors ${
                    isLight
                      ? "text-gray-700 hover:bg-gray-100"
                      : "text-gray-200 hover:bg-gray-800"
                  }`}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
                <hr className={`my-1 ${isLight ? 'border-gray-200' : 'border-gray-700'}`} />
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    signOut({ callbackUrl: '/' });
                  }}
                  className={`flex items-center w-full px-4 py-2 text-sm transition-colors ${
                    isLight
                      ? "text-red-600 hover:bg-gray-100"
                      : "text-red-400 hover:bg-gray-800"
                  }`}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/auth/signin"
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              isLight
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-white text-black hover:bg-gray-200"
            }`}
          >
            Login
          </Link>
        )}
      </div>
    </div>
  );
}
