// src/app/utils/map/useDislikes.ts

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import type { MapListing } from "@/types/types";

export default function useDislikes() {
  const { data: session } = useSession();
  const [dislikes, setDislikes] = useState<MapListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load dislikes from user database on mount
  useEffect(() => {
    const loadDislikes = async () => {
      if (!session?.user) {
        // Not logged in - load from localStorage
        try {
          const saved = localStorage.getItem("dislikedListings");
          const localDislikes = saved ? JSON.parse(saved) : [];
          console.log(`[useDislikes] 💾 Loaded ${localDislikes.length} dislikes from localStorage (guest mode)`);
          setDislikes(localDislikes);
        } catch (error) {
          console.error('[useDislikes] ❌ Failed to parse localStorage dislikes:', error);
          setDislikes([]);
        }
        setIsLoading(false);
        return;
      }

      // Logged in - fetch from database AND migrate localStorage if present
      try {
        // Check for localStorage dislikes to migrate
        let localDislikes: any[] = [];
        try {
          const saved = localStorage.getItem("dislikedListings");
          localDislikes = saved ? JSON.parse(saved) : [];
          if (localDislikes.length > 0) {
            console.log(`[useDislikes] 🔄 Found ${localDislikes.length} dislikes in localStorage - will migrate to database`);
          }
        } catch (error) {
          console.error('[useDislikes] ⚠️ Failed to read localStorage for migration:', error);
        }

        // Fetch from database
        const res = await fetch('/api/user/dislikes');
        if (!res.ok) {
          if (res.status === 401) {
            console.error('[useDislikes] ❌ Unauthorized - session may be invalid');
          } else if (res.status === 404) {
            console.error('[useDislikes] ❌ User not found in database');
          } else {
            console.error(`[useDislikes] ❌ HTTP ${res.status} fetching dislikes`);
          }
          setDislikes([]);
          setIsLoading(false);
          return;
        }

        const data = await res.json();
        const dbDislikes = data.dislikes || [];
        console.log(`[useDislikes] ✅ Loaded ${dbDislikes.length} dislikes from database for ${session.user.email}`);

        // Merge localStorage dislikes with database dislikes (deduplication by listingKey)
        if (localDislikes.length > 0) {
          const dbKeys = new Set(dbDislikes.map((dis: any) =>
            dis.listingKey || dis.listingData?.listingKey || dis.listingData?.slug
          ));

          const newDislikes = localDislikes.filter(local => {
            const key = local.listingKey || local.slug || local.slugAddress;
            return !dbKeys.has(key);
          });

          if (newDislikes.length > 0) {
            console.log(`[useDislikes] 🔄 Migrating ${newDislikes.length} new dislikes from localStorage to database`);

            // Migrate each new dislike to database
            for (const dislike of newDislikes) {
              try {
                const listingKey = dislike.listingKey || dislike.slug || dislike.slugAddress;
                await fetch(`/api/user/dislikes/${listingKey}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ listingData: dislike })
                });
              } catch (err) {
                console.error('[useDislikes] ⚠️ Failed to migrate dislike:', err);
              }
            }

            console.log('[useDislikes] ✅ Migration complete - clearing localStorage');
            localStorage.removeItem("dislikedListings");

            // Set merged dislikes
            const mergedDislikes = [...dbDislikes.map((dis: any) => dis.listingData).filter(Boolean), ...newDislikes];
            setDislikes(mergedDislikes);
          } else {
            console.log('[useDislikes] ℹ️ No new dislikes to migrate (all already in database)');
            localStorage.removeItem("dislikedListings");
            setDislikes(dbDislikes.map((dis: any) => dis.listingData).filter(Boolean));
          }
        } else {
          // No localStorage dislikes - just use database
          setDislikes(dbDislikes.map((dis: any) => dis.listingData).filter(Boolean));

          if (dbDislikes.length === 0) {
            console.log('[useDislikes] ℹ️ Database returned 0 dislikes');
          }
        }
      } catch (error) {
        console.error('[useDislikes] ❌ Failed to load dislikes from database:', error);
        setDislikes([]);
      }
      setIsLoading(false);
    };

    loadDislikes();
  }, [session]);

  // Save to localStorage for non-authenticated users
  useEffect(() => {
    if (!session?.user && !isLoading) {
      try {
        localStorage.setItem("dislikedListings", JSON.stringify(dislikes));
        console.log(`[useDislikes] Saved ${dislikes.length} dislikes to localStorage`);
      } catch (e) {
        console.error("[useDislikes] Failed to save to localStorage:", e);
      }
    }
  }, [dislikes, session, isLoading]);

  const addDislike = async (listing: MapListing) => {
    const listingKey = listing.listingKey || listing.slug || listing.slugAddress;

    if (dislikes.some((dislike) => (dislike.listingKey || dislike.slug || dislike.slugAddress) === listingKey)) {
      console.log(`[useDislikes] ℹ️ Listing already in dislikes: ${listingKey}`);
      return;
    }

    console.log(`[useDislikes] ➕ Adding dislike: ${listingKey}`, session?.user ? '(will sync to database)' : '(localStorage only)');

    // Optimistically update UI
    setDislikes((prev) => [...prev, listing]);

    // Sync with database if logged in
    if (session?.user) {
      try {
        const res = await fetch(`/api/user/dislikes/${listingKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingData: listing })
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error(`[useDislikes] ❌ Failed to save dislike to database (HTTP ${res.status}):`, errorText);
          // Rollback on failure
          setDislikes((prev) => prev.filter(dislike => (dislike.listingKey || dislike.slug || dislike.slugAddress) !== listingKey));
        } else {
          console.log(`[useDislikes] ✅ Dislike saved to database: ${listingKey}`);
        }
      } catch (error) {
        console.error('[useDislikes] ❌ Error saving dislike:', error);
        setDislikes((prev) => prev.filter(dislike => (dislike.listingKey || dislike.slug || dislike.slugAddress) !== listingKey));
      }
    }
  };

  const removeDislike = async (listing: MapListing) => {
    const listingKey = listing.listingKey || listing.slug || listing.slugAddress;
    console.log(`[useDislikes] ➖ Removing dislike: ${listingKey}`);

    // Optimistically update UI
    const previousDislikes = dislikes;
    setDislikes((prev) =>
      prev.filter((dislike) => (dislike.listingKey || dislike.slug || dislike.slugAddress) !== listingKey)
    );

    // Sync with database if logged in
    if (session?.user) {
      try {
        const res = await fetch(`/api/user/dislikes/${listingKey}`, {
          method: 'DELETE'
        });

        if (!res.ok) {
          console.error('[useDislikes] Failed to remove dislike from database');
          // Rollback on failure
          setDislikes(previousDislikes);
        }
      } catch (error) {
        console.error('[useDislikes] Error removing dislike:', error);
        setDislikes(previousDislikes);
      }
    }
  };

  const clearDislikes = async () => {
    console.log('[useDislikes] 🗑️ Clearing all dislikes');

    const previousDislikes = dislikes;
    setDislikes([]);

    // Sync with database if logged in
    if (session?.user) {
      try {
        const res = await fetch('/api/user/dislikes', {
          method: 'DELETE'
        });

        if (!res.ok) {
          console.error('[useDislikes] Failed to clear dislikes from database');
          setDislikes(previousDislikes);
        }
      } catch (error) {
        console.error('[useDislikes] Error clearing dislikes:', error);
        setDislikes(previousDislikes);
      }
    }
  };

  return {
    dislikes,
    addDislike,
    removeDislike,
    clearDislikes,
    isLoading,
  };
}
