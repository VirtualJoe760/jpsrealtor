// src/app/utils/map/useFavorites.ts

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import type { MapListing } from "@/types/types";

export default function useFavorites() {
  const [favorites, setFavorites] = useState<MapListing[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("likedListings");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem("likedListings", JSON.stringify(favorites));
    } catch (e) {
      console.error("Failed to save favorites to localStorage:", e);
    }
  }, [favorites]);

  useEffect(() => {
    Cookies.set("favorites", JSON.stringify(favorites), { expires: 7 });
  }, [favorites]);

  const addFavorite = (listing: MapListing) => {
    const slug = listing.slugAddress ?? listing.slug;
    if (!favorites.some((fav) => (fav.slugAddress ?? fav.slug) === slug)) {
      setFavorites((prev) => [...prev, listing]);
    }
  };

  const removeFavorite = (listing: MapListing) => {
    const slug = listing.slugAddress ?? listing.slug;
    setFavorites((prev) =>
      prev.filter((fav) => (fav.slugAddress ?? fav.slug) !== slug)
    );
  };

  const clearFavorites = () => setFavorites([]);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    clearFavorites,
  };
}
