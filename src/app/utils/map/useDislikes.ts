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
          setDislikes(saved ? JSON.parse(saved) : []);
        } catch {
          setDislikes([]);
        }
        setIsLoading(false);
        return;
      }

      // Logged in - fetch from database
      try {
        const res = await fetch('/api/user/dislikes');
        if (res.ok) {
          const data = await res.json();
          console.log('[useDislikes] Loaded', data.dislikes?.length || 0, 'dislikes from database');

          // Map dislikedListings to dislikes array
          const dbDislikes = data.dislikes || [];
          setDislikes(dbDislikes.map((dislike: any) => dislike.listingData).filter(Boolean));
        }
      } catch (error) {
        console.error('[useDislikes] Failed to load dislikes from database:', error);
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
      console.log(`[useDislikes] Listing already in dislikes: ${listingKey}`);
      return;
    }

    console.log(`[useDislikes] ➕ Adding dislike: ${listingKey}`);

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
          console.error('[useDislikes] Failed to save dislike to database');
          // Rollback on failure
          setDislikes((prev) => prev.filter(dislike => (dislike.listingKey || dislike.slug || dislike.slugAddress) !== listingKey));
        }
      } catch (error) {
        console.error('[useDislikes] Error saving dislike:', error);
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
