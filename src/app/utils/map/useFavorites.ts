// src/app/utils/map/useFavorites.ts

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import type { MapListing } from "@/types/types";

export default function useFavorites() {
  const { data: session } = useSession();
  const [favorites, setFavorites] = useState<MapListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [migrationCount, setMigrationCount] = useState<number>(0);

  // Load favorites from user database on mount
  useEffect(() => {
    const loadFavorites = async () => {
      if (!session?.user) {
        // Not logged in - load from localStorage
        try {
          const saved = localStorage.getItem("likedListings");
          const localFavorites = saved ? JSON.parse(saved) : [];
          console.log(`[useFavorites] 💾 Loaded ${localFavorites.length} favorites from localStorage (guest mode)`);
          setFavorites(localFavorites);
        } catch (error) {
          console.error('[useFavorites] ❌ Failed to parse localStorage favorites:', error);
          setFavorites([]);
        }
        setIsLoading(false);
        return;
      }

      // Logged in - fetch from database AND migrate localStorage if present
      try {
        // Check for localStorage favorites to migrate
        let localFavorites: any[] = [];
        try {
          const saved = localStorage.getItem("likedListings");
          localFavorites = saved ? JSON.parse(saved) : [];
          if (localFavorites.length > 0) {
            console.log(`[useFavorites] 🔄 Found ${localFavorites.length} favorites in localStorage - will migrate to database`);
          }
        } catch (error) {
          console.error('[useFavorites] ⚠️ Failed to read localStorage for migration:', error);
        }

        // Fetch from database
        const res = await fetch('/api/user/favorites');
        if (!res.ok) {
          if (res.status === 401) {
            console.error('[useFavorites] ❌ Unauthorized - session may be invalid');
          } else if (res.status === 404) {
            console.error('[useFavorites] ❌ User not found in database');
          } else {
            console.error(`[useFavorites] ❌ HTTP ${res.status} fetching favorites`);
          }
          setFavorites([]);
          setIsLoading(false);
          return;
        }

        const data = await res.json();
        const dbFavorites = data.favorites || [];
        console.log(`[useFavorites] ✅ Loaded ${dbFavorites.length} favorites from database for ${session.user.email}`);

        // Merge localStorage favorites with database favorites (deduplication by listingKey)
        if (localFavorites.length > 0) {
          const dbKeys = new Set(dbFavorites.map((fav: any) =>
            fav.listingKey || fav.listingData?.listingKey || fav.listingData?.slug
          ));

          const newFavorites = localFavorites.filter(local => {
            const key = local.listingKey || local.slug || local.slugAddress;
            return !dbKeys.has(key);
          });

          if (newFavorites.length > 0) {
            console.log(`[useFavorites] 🔄 Migrating ${newFavorites.length} new favorites from localStorage to database`);

            // Migrate each new favorite to database
            for (const favorite of newFavorites) {
              try {
                const listingKey = favorite.listingKey || favorite.slug || favorite.slugAddress;
                await fetch(`/api/user/favorites/${listingKey}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ listingData: favorite })
                });
              } catch (err) {
                console.error('[useFavorites] ⚠️ Failed to migrate favorite:', err);
              }
            }

            console.log('[useFavorites] ✅ Migration complete - clearing localStorage');
            localStorage.removeItem("likedListings");

            // Set merged favorites. Use the API's flattened favorites directly —
            // they carry the ENRICHED fields (current photo from our synced
            // media, refreshed price/status), unlike the swipe-time listingData.
            const mergedFavorites = [...dbFavorites, ...newFavorites];
            setFavorites(mergedFavorites);
            setMigrationCount(newFavorites.length); // Track migration count for notification
          } else {
            console.log('[useFavorites] ℹ️ No new favorites to migrate (all already in database)');
            localStorage.removeItem("likedListings");
            setFavorites(dbFavorites);
          }
        } else {
          // No localStorage favorites - just use database (flattened + enriched)
          setFavorites(dbFavorites);

          if (dbFavorites.length === 0) {
            console.log('[useFavorites] ℹ️ Database returned 0 favorites');
          }
        }
      } catch (error) {
        console.error('[useFavorites] ❌ Failed to load favorites from database:', error);
        setFavorites([]);
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
      console.log(`[useFavorites] ℹ️ Listing already in favorites: ${listingKey}`);
      return;
    }

    console.log(`[useFavorites] ➕ Adding favorite: ${listingKey}`, session?.user ? '(will sync to database)' : '(localStorage only)');

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
          const errorText = await res.text();
          console.error(`[useFavorites] ❌ Failed to save favorite to database (HTTP ${res.status}):`, errorText);
          // Rollback on failure
          setFavorites((prev) => prev.filter(fav => (fav.listingKey || fav.slug || fav.slugAddress) !== listingKey));
        } else {
          console.log(`[useFavorites] ✅ Favorite saved to database: ${listingKey}`);
        }
      } catch (error) {
        console.error('[useFavorites] ❌ Error saving favorite:', error);
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
    migrationCount,
  };
}
