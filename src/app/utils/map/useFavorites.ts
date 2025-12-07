// src/app/utils/map/useFavorites.ts

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import type { MapListing } from "@/types/types";

export default function useFavorites() {
  const { data: session } = useSession();
  const [favorites, setFavorites] = useState<MapListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites from user database on mount
  useEffect(() => {
    const loadFavorites = async () => {
      if (!session?.user) {
        // Not logged in - load from localStorage
        try {
          const saved = localStorage.getItem("likedListings");
          setFavorites(saved ? JSON.parse(saved) : []);
        } catch {
          setFavorites([]);
        }
        setIsLoading(false);
        return;
      }

      // Logged in - fetch from database
      try {
        const res = await fetch('/api/user/favorites');
        if (res.ok) {
          const data = await res.json();
          console.log('[useFavorites] Loaded', data.favorites?.length || 0, 'favorites from database');

          // Map likedListings to favorites array
          const dbFavorites = data.favorites || [];
          setFavorites(dbFavorites.map((fav: any) => fav.listingData));
        }
      } catch (error) {
        console.error('[useFavorites] Failed to load favorites from database:', error);
      }
      setIsLoading(false);
    };

    loadFavorites();
  }, [session]);

  // Save to localStorage for non-authenticated users
  useEffect(() => {
    if (!session?.user && !isLoading) {
      try {
        localStorage.setItem("likedListings", JSON.stringify(favorites));
        console.log(`[useFavorites] Saved ${favorites.length} favorites to localStorage`);
      } catch (e) {
        console.error("[useFavorites] Failed to save to localStorage:", e);
      }
    }
  }, [favorites, session, isLoading]);

  const addFavorite = async (listing: MapListing) => {
    const listingKey = listing.listingKey || listing.slug || listing.slugAddress;

    if (favorites.some((fav) => (fav.listingKey || fav.slug || fav.slugAddress) === listingKey)) {
      console.log(`[useFavorites] Listing already in favorites: ${listingKey}`);
      return;
    }

    console.log(`[useFavorites] ➕ Adding favorite: ${listingKey}`);

    // Optimistically update UI
    setFavorites((prev) => [...prev, listing]);

    // Sync with database if logged in
    if (session?.user) {
      try {
        const res = await fetch(`/api/user/favorites/${listingKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingData: listing })
        });

        if (!res.ok) {
          console.error('[useFavorites] Failed to save favorite to database');
          // Rollback on failure
          setFavorites((prev) => prev.filter(fav => (fav.listingKey || fav.slug || fav.slugAddress) !== listingKey));
        }
      } catch (error) {
        console.error('[useFavorites] Error saving favorite:', error);
        setFavorites((prev) => prev.filter(fav => (fav.listingKey || fav.slug || fav.slugAddress) !== listingKey));
      }
    }
  };

  const removeFavorite = async (listing: MapListing) => {
    const listingKey = listing.listingKey || listing.slug || listing.slugAddress;
    console.log(`[useFavorites] ➖ Removing favorite: ${listingKey}`);

    // Optimistically update UI
    const previousFavorites = favorites;
    setFavorites((prev) =>
      prev.filter((fav) => (fav.listingKey || fav.slug || fav.slugAddress) !== listingKey)
    );

    // Sync with database if logged in
    if (session?.user) {
      try {
        const res = await fetch(`/api/user/favorites/${listingKey}`, {
          method: 'DELETE'
        });

        if (!res.ok) {
          console.error('[useFavorites] Failed to remove favorite from database');
          // Rollback on failure
          setFavorites(previousFavorites);
        }
      } catch (error) {
        console.error('[useFavorites] Error removing favorite:', error);
        setFavorites(previousFavorites);
      }
    }
  };

  const clearFavorites = async () => {
    console.log('[useFavorites] 🗑️ Clearing all favorites');

    const previousFavorites = favorites;
    setFavorites([]);

    // Sync with database if logged in
    if (session?.user) {
      try {
        const res = await fetch('/api/user/favorites', {
          method: 'DELETE'
        });

        if (!res.ok) {
          console.error('[useFavorites] Failed to clear favorites from database');
          setFavorites(previousFavorites);
        }
      } catch (error) {
        console.error('[useFavorites] Error clearing favorites:', error);
        setFavorites(previousFavorites);
      }
    }
  };

  return {
    favorites,
    addFavorite,
    removeFavorite,
    clearFavorites,
    isLoading,
  };
}
