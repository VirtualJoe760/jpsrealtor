"use client";

// The registration wall on a listing post.
//
// Two surfaces, and the difference matters:
//
//   - the CARD is always rendered at the end of the teaser. It is the honest
//     end of the page: there is nothing below it, because the server did not
//     send anything below it.
//   - the OVERLAY is the aggressive one. `mode` decides when it takes the
//     viewport: on first paint, after N seconds, or after N% of the teaser has
//     been scrolled. That is the dial the agent controls in /agent/settings and
//     can override per post in the CMS.
//
// Removing the overlay from the DOM reveals the teaser, not the gated content —
// see listing-post-teaser.ts. That is deliberate: the timing is a conversion
// lever, so it can be tuned freely without any of the settings being a security
// decision.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import type { LeadGateClientConfig } from "@/lib/listings/lead-gate";
import ListingPostSocialRegister from "./ListingPostSocialRegister";

interface ListingPostGateProps {
  /** null = no gate (agent turned it off, or the visitor already registered). */
  config: LeadGateClientConfig | null;
  isOpenHouse: boolean;
  isLight: boolean;
  lockedPhotoCount: number;
  /** Post slug, for the social-registration round trip. */
  slug: string;
  /** Preview mode disables the social redirect. */
  preview?: boolean;
  /** The registration form, rendered inside both surfaces. */
  children: ReactNode;
  /** Fired once when the overlay first appears, for the pixel. */
  onGateShown?: () => void;
}

export default function ListingPostGate({
  config,
  isOpenHouse,
  isLight,
  lockedPhotoCount,
  slug,
  preview,
  children,
  onGateShown,
}: ListingPostGateProps) {
  const [overlayUp, setOverlayUp] = useState(false);
  const firedRef = useRef(false);

  // One effect for both triggers so there is a single place that can raise the
  // overlay, and a single cleanup. Re-runs only when the resolved config
  // changes, which in practice is never within a page view.
  useEffect(() => {
    if (!config) return;

    if (config.mode === "immediate") {
      setOverlayUp(true);
      return;
    }

    if (config.mode === "delay") {
      const ms = Math.max(0, config.delaySeconds) * 1000;
      const t = window.setTimeout(() => setOverlayUp(true), ms);
      return () => window.clearTimeout(t);
    }

    if (config.mode === "scroll") {
      const target = Math.min(95, Math.max(5, config.scrollPercent)) / 100;
      const onScroll = () => {
        const doc = document.documentElement;
        const scrollable = doc.scrollHeight - window.innerHeight;
        // A teaser shorter than the viewport can never reach a scroll target;
        // treat it as already satisfied rather than never gating.
        if (scrollable <= 0) {
          setOverlayUp(true);
          return;
        }
        if (window.scrollY / scrollable >= target) setOverlayUp(true);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }
  }, [config]);

  // Report once, after the overlay is actually up — not when the timer is set.
  useEffect(() => {
    if (overlayUp && !firedRef.current) {
      firedRef.current = true;
      onGateShown?.();
    }
  }, [overlayUp, onGateShown]);

  // The page scrolls behind a full-viewport overlay otherwise, which on iOS
  // leaves the visitor stranded mid-document when they dismiss nothing.
  useEffect(() => {
    if (!overlayUp) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [overlayUp]);

  const card = `rounded-2xl backdrop-blur-xl ${
    isLight ? "bg-white/90 border border-gray-200 shadow-xl" : "bg-black/60 border border-neutral-800/70"
  }`;
  const heading = isLight ? "text-gray-900" : "text-white";
  const muted = isLight ? "text-gray-600" : "text-neutral-400";

  const title = isOpenHouse ? "Register for the open house" : "Get the full details on this home";
  const perks = [
    lockedPhotoCount > 0 ? `All ${lockedPhotoCount} photos and the video tour` : "The full photo set and video tour",
    isOpenHouse ? "Gate code and parking instructions" : "Full property detail and features",
    "Map and exact location in the community",
    "Recently sold comps nearby",
  ];

  const body = (
    <>
      <div className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-extrabold tracking-widest ${
        isLight ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
      }`}>
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        REGISTER TO CONTINUE
      </div>
      <h2 className={`mb-2 text-2xl font-bold tracking-tight ${heading}`}>{title}</h2>
      <p className={`mb-5 text-sm leading-relaxed ${muted}`}>
        It takes about 20 seconds{isOpenHouse ? " and reserves your spot" : ""}. Everything below unlocks right away.
      </p>
      <ul className={`mb-6 grid gap-2 text-sm sm:grid-cols-2 ${isLight ? "text-gray-700" : "text-neutral-300"}`}>
        {perks.map((p) => (
          <li key={p} className="flex items-start gap-2">
            <span aria-hidden="true" className={isLight ? "text-blue-600" : "text-emerald-400"}>✓</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <ListingPostSocialRegister slug={slug} isLight={isLight} preview={preview} />
      {children}
    </>
  );

  return (
    <>
      {/* Always-present card: the real end of the teaser. */}
      <section id="register" className={`${card} p-6 md:p-8`} aria-label={title}>
        {body}
      </section>

      {/* Aggressive overlay, raised on the agent's schedule. */}
      {overlayUp && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className={`${card} w-full max-w-xl p-6 md:p-8`}>{body}</div>
        </div>
      )}
    </>
  );
}
