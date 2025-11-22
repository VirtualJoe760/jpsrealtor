"use client";

import { DisclosureButton } from "@headlessui/react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { X, User, Settings, LogOut, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

const navigation = [
  { name: "About", href: "/about" },
  { name: "Insights", href: "/insights" },
  { name: "Listings", href: "/mls-listings" },
  { name: "Neighborhoods", href: "/neighborhoods" },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function MobileMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const { currentTheme } = useThemeClasses();
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

  return (
    <div
      className={classNames(
        open
          ? isLight
            ? "fixed inset-0 z-50 bg-white/95 backdrop-blur-sm"
            : "fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
          : "hidden",
        "sm:hidden"
      )}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className={`absolute top-4 right-4 z-50 p-2 rounded-full transition ${
          isLight
            ? "bg-gray-200 text-gray-900 hover:bg-gray-300"
            : "bg-white/10 text-white hover:bg-white/20"
        }`}
        aria-label="Close menu"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Menu Items */}
      <div className="space-y-1 px-4 pt-20 pb-5 z-50">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <DisclosureButton
              key={item.name}
              as="a"
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={classNames(
                isActive
                  ? isLight
                    ? "bg-emerald-100 text-emerald-900"
                    : "bg-white/10 text-white"
                  : isLight
                    ? "text-gray-700 hover:bg-gray-100"
                    : "text-white hover:bg-white/10",
                "block rounded-md px-3 py-2 text-lg font-medium"
              )}
            >
              {item.name}
            </DisclosureButton>
          );
        })}

        {/* Auth section */}
        <div className={`mt-4 space-y-2 border-t pt-4 ${
          isLight ? "border-gray-200" : "border-white/10"
        }`}>
          {status === "loading" ? (
            <div className={`px-3 py-2 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>Loading...</div>
          ) : session ? (
            <div className="space-y-2">
              <div className={`flex items-center space-x-3 px-3 py-2 rounded-md ${
                isLight ? "bg-gray-100" : "bg-white/10"
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  isLight
                    ? "bg-emerald-600 text-white"
                    : "bg-gradient-to-br from-gray-700 to-gray-900 text-white"
                }`}>
                  {session.user.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    {session.user.name || 'User'}
                  </p>
                  <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    {session.user.email}
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard"
                onClick={onClose}
                className={`flex items-center rounded-md px-3 py-2 text-lg font-medium transition-colors ${
                  isLight
                    ? "text-gray-700 hover:bg-gray-100"
                    : "text-white hover:bg-white/10"
                }`}
              >
                <User className="w-5 h-5 mr-3" />
                Dashboard
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={onClose}
                  className={`flex items-center rounded-md px-3 py-2 text-lg font-medium transition-colors ${
                    isLight
                      ? "text-blue-600 hover:bg-blue-50"
                      : "text-blue-400 hover:bg-white/10"
                  }`}
                >
                  <BarChart3 className="w-5 h-5 mr-3" />
                  Admin Dashboard
                </Link>
              )}
              <Link
                href="/dashboard/settings"
                onClick={onClose}
                className={`flex items-center rounded-md px-3 py-2 text-lg font-medium transition-colors ${
                  isLight
                    ? "text-gray-700 hover:bg-gray-100"
                    : "text-white hover:bg-white/10"
                }`}
              >
                <Settings className="w-5 h-5 mr-3" />
                Settings
              </Link>
              <button
                onClick={() => {
                  onClose();
                  signOut({ callbackUrl: '/' });
                }}
                className={`flex items-center w-full rounded-md px-3 py-2 text-lg font-medium transition-colors ${
                  isLight
                    ? "text-red-600 hover:bg-gray-100"
                    : "text-red-400 hover:bg-white/10"
                }`}
              >
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/auth/signin"
              onClick={onClose}
              className={`block rounded-md px-3 py-2 text-lg font-medium transition-colors text-center ${
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
    </div>
  );
}
