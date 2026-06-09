// src/app/hooks/useFavoritesSync.ts
// Runs once per session on login to check if any favorites have changed status
"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";

// Human-readable phrasing for the new MLS status.
function offMarketPhrase(status: string): string {
  const s = (status || "").toLowerCase();
  if (s.includes("clos") || s.includes("sold")) return "was sold";
  if (s.includes("pend")) return "went pending";
  if (s.includes("contract")) return "is under contract";
  return "came off the market";
}

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
          const changes: any[] = data.changes || [];
          console.log(
            `[FavoritesSync] ${data.removed} favorites updated:`,
            changes.map((c: any) => `${c.address} → ${c.newStatus}`).join(", ")
          );

          // Notify the user that favorited listings came off the market and
          // were removed from their favorites.
          if (changes.length === 1) {
            const c = changes[0];
            toast.info(
              `${c.address || "A favorited home"} ${offMarketPhrase(
                c.newStatus
              )} and was removed from your favorites.`,
              { autoClose: 9000 }
            );
          } else if (changes.length > 1) {
            toast.info(
              `${changes.length} of your favorited homes came off the market and were removed from your favorites.`,
              { autoClose: 9000 }
            );
          }

          // Dispatch event so other UI components can react too.
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
