// src/app/hooks/useFavoritesSync.ts
// Runs once per session on login to check if any favorites have changed status
"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export function useFavoritesSync() {
  const { data: session, status } = useSession();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user || hasSynced.current) return;

    // Check sessionStorage to avoid running multiple times per browser session
    const syncKey = "favorites-sync-done";
    if (sessionStorage.getItem(syncKey)) {
      hasSynced.current = true;
      return;
    }

    hasSynced.current = true;
    sessionStorage.setItem(syncKey, "true");

    // Fire and forget — don't block the UI
    fetch("/api/user/favorites/sync-status", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.removed > 0) {
          console.log(
            `[FavoritesSync] ${data.removed} favorites updated:`,
            data.changes.map((c: any) => `${c.address} → ${c.newStatus}`).join(", ")
          );
          // Dispatch event so UI components can react (e.g., show toast)
          window.dispatchEvent(
            new CustomEvent("favoritesStatusSync", { detail: data })
          );
        }
      })
      .catch((err) => {
        console.error("[FavoritesSync] Error:", err);
      });
  }, [status, session]);
}
