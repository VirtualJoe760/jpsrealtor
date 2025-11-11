// src/app/utils/map/useSwipeHistory.ts
"use client";

import { useState, useEffect, useCallback } from "react";

type SwipeHistoryEntry = {
  listingKey: string;
  timestamp: number;
  reason: "dislike" | "viewed";
};

type SwipeHistory = {
  viewed: Set<string>;
  disliked: SwipeHistoryEntry[];
};

const DISLIKE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds
const STORAGE_KEY = "swipeHistory";

export function useSwipeHistory() {
  const [history, setHistory] = useState<SwipeHistory>(() => ({
    viewed: new Set<string>(),
    disliked: [],
  }));

  // Load disliked listings from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();

        // Filter out expired dislikes
        const validDislikes = (parsed.disliked || []).filter(
          (entry: SwipeHistoryEntry) => now - entry.timestamp < DISLIKE_TTL
        );

        setHistory({
          viewed: new Set<string>(),
          disliked: validDislikes,
        });
      }
    } catch (error) {
      console.error("Failed to load swipe history:", error);
    }
  }, []);

  // Save disliked listings to localStorage whenever they change
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          disliked: history.disliked,
        })
      );
    } catch (error) {
      console.error("Failed to save swipe history:", error);
    }
  }, [history.disliked]);

  // Mark a listing as viewed (session only, not persisted)
  const markAsViewed = useCallback((listingKey: string) => {
    setHistory((prev) => ({
      ...prev,
      viewed: new Set(prev.viewed).add(listingKey),
    }));
  }, []);

  // Mark a listing as disliked (persisted to localStorage with TTL)
  const markAsDisliked = useCallback((listingKey: string) => {
    setHistory((prev) => {
      // Check if already disliked
      const alreadyDisliked = prev.disliked.some(
        (entry) => entry.listingKey === listingKey
      );

      if (alreadyDisliked) {
        return prev;
      }

      return {
        ...prev,
        viewed: new Set(prev.viewed).add(listingKey),
        disliked: [
          ...prev.disliked,
          {
            listingKey,
            timestamp: Date.now(),
            reason: "dislike",
          },
        ],
      };
    });
  }, []);

  // Check if a listing is disliked
  const isDisliked = useCallback(
    (listingKey: string): boolean => {
      const now = Date.now();
      return history.disliked.some(
        (entry) =>
          entry.listingKey === listingKey &&
          now - entry.timestamp < DISLIKE_TTL
      );
    },
    [history.disliked]
  );

  // Get when a listing was disliked (if it was)
  const getDislikedTimestamp = useCallback(
    (listingKey: string): number | null => {
      const entry = history.disliked.find(
        (e) => e.listingKey === listingKey
      );
      return entry ? entry.timestamp : null;
    },
    [history.disliked]
  );

  // Check if a listing was viewed in this session
  const isViewed = useCallback(
    (listingKey: string): boolean => {
      return history.viewed.has(listingKey);
    },
    [history.viewed]
  );

  // Get count of disliked listings (only non-expired)
  const getDislikedCount = useCallback((): number => {
    const now = Date.now();
    return history.disliked.filter(
      (entry) => now - entry.timestamp < DISLIKE_TTL
    ).length;
  }, [history.disliked]);

  // Clear expired dislikes
  const clearExpiredDislikes = useCallback(() => {
    const now = Date.now();
    setHistory((prev) => ({
      ...prev,
      disliked: prev.disliked.filter(
        (entry) => now - entry.timestamp < DISLIKE_TTL
      ),
    }));
  }, []);

  // Reset all dislikes
  const resetDislikes = useCallback(() => {
    setHistory((prev) => ({
      ...prev,
      disliked: [],
    }));
  }, []);

  // Remove specific listing from dislikes
  const removeFromDislikes = useCallback((listingKey: string) => {
    setHistory((prev) => ({
      ...prev,
      disliked: prev.disliked.filter((entry) => entry.listingKey !== listingKey),
    }));
  }, []);

  // Clear viewed listings (typically called when panel closes)
  const clearViewed = useCallback(() => {
    setHistory((prev) => ({
      ...prev,
      viewed: new Set<string>(),
    }));
  }, []);

  // Get all viewed listing keys
  const getViewedKeys = useCallback((): string[] => {
    return Array.from(history.viewed);
  }, [history.viewed]);

  // Get all disliked listing keys
  const getDislikedKeys = useCallback((): string[] => {
    const now = Date.now();
    return history.disliked
      .filter((entry) => now - entry.timestamp < DISLIKE_TTL)
      .map((entry) => entry.listingKey);
  }, [history.disliked]);

  return {
    markAsViewed,
    markAsDisliked,
    isDisliked,
    isViewed,
    getDislikedCount,
    getDislikedTimestamp,
    clearExpiredDislikes,
    resetDislikes,
    removeFromDislikes,
    clearViewed,
    getViewedKeys,
    getDislikedKeys,
  };
}
