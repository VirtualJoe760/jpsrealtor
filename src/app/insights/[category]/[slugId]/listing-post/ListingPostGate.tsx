"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import ListingPostRegisterForm from "./ListingPostRegisterForm";
import type { LeadGateClientConfig } from "@/lib/listings/lead-gate";
import type { OpenHouseAttendance } from "@/lib/listings/listing-post-pending";
import ListingPostSocialRegister from "./ListingPostSocialRegister";

interface ListingPostGateProps {
  config: LeadGateClientConfig;
  hasOpenHouse: boolean;
  agentName: string;
  isLight: boolean;
  /** Post slug, for the social-registration round trip. */
  slug: string;
  bannerUrl?: string;
  /** Preview mode disables the social redirect. */
  preview?: boolean;
}

export default function ListingPostGate({
  config,
  hasOpenHouse,
  agentName,
  isLight,
  slug,
  bannerUrl,
  preview,
}: ListingPostGateProps) {
  const [overlayUp, setOverlayUp] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [registerForOpenHouse, setRegisterForOpenHouse] = useState(false);
  const [attendance, setAttendance] = useState<OpenHouseAttendance>({ attendedDate: "", feedback: "" });

  // One effect for both triggers so there is a single place that can raise the
  // overlay, and a single cleanup. Re-runs only when the resolved config
  // changes, which in practice is never within a page view.
  useEffect(() => {
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

  // The page scrolls behind a full-viewport overlay otherwise, which on iOS
  // leaves the visitor stranded mid-document when they dismiss nothing.
  useEffect(() => {
    if (!overlayUp) return;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
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
  const field = `mt-1 w-full rounded-lg border px-3 py-2 text-sm ${
    isLight ? "border-gray-300 bg-white" : "border-neutral-700 bg-neutral-900 [color-scheme:dark]"
  }`;

  if (!overlayUp) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="listing-post-gate-title"
      onCancel={(event) => event.preventDefault()}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto p-6 backdrop:bg-black/70 backdrop:backdrop-blur-sm md:p-8 ${card} ${heading}`}
    >
      {bannerUrl && (
        <div className="-mx-6 -mt-6 mb-5 overflow-hidden rounded-t-2xl md:-mx-8 md:-mt-8">
          <Image
            src={bannerUrl}
            alt={`Registration banner for ${agentName}`}
            width={640}
            height={360}
            sizes="(max-width: 608px) calc(100vw - 2rem), 576px"
            className="block h-auto w-full"
          />
        </div>
      )}
      <h2 id="listing-post-gate-title" className="mb-2 text-2xl font-bold tracking-tight">Unlock the full listing</h2>
      <p className={`mb-5 text-sm ${muted}`}>Continue to see more photos, the property map, and nearby sales.</p>
      {hasOpenHouse && (
        <label className="mb-5 flex items-center gap-3 text-sm font-semibold">
          <input type="checkbox" className="h-4 w-4" checked={registerForOpenHouse}
            onChange={(event) => setRegisterForOpenHouse(event.target.checked)} />
          Register for Open House
        </label>
      )}
      {registerForOpenHouse && (
        <div className="mb-5 grid gap-3">
          <label className="text-sm">
            Date attended (optional)
            <input type="date" className={field} value={attendance.attendedDate}
              onChange={(event) => setAttendance({ ...attendance, attendedDate: event.target.value })} />
          </label>
          <label className="text-sm">
            Give feedback (optional)
            <textarea className={field} rows={2} maxLength={250} value={attendance.feedback}
              onChange={(event) => setAttendance({ ...attendance, feedback: event.target.value })} />
          </label>
        </div>
      )}
      <ListingPostSocialRegister slug={slug} isLight={isLight} registerForOpenHouse={registerForOpenHouse}
        openHouseAttendance={registerForOpenHouse ? attendance : undefined} preview={preview} />
      <ListingPostRegisterForm slug={slug} agentName={agentName} isLight={isLight}
        registerForOpenHouse={registerForOpenHouse} openHouseAttendance={registerForOpenHouse ? attendance : undefined}
        preview={preview} />
    </dialog>
  );
}
