// src/app/dashboard/page.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, TrendingUp, MapPin, Building2, Home } from "lucide-react";

// Helper function to format role names
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

// Helper function to decode property types
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

interface FavoriteProperty {
  listingKey: string;
  swipedAt?: string;
  // All listing fields spread directly (not nested)
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
  [key: string]: any; // Allow any other listing fields
}

interface Analytics {
  totalLikes: number;
  totalDislikes: number;
  topSubdivisions: Array<{ name: string; count: number }>;
  topCities: Array<{ name: string; count: number }>;
  topPropertyTypes: Array<{ type: string; count: number }>;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteProperty[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      // Fetch 2FA status
      fetch("/api/auth/user")
        .then((res) => res.json())
        .then((data) => {
          if (data.twoFactorEnabled) {
            setTwoFactorEnabled(true);
          }
        })
        .catch((err) => console.error("Error fetching user data:", err));

      // Fetch favorites and sync from localStorage
      syncFavorites();
    }
  }, [status, router]);

  const syncFavorites = async () => {
    try {
      setIsSyncing(true);

      // Fetch swipe data from new database-first API
      const response = await fetch("/api/swipes/user");

      if (!response.ok) {
        throw new Error(`Failed to fetch swipes: ${response.status}`);
      }

      const data = await response.json();

      console.log("📊 Dashboard - Fetched swipe data:", data);

      // Extract liked listings
      const likedListings = data.likedListings || [];

      console.log("📋 Raw liked listings from API:", likedListings);

      // Map to the format expected by the dashboard
      const favorites = likedListings
        .filter((item: any) => item.listingData && Object.keys(item.listingData).length > 0)
        .map((item: any) => {
          console.log("🔍 Processing listing:", item.listingKey, item.listingData);
          return {
            ...item.listingData,
            listingKey: item.listingKey,
            swipedAt: item.swipedAt,
          };
        });

      console.log("✅ Mapped favorites:", favorites);

      setFavorites(favorites);
      setAnalytics(data.analytics || {
        totalLikes: 0,
        totalDislikes: 0,
        topSubdivisions: [],
        topCities: [],
        topPropertyTypes: [],
      });

      console.log(`✅ Dashboard loaded: ${favorites.length} favorites`);
    } catch (error) {
      console.error("❌ Error fetching swipe data:", error);
    } finally {
      setIsLoadingFavorites(false);
      setIsSyncing(false);
    }
  };

  const removeFavorite = async (listingKey: string) => {
    try {
      // TODO: Implement DELETE /api/swipes/user/[listingKey] endpoint
      // For now, just update local state
      console.log(`🗑️ Removing favorite: ${listingKey}`);

      // Update local state
      setFavorites((prev) => prev.filter((fav) => fav.listingKey !== listingKey));

      // Refresh from server to stay in sync
      await syncFavorites();
    } catch (error) {
      console.error("❌ Error removing favorite:", error);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const user = session.user;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {user.name || 'User'}!
          </h1>
          <p className="text-gray-400">Your personalized dashboard with favorites and insights</p>
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
                  <p className="text-gray-500 text-xs">
                    {analytics.topCities[0]?.count || 0} properties
                  </p>
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
                  <p className="text-gray-500 text-xs">
                    {analytics.topSubdivisions[0]?.count || 0} properties
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </div>
          </div>
        )}

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
                      <span className="text-gray-300 text-sm">
                        {idx + 1}. {city.name}
                      </span>
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
                  {analytics.topSubdivisions.slice(0, 5).map((subdivision, idx) => (
                    <div key={subdivision.name} className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm truncate max-w-[180px]">
                        {idx + 1}. {subdivision.name}
                      </span>
                      <span className="text-gray-500 text-sm">{subdivision.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Property Types */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <Home className="w-5 h-5 mr-2 text-purple-400" />
                  Property Types
                </h3>
                <div className="space-y-2">
                  {analytics.topPropertyTypes.map((type, idx) => (
                    <div key={type.type} className="flex items-center justify-between">
                      <span className="text-gray-300 text-sm">
                        {idx + 1}. {decodePropertyType(type.type)}
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Heart className="w-6 h-6 mr-2 text-red-400" />
              Your Favorite Properties
            </h2>
            {isSyncing && (
              <span className="text-sm text-gray-400">Syncing...</span>
            )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((listing) => {
                // listing already has all the data we need
                return (
                  <div
                    key={listing.listingKey}
                    className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-all group"
                  >
                    <div className="relative h-48">
                      {listing.primaryPhotoUrl ? (
                        <Image
                          src={listing.primaryPhotoUrl}
                          alt={listing.address || "Property"}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                          <Home className="w-12 h-12 text-gray-500" />
                        </div>
                      )}
                      <button
                        onClick={() => removeFavorite(listing.listingKey)}
                        className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                      >
                        <Heart className="w-5 h-5 text-red-400 fill-red-400" />
                      </button>
                    </div>

                    <div className="p-4">
                      <p className="text-2xl font-bold text-white mb-2">
                        ${listing.listPrice?.toLocaleString() || "N/A"}
                      </p>
                      <p className="text-gray-300 text-sm mb-3 truncate">
                        {listing.address || listing.unparsedAddress || "No address"}
                      </p>

                      <div className="flex items-center gap-4 text-gray-400 text-sm mb-3">
                        <span>{listing.bedsTotal || 0} bd</span>
                        <span>{listing.bathroomsTotalInteger || 0} ba</span>
                        <span>{listing.livingArea?.toLocaleString() || 0} sqft</span>
                      </div>

                      {listing.subdivisionName && (
                        <p className="text-gray-500 text-xs mb-2 truncate">
                          {listing.subdivisionName}
                        </p>
                      )}

                      <Link
                        href={`/property/${listing.slugAddress || listing.listingKey}`}
                        className="block w-full text-center py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Account Info Card */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl shadow-xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-white">{user.name || 'User'}</h2>
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

          {/* Only show roles for admins, vacation rental hosts, and real estate agents */}
          {(user.isAdmin ||
            user.roles.includes('vacationRentalHost') ||
            user.roles.includes('realEstateAgent') ||
            user.roles.includes('serviceProvider')) && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Your Roles</h3>
              <div className="flex flex-wrap gap-2">
                {user.roles.map((role: string) => (
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

          {/* Security Status */}
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
      </div>
    </div>
  );
}
