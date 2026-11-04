"use client";

// Records which pages a visitor opens and how long the tab was visible on each,
// via POST /api/activity/page-view. Mounted once in ClientLayoutWrapper.
//
// One beacon when a page opens (so the visit exists even if the tab is killed),
// then one each time the tab is hidden or the visitor navigates away, carrying
// the visible time so far. The server keeps the largest duration per viewId.
//
// Workspace pages (/agent, /admin, /auth) are skipped: the point is what a
// lead looks at on a site, not an agent's own dashboard clicks.

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { getAnonymousId, getSessionId, getDeviceType } from "@/lib/activity-tracker";

const SKIP_PREFIXES = ["/admin", "/agent", "/auth", "/api"];

interface View {
  id: string;
  path: string;
  startedAt: number;
  visibleMs: number;
  visibleSince: number | null;
}

function newId(): string {
  try {
    return crypto.randomUUID().replace(/-/g, "");
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
}

function shouldSkip(path: string): boolean {
  return SKIP_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

export default function PageViewTracker() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const view = useRef<View | null>(null);
  const userRef = useRef<string | undefined>(undefined);
  userRef.current = userId;

  // Sends the current view's state. Reads refs only, so listeners never go stale.
  const send = useRef((v: View) => {
    const now = Date.now();
    const durationMs = v.visibleMs + (v.visibleSince ? now - v.visibleSince : 0);
    const uid = userRef.current;
    let first = false;
    try {
      // First signed-in beacon in this tab session: lets the server attach this
      // browser's anonymous history to the account and fill in signup origin.
      if (uid && sessionStorage.getItem("pv-claimed") !== uid) {
        sessionStorage.setItem("pv-claimed", uid);
        first = true;
      }
    } catch {}
    const payload = JSON.stringify({
      viewId: v.id,
      path: v.path,
      title: document.title,
      referrer: document.referrer || undefined,
      startedAt: v.startedAt,
      durationMs,
      anonymousId: getAnonymousId(),
      sessionId: getSessionId(),
      deviceType: getDeviceType(),
      first,
    });
    try {
      if (navigator.sendBeacon?.("/api/activity/page-view", payload)) return;
    } catch {}
    fetch("/api/activity/page-view", { method: "POST", body: payload, keepalive: true }).catch(() => {});
  }).current;

  // Start a new view on each route change (once we know who's signed in).
  useEffect(() => {
    if (status === "loading" || !pathname) return;
    const current = view.current;
    if (current && current.path === pathname) {
      // Same page, session just resolved: re-send so the row gets the user.
      if (userId) send(current);
      return;
    }
    if (current) {
      if (current.visibleSince) {
        current.visibleMs += Date.now() - current.visibleSince;
        current.visibleSince = null;
      }
      send(current);
    }
    if (shouldSkip(pathname)) {
      view.current = null;
      return;
    }
    const visible = typeof document === "undefined" || document.visibilityState === "visible";
    const next: View = {
      id: newId(),
      path: pathname,
      startedAt: Date.now(),
      visibleMs: 0,
      visibleSince: visible ? Date.now() : null,
    };
    view.current = next;
    send(next);
  }, [pathname, status, userId, send]);

  // Pause the clock while the tab is hidden; flush on hide and on unload.
  useEffect(() => {
    const onHide = () => {
      const v = view.current;
      if (!v) return;
      if (v.visibleSince) {
        v.visibleMs += Date.now() - v.visibleSince;
        v.visibleSince = null;
      }
      send(v);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onHide();
      else if (view.current && !view.current.visibleSince) view.current.visibleSince = Date.now();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
    };
  }, [send]);

  return null;
}
