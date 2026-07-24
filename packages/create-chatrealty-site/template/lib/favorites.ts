"use client";

// Favorites — guest OR account, same hook API ({ favorites, isFavorite, toggle }).
//
// GUEST (accounts off / signed out): stored in localStorage, exactly as before.
// ACCOUNT (signed in): the ChatRealty tenant DB is the source of truth. On the
// first authenticated load we MERGE the guest localStorage favorites up into the
// account, clear the guest copy, and thereafter never write localStorage —
// every change is mirrored to /api/account/favorites (the key set), and homes
// saved on another device are hydrated back into full objects via /by-keys.
// This mirrors the platform's own favorites-data-flow rule.

import { useCallback, useEffect, useState } from "react";
import type { ListingSummary } from "./types";

const KEY = "chatrealty-favorites";

// --- localStorage (guest source of truth) ---------------------------------
function readLocal(): ListingSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ListingSummary[]) : [];
  } catch {
    return [];
  }
}
function writeLocal(list: ListingSummary[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota / private mode */
  }
}
function clearLocal() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

// --- shared module store (one per tab, across all hook instances) ----------
type Mode = "guest" | "account";
let mode: Mode = "guest";
let current: ListingSummary[] = [];
let startPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

async function pushKeys(keys: string[]) {
  try {
    await fetch("/api/account/favorites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys }),
    });
  } catch {
    /* offline — the next change retries the full set */
  }
}

// Runs once per tab (memoized): seed from localStorage, then ask whether this
// site has accounts + a signed-in user, and if so switch to account mode.
// Returns the shared promise so late-mounting hooks can re-render on completion.
function start(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!startPromise) startPromise = doStart();
  return startPromise;
}

async function doStart(): Promise<void> {
  const local = readLocal();
  current = local;
  emit();

  let data: { available?: boolean; keys?: string[] } | null = null;
  try {
    const res = await fetch("/api/account/favorites", { cache: "no-store" });
    data = await res.json().catch(() => null);
  } catch {
    data = null;
  }

  if (!data?.available) {
    mode = "guest"; // signed out or accounts disabled — stay on localStorage
    return;
  }

  mode = "account";
  const serverKeys = Array.isArray(data.keys) ? data.keys : [];
  const localKeys = local.map((l) => l.listingKey);
  const union = Array.from(new Set([...serverKeys, ...localKeys]));

  // Merge guest picks into the account, then let the server be canonical.
  if (union.length !== serverKeys.length) await pushKeys(union);
  clearLocal();

  // Hydrate objects for keys we don't already have (saved on another device).
  const byKey = new Map<string, ListingSummary>(local.map((l) => [l.listingKey, l]));
  const missing = union.filter((k) => !byKey.has(k));
  if (missing.length) {
    try {
      const r = await fetch(`/api/listings/by-keys?keys=${encodeURIComponent(missing.join(","))}`, {
        cache: "no-store",
      });
      if (r.ok) {
        const d = await r.json();
        for (const item of (d.items || []) as ListingSummary[]) byKey.set(item.listingKey, item);
      }
    } catch {
      /* leave un-hydrated keys out rather than block */
    }
  }
  current = union.map((k) => byKey.get(k)).filter(Boolean) as ListingSummary[];
  emit();
}

function apply(next: ListingSummary[]) {
  current = next;
  if (mode === "guest") writeLocal(next);
  else void pushKeys(next.map((l) => l.listingKey));
  emit();
}

export function useFavorites() {
  const [, force] = useState(0);

  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    listeners.add(rerender);
    // Re-render this instance once the shared init settles — covers hooks that
    // mount AFTER start() already ran (they'd otherwise miss the emit).
    start().then(rerender);
    // Cross-tab sync for guest mode (account mode is server-authoritative).
    const onStorage = () => {
      if (mode === "guest") {
        current = readLocal();
        emit();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(rerender);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const isFavorite = useCallback((key: string) => current.some((f) => f.listingKey === key), []);

  const toggle = useCallback((listing: ListingSummary) => {
    const exists = current.some((f) => f.listingKey === listing.listingKey);
    apply(exists ? current.filter((f) => f.listingKey !== listing.listingKey) : [...current, listing]);
  }, []);

  return { favorites: current, isFavorite, toggle };
}
