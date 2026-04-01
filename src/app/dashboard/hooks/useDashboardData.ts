// src/app/dashboard/hooks/useDashboardData.ts
"use client";

import { useState, useEffect } from "react";
import { FavoriteProperty, Analytics, FavoriteCommunity } from "../utils/types";

export function useDashboardData(status: string) {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteProperty[]>([]);
  const [favoriteCommunities, setFavoriteCommunities] = useState<FavoriteCommunity[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedListings, setSelectedListings] = useState<Set<string>>(new Set());

  // Fetch favorite communities
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

  // Sync favorites - Using dedicated /api/user/favorites endpoint
  const syncFavorites = async () => {
    try {
      setIsSyncing(true);
      const response = await fetch("/api/user/favorites");
      if (!response.ok) throw new Error(`Failed to fetch favorites: ${response.status}`);
      const data = await response.json();

      const favorites = data.favorites || [];

      console.log('📊 Favorites loaded from /api/user/favorites:', {
        total: data.total,
        stale: data.stale,
        missing: data.missing,
        hasMlsData: favorites.filter((f: any) => f.mlsId && f.mlsSource).length,
        note: 'Photos fetched dynamically from Spark API',
        sample: favorites.slice(0, 3).map((f: any) => ({
          listingKey: f.listingKey,
          address: f.unparsedAddress || f.address?.unparsedAddress || f.address,
          listPrice: f.listPrice,
          mlsId: f.mlsId,
          mlsSource: f.mlsSource,
          bedsTotal: f.bedsTotal,
          bathroomsTotalInteger: f.bathroomsTotalInteger,
          _stale: f._stale,
          _missing: f._missing,
        })),
      });

      // Data is already clean, flat, and enriched from the API
      // No need for client-side processing!
      setFavorites(favorites);
      setAnalytics(data.analytics || {
        totalLikes: 0,
        totalDislikes: 0,
        topSubdivisions: [],
        topCities: [],
        topPropertySubTypes: [],
      });

      // Log warnings for stale/missing data
      if (data.stale > 0) {
        console.warn(`⚠️ ${data.stale} favorites have stale data (relisted properties)`);
      }
      if (data.missing > 0) {
        console.warn(`⚠️ ${data.missing} favorites are no longer in MLS database (likely sold/expired)`);
      }

    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setIsLoadingFavorites(false);
      setIsSyncing(false);
    }
  };

  // Remove single favorite
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

  // Remove community from favorites
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

  // Mass selection helpers
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

  // Bulk remove listings (for stale listings modal)
  const bulkRemoveFavorites = async (listingKeys: string[]) => {
    if (listingKeys.length === 0) return;

    try {
      // Optimistically update UI
      setFavorites((prev) => prev.filter((f) => !listingKeys.includes(f.listingKey)));

      // Remove from backend
      const promises = listingKeys.map((key) =>
        fetch(`/api/user/favorites/${key}`, { method: "DELETE" })
      );
      await Promise.all(promises);

      // Refresh to ensure consistency
      await syncFavorites();
    } catch (error) {
      console.error("Error bulk removing favorites:", error);
      // Revert on error
      await syncFavorites();
      throw error;
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/auth/user")
        .then((res) => res.json())
        .then((data) => {
          if (data.twoFactorEnabled) setTwoFactorEnabled(true);
        })
        .catch((err) => console.error("Error fetching user data:", err));

      syncFavorites();
      fetchFavoriteCommunities();
    }
  }, [status]);

  // Auto-refresh on window focus
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

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (status !== "authenticated") return;

    const intervalId = setInterval(() => {
      console.log("🔄 Auto-refreshing favorites (30s interval)");
      syncFavorites();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [status]);

  return {
    twoFactorEnabled,
    favorites,
    favoriteCommunities,
    analytics,
    isLoadingFavorites,
    isLoadingCommunities,
    isSyncing,
    selectedListings,
    toggleSelectListing,
    toggleSelectAll,
    deleteSelected,
    removeFavorite,
    removeCommunity,
    syncFavorites,
    bulkRemoveFavorites,
  };
}
