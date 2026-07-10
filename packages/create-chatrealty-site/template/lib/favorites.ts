"use client";

// Client-side favorites — stored in localStorage under one key. This mirrors
// ChatRealty's own "guests use localStorage" model: anonymous visitors save
// listings locally; if you add end-user auth later, merge these into the
// account at login and then let the server be the source of truth.

import { useCallback, useEffect, useState } from "react";
import type { ListingSummary } from "./types";

const KEY = "chatrealty-favorites";

function read(): ListingSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ListingSummary[]) : [];
  } catch {
    return [];
  }
}

function write(list: ListingSummary[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("chatrealty:favorites"));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<ListingSummary[]>([]);

  useEffect(() => {
    setFavorites(read());
    const sync = () => setFavorites(read());
    window.addEventListener("chatrealty:favorites", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("chatrealty:favorites", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isFavorite = useCallback(
    (key: string) => favorites.some((f) => f.listingKey === key),
    [favorites]
  );

  const toggle = useCallback((listing: ListingSummary) => {
    const list = read();
    const exists = list.some((f) => f.listingKey === listing.listingKey);
    const next = exists
      ? list.filter((f) => f.listingKey !== listing.listingKey)
      : [...list, listing];
    write(next);
    setFavorites(next);
  }, []);

  return { favorites, isFavorite, toggle };
}
