"use client";

import { DisclosureButton } from "@headlessui/react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { X, User, Settings, LogOut } from "lucide-react";

const navigation = [
  { name: "About", href: "/about" },
  { name: "Insights", href: "/insights" },
  { name: "Listings", href: "/mls-listings" },
  { name: "Coachella Valley", href: "/neighborhoods" },
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

  return (
    <div
      className={classNames(
        open ? "fixed inset-0 z-50 bg-black/90 backdrop-blur-sm" : "hidden",
        "sm:hidden"
      )}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
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
                  ? "bg-white/10 text-white"
                  : "text-white hover:bg-white/10",
                "block rounded-md px-3 py-2 text-lg font-medium"
              )}
            >
              {item.name}
            </DisclosureButton>
          );
        })}

        {/* Auth section */}
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
          {status === "loading" ? (
            <div className="px-3 py-2 text-white/50">Loading...</div>
          ) : session ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-3 px-3 py-2 bg-white/10 rounded-md">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {session.user.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-white font-medium">{session.user.name || 'User'}</p>
                  <p className="text-gray-400 text-sm">{session.user.email}</p>
                </div>
              </div>
              <Link
                href="/dashboard"
                onClick={onClose}
                className="flex items-center rounded-md px-3 py-2 text-lg font-medium text-white hover:bg-white/10 transition-colors"
              >
                <User className="w-5 h-5 mr-3" />
                Dashboard
              </Link>
              <Link
                href="/dashboard/settings"
                onClick={onClose}
                className="flex items-center rounded-md px-3 py-2 text-lg font-medium text-white hover:bg-white/10 transition-colors"
              >
                <Settings className="w-5 h-5 mr-3" />
                Settings
              </Link>
              <button
                onClick={() => {
                  onClose();
                  signOut({ callbackUrl: '/' });
                }}
                className="flex items-center w-full rounded-md px-3 py-2 text-lg font-medium text-red-400 hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/auth/signin"
              onClick={onClose}
              className="block rounded-md px-3 py-2 text-lg font-medium bg-white text-black hover:bg-gray-200 transition-colors text-center"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
