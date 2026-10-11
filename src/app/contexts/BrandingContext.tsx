"use client";

// One place that knows "whose site is this, and what does their brand look
// like" — and, just as importantly, whether we know it YET.
//
// The problem this exists to solve: branding lives in Mongo and is resolved per
// host, so it is never available at SSR. Every consumer used to fetch
// /api/agent-branding itself and render the ChatRealty wordmark meanwhile. That
// made the PLATFORM's brand the loading state for every agent's site — visitors
// to jpsrealtor.com saw CHATREALTY flash before JPSREALTOR. Four components did
// this independently, so the same request went out four times per page.
//
// Three rules follow from that:
//   1. "Not loaded yet" and "loaded, and this agent has no mark" are different
//      states. Only the second may fall back to the ChatRealty wordmark.
//      `status` exists so consumers can tell them apart.
//   2. Never render one tenant's brand while waiting to discover another's.
//      A neutral placeholder that reserves the same space is correct; someone
//      else's logo is not.
//   3. A platform host needs no fetch at all — isPlatformDomain() answers from
//      the hostname alone, so chatrealty.io resolves synchronously and never
//      shows a placeholder.
//
// Repeat visits skip the placeholder entirely: the last known branding for this
// host is cached in localStorage and applied in useLayoutEffect, i.e. after
// hydration (so server and client first paint agree) but BEFORE the browser
// paints (so there is no visible flash). Cache misses, private windows and
// blocked storage all degrade to the placeholder rather than throwing.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isPlatformDomain } from "@/lib/domain-classify";

export type Branding = {
  agentName?: string;
  siteName?: string;
  email?: string;
  phone?: string;
  affiliation?: "solo" | "team";
  brokerageName?: string;
  brokerageLegalName?: string;
  teamName?: string | null;
  licenseNumber?: string;
  teamLogo?: string | null;
  teamLogoDark?: string | null;
  navLogo?: string | null;
  navLogoDark?: string | null;
  navWordmark?: { thin?: string; bold?: string } | null;
  brokerLogo?: string;
  brokerLogoDark?: string;
};

export type BrandingStatus = "loading" | "ready" | "error";

type BrandingValue = {
  branding: Branding | null;
  status: BrandingStatus;
  /** True for chatrealty.io/www, which is known from the hostname alone. */
  isPlatform: boolean;
  /** Safe to render a brand: either resolved, or restored from cache. */
  resolved: boolean;
};

const BrandingCtx = createContext<BrandingValue>({
  branding: null,
  status: "loading",
  isPlatform: false,
  resolved: false,
});

const CACHE_PREFIX = "cr:branding:";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function cacheKey(host: string) {
  return `${CACHE_PREFIX}${host}`;
}

function readCache(host: string): Branding | null {
  try {
    const raw = window.localStorage.getItem(cacheKey(host));
    if (!raw) return null;
    const { at, data } = JSON.parse(raw);
    // Stale entries are dropped rather than shown: a brokerage can change, and
    // a day-old mark is exactly the kind of thing this whole module exists to
    // stop rendering.
    if (typeof at !== "number" || Date.now() - at > CACHE_TTL_MS) return null;
    return data as Branding;
  } catch {
    // Private window, blocked storage, or malformed JSON. Not an error state —
    // it just means we show the placeholder like a first-time visitor.
    return null;
  }
}

function writeCache(host: string, data: Branding) {
  try {
    window.localStorage.setItem(cacheKey(host), JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* quota or blocked storage — caching is an optimisation, never required */
  }
}

/** Mirrors the subdomain detection the sidebar/navbar each used to do inline. */
function subdomainParam(host: string): string {
  if (host.includes("chatrealty")) {
    const parts = host.split("chatrealty")[0]?.replace(/\.$/, "");
    const sub = parts?.split(".").filter((s) => s && s !== "www").pop();
    return sub ? `?subdomain=${encodeURIComponent(sub)}` : "";
  }
  if (host.endsWith(".localhost")) {
    const sub = host.split(".localhost")[0];
    if (sub && sub !== "www") return `?subdomain=${encodeURIComponent(sub)}`;
  }
  return "";
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [status, setStatus] = useState<BrandingStatus>("loading");
  const [fromCache, setFromCache] = useState(false);
  const started = useRef(false);

  // Before paint, after hydration: server and client agree on the first render,
  // and the cached mark is in place before anything is shown.
  useLayoutEffect(() => {
    const host = window.location.hostname;
    const cached = readCache(host);
    if (cached) {
      setBranding(cached);
      setFromCache(true);
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const host = window.location.hostname;
    let cancelled = false;

    fetch(`/api/agent-branding${subdomainParam(host)}`)
      .then((r) => {
        if (!r.ok) {
          // LOUD on purpose, and kept from the sidebar's original: a
          // middleware-gate regression 401'd this silently for three weeks in
          // July 2026. 503 means the database is unreachable, which is an
          // outage rather than a misconfiguration.
          console.error(`[branding] /api/agent-branding failed: ${r.status}`);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data?.branding) {
          setBranding(data.branding);
          setStatus("ready");
          writeCache(host, data.branding);
        } else {
          // Resolved, but there is nothing to show. Still "ready": consumers
          // may now legitimately fall back to the platform wordmark.
          setStatus("error");
        }
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("[branding] fetch error:", e);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<BrandingValue>(() => {
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    const isPlatform = Boolean(host) && isPlatformDomain(host);
    return {
      branding,
      status,
      isPlatform,
      // A cached brand is good enough to render; it will be corrected in place
      // if the fetch disagrees. The platform resolves from the hostname alone.
      resolved: isPlatform || status !== "loading" || fromCache,
    };
  }, [branding, status, fromCache]);

  return <BrandingCtx.Provider value={value}>{children}</BrandingCtx.Provider>;
}

export function useBranding() {
  return useContext(BrandingCtx);
}

/**
 * Reserves a brand slot's space while the brand is unknown.
 *
 * Deliberately blank rather than a shimmer: this sits in the top-left of every
 * page, and an animated skeleton there is more distracting than the half-second
 * of nothing it replaces. The point is only to stop the layout jumping and to
 * stop another tenant's logo standing in.
 */
export function BrandSlotPlaceholder({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`inline-block ${className}`} />;
}
