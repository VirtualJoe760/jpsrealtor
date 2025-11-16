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
} from "lucide-react";
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
  [key: string]: any;
}

interface Analytics {
  totalLikes: number;
  totalDislikes: number;
  topSubdivisions: Array<{ name: string; count: number }>;
  topCities: Array<{ name: string; count: number }>;
  topPropertySubTypes: Array<{ type: string; count: number }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// DesktopFavorites – Auto‑scroll + pause on hover (Tailwind + JS)
// ─────────────────────────────────────────────────────────────────────────────
function DesktopFavorites({
  favorites,
  selectedListings,
  toggleSelectListing,
  removeFavorite,
}: {
  favorites: FavoriteProperty[];
  selectedListings: Set<string>;
  toggleSelectListing: (key: string) => void;
  removeFavorite: (key: string) => void;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // --------------------------------------------------------------
  // 1. JS‑driven auto‑scroll + user‑interaction pause
  // --------------------------------------------------------------
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || favorites.length === 0) {
      console.log('🛑 Auto-scroll not starting:', {
        hasContainer: !!container,
        favoritesCount: favorites.length
      });
      return;
    }

    let intervalId: NodeJS.Timeout | null = null;
    const scrollSpeed = 0.5; // pixels per tick - increased for better visibility
    const tickInterval = 20; // ms between ticks (50fps)
    let isUserScrolling = false;
    let userScrollTimeout: NodeJS.Timeout | null = null;
    let scrollCount = 0;

    const autoScroll = () => {
      if (container && !isUserScrolling) {
        const beforeScroll = container.scrollLeft;

        // Infinite loop: Reset to start when reaching halfway point (BEFORE incrementing)
        const halfWidth = container.scrollWidth / 2;
        if (container.scrollLeft >= halfWidth - 10) {
          console.log('🔄 Loop reset - jumping back to start', {
            beforeReset: container.scrollLeft,
            halfWidth,
            scrollWidth: container.scrollWidth
          });
          container.scrollLeft = 0;
        }

        container.scrollLeft += scrollSpeed;
        const afterScroll = container.scrollLeft;

        scrollCount++;
        if (scrollCount % 50 === 0) {
          console.log('📜 Auto-scroll active:', {
            scrollCount,
            beforeScroll,
            afterScroll,
            scrollSpeed,
            tickInterval,
            pixelsPerSecond: (scrollSpeed / tickInterval) * 1000,
            currentScroll: container.scrollLeft,
            maxScroll: container.scrollWidth - container.clientWidth
          });
        }
      }
    };

    const handleUserInteraction = () => {
      console.log('👆 User interaction detected - pausing auto-scroll');
      isUserScrolling = true;
      if (userScrollTimeout) clearTimeout(userScrollTimeout);
      userScrollTimeout = setTimeout(() => {
        console.log('▶️ Resuming auto-scroll after user inactivity');
        isUserScrolling = false;
      }, 2000);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
      handleUserInteraction();

      // Keep infinite loop while wheeling - same logic as auto-scroll
      const halfWidth = container.scrollWidth / 2;
      if (container.scrollLeft >= halfWidth - 10) {
        console.log('🔄 Wheel scroll reset at halfway point');
        container.scrollLeft = 0;
      } else if (container.scrollLeft < 10) {
        console.log('🔄 Wheel scroll reset - scrolling backwards, jumping to end');
        container.scrollLeft = halfWidth - container.clientWidth;
      }
    };

    const handleMouseEnter = () => {
      console.log('🖱️ Mouse entered - pausing auto-scroll');
      isUserScrolling = true;
    };

    const handleMouseLeave = () => {
      console.log('🖱️ Mouse left - resuming auto-scroll');
      isUserScrolling = false;
    };

    // Start auto-scroll after short delay
    const startTimer = setTimeout(() => {
      const canScroll = container.scrollWidth > container.clientWidth;
      console.log('🚀 Starting auto-scroll:', {
        scrollWidth: container.scrollWidth,
        clientWidth: container.clientWidth,
        canScroll,
        scrollSpeed,
        tickInterval,
        pixelsPerSecond: (scrollSpeed / tickInterval) * 1000
      });

      if (canScroll) {
        intervalId = setInterval(autoScroll, tickInterval);
      } else {
        console.warn('⚠️ Cannot scroll - all items fit on screen');
      }
    }, 500);

    // Only listen for actual user interactions (wheel, mouse hover)
    // DON'T listen to scroll event as it fires during auto-scroll
    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      console.log('🧹 Cleaning up auto-scroll');
      clearTimeout(startTimer);
      if (userScrollTimeout) clearTimeout(userScrollTimeout);
      if (intervalId !== null) clearInterval(intervalId);
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [favorites.length]);

  // --------------------------------------------------------------
  // 2. Duplicate items for true infinite loop
  // --------------------------------------------------------------
  const duplicatedFavorites = [...favorites, ...favorites];

  // --------------------------------------------------------------
  // 3. Render – Tailwind hover pause as a visual safety net
  // --------------------------------------------------------------
  return (
    <div className="hidden md:block">
      <div
        ref={scrollContainerRef}
        className="flex gap-6 overflow-x-auto pb-4
                   [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {duplicatedFavorites.map((listing, index) => {
          const isSelected = selectedListings.has(listing.listingKey);

          return (
            <div
              key={`${listing.listingKey}-${index}`}
              className={`flex-shrink-0 w-80 bg-gray-800/50 border rounded-xl overflow-hidden
                         transition-all group
                         ${isSelected ? "border-blue-500 ring-2 ring-blue-500/50" : "border-gray-700"}
                         hover:border-gray-600`}
            >
              {/* Image */}
              <div className="relative h-48">
                {listing.primaryPhotoUrl ? (
                  <Image
                    src={listing.primaryPhotoUrl}
                    alt={listing.address || "Property"}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gray-700">
                    <Home className="h-12 w-12 text-gray-500" />
                  </div>
                )}

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
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-2 transition-colors hover:bg-black/70"
                >
                  <Heart className="h-5 w-5 fill-red-400 text-red-400" />
                </button>
              </div>

              {/* Details */}
              <div className="p-4">
                <p className="mb-2 text-2xl font-bold text-white">
                  ${listing.listPrice?.toLocaleString() || "N/A"}
                </p>
                <p className="mb-3 truncate text-sm text-gray-300">
                  {listing.address || listing.unparsedAddress || "No address"}
                </p>

                <div className="mb-3 flex gap-4 text-sm text-gray-400">
                  <span>{listing.bedsTotal ?? 0} bd</span>
                  <span>{listing.bathroomsTotalInteger ?? 0} ba</span>
                  <span>{listing.livingArea?.toLocaleString() ?? 0} sqft</span>
                </div>

                {listing.subdivisionName && (
                  <p className="mb-2 truncate text-xs text-gray-500">
                    {listing.subdivisionName}
                  </p>
                )}

                <Link
                  href={`/mls-listings/${listing.slugAddress || listing.listingKey}`}
                  className="block w-full rounded-lg bg-gray-700 py-2 text-center text-sm text-white transition-colors hover:bg-gray-600"
                >
                  View Details
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Mobile pagination
  const [mobilePage, setMobilePage] = useState(1);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const mobileItemsPerPage = 5;

  // Mass selection
  const [selectedListings, setSelectedListings] = useState<Set<string>>(new Set());

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }
  if (!session) return null;
  const user = session.user;

  // ────── Render ──────
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Welcome back, {user.name || "User"}!
            </h1>
            <p className="text-gray-400">Your personalized dashboard with favorites and insights</p>
          </div>
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <BarChart3 className="w-4 h-4" />
              Admin Dashboard
            </Link>
          )}
        </div>

        {/* Statistics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Favorites</p>
                  <p className="text-3xl font-bold text-white">{analytics.totalLikes}</p>
                </div>
                <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                  <Heart className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </div>

            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Top City</p>
                  <p className="text-2xl font-bold text-white">
                    {analytics.topCities[0]?.name || "N/A"}
                  </p>
                  <p className="text-gray-500 text-xs">{analytics.topCities[0]?.count || 0} properties</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Top Subdivision</p>
                  <p className="text-xl font-bold text-white truncate max-w-[150px]">
                    {analytics.topSubdivisions[0]?.name || "N/A"}
                  </p>
                  <p className="text-gray-500 text-xs">{analytics.topSubdivisions[0]?.count || 0} properties</p>
                </div>
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Dream Home Profile */}
        {/* {user.email && (
          <GoalTracker userId={user.email} className="mb-8" />
        )} */}

        {/* Swipe Insights */}
        {analytics && (analytics.topCities.length > 0 || analytics.topSubdivisions.length > 0) && (
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <TrendingUp className="w-6 h-6 mr-2 text-blue-400" />
              Your Swipe Insights
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Top Cities */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-blue-400" />
                  Top Cities
                </h3>
                <div className="space-y-2">
                  {analytics.topCities.slice(0, 5).map((city, idx) => (
                    <div key={city.name} className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">{idx + 1}. {city.name}</span>
                      <span className="text-gray-500 text-sm">{city.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Subdivisions */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <Building2 className="w-5 h-5 mr-2 text-green-400" />
                  Top Subdivisions
                </h3>
                <div className="space-y-2">
                  {analytics.topSubdivisions.slice(0, 5).map((sub, idx) => (
                    <div key={sub.name} className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm truncate max-w-[180px]">
                        {idx + 1}. {sub.name}
                      </span>
                      <span className="text-gray-500 text-sm">{sub.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Property SubTypes */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <Home className="w-5 h-5 mr-2 text-purple-400" />
                  Property SubTypes
                </h3>
                <div className="space-y-2">
                  {analytics.topPropertySubTypes.map((type, idx) => (
                    <div key={type.type} className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">
                        {idx + 1}. {type.type}
                      </span>
                      <span className="text-gray-500 text-sm">{type.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Favorite Properties */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Heart className="w-6 h-6 mr-2 text-red-400" />
              Your Favorite Properties
            </h2>
            <div className="flex items-center gap-3">
              {isSyncing && <span className="text-sm text-gray-400">Syncing...</span>}
              {favorites.length > 0 && (
                <>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
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
                      <span className="text-sm text-gray-400">{selectedListings.size} selected</span>
                      <button
                        onClick={deleteSelected}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
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
            <div className="text-center py-12 text-gray-400">Loading favorites...</div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400 mb-4">No favorites yet</p>
              <Link
                href="/mls-listings"
                className="inline-block px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-lg hover:from-gray-800 hover:to-black transition-all"
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
                            key={listing.listingKey}
                            className={`bg-gray-800/50 border rounded-xl overflow-hidden ${
                              selected ? "border-blue-500 ring-2 ring-blue-500/50" : "border-gray-700"
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
                                {listing.primaryPhotoUrl ? (
                                  <Image
                                    src={listing.primaryPhotoUrl}
                                    alt={listing.address || "Property"}
                                    width={56}
                                    height={56}
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                    <Home className="w-6 h-6 text-gray-500" />
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => setExpandedIndex(expanded ? null : globalIdx)}
                                className="flex-1 min-w-0 text-left hover:bg-gray-800/70 transition-colors rounded-lg p-2"
                              >
                                <p className="text-base font-bold text-white leading-tight">
                                  ${listing.listPrice?.toLocaleString() || "N/A"}
                                </p>
                                <p className="text-gray-300 text-xs truncate leading-tight mt-0.5">
                                  {listing.address || listing.unparsedAddress || "No address"}
                                </p>
                              </button>
                              <button
                                onClick={() => setExpandedIndex(expanded ? null : globalIdx)}
                                className="flex-shrink-0 p-1.5"
                              >
                                <ChevronRight
                                  className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`}
                                />
                              </button>
                            </div>

                            {/* Expanded */}
                            {expanded && (
                              <div className="border-t border-gray-700">
                                <div className="relative h-48">
                                  {listing.primaryPhotoUrl ? (
                                    <Image
                                      src={listing.primaryPhotoUrl}
                                      alt={listing.address || "Property"}
                                      fill
                                      className="object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                      <Home className="w-12 h-12 text-gray-500" />
                                    </div>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeFavorite(listing.listingKey);
                                    }}
                                    className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                                  >
                                    <Heart className="w-5 h-5 text-red-400 fill-red-400" />
                                  </button>
                                </div>

                                <div className="p-4">
                                  {/* Price */}
                                  <p className="text-2xl font-bold text-white mb-2">
                                    ${listing.listPrice?.toLocaleString() || "N/A"}
                                  </p>

                                  {/* Address */}
                                  <p className="text-sm text-gray-300 mb-3">
                                    {listing.address || listing.unparsedAddress || "No address"}
                                  </p>

                                  {/* Bed/Bath/SqFt */}
                                  <div className="flex items-center gap-4 text-gray-400 text-sm mb-3">
                                    <span>{listing.bedsTotal || 0} bd</span>
                                    <span>{listing.bathroomsTotalInteger || 0} ba</span>
                                    <span>{listing.livingArea?.toLocaleString() || 0} sqft</span>
                                  </div>

                                  {/* Subdivision */}
                                  {listing.subdivisionName && (
                                    <p className="text-gray-500 text-xs mb-3">{listing.subdivisionName}</p>
                                  )}

                                  {/* Abbreviated Description */}
                                  {listing.publicRemarks && (
                                    <p className="text-xs text-gray-400 mb-3 line-clamp-3">
                                      {listing.publicRemarks}
                                    </p>
                                  )}

                                  <Link
                                    href={`/mls-listings/${listing.slugAddress || listing.listingKey}`}
                                    className="block w-full text-center py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
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
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
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
        </div>

        {/* Account Info */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl shadow-xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {user.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-white">{user.name || "User"}</h2>
                <p className="text-gray-400">{user.email}</p>
              </div>
            </div>
            <Link
              href="/dashboard/settings"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700"
            >
              Settings
            </Link>
          </div>

          {/* Roles */}
          {(user.isAdmin ||
            user.roles?.includes("vacationRentalHost") ||
            user.roles?.includes("realEstateAgent") ||
            user.roles?.includes("serviceProvider")) && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Your Roles</h3>
              <div className="flex flex-wrap gap-2">
                {user.roles?.map((role: string) => (
                  <span
                    key={role}
                    className="px-4 py-2 bg-gray-600/20 border border-gray-500/50 text-gray-300 rounded-full text-sm font-medium"
                  >
                    {formatRoleName(role)}
                  </span>
                ))}
                {user.isAdmin && (
                  <span className="px-4 py-2 bg-purple-600/20 border border-purple-500/50 text-purple-300 rounded-full text-sm font-medium">
                    Admin Access
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Security */}
          <div className="pt-6 border-t border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-3">Security</h3>
            <div className="flex items-center space-x-3">
              <span className="text-gray-400">Two-Factor Authentication:</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  twoFactorEnabled
                    ? "bg-green-500/20 border border-green-500/50 text-green-300"
                    : "bg-gray-700/50 border border-gray-600 text-gray-400"
                }`}
              >
                {twoFactorEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        </div>

        {/* AI Chat Assistant */}
        {/* <ChatWidget context="dashboard" /> */}
      </div>
    </div>
  );
}