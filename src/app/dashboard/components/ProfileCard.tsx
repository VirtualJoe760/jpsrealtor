// src/app/dashboard/components/ProfileCard.tsx
"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Sun,
  Moon,
  Menu,
  X,
  Settings,
  LogOut,
  Shield,
  BarChart3,
} from "lucide-react";
import { formatRoleName } from "../utils/formatters";

interface ProfileCardProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    roles?: string[];
    isAdmin?: boolean;
  };
  twoFactorEnabled: boolean;
  isLight: boolean;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  shadow: string;
  toggleTheme: () => void;
}

export default function ProfileCard({
  user,
  twoFactorEnabled,
  isLight,
  cardBg,
  cardBorder,
  textPrimary,
  textSecondary,
  shadow,
  toggleTheme,
}: ProfileCardProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={`${cardBg} ${cardBorder} border rounded-2xl ${shadow} p-4 sm:p-6 mb-8 relative`}
    >
      {/* Profile Section */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${textPrimary} text-xl sm:text-2xl font-bold ${
            isLight
              ? "bg-gradient-to-br from-emerald-400 to-cyan-400"
              : "bg-gradient-to-br from-gray-700 to-gray-900"
          }`}
        >
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name || "Profile"}
              width={64}
              height={64}
              className="w-full h-full object-cover"
            />
          ) : (
            user.name?.[0]?.toUpperCase() || "U"
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`text-lg sm:text-xl font-semibold ${textPrimary} truncate`}>
            {user.name || "User"}
          </h3>
          <p className={`${textSecondary} text-xs sm:text-sm truncate`}>{user.email}</p>
        </div>

        {/* Theme Toggle + Menu Buttons */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isLight
                ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
            }`}
            aria-label={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {isLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          {/* Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isLight
                ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                : "bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
            }`}
            aria-label="Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Overlay Menu */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 z-[60]"
          />

          {/* Menu Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-20 right-4 z-[70] w-64 p-3 rounded-xl border shadow-2xl ${
              isLight ? "bg-white border-gray-200" : "bg-gray-900 border-gray-700"
            }`}
          >
            <div className="space-y-2">
              {/* Agent Dashboard */}
              {(user.roles?.includes("realEstateAgent") || (user as any).isTeamLeader) && (
                <Link
                  href="/agent/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isLight ? "hover:bg-blue-50 text-gray-900" : "hover:bg-gray-800 text-white"
                  }`}
                >
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium">Agent Dashboard</span>
                </Link>
              )}

              {/* Admin Dashboard */}
              {user.isAdmin && (
                <Link
                  href="/admin/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isLight
                      ? "hover:bg-purple-50 text-gray-900"
                      : "hover:bg-gray-800 text-white"
                  }`}
                >
                  <Shield className="w-5 h-5 text-purple-500" />
                  <span className="text-sm font-medium">Admin Dashboard</span>
                </Link>
              )}

              {/* Settings */}
              <Link
                href="/dashboard/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isLight ? "hover:bg-gray-100 text-gray-900" : "hover:bg-gray-800 text-white"
                }`}
              >
                <Settings className="w-5 h-5" />
                <span className="text-sm font-medium">Settings</span>
              </Link>

              {/* Sign Out */}
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isLight
                    ? "hover:bg-red-50 text-red-600"
                    : "hover:bg-red-500/10 text-red-400"
                }`}
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </motion.div>
        </>
      )}

      {/* Roles */}
      {(user.isAdmin ||
        user.roles?.includes("vacationRentalHost") ||
        user.roles?.includes("realEstateAgent") ||
        user.roles?.includes("serviceProvider")) && (
        <div
          className={`mb-4 pb-4 border-b ${isLight ? "border-gray-300" : "border-gray-800"}`}
        >
          <h3 className={`text-sm font-semibold ${textPrimary} mb-2`}>Roles</h3>
          <div className="flex flex-wrap gap-2">
            {user.roles?.map((role: string) => (
              <span
                key={role}
                className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                  isLight ? "bg-gray-200 text-gray-700" : "bg-gray-700 text-gray-300"
                }`}
              >
                {formatRoleName(role)}
              </span>
            ))}
            {user.isAdmin && (
              <span
                className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                  isLight
                    ? "bg-purple-100 text-purple-700"
                    : "bg-purple-900/40 text-purple-300"
                }`}
              >
                Admin
              </span>
            )}
          </div>
        </div>
      )}

      {/* Security */}
      <div>
        <h3 className={`text-sm font-semibold ${textPrimary} mb-2`}>Security</h3>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${textSecondary} text-xs`}>2FA:</span>
          <span
            className={`px-2.5 py-1 rounded-md text-xs font-medium ${
              twoFactorEnabled
                ? isLight
                  ? "bg-green-100 text-green-700"
                  : "bg-green-900/40 text-green-300"
                : isLight
                  ? "bg-gray-200 text-gray-600"
                  : "bg-gray-700 text-gray-400"
            }`}
          >
            {twoFactorEnabled ? "Enabled" : "Disabled"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
