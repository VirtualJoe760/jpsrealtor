// src/app/dashboard/page.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  TrendingUp,
  MapPin,
  Building2,
  Home,
  ChevronRight,
  Trash2,
  Check,
  BarChart3,
  Sun,
  Moon,
  Menu,
  X,
  Settings,
  LogOut,
  Shield,
} from "lucide-react";
import { motion } from "framer-motion";
import { useThemeClasses } from "../contexts/ThemeContext";
import { useTheme } from "../contexts/ThemeContext";
import ScrollPanel from "../components/ScrollPanel";
import ListingPhoto from "../components/ListingPhoto";
// import ChatWidget from "../components/chat/ChatWidget";
// import GoalTracker from "../components/chat/GoalTracker";

// ─────────────────────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────────────────────
function formatRoleName(role: string): string {
  const roleMap: Record<string, string> = {
    endUser: "End User",
    admin: "Administrator",
    vacationRentalHost: "Vacation Rental Host",
    realEstateAgent: "Real Estate Agent",
    serviceProvider: "Service Provider",
  };
  return roleMap[role] || role;
}

function decodePropertyType(code: string): string {
  const propertyTypeMap: Record<string, string> = {
    A: "Residential Sale",
    B: "Residential Lease",
    C: "Residential Income",
    D: "Land",
    E: "Manufactured In Park",
    F: "Commercial Sale",
    G: "Commercial Lease",
    H: "Business Opportunity",
    I: "Vacation Rental",
  };
  return propertyTypeMap[code] || code;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface FavoriteProperty {
  listingKey: string;
  swipedAt?: string;
  primaryPhotoUrl?: string;
  address?: string;
  unparsedAddress?: string;
  listPrice?: number;
  bedsTotal?: number;
  bathroomsTotalInteger?: number;
  livingArea?: number;
  subdivisionName?: string;
  slugAddress?: string;
  city?: string;
  propertyType?: string;
  mlsId?: string;
  mlsSource?: string;
  [key: string]: any;
}

interface Analytics {
  totalLikes: number;
  totalDislikes: number;
  topSubdivisions: Array<{ name: string; count: number }>;
  topCities: Array<{ name: string; count: number }>;
  topPropertySubTypes: Array<{ type: string; count: number }>;
}

interface FavoriteCommunity {
  name: string;
  id: string;
  type: 'city' | 'subdivision';
  cityId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// DesktopFavorites – Auto‑scroll + pause on hover (Tailwind + JS)
// ─────────────────────────────────────────────────────────────────────────────
function DesktopFavorites({
  favorites,
  selectedListings,
  toggleSelectListing,
  removeFavorite,
  themeProps,
}: {
  favorites: FavoriteProperty[];
  selectedListings: Set<string>;
  toggleSelectListing: (key: string) => void;
  removeFavorite: (key: string) => void;
  themeProps: {
    currentTheme: string;
    cardBg: string;
    cardBorder: string;
    textPrimary: string;
    textSecondary: string;
    isLight: boolean;
  };
}) {
  const { cardBg, textPrimary, textSecondary, isLight } = themeProps;

  // Duplicate items for seamless infinite loop
  const duplicatedFavorites = [...favorites, ...favorites];

  return (
    <ScrollPanel className="hidden md:block">
        {duplicatedFavorites.map((listing, index) => {
          const isSelected = selectedListings.has(listing.listingKey);

          return (
            <div
              key={`${listing.listingKey}-${index}`}
              className={`flex-shrink-0 w-80 ${cardBg} border rounded-xl overflow-hidden
                         transition-all group
                         ${isSelected ? "border-blue-500 ring-2 ring-blue-500/50" : isLight ? "border-gray-300" : "border-gray-700"}
                         hover:border-gray-600`}
            >
              {/* Image */}
              <div className="relative h-48">
                <ListingPhoto
                  listingKey={listing.listingKey}
                  mlsId={listing.mlsId}
                  mlsSource={listing.mlsSource}
                  alt={listing.address || "Property"}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Checkbox + Delete */}
                <div className="absolute left-2 top-2 flex items-center gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectListing(listing.listingKey)}
                      className="h-5 w-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>
                <button
                  onClick={() => removeFavorite(listing.listingKey)}
                  className={`absolute right-2 top-2 rounded-full p-2 transition-colors ${
                    isLight ? "bg-white/70 hover:bg-white/90" : "bg-black/50 hover:bg-black/70"
                  }`}
                >
                  <Heart className="h-5 w-5 fill-red-400 text-red-400" />
                </button>
              </div>

              {/* Details */}
              <div className="p-4">
                <p className={`mb-2 text-2xl font-bold ${textPrimary}`}>
                  ${listing.listPrice?.toLocaleString() || "N/A"}
                </p>
                <p className={`mb-3 truncate text-sm ${textSecondary}`}>
                  {listing.address || listing.unparsedAddress || "No address"}
                </p>

                <div className={`mb-3 flex gap-4 text-sm ${textSecondary}`}>
                  <span>{listing.bedsTotal ?? 0} bd</span>
                  <span>{listing.bathroomsTotalInteger ?? 0} ba</span>
                  <span>{listing.livingArea?.toLocaleString() ?? 0} sqft</span>
                </div>

                {listing.subdivisionName && (
                  <p className={`mb-2 truncate text-xs ${textSecondary}`}>
                    {listing.subdivisionName}
                  </p>
                )}

                <Link
                  href={`/mls-listings/${listing.slugAddress || listing.listingKey}`}
                  className={`block w-full rounded-lg py-2 text-center text-sm text-white font-medium transition-colors ${
                    isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  View Details
                </Link>
              </div>
            </div>
          );
        })}
    </ScrollPanel>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DashboardPage – unchanged except for the new DesktopFavorites
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteProperty[]>([]);
  const [favoriteCommunities, setFavoriteCommunities] = useState<FavoriteCommunity[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Mobile menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Mobile pagination
  const [mobilePage, setMobilePage] = useState(1);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const mobileItemsPerPage = 5;

  // Mass selection
  const [selectedListings, setSelectedListings] = useState<Set<string>>(new Set());

  // ────── Theme (must be called before any early returns) ──────
  const {
    currentTheme,
    cardBg,
    cardBorder,
    textPrimary,
    textSecondary,
    textTertiary,
    shadow,
  } = useThemeClasses();
  const { toggleTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // ────── Auth & initial data ──────
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetch("/api/auth/user")
        .then((res) => res.json())
        .then((data) => {
          if (data.twoFactorEnabled) setTwoFactorEnabled(true);
        })
        .catch((err) => console.error("Error fetching user data:", err));

      // Check if user is admin
      fetch("/api/user/check-admin")
        .then((res) => res.json())
        .then((data) => setIsAdmin(data.isAdmin))
        .catch(() => setIsAdmin(false));

      syncFavorites();
      fetchFavoriteCommunities();
    }
  }, [status, router]);

  // ────── Auto-refresh on window focus ──────
  useEffect(() => {
    const handleFocus = () => {
      if (status === "authenticated") {
        console.log("🔄 Dashboard focused - refreshing favorites");
        syncFavorites();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [status]);

  // ────── Auto-refresh every 30 seconds ──────
  useEffect(() => {
    if (status !== "authenticated") return;

    const intervalId = setInterval(() => {
      console.log("🔄 Auto-refreshing favorites (30s interval)");
      syncFavorites();
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [status]);

  // ────── Fetch favorite communities ──────
  const fetchFavoriteCommunities = async () => {
    try {
      setIsLoadingCommunities(true);
      const response = await fetch("/api/user/favorite-communities");
      if (!response.ok) throw new Error(`Failed to fetch communities: ${response.status}`);
      const data = await response.json();
      setFavoriteCommunities(data.communities || []);
    } catch (error) {
      console.error("Error fetching favorite communities:", error);
    } finally {
      setIsLoadingCommunities(false);
    }
  };

  // ────── Sync favorites ──────
  const syncFavorites = async () => {
    try {
      setIsSyncing(true);
      const response = await fetch("/api/swipes/user");
      if (!response.ok) throw new Error(`Failed to fetch swipes: ${response.status}`);
      const data = await response.json();

      const likedListings = data.likedListings || [];
      const favorites = likedListings
        .filter((item: any) => item.listingData && Object.keys(item.listingData).length > 0)
        .map((item: any) => ({
          ...item.listingData,
          listingKey: item.listingKey,
          swipedAt: item.swipedAt,
        }));

      setFavorites(favorites);
      setAnalytics(
        data.analytics || {
          totalLikes: 0,
          totalDislikes: 0,
          topSubdivisions: [],
          topCities: [],
          topPropertySubTypes: [],
        }
      );
    } catch (error) {
      console.error("Error fetching swipe data:", error);
    } finally {
      setIsLoadingFavorites(false);
      setIsSyncing(false);
    }
  };

  // ────── Remove single favorite ──────
  const removeFavorite = async (listingKey: string) => {
    try {
      setFavorites((prev) => prev.filter((fav) => fav.listingKey !== listingKey));
      const response = await fetch(`/api/user/favorites/${listingKey}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to remove favorite");
      await syncFavorites();
    } catch (error) {
      console.error("Error removing favorite:", error);
      await syncFavorites();
    }
  };

  // ────── Remove community from favorites ──────
  const removeCommunity = async (id: string) => {
    try {
      setFavoriteCommunities((prev) => prev.filter((comm) => comm.id !== id));
      const response = await fetch(`/api/user/favorite-communities?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to remove community");
      await fetchFavoriteCommunities();
    } catch (error) {
      console.error("Error removing community:", error);
      await fetchFavoriteCommunities();
    }
  };

  // ────── Mass selection helpers ──────
  const toggleSelectListing = (listingKey: string) => {
    setSelectedListings((prev) => {
      const next = new Set(prev);
      next.has(listingKey) ? next.delete(listingKey) : next.add(listingKey);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedListings.size === favorites.length) {
      setSelectedListings(new Set());
    } else {
      setSelectedListings(new Set(favorites.map((f) => f.listingKey)));
    }
  };

  const deleteSelected = async () => {
    if (selectedListings.size === 0) return;
    const confirmDelete = window.confirm(
      `Delete ${selectedListings.size} selected ${selectedListings.size === 1 ? "property" : "properties"}?`
    );
    if (!confirmDelete) return;

    try {
      setFavorites((prev) => prev.filter((f) => !selectedListings.has(f.listingKey)));
      const promises = Array.from(selectedListings).map((key) =>
        fetch(`/api/user/favorites/${key}`, { method: "DELETE" })
      );
      await Promise.all(promises);
      setSelectedListings(new Set());
      await syncFavorites();
    } catch (error) {
      console.error("Error deleting selected:", error);
      await syncFavorites();
    }
  };

  // ────── Loading / unauth ──────
  if (status === "loading") {
    return (
      <div className="min-h-screen" />
    );
  }
  if (!session) return null;
  const user = session.user;

  // ────── Render ──────
  return (
    <div className="min-h-screen py-12 px-4" data-page="dashboard">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-6 mt-6 md:mb-8 text-center md:text-center"
        >
          <h1 className={`text-2xl sm:text-2xl md:text-4xl font-bold ${textPrimary} mb-2`}>
            Welcome back, {user.name || "User"}!
          </h1>
          <p className={`${textSecondary} text-xs sm:text-sm md:text-base`}>Your personalized dashboard with favorites and insights</p>
        </motion.div>

        {/* Account Info - Moved to top for easy access to dashboards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`${cardBg} ${cardBorder} border rounded-2xl ${shadow} p-4 sm:p-6 mb-8 relative`}
        >
          {/* Header with Profile and Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${textPrimary} text-xl sm:text-2xl font-bold ${
                isLight ? 'bg-gradient-to-br from-emerald-400 to-cyan-400' : 'bg-gradient-to-br from-gray-700 to-gray-900'
              }`}>
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
                <h2 className={`text-lg sm:text-xl font-semibold ${textPrimary} truncate`}>{user.name || "User"}</h2>
                <p className={`${textSecondary} text-xs sm:text-sm truncate`}>{user.email}</p>
              </div>
            </div>

            {/* Controls: Theme Toggle + Mobile Menu */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isLight
                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                }`}
                aria-label={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                {isLight ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </button>

              {/* Mobile Menu Toggle - Only on mobile */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`md:hidden p-2 rounded-lg transition-all duration-200 ${
                  isLight
                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                }`}
                aria-label="Menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`md:hidden mb-4 p-3 rounded-lg border ${
                isLight ? 'bg-gray-50 border-gray-200' : 'bg-gray-800/50 border-gray-700'
              }`}
            >
              <div className="space-y-2">
                {/* Agent Dashboard - Only for real estate agents or team leaders */}
                {(user.roles?.includes('realEstateAgent') || (user as any).isTeamLeader) && (
                  <Link
                    href="/agent/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isLight
                        ? 'bg-white hover:bg-blue-50 text-gray-900 border border-gray-200'
                        : 'bg-gray-900 hover:bg-gray-800 text-white border border-gray-700'
                    }`}
                  >
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">Agent Dashboard</span>
                  </Link>
                )}

                {/* Admin Dashboard - Only for admins */}
                {user.isAdmin && (
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isLight
                        ? 'bg-white hover:bg-purple-50 text-gray-900 border border-gray-200'
                        : 'bg-gray-900 hover:bg-gray-800 text-white border border-gray-700'
                    }`}
                  >
                    <Shield className="w-5 h-5 text-purple-500" />
                    <span className="font-medium">Admin Dashboard</span>
                  </Link>
                )}

                {/* Settings */}
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isLight
                      ? 'bg-white hover:bg-gray-100 text-gray-900 border border-gray-200'
                      : 'bg-gray-900 hover:bg-gray-800 text-white border border-gray-700'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">Settings</span>
                </Link>

                {/* Sign Out */}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isLight
                      ? 'bg-white hover:bg-red-50 text-red-600 border border-red-200'
                      : 'bg-gray-900 hover:bg-red-500/10 text-red-400 border border-red-500/30'
                  }`}
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* Desktop Action Buttons - Hidden on mobile */}
          <div className="hidden md:flex md:flex-wrap gap-2 mb-6">
            {/* Agent Dashboard - Only for real estate agents or team leaders */}
            {(user.roles?.includes('realEstateAgent') || (user as any).isTeamLeader) && (
              <Link
                href="/agent/dashboard"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  isLight
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Agent Dashboard</span>
              </Link>
            )}

            {/* Admin Dashboard - Only for admins */}
            {user.isAdmin && (
              <Link
                href="/admin/dashboard"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  isLight
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </Link>
            )}

            {/* Settings */}
            <Link
              href="/dashboard/settings"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border text-sm font-medium ${
                isLight
                  ? 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-900'
                  : 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>

            {/* Sign Out */}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border text-sm font-medium ${
                isLight
                  ? 'bg-red-50 hover:bg-red-100 border-red-300 text-red-600'
                  : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/50 text-red-400'
              }`}
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Roles */}
          {(user.isAdmin ||
            user.roles?.includes("vacationRentalHost") ||
            user.roles?.includes("realEstateAgent") ||
            user.roles?.includes("serviceProvider")) && (
            <div className={`mb-4 pb-4 border-b ${isLight ? 'border-gray-300' : 'border-gray-800'}`}>
              <h3 className={`text-sm font-semibold ${textPrimary} mb-2`}>Roles</h3>
              <div className="flex flex-wrap gap-2">
                {user.roles?.map((role: string) => (
                  <span
                    key={role}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                      isLight
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {formatRoleName(role)}
                  </span>
                ))}
                {user.isAdmin && (
                  <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                    isLight
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-purple-900/40 text-purple-300'
                  }`}>
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
                      ? 'bg-green-100 text-green-700'
                      : 'bg-green-900/40 text-green-300'
                    : isLight
                      ? 'bg-gray-200 text-gray-600'
                      : 'bg-gray-700 text-gray-400'
                }`}
              >
                {twoFactorEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Statistics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`${cardBg} border rounded-xl p-6 shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${textSecondary} text-sm mb-1`}>Total Favorites</p>
                  <p className={`text-3xl font-bold ${textPrimary}`}>{analytics.totalLikes}</p>
                </div>
                <div className={`w-12 h-12 ${isLight ? 'bg-red-50' : 'bg-red-500/10'} rounded-lg flex items-center justify-center`}>
                  <Heart className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className={`${cardBg} border rounded-xl p-6 shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${textSecondary} text-sm mb-1`}>Top City</p>
                  <p className={`text-2xl font-bold ${textPrimary}`}>
                    {analytics.topCities[0]?.name || "N/A"}
                  </p>
                  <p className={`${textTertiary} text-xs`}>{analytics.topCities[0]?.count || 0} properties</p>
                </div>
                <div className={`w-12 h-12 ${isLight ? 'bg-blue-50' : 'bg-blue-500/10'} rounded-lg flex items-center justify-center`}>
                  <MapPin className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className={`${cardBg} border rounded-xl p-6 shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`${textSecondary} text-sm mb-1`}>Top Subdivision</p>
                  <p className={`text-xl font-bold ${textPrimary} truncate max-w-[150px]`}>
                    {analytics.topSubdivisions[0]?.name || "N/A"}
                  </p>
                  <p className={`${textTertiary} text-xs`}>{analytics.topSubdivisions[0]?.count || 0} properties</p>
                </div>
                <div className={`w-12 h-12 ${isLight ? 'bg-green-50' : 'bg-green-500/10'} rounded-lg flex items-center justify-center`}>
                  <Building2 className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* AI Dream Home Profile */}
        {/* {user.email && (
          <GoalTracker userId={user.email} className="mb-8" />
        )} */}

        {/* Swipe Insights */}
        {analytics && (analytics.topCities.length > 0 || analytics.topSubdivisions.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className={`${cardBg} ${cardBorder} border rounded-2xl p-6 ${shadow} mb-8`}
          >
            <h2 className={`text-2xl font-bold ${textPrimary} mb-6 flex items-center`}>
              <TrendingUp className="w-6 h-6 mr-2 text-blue-400" />
              Your Swipe Insights
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Top Cities */}
              <div>
                <h3 className={`text-lg font-semibold ${textPrimary} mb-3 flex items-center`}>
                  <MapPin className="w-5 h-5 mr-2 text-blue-400" />
                  Top Cities
                </h3>
                <div className="space-y-2">
                  {analytics.topCities.slice(0, 5).map((city, idx) => (
                    <div key={city.name} className="flex items-center justify-between">
                      <span className={`${textSecondary} text-sm`}>{idx + 1}. {city.name}</span>
                      <span className={`${textTertiary} text-sm`}>{city.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Subdivisions */}
              <div>
                <h3 className={`text-lg font-semibold ${textPrimary} mb-3 flex items-center`}>
                  <Building2 className="w-5 h-5 mr-2 text-green-400" />
                  Top Subdivisions
                </h3>
                <div className="space-y-2">
                  {analytics.topSubdivisions.slice(0, 5).map((sub, idx) => (
                    <div key={sub.name} className="flex items-center justify-between">
                      <span className={`${textSecondary} text-sm truncate max-w-[180px]`}>
                        {idx + 1}. {sub.name}
                      </span>
                      <span className={`${textTertiary} text-sm`}>{sub.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Property SubTypes */}
              <div>
                <h3 className={`text-lg font-semibold ${textPrimary} mb-3 flex items-center`}>
                  <Home className="w-5 h-5 mr-2 text-purple-400" />
                  Property SubTypes
                </h3>
                <div className="space-y-2">
                  {analytics.topPropertySubTypes.map((type, idx) => (
                    <div key={type.type} className="flex items-center justify-between">
                      <span className={`${textSecondary} text-sm`}>
                        {idx + 1}. {type.type}
                      </span>
                      <span className={`${textTertiary} text-sm`}>{type.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Favorite Properties */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className={`${cardBg} ${cardBorder} border rounded-2xl p-6 ${shadow} mb-8`}
        >
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h2 className={`text-2xl font-bold ${textPrimary} flex items-center`}>
              <Heart className="w-6 h-6 mr-2 text-red-400" />
              Your Favorite Properties
            </h2>
            <div className="flex items-center gap-3">
              {isSyncing && <span className={`text-sm ${textSecondary}`}>Syncing...</span>}
              {favorites.length > 0 && (
                <>
                  <label className={`flex items-center gap-2 text-sm ${textSecondary} cursor-pointer`}>
                    <input
                      type="checkbox"
                      checked={selectedListings.size === favorites.length && favorites.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    Select All
                  </label>
                  {selectedListings.size > 0 && (
                    <>
                      <span className={`text-sm ${textSecondary}`}>{selectedListings.size} selected</span>
                      <button
                        onClick={deleteSelected}
                        className={`flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 ${textPrimary} rounded-lg transition-colors text-sm`}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Selected
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {isLoadingFavorites ? (
            <div className={`text-center py-12 ${textSecondary}`}>Loading favorites...</div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-12">
              <Heart className={`w-16 h-16 mx-auto mb-4 ${textTertiary}`} />
              <p className={`${textSecondary} mb-4`}>No favorites yet</p>
              <Link
                href="/?view=map"
                className={`inline-block px-6 py-3 rounded-lg transition-all text-white font-medium ${
                  isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Browse Listings
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop Auto‑scroll */}
              <DesktopFavorites
                favorites={favorites}
                selectedListings={selectedListings}
                toggleSelectListing={toggleSelectListing}
                removeFavorite={removeFavorite}
                themeProps={{
                  currentTheme,
                  cardBg,
                  cardBorder,
                  textPrimary,
                  textSecondary,
                  isLight,
                }}
              />

              {/* Mobile Accordion */}
              <div className="md:hidden">
                {(() => {
                  const totalPages = Math.ceil(favorites.length / mobileItemsPerPage);
                  const start = (mobilePage - 1) * mobileItemsPerPage;
                  const end = start + mobileItemsPerPage;
                  const items = favorites.slice(start, end);

                  return (
                    <div className="space-y-4">
                      {items.map((listing, idx) => {
                        const globalIdx = start + idx;
                        const expanded = expandedIndex === globalIdx;
                        const selected = selectedListings.has(listing.listingKey);

                        return (
                          <div
                            key={`${listing.listingKey}-${globalIdx}`}
                            className={`${cardBg} border rounded-xl overflow-hidden ${
                              selected ? "border-blue-500 ring-2 ring-blue-500/50" : isLight ? "border-gray-300" : "border-gray-700"
                            }`}
                          >
                            {/* Header */}
                            <div className="w-full p-3 flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleSelectListing(listing.listingKey)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                              />
                              <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden">
                                <ListingPhoto
                                  listingKey={listing.listingKey}
                                  mlsId={listing.mlsId}
                                  mlsSource={listing.mlsSource}
                                  alt={listing.address || "Property"}
                                  width={56}
                                  height={56}
                                  className="object-cover w-full h-full"
                                />
                              </div>
                              <button
                                onClick={() => setExpandedIndex(expanded ? null : globalIdx)}
                                className={`flex-1 min-w-0 text-left transition-colors rounded-lg p-2 ${
                                  isLight ? "hover:bg-gray-100" : "hover:bg-gray-800/70"
                                }`}
                              >
                                <p className={`text-base font-bold ${textPrimary} leading-tight`}>
                                  ${listing.listPrice?.toLocaleString() || "N/A"}
                                </p>
                                <p className={`${textSecondary} text-xs truncate leading-tight mt-0.5`}>
                                  {listing.address || listing.unparsedAddress || "No address"}
                                </p>
                              </button>
                              <button
                                onClick={() => setExpandedIndex(expanded ? null : globalIdx)}
                                className="flex-shrink-0 p-1.5"
                              >
                                <ChevronRight
                                  className={`w-5 h-5 ${textSecondary} transition-transform ${expanded ? "rotate-90" : ""}`}
                                />
                              </button>
                            </div>

                            {/* Expanded */}
                            {expanded && (
                              <div className={`border-t ${isLight ? "border-gray-300" : "border-gray-700"}`}>
                                <div className="relative h-48">
                                  <ListingPhoto
                                    listingKey={listing.listingKey}
                                    mlsId={listing.mlsId}
                                    mlsSource={listing.mlsSource}
                                    alt={listing.address || "Property"}
                                    fill
                                    className="object-cover"
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeFavorite(listing.listingKey);
                                    }}
                                    className={`absolute top-2 right-2 p-2 rounded-full transition-colors ${
                                      isLight ? "bg-white/70 hover:bg-white/90" : "bg-black/50 hover:bg-black/70"
                                    }`}
                                  >
                                    <Heart className="w-5 h-5 text-red-400 fill-red-400" />
                                  </button>
                                </div>

                                <div className="p-4">
                                  {/* Price */}
                                  <p className={`text-2xl font-bold ${textPrimary} mb-2`}>
                                    ${listing.listPrice?.toLocaleString() || "N/A"}
                                  </p>

                                  {/* Address */}
                                  <p className={`text-sm ${textSecondary} mb-3`}>
                                    {listing.address || listing.unparsedAddress || "No address"}
                                  </p>

                                  {/* Bed/Bath/SqFt */}
                                  <div className={`flex items-center gap-4 ${textSecondary} text-sm mb-3`}>
                                    <span>{listing.bedsTotal || 0} bd</span>
                                    <span>{listing.bathroomsTotalInteger || 0} ba</span>
                                    <span>{listing.livingArea?.toLocaleString() || 0} sqft</span>
                                  </div>

                                  {/* Subdivision */}
                                  {listing.subdivisionName && (
                                    <p className={`${textTertiary} text-xs mb-3`}>{listing.subdivisionName}</p>
                                  )}

                                  {/* Abbreviated Description */}
                                  {listing.publicRemarks && (
                                    <p className={`text-xs ${textSecondary} mb-3 line-clamp-3`}>
                                      {listing.publicRemarks}
                                    </p>
                                  )}

                                  <Link
                                    href={`/mls-listings/${listing.slugAddress || listing.listingKey}`}
                                    className={`block w-full text-center py-2 text-white font-medium rounded-lg transition-colors text-sm ${
                                      isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                                    }`}
                                  >
                                    View Details
                                  </Link>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-6">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button
                              key={p}
                              onClick={() => {
                                setMobilePage(p);
                                setExpandedIndex(null);
                              }}
                              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                                mobilePage === p
                                  ? `bg-blue-600 ${textPrimary}`
                                  : isLight
                                    ? `bg-gray-200 ${textSecondary} hover:bg-gray-300`
                                    : `bg-gray-800 ${textSecondary} hover:bg-gray-700`
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </motion.div>

        {/* Favorite Communities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.65 }}
          className={`${cardBg} ${cardBorder} border rounded-2xl p-6 ${shadow} mb-8`}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-bold ${textPrimary} flex items-center`}>
              <MapPin className="w-6 h-6 mr-2 text-blue-400" />
              Your Favorite Communities
            </h2>
          </div>

          {isLoadingCommunities ? (
            <div className={`text-center py-12 ${textSecondary}`}>Loading communities...</div>
          ) : favoriteCommunities.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className={`w-16 h-16 mx-auto mb-4 ${textTertiary}`} />
              <p className={`${textSecondary} mb-4`}>No favorite communities yet</p>
              <Link
                href="/neighborhoods"
                className={`inline-block px-6 py-3 rounded-lg transition-all text-white font-medium ${
                  isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Explore Neighborhoods
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favoriteCommunities.map((community) => {
                const isCity = community.type === 'city';
                const href = isCity
                  ? `/neighborhoods/${community.id}`
                  : `/neighborhoods/${community.cityId}/${community.id}`;

                return (
                  <motion.div
                    key={`${community.type}-${community.id}`}
                    whileHover={{ scale: 1.02 }}
                    className={`${cardBg} border rounded-xl p-5 transition-all group relative ${
                      isLight ? 'border-gray-300 hover:border-blue-400' : 'border-gray-700 hover:border-emerald-500'
                    }`}
                  >
                    {/* Remove Button */}
                    <button
                      onClick={() => removeCommunity(community.id)}
                      className={`absolute top-3 right-3 rounded-full p-2 transition-colors ${
                        isLight ? "bg-white/70 hover:bg-white/90" : "bg-black/50 hover:bg-black/70"
                      }`}
                      title="Remove from favorites"
                    >
                      <Heart className="h-5 w-5 fill-red-400 text-red-400" />
                    </button>

                    {/* Community Icon */}
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                      isCity
                        ? isLight ? 'bg-blue-50' : 'bg-blue-500/10'
                        : isLight ? 'bg-green-50' : 'bg-green-500/10'
                    }`}>
                      {isCity ? (
                        <Home className={`w-6 h-6 ${isCity ? 'text-blue-400' : 'text-green-400'}`} />
                      ) : (
                        <Building2 className="w-6 h-6 text-green-400" />
                      )}
                    </div>

                    {/* Community Name */}
                    <h3 className={`text-lg font-bold ${textPrimary} mb-1 pr-8`}>
                      {community.name}
                    </h3>

                    {/* Community Type Badge */}
                    <div className="mb-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        isCity
                          ? isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/40 text-blue-300'
                          : isLight ? 'bg-green-100 text-green-700' : 'bg-green-900/40 text-green-300'
                      }`}>
                        {isCity ? 'City' : 'Subdivision'}
                      </span>
                    </div>

                    {/* View Button */}
                    <Link
                      href={href}
                      className={`block w-full text-center py-2 text-white font-medium rounded-lg transition-colors text-sm ${
                        isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      View {isCity ? 'City' : 'Subdivision'}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* AI Chat Assistant */}
        {/* <ChatWidget context="dashboard" /> */}
        </div>
      </div>
  );
}